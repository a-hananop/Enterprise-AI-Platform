import { useState } from 'react'
import { analyticsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { TrendingUp, FileText, Users, Send, Loader2, Zap, Target, Mail } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import api from '../services/api'

export default function MarketingAI() {
  const [activeTab, setActiveTab] = useState<'content' | 'ad' | 'email' | 'trends'>('content')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [contentForm, setContentForm] = useState({
    content_type: 'email', topic: '', tone: 'professional',
    target_audience: '', brand_name: '', word_count: 200,
    key_points: '',
  })

  const [adForm, setAdForm] = useState({
    product_name: '', product_description: '', target_audience: '',
    platform: 'google', campaign_goal: 'conversions',
  })

  const [emailForm, setEmailForm] = useState({
    campaign_name: '', goal: '', target_segment: '', product_service: '',
  })

  const [trendsForm, setTrendsForm] = useState({
    industry: '', current_challenges: '', target_audience: '',
  })

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      let res
      if (activeTab === 'content') {
        const payload = { ...contentForm, key_points: contentForm.key_points.split('\n').filter(Boolean) }
        res = await api.post('/marketing/generate-content', payload)
        setResult({ type: 'content', data: res.data })
      } else if (activeTab === 'ad') {
        res = await api.post('/marketing/ad-copy', adForm)
        setResult({ type: 'ad', data: res.data })
      } else if (activeTab === 'email') {
        res = await api.post('/marketing/email-campaign', null, { params: emailForm })
        setResult({ type: 'email', data: res.data })
      } else if (activeTab === 'trends') {
        res = await api.post('/marketing/trend-suggestions', null, { params: trendsForm })
        setResult({ type: 'trends', data: res.data })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Generation failed')
    } finally { setLoading(false) }
  }

  const tabs = [
    { id: 'content', label: 'Content Generator', icon: FileText },
    { id: 'ad', label: 'Ad Copy', icon: Target },
    { id: 'email', label: 'Email Campaign', icon: Mail },
    { id: 'trends', label: 'Trend Suggestions', icon: TrendingUp },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--accent)]" /> Marketing Intelligence
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">AI-powered content, ad copy, campaign emails & trend analysis</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id as any); setResult(null) }}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms */}
        <div className="card p-5 space-y-4">
          {activeTab === 'content' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generate Marketing Content</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Content Type</label>
                  <select className="input" value={contentForm.content_type}
                    onChange={e => setContentForm(f => ({ ...f, content_type: e.target.value }))}>
                    {['email','social','ad','blog','landing_page'].map(t => (
                      <option key={t} value={t} className="capitalize">{t.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Tone</label>
                  <select className="input" value={contentForm.tone}
                    onChange={e => setContentForm(f => ({ ...f, tone: e.target.value }))}>
                    {['professional','friendly','urgent','persuasive','casual'].map(t => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Topic *</label>
                <input className="input" placeholder="e.g. New product launch, Summer sale..."
                  value={contentForm.topic} onChange={e => setContentForm(f => ({ ...f, topic: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Brand Name</label>
                  <input className="input" placeholder="Your Company"
                    value={contentForm.brand_name} onChange={e => setContentForm(f => ({ ...f, brand_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Target Audience</label>
                  <input className="input" placeholder="e.g. SMB owners"
                    value={contentForm.target_audience} onChange={e => setContentForm(f => ({ ...f, target_audience: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Key Points (one per line)</label>
                <textarea className="input resize-none" rows={3} placeholder="Point 1&#10;Point 2&#10;Point 3"
                  value={contentForm.key_points} onChange={e => setContentForm(f => ({ ...f, key_points: e.target.value }))} />
              </div>
            </>
          )}

          {activeTab === 'ad' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generate Ad Copy</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Platform</label>
                  <select className="input" value={adForm.platform}
                    onChange={e => setAdForm(f => ({ ...f, platform: e.target.value }))}>
                    {['google','facebook','instagram','linkedin'].map(p => (
                      <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Campaign Goal</label>
                  <select className="input" value={adForm.campaign_goal}
                    onChange={e => setAdForm(f => ({ ...f, campaign_goal: e.target.value }))}>
                    {['awareness','clicks','conversions','engagement'].map(g => (
                      <option key={g} value={g} className="capitalize">{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Product/Service Name *</label>
                <input className="input" value={adForm.product_name}
                  onChange={e => setAdForm(f => ({ ...f, product_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Description</label>
                <textarea className="input resize-none" rows={3} value={adForm.product_description}
                  onChange={e => setAdForm(f => ({ ...f, product_description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Target Audience</label>
                <input className="input" value={adForm.target_audience}
                  onChange={e => setAdForm(f => ({ ...f, target_audience: e.target.value }))} />
              </div>
            </>
          )}

          {activeTab === 'email' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Email Campaign Sequence</h3>
              {[
                { field: 'campaign_name', label: 'Campaign Name', placeholder: 'e.g. Q4 Product Launch' },
                { field: 'goal', label: 'Campaign Goal', placeholder: 'e.g. Drive trial signups' },
                { field: 'target_segment', label: 'Target Segment', placeholder: 'e.g. Mid-market SaaS companies' },
                { field: 'product_service', label: 'Product/Service', placeholder: 'e.g. Enterprise Analytics Platform' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">{label}</label>
                  <input className="input" placeholder={placeholder}
                    value={(emailForm as any)[field]}
                    onChange={e => setEmailForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
            </>
          )}

          {activeTab === 'trends' && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Marketing Trend Suggestions</h3>
              {[
                { field: 'industry', label: 'Industry *', placeholder: 'e.g. B2B SaaS, E-commerce, Healthcare' },
                { field: 'current_challenges', label: 'Current Challenges', placeholder: 'e.g. Low conversion rates, high CAC' },
                { field: 'target_audience', label: 'Target Audience', placeholder: 'e.g. SMB decision makers' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">{label}</label>
                  <input className="input" placeholder={placeholder}
                    value={(trendsForm as any)[field]}
                    onChange={e => setTrendsForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
            </>
          )}

          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Zap size={14} /> Generate</>}
          </button>
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="card p-8 text-center h-full flex items-center justify-center">
              <div>
                <TrendingUp size={36} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Generated content appears here</p>
              </div>
            </div>
          ) : (
            <div className="card p-5 overflow-auto animate-fade-in max-h-[600px]">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.data?.generated_content || result.data?.ad_variations || result.data?.email_sequence || result.data?.trends || ''}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
