import { useState } from 'react'
import Home from './pages/Home'
import CoLab from './pages/CoLab'
import ShareRing from './pages/ShareRing'
import InSync from './pages/InSync'
import Notices from './pages/Notices'
import Profile from './pages/Profile'
import SOS from './pages/SOS'
import AdminPanel from './pages/AdminPanel'
import SOSBanner from './components/SOSBanner'
import AuthGate from './auth/AuthGate'
import { useAuth } from './auth/AuthContext'

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'colab', label: 'CoLab', icon: '🔬' },
  { id: 'share', label: 'Share Ring', icon: '🔄' },
  { id: 'sync', label: 'InSync', icon: '✨' },
  { id: 'notices', label: 'Notices', icon: '📢' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const { profile, signOut } = useAuth()

  const isAdmin = profile?.role === 'admin'

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <Home onNavigate={setActiveTab} />
      case 'colab': return <CoLab />
      case 'share': return <ShareRing />
      case 'sync': return <InSync />
      case 'notices': return <Notices />
      case 'profile': return <Profile />
      case 'sos': return <SOS />
      case 'admin': return <AdminPanel />
      default: return <Home />
    }
  }

  return (
    <AuthGate>
      <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#f0f0f8', fontFamily: 'DM Sans, sans-serif' }}>

        {/* Realtime SOS banner */}
        <SOSBanner />

        {/* Top bar */}
        <div style={{ background: '#111118', borderBottom: '1px solid #ffffff14', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em' }}>
              AAN<span style={{ color: '#7c5cfc' }}>GAN</span>
            </div>
            <div style={{ fontSize: '0.55rem', color: '#7c5cfc88', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em', lineHeight: 1 }}>
              Alert · Announce · Network · Gather · Assist & Nurture
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                style={{
                  background: activeTab === 'admin' ? '#7c5cfc' : '#7c5cfc22',
                  color: activeTab === 'admin' ? '#fff' : '#7c5cfc',
                  border: '1px solid #7c5cfc44',
                  borderRadius: '8px', padding: '0.4rem 0.75rem',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif'
                }}
              >
                🛡️ Admin
              </button>
            )}
            <button
              onClick={() => setActiveTab('sos')}
              style={{ background: '#ff3b3b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
            >
              🚨 SOS
            </button>
            <div
              onClick={() => setActiveTab('profile')}
              style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c5cfc33', border: '1px solid #7c5cfc44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#7c5cfc', cursor: 'pointer' }}
            >
              {profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ paddingBottom: '80px' }}>
          {renderTab()}
        </div>

        {/* Bottom navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111118', borderTop: '1px solid #ffffff14', display: 'flex', zIndex: 100 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '0.6rem 0.5rem',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? '#7c5cfc' : '#606078',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

      </div>
    </AuthGate>
  )
}