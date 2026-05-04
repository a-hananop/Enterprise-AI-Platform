import { useState, useEffect } from 'react'
import { documentsAPI, dataAPI, meetingsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { BookOpen, FileQuestion, Search, Layers, GitCompare, Loader2, Mic } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

export default function Documents() {
  const [activeTab, setActiveTab] = useState<'summarize' | 'qa' | 'extract' | 'compare' | 'meeting'>('summarize')
  const [docSources, setDocSources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Forms
  const [summarizeForm, setSummarizeForm] = useState({ source_id: '', focus: '' })
  const [qaForm, setQaForm] = useState({ source_id: '', question: '' })
  const [extractForm, setExtractForm] = useState({ source_id: '', extract_type: 'key_info' })
  const [compareForm, setCompareForm] = useState({ source_ids: [] as string[], comparison_aspect: '' })
  const [meetingForm, setMeetingForm] = useState({ transcript: '', meeting_title: '' })

  useEffect(() => {
    dataAPI.list({ limit: 50 }).then(r => {
      const docs = (r.data.sources || []).filter((s: any) =>
        ['pdf', 'docx', 'txt'].includes(s.source_type) && s.is_indexed
      )
      setDocSources(docs)
    }).catch(() => {})
  }, [])

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      let res
      if (activeTab === 'summarize') {
        if (!summarizeForm.source_id) return toast.error('Select a document')
        res = await documentsAPI.summarize(summarizeForm)
      } else if (activeTab === 'qa') {
        if (!qaForm.source_id || !qaForm.question) return toast.error('Select document and enter question')
        res = await documentsAPI.qa(qaForm)
      } else if (activeTab === 'extract') {
        if (!extractForm.source_id) return toast.error('Select a document')
        res = await documentsAPI.extract(extractForm)
      } else if (activeTab === 'compare') {
        if (compareForm.source_ids.length < 2) return toast.error('Select at least 2 documents')
        res = await documentsAPI.compare(compareForm)
      } else if (activeTab === 'meeting') {
        if (!meetingForm.transcript) return toast.error('Paste meeting transcript')
        res = await meetingsAPI.analyze(meetingForm)
      }
      setResult(res?.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Operation failed')
    } finally { setLoading(false) }
  }

  const toggleCompareSource = (id: string) => {
    setCompareForm(f => ({
      ...f,
      source_ids: f.source_ids.includes(id) ? f.source_ids.filter(s => s !== id) : [...f.source_ids, id]
    }))
  }

  const tabs = [
    { id: 'summarize', label: 'Summarize', icon: BookOpen },
    { id: 'qa', label: 'Q&A', icon: FileQuestion },
    { id: 'extract', label: 'Extract', icon: Search },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'meeting', label: 'Meeting AI', icon: Mic },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen size={20} className="text-[var(--accent)]" /> Document Intelligence
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Summarize, Q&A, extract, compare documents — and analyze meeting transcripts
        </p>
        {docSources.length === 0 && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
            ⚠️ No indexed documents found. Upload PDFs, DOCX, or TXT files with "Index for RAG" enabled to use Document Intelligence.
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id as any); setResult(null) }}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Forms */}
        <div className="card p-5 space-y-4">
          {activeTab === 'summarize' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Document Summarization</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Select Document</label>
                <select className="input" value={summarizeForm.source_id}
                  onChange={e => setSummarizeForm(f => ({ ...f, source_id: e.target.value }))}>
                  <option value="">Choose document...</option>
                  {docSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Focus (optional)</label>
                <input className="input" placeholder="e.g. financial terms, action items..."
                  value={summarizeForm.focus} onChange={e => setSummarizeForm(f => ({ ...f, focus: e.target.value }))} />
              </div>
            </>
          )}

          {activeTab === 'qa' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Document Q&A</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Select Document</label>
                <select className="input" value={qaForm.source_id}
                  onChange={e => setQaForm(f => ({ ...f, source_id: e.target.value }))}>
                  <option value="">Choose document...</option>
                  {docSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Your Question</label>
                <textarea className="input resize-none" rows={4}
                  placeholder="What does the document say about...?"
                  value={qaForm.question} onChange={e => setQaForm(f => ({ ...f, question: e.target.value }))} />
              </div>
            </>
          )}

          {activeTab === 'extract' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Information Extraction</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Select Document</label>
                <select className="input" value={extractForm.source_id}
                  onChange={e => setExtractForm(f => ({ ...f, source_id: e.target.value }))}>
                  <option value="">Choose document...</option>
                  {docSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Extract Type</label>
                <select className="input" value={extractForm.extract_type}
                  onChange={e => setExtractForm(f => ({ ...f, extract_type: e.target.value }))}>
                  <option value="key_info">Key Information</option>
                  <option value="dates">Dates & Deadlines</option>
                  <option value="people">People & Roles</option>
                  <option value="clauses">Contract Clauses</option>
                  <option value="action_items">Action Items</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'compare' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compare Documents</h3>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Select Documents (2–5)</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {docSources.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={compareForm.source_ids.includes(s.id)}
                        onChange={() => toggleCompareSource(s.id)} />
                      <span className="text-xs text-[var(--text-secondary)]">{s.name}</span>
                    </label>
                  ))}
                  {docSources.length === 0 && <p className="text-xs text-[var(--text-muted)]">No indexed documents available</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Comparison Focus (optional)</label>
                <input className="input" placeholder="e.g. pricing, terms, methodology..."
                  value={compareForm.comparison_aspect} onChange={e => setCompareForm(f => ({ ...f, comparison_aspect: e.target.value }))} />
              </div>
            </>
          )}

          {activeTab === 'meeting' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Meeting Intelligence</h3>
              <input className="input" placeholder="Meeting title (optional)"
                value={meetingForm.meeting_title} onChange={e => setMeetingForm(f => ({ ...f, meeting_title: e.target.value }))} />
              <textarea className="input resize-none" rows={10}
                placeholder="Paste your meeting transcript here...&#10;&#10;Example:&#10;John: Good morning everyone. Let's discuss Q3 results...&#10;Sarah: Revenue was up 15% compared to last quarter..."
                value={meetingForm.transcript} onChange={e => setMeetingForm(f => ({ ...f, transcript: e.target.value }))} />
            </>
          )}

          <button onClick={run} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Layers size={14} /> Run Analysis</>}
          </button>
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="card p-8 text-center h-full flex items-center justify-center">
              <div>
                <BookOpen size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Results will appear here</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Configure and run analysis on the left</p>
              </div>
            </div>
          ) : (
            <div className="card p-5 animate-fade-in overflow-auto">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.summary || result.answer || result.extracted_content || result.comparison || result.analysis || JSON.stringify(result, null, 2)}
                </ReactMarkdown>
              </div>

              {/* Sources */}
              {result.sources?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Sources</p>
                  {result.sources.slice(0, 3).map((s: any, i: number) => (
                    <div key={i} className="text-xs text-[var(--text-muted)] mb-1 truncate">
                      [{i+1}] {s.text?.slice(0, 100)}... (score: {s.score})
                    </div>
                  ))}
                </div>
              )}

              {/* Meeting keywords */}
              {result.keywords && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Key Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords.map((k: any, i: number) => (
                      <span key={i} className="badge-blue">{k.word}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
