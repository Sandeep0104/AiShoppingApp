'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (session && session.user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        if (session?.user?.id) {
            loadData();
        }
    }, [session, status, router]);

    const loadData = async () => {
        try {
            const [statsRes, usersRes, ordersRes] = await Promise.all([
                fetch('/api/admin/stats').then(r => r.json()),
                fetch('/api/admin/users').then(r => r.json()),
                fetch('/api/orders?userId=all').then(r => r.json()).catch(() => ({ orders: [] })),
            ]);
            setStats(statsRes);
            setUsers(usersRes.users || []);
            setOrders(statsRes.recentOrders || []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const updateUserRole = async (userId, newRole) => {
        try {
            await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole }),
            });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const statusEmoji = {
        pending: '⏳', processing: '🔄', shipped: '🚚', delivered: '✅', cancelled: '❌'
    };

    if (status === 'loading' || loading) {
        return <div className="page-content"><div className="container"><div className="loading-spinner"><div className="spinner"></div></div></div></div>;
    }

    const tabs = [
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
        { id: 'orders', label: '📦 Orders', icon: '📦' },
        { id: 'users', label: '👥 Users', icon: '👥' },
        { id: 'products', label: '🛍️ Products', icon: '🛍️' },
    ];

    return (
        <div className="dashboard">
            <div className="container">
                <div className="dashboard-header">
                    <h1>👑 Admin Dashboard</h1>
                    <p>Manage your store, track performance, and analyze customer sentiment</p>
                </div>

                <div className="dashboard-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && stats && (
                    <div className="animate-fadeIn">
                        <div className="stats-grid" style={{ marginBottom: '30px' }}>
                            <div className="stat-card">
                                <div className="stat-card-icon purple">🛍️</div>
                                <div className="stat-card-content">
                                    <h3>{stats.totalProducts}</h3>
                                    <p>Total Products</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon green">💰</div>
                                <div className="stat-card-content">
                                    <h3>${stats.totalRevenue?.toFixed(2) || '0.00'}</h3>
                                    <p>Total Revenue</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon blue">📦</div>
                                <div className="stat-card-content">
                                    <h3>{stats.totalOrders}</h3>
                                    <p>Total Orders</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon pink">👥</div>
                                <div className="stat-card-content">
                                    <h3>{stats.totalUsers}</h3>
                                    <p>Total Users</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon yellow">⭐</div>
                                <div className="stat-card-content">
                                    <h3>{stats.totalReviews}</h3>
                                    <p>Total Reviews</p>
                                </div>
                            </div>
                        </div>

                        {/* Sentiment Overview */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div className="chart-container">
                                <h3>📊 Review Sentiment Overview</h3>
                                <div style={{ marginTop: '20px' }}>
                                    {stats.sentimentStats?.map(s => {
                                        const total = stats.totalReviews || 1;
                                        const pct = ((s.count / total) * 100).toFixed(1);
                                        const colors = { positive: 'var(--positive)', negative: 'var(--negative)', neutral: 'var(--neutral)' };
                                        return (
                                            <div key={s._id} style={{ marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                                                        {s._id === 'positive' ? '👍' : s._id === 'negative' ? '👎' : '➖'} {s._id}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{s.count} ({pct}%)</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: colors[s._id] || 'var(--neutral)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="chart-container">
                                <h3>📂 Category Distribution</h3>
                                <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {stats.categoryStats?.map(c => {
                                        const pct = ((c.count / (stats.totalProducts || 1)) * 100).toFixed(1);
                                        return (
                                            <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                                <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{c._id?.replace(/-/g, ' ')}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.count} ({pct}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className="chart-container">
                            <h3>📦 Recent Orders</h3>
                            <div className="table-container" style={{ marginTop: '16px', border: 'none' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <tr key={order._id}>
                                                <td style={{ fontWeight: '600' }}>#{order._id.slice(-6).toUpperCase()}</td>
                                                <td>{order.user?.name || 'Unknown'}</td>
                                                <td>${order.total?.toFixed(2)}</td>
                                                <td><span className={`status-badge ${order.status}`}>{statusEmoji[order.status]} {order.status}</span></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No orders yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="animate-fadeIn">
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>📦 Manage Orders</h2>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order._id}>
                                            <td style={{ fontWeight: '600' }}>#{order._id.slice(-6).toUpperCase()}</td>
                                            <td>{order.user?.name || 'Unknown'}</td>
                                            <td>{order.items?.length || 0}</td>
                                            <td style={{ fontWeight: '600' }}>${order.total?.toFixed(2)}</td>
                                            <td><span className={`status-badge ${order.status}`}>{statusEmoji[order.status]} {order.status}</span></td>
                                            <td>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                                    style={{ padding: '6px 28px 6px 10px', fontSize: '0.8rem', minWidth: '130px' }}
                                                >
                                                    <option value="pending">⏳ Pending</option>
                                                    <option value="processing">🔄 Processing</option>
                                                    <option value="shipped">🚚 Shipped</option>
                                                    <option value="delivered">✅ Delivered</option>
                                                    <option value="cancelled">❌ Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No orders yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="animate-fadeIn">
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>👥 Manage Users</h2>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id}>
                                            <td style={{ fontWeight: '600' }}>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span style={{ color: user.role === 'admin' ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                                    {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateUserRole(user._id, e.target.value)}
                                                    style={{ padding: '6px 28px 6px 10px', fontSize: '0.8rem' }}
                                                >
                                                    <option value="user">👤 User</option>
                                                    <option value="admin">👑 Admin</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="animate-fadeIn">
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px' }}>🛍️ Product Catalog</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            {stats?.totalProducts || 0} products loaded from DummyJSON API. View and manage all products.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <div className="stat-card" style={{ flex: 1 }}>
                                <div className="stat-card-icon purple">📦</div>
                                <div className="stat-card-content">
                                    <h3>{stats?.totalProducts || 0}</h3>
                                    <p>Total Products</p>
                                </div>
                            </div>
                            <div className="stat-card" style={{ flex: 1 }}>
                                <div className="stat-card-icon green">📂</div>
                                <div className="stat-card-content">
                                    <h3>{stats?.categoryStats?.length || 0}</h3>
                                    <p>Categories</p>
                                </div>
                            </div>
                            <div className="stat-card" style={{ flex: 1 }}>
                                <div className="stat-card-icon yellow">⭐</div>
                                <div className="stat-card-content">
                                    <h3>{stats?.totalReviews || 0}</h3>
                                    <p>Reviews Analyzed</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <Link href="/products" className="btn btn-primary">
                                🔍 Browse All Products
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
