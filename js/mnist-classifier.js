// MNIST Digit Classification Module
// tfjs 1.7.4 must match the copy bundled in ml5 0.12.2 (see sentiment-analyzer.js).
const TFJS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js';
let tfPromise = null;
function loadTfjs() {
    if (window.tf) return Promise.resolve(window.tf);
    if (!tfPromise) tfPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = TFJS_URL;
        script.onload = () => resolve(window.tf);
        script.onerror = () => { tfPromise = null; reject(new Error('Failed to load TensorFlow.js')); };
        document.head.appendChild(script);
    });
    return tfPromise;
}
class MnistClassifier {
    constructor() { this.model = null; this.modelPromise = null; this.canvas = null; this.ctx = null; this.isDrawing = false; this.init(); }
    init() { this.canvas = document.getElementById('mnist-canvas'); this.ctx = this.canvas.getContext('2d'); this.setupCanvas(); this.setupEventListeners(); this.observeVisibility(); }
    observeVisibility() {
        const section = document.getElementById('interactive');
        if (!('IntersectionObserver' in window) || !section) { this.loadModel(); return; }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); this.loadModel(); }
        }, { rootMargin: '800px 0px' });
        observer.observe(section);
    }
    setupCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = 12;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = 'black';
    }
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.canvas.dispatchEvent(new MouseEvent('mouseup', {}));
        });
    }
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.beginPath();
        this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        this.ctx.stroke();
    }
    stopDrawing() { this.isDrawing = false; this.ctx.beginPath(); }
    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.resetPredictionDisplay();
    }
    async loadModel() {
        if (this.modelPromise) return this.modelPromise;
        this.modelPromise = this.doLoadModel();
        try { await this.modelPromise; } catch (error) { this.modelPromise = null; }
        return this.modelPromise;
    }
    async doLoadModel() {
        try {
            document.getElementById('mnist-status').innerText = 'Loading MNIST model...';
            const tf = await loadTfjs();
            await tf.ready();
            this.model = await tf.loadLayersModel('./mnist-model.json');
            document.getElementById('mnist-status').innerText = 'Model loaded successfully! Ready to classify digits.';
            document.getElementById('mnist-status').style.color = 'var(--accent-green)';
            this.initializePredictionDisplay();
        } catch (error) {
            console.error('Error loading MNIST model:', error);
            document.getElementById('mnist-status').innerText = 'Error loading model. Please ensure mnist-model.json and mnist-model.weights.bin are in the same directory.';
            document.getElementById('mnist-status').style.color = '#ff4444';
            throw error;
        }
    }
    initializePredictionDisplay() {
        let html = `<div style="font-weight:900; font-size:1rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">Predicted: <span id="digit-result" style="font-size:1.8rem; color:var(--accent-green);">?</span></div><div class="keypad-grid">`;
        for (let i = 0; i < 10; i++) html += `<div id="keypad-btn-${i}" class="keypad-btn"><span class="keypad-digit">${i}</span><span id="keypad-prob-${i}" class="keypad-prob">0%</span></div>`;
        document.getElementById('mnist-prediction').innerHTML = html + `</div>`;
    }
    resetPredictionDisplay() {
        const digitResult = document.getElementById('digit-result');
        if (digitResult) digitResult.textContent = '-';
        for (let i = 0; i < 10; i++) {
            const btn = document.getElementById(`keypad-btn-${i}`);
            const prob = document.getElementById(`keypad-prob-${i}`);
            if (btn) { btn.style.backgroundColor = 'var(--card-bg)'; btn.style.borderColor = 'var(--border-color)'; btn.style.color = 'var(--text-color)'; }
            if (prob) prob.textContent = '0%';
        }
    }
    updatePredictionDisplay(predictedDigit, probabilities) {
        const digitResult = document.getElementById('digit-result');
        if (digitResult) digitResult.textContent = predictedDigit;
        for (let i = 0; i < 10; i++) {
            const probValue = probabilities[i];
            const isMax = i === predictedDigit;
            const btn = document.getElementById(`keypad-btn-${i}`);
            const prob = document.getElementById(`keypad-prob-${i}`);
            if (btn) {
                btn.style.backgroundColor = `rgba(34, 197, 94, ${probValue * 0.8})`;
                btn.style.borderColor = isMax ? 'var(--accent-green)' : 'var(--border-color)';
                btn.style.color = isMax ? 'white' : 'var(--text-color)';
            }
            if (prob) prob.textContent = `${(probValue * 100).toFixed(0)}%`;
        }
    }
    preprocessImage() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 28;
        tempCanvas.height = 28;
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, 28, 28);
        tempCtx.drawImage(this.canvas, 0, 0, 280, 280, 0, 0, 28, 28);
        const pixels = tempCtx.getImageData(0, 0, 28, 28).data;
        const inputData = new Float32Array(28 * 28);
        for (let i = 0; i < 28 * 28; i++) {
            const p = i * 4;
            inputData[i] = (255 - (pixels[p] + pixels[p + 1] + pixels[p + 2]) / 3) / 255.0;
        }
        return tf.tensor2d(inputData, [1, 784]);
    }
    async classify() {
        if (!this.model) await this.loadModel();
        if (!this.model) { alert('Model is not loaded yet. Please wait.'); return; }
        try {
            const tensor = this.preprocessImage();
            const predictions = await this.model.predict(tensor).data();
            let maxProb = 0;
            let predictedDigit = 0;
            for (let i = 0; i < 10; i++) if (predictions[i] > maxProb) { maxProb = predictions[i]; predictedDigit = i; }
            this.updatePredictionDisplay(predictedDigit, predictions);
            tensor.dispose();
        } catch (error) {
            console.error('Error during classification:', error);
            document.getElementById('mnist-status').innerText = 'Error during classification.';
            document.getElementById('mnist-status').style.color = '#ff4444';
        }
    }
}
const mnistClassifier = new MnistClassifier();
function classifyDigit() { mnistClassifier.classify(); }
function clearMnistCanvas() { mnistClassifier.clearCanvas(); }
