// LangChain Agent Tools — Shopping Actions backed by MongoDB
// Each tool is a real database operation the AI agent can choose to call.

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
import { getHybridRecommendations } from './recommendations';

// Factory: inject userId at request time so tools close over it
export function createShoppingTools(userId) {

    // ─── 1. Search Products ────────────────────────────────────────────────
    const searchProducts = tool(
        async ({ query, category, maxPrice, minRating }) => {
            try {
                await connectDB();
                const filter = {};
                if (query) {
                    filter.$or = [
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } },
                        { brand: { $regex: query, $options: 'i' } },
                        { tags: { $regex: query, $options: 'i' } },
                        { category: { $regex: query, $options: 'i' } },
                    ];
                }
                if (category) filter.category = { $regex: category, $options: 'i' };
                if (maxPrice !== undefined) filter.price = { $lte: maxPrice };
                if (minRating !== undefined) filter.rating = { $gte: minRating };

                const products = await Product.find(filter).sort({ rating: -1 }).limit(5).lean();

                if (!products.length) return 'No products found. Try different keywords or check available categories.';

                return products.map((p, i) =>
                    `${i + 1}. **${p.title}** [ID:${p._id}]\n` +
                    `   💰 $${p.price}${p.discountPercentage > 0 ? ` (${p.discountPercentage}% off)` : ''} | ⭐ ${p.rating}/5 | 🏷️ ${p.category} | 🏪 ${p.brand || 'N/A'} | ${p.availabilityStatus || 'In Stock'}`
                ).join('\n\n');
            } catch (err) {
                return `Search error: ${err.message}`;
            }
        },
        {
            name: 'search_products',
            description: 'Search products by keyword, category, max price, or minimum rating. Returns up to 5 results with product IDs. Use when user wants to find, browse, or discover products.',
            schema: z.object({
                query: z.string().optional().describe('Search keyword — product name, type, brand, or use case'),
                category: z.string().optional().describe('Category filter e.g. laptops, smartphones, furniture'),
                maxPrice: z.number().optional().describe('Maximum price in USD'),
                minRating: z.number().min(1).max(5).optional().describe('Minimum rating (1-5)'),
            }),
        }
    );

    // ─── 2. Get Product Details ────────────────────────────────────────────
    const getProductDetails = tool(
        async ({ productId, productName }) => {
            try {
                await connectDB();
                const product = productId
                    ? await Product.findById(productId).lean()
                    : await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();

                if (!product) return 'Product not found. Try searching first to get the correct product ID.';

                const s = product.reviewsSummary || {};
                return (
                    `📦 **${product.title}** [ID:${product._id}]\n` +
                    `${product.description}\n\n` +
                    `💰 Price: $${product.price}${product.discountPercentage > 0 ? ` (-${product.discountPercentage}%)` : ''}\n` +
                    `⭐ Rating: ${product.rating}/5 | 📦 Stock: ${product.stock} (${product.availabilityStatus})\n` +
                    `🏪 Brand: ${product.brand || 'N/A'} | 🏷️ Category: ${product.category}\n` +
                    `🚚 Shipping: ${product.shippingInformation || 'Standard'}\n` +
                    `🛡️ Warranty: ${product.warrantyInformation || 'N/A'}\n` +
                    `↩️ Returns: ${product.returnPolicy || 'N/A'}\n` +
                    `📊 Reviews — ✅ ${s.positive || 0} positive | ❌ ${s.negative || 0} negative | ➖ ${s.neutral || 0} neutral`
                );
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'get_product_details',
            description: 'Get full details of a product: description, price, warranty, shipping, return policy, review sentiment summary. Prefer productId from search results.',
            schema: z.object({
                productId: z.string().optional().describe('MongoDB product ID from search results'),
                productName: z.string().optional().describe('Product name (fallback if no ID available)'),
            }),
        }
    );

    // ─── 3. Add to Cart ────────────────────────────────────────────────────
    const addToCart = tool(
        async ({ productId, productName, quantity }) => {
            if (!userId) return 'You must be logged in to add items to cart.';
            try {
                await connectDB();
                const product = productId
                    ? await Product.findById(productId).lean()
                    : await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();

                if (!product) return 'Product not found. Search for it first.';
                if (product.stock === 0) return `${product.title} is out of stock.`;

                const qty = Math.max(1, quantity || 1);
                const userDoc = await User.findById(userId);
                const existing = userDoc.cart.find(c => c.product.toString() === product._id.toString());

                if (existing) {
                    existing.quantity += qty;
                    await userDoc.save();
                } else {
                    await User.findByIdAndUpdate(userId, {
                        $push: { cart: { product: product._id, quantity: qty } },
                    });
                }
                return `✅ Added ${qty}× **${product.title}** ($${product.price} each) to cart. Subtotal: $${(product.price * qty).toFixed(2)}`;
            } catch (err) {
                return `Cart error: ${err.message}`;
            }
        },
        {
            name: 'add_to_cart',
            description: 'Add a product to the user\'s cart. Use productId from search results. Can specify quantity.',
            schema: z.object({
                productId: z.string().optional().describe('Product ID (preferred)'),
                productName: z.string().optional().describe('Product name fallback'),
                quantity: z.number().min(1).optional().describe('How many to add, default 1'),
            }),
        }
    );

    // ─── 4. View Cart ──────────────────────────────────────────────────────
    const viewCart = tool(
        async () => {
            if (!userId) return 'Please log in to view your cart.';
            try {
                await connectDB();
                const user = await User.findById(userId).populate('cart.product').lean();
                const cart = user?.cart || [];
                if (!cart.length) return 'Your cart is empty 🛒';

                let total = 0;
                const lines = cart.map((item, i) => {
                    const price = item.product?.price || 0;
                    const sub = price * item.quantity;
                    total += sub;
                    return `${i + 1}. **${item.product?.title}** × ${item.quantity} = $${sub.toFixed(2)}`;
                });
                return `🛒 Your Cart (${cart.length} items):\n${lines.join('\n')}\n\n💰 **Total: $${total.toFixed(2)}**`;
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'view_cart',
            description: 'Show the user\'s current cart contents with prices and total.',
            schema: z.object({}),
        }
    );

    // ─── 5. Remove from Cart ───────────────────────────────────────────────
    const removeFromCart = tool(
        async ({ productId, productName }) => {
            if (!userId) return 'Please log in first.';
            try {
                await connectDB();
                let pid = productId;
                if (!pid && productName) {
                    const p = await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();
                    pid = p?._id?.toString();
                }
                if (!pid) return 'Could not identify the product. Try the product name or ID.';
                await User.findByIdAndUpdate(userId, { $pull: { cart: { product: pid } } });
                return '🗑️ Item removed from your cart.';
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'remove_from_cart',
            description: 'Remove a specific product from the user\'s cart by product ID or name.',
            schema: z.object({
                productId: z.string().optional().describe('Product ID to remove'),
                productName: z.string().optional().describe('Product name to remove'),
            }),
        }
    );

    // ─── 6. Clear Cart ─────────────────────────────────────────────────────
    const clearCart = tool(
        async () => {
            if (!userId) return 'Please log in first.';
            try {
                await connectDB();
                await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
                return '🗑️ Cart cleared successfully.';
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'clear_cart',
            description: 'Empty the user\'s entire cart. Only call if user explicitly asks to clear all cart items.',
            schema: z.object({}),
        }
    );

    // ─── 7. Place Order ────────────────────────────────────────────────────
    const placeOrder = tool(
        async ({ paymentMethod }) => {
            if (!userId) return 'Please log in to place an order.';
            try {
                await connectDB();
                const user = await User.findById(userId).populate('cart.product').lean();
                if (!user?.cart?.length) return 'Your cart is empty. Add products before ordering.';

                const items = user.cart.filter(c => c.product).map(c => ({
                    product: c.product._id,
                    title: c.product.title,
                    price: c.product.price,
                    quantity: c.quantity,
                    thumbnail: c.product.thumbnail,
                }));
                const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

                const order = await Order.create({
                    user: userId,
                    items,
                    total,
                    status: 'pending',
                    paymentMethod: paymentMethod || 'cod',
                });
                await User.findByIdAndUpdate(userId, {
                    $set: { cart: [] },
                    $addToSet: { purchaseHistory: { $each: items.map(i => i.product) } },
                });
                return (
                    `🎉 **Order placed!**\n` +
                    `📦 Order #${order._id.toString().slice(-6).toUpperCase()}\n` +
                    `💰 Total: $${total.toFixed(2)} | Items: ${items.length}\n` +
                    `⏳ Status: Pending | Payment: ${paymentMethod || 'Cash on Delivery'}\n\n` +
                    `Track it anytime from your Dashboard!`
                );
            } catch (err) {
                return `Order error: ${err.message}`;
            }
        },
        {
            name: 'place_order',
            description: 'Checkout — converts the user\'s cart into a confirmed order. Call when user says checkout, place order, or buy.',
            schema: z.object({
                paymentMethod: z.string().optional().describe('Payment method e.g. cod, card. Default: cod'),
            }),
        }
    );

    // ─── 8. Order History ──────────────────────────────────────────────────
    const getOrderHistory = tool(
        async () => {
            if (!userId) return 'Please log in to view orders.';
            try {
                await connectDB();
                const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean();
                if (!orders.length) return "You haven't placed any orders yet.";

                const emoji = { pending: '⏳', processing: '🔄', shipped: '🚚', delivered: '✅', cancelled: '❌' };
                return orders.map((o, i) =>
                    `${i + 1}. Order #${o._id.toString().slice(-6).toUpperCase()} ${emoji[o.status] || '📦'} ${o.status}\n` +
                    `   💰 $${o.total.toFixed(2)} | 📦 ${o.items.length} items | 📅 ${new Date(o.createdAt).toLocaleDateString()}`
                ).join('\n\n');
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'get_order_history',
            description: 'Show the user\'s recent orders with status, total, and date.',
            schema: z.object({}),
        }
    );

    // ─── 9. Get Recommendations ────────────────────────────────────────────
    const getRecommendations = tool(
        async () => {
            try {
                await connectDB();
                let products;
                if (userId) {
                    products = await getHybridRecommendations(userId, 5);
                } else {
                    products = await Product.find().sort({ rating: -1 }).limit(5).lean();
                }
                if (!products?.length) return 'No recommendations available yet. Browse some products first!';

                return 'Here are personalized picks for you:\n\n' + products.map((p, i) =>
                    `${i + 1}. **${p.title}** [ID:${p._id}] — $${p.price} | ⭐ ${p.rating}/5 | 🏷️ ${p.category}`
                ).join('\n');
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'get_recommendations',
            description: 'Get AI-powered personalized product recommendations based on the user\'s purchase history and preferences.',
            schema: z.object({}),
        }
    );

    // ─── 10. Get Categories ────────────────────────────────────────────────
    const getCategories = tool(
        async () => {
            try {
                await connectDB();
                const cats = await Product.distinct('category');
                return `Available categories:\n${cats.map(c => `• ${c}`).join('\n')}\n\nJust ask me to search any category!`;
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'get_categories',
            description: 'List all available product categories in the store.',
            schema: z.object({}),
        }
    );

    // ─── 11. Add to Wishlist ───────────────────────────────────────────────
    const addToWishlist = tool(
        async ({ productId, productName }) => {
            if (!userId) return 'Please log in to use your wishlist.';
            try {
                await connectDB();
                const product = productId
                    ? await Product.findById(productId).lean()
                    : await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();

                if (!product) return 'Product not found.';
                await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: product._id } });
                return `💖 **${product.title}** saved to your wishlist!`;
            } catch (err) {
                return `Error: ${err.message}`;
            }
        },
        {
            name: 'add_to_wishlist',
            description: 'Save a product to the user\'s wishlist for later.',
            schema: z.object({
                productId: z.string().optional().describe('Product ID (preferred)'),
                productName: z.string().optional().describe('Product name fallback'),
            }),
        }
    );

    return [
        searchProducts,
        getProductDetails,
        addToCart,
        viewCart,
        removeFromCart,
        clearCart,
        placeOrder,
        getOrderHistory,
        getRecommendations,
        getCategories,
        addToWishlist,
    ];
}
