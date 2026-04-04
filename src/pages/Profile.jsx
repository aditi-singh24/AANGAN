import { useAuth } from '../auth/AuthContext'

export default function Profile() {
    const { profile, signOut } = useAuth()

    return (
        <div>
            <div style={{ background: '#111118', borderBottom: '1px solid #ffffff14', padding: '2rem 1rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#7c5cfc22', border: '2px solid #7c5cfc44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#7c5cfc', margin: '0 auto 1rem' }}>
                    {profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800 }}>{profile?.full_name}</div>
                <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>{profile?.discipline} · {profile?.year_of_study}</div>
                <div style={{ color: '#606078', fontSize: '0.8rem', marginTop: '0.1rem' }}>Room {profile?.room_number} · {profile?.email}</div>
            </div>

            <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#606078', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Syne, sans-serif' }}>Project Interests</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                    {profile?.project_interests?.map(i => (
                        <span key={i} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', background: '#7c5cfc18', border: '1px solid #7c5cfc33', color: '#7c5cfc', fontSize: '0.78rem' }}>{i}</span>
                    ))}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#606078', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Syne, sans-serif' }}>Leisure Interests</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '2rem' }}>
                    {profile?.leisure_interests?.map(i => (
                        <span key={i} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', background: '#1a1a24', border: '1px solid #ffffff22', color: '#a0a0b8', fontSize: '0.78rem' }}>{i}</span>
                    ))}
                </div>

                <button
                    onClick={signOut}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #ff444433', background: '#ff444411', color: '#ff7777', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    )
}