import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const RED = '#ff3b3b'

const ALERT_TYPES = [
    { label: 'Medical', emoji: '🚑' },
    { label: 'Fire', emoji: '🔥' },
    { label: 'Theft', emoji: '🚨' },
    { label: 'Other', emoji: '⚠️' },
]

export default function SOSBanner() {
    const { user } = useAuth()
    const [banner, setBanner] = useState(null) // the incoming SOS alert to show

    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('sos_banner')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sos_alerts',
            }, async (payload) => {
                const alert = payload.new

                // Don't show banner for own alerts
                if (alert.user_id === user.id) return

                // Fetch sender profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, room_number')
                    .eq('id', alert.user_id)
                    .single()

                setBanner({ ...alert, profile })

                // Auto-dismiss after 10 seconds
                setTimeout(() => setBanner(null), 10000)
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [user])

    if (!banner) return null

    const typeEmoji = ALERT_TYPES.find(t => t.label === banner.type)?.emoji || '⚠️'
    const mapsUrl = banner.latitude && banner.longitude
        ? `https://maps.google.com/?q=${banner.latitude},${banner.longitude}`
        : null

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                padding: '0.75rem 1rem',
                background: RED,
                boxShadow: '0 4px 24px #ff3b3b88',
                animation: 'slideDown 0.3s ease',
            }}
        >
            <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '0.2rem' }}>
                        {typeEmoji} {banner.type} Emergency
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#ffffff99' }}>
                        {banner.profile?.full_name || 'A hostel member'}
                        {banner.profile?.room_number && ` · Room ${banner.profile.room_number}`}
                        {' '}needs help
                    </div>
                    {banner.message && (
                        <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '0.35rem' }}>
                            "{banner.message}"
                        </div>
                    )}
                    {mapsUrl && (
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#fff', background: '#ffffff22', borderRadius: '6px', padding: '0.25rem 0.6rem', textDecoration: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
                        >
                            📍 View Location
                        </a>
                    )}
                </div>

                <button
                    onClick={() => setBanner(null)}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0', lineHeight: 1, flexShrink: 0 }}
                >
                    ✕
                </button>
            </div>
        </div>
    )
}