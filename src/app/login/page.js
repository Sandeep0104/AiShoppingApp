'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            email: form.email,
            password: form.password,
            redirect: false,
        });

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h1>Welcome Back 👋</h1>
                <p className="subtitle">Login to your Bazario account</p>

                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />
                </div>

                {error && <p className="error-text">⚠️ {error}</p>}

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                    {loading ? 'Logging in...' : '🔐 Login'}
                </button>

                <p className="auth-link">
                    Don&apos;t have an account? <Link href="/register">Sign up here</Link>
                </p>

                <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Demo Accounts:</strong><br />
                    👤 User: user@shop.com / user123<br />
                    👑 Admin: admin@shop.com / admin123
                </div>
            </form>
        </div>
    );
}
