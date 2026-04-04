import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const ACCENT = '#7c5cfc'

const FEATURES = [
    { id: 'colab', icon: '🔬', label: 'CoLab', desc: 'Collaborate on projects' },
    { id: 'share', icon: '🔄', label: 'Share Ring', desc: 'Borrow & lend items' },
    { id: 'sync', icon: '✨', label: 'InSync', desc: 'Plan activities together' },
    { id: 'notices', icon: '📢', label: 'Notices', desc: 'Hostel announcements' },
]

const TAG_COLORS = {
    Urgent: '#ff3b3b',
    Maintenance: '#ff9500',
    Event: '#7c5cfc',
    General: '#4caf50',
    Rules: '#2196f3',
}

export default function Home({ onNavigate }) {
    const { profile } = useAuth()
    const [notices, setNotices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchNotices() }, [])

    async function fetchNotices() {
        setLoading(true)
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
        if (error) console.error(error)
        setNotices(data || [])
        setLoading(false)
    }

    function timeAgo(ts) {
        const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    const firstName = profile?.full_name?.split(' ')[0] || 'there'

    return (
        <div style={{ padding: '1.25rem 1rem' }}>

            {/* Greeting */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem' }}>
                    Hey, {firstName} 👋
                </div>
                <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Welcome to your hostel hub
                </div>
            </div>

            {/* Quick access */}
            <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                    Quick Access
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {FEATURES.map(f => (
                        <button
                            key={f.id}
                            onClick={() => onNavigate?.(f.id)}
                            style={{
                                background: '#111118',
                                border: '1px solid #ffffff14',
                                borderRadius: '14px',
                                padding: '1rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT + '66'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#ffffff14'}
                        >
                            <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f0f8' }}>{f.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#606078', marginTop: '0.15rem' }}>{f.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Notices feed */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                        Latest Notices
                    </div>
                    <button
                        onClick={() => onNavigate?.('notices')}
                        style={{ background: 'none', border: 'none', color: ACCENT, fontSize: '0.78rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}
                    >
                        See all →
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#606078', padding: '1.5rem' }}>Loading...</div>
                ) : notices.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#606078', padding: '2rem 1rem', background: '#111118', borderRadius: '14px', border: '1px solid #ffffff14' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📭</div>
                        <div style={{ fontSize: '0.85rem' }}>No notices yet</div>
                    </div>
                ) : (
                    notices.map(notice => {
                        const tagColor = TAG_COLORS[notice.tag] || ACCENT
                        return (
                            <div key={notice.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '14px', padding: '1rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem', borderRadius: '20px', background: tagColor + '22', color: tagColor, fontFamily: 'Syne, sans-serif', fontWeight: 700, border: `1px solid ${tagColor}44` }}>
                                        {notice.tag}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#606078' }}>{timeAgo(notice.created_at)}</span>
                                </div>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.3rem' }}>{notice.title}</div>
                                <div style={{ fontSize: '0.82rem', color: '#a0a0b8', lineHeight: 1.5 }}>{notice.body}</div>
                            </div>
                        )
                    })
                )}
            </div>

        </div>
    )
}