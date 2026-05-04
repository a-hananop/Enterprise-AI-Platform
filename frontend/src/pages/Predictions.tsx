// ─────────────────────────────────────────────────────────────
// Predictions Page (formerly Machine Learning)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { mlAPI, dataAPI } from '../services/api'
import toast from 'react-hot-toast'
import { TrendingUp, Plus, Play, Loader2, Brain, CheckCircle, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const MODEL_TYPES = [
  { v: 'classification', label: 'Outcome Classifier',  desc: 'Predict categories like churn, fraud, or lead quality' },
  { v: 'regression',     label: 'Value Predictor',     desc: 'Forecast numeric values like sales, revenue, or price' },
  { v: 'forecasting',    label: 'Time Series Forecast',desc: 'Predict future trends — demand, stock, traffic' },
  { v: 'anomaly',        label: 'Anomaly Detector',    desc: 'Spot outliers, fraud, and unusual patterns' },
  { v: 'clustering',     label: 'Customer Segmentation',desc: 'Group customers by behavior automatically' },
]

export default function Predictions() {
  const [models, setModels] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [cols, setCols] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', model_type: 'regression', data_source_id: '', target_column: '', algorithm: 'auto', test_size: 0.2 })

  useEffect(() => {
    mlAPI.listModels().then(r => setModels(r.data)).catch(() => {}).finally(() => setLoading(false))
    dataAPI.list({ limit: 50 }).then(r => setSources((r.data.sources || []).filter((s: any) => ['csv', 'excel', 'json'].includes(s.source_type)))).catch(() => {})
  }, [])

  const onSourceChange = (id: string) => {
    setForm(f => ({ ...f, data_source_id: id, target_column: '' }))
    const src = sources.find(s => s.id === id)
    setCols(src?.columns_info?.map((c: any) => c.name) || [])
  }

  const train = async () => {
    const requiresTarget = ['classification', 'regression', 'forecasting'].includes(form.model_type)
    if (!form.name || !form.data_source_id || (requiresTarget && !form.target_column)) return toast.error('Fill all required fields')
    setTraining(true)
    try {
      const r = await mlAPI.train(form)
      setModels(prev => [{ ...r.data, status: 'pending', name: form.name, model_type: form.model_type }, ...prev])
      setShowForm(false)
      toast.success('Training started — check back in a moment')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Training failed') }
    finally { setTraining(false) }
  }

  const refresh = async (id: string) => {
    const r = await mlAPI.getModel(id)
    setModels(prev => prev.map(m => m.id === id ? r.data : m))
    if (selected?.id === id) setSelected(r.data)
  }

  const statusColor = (s: string) => ({ completed: 'var(--success)', running: 'var(--accent)', pending: 'var(--warning)', failed: 'var(--danger)' }[s] || 'var(--text-muted)')

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(12,14,26,0.6)' }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--glass-border)' }}>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowForm(true)}>
            <Plus size={14} /> Train New Model
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loading ? Array.from({length:3}).map((_,i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />) :
           models.length === 0 ? (
            <div className="empty" style={{ padding: '30px 10px' }}>
              <div className="empty-icon"><Brain size={18} /></div>
              <div className="empty-title">No models yet</div>
              <div className="empty-desc">Train your first prediction model</div>
            </div>
          ) : models.map(m => (
            <div key={m.id} onClick={() => setSelected(m)}
              style={{ padding: '11px 12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', transition: 'all 0.15s', background: selected?.id === m.id ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${selected?.id === m.id ? 'rgba(79,139,255,0.25)' : 'transparent'}` }}
              onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'var(--glass-hover)' }}
              onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(m.status), flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{MODEL_TYPES.find(t=>t.v===m.model_type)?.label || m.model_type} · {m.algorithm}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {showForm ? (
          <div style={{ maxWidth: 620 }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Train a New Model</h2>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {MODEL_TYPES.map(({ v, label, desc }) => (
                <div key={v} onClick={() => setForm(f => ({ ...f, model_type: v }))}
                  style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', background: form.model_type === v ? 'var(--accent-soft)' : 'var(--glass-bg)', border: `1px solid ${form.model_type === v ? 'rgba(79,139,255,0.3)' : 'var(--glass-border)'}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.model_type === v ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label className="label">Model Name *</label><input className="input" placeholder="e.g. Sales Predictor Q1" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
                <div><label className="label">Algorithm</label>
                  <select className="input" value={form.algorithm} onChange={e => setForm(f => ({...f, algorithm: e.target.value}))}>
                    <option value="auto">Auto (Recommended)</option>
                    <option value="random_forest">Random Forest</option>
                    <option value="xgboost">XGBoost</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="linear">Linear / Logistic</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Dataset *</label>
                <select className="input" value={form.data_source_id} onChange={e => onSourceChange(e.target.value)}>
                  <option value="">Choose dataset...</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {['classification', 'regression', 'forecasting'].includes(form.model_type) && (
                cols.length > 0 ? (
                  <div><label className="label">What to Predict (Target Column) *</label>
                    <select className="input" value={form.target_column} onChange={e => setForm(f => ({...f, target_column: e.target.value}))}>
                      <option value="">Select the column to predict...</option>
                      {cols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ) : (
                  form.data_source_id && (
                    <div className="alert alert-warning">
                      Dataset has no column information. Please re-upload or select another dataset.
                    </div>
                  )
                )
              )}
              <div>
                <label className="label">Test Split: {Math.round(form.test_size * 100)}% held for evaluation</label>
                <input type="range" min={0.1} max={0.4} step={0.05} value={form.test_size}
                  onChange={e => setForm(f => ({...f, test_size: parseFloat(e.target.value)}))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <button className="btn-primary" onClick={train} disabled={training} style={{ alignSelf: 'flex-start' }}>
                {training ? <><Loader2 size={14} className="spin" /> Starting...</> : <><Play size={14} /> Start Training</>}
              </button>
            </div>
          </div>
        ) : selected ? (
          <div style={{ maxWidth: 700 }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{selected.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: statusColor(selected.status), fontWeight: 500, textTransform: 'capitalize' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(selected.status) }} />
                    {selected.status}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {MODEL_TYPES.find(t => t.v === selected.model_type)?.label}
                  </span>
                </div>
              </div>
              <button className="btn-ghost" onClick={() => refresh(selected.id)}><RefreshCw size={13} /> Refresh</button>
            </div>

            {selected.status === 'completed' && selected.metrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 24 }} className="stagger">
                {Object.entries(selected.metrics).map(([k, v]: any) => (
                  <div key={k} className="stat">
                    <div className="stat-label">{k.replace(/_/g, ' ')}</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>
                      {typeof v === 'number' ? (v <= 1 && v >= 0 ? `${(v*100).toFixed(1)}%` : v.toFixed(4)) : v}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.feature_importance && (
              <div className="card" style={{ padding: 22 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Feature Importance</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(selected.feature_importance).sort(([,a]:any,[,b]:any)=>b-a).slice(0,8).map(([f,imp]:any) => {
                    const max = Math.max(...Object.values(selected.feature_importance) as number[])
                    return (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                        <div className="progress-track" style={{ flex: 1, height: 6 }}>
                          <div className="progress-fill" style={{ width: `${(imp/max*100).toFixed(1)}%` }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>{(imp*100).toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(selected.status === 'pending' || selected.status === 'running') && (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <Loader2 size={28} className="spin" color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Training in progress...</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>This usually takes 30–120 seconds depending on data size</p>
                <button className="btn-ghost" style={{ margin: '16px auto 0' }} onClick={() => refresh(selected.id)}>
                  <RefreshCw size={13} /> Check Status
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty" style={{ height: '100%' }}>
            <div className="empty-icon"><TrendingUp size={22} /></div>
            <div className="empty-title">Predictions Studio</div>
            <div className="empty-desc">Train AI models to predict sales, detect churn, find anomalies, and segment customers — no coding required.</div>
            <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setShowForm(true)}>
              <Plus size={14} /> Train Your First Model
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
