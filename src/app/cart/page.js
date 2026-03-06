'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CartPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (session?.user?.id) {
            fetch(`/api/cart?userId=${session.user.id}`)
                .then(r => r.json())
                .then(data => {
                    setCart(data.cart || []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [session, status, router]);

    const updateQuantity = async (productId, quantity) => {
        try {
            const res = await fetch('/api/cart', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, productId, quantity }),
            });
            const data = await res.json();
            setCart(data.cart || []);
            window.dispatchEvent(new Event('cart-updated'));
        } catch (err) {
            console.error(err);
        }
    };

    const clearCart = async () => {
        try {
            await fetch(`/api/cart?userId=${session.user.id}`, { method: 'DELETE' });
            setCart([]);
            window.dispatchEvent(new Event('cart-updated'));
        } catch (err) {
            console.error(err);
        }
    };

    const placeOrder = async () => {
        setPlacing(true);
        try {
            const items = cart.map(item => ({
                product: item.product._id,
                title: item.product.title,
                price: item.product.price,
                quantity: item.quantity,
                thumbnail: item.product.thumbnail,
            }));

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, items }),
            });

            if (res.ok) {
                setCart([]);
                window.dispatchEvent(new Event('cart-updated'));
                setMessage('🎉 Order placed successfully! Redirecting to dashboard...');
                setTimeout(() => router.push('/dashboard'), 2000);
            }
        } catch (err) {
            setMessage('Failed to place order');
        }
        setPlacing(false);
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
    const shipping = subtotal > 50 ? 0 : 9.99;
    const total = subtotal + shipping;

    if (loading) return <div className="page-content"><div className="container"><div className="loading-spinner"><div className="spinner"></div></div></div></div>;

    return (
        <div className="page-content">
            <div className="container">
                <div className="page-header">
                    <h1>🛒 Your Cart</h1>
                    <p>{cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</p>
                </div>

                {message && (
                    <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--positive)', borderRadius: 'var(--radius-md)', marginBottom: '20px', textAlign: 'center' }}>
                        {message}
                    </div>
                )}

                {cart.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🛒</div>
                        <h3>Your cart is empty</h3>
                        <p>Start shopping to add products to your cart!</p>
                        <Link href="/products" className="btn btn-primary">Browse Products</Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', alignItems: 'start' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3>Cart Items</h3>
                                <button className="btn btn-ghost btn-sm" onClick={clearCart}>🗑️ Clear Cart</button>
                            </div>

                            {cart.map((item) => (
                                <div key={item.product?._id} className="cart-item">
                                    <div className="cart-item-image">
                                        <img src={item.product?.thumbnail} alt={item.product?.title} />
                                    </div>
                                    <div className="cart-item-info">
                                        <Link href={`/products/${item.product?._id}`} className="cart-item-title" style={{ color: 'var(--text-primary)' }}>
                                            {item.product?.title}
                                        </Link>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.product?.category}</div>
                                        <div className="cart-item-price">${item.product?.price}</div>
                                    </div>
                                    <div className="cart-quantity">
                                        <button onClick={() => updateQuantity(item.product._id, item.quantity - 1)}>−</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product._id, item.quantity + 1)}>+</button>
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', minWidth: '80px', textAlign: 'right' }}>
                                        ${(item.product?.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary">
                            <h3>Order Summary</h3>
                            <div className="cart-summary-row">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>Shipping</span>
                                <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                            </div>
                            {shipping > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--positive)', padding: '8px 0' }}>
                                    Free shipping on orders over $50!
                                </div>
                            )}
                            <div className="cart-summary-total">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <button
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%', marginTop: '20px' }}
                                onClick={placeOrder}
                                disabled={placing}
                            >
                                {placing ? 'Placing Order...' : '🛍️ Place Order'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
