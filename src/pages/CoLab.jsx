import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const SKILLS = ['React', 'Python', 'ML/AI', 'Design', 'Arduino', 'Data Science', 'Flutter', 'Node.js', 'Research', 'Finance']

export default function CoLab() {
    const { user, profile } = useAuth()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [skills, setSkills] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [activeChat, setActiveChat] = useState(null) // which post's chat is open
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [members, setMembers] = useState([])
    const bottomRef = useRef(null)

    useEffect(() => { fetchPosts() }, [])

    useEffect(() => {
        if (!activeChat) return
        fetchMessages(activeChat.id)
        fetchMembers(activeChat.id)

        const channel = supabase
            .channel('colab_messages_' + activeChat.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'colab_messages', filter: `post_id=eq.${activeChat.id}` },
                () => fetchMessages(activeChat.id))
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [activeChat])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function fetchPosts() {
        setLoading(true)
        const { data, error } = await supabase
            .from('colab_posts')
            .select('*, profiles(full_name, discipline, year_of_study)')
            .order('created_at', { ascending: false })
        if (error) console.error(error)
        setPosts(data || [])
        setLoading(false)
    }

    async function fetchMessages(postId) {
        const { data, error } = await supabase
            .from('colab_messages')
            .select('*, profiles(full_name)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true })
        if (error) console.error(error)
        setMessages(data || [])
    }

    async function fetchMembers(postId) {
        const { data, error } = await supabase
            .from('colab_members')
            .select('*, profiles(full_name)')
            .eq('post_id', postId)
        if (error) console.error(error)
        setMembers(data || [])
    }

    async function handleSubmit() {
        if (!title.trim() || !description.trim()) return
        setSubmitting(true)
        const { error } = await supabase.from('colab_posts').insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            skills_needed: skills,
        })
        if (error) { alert(error.message); setSubmitting(false); return }
        setTitle(''); setDescription(''); setSkills([]); setShowForm(false); setSubmitting(false)
        fetchPosts()
    }

    async function handleDelete(id) {
        await supabase.from('colab_posts').delete().eq('id', id)
        fetchPosts()
    }

    async function handleJoin(postId) {
        const { error } = await supabase.from('colab_members').insert({ post_id: postId, user_id: user.id })
        if (error) console.error(error)
        fetchMembers(postId)
    }

    async function handleLeave(postId) {
        await supabase.from('colab_members').delete().eq('post_id', postId).eq('user_id', user.id)
        fetchMembers(postId)
    }

    async function handleSend() {
        if (!newMessage.trim()) return
        const { error } = await supabase.from('colab_messages').insert({
            post_id: activeChat.id,
            user_id: user.id,
            content: newMessage.trim(),
        })
        if (error) { alert(error.message); return }
        setNewMessage('')
    }

    function isMember(postId) {
        return members.some(m => m.user_id === user.id && m.post_id === postId)
    }

    function toggleSkill(skill) {
        setSkills(skills.includes(skill) ? skills.filter(s => s !== skill) : [...skills, skill])
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

    // Chat view
    if (activeChat) {
        const amMember = members.some(m => m.user_id === user.id)
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
                {/* Chat Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #ffffff14', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#7c5cfc', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>{activeChat.title}</div>
                        <div style={{ color: '#606078', fontSize: '0.75rem' }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
                    </div>
                    {!amMember && activeChat.user_id !== user.id && (
                        <button
                            onClick={() => handleJoin(activeChat.id)}
                            style={{ marginLeft: 'auto', background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Join Project
                        </button>
                    )}
                    {amMember && activeChat.user_id !== user.id && (
                        <button
                            onClick={() => handleLeave(activeChat.id)}
                            style={{ marginLeft: 'auto', background: 'transparent', color: '#ff7777', border: '1px solid #ff444433', borderRadius: '8px', padding: '0.4rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Leave
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {!amMember && activeChat.user_id !== user.id ? (
                        <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                            <div>Join this project to see the chat</div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                            <div>No messages yet. Start the conversation!</div>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.user_id === user.id
                            return (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                    {!isMe && <div style={{ fontSize: '0.72rem', color: '#606078', marginBottom: '0.2rem', paddingLeft: '0.5rem' }}>{msg.profiles?.full_name}</div>}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                        <div style={{
                                            maxWidth: '75%', background: isMe ? '#7c5cfc' : '#1a1a24',
                                            border: isMe ? 'none' : '1px solid #ffffff14',
                                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            padding: '0.65rem 1rem', color: '#f0f0f8', fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word'
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
                {(amMember || activeChat.user_id === user.id) && (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ffffff14', display: 'flex', gap: '0.5rem' }}>
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Message the team..."
                            style={{ flex: 1, background: '#1a1a24', border: '1px solid #ffffff22', borderRadius: '12px', padding: '0.75rem 1rem', color: '#f0f0f8', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim()}
                            style={{ background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: '12px', padding: '0.75rem 1.1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
                        >
                            ↑
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // Posts list view
    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>🔬 Co<span style={{ color: '#7c5cfc' }}>Lab</span></div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.82rem' }}>Find your next collaborator</div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {showForm ? '✕ Cancel' : '+ Post'}
                </button>
            </div>

            {/* Post Form */}
            {showForm && (
                <div style={{ background: '#111118', border: '1px solid #7c5cfc44', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>New Project Post</div>
                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block' }}>Project Title</label>
                    <input style={inputStyle} placeholder="e.g. AI-powered attendance system" value={title} onChange={e => setTitle(e.target.value)} />
                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'block' }}>Description</label>
                    <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="What are you building? What kind of help do you need?" value={description} onChange={e => setDescription(e.target.value)} />
                    <label style={{ fontSize: '0.75rem', color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block' }}>Skills Needed</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                        {SKILLS.map(skill => (
                            <div key={skill} onClick={() => toggleSkill(skill)}
                                style={{ padding: '0.35rem 0.8rem', borderRadius: '20px', border: `1px solid ${skills.includes(skill) ? '#7c5cfc' : '#ffffff22'}`, background: skills.includes(skill) ? '#7c5cfc22' : '#1a1a24', color: skills.includes(skill) ? '#7c5cfc' : '#a0a0b8', fontSize: '0.8rem', cursor: 'pointer' }}>
                                {skill}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#7c5cfc', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                        {submitting ? 'Posting...' : 'Post Project →'}
                    </button>
                </div>
            )}

            {/* Posts List */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '2rem' }}>Loading...</div>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#606078', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔬</div>
                    <div>No projects yet. Be the first to post!</div>
                </div>
            ) : (
                posts.map(post => (
                    <div key={post.id} style={{ background: '#111118', border: '1px solid #ffffff14', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', flex: 1 }}>{post.title}</div>
                            {post.user_id === user.id && (
                                <button onClick={() => handleDelete(post.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.5rem' }}>✕</button>
                            )}
                        </div>
                        <div style={{ color: '#a0a0b8', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{post.description}</div>
                        {post.skills_needed?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                {post.skills_needed.map(skill => (
                                    <span key={skill} style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', background: '#7c5cfc18', border: '1px solid #7c5cfc33', color: '#7c5cfc', fontSize: '0.75rem' }}>{skill}</span>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: '#606078', fontSize: '0.78rem' }}>
                                by <span style={{ color: '#a0a0b8' }}>{post.profiles?.full_name}</span> · {post.profiles?.year_of_study}
                            </div>
                            <button
                                onClick={() => { setActiveChat(post); setMessages([]); setMembers([]) }}
                                style={{ background: '#7c5cfc22', color: '#7c5cfc', border: '1px solid #7c5cfc44', borderRadius: '8px', padding: '0.35rem 0.85rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                                Open →
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}