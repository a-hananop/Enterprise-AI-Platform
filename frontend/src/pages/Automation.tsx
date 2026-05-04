import { useState, useEffect } from 'react'
import { agentsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Bot, Play, Loader2, CheckCircle, Clock, ChevronDown, ChevronRight, Trash2, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

const AGENT_ICONS: Record<string, string> = {
  data: '🗄️', research: '🔍', finance: '💰', marketing: '📢', report: '📊', orchestrator: '🎯'
}

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
    try {
      const res = await agentsAPI.listTasks({ limit: 20 })
      setTasks(res.data)
    } catch {}
  }

  const runAgent = async () => {
    if (!form.goal.trim()) return toast.error('Describe the goal for the agent')
    setLoading(true)
    try {
      let res
      if (form.mode === 'multi') {
        res = await agentsAPI.orchestrate({ goal: form.goal, data_source_ids: [] })
      } else {
        res = await agentsAPI.run({ agent_type: form.agent_type, goal: form.goal, data_source_ids: [] })
      }
      toast.success('Agent started!')
      await loadTasks()
      // Poll for result
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
    setSelectedTask(res.data)
    setExpandedSteps(new Set())
  }

  const deleteTask = async (id: string) => {
    try {
      await agentsAPI.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      if (selectedTask?.id === id) setSelectedTask(null)
    } catch {}
  }

  const statusBadge = (status: string) => {
    const m: Record<string, string> = { completed: 'badge-green', running: 'badge-blue', pending: 'badge-yellow', failed: 'badge-red' }
    return m[status] || 'badge-gray'
  }

  const SAMPLE_GOALS = [
    'Analyze our sales data and identify the top 3 growth opportunities',
    'Research current AI trends affecting our industry and suggest strategies',
    'Evaluate our marketing campaign performance and recommend improvements',
    'Generate a comprehensive Q3 business performance report',
    'Identify cost reduction opportunities in our operations data',
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0 overflow-hidden">
        <div className="p-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Recent Tasks</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <Bot size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">No agent tasks yet</p>
            </div>
          ) : tasks.map(t => (
            <div key={t.id} onClick={() => openTask(t)}
              className={clsx('p-2.5 rounded-lg cursor-pointer border transition-all group',
                selectedTask?.id === t.id ? 'bg-[var(--accent-glow)] border-[var(--accent)]/20' : 'border-transparent hover:bg-[var(--bg-card)]')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{AGENT_ICONS[t.agent_type] || '🤖'}</span>
                <span className={statusBadge(t.status)}>{t.status}</span>
                <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400">
                  <Trash2 size={11} />
                </button>
              </div>
              <p className="text-xs text-[var(--text-primary)] line-clamp-2">{t.goal}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{t.agent_name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTask ? (
          <div className="max-w-3xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{AGENT_ICONS[selectedTask.agent_type] || '🤖'}</span>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedTask.agent_name}</h2>
                  <span className={statusBadge(selectedTask.status)}>{selectedTask.status}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{selectedTask.goal}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="btn-ghost">Back</button>
            </div>

            {/* Steps */}
            {selectedTask.steps?.length > 0 && (
              <div className="card p-5 mb-4">
                <h3 className="section-title mb-4"><Zap size={14} className="text-[var(--accent)]" /> Execution Steps</h3>
                <div className="space-y-2">
                  {selectedTask.steps.map((step: any, i: number) => (
                    <div key={i} className="border border-[var(--border)] rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSteps(prev => {
                          const n = new Set(prev)
                          n.has(i) ? n.delete(i) : n.add(i)
                          return n
                        })}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--bg-card)] transition-colors"
                      >
                        <span className="w-6 h-6 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-xs text-[var(--accent)] flex-shrink-0 font-bold">{step.step}</span>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)]">{step.action}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{step.agent} · {new Date(step.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                        {expandedSteps.has(i) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {expandedSteps.has(i) && (
                        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
                          <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{step.result?.slice(0, 500)}{step.result?.length > 500 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final output */}
            {selectedTask.final_output && (
              <div className="card p-5">
                <h3 className="section-title mb-4">📋 Final Output</h3>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTask.final_output}</ReactMarkdown>
                </div>
              </div>
            )}

            {['pending', 'running'].includes(selectedTask.status) && (
              <div className="card p-6 text-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">Agent working...</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">This may take 30-60 seconds</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">AI Agent System</h1>
              <p className="text-sm text-[var(--text-secondary)]">Deploy AI agents to automate complex business analysis and workflows</p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6">
              {[{ id: 'single', label: '⚡ Single Agent' }, { id: 'multi', label: '🎯 Multi-Agent Orchestration' }].map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, mode: m.id }))}
                  className={clsx('px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    form.mode === m.id ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)]')}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Agent type selector (single mode) */}
            {form.mode === 'single' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(agentTypes).map(([key, agent]: any) => (
                  <div key={key} onClick={() => setForm(f => ({ ...f, agent_type: key }))}
                    className={clsx('card p-3 cursor-pointer transition-all',
                      form.agent_type === key ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'hover:border-[var(--border-bright)]')}>
                    <div className="text-2xl mb-1">{AGENT_ICONS[key]}</div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{agent.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{agent.description?.slice(0, 50)}...</p>
                  </div>
                ))}
              </div>
            )}

            {form.mode === 'multi' && (
              <div className="card p-4 mb-6 border-[var(--accent)]/20">
                <p className="text-sm text-[var(--text-secondary)]">
                  🎯 <strong>Orchestration mode:</strong> The system will automatically select the best combination of agents, decompose your goal, and coordinate their work to deliver comprehensive results.
                </p>
              </div>
            )}

            {/* Goal input */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Agent Goal / Task Description</label>
              <textarea
                className="input resize-none"
                rows={4}
                placeholder="Describe what you want the agent to accomplish..."
                value={form.goal}
                onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              />
            </div>

            <button onClick={runAgent} disabled={loading || !form.goal.trim()} className="btn-primary mb-8">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Launching Agent...</> : <><Play size={14} /> Launch Agent</>}
            </button>

            {/* Sample goals */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">💡 Sample Goals</p>
              <div className="space-y-2">
                {SAMPLE_GOALS.map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))}
                    className="card-hover w-full text-left p-3 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    "{g}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
