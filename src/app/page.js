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
    <Link href={`/products/${product._id}`} className="product-card tilt-card">
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
      {/* Dynamic 3D Hero Section */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        
        <div className="hero-content" style={{ zIndex: 10, position: 'relative' }}>
          <div className="hero-text animate-slideUp">
            <h1 style={{ fontSize: '4.5rem', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              Welcome to <span>Bazario</span>
            </h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>
              Experience the future of premium shopping. Your personal AI assistant is waiting to help you find, compare, and discover products tailored perfectly to your taste.
            </p>
            <div className="hero-badges">
              <div className="hero-badge tilt-card">
                <span className="hero-badge-icon">💎</span>
                Premium Quality
              </div>
              <div className="hero-badge tilt-card">
                <span className="hero-badge-icon">🤖</span>
                32B Parameter AI
              </div>
              <div className="hero-badge tilt-card">
                <span className="hero-badge-icon">⚡</span>
                Lightning Fast
              </div>
            </div>
            <div className="hero-actions">
              <Link href="/products" className="btn btn-primary btn-lg tilt-card">
                🛍️ Start Exploring
              </Link>
              <Link href="/register" className="btn btn-secondary btn-lg tilt-card">
                Join Bazario →
              </Link>
            </div>
          </div>

          <div className="hero-visual animate-fadeIn tilt-card">
            <div className="hero-card" style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
              <div className="hero-card-header">
                <div className="hero-card-avatar" style={{ background: 'var(--gradient-secondary)' }}>✨</div>
                <div className="hero-card-info">
                  <h3>Bazario Intelligence</h3>
                  <p>Online • Powered by Qwen 32B</p>
                </div>
              </div>
              <div className="hero-chat-messages">
                <div className="hero-chat-msg user" style={{ transform: 'translateZ(20px)' }}>I need a high-end laptop for 3D rendering.</div>
                <div className="hero-chat-msg bot" style={{ transform: 'translateZ(30px)' }}>I've found the perfect match: The MacBook Pro 16". It has glowing reviews for 3D workloads. Shall I add it to your cart? 💻✨</div>
                <div className="hero-chat-msg user" style={{ transform: 'translateZ(20px)' }}>Yes please!</div>
                <div className="hero-chat-msg bot" style={{ transform: 'translateZ(40px)', background: 'var(--gradient-success)', color: 'white' }}>✅ Added to cart!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)', position: 'relative' }}>
        <div className="container">
          <div className="section-header">
            <h2>The <span>Bazario</span> Edge</h2>
            <p>Why we are the ultimate next-generation shopping platform</p>
          </div>

          <div className="bento-grid">
            <div className="bento-item bento-large tilt-card">
              <h3 style={{ fontSize: '2rem', marginBottom: '15px' }}>Meet your new personal shopper.</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '20px' }}>
                Our integrated AI agent understands complex queries. You can ask it to compare items, filter by sentiment, or even just say "add the second one to my cart". It handles the rest seamlessly.
              </p>
              <div style={{ fontSize: '4rem', alignSelf: 'flex-end', marginTop: 'auto', opacity: 0.8 }}>🤖</div>
            </div>
            
            <div className="bento-item tilt-card" style={{ background: 'linear-gradient(135deg, #2b1055 0%, #7597de 100%)' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>NLP Sentiment</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>We read thousands of reviews so you don't have to, extracting the true sentiment of every product.</p>
            </div>

            <div className="bento-item tilt-card" style={{ background: 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)', color: '#111' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#111' }}>Smart Curated</h3>
              <p style={{ color: 'rgba(0,0,0,0.7)' }}>Hyper-personalized recommendations using collaborative filtering.</p>
            </div>

            <div className="bento-item bento-wide tilt-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Lightning Fast Checkout</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Experience zero-latency browsing and 1-click ordering powered by our edge infrastructure.</p>
              </div>
              <div style={{ fontSize: '3rem' }}>⚡</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products (with 3D tilt) */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>🔥 <span>Trending</span> Now</h2>
            <p>Curated premium products you will love</p>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div className="product-grid" style={{ perspective: '1000px' }}>
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <Link href="/products" className="btn btn-primary btn-lg tilt-card">
              View All Collection →
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2>📂 Browse <span>Collections</span></h2>
          </div>

          <div className="category-grid">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat}
                href={`/products?category=${cat}`}
                className="category-card tilt-card"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="category-card-icon">{CATEGORY_ICONS[cat] || '📦'}</div>
                <div className="category-card-name">{cat.replace(/-/g, ' ')}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
