'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ChatbotWidget() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', content: "Hello! 👋 I'm your AI shopping assistant. How can I help you today?\n\nTry: \"Show me electronics\" or \"Help\"" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState({});
    const messagesEnd = useRef(null);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text) => {
        const msg = text || input.trim();
        if (!msg) return;

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    userId: session?.user?.id,
                    context,
                }),
            });

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);

            // Update context
            if (data.data?.products?.length === 1 || data.data?.product) {
                setContext(prev => ({
                    ...prev,
                    currentProduct: data.data?.product || data.data?.products?.[0],
                }));
            }

            // Dispatch cart update event
            if (data.action === 'cart_updated' || data.action === 'order_placed') {
                window.dispatchEvent(new Event('cart-updated'));
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, something went wrong. Please try again! 😅' }]);
        }

        setLoading(false);
    };

    const quickReplies = ['🔍 Show electronics', '💡 Recommendations', '🛒 View cart', '📦 My orders', '❓ Help'];

    return (
        <>
            <button
                className="chatbot-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title="AI Shopping Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-header-avatar">🤖</div>
                            <div>
                                <h3>ShopAI Assistant</h3>
                                <p>AI-powered • Always ready</p>
                            </div>
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chat-message ${msg.role}`}>
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-message bot">
                                <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEnd} />
                    </div>

                    <div className="chatbot-quick-replies">
                        {quickReplies.map((reply, i) => (
                            <button
                                key={i}
                                className="quick-reply"
                                onClick={() => sendMessage(reply.replace(/^[^\s]+\s/, ''))}
                            >
                                {reply}
                            </button>
                        ))}
                    </div>

                    <div className="chatbot-input-area">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={() => sendMessage()} disabled={loading}>
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
