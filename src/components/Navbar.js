'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const { data: session } = useSession();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (session?.user?.id) {
            fetch(`/api/cart?userId=${session.user.id}`)
                .then(r => r.json())
                .then(data => {
                    setCartCount(data.cart?.reduce((sum, i) => sum + i.quantity, 0) || 0);
                })
                .catch(() => { });
        }
    }, [session]);

    // Listen for cart update events
    useEffect(() => {
        const handler = () => {
            if (session?.user?.id) {
                fetch(`/api/cart?userId=${session.user.id}`)
                    .then(r => r.json())
                    .then(data => {
                        setCartCount(data.cart?.reduce((sum, i) => sum + i.quantity, 0) || 0);
                    })
                    .catch(() => { });
            }
        };
        window.addEventListener('cart-updated', handler);
        return () => window.removeEventListener('cart-updated', handler);
    }, [session]);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-logo">
                    <span className="navbar-logo-icon">🛍️</span>
                    ShopAI
                </Link>

                <div className="navbar-links">
                    <Link href="/" className="navbar-link">Home</Link>
                    <Link href="/products" className="navbar-link">Products</Link>
                    {session && (
                        <Link href="/dashboard" className="navbar-link">Dashboard</Link>
                    )}
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="navbar-link">Admin</Link>
                    )}
                </div>

                <div className="navbar-auth">
                    {session && (
                        <Link href="/cart" className="navbar-cart">
                            🛒
                            {cartCount > 0 && (
                                <span className="navbar-cart-count">{cartCount}</span>
                            )}
                        </Link>
                    )}

                    {session ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="navbar-user">👤 {session.user.name}</span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => signOut({ callbackUrl: '/' })}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
                            <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
