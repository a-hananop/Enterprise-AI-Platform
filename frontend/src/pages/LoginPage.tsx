import { useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, TrendingUp, Brain, BarChart2, Shield, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const StarField = lazy(() => import('../components/3d/StarField'))

const DEMO_ACCOUNTS = [
  { role: 'Admin',   email: 'admin@enterprise-ai.com',   password: 'admin123',   desc: 'Full access — manage users, all features'  },
  { role: 'Manager', email: 'manager@enterprise-ai.com', password: 'manager123', desc: 'Read, write, delete — no user management'   },
  { role: 'Analyst', email: 'analyst@enterprise-ai.com', password: 'analyst123', desc: 'Read and write — standard analyst access'   },
  { role: 'Viewer',  email: 'viewer@enterprise-ai.com',  password: 'viewer123',  desc: 'Read-only — view dashboards and reports'    },
]

const FEATURES = [
  { icon: TrendingUp, label: 'Sales Forecasting',  color: '#4f8bff' },
  { icon: Brain,      label: 'AI Insights',        color: '#a78bfa' },
  { icon: BarChart2,  label: 'Business Analytics', color: '#22d3a5' },
  { icon: Shield,     label: 'Risk Detection',     color: '#f5a623' },
]

export default function LoginPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim()) { setError('Please enter your email or username'); return }
    if (!form.password) { setError('Please enter your password'); return }
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally { setLoading(false) }
  }

  const fillDemo = (email: string, password: string) => { setForm({ username: email, password }); setError('') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Star Field background */}
      <Suspense fallback={null}><StarField /></Suspense>

      {/* Left branding panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 64px', borderRight: '1px solid var(--glass-border)',
          background: 'rgba(6,7,15,0.7)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <motion.div
            style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(79,139,255,0.4)' }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Enterprise AI</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Decision Intelligence Platform</div>
          </div>
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 18 }}>
          Smarter decisions,<br />
          <span style={{ background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            powered by AI.
          </span>
        </h1>

        <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 380, marginBottom: 52 }}>
          Upload your data, chat with documents, predict outcomes, and automate workflows — all in one place.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 500 }}>
          {FEATURES.map(({ icon: Icon, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${color}22` }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right form panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: 460, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 48px', overflowY: 'auto', background: 'rgba(8,9,18,0.8)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 1 }}
      >
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Sign in to continue.{' '}
            <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Create account <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '11px 14px', borderRadius: 9, background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.25)', color: '#ff7a96', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}
            >
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>{error}
            </motion.div>
          )}

          <div>
            <label className="label">Email or Username</label>
            <input className="input" placeholder="admin@enterprise-ai.com" value={form.username}
              onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setError('') }} autoComplete="username" autoFocus />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                style={{ paddingRight: 44 }} value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError('') }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <motion.button type="submit" className="btn-primary" disabled={loading}
            style={{ justifyContent: 'center', padding: '11px 16px', fontSize: 14, marginTop: 4 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </motion.button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Demo Accounts — click to auto-fill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(({ role, email, password, desc }, i) => {
              const roleColors: Record<string, string> = { Admin: '#ff5c7a', Manager: '#f5a623', Analyst: '#4f8bff', Viewer: '#22d3a5' }
              const c = roleColors[role] || '#4f8bff'
              return (
                <motion.button key={email} type="button" onClick={() => fillDemo(email, password)}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  whileHover={{ borderColor: `${c}44`, background: 'var(--glass-hover)' } as any} whileTap={{ scale: 0.98 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}30`, padding: '2px 8px', borderRadius: 5, flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                    {role}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>click →</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
