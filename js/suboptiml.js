let suboptimlCirclesInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    const loadButton = document.getElementById('btn-load-demo');
    if (loadButton) {
        loadButton.addEventListener('click', runSuboptiMLDemo);
    }
    if (!suboptimlCirclesInitialized) {
        createSuboptiMLCircles();
        suboptimlCirclesInitialized = true;
    }
});

function createSuboptiMLCircles() {
    const container = document.querySelector('.suboptiml-floating-elements');
    if (!container) return;

    setInterval(() => {
        const circle = document.createElement('div');
        circle.className = 'suboptiml-floating-circle';

        const size = Math.random() * 40 + 10;
        const leftPosition = Math.random() * 100;
        const animationDuration = Math.random() * 8 + 12; // 12s to 20s

        circle.style.width = size + 'px';
        circle.style.height = size + 'px';
        circle.style.left = leftPosition + '%';
        circle.style.animationName = 'suboptimlFloatUp'; // Ensure it uses the correct animation
        circle.style.animationDuration = animationDuration + 's';

        container.appendChild(circle);

        setTimeout(() => {
            circle.remove();
        }, animationDuration * 1000);
    }, 2500); // Create a new circle every 2.5 seconds
}

function runSuboptiMLDemo() {
    const demoControls = document.getElementById('suboptiml-demo-controls');
    const statusAndResults = document.getElementById('suboptiml-status-and-results');
    const resultsContainer = document.getElementById('suboptiml-results-container');

    // Hide button and show status
    if (demoControls) demoControls.style.display = 'none';
    if (statusAndResults) statusAndResults.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'none';

    const DEMO_DATA = {
        results: {
            training: {
                metrics: {
                    accuracy: 0.978,
                    precision_weighted: 0.98,
                    recall_weighted: 0.978,
                    f1_weighted: 0.978,
                }
            },
            interpretation: {
                interpretation_data: {
                    feature_importance: {
                        gain: [
                            { feature: "PetalLengthCm", importance: 0.657 },
                            { feature: "PetalWidthCm", importance: 0.301 },
                            { feature: "SepalWidthCm", importance: 0.027 },
                            { feature: "SepalLengthCm", importance: 0.015 }
                        ]
                    },
                    permutation_importance: [
                        { feature: "PetalLengthCm", importance_mean: 0.41 },
                        { feature: "PetalWidthCm", importance_mean: 0.35 },
                        { feature: "SepalLengthCm", importance_mean: 0.08 },
                        { feature: "SepalWidthCm", importance_mean: 0.02 }
                    ],
                }
            }
        }
    };

    // Simulate analysis steps
    const steps = [
        { id: 'suboptiml-step-data_prep', duration: 1000 },
        { id: 'suboptiml-step-training', duration: 1200 },
        { id: 'suboptiml-step-interpretation', duration: 1000 }
    ];

    let delay = 0;
    steps.forEach((step, index) => {
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) el.classList.add('running');
        }, delay);

        delay += step.duration;

        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('running');
                el.classList.add('done');
            }

            if (index === steps.length - 1) {
                renderSuboptiMLVisuals(DEMO_DATA);
                if (resultsContainer) resultsContainer.style.display = 'grid';
            }
        }, delay);
    });
}

function renderSuboptiMLVisuals(data) {
    const { training, interpretation } = data.results;
    
    // Render Metrics
    const metricsContainer = document.getElementById('suboptiml-metrics-container');
    if (metricsContainer) {
        metricsContainer.innerHTML = Object.entries(training.metrics).map(([key, value]) => `
            <div class="metric-box">
                <div class="metric-value">${Number(value).toFixed(3)}</div>
                <div class="metric-label">${key.replace(/_/g, ' ')}</div>
            </div>`).join('');
    }

    // Render Feature Importance
    const gainChartContainer = document.getElementById('suboptiml-chart-gain');
    if (gainChartContainer) {
        const gainData = interpretation.interpretation_data.feature_importance.gain;
        const gainOptions = getSuboptiMLBaseChartOptions();
        gainOptions.series = [{ name: 'Gain', data: gainData.map(d => d.importance) }];
        gainOptions.xaxis.categories = gainData.map(d => d.feature);
        new ApexCharts(gainChartContainer, gainOptions).render();
    }

    // Render Permutation Importance
    const permChartContainer = document.getElementById('suboptiml-chart-permutation');
    if (permChartContainer) {
        const permData = interpretation.interpretation_data.permutation_importance;
        const permOptions = getSuboptiMLBaseChartOptions('#6366f1');
        permOptions.series = [{ name: 'Mean Importance', data: permData.map(d => d.importance_mean) }];
        permOptions.xaxis.categories = permData.map(d => d.feature);
        new ApexCharts(permChartContainer, permOptions).render();
    }
}

function getSuboptiMLBaseChartOptions(themeColor = '#22c55e') {
    return {
        chart: { type: 'bar', height: 250, toolbar: { show: false }, foreColor: '#a0aec0' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '60%' } },
        dataLabels: { enabled: false },
        xaxis: { labels: { style: { colors: '#a0aec0' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: '#e5e7eb', fontSize: '12px' } } },
        grid: { borderColor: '#ffffff1a', strokeDashArray: 4 },
        tooltip: { theme: 'dark' },
        colors: [themeColor]
    };
}