# 🚀 Enterprise AI Decision Intelligence Platform

A **fully open-source, production-ready** AI platform for smarter, faster, data-driven business decisions.  
Uses **100% free APIs and libraries** — no paid subscriptions required.

---

## 🌟 Features Overview

| Module                       | Features                                                               |
| ---------------------------- | ---------------------------------------------------------------------- |
| 🗄️ **Data Management**       | Upload CSV, Excel, JSON, PDF, DOCX, TXT · Preview · Stats · Clean      |
| 🤖 **AI Chat (RAG)**         | Chat with your data using Groq LLM + ChromaDB vector search            |
| 🧠 **Machine Learning**      | Classification, Regression, Forecasting, Anomaly Detection, Clustering |
| 📝 **NLP Analysis**          | Sentiment, NER, Summarization, Zero-shot Classification, Keywords      |
| 📊 **Analytics & BI**        | KPIs, Trend Analysis, Comparative Analysis, What-if Scenarios          |
| 🤝 **AI Agents**             | Data, Research, Finance, Marketing, Report agents + Orchestration      |
| 📄 **Document Intelligence** | Summarize, Q&A, Extract, Compare documents                             |
| 🎤 **Meeting Intelligence**  | Transcript analysis, Action item extraction, Follow-up generation      |
| 🔐 **Security**              | JWT Auth, Role-based access, Activity logs                             |

---

## 🆓 Free AI Services Used

| Service                                          | Purpose                   | Free Tier             |
| ------------------------------------------------ | ------------------------- | --------------------- |
| [**Groq**](https://console.groq.com)             | LLM inference (LLaMA 3.1) | 14,400 req/day FREE   |
| [**Google Gemini**](https://aistudio.google.com) | Fallback LLM              | FREE tier             |
| **ChromaDB**                                     | Vector database           | Local, unlimited FREE |
| **sentence-transformers**                        | Text embeddings           | Local, unlimited FREE |
| **HuggingFace Transformers**                     | NLP models                | Local, unlimited FREE |
| **scikit-learn**                                 | ML algorithms             | Local, unlimited FREE |
| **Prophet**                                      | Time series forecasting   | Local, unlimited FREE |

---

## 📁 Project Structure

```
enterprise-ai-platform/
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── api/                    # REST API endpoints
│   │   │   ├── auth.py             # Authentication (login/register)
│   │   │   ├── data.py             # Data upload & management
│   │   │   ├── chat.py             # RAG-powered AI chat
│   │   │   ├── ml.py               # Machine learning
│   │   │   ├── nlp.py              # NLP analysis
│   │   │   ├── analytics.py        # KPIs, reports, alerts
│   │   │   ├── agents.py           # AI agent system
│   │   │   └── documents.py        # Document intelligence
│   │   ├── models/
│   │   │   └── __init__.py         # All SQLAlchemy models
│   │   ├── services/
│   │   │   ├── llm_service.py      # Groq + Gemini LLM
│   │   │   ├── rag_service.py      # ChromaDB RAG
│   │   │   ├── ml_service.py       # ML training & prediction
│   │   │   ├── nlp_service.py      # HuggingFace NLP
│   │   │   ├── analytics_service.py # BI & analytics
│   │   │   ├── agent_service.py    # Multi-agent orchestration
│   │   │   └── data_service.py     # Data processing
│   │   ├── utils/
│   │   │   └── auth.py             # JWT utilities
│   │   ├── config.py               # App configuration
│   │   └── database.py             # SQLAlchemy setup
│   ├── data/                       # Runtime data (auto-created)
│   │   ├── uploads/                # Uploaded files
│   │   ├── vectors/                # ChromaDB vector store
│   │   └── models/                 # Trained ML models
│   ├── main.py                     # FastAPI app entry point
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment config template
│
├── frontend/                       # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── AppLayout.tsx   # Sidebar + header
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # Authentication
│   │   │   ├── DashboardPage.tsx   # Main dashboard
│   │   │   ├── DataPage.tsx        # Data management
│   │   │   ├── ChatPage.tsx        # AI chat
│   │   │   ├── MLPage.tsx          # Machine learning
│   │   │   ├── NLPPage.tsx         # NLP analysis
│   │   │   ├── AnalyticsPage.tsx   # Analytics & BI
│   │   │   ├── AgentsPage.tsx      # AI agents
│   │   │   ├── DocumentsPage.tsx   # Document intelligence
│   │   │   ├── ReportsPage.tsx     # Reports viewer
│   │   │   └── SettingsPage.tsx    # Settings
│   │   ├── services/
│   │   │   └── api.ts              # All API calls
│   │   ├── store/
│   │   │   └── index.ts            # Zustand global state
│   │   ├── App.tsx                 # Router
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docs/                           # Documentation
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

### 1. Clone & Setup Backend

```bash
cd enterprise-ai-platform/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your FREE API keys:
#   GROQ_API_KEY=your_key   ← Get free at https://console.groq.com
#   GEMINI_API_KEY=your_key  ← Get free at https://aistudio.google.com

# Download spaCy model
python -m spacy download en_core_web_sm

# Start the server
python main.py
# OR: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 2. Setup Frontend

```bash
cd enterprise-ai-platform/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 3. Login

| Role    | Email                     | Password   |
| ------- | ------------------------- | ---------- |
| Admin   | admin@enterprise-ai.com   | admin123   |
| Analyst | analyst@enterprise-ai.com | analyst123 |

---

## 🔑 Getting Free API Keys

### Groq (Primary LLM — REQUIRED for AI features)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Create an API key
4. Add to `.env`: `GROQ_API_KEY=gsk_...`
5. Free tier: **14,400 requests/day** with LLaMA 3.1

### Google Gemini (Backup LLM — Optional)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Get API key
3. Add to `.env`: `GEMINI_API_KEY=...`

> **Without any API key:** Data management, ML training, NLP (local models), and analytics still work fully. Only AI chat, report generation, and agent tasks require a free API key.

---

## 🎯 How to Use

### 1. Upload Your Data

- Go to **Data Management** → drag & drop CSV, Excel, JSON, PDF, or DOCX
- Files are auto-analyzed and indexed for RAG search

### 2. Chat with Your Data

- Go to **AI Chat** → select your uploaded files → ask questions in natural language
- The AI finds relevant context from your documents and answers accurately

### 3. Train ML Models

- Go to **Machine Learning** → click "Train Model"
- Select your dataset, choose target column, pick algorithm
- Model trains automatically, shows accuracy, feature importance

### 4. Run NLP Analysis

- Go to **NLP Analysis** → paste text → select analysis types
- Runs sentiment, entity extraction, keywords, summarization

### 5. Launch AI Agents

- Go to **AI Agents** → describe your goal
- Agent plans, executes, and delivers comprehensive analysis

### 6. Generate Reports

- Go to **Analytics** → AI Reports → enter title → Generate
- AI creates a full business report from your data

---

## 🔧 Configuration

### Environment Variables (backend/.env)

```env
# Required for AI features
GROQ_API_KEY=your_groq_key          # FREE: 14,400 req/day
GROQ_MODEL=llama-3.1-8b-instant     # Fast and free

# Optional backup LLM
GEMINI_API_KEY=your_gemini_key

# App settings
SECRET_KEY=your-secret-key-32chars
DATABASE_URL=sqlite:///./data/enterprise_ai.db

# File limits
MAX_FILE_SIZE_MB=50
```

---

## 🐳 Docker Deployment (Optional)

```bash
# Build and run with Docker
docker build -t enterprise-ai-backend ./backend
docker run -p 8000:8000 --env-file backend/.env enterprise-ai-backend

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx or any static server
```

---

## 📖 API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Key endpoints:

```
POST /api/auth/login          → Get JWT token
POST /api/data/upload         → Upload files
GET  /api/data/sources        → List uploaded files
POST /api/chat/message        → Send AI chat message
POST /api/ml/train            → Train ML model
POST /api/nlp/analyze         → NLP analysis
GET  /api/analytics/dashboard → Dashboard metrics
POST /api/agents/run          → Run AI agent
POST /api/documents/summarize → Summarize document
```

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — Free for personal and commercial use.

---

**Built with ❤️ using FastAPI, React, Groq, ChromaDB, HuggingFace, scikit-learn**

py -3.11 -m venv venv
.\venv\Scripts\activate
python main.py
