'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const { data: session } = useSession();
    const [cartCount, setCartCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                <Link href="/" className="navbar-logo" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="navbar-logo-icon">🛍️</span>
                    Bazario
                </Link>

                <div className={`navbar-links ${isMobileMenuOpen ? 'active' : ''}`}>
                    <Link href="/" className="navbar-link" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    <Link href="/products" className="navbar-link" onClick={() => setIsMobileMenuOpen(false)}>Products</Link>
                    {session && (
                        <Link href="/dashboard" className="navbar-link" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                    )}
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="navbar-link" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                    )}
                </div>

                <div className="navbar-auth">
                    {session && (
                        <Link href="/cart" className="navbar-cart" onClick={() => setIsMobileMenuOpen(false)}>
                            🛒
                            {cartCount > 0 && (
                                <span className="navbar-cart-count">{cartCount}</span>
                            )}
                        </Link>
                    )}

                    {session ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="navbar-user" style={{ display: isMobileMenuOpen ? 'none' : 'flex' }}>👤 {session.user.name.split(' ')[0]}</span>
                            <button
                                className="btn btn-ghost btn-sm logout-btn"
                                onClick={() => signOut({ callbackUrl: '/' })}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
                            <Link href="/register" className="btn btn-primary btn-sm signup-btn">Sign Up</Link>
                        </div>
                    )}

                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>
        </nav>
    );
}
