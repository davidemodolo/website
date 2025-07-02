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
        const prediction = await Promise.resolve(predictionPromise);
        
        // Extract confidence value
        let confidence = prediction?.confidence ?? prediction?.score ?? parseFloat(prediction);
        
        if (isNaN(confidence) || confidence < 0 || confidence > 1) {
            throw new Error('Invalid confidence value');
        }

        const roundedScore = Math.round(confidence * 1000) / 1000;
        scoreValue.textContent = roundedScore.toFixed(3);

        // Determine sentiment
        const sentiments = [
            { threshold: 0.3, label: 'Very Negative', color: '#ff4444' },
            { threshold: 0.45, label: 'Negative', color: '#ff7744' },
            { threshold: 0.55, label: 'Neutral', color: '#ffaa44' },
            { threshold: 0.7, label: 'Positive', color: '#88ff44' },
            { threshold: 1, label: 'Very Positive', color: 'var(--primary-green)' }
        ];

        const sentiment = sentiments.find(s => confidence < s.threshold) || sentiments[sentiments.length - 1];
        scoreDescription.textContent = sentiment.label;
        scoreValue.style.color = sentiment.color;

        animateSpeedometer(confidence);
    } catch (error) {
        console.error('Error displaying sentiment result:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}

function animateSpeedometer(targetValue) {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas || isNaN(targetValue) || targetValue < 0 || targetValue > 1) return;
    
    // Simplified animation - direct ease to target
    const duration = 800;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
        
        drawSpeedometer(targetValue * easedProgress);
        
        if (progress < 1) requestAnimationFrame(animate);
    }
    animate();
}

function drawSpeedometer(value) {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas || isNaN(value) || value < 0 || value > 1) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const canvasSize = Math.min(container.clientWidth - 40, 200);
    
    if (canvas.width !== canvasSize) {
        canvas.width = canvasSize;
        canvas.height = canvasSize * 0.6;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = Math.min(centerX, centerY) - 20;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw arc background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = radius / 20;
    ctx.stroke();
    
    // Draw colored segments
    const segments = [
        { end: 0.3, color: '#ff4444' },
        { end: 0.45, color: '#ff7744' },
        { end: 0.55, color: '#ffaa44' },
        { end: 0.7, color: '#88ff44' },
        { end: 1.0, color: '#00ff88' }
    ];
    
    let start = 0;
    segments.forEach(segment => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI + start * Math.PI, Math.PI + segment.end * Math.PI);
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = radius / 20;
        ctx.stroke();
        start = segment.end;
    });
    
    // Draw needle
    const needleAngle = Math.PI + value * Math.PI;
    const needleLength = radius - 10;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(needleAngle) * needleLength,
        centerY + Math.sin(needleAngle) * needleLength
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = radius / 40;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius / 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = `${radius / 8}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText('0', centerX - radius + 10, centerY + 15);
    ctx.fillText('0.5', centerX, centerY - radius + 15);
    ctx.fillText('1', centerX + radius - 10, centerY + 15);
    ctx.fillText('Sentiment Score', centerX, 10);
}

function clearSentimentInput() {
    const inputElement = document.getElementById('sentiment-input');
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    
    inputElement.value = '';
    scoreValue.textContent = '-';
    scoreValue.style.color = 'var(--primary-green)';
    scoreDescription.textContent = 'Enter text and click analyze';
    
    initializeSpeedometer();
    inputElement.focus();
}

// Initialize empty speedometer on window show
function initializeSpeedometer() {
    const canvas = document.getElementById('sentiment-speedometer');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const canvasSize = Math.min(container.clientWidth - 40, 200);
    
    if (canvas.width !== canvasSize) {
        canvas.width = canvasSize;
        canvas.height = canvasSize * 0.6;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = Math.min(centerX, centerY) - 20;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background and faded segments
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = radius / 20;
    ctx.stroke();
    
    const segments = [
        { end: 0.3, color: '#ff444444' },
        { end: 0.45, color: '#ff774444' },
        { end: 0.55, color: '#ffaa4444' },
        { end: 0.7, color: '#88ff4444' },
        { end: 1.0, color: '#00ff8844' }
    ];
    
    let start = 0;
    segments.forEach(segment => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI + start * Math.PI, Math.PI + segment.end * Math.PI);
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = radius / 25;
        ctx.stroke();
        start = segment.end;
    });
    
    // Draw center circle and labels
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius / 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#666';
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${radius / 8}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText('0', centerX - radius + 10, centerY + 15);
    ctx.fillText('0.5', centerX, centerY - radius + 15);
    ctx.fillText('1', centerX + radius - 10, centerY + 15);
    ctx.fillText('Sentiment Score', centerX, 10);
}

// Hook into window manager to initialize speedometer when window is shown
const originalToggleWindow = window.toggleWindow;
window.toggleWindow = function(windowId) {
    originalToggleWindow(windowId);
    if (windowId === 'sentiment-window') {
        setTimeout(initializeSpeedometer, 100);
    }
};
