import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const ACCENT = '#6c63ff'

export default function InSync() {
    const { user } = useAuth()
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form fields
    const [title, setTitle] = useState('')
    const [location, setLocation] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [budget, setBudget] = useState('')

    // Chat
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [members, setMembers] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const bottomRef = useRef(null)

    useEffect(() => { fetchActivities() }, [])

    useEffect(() => {
        if (!activeChat) return
        fetchMessages(activeChat.id)
        fetchMembers(activeChat.id)

        const channel = supabase
            .channel('insync_messages_' + activeChat.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'insync_messages',
                filter: `activity_id=eq.${activeChat.id}`
            }, () => fetchMessages(activeChat.id))
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [activeChat])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function fetchActivities() {
        setLoading(true)

        const { data, error } = await supabase
            .from('insync_activities')
            .select('*, insync_members(user_id)')
            .order('date', { ascending: true })

        if (error) {
            console.error('fetchActivities error:', error)
            setLoading(false)
            return
        }

        // Fetch creator profiles separately to avoid FK join issues
        const userIds = [...new Set((data || []).map(a => a.user_id))]
        let profileMap = {}
        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, room_number')
                .in('id', userIds)
            if (profilesError) console.error('profiles fetch error:', profilesError)
            profiles?.forEach(p => { profileMap[p.id] = p })
        }

        const enriched = (data || []).map(a => ({
            ...a,
            profiles: profileMap[a.user_id] || null
        }))

        setActivities(enriched)
        setLoading(false)
    }

    async function fetchMessages(activityId) {
        const { data, error } = await supabase
            .from('insync_messages')
            .select('*, sender:profiles!insync_messages_sender_id_fkey(full_name)')
            .eq('activity_id', activityId)
            .order('created_at', { ascending: true })
        if (error) console.error('fetchMessages error:', error)
        setMessages(data || [])
    }

    async function fetchMembers(activityId) {
        const { data, error } = await supabase
            .from('insync_members')
            .select('user_id, profiles(full_name)')
            .eq('activity_id', activityId)
        if (error) console.error('fetchMembers error:', error)
        setMembers(data || [])
    }

    async function handleSubmit() {
        if (!title.trim() || !location.trim() || !date || !time || !budget.trim()) {
            alert('Please fill in all fields')
            return
        }
        setSubmitting(true)

        const { data, error } = await supabase
            .from('insync_activities')
            .insert({
                user_id: user.id,
                title: title.trim(),
                location: location.trim(),
                date,
                time,
                budget: budget.trim(),
            })
            .select()
            .single()

        if (error) {
            console.error('Insert error:', error)
            alert('Failed to create activity: ' + error.message)
            setSubmitting(false)
            return
        }

        // Creator auto-joins their own activity
        const { error: joinError } = await supabase
            .from('insync_members')
            .insert({ activity_id: data.id, user_id: user.id })

        if (joinError) {
            console.error('Join error:', joinError)
        }

        setTitle(''); setLocation(''); setDate(''); setTime(''); setBudget('')
        setShowForm(false)
        setSubmitting(false)
        fetchActivities()
    }

    async function handleJoin(activityId) {
        const { error } = await supabase.from('insync_members').insert({
            activity_id: activityId,
            user_id: user.id,
        })
        if (error) { alert(error.message); return }
        fetchActivities()
    }

    async function handleLeave(activityId) {
        await supabase.from('insync_members')
            .delete()
            .eq('activity_id', activityId)
            .eq('user_id', user.id)
        fetchActivities()
        if (activeChat?.id === activityId) setActiveChat(null)
    }

    async function handleDelete(activityId) {
        await supabase.from('insync_activities').delete().eq('id', activityId)
        fetchActivities()
        if (activeChat?.id === activityId) setActiveChat(null)
    }

    async function handleSend() {
        if (!newMessage.trim()) return
        const { error } = await supabase.from('insync_messages').insert({
            activity_id: activeChat.id,
            sender_id: user.id,
            content: newMessage.trim(),
        })
        if (error) { alert(error.message); return }
        setNewMessage('')
        fetchMessages(activeChat.id)
    }

    function formatDate(d) {
        return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    }

    function formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    function formatActivityTime(t) {
        const [h, m] = t.split(':')
        const d = new Date()
        d.setHours(h, m)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

    // ── Chat view ──────────────────────────────────────────────────────────────
    if (activeChat) {
        const isMember = members.some(m => m.user_id === user.id)

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #ffffff14', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => setActiveChat(null)}
                        style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: '1.2rem' }}
                    >←</button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>{activeChat.title}</div>
                        <div style={{ color: '#606078', fontSize: '0.75rem' }}>
                            📍 {activeChat.location} · 🗓 {formatDate(activeChat.date)} · ⏰ {formatActivityTime(activeChat.time)} · 💰 {activeChat.budget}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a0a0b8' }}>{members.length} joined</div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                            <div>No messages yet. Start the conversation!</div>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === user.id
                            return (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                    {!isMe && (
                                        <div style={{ fontSize: '0.72rem', color: '#606078', marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>
                                            {msg.sender?.full_name}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                        <div style={{
                                            maxWidth: '75%',
                                            background: isMe ? ACCENT : '#1a1a24',
                                            border: isMe ? 'none' : '1px solid #ffffff14',
                                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            padding: '0.65rem 1rem',
                                            color: '#f0f0f8',
                                            fontSize: '0.9rem',
                                            lineHeight: 1.4,
                                            wordBreak: 'break-word'
                                        }}>
                                            {msg.content}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#606078' }}>{formatTime(msg.created_at)}</div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input or join prompt */}
                {isMember ? (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ffffff14', display: 'flex', gap: '0.5rem' }}>
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
                            placeholder="Message the group..."
                            style={{ flex: 1, background: '#1a1a24', border: '1px solid #ffffff22', borderRadius: '12px', padding: '0.75rem 1rem', color: '#f0f0f8', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim()}
                            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '12px', padding: '0.75rem 1.1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: newMessage.trim() ? 1 : 0.5 }}
                        >↑</button>
                    </div>
                ) : (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ffffff14', textAlign: 'center' }}>
                        <button
                            onClick={() => handleJoin(activeChat.id)}
                            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '12px', padding: '0.75rem 2rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                        >Join to chat</button>
                    </div>
                )}
            </div>
        )
    }

    // ── Activities list view ───────────────────────────────────────────────────
    return (
        <div style={{ padding: '1rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
                        ✨ In<span style={{ color: ACCENT }}>Sync</span>
                    </div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.82rem' }}>Plan activities with your hostel</div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {showForm ? '✕ Cancel' : '+ Plan Activity'}
                </button>
            </div>

            {/* Post Form */}
            {showForm && (
                <div style={{ background: '#111118', border: `1px solid ${ACCENT}44`, borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>New Activity</div>

                    <label style={labelStyle}>Activity Name</label>
                    <input style={inputStyle} placeholder="e.g. Midnight Cricket" value={title} onChange={e => setTitle(e.target.value)} />

                    <label style={labelStyle}>Location</label>
                    <input style={inputStyle} placeholder="e.g. Terrace / Nearby Park" value={location} onChange={e => setLocation(e.target.value)} />

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Date</label>
                            <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Time</label>
                            <input type="time" style={inputStyle} value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>

                    <label style={labelStyle}>Budget per person</label>
                    <input style={inputStyle} placeholder="e.g. ₹200 or Free" value={budget} onChange={e => setBudget(e.target.value)} />

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim() || !location.trim() || !date || !time || !budget.trim()}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: ACCENT, color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                    >
                        {submitting ? 'Posting...' : 'Post Activity →'}
                    </button>
                </div>
            )}

            {/* Activities List */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Loading...</div>
            ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                    <div>No activities yet. Plan something!</div>
                </div>
            ) : (
                activities.map(activity => {
                    const memberList = activity.insync_members || []
                    const isCreator = activity.user_id === user.id
                    const isMember = memberList.some(m => m.user_id === user.id)

                    return (
                        <div key={activity.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>

                            {/* Title row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem' }}>{activity.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isMember && (
                                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: `${ACCENT}22`, border: `1px solid ${ACCENT}44`, color: ACCENT }}>
                                            Joined
                                        </span>
                                    )}
                                    {isCreator && (
                                        <button onClick={() => handleDelete(activity.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#a0a0b8' }}>📍 {activity.location}</span>
                                <span style={{ fontSize: '0.8rem', color: '#a0a0b8' }}>🗓 {formatDate(activity.date)}</span>
                                <span style={{ fontSize: '0.8rem', color: '#a0a0b8' }}>⏰ {formatActivityTime(activity.time)}</span>
                                <span style={{ fontSize: '0.8rem', color: '#a0a0b8' }}>💰 {activity.budget}</span>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ color: '#606078', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#a0a0b8' }}>{activity.profiles?.full_name}</span>
                                    {' '}· {memberList.length} {memberList.length === 1 ? 'person' : 'people'} going
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {isMember && !isCreator && (
                                        <button
                                            onClick={() => handleLeave(activity.id)}
                                            style={{ background: 'transparent', color: '#a0a0b8', border: '1px solid #ffffff22', borderRadius: '8px', padding: '0.35rem 0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                        >Leave</button>
                                    )}
                                    <button
                                        onClick={() => { setActiveChat(activity); setMessages([]); setMembers([]) }}
                                        style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: '8px', padding: '0.35rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        {isMember ? 'Open Chat →' : 'View →'}
                                    </button>
                                    {!isMember && (
                                        <button
                                            onClick={() => handleJoin(activity.id)}
                                            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.35rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                        >Join</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}