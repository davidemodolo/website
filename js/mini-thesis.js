import { modelReady, modelLoading, loadModel, runInferenceGeneral } from './llm-playground.js';

const GRID_SIZE = 5;

const state = {
    agentRow: 2,
    agentCol: 2,
    parcelRow: null,
    parcelCol: null,
    deliveryRow: null,
    deliveryCol: null,
    hasParcel: false,
    delivered: false,
    started: false,
    autoActive: false,
    autoTimer: null,
    visitedCells: {},
    history: [],
    stepCount: 0,
    stepInProgress: false,
    speed: 1,
};

const el = (id) => document.getElementById(id);

const loadBtn = el("thesis-load-btn");
const statusEl = el("thesis-status");
const gridEl = el("thesis-grid");
const stepBtn = el("thesis-step-btn");
const autoBtn = el("thesis-auto-btn");
const resetBtn = el("thesis-reset-btn");
const speedBtn = el("thesis-speed-btn");
const progressDiv = el("thesis-load-progress");
const progressBar = progressDiv ? progressDiv.querySelector(".thesis-progress-bar") : null;
const distEl = el("thesis-dist");

function setUI(enabled) {
    stepBtn.disabled = !enabled;
    autoBtn.disabled = !enabled;
    resetBtn.disabled = !enabled;
}

function updateAutoButton() {
    if (state.autoActive) {
        autoBtn.textContent = "Pause";
        autoBtn.className = "btn btn-secondary";
    } else {
        autoBtn.textContent = "Start";
        autoBtn.className = "btn";
    }
}

loadBtn.addEventListener("click", async () => {
    if (modelLoading) return;
    loadBtn.disabled = true;
    statusEl.textContent = "Loading model...";
    statusEl.style.color = "var(--muted-text)";
    if (progressDiv) progressDiv.style.display = "block";
    if (progressBar) progressBar.style.width = "0%";

    try {
        if (!modelReady) {
            await loadModel((stage, info) => {
                if (stage === "model" && progressBar && info.total) {
                    progressBar.style.width = `${(info.loaded / info.total) * 100}%`;
                }
            });
        }
        statusEl.style.color = "var(--accent-green)";
        if (progressDiv) progressDiv.style.display = "none";
        loadBtn.style.display = "none";
        if (state.started) {
            setUI(true);
            statusEl.textContent = "Model loaded. Press Start or Step.";
        } else {
            setUI(false);
            statusEl.textContent = "Model loaded. Click any cell to place the parcel.";
        }
    } catch (e) {
        statusEl.textContent = `Error: ${e.message || "Failed to load model."}`;
        statusEl.style.color = "#ff4444";
        loadBtn.disabled = false;
        console.error(e);
    }
});

if (modelReady) {
    loadBtn.style.display = "none";
    statusEl.textContent = "Model loaded. Click any cell to place the parcel.";
    statusEl.style.color = "var(--accent-green)";
}

window.addEventListener("llm-loading-started", () => {
    loadBtn.disabled = true;
});

window.addEventListener("llm-model-ready", () => {
    loadBtn.style.display = "none";
    if (progressDiv) progressDiv.style.display = "none";
    if (state.started) {
        setUI(true);
        statusEl.textContent = "Press Start or Step.";
    } else {
        statusEl.textContent = "Click any cell to place the parcel.";
    }
    statusEl.style.color = "var(--accent-green)";
});

function placeDeliveryZone() {
    let row, col;
    do {
        row = Math.floor(Math.random() * GRID_SIZE);
        col = Math.floor(Math.random() * GRID_SIZE);
    } while (row === state.parcelRow && col === state.parcelCol);
    state.deliveryRow = row;
    state.deliveryCol = col;
}

function handleCellClick(row, col) {
    if (state.started) return;
    state.parcelRow = row;
    state.parcelCol = col;
    state.started = true;
    distEl.style.display = "none";
    placeDeliveryZone();
    if (modelReady) {
        setUI(true);
        updateAutoButton();
        statusEl.textContent = "Parcel placed. Press Start or Step.";
    } else {
        statusEl.textContent = "Parcel placed. Load the model to begin.";
    }
    renderGrid();
}

const HISTORY_ACTIONS = { "up": "Up", "down": "Down", "left": "Left", "right": "Right", "pickup": "Pickup", "putdown": "Put down" };

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildPrompt() {
    const onParcel = !state.hasParcel && state.agentRow === state.parcelRow && state.agentCol === state.parcelCol;
    const onDelivery = state.hasParcel && state.agentRow === state.deliveryRow && state.agentCol === state.deliveryCol;

    const lastAction = state.history.length > 0 ? state.history[state.history.length - 1].actionName : null;
    const opposites = { up: "down", down: "up", left: "right", right: "left" };
    const avoid = opposites[lastAction] || null;

    const available = [];
    if (onParcel) available.push({ id: "pickup" });
    if (onDelivery) available.push({ id: "putdown" });

    const dirs = [
        { id: "up", row: state.agentRow - 1, valid: state.agentRow > 0 },
        { id: "down", row: state.agentRow + 1, valid: state.agentRow < GRID_SIZE - 1 },
        { id: "left", col: state.agentCol - 1, valid: state.agentCol > 0 },
        { id: "right", col: state.agentCol + 1, valid: state.agentCol < GRID_SIZE - 1 },
    ];
    for (const d of dirs) {
        if (d.valid && d.id !== avoid) available.push({ id: d.id });
    }

    console.log("[Delivery Agent] State:", {
        agent: [state.agentRow, state.agentCol],
        parcel: [state.parcelRow, state.parcelCol],
        delivery: [state.deliveryRow, state.deliveryCol],
        hasParcel: state.hasParcel,
        onParcel,
        onDelivery,
        available: available.map(a => a.id),
    });

    const labels = ["A", "B", "C", "D", "E"];
    const shuffled = shuffle(available);
    const actionMap = {};
    const options = shuffled.map((a, i) => {
        actionMap[labels[i]] = a.id;
        return `${labels[i]}) ${a.id}`;
    }).join("  ");

    const parcelInfo = state.hasParcel
        ? "Carrying parcel."
        : `Parcel at row ${state.parcelRow} col ${state.parcelCol}.`;

    let historyText = "";
    if (state.history.length > 0) {
        const recent = state.history.slice(-3);
        historyText = "Last: " + recent.map(h =>
            `${HISTORY_ACTIONS[h.actionName] || h.actionName}`
        ).join(", ") + ". ";
    }

    return {
        prompt: `${options}  --  ${historyText}Agent at row ${state.agentRow} col ${state.agentCol}. ${parcelInfo} Delivery zone at row ${state.deliveryRow} col ${state.deliveryCol}. Pick:`,
        actionMap,
    };
}

function executeAction(action) {
    switch (action) {
        case "up":
            if (state.agentRow > 0) state.agentRow--;
            break;
        case "down":
            if (state.agentRow < GRID_SIZE - 1) state.agentRow++;
            break;
        case "left":
            if (state.agentCol > 0) state.agentCol--;
            break;
        case "right":
            if (state.agentCol < GRID_SIZE - 1) state.agentCol++;
            break;
        case "pickup":
            if (!state.hasParcel && state.agentRow === state.parcelRow && state.agentCol === state.parcelCol) {
                state.hasParcel = true;
            }
            break;
        case "putdown":
            if (state.hasParcel && state.agentRow === state.deliveryRow && state.agentCol === state.deliveryCol) {
                state.delivered = true;
            }
            break;
    }
}

async function step() {
    if (!modelReady || !state.started || state.delivered || state.stepInProgress) return;
    state.stepInProgress = true;

    try {
        const { prompt, actionMap } = buildPrompt();
        console.log("[Delivery Agent] Prompt:\n" + prompt);
        console.log("[Delivery Agent] Action map:", actionMap);

        let result;
        try {
            result = await runInferenceGeneral(prompt);
        } catch (e) {
            console.error(e);
            statusEl.textContent = "Inference error.";
            return;
        }

        if (!result) {
            statusEl.textContent = "Inference failed.";
            return;
        }

        const { probs } = result;
        const validLabels = Object.keys(actionMap);
        let totalValid = 0;
        for (const l of validLabels) totalValid += probs[l] || 0;
        const normProbs = {};
        for (const l of validLabels) normProbs[l] = totalValid > 0 ? (probs[l] || 0) / totalValid : 0;
        const bestLabel = validLabels.reduce((a, b) => (normProbs[a] >= normProbs[b] ? a : b));
        const realAction = actionMap[bestLabel];
        const pct = Math.round(normProbs[bestLabel] * 100);
        const dbg = validLabels.map(l => `${l}=${actionMap[l]}:${(normProbs[l] * 100).toFixed(1)}%`).join(" ");
        console.log(`[Delivery Agent] Probs: ${dbg} | => ${bestLabel}=${realAction} (${pct}%)`);
        const displayAction = realAction === "putdown" ? "put down" : realAction;
        statusEl.textContent = `Chose ${displayAction} (${pct}%)`;

        state.stepCount++;
        const fromRow = state.agentRow;
        const fromCol = state.agentCol;
        executeAction(realAction);

        const dist = validLabels.map(l => ({ action: actionMap[l], prob: normProbs[l] }));
        const entry = { action: realAction, pct, dist };

        const fromKey = `${fromRow},${fromCol}`;
        const toKey = `${state.agentRow},${state.agentCol}`;

        if (!state.visitedCells[fromKey]) state.visitedCells[fromKey] = { events: [] };
        state.visitedCells[fromKey].events.push(entry);

        if (realAction !== "pickup" && realAction !== "putdown") {
            state.visitedCells[toKey] = { events: [entry], arrival: entry };
        }
        state.history.push({
            action: bestLabel,
            actionName: realAction,
            pct,
            fromRow,
            fromCol,
            toRow: state.agentRow,
            toCol: state.agentCol,
        });

        renderGrid();

        if (state.delivered) {
            statusEl.textContent = `Delivered in ${state.stepCount} step${state.stepCount !== 1 ? "s" : ""}!`;
            state.autoActive = false;
            updateAutoButton();
            setUI(false);
        }
    } finally {
        state.stepInProgress = false;
    }
}

function renderGrid() {
    gridEl.innerHTML = "";
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement("div");
            cell.className = "thesis-cell";
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (row === state.deliveryRow && col === state.deliveryCol) {
                cell.classList.add("delivery");
            }

            const content = [];

            if (row === state.agentRow && col === state.agentCol) {
                content.push('<span class="thesis-agent">&#9650;</span>');
            }

            if (row === state.parcelRow && col === state.parcelCol && !state.hasParcel && !state.delivered) {
                content.push('<span class="thesis-parcel">&#9679;</span>');
            }

            const key = `${row},${col}`;
            const cellData = state.visitedCells[key];
            if (cellData && (cellData.arrival || (cellData.events && cellData.events.length))) {
                if (cellData.arrival) {
                    content.push(`<span class="thesis-uncertainty">${cellData.arrival.pct}%</span>`);
                }
                cell.addEventListener("click", () => showDistribution(key, cellData));
            }

            if (!state.started) {
                cell.classList.add("clickable");
                cell.addEventListener("click", () => handleCellClick(row, col));
            }

            cell.innerHTML = content.join("");
            gridEl.appendChild(cell);
        }
    }
}

function showDistribution(key, cell) {
    const [row, col] = key.split(",");
    const fmt = (a) => a === "putdown" ? "put down" : a;
    const parts = [];
    if (cell.arrival) {
        const lines = cell.arrival.dist
            .sort((a, b) => b.prob - a.prob)
            .map(d => `<span>${fmt(d.action)}: <strong>${(d.prob * 100).toFixed(1)}%</strong></span>`)
            .join("  ");
        parts.push(`<div class="thesis-dist-section"><strong>arrived here via: ${fmt(cell.arrival.action)} (${cell.arrival.pct}%)</strong><br>${lines}</div>`);
    }
    const nonArrival = cell.events.filter(e => e !== cell.arrival);
    const pickup = nonArrival.find(e => e.action === "pickup");
    const putdown = nonArrival.find(e => e.action === "putdown");
    const best = pickup || putdown || nonArrival[nonArrival.length - 1] || null;
    if (best) {
        const lines = best.dist
            .sort((a, b) => b.prob - a.prob)
            .map(d => `<span>${fmt(d.action)}: <strong>${(d.prob * 100).toFixed(1)}%</strong></span>`)
            .join("  ");
        const label = best.action === "pickup" ? "picked up" : best.action === "putdown" ? "put down" : `departed: ${fmt(best.action)}`;
        parts.push(`<div class="thesis-dist-section"><strong>${label} (${best.pct}%)</strong><br>${lines}</div>`);
    }
    distEl.innerHTML = `Cell (${row},${col})<br>${parts.join("")}`;
    distEl.style.display = "block";
}

function startAutoPlay() {
    state.autoActive = true;
    updateAutoButton();
    statusEl.textContent = "Auto-playing...";

    async function loop() {
        if (!state.autoActive || state.delivered || state.stepInProgress) {
            if (!state.delivered && state.autoActive && state.stepInProgress) {
                state.autoTimer = setTimeout(loop, Math.round(200 / state.speed));
            } else if (state.delivered) {
                state.autoActive = false;
                updateAutoButton();
                statusEl.textContent = "Delivered!";
            }
            return;
        }
        await step();
        if (state.autoActive && !state.delivered) {
            state.autoTimer = setTimeout(loop, Math.round(1000 / state.speed));
        }
    }

    loop();
}

function pauseAutoPlay() {
    state.autoActive = false;
    if (state.autoTimer) {
        clearTimeout(state.autoTimer);
        state.autoTimer = null;
    }
    updateAutoButton();
    statusEl.textContent = "Paused.";
}

autoBtn.addEventListener("click", () => {
    if (state.autoActive) {
        pauseAutoPlay();
    } else {
        startAutoPlay();
    }
});

speedBtn.addEventListener("click", () => {
    const speeds = [1, 2, 4, 8, 16];
    const idx = speeds.indexOf(state.speed);
    state.speed = speeds[(idx + 1) % speeds.length];
    speedBtn.textContent = `Speed: ${state.speed}x`;
    if (state.autoActive) {
        pauseAutoPlay();
        startAutoPlay();
    }
});

stepBtn.addEventListener("click", () => {
    step();
});

resetBtn.addEventListener("click", () => {
    pauseAutoPlay();
    state.agentRow = 2;
    state.agentCol = 2;
    state.parcelRow = null;
    state.parcelCol = null;
    state.deliveryRow = null;
    state.deliveryCol = null;
    state.hasParcel = false;
    state.delivered = false;
    state.started = false;
    state.autoActive = false;
    state.visitedCells = {};
    state.history = [];
    state.stepCount = 0;
    state.stepInProgress = false;
    state.speed = 1;
    speedBtn.textContent = "Speed: 1x";
    distEl.style.display = "none";
    updateAutoButton();
    setUI(false);
    statusEl.textContent = "Click any cell to place the parcel.";
    renderGrid();
});

renderGrid();
