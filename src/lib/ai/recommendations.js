// NLP-based Recommendation Engine
// Hybrid: Content-based + Collaborative filtering

import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';

// Content-based: find similar products by tags, category, brand
function computeSimilarity(productA, productB) {
    let score = 0;

    // Category match
    if (productA.category === productB.category) score += 3;

    // Brand match
    if (productA.brand && productB.brand && productA.brand === productB.brand) score += 2;

    // Tag overlap
    const tagsA = new Set(productA.tags || []);
    const tagsB = new Set(productB.tags || []);
    const intersection = [...tagsA].filter(t => tagsB.has(t));
    score += intersection.length * 1.5;

    // Price range similarity (within 30%)
    const priceRatio = Math.min(productA.price, productB.price) / Math.max(productA.price, productB.price);
    if (priceRatio > 0.7) score += 1;

    // Rating similarity
    if (Math.abs((productA.rating || 0) - (productB.rating || 0)) < 1) score += 0.5;

    return score;
}

// Get content-based recommendations
export async function getContentBasedRecommendations(productIds, limit = 10) {
    try {
        const sourceProducts = await Product.find({ _id: { $in: productIds } }).lean();
        if (!sourceProducts.length) return [];

        const allProducts = await Product.find({ _id: { $nin: productIds } }).lean();

        const scored = allProducts.map(product => {
            const maxScore = sourceProducts.reduce((max, src) => {
                const sim = computeSimilarity(src, product);
                return Math.max(max, sim);
            }, 0);
            return { ...product, similarityScore: maxScore };
        });

        scored.sort((a, b) => b.similarityScore - a.similarityScore);
        return scored.slice(0, limit);
    } catch (error) {
        console.error('Content-based recommendation error:', error);
        return [];
    }
}

// Get collaborative filtering recommendations
export async function getCollaborativeRecommendations(userId, limit = 10) {
    try {
        // Find current user's purchased products
        const userOrders = await Order.find({ user: userId }).lean();
        const userProductIds = new Set(
            userOrders.flatMap(o => o.items.map(i => i.product?.toString()))
        );

        if (userProductIds.size === 0) return [];

        // Find similar users who bought the same products
        const similarOrders = await Order.find({
            user: { $ne: userId },
            'items.product': { $in: [...userProductIds] },
        }).populate('items.product').lean();

        // Collect products from similar users that current user hasn't bought
        const recommendationMap = new Map();

        for (const order of similarOrders) {
            for (const item of order.items) {
                const pid = item.product?._id?.toString();
                if (pid && !userProductIds.has(pid)) {
                    if (!recommendationMap.has(pid)) {
                        recommendationMap.set(pid, { product: item.product, score: 0 });
                    }
                    recommendationMap.get(pid).score += 1;
                }
            }
        }

        const recommendations = [...recommendationMap.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(r => r.product);

        return recommendations;
    } catch (error) {
        console.error('Collaborative recommendation error:', error);
        return [];
    }
}

// Hybrid recommendation: combines content + collaborative + popularity
export async function getHybridRecommendations(userId, limit = 12) {
    try {
        // Get user's purchase history
        const userOrders = await Order.find({ user: userId }).lean();
        const purchasedProductIds = userOrders.flatMap(o =>
            o.items.map(i => i.product).filter(Boolean)
        );

        // Get user's cart and wishlist
        const user = await User.findById(userId).lean();
        const interactedIds = [
            ...purchasedProductIds,
            ...(user?.wishlist || []),
            ...(user?.cart?.map(c => c.product) || []),
        ].filter(Boolean);

        const recommendations = new Map();

        // 1. Content-based recommendations (weight: 0.4)
        if (interactedIds.length > 0) {
            const contentRecs = await getContentBasedRecommendations(interactedIds, limit);
            contentRecs.forEach((p, i) => {
                const id = p._id.toString();
                if (!recommendations.has(id)) {
                    recommendations.set(id, { product: p, score: 0 });
                }
                recommendations.get(id).score += (limit - i) * 0.4;
            });
        }

        // 2. Collaborative filtering (weight: 0.35)
        const collabRecs = await getCollaborativeRecommendations(userId, limit);
        collabRecs.forEach((p, i) => {
            const id = p._id.toString();
            if (!recommendations.has(id)) {
                recommendations.set(id, { product: p, score: 0 });
            }
            recommendations.get(id).score += (limit - i) * 0.35;
        });

        // 3. Popular products fallback (weight: 0.25)
        const popular = await Product.find({
            _id: { $nin: interactedIds },
        }).sort({ rating: -1, 'reviewsSummary.totalReviews': -1 }).limit(limit).lean();

        popular.forEach((p, i) => {
            const id = p._id.toString();
            if (!recommendations.has(id)) {
                recommendations.set(id, { product: p, score: 0 });
            }
            recommendations.get(id).score += (limit - i) * 0.25;
        });

        // Sort by hybrid score and return
        return [...recommendations.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(r => r.product);
    } catch (error) {
        console.error('Hybrid recommendation error:', error);
        // Fallback: return popular products
        return Product.find().sort({ rating: -1 }).limit(limit).lean();
    }
}
