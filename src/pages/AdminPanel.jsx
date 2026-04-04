import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const ACCENT = '#7c5cfc'
const RED = '#ff3b3b'

const TABS = [
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'sos', label: 'SOS', icon: '🚨' },
    { id: 'content', label: 'Content', icon: '🗑️' },
    { id: 'notices', label: 'Notices', icon: '📢' },
]

export default function AdminPanel() {
    const { user, profile } = useAuth()
    const [activeTab, setActiveTab] = useState('stats')

    // Stats
    const [stats, setStats] = useState(null)

    // SOS
    const [sosAlerts, setSosAlerts] = useState([])

    // Content
    const [contentTab, setContentTab] = useState('colab')
    const [colabPosts, setColabPosts] = useState([])
    const [insyncPosts, setInsyncPosts] = useState([])
    const [shareItems, setShareItems] = useState([])

    // Notices
    const [notices, setNotices] = useState([])
    const [noticeTitle, setNoticeTitle] = useState('')
    const [noticeBody, setNoticeBody] = useState('')
    const [noticeTag, setNoticeTag] = useState('General')
    const [postingNotice, setPostingNotice] = useState(false)

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (activeTab === 'stats') fetchStats()
        if (activeTab === 'sos') fetchSOS()
        if (activeTab === 'content') fetchContent()
        if (activeTab === 'notices') fetchNotices()
    }, [activeTab])

    // ── Fetch functions ────────────────────────────────────────────────────────

    async function fetchStats() {
        setLoading(true)
        const [
            { count: userCount },
            { count: colabCount },
            { count: insyncCount },
            { count: shareCount },
            { count: sosCount },
            { count: noticeCount },
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('colab_projects').select('*', { count: 'exact', head: true }),
            supabase.from('insync_activities').select('*', { count: 'exact', head: true }),
            supabase.from('sharering_items').select('*', { count: 'exact', head: true }),
            supabase.from('sos_alerts').select('*', { count: 'exact', head: true }).eq('resolved', false),
            supabase.from('notices').select('*', { count: 'exact', head: true }),
        ])
        setStats({ userCount, colabCount, insyncCount, shareCount, sosCount, noticeCount })
        setLoading(false)
    }

    async function fetchSOS() {
        setLoading(true)
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) { console.error(error); setLoading(false); return }

        const userIds = [...new Set((data || []).map(a => a.user_id))]
        let profileMap = {}
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, room_number').in('id', userIds)
            profiles?.forEach(p => { profileMap[p.id] = p })
        }
        setSosAlerts((data || []).map(a => ({ ...a, profile: profileMap[a.user_id] || null })))
        setLoading(false)
    }

    async function fetchContent() {
        setLoading(true)
        const [
            { data: colab },
            { data: insync },
            { data: share },
        ] = await Promise.all([
            supabase.from('colab_projects').select('*').order('created_at', { ascending: false }),
            supabase.from('insync_activities').select('*').order('created_at', { ascending: false }),
            supabase.from('sharering_items').select('*').order('created_at', { ascending: false }),
        ])

        // Fetch all profiles
        const allIds = [
            ...(colab || []).map(p => p.user_id),
            ...(insync || []).map(p => p.user_id),
            ...(share || []).map(p => p.user_id),
        ]
        const uniqueIds = [...new Set(allIds)]
        let profileMap = {}
        if (uniqueIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uniqueIds)
            profiles?.forEach(p => { profileMap[p.id] = p })
        }

        setColabPosts((colab || []).map(p => ({ ...p, profile: profileMap[p.user_id] || null })))
        setInsyncPosts((insync || []).map(p => ({ ...p, profile: profileMap[p.user_id] || null })))
        setShareItems((share || []).map(p => ({ ...p, profile: profileMap[p.user_id] || null })))
        setLoading(false)
    }

    async function fetchNotices() {
        setLoading(true)
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) console.error(error)
        setNotices(data || [])
        setLoading(false)
    }

    // ── Actions ────────────────────────────────────────────────────────────────

    async function resolveSOSAlert(id) {
        await supabase.from('sos_alerts').update({ resolved: true }).eq('id', id)
        fetchSOS()
    }

    async function deleteContent(table, id) {
        await supabase.from(table).delete().eq('id', id)
        fetchContent()
    }

    async function postNotice() {
        if (!noticeTitle.trim() || !noticeBody.trim()) return
        setPostingNotice(true)
        const { error } = await supabase.from('notices').insert({
            user_id: user.id,
            title: noticeTitle.trim(),
            body: noticeBody.trim(),
            tag: noticeTag,
        })
        if (error) { alert(error.message); setPostingNotice(false); return }
        setNoticeTitle(''); setNoticeBody(''); setNoticeTag('General')
        setPostingNotice(false)
        fetchNotices()
    }

    async function deleteNotice(id) {
        await supabase.from('notices').delete().eq('id', id)
        fetchNotices()
    }

    function timeAgo(ts) {
        const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    const inputStyle = {
        width: '100%', background: '#1a1a24', border: '1px solid #ffffff22',
        borderRadius: '10px', padding: '0.75rem 1rem', color: '#f0f0f8',
        fontSize: '0.9rem', outline: 'none', marginBottom: '1rem',
        fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
    }

    const labelStyle = {
        fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block'
    }

    // ── Guard: only admin ──────────────────────────────────────────────────────
    if (profile?.role !== 'admin') {
        return (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#606078' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                <div>Admin access only</div>
            </div>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '1rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
                    🛡️ Admin <span style={{ color: ACCENT }}>Panel</span>
                </div>
                <div style={{ color: '#a0a0b8', fontSize: '0.82rem' }}>Manage your hostel app</div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            background: activeTab === t.id ? ACCENT : '#111118',
                            border: `1px solid ${activeTab === t.id ? ACCENT : '#ffffff22'}`,
                            borderRadius: '10px', padding: '0.5rem 1rem',
                            color: activeTab === t.id ? '#fff' : '#a0a0b8',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.82rem',
                            cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Loading...</div>
            ) : (
                <>
                    {/* ── Stats ── */}
                    {activeTab === 'stats' && stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { label: 'Total Users', value: stats.userCount, icon: '👥' },
                                { label: 'Active SOS', value: stats.sosCount, icon: '🚨', alert: stats.sosCount > 0 },
                                { label: 'CoLab Projects', value: stats.colabCount, icon: '🔬' },
                                { label: 'InSync Activities', value: stats.insyncCount, icon: '✨' },
                                { label: 'Share Ring Items', value: stats.shareCount, icon: '🔄' },
                                { label: 'Notices Posted', value: stats.noticeCount, icon: '📢' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: s.alert ? '#ff3b3b22' : '#111118',
                                    border: `1px solid ${s.alert ? RED + '66' : '#ffffff14'}`,
                                    borderRadius: '14px', padding: '1.1rem',
                                }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
                                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: s.alert ? RED : '#f0f0f8' }}>
                                        {s.value ?? '—'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#606078', marginTop: '0.2rem' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── SOS ── */}
                    {activeTab === 'sos' && (
                        <div>
                            {sosAlerts.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                                    <div>No SOS alerts</div>
                                </div>
                            ) : sosAlerts.map(alert => (
                                <div key={alert.id} style={{
                                    background: alert.resolved ? '#111118' : '#ff3b3b22',
                                    border: `1px solid ${alert.resolved ? '#ffffff14' : RED + '66'}`,
                                    borderRadius: '14px', padding: '1rem', marginBottom: '0.75rem',
                                    opacity: alert.resolved ? 0.6 : 1
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: alert.resolved ? '#a0a0b8' : RED, fontSize: '0.95rem' }}>
                                                {alert.type} Emergency
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#a0a0b8', margin: '0.2rem 0' }}>
                                                {alert.profile?.full_name || 'Unknown'}{alert.profile?.room_number ? ` · Room ${alert.profile.room_number}` : ''} · {timeAgo(alert.created_at)}
                                            </div>
                                            {alert.message && <div style={{ fontSize: '0.85rem', color: '#f0f0f8' }}>{alert.message}</div>}
                                            {alert.latitude && (
                                                <a href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: '0.78rem', color: '#a0a0b8', marginTop: '0.3rem', display: 'inline-block' }}>📍 View Location</a>
                                            )}
                                        </div>
                                        {!alert.resolved && (
                                            <button onClick={() => resolveSOSAlert(alert.id)}
                                                style={{ background: '#4caf5022', border: '1px solid #4caf5044', borderRadius: '8px', padding: '0.35rem 0.75rem', color: '#4caf50', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}>
                                                ✅ Resolve
                                            </button>
                                        )}
                                        {alert.resolved && <span style={{ fontSize: '0.72rem', color: '#606078' }}>Resolved</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Content ── */}
                    {activeTab === 'content' && (
                        <div>
                            {/* Sub tabs */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                {[
                                    { id: 'colab', label: `CoLab (${colabPosts.length})` },
                                    { id: 'insync', label: `InSync (${insyncPosts.length})` },
                                    { id: 'share', label: `Share (${shareItems.length})` },
                                ].map(t => (
                                    <button key={t.id} onClick={() => setContentTab(t.id)}
                                        style={{
                                            background: contentTab === t.id ? '#ffffff22' : 'transparent',
                                            border: `1px solid ${contentTab === t.id ? '#ffffff44' : '#ffffff22'}`,
                                            borderRadius: '8px', padding: '0.35rem 0.75rem',
                                            color: contentTab === t.id ? '#f0f0f8' : '#606078',
                                            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                                        }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content list */}
                            {(contentTab === 'colab' ? colabPosts : contentTab === 'insync' ? insyncPosts : shareItems).map(item => (
                                <div key={item.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '12px', padding: '0.9rem 1rem', marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.title || item.name || item.item_name || 'Untitled'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#606078', marginTop: '0.15rem' }}>
                                            {item.profile?.full_name || 'Unknown'} · {timeAgo(item.created_at)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteContent(
                                            contentTab === 'colab' ? 'colab_projects' : contentTab === 'insync' ? 'insync_activities' : 'sharering_items',
                                            item.id
                                        )}
                                        style={{ background: '#ff444422', border: '1px solid #ff444444', borderRadius: '8px', padding: '0.35rem 0.65rem', color: '#ff4444', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            ))}

                            {(contentTab === 'colab' ? colabPosts : contentTab === 'insync' ? insyncPosts : shareItems).length === 0 && (
                                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Nothing here</div>
                            )}
                        </div>
                    )}

                    {/* ── Notices ── */}
                    {activeTab === 'notices' && (
                        <div>
                            {/* Post form */}
                            <div style={{ background: '#111118', border: `1px solid ${ACCENT}44`, borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>Post a Notice</div>

                                <label style={labelStyle}>Tag</label>
                                <select value={noticeTag} onChange={e => setNoticeTag(e.target.value)} style={{ ...inputStyle }}>
                                    {['General', 'Urgent', 'Maintenance', 'Event', 'Rules'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>

                                <label style={labelStyle}>Title</label>
                                <input style={inputStyle} placeholder="e.g. Water Supply Outage" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} />

                                <label style={labelStyle}>Message</label>
                                <textarea
                                    rows={3}
                                    style={{ ...inputStyle, resize: 'none' }}
                                    placeholder="Details..."
                                    value={noticeBody}
                                    onChange={e => setNoticeBody(e.target.value)}
                                />

                                <button
                                    onClick={postNotice}
                                    disabled={postingNotice || !noticeTitle.trim() || !noticeBody.trim()}
                                    style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: ACCENT, color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: postingNotice ? 0.6 : 1 }}
                                >
                                    {postingNotice ? 'Posting...' : 'Post Notice →'}
                                </button>
                            </div>

                            {/* Notices list */}
                            {notices.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>No notices yet</div>
                            ) : notices.map(notice => (
                                <div key={notice.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '20px', background: `${ACCENT}22`, color: ACCENT, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                                                    {notice.tag}
                                                </span>
                                                <span style={{ fontSize: '0.72rem', color: '#606078' }}>{timeAgo(notice.created_at)}</span>
                                            </div>
                                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>{notice.title}</div>
                                            <div style={{ fontSize: '0.82rem', color: '#a0a0b8', marginTop: '0.25rem' }}>{notice.body}</div>
                                        </div>
                                        <button
                                            onClick={() => deleteNotice(notice.id)}
                                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0, marginLeft: '0.5rem' }}
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}