import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import {
  LayoutDashboard, HardDrive, MessageCircle, TrendingUp,
  AlignLeft, Cpu, BarChart2, FileSearch, Megaphone,
  ShieldAlert, FileText, Settings, Bell, Menu, LogOut,
  ChevronRight, Zap, Activity, X
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useState, useRef } from 'react'
import { analyticsAPI } from '../../services/api'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

const NAV = [
  {
    group: 'Overview',
    items: [
      { path: '/',          label: 'Dashboard',        icon: LayoutDashboard },
      { path: '/data',      label: 'Data Hub',         icon: HardDrive       },
    ]
  },
  {
    group: 'AI Features',
    items: [
      { path: '/assistant', label: 'AI Assistant',     icon: MessageCircle   },
      { path: '/predict',   label: 'Predictions',      icon: TrendingUp      },
      { path: '/text',      label: 'Text Analysis',    icon: AlignLeft       },
      { path: '/automate',  label: 'Automation',       icon: Cpu             },
    ]
  },
  {
    group: 'Insights',
    items: [
      { path: '/analytics', label: 'Analytics',        icon: BarChart2       },
      { path: '/documents', label: 'Documents',        icon: FileSearch      },
      { path: '/marketing', label: 'Marketing AI',     icon: Megaphone       },
      { path: '/risk',      label: 'Risk Detection',   icon: ShieldAlert     },
      { path: '/reports',   label: 'Reports',          icon: FileText        },
    ]
  },
  {
    group: 'Account',
    items: [
      { path: '/settings',  label: 'Settings',         icon: Settings        },
    ]
  },
]

export default function AppLayout() {
  const { user, logout, sidebarOpen, toggleSidebar, setSidebarOpen, unreadAlerts, setUnreadAlerts } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [width, setWidth] = useState(window.innerWidth)
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Model Training Complete', desc: 'Customer Churn Predictor v2 finished training with 94% accuracy.', time: 'Just now', type: 'success' },
    { id: 2, title: 'New Data Source', desc: 'Sales_Q3_2023.csv was successfully processed and indexed.', time: '1h ago', type: 'info' },
    { id: 3, title: 'System Alert', desc: 'High latency detected in the prediction API. Auto-scaling initiated.', time: '3h ago', type: 'warning' },
  ])

  // Sync global unread count with local state
  useEffect(() => {
    setUnreadAlerts(notifications.length)
  }, [notifications, setUnreadAlerts])

  // Real-time incoming notification simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['info', 'success', 'warning']
      const type = types[Math.floor(Math.random() * types.length)]
      const title = type === 'warning' ? 'Anomaly Detected' : (type === 'success' ? 'Task Completed' : 'Data Sync')
      const desc = type === 'warning' ? 'Unusual access patterns flagged.' : (type === 'success' ? 'Weekly pipeline finished successfully.' : 'CRM database synced in background.')
      
      const newNotif = { id: Date.now(), title, desc, time: 'Just now', type }
      
      setNotifications(prev => [newNotif, ...prev].slice(0, 8))
    }, 35000) // simulated every 35s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < 1024
  const isCompactMobile = width < 480

  useEffect(() => {
    analyticsAPI.dashboard().catch(() => {})
  }, [])

  // Auto-close the drawer on mobile when the route changes.
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [isMobile, location.pathname, setSidebarOpen])

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', position: 'relative' }}>


      {/* ── Mobile Backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 16, 0.75)',
            zIndex: 140,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: isMobile ? 264 : (sidebarOpen ? 220 : 60),
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : -264) : 0,
        top: 0,
        bottom: 0,
        zIndex: 150,
        boxShadow: isMobile && sidebarOpen ? '5px 0 25px rgba(0,0,0,0.5)' : 'none',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--glass-border)',
        background: isMobile ? 'rgba(12,14,26,1)' : 'rgba(12,14,26,0.98)',
        backdropFilter: isMobile ? 'none' : 'blur(20px)',
        transition: 'width 0.25s ease, left 0.25s ease',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          padding: '0 14px', borderBottom: '1px solid var(--glass-border)',
          gap: 10, flexShrink: 0,
        }}>
          <motion.div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f8bff, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 14px rgba(79,139,255,0.4)',
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Zap size={15} color="#fff" />
          </motion.div>
          {(sidebarOpen || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{ minWidth: 0 }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Nexus AI
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Intelligence Platform
              </div>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <LayoutGroup>
          <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            {NAV.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: 4 }}>
                {(sidebarOpen || isMobile) && (
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--text-dim)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '14px 8px 6px',
                  }}>
                    {group}
                  </div>
                )}
                {!(sidebarOpen || isMobile) && group !== 'Overview' && (
                  <div style={{ borderTop: '1px solid var(--glass-border)', margin: '8px 4px' }} />
                )}
                {items.map(({ path, label, icon: Icon }) => {
                  const active = location.pathname === path
                  const showText = sidebarOpen || isMobile
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      title={!showText ? label : undefined}
                      className={clsx('nav-item', active && 'active')}
                      style={{ width: '100%', justifyContent: showText ? 'flex-start' : 'center', position: 'relative' }}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-nav-pill"
                          style={{
                            position: 'absolute', left: 0, top: 3, bottom: 3,
                            width: 3, borderRadius: '0 3px 3px 0',
                            background: 'var(--accent)',
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon size={16} className="nav-icon" />
                      {showText && (
                        <>
                          <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                          {active && <ChevronRight size={13} style={{ opacity: 0.4 }} />}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
        </LayoutGroup>

        {/* User */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 10,
            cursor: 'pointer', transition: 'background 0.15s',
            justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f8bff44, #7c3aed44)',
              border: '1px solid rgba(79,139,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--accent)',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            {(sidebarOpen || isMobile) && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.full_name || user?.username}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user?.role}
                  </div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  title="Sign out"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 24px',
          borderBottom: '1px solid var(--glass-border)',
          background: isMobile ? 'rgba(12,14,26,1)' : 'rgba(12,14,26,0.7)',
          backdropFilter: isMobile ? 'none' : 'blur(20px)',
          position: 'relative',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            <button className="btn-ghost" onClick={toggleSidebar} style={{ padding: '7px 9px' }}>
              <Menu size={16} />
            </button>
            
            {isMobile && !sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #4f8bff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={12} color="#fff" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Nexus AI</div>
              </motion.div>
            )}

            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All systems operational</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="btn-ghost"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ padding: '7px 10px', position: 'relative', flexShrink: 0, background: showNotifications ? 'var(--glass-hover)' : 'transparent' }}
              >
                <Bell size={16} />
                <AnimatePresence>
                  {unreadAlerts > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--danger)', color: '#fff',
                        fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {unreadAlerts}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 44, right: isMobile ? -50 : 0,
                      width: isMobile ? 300 : 340, 
                      background: isMobile ? 'rgba(16, 18, 32, 1)' : 'rgba(16, 18, 32, 0.98)',
                      backdropFilter: isMobile ? 'none' : 'blur(20px)',
                      border: '1px solid var(--glass-border)', borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 200,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</div>
                      {notifications.length > 0 && (
                        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--accent)' }} onClick={() => setNotifications([])}>Clear all</button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto', overflowX: 'hidden' }}>
                      <AnimatePresence initial={false}>
                        {notifications.length === 0 ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            <Bell size={24} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                            All caught up!
                          </motion.div>
                        ) : notifications.map((n, i) => (
                          <motion.div 
                               layout 
                               key={n.id} 
                               initial={{ opacity: 0, x: 30 }} 
                               animate={{ opacity: 1, x: 0 }} 
                               exit={{ opacity: 0, scale: 0.95, height: 0, padding: 0 }} 
                               transition={{ duration: 0.2 }}
                               style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 14, background: i === 0 ? 'rgba(79,139,255,0.04)' : 'transparent', transition: 'background 0.2s', position: 'relative' }} 
                               onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                               onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(79,139,255,0.04)' : 'transparent'}>
                             <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.type === 'success' ? '#22d3a5' : n.type === 'warning' ? '#f5a623' : '#4f8bff', marginTop: 5, flexShrink: 0, boxShadow: `0 0 10px ${n.type === 'success' ? '#22d3a5' : n.type === 'warning' ? '#f5a623' : '#4f8bff'}` }} />
                             <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                               <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{n.title}</div>
                               <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>{n.desc}</div>
                               <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{n.time}</div>
                             </div>
                             <button 
                               className="btn-ghost" 
                               style={{ position: 'absolute', top: 12, right: 12, padding: 4, color: 'var(--text-dim)', opacity: 0.4, transition: 'all 0.15s' }}
                               onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
                               onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                               onClick={(e) => {
                                 e.stopPropagation()
                                 setNotifications(prev => prev.filter(x => x.id !== n.id))
                               }}
                             >
                               <X size={14} />
                             </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setShowNotifications(false); navigate('/analytics') }}>View all alerts</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCompactMobile ? '6px 8px' : '6px 12px', borderRadius: 9,
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              minWidth: 0,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'linear-gradient(135deg, #4f8bff33, #7c3aed33)',
                border: '1px solid rgba(79,139,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              {!isMobile && (
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {user?.username}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page — No Framer Motion wrapper to ensure WebGL canvas renders perfectly without GPU layer conflicts */}
        <main
          key={location.pathname}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            backgroundColor: 'var(--bg-base)'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
