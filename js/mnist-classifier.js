// MNIST Digit Classification Module
class MnistClassifier {
    constructor() {
        this.model = null;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.init();
    }

    init() {
        this.canvas = document.getElementById('mnist-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEventListeners();
        this.loadModel();
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
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
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

    stopDrawing() {
        this.isDrawing = false;
        this.ctx.beginPath();
    }

    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.resetPredictionDisplay();
    }

    async loadModel() {
        try {
            document.getElementById('mnist-status').innerText = 'Loading MNIST model...';
            this.model = await tf.loadLayersModel('./mnist-model.json');
            document.getElementById('mnist-status').innerText = 'Model loaded successfully! Ready to classify digits.';
            this.initializePredictionDisplay();
            console.log('MNIST model loaded successfully');
        } catch (error) {
            console.error('Error loading MNIST model:', error);
            document.getElementById('mnist-status').innerText = 'Error loading model. Please ensure mnist-model.json and mnist-model.weights.bin are in the same directory.';
        }
    }

    initializePredictionDisplay() {
        let html = `
            <div style="font-size: 1.5rem; margin-bottom: 10px;">
                Predicted Digit: <span id="digit-result" style="font-size: 2.5rem; color: var(--accent-green);">-</span>
            </div>
            <div class="keypad-grid">
        `;
        
        // Create keypad layout: 1 2 3 / 4 5 6 / 7 8 9 / 0
        const layout = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, null];
        
        for (let i = 0; i < layout.length; i++) {
            const digit = layout[i];
            if (digit === null) {
                html += `<div class="keypad-empty"></div>`;
            } else {
                html += `
                    <div id="keypad-btn-${digit}" class="keypad-btn">
                        <span class="keypad-digit">${digit}</span>
                        <span id="keypad-prob-${digit}" class="keypad-prob">0%</span>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        document.getElementById('mnist-prediction').innerHTML = html;
    }

    resetPredictionDisplay() {
        const digitResult = document.getElementById('digit-result');
        if (digitResult) digitResult.textContent = '-';
        
        for (let i = 0; i < 10; i++) {
            const btn = document.getElementById(`keypad-btn-${i}`);
            const prob = document.getElementById(`keypad-prob-${i}`);
            
            if (btn) {
                btn.style.backgroundColor = 'var(--card-bg)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-color)';
            }
            if (prob) prob.textContent = '0%';
        }
    }

    updatePredictionDisplay(predictedDigit, probabilities) {
        // Update predicted digit
        const digitResult = document.getElementById('digit-result');
        if (digitResult) digitResult.textContent = predictedDigit;
        
        // Update all keypad buttons
        for (let i = 0; i < 10; i++) {
            const probValue = probabilities[i];
            const probPercent = (probValue * 100).toFixed(0);
            const isMax = i === predictedDigit;
            
            const btn = document.getElementById(`keypad-btn-${i}`);
            const prob = document.getElementById(`keypad-prob-${i}`);
            
            if (btn) {
                // Calculate color based on probability
                // Base color: var(--card-bg)
                // Target color: var(--accent-green)
                // We'll use rgba to blend
                btn.style.backgroundColor = `rgba(34, 197, 94, ${probValue * 0.8})`;
                btn.style.borderColor = isMax ? 'var(--accent-green)' : 'var(--border-color)';
                btn.style.color = isMax ? 'white' : 'var(--text-color)';
            }
            if (prob) prob.textContent = `${probPercent}%`;
        }
    }

    preprocessImage() {
        // Create a temporary canvas for 28x28 processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 28;
        tempCanvas.height = 28;
        
        // Draw the original image scaled down to 28x28
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, 28, 28);
        tempCtx.drawImage(this.canvas, 0, 0, 280, 280, 0, 0, 28, 28);
        
        // Get the 28x28 image data
        const smallImageData = tempCtx.getImageData(0, 0, 28, 28);
        
        // Convert to grayscale and normalize (invert colors to match MNIST)
        const inputData = new Float32Array(28 * 28);
        for (let i = 0; i < 28 * 28; i++) {
            const pixelIndex = i * 4;
            const r = smallImageData.data[pixelIndex];
            const g = smallImageData.data[pixelIndex + 1];
            const b = smallImageData.data[pixelIndex + 2];
            
            // Convert to grayscale and invert (MNIST expects white digits on black background)
            const grayscale = (r + g + b) / 3;
            inputData[i] = (255 - grayscale) / 255.0; // Invert and normalize
        }
        
        return tf.tensor2d(inputData, [1, 784]);
    }

    async classify() {
        if (!this.model) {
            alert('Model is not loaded yet. Please wait.');
            return;
        }

        try {
            // Preprocess the image
            const tensor = this.preprocessImage();
            
            // Run prediction
            const predictions = await this.model.predict(tensor).data();
            
            // Find the digit with highest probability
            let maxProb = 0;
            let predictedDigit = 0;
            
            for (let i = 0; i < 10; i++) {
                if (predictions[i] > maxProb) {
                    maxProb = predictions[i];
                    predictedDigit = i;
                }
            }
            
            // Update UI
            this.updatePredictionDisplay(predictedDigit, predictions);
            
            // Cleanup tensor
            tensor.dispose();
            
        } catch (error) {
            console.error('Error during classification:', error);
            document.getElementById('mnist-status').innerText = 'Error during classification.';
        }
    }
}

// Global instance and functions for HTML buttons
let mnistClassifier;

document.addEventListener('DOMContentLoaded', () => {
    mnistClassifier = new MnistClassifier();
});

function classifyDigit() {
    if (mnistClassifier) {
        mnistClassifier.classify();
    }
}

function clearMnistCanvas() {
    if (mnistClassifier) {
        mnistClassifier.clearCanvas();
    }
}
