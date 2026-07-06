# davidemodolo.dev

Personal website -- an interactive, brutalist-styled CV running entirely client-side. Built as a single static HTML page with no framework, hosted on GitHub Pages.

## Tech Stack

- Pure HTML/CSS/JS -- no bundler, no framework
- **Titillium Web** for headings and UI elements, **Consolas** for body text
- Dark brutalist theme: thick borders, hard shadows, high-contrast green accents

## Sections

### About
Professional summary: AI/ML Engineer with a Master's in AI Systems, focused on NLP, Transformers, RAG, LLMs, and Computer Vision.

### Experience
Two roles:
- **OpenCity Labs** (2025-present): NLP pipeline engineering, RAG ingestion with PII anonymization, cross-lingual guard, agentic AI system with MCP tool-calling, Docker/GitLab CI deployment
- **Eurecat** (2024): Token-level uncertainty estimation for planning tasks, RAG system for user preferences, multimodal agent with LLaVA

### Education
- **MSc in AI Systems** @ University of Trento -- thesis on LLMs for agent planning, uncertainty quantification via token log-probabilities and conformal prediction
- **BSc in Computer Science** @ University of Trento -- thesis on Android app for healthy lifestyle monitoring

### Projects
Five university projects with links to slides, reports, and code:
- COVID-19 Lung Ultrasound Classification (ResNet18, t-SNE retrieval)
- Joint Intent Detection and Slot Filling (5 architectures, BERT/ERNIE)
- Domain Adaptation with HoMM (ResNet34, 3rd/4th-order moment matching)
- Autonomous Delivery BDI Agent (PDDL online solver, multi-agent coordination)
- Parallel Closest Pair of Points (C/MPI, 28x speedup on 80 cores)

### Interactive Demos
All models run **entirely in the browser** -- no data is sent to any server.

| Demo | Model | Framework | Size |
|------|-------|-----------|------|
| **Digit Classifier** | CNN (Conv2D 32/64, Dense 128, Softmax 10) | TensorFlow.js | ~2 MB |
| **Sentiment Analysis** | Conv1D text classifier (IMDB 25k) | ml5.js | ~1 MB |
| **LLM Playground** | LaMini-Flan-T5-77M (4-bit quantized) | Transformers.js + ONNX | ~100 MB |

The LLM Playground implements the core idea from my Master's thesis: prompt the model with a multiple-choice question (A-D options + E = none), capture the decoder's first-step logits before sampling, extract probabilities for the A-E token IDs, and visualize the model's internal confidence calibration as a bar chart.

### Contact
Links to LinkedIn and GitHub profiles, plus downloadable CV.

## Project Structure

```
.
├── index.html                     # single-page site
├── styles.css                     # all styles (dark brutalist theme)
├── js/
│   ├── mnist-classifier.js        # CNN digit recognition
│   ├── sentiment-analyzer.js      # sentiment scoring via ml5.js
│   └── llm-playground.js          # T5-77M MCQ uncertainty demo
├── mnist-model.json               # TF.js model architecture
├── mnist-model.weights.bin        # TF.js model weights
├── Davide_Modolo_Resume.pdf       # downloadable CV
├── favicon.ico
└── README.md
```

## Run Locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

The site is fully static -- no build step, no npm install, no server needed beyond serving files.
