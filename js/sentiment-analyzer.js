// Sentiment Analysis with ml5.js

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
        // Initialize sentiment model
        const sentimentResult = ml5.sentiment('MovieReviews', modelReady);
        
        // Handle the Promise
        sentimentResult.then((result) => {
            sentiment = result;
            modelReady();
        }).catch((error) => {
            console.error('Error loading sentiment model:', error);
            statusElement.textContent = 'Error loading model. Please refresh the page.';
            statusElement.style.color = '#ff4444';
        });
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
    statusElement.style.color = 'var(--accent-green)';
    
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

async function analyzeSentiment() {
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
    scoreValue.style.color = 'var(--text-color)';
    scoreDescription.textContent = 'Analyzing...';
    
    // Predict sentiment using the loaded model
    try {
        const prediction = await sentiment.predict(text);
        
        // Display results
        displaySentimentResult(prediction);
    } catch (error) {
        console.error('Error predicting sentiment:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}

function displaySentimentResult(prediction) {
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');

    try {
        // ml5.js sentiment model returns an object with confidence score
        const confidence = prediction.confidence;
        
        if (isNaN(confidence) || confidence < 0 || confidence > 1) {
            throw new Error('Invalid confidence value: ' + confidence);
        }

        const roundedScore = Math.round(confidence * 1000) / 1000;
        scoreValue.textContent = roundedScore.toFixed(3);

        // Determine sentiment
        const sentiments = [
            { threshold: 0.3, label: 'Very Negative', color: '#ef4444' },
            { threshold: 0.45, label: 'Negative', color: '#f97316' },
            { threshold: 0.55, label: 'Neutral', color: '#eab308' },
            { threshold: 0.7, label: 'Positive', color: '#84cc16' },
            { threshold: 1, label: 'Very Positive', color: 'var(--accent-green)' }
        ];

        const sentiment = sentiments.find(s => confidence <= s.threshold) || sentiments[sentiments.length - 1];
        scoreDescription.textContent = sentiment.label;
        scoreValue.style.color = sentiment.color;

    } catch (error) {
        console.error('Error displaying sentiment result:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}

function clearSentimentInput() {
    const inputElement = document.getElementById('sentiment-input');
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    
    inputElement.value = '';
    scoreValue.textContent = '-';
    scoreValue.style.color = 'var(--text-color)';
    scoreDescription.textContent = '-';
    
    inputElement.focus();
}
