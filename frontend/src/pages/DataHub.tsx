import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { dataAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Upload, HardDrive, Trash2, Eye, BarChart2,
  Search, Loader2, CheckCircle, RefreshCw, X
} from 'lucide-react'
import clsx from 'clsx'

const TYPE_COLOR: Record<string, string> = {
  csv: '#22d3a5', excel: '#4f8bff', json: '#f5a623',
  pdf: '#ff5c7a', docx: '#a78bfa', txt: '#8892b0',
}

function formatSize(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

export default function DataHub() {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [tab, setTab] = useState<'preview' | 'stats'>('preview')
  const [search, setSearch] = useState('')
  const [storage, setStorage] = useState<any>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [sr, st] = await Promise.all([dataAPI.list(), dataAPI.storageStats()])
      setSources(sr.data.sources || [])
      setStorage(st.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      setUploading(true)
      try {
        const res = await dataAPI.upload(file, { name: file.name.replace(/\.[^/.]+$/, ''), index_for_rag: 'true' })
        toast.success(`Uploaded: ${file.name}`)
        setSources(prev => [res.data.data_source, ...prev])
      } catch (e: any) {
        toast.error(e.response?.data?.detail || `Failed: ${file.name}`)
      } finally { setUploading(false) }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/json': ['.json'], 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] }
  })

  const select = async (src: any) => {
    setSelected(src); setPreview(null); setStats(null); setTab('preview')
    try { const r = await dataAPI.preview(src.id); setPreview(r.data) } catch {}
  }

  const loadStats = async () => {
    if (!selected || stats) { setTab('stats'); return }
    setTab('stats')
    try { const r = await dataAPI.stats(selected.id); setStats(r.data) }
    catch { toast.error('Statistics not available for this file type') }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this data source?')) return
    try {
      await dataAPI.delete(id)
      setSources(prev => prev.filter(s => s.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const filtered = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(12,14,26,0.6)', overflow: 'hidden' }}>

        {/* Upload zone */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--glass-border)' }}>
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--glass-border)'}`,
            borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? 'var(--accent-dim)' : 'transparent',
            transition: 'all 0.2s',
          }}>
            <input {...getInputProps()} />
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={22} color="var(--accent)" className="spin" />
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Uploading...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={18} color="var(--accent)" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isDragActive ? 'Drop files here' : 'Drop files or click to upload'}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>CSV · Excel · JSON · PDF · DOCX · TXT</p>
              </div>
            )}
          </div>
        </div>

        {/* Storage info */}
        {storage && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{storage.total_files} files</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{storage.total_size_mb} MB used</span>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', position: 'relative' }}>
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" placeholder="Search files..." style={{ paddingLeft: 32, fontSize: 12.5 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* File list */}
        <div className="stagger" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 68, marginBottom: 8 }} />
            ))
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><HardDrive size={20} /></div>
              <div className="empty-title">No files yet</div>
              <div className="empty-desc">Upload your first file above</div>
            </div>
          ) : filtered.map(src => (
            <div
              key={src.id}
              onClick={() => select(src)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 12px', borderRadius: 10, marginBottom: 4,
                cursor: 'pointer', transition: 'all 0.15s',
                background: selected?.id === src.id ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${selected?.id === src.id ? 'rgba(79,139,255,0.25)' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (selected?.id !== src.id) e.currentTarget.style.background = 'var(--glass-hover)' }}
              onMouseLeave={e => { if (selected?.id !== src.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${TYPE_COLOR[src.source_type] || '#888'}18`,
                border: `1px solid ${TYPE_COLOR[src.source_type] || '#888'}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                color: TYPE_COLOR[src.source_type] || '#888',
              }}>
                {src.source_type?.slice(0, 3)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  {src.row_count && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{src.row_count.toLocaleString()} rows</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(src.file_size)}</span>
                  {src.is_indexed && <CheckCircle size={10} color="var(--success)" />}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); del(src.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 3, borderRadius: 5, opacity: 0, transition: 'opacity 0.15s' }}
                className="del-btn"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="slide-in-right" style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
        {!selected ? (
          <div className="empty" style={{ height: '100%' }}>
            <div className="empty-icon"><Eye size={22} /></div>
            <div className="empty-title">Select a file to preview</div>
            <div className="empty-desc">Click any file on the left to see its contents and statistics</div>
          </div>
        ) : (
          <div style={{ padding: 28 }} className="fade-in">
            {/* File header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{selected.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: TYPE_COLOR[selected.source_type] || '#888', background: `${TYPE_COLOR[selected.source_type] || '#888'}18`, padding: '2px 8px', borderRadius: 5 }}>
                    {selected.source_type}
                  </span>
                  {selected.row_count && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.row_count.toLocaleString()} rows × {selected.column_count} columns</span>}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(selected.file_size)}</span>
                  {selected.is_indexed && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)' }}>
                      <CheckCircle size={11} /> Indexed for AI
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={load}><RefreshCw size={13} /> Refresh</button>
                <button className="btn-danger" onClick={() => del(selected.id)}><Trash2 size={13} /> Delete</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              {[
                { id: 'preview', label: 'Preview', icon: Eye },
                { id: 'stats',   label: 'Statistics', icon: BarChart2 },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id}
                  onClick={() => id === 'stats' ? loadStats() : setTab('preview')}
                  className={clsx('tab', tab === id && 'active')}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* Preview */}
            {tab === 'preview' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                {!preview ? (
                  <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} className="spin" color="var(--accent)" /></div>
                ) : Array.isArray(preview.data) && preview.data.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>{Object.keys(preview.data[0] || {}).map(col => <th key={col}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.data.map((row: any, i: number) => (
                          <tr key={i}>
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {String(val ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre style={{ padding: 20, fontSize: 12, color: 'var(--text-secondary)', overflowX: 'auto' }}>
                    {JSON.stringify(preview.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Stats */}
            {tab === 'stats' && (
              <div>
                {!stats ? (
                  <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} className="spin" color="var(--accent)" /></div>
                ) : (
                  <div className="stagger">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                      {[
                        { label: 'Total Rows',    value: stats.shape?.rows?.toLocaleString()    },
                        { label: 'Columns',       value: stats.shape?.columns                   },
                        { label: 'Numeric Cols',  value: stats.numeric_columns || 0             },
                      ].map(({ label, value }) => (
                        <div key={label} className="stat">
                          <div className="stat-label">{label}</div>
                          <div className="stat-value">{value}</div>
                        </div>
                      ))}
                    </div>

                    {stats.numeric_summary && Object.keys(stats.numeric_summary).length > 0 && (
                      <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Numeric Summary</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Column</th>
                                {['mean', 'std', 'min', '50%', 'max'].map(s => <th key={s} style={{ textAlign: 'right' }}>{s}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(stats.numeric_summary).map(([col, vals]: any) => (
                                <tr key={col}>
                                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{col}</td>
                                  {['mean', 'std', 'min', '50%', 'max'].map(k => (
                                    <td key={k} style={{ textAlign: 'right' }}>
                                      {vals[k] != null ? Number(vals[k]).toFixed(2) : '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`.del-btn:hover { opacity: 1 !important; color: var(--danger) !important; }`}</style>
    </div>
  )
}
