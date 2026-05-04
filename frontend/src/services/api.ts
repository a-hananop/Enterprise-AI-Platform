import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────
export const authAPI = {
  login: (username: string, password: string) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/me', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  listUsers: () => api.get('/auth/users'),
}

// ── Data ─────────────────────────────────────────────────────
export const dataAPI = {
  upload: (file: File, meta: any = {}) => {
    const fd = new FormData()
    fd.append('file', file)
    Object.entries(meta).forEach(([k, v]) => v !== undefined && fd.append(k, v as string))
    return api.post('/data/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  list: (params?: any) => api.get('/data/sources', { params }),
  get: (id: string) => api.get(`/data/sources/${id}`),
  preview: (id: string, rows = 10) => api.get(`/data/sources/${id}/preview`, { params: { rows } }),
  stats: (id: string) => api.get(`/data/sources/${id}/stats`),
  clean: (id: string, ops: any) => api.post(`/data/sources/${id}/clean`, ops),
  delete: (id: string) => api.delete(`/data/sources/${id}`),
  storageStats: () => api.get('/data/storage/stats'),
}

// ── Chat ─────────────────────────────────────────────────────
export const chatAPI = {
  createSession: (data: any) => api.post('/chat/sessions', data),
  listSessions: (params?: any) => api.get('/chat/sessions', { params }),
  getMessages: (sessionId: string) => api.get(`/chat/sessions/${sessionId}/messages`),
  deleteSession: (sessionId: string) => api.delete(`/chat/sessions/${sessionId}`),
  sendMessage: (data: any) => api.post('/chat/message', data),
  analyzeDataset: (sourceId: string, question: string) =>
    api.post(`/chat/analyze-data/${sourceId}`, null, { params: { question } }),
}

// ── ML ───────────────────────────────────────────────────────
export const mlAPI = {
  train: (data: any) => api.post('/ml/train', data),
  listModels: (params?: any) => api.get('/ml/models', { params }),
  getModel: (id: string) => api.get(`/ml/models/${id}`),
  predict: (id: string, data: any) => api.post(`/ml/models/${id}/predict`, data),
  forecast: (data: any) => api.post('/ml/forecast', data),
  anomalyDetect: (params: any) => api.post('/ml/anomaly-detection', null, { params }),
  cluster: (params: any) => api.post('/ml/clustering', null, { params }),
  deleteModel: (id: string) => api.delete(`/ml/models/${id}`),
}

// ── NLP ──────────────────────────────────────────────────────
export const nlpAPI = {
  analyze: (data: any) => api.post('/nlp/analyze', data),
  sentiment: (texts: string[]) => api.post('/nlp/sentiment', texts),
  ner: (text: string) => api.post('/nlp/ner', null, { params: { text } }),
  summarize: (text: string, opts?: any) => api.post('/nlp/summarize', null, { params: { text, ...opts } }),
  classify: (data: any) => api.post('/nlp/classify', data),
  keywords: (text: string, topK = 10) => api.post('/nlp/keywords', null, { params: { text, top_k: topK } }),
  similarity: (data: any) => api.post('/nlp/similarity', data),
  emailAnalysis: (params: any) => api.post('/nlp/email-analysis', null, { params }),
  analyzeDataset: (data: any) => api.post('/nlp/dataset-analyze', data),
  getTask: (id: string) => api.get(`/nlp/tasks/${id}`),
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  listKPIs: (params?: any) => api.get('/analytics/kpis', { params }),
  createKPI: (data: any) => api.post('/analytics/kpis', data),
  extractKPIs: (sourceId: string) => api.post('/analytics/kpis/from-dataset', null, { params: { data_source_id: sourceId } }),
  trendAnalysis: (params: any) => api.post('/analytics/trend-analysis', null, { params }),
  comparativeAnalysis: (params: any) => api.post('/analytics/comparative-analysis', null, { params }),
  generateReport: (data: any) => api.post('/analytics/reports/generate', data),
  listReports: () => api.get('/analytics/reports'),
  getReport: (id: string) => api.get(`/analytics/reports/${id}`),
  whatIf: (data: any) => api.post('/analytics/what-if', data),
  alerts: (params?: any) => api.get('/analytics/alerts', { params }),
  markAlertRead: (id: string) => api.put(`/analytics/alerts/${id}/read`),
}

// ── Agents ───────────────────────────────────────────────────
export const agentsAPI = {
  types: () => api.get('/agents/types'),
  run: (data: any) => api.post('/agents/run', data),
  orchestrate: (data: any) => api.post('/agents/orchestrate', data),
  getTask: (id: string) => api.get(`/agents/tasks/${id}`),
  listTasks: (params?: any) => api.get('/agents/tasks', { params }),
  deleteTask: (id: string) => api.delete(`/agents/tasks/${id}`),
}

// ── Documents ────────────────────────────────────────────────
export const documentsAPI = {
  summarize: (data: any) => api.post('/documents/summarize', data),
  qa: (data: any) => api.post('/documents/qa', data),
  extract: (data: any) => api.post('/documents/extract', data),
  compare: (data: any) => api.post('/documents/compare', data),
}

// ── Meetings ─────────────────────────────────────────────────
export const meetingsAPI = {
  analyze: (data: any) => api.post('/meetings/analyze', data),
  generateFollowup: (params: any) => api.post('/meetings/generate-followup', null, { params }),
}

// ── Marketing ────────────────────────────────────────────────
export const marketingAPI = {
  generateContent: (data: any) => api.post('/marketing/generate-content', data),
  generateAdCopy: (data: any) => api.post('/marketing/ad-copy', data),
  generateEmailCampaign: (params: any) => api.post('/marketing/email-campaign', null, { params }),
  analyzeCampaign: (data: any) => api.post('/marketing/campaign-analysis', data),
  segmentCustomers: (data: any) => api.post('/marketing/customer-segmentation', data),
  trendSuggestions: (params: any) => api.post('/marketing/trend-suggestions', null, { params }),
}

// ── Generative AI ────────────────────────────────────────────
export const genaiAPI = {
  dataStory: (data: any) => api.post('/genai/data-story', data),
  strategyRecommendations: (data: any) => api.post('/genai/strategy-recommendations', data),
  insights: (data: any) => api.post('/genai/insights', data),
  presentation: (data: any) => api.post('/genai/presentation', data),
  generateEmail: (params: any) => api.post('/genai/generate-email', null, { params }),
  scenarioNarrative: (data: any) => api.post('/genai/scenario-narrative', data),
}

// ── Risk & Fraud ─────────────────────────────────────────────
export const riskAPI = {
  detectAnomalies: (data: any) => api.post('/risk/anomaly-detection', data),
  scoreRisk: (data: any) => api.post('/risk/risk-scoring', data),
  monitorTransactions: (data: any) => api.post('/risk/transaction-monitor', data),
  generateRiskReport: (params: any) => api.post('/risk/risk-report', null, { params }),
}

// ── System ───────────────────────────────────────────────────
export const systemAPI = {
  health: () => api.get('/health'),
  info: () => api.get('/system/info'),
}

export default api
