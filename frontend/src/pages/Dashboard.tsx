import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { useStore } from '../store'
import { HardDrive, MessageCircle, TrendingUp, BarChart2, ArrowUpRight, ArrowDownRight, Zap, Plus, Activity, Clock, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useSpring, animated } from '@react-spring/web'
import { motion } from 'framer-motion'

const AIBrain = lazy(() => import('../components/3d/AIBrain'))

const sparkData = [
  { m: 'Sep', v: 3200 }, { m: 'Oct', v: 4100 }, { m: 'Nov', v: 3800 },
  { m: 'Dec', v: 5200 }, { m: 'Jan', v: 6100 }, { m: 'Feb', v: 5800 }, { m: 'Mar', v: 7400 },
]
const barData = [
  { d: 'Mon', v: 42 }, { d: 'Tue', v: 68 }, { d: 'Wed', v: 55 },
  { d: 'Thu', v: 81 }, { d: 'Fri', v: 73 }, { d: 'Sat', v: 38 }, { d: 'Sun', v: 29 },
]
const TIP = {
  contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' },
  cursor: { stroke: 'rgba(255,255,255,0.1)' },
}

function AnimatedCounter({ value }: { value: number }) {
  const { num } = useSpring({ from: { num: 0 }, to: { num: value }, delay: 300, config: { duration: 1200 } })
  return <animated.span>{num.to(n => Math.floor(n).toLocaleString())}</animated.span>
}

export default function Dashboard() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  useEffect(() => { analyticsAPI.dashboard().then(r => setData(r.data)).catch(() => {}) }, [])

  const ov = data?.overview || {}
  const kpis = data?.kpis || []
  const recent = data?.recent_sources || []
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Data Sources',     value: ov.total_data_sources  || 0, icon: HardDrive,     color: '#4f8bff', change: '+2', up: true  },
    { label: 'AI Conversations', value: ov.total_chat_sessions || 0, icon: MessageCircle, color: '#22d3a5', change: '+5', up: true  },
    { label: 'Trained Models',   value: ov.total_ml_models     || 0, icon: TrendingUp,    color: '#a78bfa', change: '0',  up: true  },
    { label: 'Active Alerts',    value: ov.unread_alerts        || 0, icon: Activity,      color: '#f5a623', change: '',   up: false },
  ]

  const quickActions = [
    { label: 'Upload Data',    icon: HardDrive,     path: '/data',      color: '#4f8bff' },
    { label: 'Chat with AI',   icon: MessageCircle, path: '/assistant', color: '#22d3a5' },
    { label: 'Run Prediction', icon: TrendingUp,    path: '/predict',   color: '#a78bfa' },
    { label: 'View Analytics', icon: BarChart2,     path: '/analytics', color: '#f5a623' },
  ]

  return (
    <div className="page">
      {/* Header with 3D Brain */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 20 }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2 }}>
            {greeting}, <span style={{ background: 'linear-gradient(90deg,#4f8bff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.full_name?.split(' ')[0] || user?.username}</span> 👋
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            Here's what's happening across your platform today.
          </motion.p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }}
          style={{ width: 200, height: 200, flexShrink: 0 }}>
          <Suspense fallback={null}><AIBrain /></Suspense>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map(({ label, value, icon: Icon, color, change, up }, i) => (
          <motion.div key={label} className="stat glow-on-hover"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: 'spring', stiffness: 400 }}
                style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} />
              </motion.div>
            </div>
            <div className="stat-value"><AnimatedCounter value={value} /></div>
            {change && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: up ? 'var(--success)' : 'var(--text-muted)' }}>
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change} this week
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 28 }}>
        <motion.div className="card" style={{ padding: 22 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="section-head">
            <div><div className="section-title">Platform Activity</div><div className="section-desc">AI requests over 7 months</div></div>
            <div className="badge-green" style={{ fontSize: 11.5 }}>↑ 18.2% growth</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f8bff" stopOpacity={0.3} /><stop offset="100%" stopColor="#4f8bff" stopOpacity={0} />
                </linearGradient>
                <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <XAxis dataKey="m" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TIP} />
              <Area type="monotone" dataKey="v" stroke="#4f8bff" strokeWidth={2.5} fill="url(#aGrad)" dot={false}
                filter="url(#chartGlow)" isAnimationActive animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card" style={{ padding: 22, minWidth: 260 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="section-head"><div><div className="section-title">Weekly Usage</div><div className="section-desc">Requests per day</div></div></div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={18}>
              <XAxis dataKey="d" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TIP} />
              <Bar dataKey="v" fill="#4f8bff" radius={[5,5,0,0]} opacity={0.85} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Quick actions */}
        <motion.div className="card" style={{ padding: 22 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="section-title" style={{ marginBottom: 16 }}><Zap size={15} color="var(--accent)" /> Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickActions.map(({ label, icon: Icon, path, color }, i) => (
              <motion.button key={label} onClick={() => navigate(path)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer', textAlign: 'left' }}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.55 + i * 0.07 } }}
                whileHover={{ x: 4 } as any} whileTap={{ scale: 0.97 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                <ChevronRight size={13} color="var(--text-dim)" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div className="card" style={{ padding: 22 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="section-head">
            <div className="section-title"><Activity size={15} color="var(--accent)" /> Key Metrics</div>
            <button className="btn-ghost" onClick={() => navigate('/analytics')} style={{ fontSize: 12 }}>View all</button>
          </div>
          {kpis.length === 0 ? (
            <div className="empty" style={{ padding: '30px 10px' }}>
              <div className="empty-title">No metrics yet</div>
              <div className="empty-desc">Upload data to auto-extract KPIs</div>
              <button className="btn-primary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigate('/data')}><Plus size={13} /> Upload Data</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {kpis.slice(0, 5).map((k: any, i: number) => (
                <motion.div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.06 }}>
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
                        {k.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(k.change_percent).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent data */}
        <motion.div className="card" style={{ padding: 22 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="section-head">
            <div className="section-title"><Clock size={15} color="var(--accent)" /> Recent Data</div>
            <button className="btn-ghost" onClick={() => navigate('/data')} style={{ fontSize: 12 }}>View all</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding: '30px 10px' }}>
              <div className="empty-title">No data uploaded</div>
              <div className="empty-desc">Upload CSV, Excel, or PDF to get started</div>
              <button className="btn-primary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigate('/data')}><Plus size={13} /> Upload Now</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map((s: any, i: number) => (
                <motion.div key={s.id} onClick={() => navigate('/data')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.06 }}
                  whileHover={{ background: 'var(--glass-hover)' } as any}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(79,139,255,0.1)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {s.type?.slice(0, 3)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
