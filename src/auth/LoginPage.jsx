import { useState } from 'react'
import { supabase } from '../supabase'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const inputStyle = {
        width: '100%', background: '#1a1a24', border: '1px solid #ffffff22',
        borderRadius: '10px', padding: '0.75rem 1rem', color: '#f0f0f8',
        fontSize: '0.9rem', outline: 'none', marginBottom: '1rem',
        fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
    }

    const btnStyle = {
        width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
        background: '#7c5cfc', color: '#fff', fontFamily: 'Syne, sans-serif',
        fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error: authError } = isSignUp
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password })

        if (authError) setError(authError.message)
        setLoading(false)
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #7c5cfc18 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none' }} />

            <div style={{ background: '#111118', border: '1px solid #ffffff22', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

                {/* Brand */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2.2rem', letterSpacing: '0.04em' }}>
                        AAN<span style={{ color: '#7c5cfc' }}>GAN</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7c5cfc99', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em', marginTop: '0.2rem' }}>
                        Alert · Announce · Network · Gather · Assist & Nurture
                    </div>
                </div>

                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {isSignUp ? 'Create your account' : 'Welcome back'}
                </div>
                <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    {isSignUp ? 'Join your hostel community' : 'Sign in to your hostel hub'}
                </div>

                <form onSubmit={handleSubmit}>
                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block', fontFamily: 'Syne, sans-serif' }}>
                        Email
                    </label>
                    <input
                        style={inputStyle}
                        type="email"
                        placeholder="yourname@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />

                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block', fontFamily: 'Syne, sans-serif' }}>
                        Password
                    </label>
                    <input
                        style={inputStyle}
                        type="password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <div style={{ background: '#ff444418', border: '1px solid #ff444433', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#ff7777', fontSize: '0.82rem', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <button style={btnStyle} type="submit" disabled={loading}>
                        {loading ? 'Please wait...' : isSignUp ? 'Create Account →' : 'Sign In →'}
                    </button>
                </form>

                <button
                    onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', background: 'transparent', border: '1px solid #ffffff22', borderRadius: '10px', color: '#a0a0b8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}
                >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    )
}