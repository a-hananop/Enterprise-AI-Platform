import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { ClipboardList, FileText, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.listReports().then(r => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openReport = async (r: any) => {
    try { const res = await analyticsAPI.getReport(r.id); setSelected(res.data) } catch {}
  }

  const downloadReport = (report: any) => {
    const blob = new Blob([report.content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${report.title.replace(/\s+/g, '_')}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full">
      <div className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0">
        <div className="p-3 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Generated Reports</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{reports.length} reports</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="loading-pulse h-16 rounded-lg" />) :
           reports.length === 0 ? (
            <div className="text-center py-10 px-3">
              <ClipboardList size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">No reports yet. Generate from Analytics.</p>
            </div>
          ) : reports.map(r => (
            <div key={r.id} onClick={() => openReport(r)}
              className={`p-2.5 rounded-lg cursor-pointer border transition-all ${selected?.id === r.id ? 'bg-[var(--accent-glow)] border-[var(--accent)]/20' : 'border-transparent hover:bg-[var(--bg-card)]'}`}>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{r.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge-blue capitalize text-[10px]">{r.report_type}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <div className="max-w-3xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selected.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-blue capitalize">{selected.report_type}</span>
                  <span className="text-xs text-[var(--text-muted)]">{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</span>
                </div>
              </div>
              <button onClick={() => downloadReport(selected)} className="btn-secondary"><Download size={14} /> Export</button>
            </div>
            <div className="card p-6"><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown></div></div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText size={48} className="text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">Select a report to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
