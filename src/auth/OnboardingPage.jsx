import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthContext'

const PROJECT_INTERESTS = ['AI / ML', 'Web Dev', 'Robotics', 'Research', 'Design', 'IoT', 'Biotech', 'Finance', 'App Dev', 'Data Science']
const LEISURE_INTERESTS = ['Music', 'Gaming', 'Dance', 'Movies', 'Trekking', 'Photography', 'Cooking', 'Sports', 'Reading', 'Anime', 'Art', 'Fitness']
const DISCIPLINES = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Biotechnology', 'Physics', 'Mathematics', 'Design', 'Economics', 'Other']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year (Integrated)', 'PhD']

const label = { fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block', fontFamily: 'Syne, sans-serif' }
const input = { width: '100%', background: '#1a1a24', border: '1px solid #ffffff22', borderRadius: '10px', padding: '0.75rem 1rem', color: '#f0f0f8', fontSize: '0.9rem', outline: 'none', marginBottom: '1rem', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }
const select = { ...input, cursor: 'pointer' }

export default function OnboardingPage() {
    const { user, fetchProfile } = useAuth()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [fullName, setFullName] = useState('')
    const [roomNumber, setRoomNumber] = useState('')
    const [discipline, setDiscipline] = useState('')
    const [yearOfStudy, setYearOfStudy] = useState('')
    const [projectInterests, setProjectInterests] = useState([])
    const [leisureInterests, setLeisureInterests] = useState([])

    function toggleChip(item, list, setList) {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
    }

    function Chip({ item, selected, onToggle }) {
        return (
            <div
                onClick={onToggle}
                style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: `1px solid ${selected ? '#7c5cfc' : '#ffffff22'}`, background: selected ? '#7c5cfc22' : '#1a1a24', color: selected ? '#7c5cfc' : '#a0a0b8', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' }}
            >
                {item}
            </div>
        )
    }

    async function handleFinish() {
        setError('')
        if (!fullName.trim()) { setError('Please enter your full name.'); return }
        if (!discipline) { setError('Please select your discipline.'); return }
        if (!yearOfStudy) { setError('Please select your year.'); return }

        setLoading(true)
        const { error: dbError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: fullName.trim(),
            room_number: roomNumber.trim(),
            discipline,
            year_of_study: yearOfStudy,
            project_interests: projectInterests,
            leisure_interests: leisureInterests,
        })

        if (dbError) {
            setError(dbError.message)
            setLoading(false)
            return
        }

        await fetchProfile(user.id)
    }

    const StepDots = () => (
        <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
            {[1, 2, 3].map(n => (
                <div key={n} style={{ height: 4, flex: 1, borderRadius: 2, background: n <= step ? '#7c5cfc' : n < step ? '#7c5cfc44' : '#22222f', transition: 'background 0.3s' }} />
            ))}
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: '#111118', border: '1px solid #ffffff22', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: 480 }}>

                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                    hostel<span style={{ color: '#7c5cfc' }}>ify</span>
                </div>
                <div style={{ color: '#a0a0b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Your campus life, connected</div>

                <StepDots />

                {/* Step 1 */}
                {step === 1 && (
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create your profile</div>
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Tell us who you are</div>

                        <label style={label}>Full Name</label>
                        <input style={input} type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />

                        <label style={label}>Room Number</label>
                        <input style={input} type="text" placeholder="e.g. B-204" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />

                        <button onClick={() => { if (!fullName.trim()) { setError('Please enter your name.'); return }; setError(''); setStep(2) }}
                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#7c5cfc', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Academic profile</div>
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Connect with the right people</div>

                        <label style={label}>Discipline / Branch</label>
                        <select style={select} value={discipline} onChange={e => setDiscipline(e.target.value)}>
                            <option value="">Select your discipline</option>
                            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <label style={label}>Year of Study</label>
                        <select style={select} value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                            <option value="">Select year</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <label style={label}>Project Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            {PROJECT_INTERESTS.map(item => (
                                <Chip key={item} item={item} selected={projectInterests.includes(item)} onToggle={() => toggleChip(item, projectInterests, setProjectInterests)} />
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', border: '1px solid #ffffff22', background: 'transparent', color: '#a0a0b8', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>← Back</button>
                            <button onClick={() => { if (!discipline || !yearOfStudy) { setError('Please fill in both fields.'); return }; setError(''); setStep(3) }}
                                style={{ flex: 2, padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#7c5cfc', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>What are you into?</div>
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Find your people in the hostel</div>

                        <label style={label}>Leisure Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            {LEISURE_INTERESTS.map(item => (
                                <Chip key={item} item={item} selected={leisureInterests.includes(item)} onToggle={() => toggleChip(item, leisureInterests, setLeisureInterests)} />
                            ))}
                        </div>

                        {error && (
                            <div style={{ background: '#ff444418', border: '1px solid #ff444433', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#ff7777', fontSize: '0.82rem', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', border: '1px solid #ffffff22', background: 'transparent', color: '#a0a0b8', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>← Back</button>
                            <button onClick={handleFinish} disabled={loading}
                                style={{ flex: 2, padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#7c5cfc', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                                {loading ? 'Setting up...' : 'Enter Hostelify 🚀'}
                            </button>
                        </div>
                    </div>
                )}

                {error && step !== 3 && (
                    <div style={{ background: '#ff444418', border: '1px solid #ff444433', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#ff7777', fontSize: '0.82rem', marginTop: '1rem' }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}