import { useState, useEffect } from 'react'
import { dataAPI } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Shield, AlertTriangle, Loader2, Search, FileBarChart } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export default function RiskDetect() {
  const [activeTab, setActiveTab] = useState<'anomaly' | 'scoring' | 'report'>('anomaly')
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [anomalyForm, setAnomalyForm] = useState({
    data_source_id: '', columns: '', contamination: 0.05, sensitivity: 'medium',
  })
  const [scoringForm, setScoringForm] = useState({
    data_source_id: '', feature_columns: '', high_risk_threshold: 0.8, medium_risk_threshold: 0.5,
  })
  const [reportSourceId, setReportSourceId] = useState('')

  useEffect(() => {
    dataAPI.list({ limit: 50 }).then(r =>
      setSources((r.data.sources || []).filter((s: any) => ['csv', 'excel', 'json'].includes(s.source_type)))
    ).catch(() => {})
  }, [])

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      let res
      if (activeTab === 'anomaly') {
        const params: any = {
          data_source_id: anomalyForm.data_source_id,
          contamination: anomalyForm.contamination,
          sensitivity: anomalyForm.sensitivity,
        }
        if (anomalyForm.columns) params.columns = anomalyForm.columns.split(',').map(c => c.trim())
        res = await api.post('/risk/anomaly-detection', params)
        setResult({ type: 'anomaly', data: res.data })
      } else if (activeTab === 'scoring') {
        res = await api.post('/risk/risk-scoring', {
          data_source_id: scoringForm.data_source_id,
          feature_columns: scoringForm.feature_columns.split(',').map(c => c.trim()),
          high_risk_threshold: scoringForm.high_risk_threshold,
          medium_risk_threshold: scoringForm.medium_risk_threshold,
        })
        setResult({ type: 'scoring', data: res.data })
      } else if (activeTab === 'report') {
        res = await api.post('/risk/risk-report', null, { params: { data_source_id: reportSourceId } })
        setResult({ type: 'report', data: res.data })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally { setLoading(false) }
  }

  const tabs = [
    { id: 'anomaly', label: 'Anomaly Detection', icon: AlertTriangle },
    { id: 'scoring', label: 'Risk Scoring', icon: Search },
    { id: 'report', label: 'Risk Report', icon: FileBarChart },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Shield size={20} className="text-[var(--accent)]" /> Fraud & Risk Detection
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Detect anomalies, score risk, and generate risk reports</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id as any); setResult(null) }}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          {activeTab === 'anomaly' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Anomaly Detection</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Dataset *</label>
                <select className="input" value={anomalyForm.data_source_id}
                  onChange={e => setAnomalyForm(f => ({ ...f, data_source_id: e.target.value }))}>
                  <option value="">Select dataset...</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Columns to Analyze (optional, comma-separated)</label>
                <input className="input" placeholder="e.g. amount, quantity, price"
                  value={anomalyForm.columns} onChange={e => setAnomalyForm(f => ({ ...f, columns: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Sensitivity</label>
                <select className="input" value={anomalyForm.sensitivity}
                  onChange={e => setAnomalyForm(f => ({ ...f, sensitivity: e.target.value }))}>
                  <option value="low">Low (2% flagged)</option>
                  <option value="medium">Medium (5% flagged)</option>
                  <option value="high">High (10% flagged)</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'scoring' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Risk Scoring</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Dataset *</label>
                <select className="input" value={scoringForm.data_source_id}
                  onChange={e => setScoringForm(f => ({ ...f, data_source_id: e.target.value }))}>
                  <option value="">Select dataset...</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Feature Columns (comma-separated) *</label>
                <input className="input" placeholder="e.g. amount, frequency, age"
                  value={scoringForm.feature_columns} onChange={e => setScoringForm(f => ({ ...f, feature_columns: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">High Risk Threshold</label>
                  <input type="number" min={0} max={1} step={0.05} className="input"
                    value={scoringForm.high_risk_threshold}
                    onChange={e => setScoringForm(f => ({ ...f, high_risk_threshold: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Medium Risk Threshold</label>
                  <input type="number" min={0} max={1} step={0.05} className="input"
                    value={scoringForm.medium_risk_threshold}
                    onChange={e => setScoringForm(f => ({ ...f, medium_risk_threshold: parseFloat(e.target.value) }))} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'report' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Risk Report</h3>
              <p className="text-xs text-[var(--text-muted)]">Generate a comprehensive risk assessment report powered by AI</p>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Dataset *</label>
                <select className="input" value={reportSourceId} onChange={e => setReportSourceId(e.target.value)}>
                  <option value="">Select dataset...</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Shield size={14} /> Run Analysis</>}
          </button>
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="card p-8 text-center h-full flex items-center justify-center">
              <div>
                <Shield size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Risk analysis results appear here</p>
              </div>
            </div>
          ) : result.type === 'anomaly' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Records',     value: result.data.total_records?.toLocaleString(), color: '' },
                  { label: 'Anomalies Found',   value: result.data.anomalies_found, color: result.data.anomalies_found > 0 ? 'text-red-400' : 'text-green-400' },
                  { label: 'Anomaly Rate',      value: `${result.data.anomaly_rate}%`, color: result.data.anomaly_rate > 5 ? 'text-yellow-400' : 'text-green-400' },
                  { label: 'Columns Analyzed',  value: result.data.columns_analyzed?.length, color: '' },
                ].map(({ label, value, color }, i) => (
                  <motion.div key={label} className="stat" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.08 }}>
                    <span className="text-xs text-[var(--text-muted)]">{label}</span>
                    <span className={`text-xl font-bold ${color || 'text-[var(--text-primary)]'}`}>{value}</span>
                  </motion.div>
                ))}
              </div>
              {result.data.ai_explanation && (
                <motion.div className="card p-4" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">🤖 AI Explanation</p>
                  <p className="text-sm text-[var(--text-secondary)]">{result.data.ai_explanation}</p>
                </motion.div>
              )}
            </div>
          ) : result.type === 'scoring' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <motion.div className="stat border-red-500/20 pulse-high-risk" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0 }}>
                  <span className="text-xs text-[var(--text-muted)]">High Risk</span>
                  <span className="text-xl font-bold text-red-400">{result.data.high_risk_count}</span>
                  <span className="text-xs text-red-400">{result.data.high_risk_percentage}%</span>
                </motion.div>
                <motion.div className="stat border-yellow-500/20" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.08 }}>
                  <span className="text-xs text-[var(--text-muted)]">Medium Risk</span>
                  <span className="text-xl font-bold text-yellow-400">{result.data.medium_risk_count}</span>
                </motion.div>
                <motion.div className="stat border-green-500/20" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.16 }}>
                  <span className="text-xs text-[var(--text-muted)]">Low Risk</span>
                  <span className="text-xl font-bold text-green-400">{result.data.low_risk_count}</span>
                </motion.div>
              </div>
              {result.data.top_high_risk_records?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Top High Risk Records</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                          {Object.keys(result.data.top_high_risk_records[0] || {}).slice(0, 6).map((col: string) => (
                            <th key={col} className="px-3 py-2 text-left text-[var(--text-muted)]">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.top_high_risk_records.slice(0, 8).map((row: any, i: number) => (
                          <tr key={i} className="table-row">
                            {Object.values(row).slice(0, 6).map((val: any, j: number) => (
                              <td key={j} className={`px-3 py-2 ${j === Object.keys(row).indexOf('risk_level') ? 'text-red-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                                {String(val ?? '').slice(0, 20)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-5 overflow-auto animate-fade-in max-h-[600px]">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.data?.risk_report || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
