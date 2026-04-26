'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Generate a stable sessionId per browser
function getSessionId() {
    if (typeof window === 'undefined') return null;
    const key = 'bazario_session_id';
    let id = localStorage.getItem(key);
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(key, id);
    }
    return id;
}

export default function ChatbotWidget() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('bazario_chat_history');
            if (saved) {
                try { return JSON.parse(saved); } catch (e) {}
            }
        }
        return [];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState([]);
    const [sessionId] = useState(() => getSessionId());
    const messagesEnd = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingSteps]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && session) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, session]);

    // Persist messages to localStorage and listen for cross-tab changes
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('bazario_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'bazario_chat_history' && e.newValue) {
                try { setMessages(JSON.parse(e.newValue)); } catch (e) {}
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Set the welcome message based on login state
    useEffect(() => {
        if (!session) {
            setMessages([{
                role: 'bot',
                content: null,
                isLoginPrompt: true,
            }]);
            localStorage.removeItem('bazario_chat_history');
        } else {
            setMessages(prev => {
                // Only set welcome message if chat is empty or currently showing login prompt
                if (prev.length === 0 || prev[0].isLoginPrompt) {
                    return [{
                        role: 'bot',
                        content: `👋 Welcome back, **${session.user.name.split(' ')[0]}**! I'm your AI shopping assistant.\n\nI remember our previous conversations and learn your preferences over time. How can I help you today?`,
                    }];
                }
                return prev;
            });
        }
    }, [session]);

    const sendMessage = useCallback(async (text) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setLoading(true);
        setThinkingSteps([]);

        // Show a "thinking" placeholder immediately
        setMessages(prev => [...prev, { role: 'bot', content: null, isThinking: true, id: 'thinking' }]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    userId: session?.user?.id,
                    sessionId,
                }),
            });

            const data = await res.json();

            // Replace thinking placeholder with real reply + thinking steps
            setMessages(prev => {
                const withoutThinking = prev.filter(m => m.id !== 'thinking');
                return [
                    ...withoutThinking,
                    {
                        role: 'bot',
                        content: data.reply,
                        thinkingSteps: data.thinkingSteps || [],
                        action: data.action,
                    },
                ];
            });

            // Trigger cart refresh if needed
            if (data.action === 'cart_updated' || data.action === 'order_placed') {
                window.dispatchEvent(new Event('cart-updated'));
            }
        } catch {
            setMessages(prev => {
                const withoutThinking = prev.filter(m => m.id !== 'thinking');
                return [...withoutThinking, { role: 'bot', content: '😅 Something went wrong. Please try again!' }];
            });
        }

        setLoading(false);
    }, [input, loading, session, sessionId]);

    const quickReplies = session
        ? ['🔍 Show electronics', '💡 Recommendations', '🛒 View cart', '📦 My orders', '📂 Categories']
        : [];

    return (
        <>
            {/* Floating toggle button */}
            <button
                className="chatbot-toggle"
                onClick={() => setIsOpen(o => !o)}
                title="AI Shopping Assistant"
                aria-label="Toggle AI Shopping Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-header-avatar">🤖</div>
                            <div>
                                <h3>Bazario Assistant</h3>
                                <p>{session ? 'Gemini AI • Learns your preferences' : 'Login required'}</p>
                            </div>
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((msg, i) => {
                            // Login prompt card
                            if (msg.isLoginPrompt) {
                                return (
                                    <div key={i} className="chat-message bot">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <p>🔐 <strong>Login required</strong></p>
                                            <p style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                                                The Bazario assistant is personalized for each user. Please log in to start chatting, get recommendations, and manage your cart.
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Link href="/login" className="btn btn-primary btn-sm" onClick={() => setIsOpen(false)}>
                                                    Login
                                                </Link>
                                                <Link href="/register" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>
                                                    Sign Up
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Thinking placeholder
                            if (msg.isThinking) {
                                return (
                                    <div key={i} className="chat-message bot thinking-message">
                                        <span className="thinking-dots">
                                            <span />
                                            <span />
                                            <span />
                                        </span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '8px' }}>
                                            Thinking...
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={i} className={`chat-message ${msg.role}`}>
                                    {/* Tool thinking steps shown above bot reply */}
                                    {msg.role === 'bot' && msg.thinkingSteps?.length > 0 && (
                                        <div className="thinking-steps">
                                            {msg.thinkingSteps.map((step, j) => (
                                                <span key={j} className="thinking-step-chip">{step}</span>
                                            ))}
                                        </div>
                                    )}
                                    <MarkdownMessage content={msg.content} />
                                </div>
                            );
                        })}

                        <div ref={messagesEnd} />
                    </div>

                    {/* Quick replies — only for logged-in users */}
                    {session && quickReplies.length > 0 && (
                        <div className="chatbot-quick-replies">
                            {quickReplies.map((reply, i) => (
                                <button
                                    key={i}
                                    className="quick-reply"
                                    onClick={() => sendMessage(reply.replace(/^[^\s]+\s/, ''))}
                                    disabled={loading}
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input area */}
                    <div className="chatbot-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={session ? 'Ask me anything...' : 'Login to chat'}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            disabled={!session || loading}
                        />
                        <button onClick={() => sendMessage()} disabled={!session || loading || !input.trim()}>
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// Minimal markdown renderer for bold (**text**) and newlines
function MarkdownMessage({ content }) {
    if (!content) return null;

    // Convert **text** → <strong>, then split on newlines
    const parts = content.split('\n').map((line, i) => {
        const segments = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
                return <strong key={j}>{seg.slice(2, -2)}</strong>;
            }
            return seg;
        });
        return <span key={i}>{segments}{i < content.split('\n').length - 1 && <br />}</span>;
    });

    return <div>{parts}</div>;
}
