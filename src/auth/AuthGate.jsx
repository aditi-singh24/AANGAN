import { useAuth } from './AuthContext'
import LoginPage from './LoginPage'
import OnboardingPage from './OnboardingPage'

export default function AuthGate({ children }) {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#7c5cfc', fontFamily: 'Syne, sans-serif', fontSize: '1.1rem' }}>Loading...</div>
            </div>
        )
    }

    if (!user) return <LoginPage />
    if (!profile?.full_name) return <OnboardingPage />
    return children
}