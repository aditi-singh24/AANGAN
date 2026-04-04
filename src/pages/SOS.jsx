import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const RED = '#ff3b3b'
const RED_DIM = '#ff3b3b22'

const ALERT_TYPES = [
    { label: 'Medical', emoji: '🚑' },
    { label: 'Fire', emoji: '🔥' },
    { label: 'Theft', emoji: '🚨' },
    { label: 'Other', emoji: '⚠️' },
]

export default function SOS() {
    const { user } = useAuth()
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('feed') // 'feed' | 'send'

    // Send form
    const [selectedType, setSelectedType] = useState(null)
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [locationStatus, setLocationStatus] = useState('idle') // 'idle' | 'fetching' | 'granted' | 'denied'
    const [coords, setCoords] = useState(null)

    useEffect(() => { fetchAlerts() }, [])

    async function fetchAlerts() {
        setLoading(true)
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('*, user_id')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) { console.error(error); setLoading(false); return }

        // Fetch sender profiles separately
        const userIds = [...new Set((data || []).map(a => a.user_id))]
        let profileMap = {}
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, room_number')
                .in('id', userIds)
            profiles?.forEach(p => { profileMap[p.id] = p })
        }

        setAlerts((data || []).map(a => ({ ...a, profile: profileMap[a.user_id] || null })))
        setLoading(false)
    }

    function requestLocation() {
        setLocationStatus('fetching')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setLocationStatus('granted')
            },
            () => setLocationStatus('denied')
        )
    }

    async function handleSend() {
        if (!selectedType) return
        setSending(true)

        const { error } = await supabase.from('sos_alerts').insert({
            user_id: user.id,
            type: selectedType,
            message: message.trim() || null,
            latitude: coords?.lat || null,
            longitude: coords?.lng || null,
        })

        if (error) {
            alert('Failed to send SOS: ' + error.message)
            setSending(false)
            return
        }

        // Reset
        setSelectedType(null)
        setMessage('')
        setCoords(null)
        setLocationStatus('idle')
        setSending(false)
        setView('feed')
        fetchAlerts()
    }

    async function handleResolve(alertId) {
        await supabase.from('sos_alerts').update({ resolved: true }).eq('id', alertId)
        fetchAlerts()
    }

    function timeAgo(ts) {
        const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    // ── Send view ──────────────────────────────────────────────────────────────
    if (view === 'send') {
        return (
            <div style={{ padding: '1rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setView('feed')}
                        style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: '1.2rem' }}
                    >←</button>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem' }}>
                        Send <span style={{ color: RED }}>SOS Alert</span>
                    </div>
                </div>

                {/* Type selector */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Alert Type
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {ALERT_TYPES.map(t => (
                            <button
                                key={t.label}
                                onClick={() => setSelectedType(t.label)}
                                style={{
                                    background: selectedType === t.label ? RED_DIM : '#111118',
                                    border: `1px solid ${selectedType === t.label ? RED : '#ffffff22'}`,
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    color: selectedType === t.label ? RED : '#f0f0f8',
                                    fontFamily: 'Syne, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <span style={{ fontSize: '1.75rem' }}>{t.emoji}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        Message (optional)
                    </div>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Describe the situation..."
                        rows={3}
                        style={{
                            width: '100%', background: '#1a1a24', border: '1px solid #ffffff22',
                            borderRadius: '10px', padding: '0.75rem 1rem', color: '#f0f0f8',
                            fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                            boxSizing: 'border-box', resize: 'none'
                        }}
                    />
                </div>

                {/* Location */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        Share Location
                    </div>
                    {locationStatus === 'idle' && (
                        <button
                            onClick={requestLocation}
                            style={{ background: '#1a1a24', border: '1px solid #ffffff22', borderRadius: '10px', padding: '0.65rem 1rem', color: '#a0a0b8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}
                        >
                            📍 Tap to share your location
                        </button>
                    )}
                    {locationStatus === 'fetching' && (
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', padding: '0.65rem 0' }}>Fetching location...</div>
                    )}
                    {locationStatus === 'granted' && (
                        <div style={{ color: '#4caf50', fontSize: '0.85rem', padding: '0.65rem 0' }}>
                            ✅ Location attached ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                        </div>
                    )}
                    {locationStatus === 'denied' && (
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', padding: '0.65rem 0' }}>
                            ⚠️ Location permission denied — alert will be sent without it
                        </div>
                    )}
                </div>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={!selectedType || sending}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '14px', border: 'none',
                        background: selectedType && !sending ? RED : '#333',
                        color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: '1.1rem', cursor: selectedType && !sending ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.05em', transition: 'background 0.2s'
                    }}
                >
                    {sending ? 'Sending...' : '🚨 SEND SOS ALERT'}
                </button>

                <div style={{ textAlign: 'center', color: '#606078', fontSize: '0.78rem', marginTop: '0.75rem' }}>
                    This will alert all hostel members immediately
                </div>
            </div>
        )
    }

    // ── Feed view ──────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '1rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
                        🚨 <span style={{ color: RED }}>SOS</span> Alerts
                    </div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.82rem' }}>Emergency alerts from your hostel</div>
                </div>
                <button
                    onClick={() => setView('send')}
                    style={{ background: RED, color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    + SOS
                </button>
            </div>

            {/* Alerts list */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Loading...</div>
            ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <div>No alerts. Everyone is safe!</div>
                </div>
            ) : (
                alerts.map(alert => {
                    const isOwn = alert.user_id === user.id
                    const mapsUrl = alert.latitude && alert.longitude
                        ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
                        : null
                    const typeEmoji = ALERT_TYPES.find(t => t.label === alert.type)?.emoji || '⚠️'

                    return (
                        <div
                            key={alert.id}
                            style={{
                                background: alert.resolved ? '#111118' : RED_DIM,
                                border: `1px solid ${alert.resolved ? '#ffffff14' : RED + '66'}`,
                                borderRadius: '16px',
                                padding: '1.25rem',
                                marginBottom: '1rem',
                                opacity: alert.resolved ? 0.6 : 1,
                            }}
                        >
                            {/* Top row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{typeEmoji}</span>
                                    <div>
                                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: alert.resolved ? '#a0a0b8' : RED }}>
                                            {alert.type} Emergency
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#606078' }}>{timeAgo(alert.created_at)}</div>
                                    </div>
                                </div>
                                {alert.resolved && (
                                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: '#ffffff11', color: '#606078' }}>
                                        Resolved
                                    </span>
                                )}
                            </div>

                            {/* Sender */}
                            <div style={{ fontSize: '0.82rem', color: '#a0a0b8', marginBottom: alert.message ? '0.5rem' : '0.75rem' }}>
                                Sent by <span style={{ color: '#f0f0f8' }}>{alert.profile?.full_name || 'Unknown'}</span>
                                {alert.profile?.room_number && ` · Room ${alert.profile.room_number}`}
                            </div>

                            {/* Message */}
                            {alert.message && (
                                <div style={{ fontSize: '0.88rem', color: '#f0f0f8', background: '#ffffff08', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                                    {alert.message}
                                </div>
                            )}

                            {/* Footer actions */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {mapsUrl && (
                                    <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', color: '#a0a0b8', background: '#ffffff11', border: '1px solid #ffffff22', borderRadius: '8px', padding: '0.35rem 0.75rem', textDecoration: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
                                    >
                                        📍 View Location
                                    </a>
                                )}
                                {isOwn && !alert.resolved && (
                                    <button
                                        onClick={() => handleResolve(alert.id)}
                                        style={{ fontSize: '0.8rem', color: '#4caf50', background: '#4caf5022', border: '1px solid #4caf5044', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
                                    >
                                        ✅ Mark Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}