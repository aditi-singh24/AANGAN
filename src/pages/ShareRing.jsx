import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const CATEGORIES = ['Electronics', 'Books', 'Sports', 'Kitchen', 'Clothing', 'Stationery', 'Tools', 'Other']

export default function ShareRing() {
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const bottomRef = useRef(null)

    useEffect(() => { fetchItems() }, [])

    useEffect(() => {
        if (!activeChat) return
        fetchMessages(activeChat.id)

        const channel = supabase
            .channel('share_messages_' + activeChat.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'share_messages',
                filter: `item_id=eq.${activeChat.id}`
            }, () => fetchMessages(activeChat.id))
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [activeChat])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function fetchItems() {
        setLoading(true)
        const { data, error } = await supabase
            .from('share_items')
            .select('*, profiles(full_name, room_number, borrower_rating)')
            .order('created_at', { ascending: false })
        if (error) console.error(error)
        setItems(data || [])
        setLoading(false)
    }

    async function fetchMessages(itemId) {
        const { data, error } = await supabase
            .from('share_messages')
            .select('*, sender:profiles!share_messages_sender_id_fkey(full_name)')
            .eq('item_id', itemId)
            .order('created_at', { ascending: true })
        if (error) console.error(error)
        setMessages(data || [])
    }

    async function handleSubmit() {
        if (!title.trim() || !category) return
        setSubmitting(true)
        const { error } = await supabase.from('share_items').insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            category,
        })
        if (error) { alert(error.message); setSubmitting(false); return }
        setTitle(''); setDescription(''); setCategory(''); setShowForm(false); setSubmitting(false)
        fetchItems()
    }

    async function handleDelete(id) {
        await supabase.from('share_items').delete().eq('id', id)
        fetchItems()
    }

    async function toggleAvailability(item) {
        await supabase.from('share_items').update({ is_available: !item.is_available }).eq('id', item.id)
        setActiveChat(prev => ({ ...prev, is_available: !prev.is_available }))
        fetchItems()
    }

    async function handleSend() {
        if (!newMessage.trim()) return

        const isOwner = activeChat.user_id === user.id
        const receiverId = isOwner
            ? messages.find(m => m.sender_id !== user.id)?.sender_id
            : activeChat.user_id

        if (!receiverId) return

        const { error } = await supabase.from('share_messages').insert({
            item_id: activeChat.id,
            sender_id: user.id,
            receiver_id: receiverId,
            content: newMessage.trim(),
        })

        if (error) { alert(error.message); return }
        setNewMessage('')
        fetchMessages(activeChat.id)
    }

    function formatTime(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const inputStyle = {
        width: '100%', background: '#1a1a24', border: '1px solid #ffffff22',
        borderRadius: '10px', padding: '0.75rem 1rem', color: '#f0f0f8',
        fontSize: '0.9rem', outline: 'none', marginBottom: '1rem',
        fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
    }

    // ── Chat view ──────────────────────────────────────────────────────────────
    if (activeChat) {
        const isOwner = activeChat.user_id === user.id
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #ffffff14', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => setActiveChat(null)}
                        style={{ background: 'none', border: 'none', color: '#fc5c8a', cursor: 'pointer', fontSize: '1.2rem' }}
                    >←</button>
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>{activeChat.title}</div>
                        <div style={{ color: '#606078', fontSize: '0.75rem' }}>
                            {isOwner
                                ? 'Your listing'
                                : `Owner: ${activeChat.profiles?.full_name} · Room ${activeChat.profiles?.room_number}`}
                        </div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => toggleAvailability(activeChat)}
                            style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: '8px', border: '1px solid #ffffff22', background: 'transparent', color: '#a0a0b8', cursor: 'pointer' }}
                        >
                            Mark as {activeChat.is_available ? 'Borrowed' : 'Available'}
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                            <div>{isOwner ? 'No requests yet' : 'Send a message to request this item'}</div>
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
                                            background: isMe ? '#fc5c8a' : '#1a1a24',
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

                {/* Input */}
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ffffff14', display: 'flex', gap: '0.5rem' }}>
                    <input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        placeholder={isOwner ? 'Reply to request...' : 'Request this item...'}
                        style={{ flex: 1, background: '#1a1a24', border: '1px solid #ffffff22', borderRadius: '12px', padding: '0.75rem 1rem', color: '#f0f0f8', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        style={{ background: '#fc5c8a', color: '#fff', border: 'none', borderRadius: '12px', padding: '0.75rem 1.1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: newMessage.trim() ? 1 : 0.5 }}
                    >
                        ↑
                    </button>
                </div>
            </div>
        )
    }

    // ── Items list view ────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '1rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
                        🔄 Share<span style={{ color: '#fc5c8a' }}>Ring</span>
                    </div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.82rem' }}>Borrow and lend within the hostel</div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ background: '#fc5c8a', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {showForm ? '✕ Cancel' : '+ List Item'}
                </button>
            </div>

            {/* Post Form */}
            {showForm && (
                <div style={{ background: '#111118', border: '1px solid #fc5c8a44', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>List an Item</div>

                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block' }}>Item Name</label>
                    <input style={inputStyle} placeholder="e.g. Scientific Calculator" value={title} onChange={e => setTitle(e.target.value)} />

                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block' }}>Description (optional)</label>
                    <input style={inputStyle} placeholder="Any details, condition, duration..." value={description} onChange={e => setDescription(e.target.value)} />

                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block' }}>Category</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                        {CATEGORIES.map(cat => (
                            <div key={cat} onClick={() => setCategory(cat)} style={{
                                padding: '0.35rem 0.8rem', borderRadius: '20px',
                                border: `1px solid ${category === cat ? '#fc5c8a' : '#ffffff22'}`,
                                background: category === cat ? '#fc5c8a22' : '#1a1a24',
                                color: category === cat ? '#fc5c8a' : '#a0a0b8',
                                fontSize: '0.8rem', cursor: 'pointer'
                            }}>
                                {cat}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim() || !category}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#fc5c8a', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
                    >
                        {submitting ? 'Listing...' : 'List Item →'}
                    </button>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Loading...</div>
            ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                    <div>No items listed yet. Share something!</div>
                </div>
            ) : (
                items.map(item => (
                    <div key={item.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem' }}>{item.title}</div>
                                <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: '#fc5c8a18', border: '1px solid #fc5c8a33', color: '#fc5c8a' }}>
                                    {item.category}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '20px',
                                    background: item.is_available ? '#22c55e18' : '#ff444418',
                                    border: `1px solid ${item.is_available ? '#22c55e33' : '#ff444433'}`,
                                    color: item.is_available ? '#22c55e' : '#ff7777'
                                }}>
                                    {item.is_available ? 'Available' : 'Borrowed'}
                                </span>
                                {item.user_id === user.id && (
                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                )}
                            </div>
                        </div>

                        {item.description && (
                            <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{item.description}</div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: '#606078', fontSize: '0.78rem' }}>
                                <span style={{ color: '#a0a0b8' }}>{item.profiles?.full_name}</span>
                                {' '}· Room {item.profiles?.room_number}
                                {' '}· ⭐ {item.profiles?.borrower_rating?.toFixed(1)}
                            </div>
                            <button
                                onClick={() => { setActiveChat(item); setMessages([]) }}
                                style={{ background: '#fc5c8a22', color: '#fc5c8a', border: '1px solid #fc5c8a44', borderRadius: '8px', padding: '0.35rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                                {item.user_id === user.id ? 'View Requests' : 'Request →'}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}