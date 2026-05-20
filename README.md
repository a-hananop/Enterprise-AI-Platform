# 🚀 Enterprise AI Decision Intelligence Platform (NexusAI)

A **fully open-source, production-ready** AI platform designed to empower organizations with smarter, faster, data-driven business decisions.  
Built exclusively using **100% free APIs and libraries** — no paid subscriptions required.

---

## 🌟 Features Overview

| Module                       | Capabilities                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------- |
| 🗄️ **Data Management**       | Upload CSV, Excel, JSON, PDF, DOCX, TXT · Preview · Stats · Auto-Cleaning    |
| 🤖 **AI Chat (RAG)**         | Chat with your data using Groq LLM (LLaMA 3.1) + ChromaDB vector search      |
| 🧠 **Machine Learning**      | Classification, Regression, Time-Series Forecasting, Anomaly Detection, Clustering |
| 📝 **NLP Analysis**          | Sentiment Analysis, NER, Summarization, Zero-shot Classification             |
| 📊 **Analytics & BI**        | KPIs, Trend Analysis, Comparative Analysis, Customer Segmentation            |
| 🤝 **Autonomous AI Agents**  | Data, Research, Finance, Marketing, and Report agents with Orchestration     |
| 📄 **Document Intelligence** | Summarize, Q&A, Extract, and Compare documents                               |
| 🔐 **Security & Access**     | JWT Authentication, Role-based Access Control (RBAC), Activity Logging       |

---

## 📈 Machine Learning Capabilities (v2.0 Updates)

The ML pipeline has been completely overhauled for enterprise-grade performance and reliability:

- **Expanded Model Factory**: Support for **XGBoost, Gradient Boosting, Random Forest, Support Vector Machines (SVM), and Linear/Logistic Regression**.
- **Time-Series Forecasting**: Integrated **Facebook Prophet** for highly accurate temporal predictions with trend and seasonality decomposition.
- **Unsupervised Anomaly Detection**: Integrated **Isolation Forest** algorithms for automated fraud and outlier detection in financial/operational data.
- **Customer Segmentation**: **K-Means clustering** (with dynamic inertia evaluation) to group high-value customers and identify churn risks.
- **Advanced Preprocessing**: Robust pipeline featuring median imputation for missing values, automatic low-cardinality categorical encoding, and automated pruning of high-cardinality noise.
- **Deep Evaluation Metrics**: Granular model evaluation reporting Accuracy, F1-Score, Precision, Recall, MAE, RMSE, and R² Score alongside automated feature importance extraction.

---

## 🆓 Free AI Services Used

| Service                                          | Purpose                   | Cost / Tier           |
| ------------------------------------------------ | ------------------------- | --------------------- |
| [**Groq**](https://console.groq.com)             | Primary LLM (LLaMA 3.1)   | 14,400 req/day FREE   |
| [**Google Gemini**](https://aistudio.google.com) | Fallback LLM Engine       | FREE tier             |
| **ChromaDB**                                     | Vector Database (RAG)     | Local, unlimited FREE |
| **sentence-transformers**                        | Text Embeddings           | Local, unlimited FREE |
| **HuggingFace Transformers**                     | Local NLP execution       | Local, unlimited FREE |
| **scikit-learn & XGBoost**                       | ML Engine                 | Local, unlimited FREE |
| **Prophet**                                      | Time series forecasting   | Local, unlimited FREE |

---

## 📁 Project Structure

```text
enterprise-ai-platform/
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── api/                    # RESTful API router endpoints
│   │   ├── models/                 # SQLAlchemy database schemas
│   │   ├── services/               # Core logic (ML, NLP, Agents, RAG)
│   │   ├── utils/                  # Security and JWT helpers
│   │   ├── config.py               # Application configuration
│   │   └── database.py             # SQLite / PostgreSQL setup
│   ├── data/                       # Persistent Volume Mounts
│   │   ├── uploads/                # User uploaded datasets/documents
│   │   ├── vectors/                # ChromaDB vector indexes
│   │   └── models/                 # Serialized .pkl ML models
│   ├── main.py                     # FastAPI application entry point
│   └── requirements.txt            # Python dependencies
│
├── frontend/                       # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Route views (Dashboard, Agents, ML)
│   │   ├── services/               # Axios API client integrations
│   │   ├── store/                  # Zustand global state management
│   │   └── App.tsx                 # React Router
│   ├── package.json                # Node dependencies
│   └── tailwind.config.js          # Tailwind CSS styling engine
└── README.md
```

---

## ⚡ Quick Start (Local Environment)

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
- Go to **Data Management** → drag & drop CSV, Excel, JSON, PDF, or DOCX.
- Files are auto-analyzed, cleaned (median imputation, encoding), and indexed for RAG search.

### 2. Chat with Your Data
- Go to **AI Chat** → select your uploaded files → ask questions in natural language.
- The AI uses ChromaDB to find relevant context from your documents and answers accurately with Groq LLaMA 3.1.

### 3. Train ML Models
- Go to **Machine Learning** → click "Train Model".
- Select your dataset, choose target column, pick algorithm (XGBoost, Gradient Boosting, Prophet, etc.).
- Model trains automatically, showing accuracy, R², F1-scores, and feature importance.

### 4. Run NLP Analysis
- Go to **NLP Analysis** → paste text → select analysis types.
- Runs local sentiment analysis, entity extraction, keywords, and summarization using HuggingFace.

### 5. Launch AI Agents
- Go to **AI Agents** → select an agent (Data, Research, Marketing, Finance) or use **Multi-Agent Orchestration**.
- Describe your goal. The agent plans, executes, and delivers comprehensive step-by-step analysis.

### 6. Generate Reports
- Go to **Analytics** → AI Reports → enter title → Generate.
- AI creates a full business report from your data automatically.

---

## 🔧 Configuration

### Environment Variables (`backend/.env`)

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

## 🚀 Deployment Guide (Production & Docker)

### 1. Cloud Deployment (Railway.app - Recommended)
This project is built to be easily deployed on [Railway](https://railway.app):
1. **Frontend:** Deploy the `frontend/` directory (Build: `npm run build`, Start: `npx serve -s dist`).
2. **Backend:** Deploy the `backend/` directory natively using Railway's Python environment.
3. **Data Persistence:** Create a **Railway Volume** and mount it to `/data` in your backend service. Set your environment variable `DATABASE_URL=sqlite:////data/enterprise_ai.db`. This perfectly preserves your database, trained `.pkl` models, and ChromaDB vector files without needing PostgreSQL!

### 2. Docker Deployment (Local / VPS)
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
```text
POST /api/auth/login          → Get JWT token
POST /api/data/upload         → Upload files
GET  /api/data/sources        → List uploaded files
POST /api/chat/message        → Send AI chat message
POST /api/ml/train            → Train ML model
POST /api/nlp/analyze         → NLP analysis
GET  /api/analytics/dashboard → Dashboard metrics
POST /api/agents/run          → Run AI agent
POST /api/agents/orchestrate  → Run multi-agent orchestrator
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
**Built with ❤️ using FastAPI, React, Groq, ChromaDB, HuggingFace, XGBoost, and scikit-learn**
