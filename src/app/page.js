'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORY_ICONS = {
  beauty: '💄', fragrances: '🧴', furniture: '🪑', groceries: '🛒',
  'home-decoration': '🏠', 'kitchen-accessories': '🍳', laptops: '💻',
  'mens-shirts': '👔', 'mens-shoes': '👞', 'mens-watches': '⌚',
  'mobile-accessories': '📱', motorcycle: '🏍️', 'skin-care': '🧖',
  smartphones: '📱', 'sports-accessories': '⚽', sunglasses: '🕶️',
  tablets: '📲', tops: '👚', 'vehicle': '🚗',
  'womens-bags': '👜', 'womens-dresses': '👗', 'womens-jewellery': '💎',
  'womens-shoes': '👠', 'womens-watches': '⌚',
};

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

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products?sort=rating&limit=8').then(r => r.json()),
      fetch('/api/products?limit=1').then(r => r.json()),
    ]).then(([productsData, catData]) => {
      setFeaturedProducts(productsData.products || []);
      setCategories(catData.categories || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text animate-slideUp">
            <h1>Shop Smarter with <span>AI-Powered</span> Intelligence</h1>
            <p>
              Discover products tailored to your taste. Our AI chatbot helps you search,
              compare, and shop — while NLP sentiment analysis ensures you read only
              the reviews that matter.
            </p>
            <div className="hero-badges">
              <div className="hero-badge">
                <span className="hero-badge-icon">🤖</span>
                AI Chatbot
              </div>
              <div className="hero-badge">
                <span className="hero-badge-icon">🧠</span>
                Smart Recommendations
              </div>
              <div className="hero-badge">
                <span className="hero-badge-icon">📊</span>
                Sentiment Analysis
              </div>
            </div>
            <div className="hero-actions">
              <Link href="/products" className="btn btn-primary btn-lg">
                🛍️ Browse Products
              </Link>
              <Link href="/register" className="btn btn-secondary btn-lg">
                Get Started →
              </Link>
            </div>
          </div>

          <div className="hero-visual animate-fadeIn">
            <div className="hero-card">
              <div className="hero-card-header">
                <div className="hero-card-avatar">🤖</div>
                <div className="hero-card-info">
                  <h3>ShopAI Assistant</h3>
                  <p>Online • AI-Powered</p>
                </div>
              </div>
              <div className="hero-chat-messages">
                <div className="hero-chat-msg user">Show me the best laptops under $1000</div>
                <div className="hero-chat-msg bot">I found 5 highly-rated laptops for you! 💻 Here are the top picks based on your preferences...</div>
                <div className="hero-chat-msg user">Add the first one to cart</div>
                <div className="hero-chat-msg bot">✅ Added to your cart! Ready to checkout?</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2>🔥 <span>Featured</span> Products</h2>
            <p>Top-rated products curated by our AI recommendation engine</p>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/products" className="btn btn-primary btn-lg">
              View All Products →
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>📂 Shop by <span>Category</span></h2>
            <p>Browse our wide range of product categories</p>
          </div>

          <div className="category-grid">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat}
                href={`/products?category=${cat}`}
                className="category-card"
              >
                <div className="category-card-icon">{CATEGORY_ICONS[cat] || '📦'}</div>
                <div className="category-card-name">{cat.replace(/-/g, ' ')}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2>🧠 Powered by <span>AI</span></h2>
            <p>Intelligent features that make your shopping experience smarter</p>
          </div>

          <div className="stats-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="stat-card">
              <div className="stat-card-icon purple">🤖</div>
              <div className="stat-card-content">
                <h3 style={{ fontSize: '1.1rem' }}>AI Chatbot</h3>
                <p>Search, compare, add to cart, and place orders using natural language</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon green">📊</div>
              <div className="stat-card-content">
                <h3 style={{ fontSize: '1.1rem' }}>Sentiment Analysis</h3>
                <p>Every review is analyzed and categorized as positive, negative, or neutral</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon blue">💡</div>
              <div className="stat-card-content">
                <h3 style={{ fontSize: '1.1rem' }}>Smart Recommendations</h3>
                <p>NLP-based hybrid recommendations combining content and collaborative filtering</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
