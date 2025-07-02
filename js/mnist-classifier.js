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
            <div style="font-size: 0.9rem; margin-bottom: 10px;">All Probabilities:</div>
        `;
        
        // Create all digit rows with empty bars
        for (let i = 0; i < 10; i++) {
            html += `
                <div class="prediction-item" style="margin: 4px 0; display: flex; align-items: center; gap: 10px;">
                    <span id="digit-${i}" style="color: var(--primary-yellow); font-weight: normal; min-width: 15px;">
                        ${i}
                    </span>
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <div class="confidence-bar" style="flex: 1;">
                            <div id="confidence-fill-${i}" class="confidence-fill" style="width: 0%;"></div>
                        </div>
                        <span id="percentage-${i}" style="font-size: 0.8rem; min-width: 35px; text-align: right;">0.0%</span>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('mnist-prediction').innerHTML = html;
    }

    resetPredictionDisplay() {
        // Reset predicted digit
        const digitResult = document.getElementById('digit-result');
        if (digitResult) {
            digitResult.textContent = '-';
        }
        
        // Reset all bars and percentages
        for (let i = 0; i < 10; i++) {
            const digitLabel = document.getElementById(`digit-${i}`);
            const confidenceFill = document.getElementById(`confidence-fill-${i}`);
            const percentage = document.getElementById(`percentage-${i}`);
            
            if (digitLabel) {
                digitLabel.style.color = 'var(--primary-yellow)';
                digitLabel.style.fontWeight = 'normal';
            }
            if (confidenceFill) {
                confidenceFill.style.width = '0%';
            }
            if (percentage) {
                percentage.textContent = '0.0%';
            }
        }
    }

    updatePredictionDisplay(predictedDigit, probabilities) {
        // Update predicted digit
        const digitResult = document.getElementById('digit-result');
        if (digitResult) {
            digitResult.textContent = predictedDigit;
        }
        
        // Update all bars and percentages
        for (let i = 0; i < 10; i++) {
            const prob = (probabilities[i] * 100).toFixed(1);
            const isMax = i === predictedDigit;
            
            const digitLabel = document.getElementById(`digit-${i}`);
            const confidenceFill = document.getElementById(`confidence-fill-${i}`);
            const percentage = document.getElementById(`percentage-${i}`);
            
            if (digitLabel) {
                digitLabel.style.color = isMax ? 'var(--primary-green)' : 'var(--primary-yellow)';
                digitLabel.style.fontWeight = isMax ? 'bold' : 'normal';
            }
            if (confidenceFill) {
                confidenceFill.style.width = `${prob}%`;
            }
            if (percentage) {
                percentage.textContent = `${prob}%`;
            }
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
        
        return inputData;
    }

    generatePredictionHTML(predictedDigit, confidence, probabilities) {
        let html = `
            <div style="font-size: 1.5rem; margin-bottom: 15px;">
                Predicted Digit: <span style="font-size: 2.5rem; color: var(--primary-green);">${predictedDigit}</span>
            </div>
            <div style="font-size: 0.9rem;">All Probabilities:</div>
        `;
        
        // Show all digit probabilities
        for (let i = 0; i < 10; i++) {
            const prob = (probabilities[i] * 100).toFixed(1);
            const isMax = i === predictedDigit;
            html += `
                <div class="prediction-item" style="margin: 4px 0; display: flex; align-items: center; gap: 10px;">
                    <span style="color: ${isMax ? 'var(--primary-green)' : 'var(--primary-yellow)'}; font-weight: ${isMax ? 'bold' : 'normal'}; min-width: 15px;">
                        ${i}
                    </span>
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <div class="confidence-bar" style="flex: 1;">
                            <div class="confidence-fill" style="width: ${prob}%;"></div>
                        </div>
                        <span style="font-size: 0.8rem; min-width: 35px; text-align: right;">${prob}%</span>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    async classify() {
        if (!this.model) {
            document.getElementById('mnist-prediction').innerHTML = 'Model not loaded yet!';
            return;
        }

        try {
            // Show loading state on predicted digit only
            const digitResult = document.getElementById('digit-result');
            if (digitResult) {
                digitResult.textContent = '...';
            }
            
            const inputData = this.preprocessImage();
            const inputTensor = tf.tensor2d([inputData], [1, 784]);
            
            // Make prediction
            const prediction = this.model.predict(inputTensor);
            const probabilities = await prediction.data();
            
            // Get the predicted digit
            const predictedDigit = tf.argMax(prediction, 1).dataSync()[0];
            
            // Update the display
            this.updatePredictionDisplay(predictedDigit, probabilities);
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
        } catch (error) {
            console.error('Error during prediction:', error);
            const digitResult = document.getElementById('digit-result');
            if (digitResult) {
                digitResult.textContent = 'Error';
            }
        }
    }
}

// Global instance and functions for HTML onclick handlers
let mnistClassifier;

function classifyDigit() {
    mnistClassifier.classify();
}

function clearMnistCanvas() {
    mnistClassifier.clearCanvas();
}

// Initialize when page loads
window.addEventListener('load', () => {
    mnistClassifier = new MnistClassifier();
});
