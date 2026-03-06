'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

export default function ProductDetailPage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch(`/api/products/${id}`)
            .then(r => r.json())
            .then(data => {
                setProduct(data.product);
                setReviews(data.reviews || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    const addToCart = async () => {
        if (!session) {
            setMessage('Please login to add items to cart');
            return;
        }
        setAddingToCart(true);
        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, productId: id }),
            });
            window.dispatchEvent(new Event('cart-updated'));
            setMessage('✅ Added to cart!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to add to cart');
        }
        setAddingToCart(false);
    };

    const submitReview = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session?.user?.id,
                    productId: id,
                    reviewerName: session?.user?.name || 'Anonymous',
                    rating: reviewForm.rating,
                    comment: reviewForm.comment,
                }),
            });
            const data = await res.json();
            setReviews(prev => [data.review, ...prev]);
            setShowReviewForm(false);
            setReviewForm({ rating: 5, comment: '' });
            setMessage(`✅ Review submitted! Sentiment: ${data.sentiment?.sentiment}`);
            setTimeout(() => setMessage(''), 4000);

            // Refresh product data
            const prodRes = await fetch(`/api/products/${id}`);
            const prodData = await prodRes.json();
            setProduct(prodData.product);
        } catch (err) {
            setMessage('Failed to submit review');
        }
        setSubmittingReview(false);
    };

    const renderStars = (rating) => '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

    if (loading) return <div className="page-content"><div className="container"><div className="loading-spinner"><div className="spinner"></div></div></div></div>;
    if (!product) return <div className="page-content"><div className="container"><div className="empty-state"><div className="empty-state-icon">😕</div><h3>Product not found</h3></div></div></div>;

    const totalSentiment = (product.reviewsSummary?.positive || 0) + (product.reviewsSummary?.negative || 0) + (product.reviewsSummary?.neutral || 0);
    const positivePercent = totalSentiment > 0 ? ((product.reviewsSummary?.positive || 0) / totalSentiment * 100) : 0;
    const negativePercent = totalSentiment > 0 ? ((product.reviewsSummary?.negative || 0) / totalSentiment * 100) : 0;
    const neutralPercent = totalSentiment > 0 ? ((product.reviewsSummary?.neutral || 0) / totalSentiment * 100) : 0;

    return (
        <div className="page-content">
            <div className="container">
                {message && (
                    <div style={{ padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', marginBottom: '20px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
                        {message}
                    </div>
                )}

                {/* Product Detail */}
                <div className="product-detail">
                    <div className="product-detail-images">
                        <img src={product.thumbnail} alt={product.title} />
                    </div>

                    <div className="product-detail-info">
                        <div className="product-card-category" style={{ marginBottom: '8px' }}>{product.category}</div>
                        <h1>{product.title}</h1>

                        <div className="product-detail-meta">
                            <span className="stars" style={{ fontSize: '1.2rem' }}>{renderStars(product.rating)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{product.rating?.toFixed(1)} ({product.reviewsSummary?.totalReviews || 0} reviews)</span>
                            {product.brand && <span style={{ color: 'var(--text-muted)' }}>🏪 {product.brand}</span>}
                        </div>

                        <div className="product-detail-price">
                            ${product.price}
                            {product.discountPercentage > 0 && (
                                <span style={{ fontSize: '1rem', color: 'var(--positive)', marginLeft: '10px' }}>
                                    {Math.round(product.discountPercentage)}% off!
                                </span>
                            )}
                        </div>

                        <p className="product-detail-description">{product.description}</p>

                        <div className="product-detail-specs">
                            <div className="product-spec">
                                <span className="product-spec-label">Availability</span>
                                <span className="product-spec-value">📦 {product.availabilityStatus}</span>
                            </div>
                            <div className="product-spec">
                                <span className="product-spec-label">Stock</span>
                                <span className="product-spec-value">{product.stock} units</span>
                            </div>
                            <div className="product-spec">
                                <span className="product-spec-label">Shipping</span>
                                <span className="product-spec-value">🚚 {product.shippingInformation}</span>
                            </div>
                            <div className="product-spec">
                                <span className="product-spec-label">Warranty</span>
                                <span className="product-spec-value">🛡️ {product.warrantyInformation}</span>
                            </div>
                            <div className="product-spec">
                                <span className="product-spec-label">Returns</span>
                                <span className="product-spec-value">↩️ {product.returnPolicy}</span>
                            </div>
                            {product.tags?.length > 0 && (
                                <div className="product-spec">
                                    <span className="product-spec-label">Tags</span>
                                    <span className="product-spec-value">{product.tags.join(', ')}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary btn-lg" onClick={addToCart} disabled={addingToCart} style={{ flex: 1 }}>
                                {addingToCart ? 'Adding...' : '🛒 Add to Cart'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sentiment Analysis Section */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '24px' }}>📊 Review Sentiment Analysis</h2>

                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '3rem', fontWeight: '900' }}>{product.rating?.toFixed(1)}</div>
                                <div className="stars" style={{ fontSize: '1.2rem' }}>{renderStars(product.rating)}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                                    {product.reviewsSummary?.totalReviews || 0} reviews
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div className="sentiment-bar" style={{ height: '12px', marginBottom: '16px' }}>
                                    <div className="sentiment-bar-segment positive" style={{ width: `${positivePercent}%` }}></div>
                                    <div className="sentiment-bar-segment neutral" style={{ width: `${neutralPercent}%` }}></div>
                                    <div className="sentiment-bar-segment negative" style={{ width: `${negativePercent}%` }}></div>
                                </div>

                                <div className="sentiment-summary">
                                    <div className="sentiment-stat">
                                        <div className="sentiment-dot positive"></div>
                                        <span>Positive ({product.reviewsSummary?.positive || 0})</span>
                                    </div>
                                    <div className="sentiment-stat">
                                        <div className="sentiment-dot neutral"></div>
                                        <span>Neutral ({product.reviewsSummary?.neutral || 0})</span>
                                    </div>
                                    <div className="sentiment-stat">
                                        <div className="sentiment-dot negative"></div>
                                        <span>Negative ({product.reviewsSummary?.negative || 0})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>⭐ Customer Reviews</h2>
                        <button className="btn btn-primary" onClick={() => setShowReviewForm(true)}>
                            ✍️ Write a Review
                        </button>
                    </div>

                    {showReviewForm && (
                        <form onSubmit={submitReview} className="card" style={{ marginBottom: '20px' }}>
                            <h3 style={{ marginBottom: '16px' }}>Write Your Review</h3>
                            <div className="input-group" style={{ marginBottom: '14px' }}>
                                <label>Rating</label>
                                <select value={reviewForm.rating} onChange={(e) => setReviewForm(prev => ({ ...prev, rating: parseInt(e.target.value) }))}>
                                    {[5, 4, 3, 2, 1].map(n => (
                                        <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: '14px' }}>
                                <label>Your Review</label>
                                <textarea
                                    placeholder="Share your experience with this product..."
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                                    {submittingReview ? 'Analyzing & Submitting...' : '📊 Submit with Sentiment Analysis'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowReviewForm(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    {reviews.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <h3>No reviews yet</h3>
                            <p>Be the first to review this product!</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review._id} className="review-card">
                                <div className="review-header">
                                    <div className="review-author">
                                        <div className="review-avatar">{review.reviewerName?.[0] || '?'}</div>
                                        <div>
                                            <div className="review-author-name">{review.reviewerName}</div>
                                            <div className="review-date">
                                                <span className="stars" style={{ fontSize: '0.8rem' }}>{renderStars(review.rating)}</span>
                                                {' · '}
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`sentiment-badge ${review.sentiment}`}>
                                        {review.sentiment === 'positive' ? '👍' : review.sentiment === 'negative' ? '👎' : '➖'} {review.sentiment}
                                    </span>
                                </div>
                                <p className="review-comment">{review.comment}</p>
                                {review.sentimentKeywords?.length > 0 && (
                                    <div className="review-keywords">
                                        {review.sentimentKeywords.map((kw, i) => (
                                            <span key={i} className="review-keyword">{kw}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
