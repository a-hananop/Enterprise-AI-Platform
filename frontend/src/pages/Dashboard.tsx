import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { useStore } from '../store'
import { HardDrive, MessageCircle, TrendingUp, BarChart2, ArrowUpRight, ArrowDownRight, Zap, Plus, Activity, Clock, ChevronRight, Bell } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useSpring, animated } from '@react-spring/web'
import { motion } from 'framer-motion'
import AIBrainMobile from '../components/3d/AIBrainMobile'

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
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024

  useEffect(() => { analyticsAPI.dashboard().then(r => setData(r.data)).catch(() => {}) }, [])

  const ov = data?.overview || {}
  const kpis = data?.kpis || []
  const recent = data?.recent_sources || []
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Data Sources',     value: ov.total_data_sources  || 0, icon: HardDrive,     color: '#4f8bff', bg: 'rgba(79,139,255,0.12)',  change: '+2', up: true  },
    { label: 'AI Chats',         value: ov.total_chat_sessions || 0, icon: MessageCircle, color: '#22d3a5', bg: 'rgba(34,211,165,0.12)',  change: '+5', up: true  },
    { label: 'ML Models',        value: ov.total_ml_models     || 0, icon: TrendingUp,    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', change: '0',  up: true  },
    { label: 'Alerts',           value: ov.unread_alerts        || 0, icon: Bell,          color: '#f5a623', bg: 'rgba(245,166,35,0.12)',  change: '',   up: false },
  ]

  const quickActions = [
    { label: 'Upload Data',    icon: HardDrive,     path: '/data',      color: '#4f8bff', bg: 'rgba(79,139,255,0.15)'  },
    { label: 'Chat with AI',   icon: MessageCircle, path: '/assistant', color: '#22d3a5', bg: 'rgba(34,211,165,0.15)'  },
    { label: 'Run Prediction', icon: TrendingUp,    path: '/predict',   color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    { label: 'Analytics',      icon: BarChart2,     path: '/analytics', color: '#f5a623', bg: 'rgba(245,166,35,0.15)'  },
  ]

  /* ─── MOBILE LAYOUT ─── */
  if (isMobile) {
    return (
      <div style={{ padding: '0 0 100px 0', overflowX: 'hidden', minHeight: '100vh', background: 'var(--bg-base)' }}>

        {/* ── Hero Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,139,255,0.18) 0%, rgba(167,139,250,0.18) 100%)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '24px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          // Completely removed all translateZ/willChange to prevent Mali GPU texture corruption
        }}>
          {/* Background blobs completely removed on mobile to prevent GPU overdraw crash */}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 4 }}>
                {greeting},<br />
                {/* Fallback to solid color for mobile to prevent WebkitBackgroundClip text texture bleeding */}
                <span style={{ color: '#4f8bff' }}>
                  {user?.full_name?.split(' ')[0] || user?.username}
                </span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Here's your platform overview.
              </p>
            </div>
            {/* 
              Canvas 2D fallback: absolutely safe on all GPUs.
              CSS 3D (preserve-3d) and WebGL both trigger compositor crashes on this device.
            */}
            <AIBrainMobile />
          </div>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Stat Cards 2x2 Grid — opacity-only fades, NO y/scale transforms ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {stats.map(({ label, value, icon: Icon, color, bg, change, up }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    padding: '16px 14px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '16px 16px 0 0' }} />
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                    <AnimatedCounter value={value} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginBottom: change ? 6 : 0 }}>{label}</div>
                  {change && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: up ? '#22d3a5' : 'var(--text-muted)' }}>
                      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      <span>{change} this week</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Quick Actions — opacity-only ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} color="var(--accent)" /> Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {quickActions.map(({ label, icon: Icon, path, color, bg }, i) => (
                <motion.button key={label}
                  onClick={() => navigate(path)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 14, padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} color={color} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Platform Activity Chart — opacity-only, chart animation disabled on mobile ── */}
          <motion.div className="card" style={{ padding: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Platform Activity</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>AI requests over 7 months</div>
              </div>
              <span style={{ fontSize: 11, background: 'rgba(34,211,165,0.12)', color: '#22d3a5', border: '1px solid rgba(34,211,165,0.2)', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>↑ 18.2%</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="aGradM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f8bff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f8bff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Area type="monotone" dataKey="v" stroke="#4f8bff" strokeWidth={2.5} fill="url(#aGradM)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ── Weekly Usage Bar Chart — opacity-only ── */}
          <motion.div className="card" style={{ padding: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42, duration: 0.4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Weekly Usage</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Requests per day</div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={barData} barSize={16}>
                <XAxis dataKey="d" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Bar dataKey="v" fill="#a78bfa" radius={[5, 5, 0, 0]} opacity={0.85} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ── Key Metrics — opacity-only ── */}
          <motion.div className="card" style={{ padding: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48, duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="var(--accent)" /> Key Metrics
              </div>
              <button className="btn-ghost" onClick={() => navigate('/analytics')} style={{ fontSize: 11.5 }}>View all</button>
            </div>
            {kpis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(79,139,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Activity size={20} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No metrics yet</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Upload data to auto-extract KPIs</div>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => navigate('/data')}>
                  <Plus size={13} /> Upload Data
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {kpis.slice(0, 5).map((k: any, i: number) => (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--glass-border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{k.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 1 }}>{k.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {k.unit === '$' ? '$' : ''}{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                      </div>
                      {k.change_percent != null && (
                        <div style={{ fontSize: 11, color: k.trend === 'up' ? '#22d3a5' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          {k.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(k.change_percent).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Recent Data — opacity-only ── */}
          <motion.div className="card" style={{ padding: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.54, duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--accent)" /> Recent Data
              </div>
              <button className="btn-ghost" onClick={() => navigate('/data')} style={{ fontSize: 11.5 }}>View all</button>
            </div>
            {recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(79,139,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <HardDrive size={20} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No data uploaded</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Upload CSV, Excel or PDF to get started</div>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => navigate('/data')}>
                  <Plus size={13} /> Upload Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recent.map((s: any) => (
                  <div key={s.id} onClick={() => navigate('/data')}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,139,255,0.1)', border: '1px solid rgba(79,139,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', flexShrink: 0 }}>
                      {s.type?.slice(0, 3)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <ChevronRight size={14} color="var(--text-dim)" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    )
  }

  /* ─── DESKTOP LAYOUT (unchanged) ─── */
  return (
    <div className="page" style={{ padding: '24px', overflowX: 'hidden' }}>
      {/* Header with 3D Brain */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 20 }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2 }}>
            {greeting}, <span style={{ background: 'linear-gradient(90deg,#4f8bff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.full_name?.split(' ')[0] || user?.username}</span>
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
        {stats.map(({ label, value, icon: Icon, color, bg, change, up }, i) => (
          <motion.div key={label} className="stat glow-on-hover"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: 'spring', stiffness: 400 }}
                style={{ width: 32, height: 32, borderRadius: 9, background: bg, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} />
              </motion.div>
            </div>
            <div className="stat-value" style={{ fontSize: 28 }}><AnimatedCounter value={value} /></div>
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
            <div className="badge-green" style={{ fontSize: 11.5 }}>Up 18.2% growth</div>
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
              <Bar dataKey="v" fill="#4f8bff" radius={[5, 5, 0, 0]} opacity={0.85} isAnimationActive animationDuration={900} />
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
            {quickActions.map(({ label, icon: Icon, path, color, bg }, i) => (
              <motion.button key={label} onClick={() => navigate(path)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer', textAlign: 'left' }}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.55 + i * 0.07 } }}
                whileHover={{ x: 4 } as any} whileTap={{ scale: 0.97 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
