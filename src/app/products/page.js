'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ProductCard({ product }) {
    const originalPrice = product.discountPercentage > 0
        ? (product.price / (1 - product.discountPercentage / 100)).toFixed(2)
        : null;

    const renderStars = (rating) => {
        const full = Math.floor(rating);
        return '★'.repeat(full) + '☆'.repeat(5 - full);
    };

    return (
        <Link href={`/products/${product._id}`} className="product-card">
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
                    {originalPrice && <span className="price-original">${originalPrice}</span>}
                </div>
            </div>
        </Link>
    );
}

function ProductsContent() {
    const searchParams = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [sort, setSort] = useState('rating');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        params.set('sort', sort);
        params.set('page', page);
        params.set('limit', 12);

        try {
            const res = await fetch(`/api/products?${params}`);
            const data = await res.json();
            setProducts(data.products || []);
            setCategories(data.categories || []);
            setTotalPages(data.pages || 1);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [category, sort, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchProducts();
    };

    return (
        <div className="page-content">
            <div className="container">
                <div className="page-header">
                    <h1>🛍️ All Products</h1>
                    <p>Browse through our collection of {products.length > 0 ? 'amazing' : ''} products</p>
                </div>

                {/* Search & Sort Bar */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <form onSubmit={handleSearch} className="search-bar" style={{ flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="submit">Search</button>
                    </form>

                    <select
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        style={{ padding: '12px 40px 12px 16px', minWidth: '180px' }}
                    >
                        <option value="rating">⭐ Top Rated</option>
                        <option value="price_asc">💰 Price: Low to High</option>
                        <option value="price_desc">💰 Price: High to Low</option>
                        <option value="newest">🆕 Newest</option>
                    </select>
                </div>

                <div className="products-layout">
                    {/* Filters Sidebar */}
                    <div className="filters-sidebar">
                        <div className="filter-group">
                            <h4>Categories</h4>
                            <div
                                className={`filter-option ${!category ? 'active' : ''}`}
                                onClick={() => { setCategory(''); setPage(1); }}
                            >
                                📦 All Categories
                            </div>
                            {categories.map((cat) => (
                                <div
                                    key={cat}
                                    className={`filter-option ${category === cat ? 'active' : ''}`}
                                    onClick={() => { setCategory(cat); setPage(1); }}
                                >
                                    {cat.replace(/-/g, ' ')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="products-main">
                        {loading ? (
                            <div className="loading-spinner"><div className="spinner"></div></div>
                        ) : products.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🔍</div>
                                <h3>No products found</h3>
                                <p>Try adjusting your search or filters</p>
                                <button className="btn btn-primary" onClick={() => { setSearch(''); setCategory(''); setPage(1); }}>
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="product-grid">
                                    {products.map((product) => (
                                        <ProductCard key={product._id} product={product} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            ← Previous
                                        </button>
                                        <span style={{ padding: '8px 16px', color: 'var(--text-muted)' }}>
                                            Page {page} of {totalPages}
                                        </span>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
            <ProductsContent />
        </Suspense>
    );
}
