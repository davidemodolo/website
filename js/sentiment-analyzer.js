// Sentiment Analysis with ml5.js
// ml5 0.12.2 is the last release shipping the `sentiment` model. ml5.sentiment() returns the
// model synchronously and invokes the callback once the weights are ready (it is NOT a Promise).
const ML5_URL = 'https://unpkg.com/ml5@0.12.2/dist/ml5.min.js';
let sentiment = null;
let isModelLoaded = false;
let ml5Promise = null;
let sentimentPromise = null;
function loadMl5() {
    if (window.ml5) return Promise.resolve(window.ml5);
    if (!ml5Promise) ml5Promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = ML5_URL;
        script.onload = () => resolve(window.ml5);
        script.onerror = () => { ml5Promise = null; reject(new Error('Failed to load ml5.js')); };
        document.head.appendChild(script);
    });
    return ml5Promise;
}
function loadSentimentModel() {
    if (!sentimentPromise) sentimentPromise = doLoadSentimentModel();
    return sentimentPromise;
}
async function doLoadSentimentModel() {
    const status = document.getElementById('sentiment-status');
    try {
        status.textContent = 'Loading sentiment model (~10 MB, one-time download)...';
        status.style.color = 'var(--muted-text)';
        const ml5 = await loadMl5();
        await new Promise((resolve, reject) => {
            try { sentiment = ml5.sentiment('movieReviews', resolve); } catch (error) { reject(error); }
        });
        isModelLoaded = true;
        status.textContent = 'Model loaded successfully! Ready to analyze sentiment.';
        status.style.color = 'var(--accent-green)';
    } catch (error) {
        console.error('Error loading sentiment model:', error);
        sentimentPromise = null;
        status.textContent = 'Error loading model. Click Analyze to retry.';
        status.style.color = '#ff4444';
        throw error;
    }
}
document.getElementById('sentiment-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); analyzeSentiment(); }
});
async function analyzeSentiment() {
    const input = document.getElementById('sentiment-input');
    const text = input.value.trim();
    if (!text) { alert('Please enter some text to analyze.'); return; }
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    scoreValue.textContent = '...';
    scoreValue.style.color = 'var(--text-color)';
    if (!isModelLoaded) {
        scoreDescription.textContent = 'Loading model...';
        try { await loadSentimentModel(); }
        catch (error) { scoreValue.textContent = 'Error'; scoreDescription.textContent = 'Model failed to load'; return; }
    }
    scoreDescription.textContent = 'Analyzing...';
    try {
        displaySentimentResult(await sentiment.predict(text));
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
        const confidence = prediction.confidence !== undefined ? prediction.confidence : prediction.score;
        if (isNaN(confidence) || confidence < 0 || confidence > 1) throw new Error('Invalid confidence value: ' + confidence);
        scoreValue.textContent = (Math.round(confidence * 1000) / 1000).toFixed(3);
        const sentiments = [
            { threshold: 0.3, label: 'Very Negative', color: '#ef4444' },
            { threshold: 0.45, label: 'Negative', color: '#f97316' },
            { threshold: 0.55, label: 'Neutral', color: '#eab308' },
            { threshold: 0.7, label: 'Positive', color: '#84cc16' },
            { threshold: 1, label: 'Very Positive', color: 'var(--accent-green)' }
        ];
        const band = sentiments.find(s => confidence <= s.threshold) || sentiments[sentiments.length - 1];
        scoreDescription.textContent = band.label;
        scoreValue.style.color = band.color;
    } catch (error) {
        console.error('Error displaying sentiment result:', error);
        scoreValue.textContent = 'Error';
        scoreDescription.textContent = 'Analysis failed';
    }
}
function clearSentimentInput() {
    const input = document.getElementById('sentiment-input');
    const scoreValue = document.getElementById('score-value');
    const scoreDescription = document.getElementById('score-description');
    input.value = '';
    scoreValue.textContent = '-';
    scoreValue.style.color = 'var(--text-color)';
    scoreDescription.textContent = '-';
    input.focus();
}
