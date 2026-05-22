import { useState, useEffect, useRef } from 'react'
import { chatAPI, dataAPI } from '../services/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Plus, Trash2, MessageCircle, Database, Bot, User2, ChevronDown, Loader2, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export default function AIAssistant() {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [useRag, setUseRag] = useState(true)
  const [showSessionsMobile, setShowSessionsMobile] = useState(false)
  const [width, setWidth] = useState(window.innerWidth)
  const endRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024

  useEffect(() => {
    chatAPI.listSessions().then(r => setSessions(r.data)).catch(() => {})
    dataAPI.list({ limit: 50 }).then(r => setSources(r.data.sources || [])).catch(() => {})
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const openSession = async (s: any) => {
    setActiveSession(s)
    setShowSessionsMobile(false)
    try {
      const r = await chatAPI.getMessages(s.id)
      setMessages(r.data.messages || [])
      setSelectedSources(s.data_source_ids || [])
    } catch {}
  }

  const newSession = async () => {
    setShowSessionsMobile(false)
    try {
      const r = await chatAPI.createSession({ data_source_ids: selectedSources })
      setSessions(prev => [r.data, ...prev])
      setActiveSession(r.data)
      setMessages([])
    } catch { toast.error('Could not create session') }
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input; setInput(''); setLoading(true)
    const tmpId = 'tmp-' + Date.now()
    const assistantId = 'assistant-' + Date.now()

    setMessages(prev => [...prev,
      { id: tmpId, role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '', sources: [] }
    ])

    try {
      const response = await chatAPI.streamMessage({
        message: text,
        session_id: activeSession?.id,
        data_source_ids: selectedSources,
        use_rag: useRag
      })

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'token') {
                fullContent += data.content
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ))
              } else if (data.type === 'sources') {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, sources: data.content } : m
                ))
              } else if (data.type === 'done') {
                if (!activeSession) {
                  chatAPI.listSessions().then(r => {
                    setSessions(r.data)
                    const newSess = r.data.find((s: any) => s.id === data.session_id)
                    if (newSess) setActiveSession(newSess)
                  })
                }
              }
            } catch (e) {
              console.error('Error parsing stream chunk', e)
            }
          }
        }
      }
    } catch {
      toast.error('Message failed')
      setMessages(prev => prev.filter(m => m.id !== tmpId && m.id !== assistantId))
    } finally {
      setLoading(false)
    }
  }

  const delSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await chatAPI.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession?.id === id) { setActiveSession(null); setMessages([]) }
  }

  const STARTERS = [
    'Summarize the key insights from my uploaded data',
    'What are the top trends in the data?',
    'Identify any anomalies or unusual patterns',
    'Generate a brief executive summary',
  ]

  const Sidebar = () => (
    <div style={{
      width: isMobile ? '100%' : 260,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
      background: 'rgba(12,14,26,0.97)',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={newSession}>
          <Plus size={14} /> New Conversation
        </button>
        {isMobile && (
          <button className="btn-ghost" style={{ padding: '8px 10px' }} onClick={() => setShowSessionsMobile(false)}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Data source toggle */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => setShowSources(s => !s)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={12} /> Data Sources ({selectedSources.length} selected)
          </span>
          <ChevronDown size={12} style={{ transform: showSources ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showSources && (
          <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sources.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No files uploaded yet</p>
            ) : sources.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 2px' }}>
                <input type="checkbox"
                  checked={selectedSources.includes(s.id)}
                  onChange={() => setSelectedSources(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {s.is_indexed && <span style={{ fontSize: 10, color: 'var(--success)', flexShrink: 0 }}>AI</span>}
              </label>
            ))}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Use document context
        </label>
      </div>

      {/* Sessions */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {sessions.length === 0 ? (
          <div className="empty" style={{ padding: '30px 10px' }}>
            <div className="empty-icon"><MessageCircle size={18} /></div>
            <div className="empty-desc">No conversations yet</div>
          </div>
        ) : sessions.map(s => (
          <div
            key={s.id}
            onClick={() => openSession(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 11px', borderRadius: 9, marginBottom: 3,
              cursor: 'pointer', transition: 'all 0.15s',
              background: activeSession?.id === s.id ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${activeSession?.id === s.id ? 'rgba(79,139,255,0.2)' : 'transparent'}`,
            }}
            onMouseEnter={e => { if (activeSession?.id !== s.id) e.currentTarget.style.background = 'var(--glass-hover)' }}
            onMouseLeave={e => { if (activeSession?.id !== s.id) e.currentTarget.style.background = 'transparent' }}
          >
            <MessageCircle size={13} color={activeSession?.id === s.id ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, color: activeSession?.id === s.id ? 'var(--accent)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title || 'Untitled'}
            </span>
            <button onClick={e => delSession(s.id, e)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, opacity: 0, transition: 'opacity 0.15s', borderRadius: 4 }}
              className="del-btn"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', position: 'relative' }}>

      {/* Mobile backdrop */}
      {isMobile && showSessionsMobile && (
        <div
          onClick={() => setShowSessionsMobile(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,16,0.5)', backdropFilter: 'blur(4px)', zIndex: 140 }}
        />
      )}

      {/* Sidebar – fixed drawer on mobile */}
      {!isMobile ? (
        <Sidebar />
      ) : (
        <div style={{
          position: 'fixed', top: 60, left: 0, bottom: 0,
          width: 280, zIndex: 150,
          transform: showSessionsMobile ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: showSessionsMobile ? '6px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}>
          <Sidebar />
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(12,14,26,0.85)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-ghost" style={{ padding: '7px 9px' }} onClick={() => setShowSessionsMobile(true)}>
              <Menu size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeSession?.title || 'AI Assistant'}
            </span>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px 28px' }}>
          {!activeSession && messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--accent-soft)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={26} color="var(--accent)" />
              </div>
              <div>
                <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>AI Assistant</h2>
                <p style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
                  Chat with your uploaded data and documents in natural language. Get instant insights, summaries, and answers.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, maxWidth: 540, width: '100%' }}>
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textRef.current?.focus() }}
                    style={{
                      padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={m.id || i}
                    initial={{ opacity: 0, scale: 0.92, x: m.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: m.role === 'user' ? 'linear-gradient(135deg,#4f8bff,#7c3aed)' : 'var(--accent-soft)',
                      border: m.role === 'assistant' ? '1px solid rgba(79,139,255,0.2)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                    }}>
                      {m.role === 'user' ? <User2 size={14} color="#fff" /> : <Bot size={14} color="var(--accent)" />}
                    </div>

                    <div style={{
                      maxWidth: isMobile ? '85%' : '75%',
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--glass-bg)',
                      border: m.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                      padding: '12px 16px',
                    }}>
                      {m.role === 'user'
                        ? <p style={{ fontSize: 13.5, color: '#fff', margin: 0, lineHeight: 1.55 }}>{m.content}</p>
                        : <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                      }
                      {m.sources?.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
                          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sources</p>
                          {m.sources.slice(0, 3).map((s: any, j: number) => (
                            <div key={j} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                              {s.source} - relevance {Math.round(s.score * 100)}%
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    style={{ display: 'flex', gap: 12 }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={14} color="var(--accent)" />
                    </div>
                    <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '4px 14px 14px 14px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span className="dot-wave-1" /><span className="dot-wave-2" /><span className="dot-wave-3" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: isMobile ? '12px 16px' : '14px 28px', borderTop: '1px solid var(--glass-border)', background: 'rgba(12,14,26,0.8)', backdropFilter: 'blur(12px)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={textRef}
              className="input"
              style={{ flex: 1, resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto', minHeight: 44 }}
              rows={1}
              placeholder="Ask anything about your data..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button
              className="btn-primary"
              onClick={send}
              disabled={!input.trim() || loading}
              style={{ height: 44, width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
          {!isMobile && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
              Enter to send - Shift+Enter for new line - {selectedSources.length} sources selected
            </p>
          )}
        </div>
      </div>

      <style>{`.del-btn:hover { opacity: 1 !important; }`}</style>
    </div>
  )
}
