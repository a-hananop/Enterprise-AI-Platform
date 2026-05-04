// NLP Page
import { useState } from 'react'
import { nlpAPI } from '../services/api'
import toast from 'react-hot-toast'
import { FileText, Send, Loader2, Tag, User, Calendar, Hash } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function TextAnalysis() {
  const [text, setText] = useState('')
  const [tasks, setTasks] = useState<string[]>(['sentiment', 'keywords', 'summary'])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<'analyze' | 'email' | 'classify'>('analyze')
  const [emailSubject, setEmailSubject] = useState('')
  const [classifyLabels, setClassifyLabels] = useState('positive,negative,neutral,complaint,inquiry')

  const TASK_OPTIONS = [
    { id: 'sentiment', label: 'Sentiment' },
    { id: 'ner', label: 'Named Entities' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'summary', label: 'Summarize' },
    { id: 'classify', label: 'Topic Classify' },
  ]

  const toggleTask = (t: string) => {
    setTasks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const analyze = async () => {
    if (!text.trim()) return toast.error('Enter some text')
    setLoading(true)
    try {
      let res
      if (activeMode === 'analyze') {
        res = await nlpAPI.analyze({ text, tasks })
        setResult(res.data)
      } else if (activeMode === 'email') {
        res = await nlpAPI.emailAnalysis({ subject: emailSubject, body: text })
        setResult(res.data)
      } else if (activeMode === 'classify') {
        const labels = classifyLabels.split(',').map(l => l.trim()).filter(Boolean)
        res = await nlpAPI.classify({ text, labels, multi_label: true })
        setResult(res.data)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally { setLoading(false) }
  }

  const sentimentColor = (label: string) => {
    if (label === 'positive') return 'text-green-400'
    if (label === 'negative') return 'text-red-400'
    return 'text-yellow-400'
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileText size={20} className="text-[var(--accent)]" /> NLP Analysis
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Sentiment, entities, keywords, summarization & classification</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {[
          { id: 'analyze', label: 'Multi-Task Analysis' },
          { id: 'email', label: 'Email Analysis' },
          { id: 'classify', label: 'Zero-Shot Classify' },
        ].map(m => (
          <button key={m.id} onClick={() => setActiveMode(m.id as any)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeMode === m.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        {/* Input */}
        <div className="card p-5 space-y-4 h-fit">
          <h3 className="section-title mb-2">Configure Analysis</h3>
          
          {activeMode === 'analyze' && (
            <div className="flex gap-2 flex-wrap pb-2 border-b border-[var(--glass-border)]">
              {TASK_OPTIONS.map(t => (
                <button key={t.id} onClick={() => toggleTask(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${tasks.includes(t.id) ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {activeMode === 'email' && (
            <input className="input" placeholder="Email subject..." value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)} />
          )}

          {activeMode === 'classify' && (
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Classification Labels (comma-separated)</label>
              <input className="input" value={classifyLabels}
                onChange={e => setClassifyLabels(e.target.value)}
                placeholder="positive, negative, neutral..." />
            </div>
          )}

          <textarea
            className="input resize-none w-full"
            rows={12}
            placeholder={activeMode === 'email' ? 'Paste email body here...' : 'Paste your text here for analysis...'}
            value={text}
            onChange={e => setText(e.target.value)}
          />

          <button onClick={analyze} disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Send size={14} /> Analyze Text</>}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!result ? (
            <div className="card p-8 text-center flex-1">
              <FileText size={32} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">Results will appear here</p>
            </div>
          ) : (
            <>
              {result.results?.sentiment || result.sentiment ? (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Sentiment</h3>
                  {(() => {
                    const s = result.results?.sentiment || result.sentiment
                    return (
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold capitalize ${sentimentColor(s.label)}`}>{s.label}</span>
                        <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-2">
                          <div className={`h-2 rounded-full ${s.label === 'positive' ? 'bg-green-400' : s.label === 'negative' ? 'bg-red-400' : 'bg-yellow-400'}`}
                            style={{ width: `${(s.confidence * 100).toFixed(0)}%` }} />
                        </div>
                        <span className="text-sm text-[var(--text-secondary)]">{(s.confidence * 100).toFixed(0)}%</span>
                      </div>
                    )
                  })()}
                </div>
              ) : null}

              {result.results?.entities?.entities?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Named Entities</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.results.entities.entities.slice(0, 20).map((e: any, i: number) => (
                      <span key={i} className="badge-blue flex items-center gap-1">
                        {e.label === 'PER' ? <User size={10} /> : e.label === 'DATE' ? <Calendar size={10} /> : <Tag size={10} />}
                        {e.text} <span className="opacity-60">{e.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.results?.keywords?.keywords?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.results.keywords.keywords.map((k: any, i: number) => (
                      <span key={i} className="badge-purple flex items-center gap-1">
                        <Hash size={10} />{k.word}
                        <span className="opacity-60">{k.score.toFixed(1)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.results?.summary?.summary && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Summary</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{result.results.summary.summary}</p>
                </div>
              )}

              {/* Zero-shot classify results */}
              {result.scores && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Classification Scores</h3>
                  <div className="space-y-2">
                    {Object.entries(result.scores).sort(([,a]: any, [,b]: any) => b - a).map(([label, score]: any) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] w-24 truncate capitalize">{label}</span>
                        <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-2">
                          <div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: `${(score * 100).toFixed(0)}%` }} />
                        </div>
                        <span className="text-xs text-[var(--text-muted)] w-10 text-right">{(score * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email analysis */}
              {result.intent && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Email Intelligence</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--text-muted)]">Priority:</span>
                    <span className={`badge ${result.priority === 'high' ? 'badge-red' : result.priority === 'medium' ? 'badge-yellow' : 'badge-green'}`}>
                      {result.priority}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">Intent:</span>
                    <span className="badge-blue">{result.intent.top_label}</span>
                  </div>
                  {result.summary?.summary && (
                    <p className="text-xs text-[var(--text-secondary)]">{result.summary.summary}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
