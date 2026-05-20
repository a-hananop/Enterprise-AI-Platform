import { useState, useEffect } from 'react'
import { agentsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Bot, Play, Loader2, CheckCircle, ChevronDown, ChevronRight, Trash2, Zap, Cpu, Search, BarChart2, Megaphone, DollarSign, FileText, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

const AGENT_META: Record<string, { icon: any; color: string }> = {
  data:         { icon: BarChart2,  color: '#4f8bff' },
  research:     { icon: Search,     color: '#22d3a5' },
  finance:      { icon: DollarSign, color: '#f5a623' },
  marketing:    { icon: Megaphone,  color: '#a78bfa' },
  report:       { icon: FileText,   color: '#ff5c7a' },
  orchestrator: { icon: Cpu,        color: '#22d3a5' },
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  completed: { bg: 'rgba(34,211,165,0.12)', text: '#22d3a5', dot: '#22d3a5' },
  running:   { bg: 'rgba(79,139,255,0.12)', text: '#4f8bff', dot: '#4f8bff' },
  pending:   { bg: 'rgba(245,166,35,0.12)', text: '#f5a623', dot: '#f5a623' },
  failed:    { bg: 'rgba(255,92,122,0.12)', text: '#ff5c7a', dot: '#ff5c7a' },
}

const SAMPLE_GOALS = [
  'Analyze our sales data and identify the top 3 growth opportunities',
  'Research current AI trends affecting our industry and suggest strategies',
  'Evaluate our marketing campaign performance and recommend improvements',
  'Generate a comprehensive Q3 business performance report',
  'Identify cost reduction opportunities in our operations data',
]

export default function Automation() {
  const [agentTypes, setAgentTypes] = useState<any>({})
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ agent_type: 'data', goal: '', mode: 'single' })
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    agentsAPI.types().then(r => setAgentTypes(r.data)).catch(() => {})
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try { const res = await agentsAPI.listTasks({ limit: 20 }); setTasks(res.data) } catch {}
  }

  const runAgent = async () => {
    if (!form.goal.trim()) return toast.error('Describe the goal for the agent')
    setLoading(true)
    try {
      const res = form.mode === 'multi'
        ? await agentsAPI.orchestrate({ goal: form.goal, data_source_ids: [] })
        : await agentsAPI.run({ agent_type: form.agent_type, goal: form.goal, data_source_ids: [] })
      toast.success('Agent launched!')
      await loadTasks()
      pollTask(res.data.task_id)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Agent failed to start')
    } finally { setLoading(false) }
  }

  const pollTask = async (taskId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await agentsAPI.getTask(taskId)
        setTasks(prev => prev.map(t => t.id === taskId ? res.data : t))
        if (selectedTask?.id === taskId) setSelectedTask(res.data)
        if (['completed', 'failed'].includes(res.data.status)) break
      } catch { break }
    }
  }

  const openTask = async (task: any) => {
    const res = await agentsAPI.getTask(task.id)
    setSelectedTask(res.data); setExpandedSteps(new Set())
  }

  const deleteTask = async (id: string) => {
    try {
      await agentsAPI.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      if (selectedTask?.id === id) setSelectedTask(null)
    } catch {}
  }

  const ss = (s: string) => STATUS_STYLES[s] || { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)', dot: 'var(--text-muted)' }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(10,12,22,0.7)', backdropFilter: 'blur(16px)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Recent Tasks</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {tasks.length === 0 ? (
            <div className="empty" style={{ padding: '40px 10px' }}>
              <div className="empty-icon"><Bot size={18} /></div>
              <div className="empty-title">No tasks yet</div>
              <div className="empty-desc">Launch an agent to get started</div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {tasks.map((t, i) => {
                const meta = AGENT_META[t.agent_type] || AGENT_META.data
                const style = ss(t.status)
                const isSelected = selectedTask?.id === t.id
                return (
                  <motion.div
                    key={t.id}
                    onClick={() => openTask(t)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    whileHover={{ x: 2 } as any}
                    style={{
                      padding: '12px 13px', borderRadius: 12, marginBottom: 6, cursor: 'pointer',
                      background: isSelected ? 'var(--accent-dim)' : 'var(--glass-bg)',
                      border: `1px solid ${isSelected ? 'rgba(79,139,255,0.3)' : 'var(--glass-border)'}`,
                      transition: 'border-color 0.15s, background 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <meta.icon size={16} color={meta.color} />
                      </div>
                      {/* Status badge */}
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20,
                        background: style.bg, fontSize: 10.5, fontWeight: 600, color: style.text,
                        textTransform: 'capitalize', letterSpacing: '0.03em',
                      }}>
                        <motion.span
                          animate={{ scale: t.status === 'running' ? [1, 1.4, 1] : 1 }}
                          transition={{ duration: 1.2, repeat: t.status === 'running' ? Infinity : 0 }}
                          style={{ width: 5, height: 5, borderRadius: '50%', background: style.dot }}
                        />
                        {t.status}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 3, borderRadius: 5, opacity: 0, transition: 'opacity 0.15s' }}
                        className="del-btn"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {/* Goal text */}
                    <p style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {t.goal}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{t.agent_name}</p>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28, background: 'var(--bg-base)' }}>
        <AnimatePresence mode="wait">
          {selectedTask ? (
            <motion.div key={selectedTask.id} style={{ maxWidth: 760 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {(() => {
                    const Icon = AGENT_META[selectedTask.agent_type]?.icon || Bot;
                    const color = AGENT_META[selectedTask.agent_type]?.color || 'var(--accent)';
                    return (
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${color}15`, border: `1px solid ${color}30`, boxShadow: `0 4px 12px ${color}10`, flexShrink: 0
                      }}>
                        <Icon size={24} color={color} />
                      </div>
                    );
                  })()}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTask.agent_name}</h2>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                        background: ss(selectedTask.status).bg, color: ss(selectedTask.status).text, textTransform: 'capitalize', border: `1px solid ${ss(selectedTask.status).text}20`
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ss(selectedTask.status).dot, boxShadow: `0 0 8px ${ss(selectedTask.status).dot}` }} />
                        {selectedTask.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedTask.goal}</p>
                  </div>
                </div>
                <motion.button className="btn-ghost" onClick={() => setSelectedTask(null)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>← Back</motion.button>
              </div>

              {/* Steps */}
              {selectedTask.steps?.length > 0 && (
                <motion.div className="card" style={{ padding: 22, marginBottom: 16 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="section-title" style={{ marginBottom: 16 }}><Zap size={14} color="var(--accent)" /> Execution Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedTask.steps.map((step: any, i: number) => (
                      <motion.div key={i} style={{ border: '1px solid var(--glass-border)', borderRadius: 10, overflow: 'hidden' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                        <button onClick={() => setExpandedSteps(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(79,139,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{step.step}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{step.action}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{step.agent} · {new Date(step.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <CheckCircle size={14} color="var(--success)" />
                          {expandedSteps.has(i) ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                        </button>
                        <AnimatePresence>
                          {expandedSteps.has(i) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{step.result?.slice(0, 500)}{step.result?.length > 500 ? '...' : ''}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Final output */}
              {selectedTask.final_output && (
                <motion.div className="card" style={{ padding: 22 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="section-title" style={{ marginBottom: 16 }}>📋 Final Output</div>
                  <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTask.final_output}</ReactMarkdown></div>
                </motion.div>
              )}

              {['pending', 'running'].includes(selectedTask.status) && (
                <motion.div className="card" style={{ padding: 40, textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Loader2 size={28} className="spin" color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Agent working...</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usually 30–60 seconds</p>
                </motion.div>
              )}
            </motion.div>

          ) : (
            <motion.div key="form" style={{ maxWidth: 680 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>AI Agent System</h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Deploy intelligent agents to automate complex business analysis</p>
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, width: 'fit-content' }}>
                {[{ id: 'single', label: 'Single Agent', icon: Bot }, { id: 'multi', label: 'Multi-Agent', icon: Cpu }].map(m => (
                  <motion.button key={m.id} onClick={() => setForm(f => ({ ...f, mode: m.id }))}
                    style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
                    whileTap={{ scale: 0.97 }}>
                    {form.mode === m.id && (
                      <motion.div layoutId="modeTab" style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: 9 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    )}
                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6, color: form.mode === m.id ? '#fff' : 'var(--text-muted)' }}>
                      <m.icon size={14} />
                      {m.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Agent type grid */}
              <AnimatePresence>
                {form.mode === 'single' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                    {Object.entries(agentTypes).map(([key, agent]: any, i) => {
                      const meta = AGENT_META[key] || AGENT_META.data
                      const active = form.agent_type === key
                      return (
                        <motion.div key={key} onClick={() => setForm(f => ({ ...f, agent_type: key }))}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          whileHover={{ scale: 1.02, boxShadow: `0 6px 20px ${meta.color}15` }}
                          whileTap={{ scale: 0.98 }}
                          style={{ padding: '16px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${active ? meta.color + '50' : 'var(--glass-border)'}`, background: active ? `${meta.color}08` : 'var(--glass-bg)', transition: 'background 0.2s' }}>
                          <div style={{ marginBottom: 14, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? `${meta.color}20` : `${meta.color}10`, border: `1px solid ${active ? meta.color + '40' : meta.color + '20'}` }}>
                            <meta.icon size={20} color={active ? meta.color : meta.color + 'dd'} />
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? meta.color : 'var(--text-primary)', marginBottom: 4 }}>{agent.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{agent.description?.slice(0, 60)}…</div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {form.mode === 'multi' && (
                <motion.div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'rgba(79,139,255,0.2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 211, 165, 0.1)', border: '1px solid rgba(34, 211, 165, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Cpu size={18} color="#22d3a5" />
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}><strong>Orchestration:</strong> Automatically selects the best combination of agents and coordinates their work for complex, multi-step goals.</p>
                  </div>
                </motion.div>
              )}

              {/* Goal */}
              <div style={{ marginBottom: 16 }}>
                <label className="label">Agent Goal / Task</label>
                <textarea className="input" rows={4} placeholder="Describe what you want the agent to accomplish..." value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} style={{ resize: 'none' }} />
              </div>

              <motion.button className="btn-primary" onClick={runAgent} disabled={loading || !form.goal.trim()} style={{ marginBottom: 28 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {loading ? <><Loader2 size={14} className="spin" /> Launching...</> : <><Play size={14} /> Launch Agent</>}
              </motion.button>

              {/* Sample goals */}
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                  <Lightbulb size={14} /> Sample Goals
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SAMPLE_GOALS.map((g, i) => (
                    <motion.button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                      style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}
                      whileHover={{ borderColor: 'rgba(79,139,255,0.3)', color: 'var(--text-primary)', x: 4 } as any}>
                      "{g}"
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`.del-btn:hover { opacity: 1 !important; color: var(--danger) !important; }`}</style>
    </div>
  )
}
