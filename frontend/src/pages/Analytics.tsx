import { useState, useEffect } from 'react'
import { analyticsAPI, dataAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  BarChart3, TrendingUp, TrendingDown, Plus, FileText,
  Loader2, RefreshCw, Bell, CheckCircle, Zap
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'kpis' | 'trends' | 'reports' | 'alerts'>('kpis')
  const [kpis, setKpis] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [reportForm, setReportForm] = useState({ title: '', report_type: 'business', data_source_ids: [] as string[] })
  const [generatingReport, setGeneratingReport] = useState(false)
  const [trendForm, setTrendForm] = useState({ data_source_id: '', date_column: '', value_columns: '', granularity: 'monthly' })
  const [trendData, setTrendData] = useState<any>(null)
  const [trendLoading, setTrendLoading] = useState(false)

  useEffect(() => {
    loadAll()
    dataAPI.list({ limit: 50 }).then(r => setSources(r.data.sources || [])).catch(() => {})
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [kpiRes, reportRes, alertRes] = await Promise.all([
        analyticsAPI.listKPIs(),
        analyticsAPI.listReports(),
        analyticsAPI.alerts(),
      ])
      setKpis(kpiRes.data)
      setReports(reportRes.data)
      setAlerts(alertRes.data)
    } catch {}
    finally { setLoading(false) }
  }

  const extractKPIs = async (sourceId: string) => {
    try {
      const res = await analyticsAPI.extractKPIs(sourceId)
      toast.success(`Extracted ${res.data.extracted} KPIs!`)
      const kpiRes = await analyticsAPI.listKPIs()
      setKpis(kpiRes.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'KPI extraction failed')
    }
  }

  const generateReport = async () => {
    if (!reportForm.title) return toast.error('Enter a report title')
    setGeneratingReport(true)
    try {
      const res = await analyticsAPI.generateReport(reportForm)
      toast.success('Report generated!')
      setReports(prev => [res.data, ...prev])
      setSelectedReport(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Report generation failed')
    } finally { setGeneratingReport(false) }
  }

  const loadTrends = async () => {
    if (!trendForm.data_source_id || !trendForm.date_column || !trendForm.value_columns) {
      return toast.error('Fill all trend analysis fields')
    }
    setTrendLoading(true)
    try {
      const cols = trendForm.value_columns.split(',').map(c => c.trim())
      const res = await analyticsAPI.trendAnalysis({
        data_source_id: trendForm.data_source_id,
        date_column: trendForm.date_column,
        value_columns: cols,
        granularity: trendForm.granularity,
      })
      if (res.data.error) {
        toast.error(res.data.error)
        setTrendData(null)
      } else {
        setTrendData(res.data)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Trend analysis failed')
    } finally { setTrendLoading(false) }
  }

  const markAlertRead = async (id: string) => {
    await analyticsAPI.markAlertRead(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  const tabularSources = sources.filter(s => ['csv', 'excel', 'json'].includes(s.source_type))

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--accent)]" /> Analytics & Business Intelligence
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">KPIs, trends, AI-generated reports, and alerts</p>
        </div>
        <button onClick={loadAll} className="btn-ghost"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {[
          { id: 'kpis', label: 'KPIs & Metrics', icon: BarChart3 },
          { id: 'trends', label: 'Trend Analysis', icon: TrendingUp },
          { id: 'reports', label: 'AI Reports', icon: FileText },
          { id: 'alerts', label: `Alerts ${alerts.filter(a => !a.is_read).length > 0 ? `(${alerts.filter(a => !a.is_read).length})` : ''}`, icon: Bell },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── KPIs Tab ── */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          {/* Extract from dataset */}
          {tabularSources.length > 0 && (
            <div className="card p-4 border-[var(--accent)]/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Auto-Extract KPIs</p>
                  <p className="text-xs text-[var(--text-muted)]">Let AI identify and extract key metrics from your data</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input w-48" onChange={e => e.target.value && extractKPIs(e.target.value)} defaultValue="">
                    <option value="" disabled>Select dataset...</option>
                    {tabularSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* KPI Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="loading-pulse h-24 rounded-xl" />)}
            </div>
          ) : kpis.length === 0 ? (
            <div className="card p-12 text-center">
              <BarChart3 size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">No KPIs tracked yet</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Upload a dataset and extract KPIs automatically</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {kpis.map(kpi => {
                const catColors: Record<string, string> = {
                  sales: '#22d3a5', revenue: '#4f8bff', marketing: '#a78bfa',
                  operations: '#f5a623', finance: '#ff5c7a', hr: '#8892b0',
                }
                const accent = catColors[kpi.category?.toLowerCase()] || '#4f8bff'
                return (
                  <motion.div key={kpi.id} className="glow-on-hover"
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
                    whileHover={{ y: -2 } as any}
                    style={{
                      padding: '16px 18px', borderRadius: 14,
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Left accent bar */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, borderRadius: '14px 0 0 14px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                        {kpi.name}
                      </span>
                      {kpi.trend === 'up'
                        ? <TrendingUp size={13} style={{ color: '#22d3a5', flexShrink: 0 }} />
                        : kpi.trend === 'down'
                        ? <TrendingDown size={13} style={{ color: '#ff5c7a', flexShrink: 0 }} />
                        : null}
                    </div>

                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kpi.unit === '$' && <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>$</span>}
                      {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                      {kpi.unit && kpi.unit !== '$' && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 3 }}>{kpi.unit}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {kpi.category && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: accent, background: `${accent}18`, padding: '2px 8px', borderRadius: 5, textTransform: 'capitalize' }}>
                          {kpi.category}
                        </span>
                      )}
                      {kpi.change_percent != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: kpi.trend === 'up' ? '#22d3a5' : '#ff5c7a' }}>
                          {kpi.change_percent > 0 ? '+' : ''}{kpi.change_percent?.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      )}


      {/* ── Trends Tab ── */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="section-title mb-4"><TrendingUp size={16} className="text-[var(--accent)]" /> Configure Trend Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Dataset</label>
                <select className="input" value={trendForm.data_source_id}
                  onChange={e => setTrendForm(f => ({ ...f, data_source_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {tabularSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Date Column</label>
                <input className="input" placeholder="e.g. date, created_at"
                  value={trendForm.date_column} onChange={e => setTrendForm(f => ({ ...f, date_column: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Value Columns (comma-separated)</label>
                <input className="input" placeholder="e.g. revenue, sales"
                  value={trendForm.value_columns} onChange={e => setTrendForm(f => ({ ...f, value_columns: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Granularity</label>
                <select className="input" value={trendForm.granularity}
                  onChange={e => setTrendForm(f => ({ ...f, granularity: e.target.value }))}>
                  {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(g => (
                    <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={loadTrends} disabled={trendLoading} className="btn-primary">
              {trendLoading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><TrendingUp size={14} /> Analyze Trends</>}
            </button>
          </div>

          {trendData && (
            <div className="space-y-4 animate-fade-in">
              {trendData.insights?.length > 0 && (
                <div className="card p-4">
                  <h3 className="section-title mb-2"><Zap size={14} className="text-yellow-400" /> AI Insights</h3>
                  <ul className="space-y-1">
                    {trendData.insights.map((insight: string, i: number) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>{insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {trendData.series && Object.entries(trendData.series).map(([col, series]: any) => (
                <div key={col} className="card p-5">
                  <h3 className="section-title mb-4 capitalize">{col.replace(/_/g, ' ')} Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill: '#4f5469', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#4f5469', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#13151e', border: '1px solid #1e2130', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="sum" stroke="#4f72ff" strokeWidth={2} dot={false} name="Total" />
                      <Line type="monotone" dataKey="mean" stroke="#22c55e" strokeWidth={2} dot={false} name="Average" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report list */}
          <div className="space-y-3">
            <div className="card p-4">
              <h3 className="section-title mb-3">Generate AI Report</h3>
              <div className="space-y-3">
                <input className="input" placeholder="Report title..."
                  value={reportForm.title} onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))} />
                <select className="input" value={reportForm.report_type}
                  onChange={e => setReportForm(f => ({ ...f, report_type: e.target.value }))}>
                  {['business', 'sales', 'marketing', 'risk', 'custom'].map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)} Report</option>
                  ))}
                </select>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5">Include datasets (optional)</label>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {tabularSources.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={reportForm.data_source_ids.includes(s.id)}
                          onChange={e => setReportForm(f => ({
                            ...f,
                            data_source_ids: e.target.checked
                              ? [...f.data_source_ids, s.id]
                              : f.data_source_ids.filter(id => id !== s.id)
                          }))} />
                        <span className="text-[var(--text-secondary)] truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={generateReport} disabled={generatingReport} className="btn-primary w-full justify-center">
                  {generatingReport ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Zap size={14} /> Generate Report</>}
                </button>
              </div>
            </div>

            {reports.map(r => (
              <div key={r.id} onClick={() => setSelectedReport(r)}
                className={clsx('card-hover p-3 cursor-pointer rounded-xl',
                  selectedReport?.id === r.id && 'border-[var(--accent)] bg-[var(--accent-glow)]')}>
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-blue capitalize">{r.report_type}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Report viewer */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">{selectedReport.title}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge-blue capitalize">{selectedReport.report_type}</span>
                  <span className="text-xs text-[var(--text-muted)]">{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString() : ''}</span>
                </div>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedReport.content || 'No content available.'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center h-full flex items-center justify-center">
                <div>
                  <FileText size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">Select or generate a report</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Alerts Tab ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle size={36} className="text-green-400 mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">No alerts</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">All systems are running normally</p>
            </div>
          ) : alerts.map(alert => (
            <div key={alert.id} className={clsx('card p-4 flex items-start gap-3', alert.is_read && 'opacity-60')}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-400' : alert.severity === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                  <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'warning' ? 'badge-yellow' : 'badge-blue'}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{alert.message}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}</p>
              </div>
              {!alert.is_read && (
                <button onClick={() => markAlertRead(alert.id)} className="btn-ghost text-xs py-1 px-2 flex-shrink-0">
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
