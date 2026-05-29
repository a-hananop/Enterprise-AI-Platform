import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Zap, Eye, EyeOff, TrendingUp, Brain, BarChart2, Shield, ArrowRight, Sparkles, Lock, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const StarField = lazy(() => import('../components/3d/StarField'))
const AIBrain   = lazy(() => import('../components/3d/AIBrain'))

const FEATURES = [
  { icon: TrendingUp, label: 'Sales Forecasting',  color: '#4f8bff', desc: 'Predict future revenue' },
  { icon: Brain,      label: 'AI Insights',        color: '#a78bfa', desc: 'Smart data analysis'   },
  { icon: BarChart2,  label: 'Business Analytics', color: '#22d3a5', desc: 'Real-time dashboards'  },
  { icon: Shield,     label: 'Risk Detection',     color: '#f5a623', desc: 'Proactive monitoring'  },
]

export default function LoginPage() {
  const { login } = useStore()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  
  // Track screen size for absolute responsiveness
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim()) { setError('Please enter your email or username'); return }
    if (!form.password)         { setError('Please enter your password'); return }
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally { setLoading(false) }
  }

  const renderForm = () => {
    return (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,92,122,0.08)', border: '1px solid rgba(255,92,122,0.22)', color: '#ff7a96', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span>⚠</span> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email field */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Email or Username
          </label>
          <div style={{ position: 'relative' }}>
            <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#4f8bff' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s', zIndex: 2 }} />
            <input
              className="input login-input"
              placeholder="admin@enterprise-ai.com"
              value={form.username}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setError('') }}
              autoComplete="username"
              autoFocus
            />
          </div>
        </motion.div>

        {/* Password field */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#4f8bff' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s', zIndex: 2 }} />
            <input
              className="input login-input-password"
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError('') }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: 0, transition: 'color 0.2s', zIndex: 2 }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </motion.div>

        {/* Sign In button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? 'none' : '0 8px 30px rgba(79,139,255,0.4)' }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: 12,
              border: 'none',
              background: loading ? 'rgba(79,139,255,0.5)' : 'linear-gradient(135deg, #4f8bff 0%, #7c3aed 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.3s',
              letterSpacing: '0.02em',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </>
            ) : (
              <>Sign In <ArrowRight size={15} /></>
            )}
          </motion.button>
        </motion.div>
      </form>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#06070f', position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* ── Custom input style overrides to bypass global !important styles ── */}
      <style>{`
        .login-input {
          padding-left: 40px !important;
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.08) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .login-input:focus {
          background: rgba(79,139,255,0.07) !important;
          border-color: rgba(79,139,255,0.55) !important;
          box-shadow: 0 0 0 3px rgba(79,139,255,0.15) !important;
        }
        .login-input-password {
          padding-left: 40px !important;
          padding-right: 44px !important;
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.08) !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .login-input-password:focus {
          background: rgba(79,139,255,0.07) !important;
          border-color: rgba(79,139,255,0.55) !important;
          box-shadow: 0 0 0 3px rgba(79,139,255,0.15) !important;
        }
      `}</style>

      {/* ── Starfield background ── */}
      <Suspense fallback={null}><StarField /></Suspense>

      {/* ── Ambient gradient blobs ── */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,139,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '35%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {isMobile ? (
        // ── MOBILE / TABLET CENTERED CARD LAYOUT ──
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', zIndex: 1, position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: 520 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
              <motion.div
                style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(79,139,255,0.35)' }}
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap size={18} color="#fff" />
              </motion.div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Nexus AI</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Intelligence Platform</div>
              </div>
            </div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card"
              style={{
                padding: '36px 32px',
                background: 'rgba(8,9,18,0.85)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                position: 'relative',
              }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 2, background: 'linear-gradient(90deg, transparent, #4f8bff, #a78bfa, transparent)', borderRadius: 2 }} />

              <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>Welcome back</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  Sign in to your account to continue.{' '}
                  <Link to="/signup" style={{ color: '#4f8bff', textDecoration: 'none', fontWeight: 600 }}>
                    Create account <ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </Link>
                </p>
              </div>

              {renderForm()}
            </motion.div>
          </div>
        </div>
      ) : (
        // ── DESKTOP SPLIT COLUMN LAYOUT ──
        <>
          {/* LEFT PANEL — Branding + 3D Brain */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '48px 56px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(6,7,15,0.5)',
              backdropFilter: 'blur(12px)',
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden',
              alignSelf: 'stretch',
            }}
          >
            {/* 3D Brain — right half of left panel, no overlap with text */}
            <div style={{
              position: 'absolute',
              top: '50%', right: '-5%',
              transform: 'translateY(-50%)',
              width: '55%', height: '75%',
              zIndex: 0,
              opacity: 0.75,
              pointerEvents: 'none',
            }}>
              <Suspense fallback={null}><AIBrain /></Suspense>
            </div>

            {/* ── Main Content Container ── */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
              {/* Logo */}
              <motion.div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderRadius: 12, background: 'rgba(79,139,255,0.08)', border: '1px solid rgba(79,139,255,0.18)', marginBottom: 40 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(79,139,255,0.4)' }}
                  animate={{ rotate: [0, 6, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Zap size={18} color="#fff" />
                </motion.div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Nexus AI</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Decision Intelligence Platform</div>
                </div>
              </motion.div>

              {/* Headline + Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', marginBottom: 20 }}
              >
                <Sparkles size={12} color="#a78bfa" />
                <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 500 }}>AI-Powered Enterprise Platform</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.12, color: '#fff', marginBottom: 16 }}
              >
                Smarter decisions,<br />
                <span style={{ background: 'linear-gradient(135deg, #4f8bff 0%, #a78bfa 50%, #22d3a5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  powered by AI.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 36 }}
              >
                Upload your data, chat with documents, predict<br />outcomes, and automate workflows — all in one place.
              </motion.p>

              {/* Feature pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {FEATURES.map(({ icon: Icon, label, color, desc }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}
                    whileHover={{ scale: 1.04, borderColor: `${color}55` }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(8,9,18,0.7)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      cursor: 'default',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>

          {/* RIGHT PANEL — Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: 480,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '48px 52px',
              background: 'rgba(8,9,18,0.85)',
              backdropFilter: 'blur(24px)',
              position: 'relative',
              zIndex: 1,
              alignSelf: 'stretch',
            }}
          >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 52, right: 52, height: 2, background: 'linear-gradient(90deg, transparent, #4f8bff, #a78bfa, transparent)', borderRadius: 2 }} />

            {/* ── Header ── */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ marginBottom: 40 }}
            >
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Sign in to your account to continue.{' '}
                <Link to="/signup" style={{ color: '#4f8bff', textDecoration: 'none', fontWeight: 600 }}>
                  Create account <ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </Link>
              </p>
            </motion.div>

            {renderForm()}

            {/* Bottom accent line */}
            <div style={{ position: 'absolute', bottom: 0, left: 52, right: 52, height: 1, background: 'linear-gradient(90deg, transparent, rgba(79,139,255,0.3), transparent)' }} />
          </motion.div>
        </>
      )}
    </div>
  )
}
