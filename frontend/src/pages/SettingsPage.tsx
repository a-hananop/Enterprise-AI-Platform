import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { authAPI, systemAPI } from '../services/api'
import toast from 'react-hot-toast'
import { User, Shield, Info, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

export default function SettingsPage() {
  const { user, loadUser } = useStore()
  const [tab, setTab] = useState<'profile' | 'security' | 'system'>('profile')
  const [profile, setProfile] = useState({ full_name: '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [sysInfo, setSysInfo] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 768

  useEffect(() => {
    setProfile({ full_name: user?.full_name || '' })
    systemAPI.info().then(r => setSysInfo(r.data)).catch(() => {})
  }, [user])

  const saveProfile = async () => {
    setSaving(true)
    try { await authAPI.updateProfile(profile); await loadUser(); toast.success('Profile updated') }
    catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const changePw = async () => {
    if (pw.next !== pw.confirm) return toast.error('Passwords do not match')
    if (pw.next.length < 6) return toast.error('Minimum 6 characters')
    setSaving(true)
    try { await authAPI.changePassword({ current_password: pw.current, new_password: pw.next }); setPw({ current:'', next:'', confirm:'' }); toast.success('Password updated') }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const TABS = [
    { id: 'profile',  label: 'Profile',      icon: User   },
    { id: 'security', label: 'Security',     icon: Shield },
    { id: 'system',   label: 'System',       icon: Info   },
  ]

  return (
    <div className="page fade-in" style={{ maxWidth: 680, padding: isMobile ? '16px' : undefined }}>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Manage your account and platform configuration</div>
      </div>

      <div className="tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={clsx('tab', tab === id && 'active')} onClick={() => setTab(id as any)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Profile ── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="stagger">
          {/* Avatar */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(79,139,255,0.3), rgba(124,58,237,0.3))', border: '1px solid rgba(79,139,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="badge-blue" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                {user?.is_active && <span className="badge-green" style={{ display:'flex', alignItems:'center', gap:4 }}><CheckCircle size={10} /> Active</span>}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>Edit Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div><label className="label">Full Name</label><input className="input" value={profile.full_name} onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label className="label">Username</label><input className="input" value={user?.username || ''} disabled /></div>
              <div><label className="label">Email</label><input className="input" value={user?.email || ''} disabled /></div>
              <div><label className="label">Role</label><input className="input" value={user?.role || ''} disabled style={{ textTransform: 'capitalize' }} /></div>
            </div>
            <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
              {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Security ── */}
      {tab === 'security' && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>Change Password</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
            {[
              { label: 'Current Password', key: 'current', val: pw.current },
              { label: 'New Password',     key: 'next',    val: pw.next    },
              { label: 'Confirm Password', key: 'confirm', val: pw.confirm },
            ].map(({ label, key, val }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type="password" className="input" value={val}
                  onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <button className="btn-primary" onClick={changePw} disabled={saving} style={{ alignSelf: isMobile ? 'stretch' : 'flex-start', justifyContent: 'center' }}>
              {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : 'Update Password'}
            </button>
          </div>
        </div>
      )}

      {/* ── System ── */}
      {tab === 'system' && sysInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="stagger">
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Platform Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Version',  value: sysInfo.version  },
                { label: 'Database', value: 'SQLite (local)' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>AI Capabilities</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {Object.entries(sysInfo.capabilities || {}).map(([key, enabled]: any) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                  {enabled ? <CheckCircle size={15} color="var(--success)" /> : <XCircle size={15} color="var(--text-dim)" />}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 22, borderColor: 'rgba(79,139,255,0.2)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Configure AI API Key</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Add a free Groq API key to enable AI chat, report generation, and automation agents.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                {sysInfo.capabilities?.generative_ai ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--danger)" />}
                Groq LLM — {sysInfo.capabilities?.generative_ai ? 'Connected' : 'Not configured'}
              </div>
              {!sysInfo.capabilities?.generative_ai && (
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', marginTop: 4 }}>
                  Get a free API key at console.groq.com <ExternalLink size={12} />
                </a>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                Set GROQ_API_KEY in <code style={{ fontSize: 11.5, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>backend/.env</code> then restart the server.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
