import { useState, useEffect, lazy, Suspense } from 'react'
import { mlAPI, dataAPI } from '../services/api'
import toast from 'react-hot-toast'
import { TrendingUp, Plus, Play, Loader2, Brain, RefreshCw, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const TrainingVisual = lazy(() => import('../components/3d/TrainingVisual'))

const MODEL_TYPES = [
  { v: 'classification', label: 'Outcome Classifier',    desc: 'Predict categories like churn, fraud, or lead quality' },
  { v: 'regression',     label: 'Value Predictor',       desc: 'Forecast numeric values like sales, revenue, or price' },
  { v: 'forecasting',    label: 'Time Series Forecast',  desc: 'Predict future trends - demand, stock, traffic' },
  { v: 'anomaly',        label: 'Anomaly Detector',      desc: 'Spot outliers, fraud, and unusual patterns' },
  { v: 'clustering',     label: 'Customer Segmentation', desc: 'Group customers by behavior automatically' },
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
  const [showModelsMobile, setShowModelsMobile] = useState(false)
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024

  useEffect(() => {
    mlAPI.listModels().then(r => setModels(r.data)).catch(() => {}).finally(() => setLoading(false))
    dataAPI.list({ limit: 50 }).then(r => setSources((r.data.sources || []).filter((s: any) => ['csv','excel','json'].includes(s.source_type)))).catch(() => {})
  }, [])

  const onSourceChange = (id: string) => {
    setForm(f => ({ ...f, data_source_id: id, target_column: '' }))
    const src = sources.find(s => s.id === id)
    setCols(src?.columns_info?.map((c: any) => c.name) || [])
  }

  const train = async () => {
    const requiresTarget = ['classification','regression','forecasting'].includes(form.model_type)
    if (!form.name || !form.data_source_id || (requiresTarget && !form.target_column)) return toast.error('Fill all required fields')
    setTraining(true)
    try {
      const r = await mlAPI.train(form)
      setModels(prev => [{ ...r.data, status: 'pending', name: form.name, model_type: form.model_type }, ...prev])
      setShowForm(false)
      toast.success('Training started - check back in a moment')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Training failed') }
    finally { setTraining(false) }
  }

  const refresh = async (id: string) => {
    const r = await mlAPI.getModel(id)
    setModels(prev => prev.map(m => m.id === id ? r.data : m))
    if (selected?.id === id) setSelected(r.data)
  }

  const statusColor = (s: string) => ({ completed: 'var(--success)', running: 'var(--accent)', pending: 'var(--warning)', failed: 'var(--danger)' }[s] || 'var(--text-muted)')

  const ModelList = () => (
    <div style={{
      width: isMobile ? '100%' : 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
      background: 'rgba(12,14,26,0.97)',
      height: '100%',
    }}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <motion.button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => { setShowForm(true); setShowModelsMobile(false) }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Plus size={14} /> Train New Model
        </motion.button>
        {isMobile && (
          <button className="btn-ghost" style={{ padding: '8px 10px' }} onClick={() => setShowModelsMobile(false)}>
            <X size={15} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading ? Array.from({length:3}).map((_,i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />) :
         models.length === 0 ? (
          <div className="empty" style={{ padding: '30px 10px' }}>
            <div className="empty-icon"><Brain size={18} /></div>
            <div className="empty-title">No models yet</div>
            <div className="empty-desc">Train your first prediction model</div>
          </div>
        ) : models.map((m, i) => (
          <motion.div key={m.id} onClick={() => { setSelected(m); setShowModelsMobile(false) }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: '11px 12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', transition: 'all 0.15s', background: selected?.id === m.id ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${selected?.id === m.id ? 'rgba(79,139,255,0.25)' : 'transparent'}` }}
            whileHover={{ background: selected?.id === m.id ? 'var(--accent-dim)' : 'var(--glass-hover)' } as any}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <motion.span animate={{ scale: [1,1.3,1] }} transition={{ duration: 2, repeat: m.status === 'running' ? Infinity : 0 }}
                style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(m.status), flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{MODEL_TYPES.find(t=>t.v===m.model_type)?.label || m.model_type} - {m.algorithm}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', position: 'relative' }}>

      {/* Mobile backdrop */}
      {isMobile && showModelsMobile && (
        <div
          onClick={() => setShowModelsMobile(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,16,0.5)', backdropFilter: 'blur(4px)', zIndex: 140 }}
        />
      )}

      {/* Sidebar – fixed drawer on mobile */}
      {!isMobile ? (
        <ModelList />
      ) : (
        <div style={{
          position: 'fixed', top: 60, left: 0, bottom: 0,
          width: 'min(88vw, 290px)', zIndex: 150,
          transform: showModelsMobile ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: showModelsMobile ? '6px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}>
          <ModelList />
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28, minWidth: 0 }}>

        {/* Mobile top-bar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button className="btn-ghost" style={{ padding: '7px 9px' }} onClick={() => setShowModelsMobile(true)}>
              <Menu size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Models</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div key="form" style={{ maxWidth: 620 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: 'var(--text-primary)' }}>Train a New Model</h2>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>

              {/* Model type cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {MODEL_TYPES.map(({ v, label, desc }, i) => (
                  <motion.div key={v} onClick={() => setForm(f => ({ ...f, model_type: v }))}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, borderColor: form.model_type === v ? 'rgba(79,139,255,0.5)' : 'rgba(255,255,255,0.06)' }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 18px rgba(79,139,255,0.2)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', background: form.model_type === v ? 'var(--accent-soft)' : 'var(--glass-bg)', border: `1px solid ${form.model_type === v ? 'rgba(79,139,255,0.3)' : 'var(--glass-border)'}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.model_type === v ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                  </motion.div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
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
                {['classification','regression','forecasting'].includes(form.model_type) && cols.length > 0 && (
                  <div><label className="label">What to Predict (Target Column) *</label>
                    <select className="input" value={form.target_column} onChange={e => setForm(f => ({...f, target_column: e.target.value}))}>
                      <option value="">Select the column to predict...</option>
                      {cols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Test Split: {Math.round(form.test_size * 100)}% held for evaluation</label>
                  <input type="range" min={0.1} max={0.4} step={0.05} value={form.test_size}
                    onChange={e => setForm(f => ({...f, test_size: parseFloat(e.target.value)}))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <motion.button className="btn-primary" onClick={train} disabled={training}
                  style={{ alignSelf: isMobile ? 'stretch' : 'flex-start', justifyContent: 'center' }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {training ? <><Loader2 size={14} className="spin" /> Starting...</> : <><Play size={14} /> Start Training</>}
                </motion.button>
              </div>
            </motion.div>

          ) : selected ? (
            <motion.div key={selected.id} style={{ maxWidth: 700 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{selected.name}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: statusColor(selected.status), fontWeight: 500, textTransform: 'capitalize' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(selected.status) }} />{selected.status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{MODEL_TYPES.find(t => t.v === selected.model_type)?.label}</span>
                  </div>
                </div>
                <button className="btn-ghost" onClick={() => refresh(selected.id)}><RefreshCw size={13} /> Refresh</button>
              </div>

              {selected.status === 'completed' && selected.metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {Object.entries(selected.metrics).map(([k, v]: any, i) => (
                    <motion.div key={k} className="stat" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}>
                      <div className="stat-label">{k.replace(/_/g, ' ')}</div>
                      <div className="stat-value" style={{ fontSize: 22 }}>
                        {typeof v === 'number' ? (v <= 1 && v >= 0 ? `${(v*100).toFixed(1)}%` : v.toFixed(4)) : v}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Feature importance */}
              {selected.feature_importance && (
                <motion.div className="card" style={{ padding: isMobile ? 16 : 22, marginBottom: 20 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <div className="section-title" style={{ marginBottom: 16 }}>Feature Importance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
                      <RadarChart data={Object.entries(selected.feature_importance).sort(([,a]:any,[,b]:any) => b-a).slice(0,8).map(([name, val]:any) => ({ name: name.length > 10 ? name.slice(0,10)+'...' : name, value: Math.round(val * 100) }))}>
                        <PolarGrid stroke="rgba(79,139,255,0.15)" />
                        <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                        <Radar dataKey="value" fill="#4f8bff" fillOpacity={0.2} stroke="#4f8bff" strokeWidth={2} isAnimationActive animationDuration={800} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(selected.feature_importance).sort(([,a]:any,[,b]:any) => b-a).slice(0,6).map(([f,imp]:any) => {
                        const max = Math.max(...Object.values(selected.feature_importance) as number[])
                        return (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: isMobile ? 80 : 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                            <div className="progress-track" style={{ flex: 1, height: 5 }}>
                              <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${(imp/max*100).toFixed(1)}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>{(imp*100).toFixed(1)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Training indicator */}
              {(selected.status === 'pending' || selected.status === 'running') && (
                <motion.div className="card" style={{ padding: 40, textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <Suspense fallback={<Loader2 size={28} className="spin" color="var(--accent)" />}>
                      <TrainingVisual />
                    </Suspense>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Training in progress...</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usually 30-120 seconds depending on data size</p>
                    <button className="btn-ghost" onClick={() => refresh(selected.id)}><RefreshCw size={13} /> Check Status</button>
                  </div>
                </motion.div>
              )}
            </motion.div>

          ) : (
            <motion.div key="empty" className="empty" style={{ height: '100%' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="empty-icon"><TrendingUp size={22} /></div>
              <div className="empty-title">Predictions Studio</div>
              <div className="empty-desc">Train AI models to predict sales, detect churn, find anomalies, and segment customers - no coding required.</div>
              <motion.button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setShowForm(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Plus size={14} /> Train Your First Model
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
