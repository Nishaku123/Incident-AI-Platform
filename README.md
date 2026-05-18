# RespondIQ – AI Incident Response Platform

🚀 AI-powered incident response platform for automated root-cause analysis, timeline reconstruction, and action-item generation.

## Live Demo

🔗 https://incident-ai-platform-zna7.vercel.app

## Features

* AI-powered incident analysis
* Root cause detection
* Automated timeline generation
* Action item recommendations
* Incident history tracking
* Report downloads
* Multi-file upload support
* Full-stack production deployment

## Tech Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* FastAPI
* Python
* SQLite

### Deployment

* Vercel (Frontend)
* Render (Backend)

## Supported Inputs

* alerts.json
* metrics.csv
* chat.txt
* runbook.md
* log files

## Run Locally

### Backend

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

Frontend (Next.js) → FastAPI Backend → Incident Analysis Engine → Database Storage → Results Dashboard
