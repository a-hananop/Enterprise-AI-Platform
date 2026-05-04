import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, ArrowLeft, User, Mail, Lock, CheckCircle } from 'lucide-react'

const ROLES = [
  { value: 'analyst', label: 'Analyst',  desc: 'Can upload data, run models, and view all results',  color: '#4f8bff' },
  { value: 'viewer',  label: 'Viewer',   desc: 'Read-only access to dashboards and reports',          color: '#22d3a5' },
]

export default function SignupPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirm_password: '',
    role: 'analyst',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email.trim())             e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.username.trim())          e.username = 'Username is required'
    else if (form.username.length < 3)  e.username = 'Username must be at least 3 characters'
    if (!form.password)                 e.password = 'Password is required'
    else if (form.password.length < 6)  e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    return e
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await authAPI.register({
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
        full_name: form.full_name.trim() || form.username.trim(),
        password: form.password,
        role: form.role,
      })
      // Auto-login after registration
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))

      // Trigger store update
      await login(form.email.trim(), form.password)
      toast.success(`Welcome, ${user.full_name || user.username}! 🎉`)
      navigate('/')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        toast.error(detail)
        if (detail.toLowerCase().includes('email'))    setErrors({ email: detail })
        else if (detail.toLowerCase().includes('user')) setErrors({ username: detail })
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    type = 'text',
    icon?: React.ReactNode
  ) => (
    <div>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input
          className="input"
          type={key === 'password' || key === 'confirm_password' ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={form[key]}
          style={{ paddingLeft: icon ? 38 : 13, borderColor: errors[key] ? 'rgba(255,92,122,0.5)' : undefined }}
          onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(prev => { const n = {...prev}; delete n[key]; return n }) }}
          autoComplete={key === 'password' ? 'new-password' : key === 'email' ? 'email' : 'off'}
        />
        {(key === 'password' || key === 'confirm_password') && (
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {errors[key] && (
        <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 5 }}>⚠ {errors[key]}</p>
      )}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(79,139,255,0.08) 0%, transparent 60%)',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(79,139,255,0.35)' }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Enterprise AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Decision Intelligence Platform</div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 36 }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Create your account</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {field('full_name', 'Full Name', 'Jane Smith', 'text', <User size={14} />)}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {field('email',    'Email',    'jane@company.com', 'email',  <Mail size={14} />)}
              {field('username', 'Username', 'jsmith')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {field('password',         'Password',         'Min 6 characters', 'password', <Lock size={14} />)}
              {field('confirm_password', 'Confirm Password', 'Repeat password',  'password')}
            </div>

            {/* Role selector */}
            <div>
              <label className="label">Access Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ROLES.map(({ value, label, desc, color }) => (
                  <div
                    key={value}
                    onClick={() => setForm(f => ({ ...f, role: value }))}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: form.role === value ? `${color}12` : 'var(--glass-bg)',
                      border: `1px solid ${form.role === value ? `${color}40` : 'var(--glass-border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      {form.role === value && <CheckCircle size={13} color={color} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: form.role === value ? color : 'var(--text-primary)' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{desc}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
                Admin and Manager accounts are created by your administrator.
              </p>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 6 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={13} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
