import {
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
} from "@huggingface/transformers";

const MODEL = "Xenova/LaMini-Flan-T5-77M";
const TARGETS = ["A", "B", "C", "D", "E"];

export let modelReady = false;
export let tokenizer = null;
export let model = null;
export const tokenMap = {};

const EXAMPLES = [
    {
        q: "What is the capital of France?",
        a: "Paris", b: "London", c: "Berlin", d: "Madrid",
    },
    {
        q: "Which planet is closest to the Sun?",
        a: "Venus", b: "Mercury", c: "Earth", d: "Mars",
    },
    {
        q: "What is the chemical symbol for water?",
        a: "CO2", b: "NaCl", c: "H2O", d: "O2",
    },
    {
        q: "Who painted the Mona Lisa?",
        a: "Michelangelo", b: "Raphael", c: "Donatello", d: "Leonardo da Vinci",
    },
    {
        q: "What is the largest organ in the human body?",
        a: "Heart", b: "Brain", c: "Liver", d: "Skin",
    },
    {
        q: "In what year did World War II end?",
        a: "1943", b: "1944", c: "1945", d: "1946",
    },
    {
        q: 'Which element has the atomic number 1 (hint, it starts with "H")?',
        a: "Sodium", b: "Oxygen", c: "Carbon", d: "Hydrogen",
    },
    {
        q: "What is the speed of light in vacuum approximately?",
        a: "300,000 km/s", b: "150,000 km/s", c: "500,000 km/s", d: "3,000,000 km/s",
    },
];

const el = (id) => document.getElementById(id);

export let modelLoading = false;

export async function loadModel(progressCallback) {
    if (modelReady || modelLoading) return;
    modelLoading = true;
    window.dispatchEvent(new CustomEvent("llm-loading-started"));

    try {
        tokenizer = await AutoTokenizer.from_pretrained(MODEL, {
            progress_callback: (info) => {
                if (progressCallback) progressCallback("tokenizer", info);
            },
        });

        model = await AutoModelForSeq2SeqLM.from_pretrained(MODEL, {
            dtype: "q4f16",
            progress_callback: (info) => {
                if (progressCallback) progressCallback("model", info);
            },
        });

        buildTokenMap();
        modelReady = true;
        window.dispatchEvent(new CustomEvent("llm-model-ready"));
    } finally {
        modelLoading = false;
    }
}

function buildTokenMap() {
    for (const letter of TARGETS) {
        tokenMap[letter] = [];
        const forms = [
            letter,
            ` ${letter}`,
            letter.toLowerCase(),
            ` ${letter.toLowerCase()}`,
        ];
        for (const text of forms) {
            const ids = tokenizer(text, { add_special_tokens: false }).input_ids.tolist()[0];
            for (const raw of ids) {
                const id = Number(raw);
                if (isNaN(id) || id < 0 || tokenMap[letter].includes(id)) continue;
                if (tokenizer.decode([id]).trim().toLowerCase() === letter.toLowerCase()) {
                    tokenMap[letter].push(id);
                }
            }
        }
    }
}

export async function runInferenceGeneral(prompt) {
    const encoded = tokenizer(prompt);

    let capturedProbs = null;
    const processor = (_input_ids, logits) => {
        const flat = logits.tolist()[0];
        const maxL = Math.max(...flat);
        const expVals = flat.map((v) => Math.exp(v - maxL));
        const sum = expVals.reduce((a, b) => a + b, 0);
        capturedProbs = expVals.map((v) => v / sum);
        return logits;
    };

    await model.generate({
        inputs: encoded.input_ids,
        attention_mask: encoded.attention_mask,
        max_new_tokens: 1,
        logits_processor: [processor],
    });

    if (!capturedProbs) return null;

    const probs = {};
    for (const letter of TARGETS) {
        let p = 0;
        for (const id of tokenMap[letter]) {
            p += capturedProbs[id] || 0;
        }
        probs[letter] = p;
    }

    const total = Object.values(probs).reduce((s, v) => s + v, 0);
    if (total > 0) {
        for (const letter of TARGETS) probs[letter] /= total;
    }

    const predicted = TARGETS.reduce((a, b) => (probs[a] >= probs[b] ? a : b));
    const entropy = -Object.values(probs).reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

    return { probs, predicted, entropy };
}

function runInference(question, optA, optB, optC, optD) {
    const prompt = `question: ${question} options: A) ${optA} B) ${optB} C) ${optC} D) ${optD} E) none of the above. Answer with only the letter:`;
    return runInferenceGeneral(prompt);
}

async function getCacheSize() {
    try {
        const cache = await caches.open("transformers-cache");
        const keys = await cache.keys();
        let total = 0;
        for (const req of keys) {
            const resp = await cache.match(req);
            if (resp) {
                const blob = await resp.blob();
                total += blob.size;
            }
        }
        return Math.round(total / 1024 / 1024);
    } catch {
        return "?";
    }
}

/* ---- UI wiring (kept self-contained, does not interfere with exports) ---- */

const loadBtn = el("llm-load-btn");
const statusSpan = el("llm-status");
const progressDiv = el("llm-load-progress");
const progressBar = progressDiv ? progressDiv.querySelector(".llm-progress-bar") : null;
const questionArea = el("llm-question-area");
const submitBtn = el("llm-submit-btn");
const exampleBtn = el("llm-example-btn");
const resetBtn = el("llm-reset-btn");
const resultsDiv = el("llm-results");
const barChart = el("llm-bar-chart");
const predictionDiv = el("llm-prediction");

if (loadBtn) {
    if (modelReady) {
        loadBtn.style.display = "none";
        statusSpan.textContent = "Model loaded.";
        statusSpan.style.color = "var(--accent-green)";
        questionArea.style.display = "flex";
        loadExample();
    }

    loadBtn.addEventListener("click", async () => {
        loadBtn.disabled = true;
        statusSpan.textContent = "Loading model...";
        statusSpan.style.color = "var(--muted-text)";
        progressDiv.style.display = "block";
        if (progressBar) progressBar.style.width = "0%";

        try {
            await loadModel((stage, info) => {
                if (stage === "model" && progressBar && info.total) {
                    progressBar.style.width = `${(info.loaded / info.total) * 100}%`;
                }
            });

            const cacheMB = await getCacheSize();
            statusSpan.textContent = `Model loaded (${cacheMB} MB cached)`;
            statusSpan.style.color = "var(--accent-green)";
            progressDiv.style.display = "none";
            loadBtn.style.display = "none";
            questionArea.style.display = "flex";
        } catch (e) {
            statusSpan.textContent = `Error: ${e.message || "Failed to load model."}`;
            statusSpan.style.color = "#ff4444";
            loadBtn.disabled = false;
            console.error(e);
        }
    });
}

window.addEventListener("llm-loading-started", () => {
    if (loadBtn) loadBtn.disabled = true;
});

window.addEventListener("llm-model-ready", () => {
    if (loadBtn) loadBtn.style.display = "none";
    if (progressDiv) progressDiv.style.display = "none";
    statusSpan.textContent = "Model loaded.";
    statusSpan.style.color = "var(--accent-green)";
    questionArea.style.display = "flex";
    loadExample();
});

if (exampleBtn) exampleBtn.addEventListener("click", loadExample);
if (resetBtn) resetBtn.addEventListener("click", resetAll);

let exampleIndex = 0;

function loadExample() {
    const ex = EXAMPLES[exampleIndex];
    exampleIndex = (exampleIndex + 1) % EXAMPLES.length;
    el("llm-question").value = ex.q;
    el("llm-opt-a").value = ex.a;
    el("llm-opt-b").value = ex.b;
    el("llm-opt-c").value = ex.c;
    el("llm-opt-d").value = ex.d;
}

function resetAll() {
    el("llm-question").value = "";
    el("llm-opt-a").value = "";
    el("llm-opt-b").value = "";
    el("llm-opt-c").value = "";
    el("llm-opt-d").value = "";
    resultsDiv.style.display = "none";
}

if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
        const question = el("llm-question").value.trim();
        const optA = el("llm-opt-a").value.trim();
        const optB = el("llm-opt-b").value.trim();
        const optC = el("llm-opt-c").value.trim();
        const optD = el("llm-opt-d").value.trim();

        if (!question || !optA || !optB || !optC || !optD) {
            alert("Please fill in all fields.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Running...";
        resultsDiv.style.display = "none";

        try {
            const res = await runInference(question, optA, optB, optC, optD);

            if (!res) {
                alert("Failed to capture model output.");
                return;
            }

            const { probs, predicted } = res;
            const maxProb = Math.max(...Object.values(probs), 0.01);

            barChart.innerHTML = "";
            TARGETS.forEach((letter) => {
                const pct = (probs[letter] * 100).toFixed(1);
                const height = (probs[letter] / maxProb) * 100;
                const isPredicted = letter === predicted;

                const item = document.createElement("div");
                item.className = "llm-bar-item";

                const track = document.createElement("div");
                track.className = "llm-bar-track";

                const fill = document.createElement("div");
                fill.className = `llm-bar-fill${isPredicted ? " predicted" : ""}`;
                fill.style.height = `${Math.max(height, 2)}%`;
                track.appendChild(fill);

                const label = document.createElement("div");
                label.className = "llm-bar-label";
                label.textContent = letter;

                const pctSpan = document.createElement("div");
                pctSpan.className = "llm-bar-pct";
                pctSpan.textContent = `${pct}%`;

                item.append(track, label, pctSpan);
                barChart.appendChild(item);
            });

            predictionDiv.innerHTML = `
                <span class="llm-predicted-label">Predicted:</span>
                <span class="llm-predicted-letter">${predicted}</span>
                <span class="llm-predicted-conf">(${(probs[predicted] * 100).toFixed(1)}% confidence)</span>
            `;

            resultsDiv.style.display = "block";
        } catch (e) {
            console.error(e);
            alert(`Inference error: ${e.message || "Unknown error"}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Run Inference";
        }
    });
}

window.addEventListener("beforeunload", () => {
    caches.delete("transformers-cache");
});
