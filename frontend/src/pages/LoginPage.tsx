import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, TrendingUp, Brain, BarChart2, Shield, ArrowRight } from 'lucide-react'

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
    if (!form.password)        { setError('Please enter your password'); return }

    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate('/')
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string, password: string) => {
    setForm({ username: email, password })
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79,139,255,0.1) 0%, transparent 60%)',
    }}>
      {/* ── Left branding panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 64px',
        borderRight: '1px solid var(--glass-border)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg, #4f8bff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(79,139,255,0.4)',
          }}>
            <Zap size={20} color="#fff" />
          </div>
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
          {FEATURES.map(({ icon: Icon, label, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Sign in to your account to continue.{' '}
            <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Create account <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Error message */}
          {error && (
            <div style={{
              padding: '11px 14px', borderRadius: 9,
              background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.25)',
              color: '#ff7a96', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
              {error}
            </div>
          )}

          <div>
            <label className="label">Email or Username</label>
            <input
              className="input"
              placeholder="admin@enterprise-ai.com"
              value={form.username}
              onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setError('') }}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                style={{ paddingRight: 44 }}
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError('') }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '11px 16px', fontSize: 14, marginTop: 4 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Demo Accounts — click to auto-fill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(({ role, email, password, desc }) => {
              const roleColors: Record<string, string> = { Admin: '#ff5c7a', Manager: '#f5a623', Analyst: '#4f8bff', Viewer: '#22d3a5' }
              const c = roleColors[role] || '#4f8bff'
              return (
                <button
                  key={email}
                  type="button"
                  onClick={() => fillDemo(email, password)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 9,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.borderColor = `${c}44` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)' }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}30`, padding: '2px 8px', borderRadius: 5, flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                    {role}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>click to fill →</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
