import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { useStore } from '../store'
import {
  HardDrive, MessageCircle, TrendingUp, BarChart2,
  ArrowUpRight, ArrowDownRight, Zap, Plus,
  Activity, Clock, ChevronRight
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const sparkData = [
  { m: 'Sep', v: 3200 }, { m: 'Oct', v: 4100 }, { m: 'Nov', v: 3800 },
  { m: 'Dec', v: 5200 }, { m: 'Jan', v: 6100 }, { m: 'Feb', v: 5800 },
  { m: 'Mar', v: 7400 },
]
const barData = [
  { d: 'Mon', v: 42 }, { d: 'Tue', v: 68 }, { d: 'Wed', v: 55 },
  { d: 'Thu', v: 81 }, { d: 'Fri', v: 73 }, { d: 'Sat', v: 38 }, { d: 'Sun', v: 29 },
]

const TIP = {
  contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' },
  cursor: { stroke: 'rgba(255,255,255,0.1)' },
}

export default function Dashboard() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    analyticsAPI.dashboard().then(r => setData(r.data)).catch(() => {})
  }, [])

  const ov = data?.overview || {}
  const kpis = data?.kpis || []
  const recent = data?.recent_sources || []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const quickActions = [
    { label: 'Upload Data',        icon: HardDrive,    path: '/data',      color: '#4f8bff' },
    { label: 'Chat with AI',       icon: MessageCircle, path: '/assistant', color: '#22d3a5' },
    { label: 'Run Prediction',     icon: TrendingUp,   path: '/predict',   color: '#a78bfa' },
    { label: 'View Analytics',     icon: BarChart2,    path: '/analytics', color: '#f5a623' },
  ]

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {greeting}, {user?.full_name?.split(' ')[0] || user?.username} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
          Here's what's happening across your platform today.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }} className="stagger">
        {[
          { label: 'Data Sources',    value: ov.total_data_sources || 0, icon: HardDrive,     color: '#4f8bff', change: '+2', up: true  },
          { label: 'AI Conversations',value: ov.total_chat_sessions || 0,icon: MessageCircle, color: '#22d3a5', change: '+5', up: true  },
          { label: 'Trained Models',  value: ov.total_ml_models || 0,   icon: TrendingUp,    color: '#a78bfa', change: '0',  up: true  },
          { label: 'Active Alerts',   value: ov.unread_alerts || 0,     icon: Activity,      color: '#f5a623', change: '',   up: false },
        ].map(({ label, value, icon: Icon, color, change, up }) => (
          <div key={label} className="stat">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
            {change && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: up ? 'var(--success)' : 'var(--text-muted)' }}>
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {change} this week
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-head">
            <div>
              <div className="section-title">Platform Activity</div>
              <div className="section-desc">AI requests over the last 7 months</div>
            </div>
            <div className="badge-green" style={{ fontSize: 11.5 }}>↑ 18.2% growth</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4f8bff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4f8bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TIP} />
              <Area type="monotone" dataKey="v" stroke="#4f8bff" strokeWidth={2} fill="url(#aGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 22, minWidth: 260 }}>
          <div className="section-head">
            <div>
              <div className="section-title">Weekly Usage</div>
              <div className="section-desc">Requests per day</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={18}>
              <XAxis dataKey="d" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TIP} />
              <Bar dataKey="v" fill="#4f8bff" radius={[5, 5, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Quick actions */}
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>
            <Zap size={15} color="var(--accent)" /> Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickActions.map(({ label, icon: Icon, path, color }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.borderColor = `${color}44` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                <ChevronRight size={13} color="var(--text-dim)" />
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="card" style={{ padding: 22 }}>
          <div className="section-head">
            <div className="section-title"><Activity size={15} color="var(--accent)" /> Key Metrics</div>
            <button className="btn-ghost" onClick={() => navigate('/analytics')} style={{ fontSize: 12 }}>View all</button>
          </div>
          {kpis.length === 0 ? (
            <div className="empty" style={{ padding: '30px 10px' }}>
              <div className="empty-title">No metrics yet</div>
              <div className="empty-desc">Upload data to auto-extract KPIs</div>
              <button className="btn-primary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigate('/data')}>
                <Plus size={13} /> Upload Data
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {kpis.slice(0, 5).map((k: any) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{k.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {k.unit === '$' ? '$' : ''}{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                    </div>
                    {k.change_percent != null && (
                      <div style={{ fontSize: 11, color: k.trend === 'up' ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        {k.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(k.change_percent).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent data */}
        <div className="card" style={{ padding: 22 }}>
          <div className="section-head">
            <div className="section-title"><Clock size={15} color="var(--accent)" /> Recent Data</div>
            <button className="btn-ghost" onClick={() => navigate('/data')} style={{ fontSize: 12 }}>View all</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding: '30px 10px' }}>
              <div className="empty-title">No data uploaded</div>
              <div className="empty-desc">Upload CSV, Excel, or PDF files to get started</div>
              <button className="btn-primary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigate('/data')}>
                <Plus size={13} /> Upload Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map((s: any) => (
                <div key={s.id}
                  onClick={() => navigate('/data')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--glass-bg)')}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(79,139,255,0.1)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {s.type?.slice(0, 3)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
