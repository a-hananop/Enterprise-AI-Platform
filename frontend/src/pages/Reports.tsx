import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { ClipboardList, FileText, Download, Search, Calendar, Menu, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'

const TYPE_COLOR: Record<string, string> = {
  business: '#4f8bff', financial: '#22d3a5', marketing: '#a78bfa',
  technical: '#f5a623', executive: '#ff5c7a', custom: '#8892b0',
}

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [width, setWidth] = useState(window.innerWidth)
  const [showReportsMobile, setShowReportsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024

  useEffect(() => {
    analyticsAPI.listReports()
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openReport = async (r: any) => {
    try {
      const res = await analyticsAPI.getReport(r.id)
      setSelected(res.data)
      setShowReportsMobile(false)
    } catch {}
  }

  const downloadReport = (report: any) => {
    const blob = new Blob([report.content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/\s+/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = reports.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.report_type?.toLowerCase().includes(search.toLowerCase())
  )

  const ReportsList = () => (
    <div style={{
      width: isMobile ? '100%' : 288,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
      background: 'rgba(10,12,22,0.7)',
      backdropFilter: 'blur(16px)',
      height: '100%',
    }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--glass-border)' }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setShowReportsMobile(false)}>
              <X size={14} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Generated Reports</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{reports.length} report{reports.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(79,139,255,0.1)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={15} color="var(--accent)" />
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input"
            placeholder="Search reports..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 12, height: 32 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="loading-pulse" style={{ height: 72, borderRadius: 10, marginBottom: 6 }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: '40px 10px' }}>
            <div className="empty-icon"><FileText size={18} /></div>
            <div className="empty-title">No reports</div>
            <div className="empty-desc">Generate reports from Analytics</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((r, i) => {
              const color = TYPE_COLOR[r.report_type] || '#4f8bff'
              const isSelected = selected?.id === r.id
              return (
                <motion.div
                  key={r.id}
                  onClick={() => openReport(r)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: i * 0.05, duration: 0.22 }}
                  whileHover={{ x: 2 } as any}
                  style={{
                    padding: '12px 13px', borderRadius: 11, marginBottom: 6, cursor: 'pointer',
                    background: isSelected ? `${color}12` : 'var(--glass-bg)',
                    border: `1px solid ${isSelected ? color + '40' : 'var(--glass-border)'}`,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={13} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                        {r.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color, background: `${color}15`, padding: '1px 7px', borderRadius: 4, textTransform: 'capitalize' }}>
                          {r.report_type}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={9} />{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', position: 'relative' }}>
      {isMobile && showReportsMobile && (
        <div
          onClick={() => setShowReportsMobile(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,16,0.5)', backdropFilter: 'blur(4px)', zIndex: 140 }}
        />
      )}

      {!isMobile ? (
        <ReportsList />
      ) : (
        <div style={{
          position: 'fixed', top: 60, left: 0, bottom: 0,
          width: 'min(88vw, 288px)', zIndex: 150,
          transform: showReportsMobile ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: showReportsMobile ? '6px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}>
          <ReportsList />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)', minWidth: 0 }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 0' }}>
            <button className="btn-ghost" style={{ padding: '7px 9px' }} onClick={() => setShowReportsMobile(true)}>
              <Menu size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Reports</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} style={{ padding: isMobile ? 16 : 32, maxWidth: 820 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{selected.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize',
                      color: TYPE_COLOR[selected.report_type] || '#4f8bff',
                      background: `${TYPE_COLOR[selected.report_type] || '#4f8bff'}18`,
                      padding: '3px 10px', borderRadius: 6,
                    }}>
                      {selected.report_type}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={11} />{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isMobile && (
                    <motion.button className="btn-ghost" onClick={() => setSelected(null)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      Back
                    </motion.button>
                  )}
                  <motion.button className="btn-secondary" onClick={() => downloadReport(selected)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Download size={13} /> Export
                  </motion.button>
                </div>
              </div>
              <div className="card" style={{ padding: isMobile ? 16 : 28 }}>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: isMobile ? 16 : 24 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(79,139,255,0.08)', border: '1px solid rgba(79,139,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <FileText size={26} color="var(--accent)" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Select a report to read</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose any report from the sidebar</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
