// Sentiment Analysis with ml5.js and Speedometer Visualization

let sentiment;
let isModelLoaded = false;

// Initialize the sentiment analysis model when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSentimentModel();
    setupSentimentListeners();
});

function initializeSentimentModel() {
    const statusElement = document.getElementById('sentiment-status');
    
    try {
        // Initialize the sentiment analysis model
        sentiment = ml5.sentiment('MovieReviews', modelReady);
    } catch (error) {
        console.error('Error loading sentiment model:', error);
        statusElement.textContent = 'Error loading model. Please refresh the page.';
        statusElement.style.color = '#ff4444';
    }
}

function modelReady() {
    const statusElement = document.getElementById('sentiment-status');
    isModelLoaded = true;
    statusElement.textContent = 'Model loaded successfully! Ready to analyze sentiment.';
    statusElement.style.color = 'var(--primary-green)';
    
    // Enable the analyze button
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.disabled = false;
    analyzeBtn.style.opacity = '1';
}

function setupSentimentListeners() {
    const inputElement = document.getElementById('sentiment-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    // Disable button initially
    analyzeBtn.disabled = true;
    analyzeBtn.style.opacity = '0.6';
    
    // Add Enter key listener
    inputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (isModelLoaded) {
                analyzeSentiment();
            }
        }
    });
}

function analyzeSentiment() {
    if (!isModelLoaded) {
        alert('Model is still loading. Please wait.');
        return;
    }
    
    const inputElement = document.getElementById('sentiment-input');
    const text = inputElement.value.trim();
    
    if (!text) {
        alert('Please enter some text to analyze.');
        return;
    }
    
    // Show loading state
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    scoreValue.textContent = '...';
    scoreDescription.textContent = 'Analyzing...';
    
    // Predict sentiment
    try {
        const prediction = sentiment.predict(text);
        console.log('Prediction result:', prediction); // Debug log
        
        // Display results
        displaySentimentResult(prediction);
    } catch (error) {
        console.error('Error predicting sentiment:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}

async function displaySentimentResult(predictionPromise) {
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');

    try {
        // Await the prediction if it's a Promise
        const prediction = await Promise.resolve(predictionPromise);
        console.log('Raw prediction:', prediction); // Debug log

        // ml5.js sentiment returns an object with 'confidence' property
        let confidence;

        if (typeof prediction === 'object' && prediction !== null) {
            if (prediction.confidence !== undefined) {
                confidence = prediction.confidence;
            } else if (prediction.score !== undefined) {
                confidence = prediction.score;
            } else {
                confidence = parseFloat(prediction);
            }
        } else {
            confidence = parseFloat(prediction);
        }

        // Validate confidence value
        if (isNaN(confidence) || confidence < 0 || confidence > 1) {
            console.error('Invalid confidence value:', confidence);
            scoreValue.textContent = 'Error';
            scoreDescription.textContent = 'Invalid result';
            return;
        }

        const roundedScore = Math.round(confidence * 1000) / 1000; // Round to 3 decimal places
        scoreValue.textContent = roundedScore.toFixed(3);

        // Determine sentiment description
        let description = '';
        let color = '';

        if (confidence < 0.3) {
            description = 'Very Negative';
            color = '#ff4444';
        } else if (confidence < 0.45) {
            description = 'Negative';
            color = '#ff7744';
        } else if (confidence < 0.55) {
            description = 'Neutral';
            color = '#ffaa44';
        } else if (confidence < 0.7) {
            description = 'Positive';
            color = '#88ff44';
        } else {
            description = 'Very Positive';
            color = 'var(--primary-green)';
        }

        scoreDescription.textContent = description;
        scoreValue.style.color = color;

        // Draw speedometer with animation
        animateSpeedometer(confidence);
    } catch (error) {
        console.error('Error displaying sentiment result:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}

function animateSpeedometer(targetValue) {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas) {
        console.error('Speedometer canvas not found');
        return;
    }
    
    // Validate value
    if (isNaN(targetValue) || targetValue < 0 || targetValue > 1) {
        console.error('Invalid speedometer value:', targetValue);
        return;
    }
    
    console.log('Animating speedometer to value:', targetValue);
    
    // Animation parameters
    const animationDuration = 1000; // 2 seconds total
    const phase1Duration = 500; // 0.8 seconds to go from 0 to 1
    const phase2Duration = 50; // 0.4 seconds to pause at 1
    const phase3Duration = 500; // 0.8 seconds to go from 1 to target
    
    const startTime = Date.now();
    
    function animate() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        let currentValue;
        
        if (elapsed < phase1Duration) {
            // Phase 1: 0 to 1
            const progress = elapsed / phase1Duration;
            currentValue = easeInOutCubic(progress);
        } else if (elapsed < phase1Duration + phase2Duration) {
            // Phase 2: stay at 1
            currentValue = 1;
        } else if (elapsed < animationDuration) {
            // Phase 3: 1 to target value
            const phase3Elapsed = elapsed - phase1Duration - phase2Duration;
            const progress = phase3Elapsed / phase3Duration;
            const easedProgress = easeInOutCubic(progress);
            currentValue = 1 + (targetValue - 1) * easedProgress;
        } else {
            // Animation complete
            currentValue = targetValue;
            drawSpeedometer(currentValue);
            return;
        }
        
        drawSpeedometer(currentValue);
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Easing function for smooth animation
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

function drawSpeedometer(value) {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas) {
        console.error('Speedometer canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Make canvas responsive
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const canvasSize = Math.min(containerWidth - 40, 200); // Max 200px, responsive
    
    if (canvas.width !== canvasSize || canvas.height !== canvasSize * 0.6) {
        canvas.width = canvasSize;
        canvas.height = canvasSize * 0.6;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = Math.min(centerX, centerY) - 20;
    
    // Validate value
    if (isNaN(value) || value < 0 || value > 1) {
        console.error('Invalid speedometer value:', value);
        return;
    }
    
    console.log('Drawing speedometer with value:', value); // Debug log
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw arc background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(4, radius / 20);
    ctx.stroke();
    
    // Draw colored segments
    const segments = [
        { start: 0, end: 0.3, color: '#ff4444' },      // Red (negative)
        { start: 0.3, end: 0.45, color: '#ff7744' },   // Orange-red
        { start: 0.45, end: 0.55, color: '#ffaa44' },  // Yellow (neutral)
        { start: 0.55, end: 0.7, color: '#88ff44' },   // Yellow-green
        { start: 0.7, end: 1.0, color: '#00ff88' }     // Green (positive)
    ];
    
    segments.forEach(segment => {
        ctx.beginPath();
        const startAngle = Math.PI + (segment.start * Math.PI);
        const endAngle = Math.PI + (segment.end * Math.PI);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = Math.max(4, radius / 20);
        ctx.stroke();
    });
    
    // Draw needle
    const needleAngle = Math.PI + (value * Math.PI);
    const needleLength = radius - 10;
    const needleX = centerX + Math.cos(needleAngle) * needleLength;
    const needleY = centerY + Math.sin(needleAngle) * needleLength;
    
    console.log('Needle position:', needleX, needleY, 'Angle:', needleAngle); // Debug log
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, radius / 40);
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(4, radius / 20), 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw scale labels
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(10, radius / 8)}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText('0', centerX - radius + 10, centerY + 15);
    ctx.fillText('0.5', centerX, centerY - radius + 15);
    ctx.fillText('1', centerX + radius - 10, centerY + 15);
    
    // Draw title
    ctx.fillStyle = '#00ff88';
    ctx.font = `${Math.max(12, radius / 7)}px Courier New`;
    ctx.fillText('Sentiment Score', centerX, 25);
}

function clearSentimentInput() {
    const inputElement = document.getElementById('sentiment-input');
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    
    // Clear input
    inputElement.value = '';
    
    // Reset display
    scoreValue.textContent = '-';
    scoreValue.style.color = 'var(--primary-green)';
    scoreDescription.textContent = 'Enter text and click analyze';
    
    // Redraw empty speedometer
    initializeSpeedometer();
    
    // Focus on input
    inputElement.focus();
}

// Initialize empty speedometer on window show
function initializeSpeedometer() {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas) {
        console.error('Canvas not found for speedometer initialization');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Make canvas responsive
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const canvasSize = Math.min(containerWidth - 40, 200); // Max 200px, responsive
    
    if (canvas.width !== canvasSize || canvas.height !== canvasSize * 0.6) {
        canvas.width = canvasSize;
        canvas.height = canvasSize * 0.6;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = Math.min(centerX, centerY) - 20;
    
    console.log('Initializing speedometer'); // Debug log
    
    // Draw empty speedometer
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw arc background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(4, radius / 20);
    ctx.stroke();
    
    // Draw colored segments (faded)
    const segments = [
        { start: 0, end: 0.3, color: '#ff444444' },      // Red (negative) - with alpha
        { start: 0.3, end: 0.45, color: '#ff774444' },   // Orange-red - with alpha
        { start: 0.45, end: 0.55, color: '#ffaa4444' },  // Yellow (neutral) - with alpha
        { start: 0.55, end: 0.7, color: '#88ff4444' },   // Yellow-green - with alpha
        { start: 0.7, end: 1.0, color: '#00ff8844' }     // Green (positive) - with alpha
    ];
    
    segments.forEach(segment => {
        ctx.beginPath();
        const startAngle = Math.PI + (segment.start * Math.PI);
        const endAngle = Math.PI + (segment.end * Math.PI);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = Math.max(3, radius / 25);
        ctx.stroke();
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(4, radius / 20), 0, 2 * Math.PI);
    ctx.fillStyle = '#666';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw scale labels
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(10, radius / 8)}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText('0', centerX - radius + 10, centerY + 15);
    ctx.fillText('0.5', centerX, centerY - radius + 15);
    ctx.fillText('1', centerX + radius - 10, centerY + 15);
    
    // Draw title
    ctx.fillStyle = '#00ff88';
    ctx.font = `${Math.max(12, radius / 7)}px Courier New`;
    ctx.fillText('Sentiment Score', centerX, 25);
}

// Hook into window manager to initialize speedometer when window is shown
const originalToggleWindow = window.toggleWindow;
window.toggleWindow = function(windowId) {
    originalToggleWindow(windowId);
    if (windowId === 'sentiment-window') {
        setTimeout(initializeSpeedometer, 100);
    }
};
