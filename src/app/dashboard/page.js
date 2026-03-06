'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (session?.user?.id) {
            Promise.all([
                fetch(`/api/orders?userId=${session.user.id}`).then(r => r.json()),
                fetch(`/api/recommendations?userId=${session.user.id}`).then(r => r.json()),
            ]).then(([ordersData, recsData]) => {
                setOrders(ordersData.orders || []);
                setRecommendations(recsData.recommendations || []);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [session, status, router]);

    const statusEmoji = {
        pending: '⏳', processing: '🔄', shipped: '🚚', delivered: '✅', cancelled: '❌'
    };

    const renderStars = (rating) => '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

    if (status === 'loading' || loading) return <div className="page-content"><div className="container"><div className="loading-spinner"><div className="spinner"></div></div></div></div>;

    return (
        <div className="dashboard">
            <div className="container">
                <div className="dashboard-header">
                    <h1>👋 Welcome back, {session?.user?.name}!</h1>
                    <p>Manage your orders, track deliveries, and get personalized recommendations</p>
                </div>

                <div className="dashboard-tabs">
                    {['orders', 'recommendations', 'profile'].map(tab => (
                        <button
                            key={tab}
                            className={`dashboard-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'orders' && '📦 '}
                            {tab === 'recommendations' && '💡 '}
                            {tab === 'profile' && '👤 '}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="animate-fadeIn">
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>📦 Your Orders</h2>
                        {orders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📦</div>
                                <h3>No orders yet</h3>
                                <p>Start shopping to place your first order!</p>
                                <Link href="/products" className="btn btn-primary">Shop Now</Link>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order._id} className="card" style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
                                                Order #{order._id.slice(-6).toUpperCase()}
                                            </h3>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className={`status-badge ${order.status}`}>
                                                {statusEmoji[order.status]} {order.status}
                                            </span>
                                            <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>${order.total?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {order.items?.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', minWidth: '200px' }}>
                                                {item.thumbnail && (
                                                    <img src={item.thumbnail} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px' }} />
                                                )}
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>${item.price} × {item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                    <div className="animate-fadeIn">
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>💡 AI Recommendations for You</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            These products are recommended based on your browsing history, purchases, and preferences using our NLP-based hybrid recommendation engine.
                        </p>
                        <div className="product-grid">
                            {recommendations.map(product => (
                                <Link href={`/products/${product._id}`} key={product._id} className="product-card">
                                    {product.discountPercentage > 5 && (
                                        <div className="product-card-discount">-{Math.round(product.discountPercentage)}%</div>
                                    )}
                                    <div className="product-card-image">
                                        <img src={product.thumbnail} alt={product.title} loading="lazy" />
                                    </div>
                                    <div className="product-card-body">
                                        <div className="product-card-category">{product.category}</div>
                                        <h3 className="product-card-title">{product.title}</h3>
                                        <div className="product-card-rating">
                                            <span className="stars">{renderStars(product.rating)}</span>
                                            <span className="rating-number">{product.rating?.toFixed(1)}</span>
                                        </div>
                                        <div className="product-card-price">
                                            <span className="price-current">${product.price}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="animate-fadeIn">
                        <div className="card" style={{ maxWidth: '600px' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>👤 Profile Details</h2>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div className="product-spec">
                                    <span className="product-spec-label">Name</span>
                                    <span className="product-spec-value">{session?.user?.name}</span>
                                </div>
                                <div className="product-spec">
                                    <span className="product-spec-label">Email</span>
                                    <span className="product-spec-value">{session?.user?.email}</span>
                                </div>
                                <div className="product-spec">
                                    <span className="product-spec-label">Role</span>
                                    <span className="product-spec-value" style={{ textTransform: 'capitalize' }}>
                                        {session?.user?.role === 'admin' ? '👑 Admin' : '👤 User'}
                                    </span>
                                </div>
                                <div className="product-spec">
                                    <span className="product-spec-label">Total Orders</span>
                                    <span className="product-spec-value">{orders.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
