// Shopping Tools — DB operations + Gemini FunctionDeclaration schemas
// Self-contained: no external recommendation import, handles all DB logic directly.

import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';

// ─── Tool Implementations (actual DB logic) ───────────────────────────────────

export const toolFunctions = {

    search_products: async ({ query, category, maxPrice, minRating }) => {
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
            if (!products.length) return 'No products found. Try different keywords or browse categories.';

            return products.map((p, i) =>
                `${i + 1}. **${p.title}** [ID:${p._id}]\n` +
                `   💰 $${p.price}${p.discountPercentage > 0 ? ` (${p.discountPercentage}% off)` : ''} | ⭐ ${p.rating}/5 | 🏷️ ${p.category} | 🏪 ${p.brand || 'N/A'} | Stock: ${p.stock}`
            ).join('\n\n');
        } catch (err) {
            return `Search error: ${err.message}`;
        }
    },

    get_product_details: async ({ productId, productName }) => {
        try {
            await connectDB();
            const product = productId
                ? await Product.findById(productId).lean()
                : await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();
            if (!product) return 'Product not found. Try searching first.';
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
                `📊 Reviews — ✅ ${s.positive || 0} positive | ❌ ${s.negative || 0} negative`
            );
        } catch (err) {
            return `Error: ${err.message}`;
        }
    },

    add_to_cart: async ({ productId, productName, quantity }, userId) => {
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
            const existing = userDoc.cart?.find(c => c.product.toString() === product._id.toString());
            if (existing) {
                existing.quantity += qty;
                await userDoc.save();
            } else {
                await User.findByIdAndUpdate(userId, {
                    $push: { cart: { product: product._id, quantity: qty } },
                });
            }
            return `✅ Added ${qty}× **${product.title}** ($${product.price} each) to your cart!`;
        } catch (err) {
            return `Cart error: ${err.message}`;
        }
    },

    view_cart: async ({}, userId) => {
        if (!userId) return 'Please log in to view your cart.';
        try {
            await connectDB();
            const user = await User.findById(userId).populate('cart.product').lean();
            const cart = user?.cart || [];
            if (!cart.length) return 'Your cart is empty 🛒. Search for products to add!';
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

    remove_from_cart: async ({ productId, productName }, userId) => {
        if (!userId) return 'Please log in first.';
        try {
            await connectDB();
            let pid = productId;
            if (!pid && productName) {
                const p = await Product.findOne({ title: { $regex: productName, $options: 'i' } }).lean();
                pid = p?._id?.toString();
            }
            if (!pid) return 'Could not identify the product.';
            await User.findByIdAndUpdate(userId, { $pull: { cart: { product: pid } } });
            return '🗑️ Item removed from your cart.';
        } catch (err) {
            return `Error: ${err.message}`;
        }
    },

    clear_cart: async ({}, userId) => {
        if (!userId) return 'Please log in first.';
        try {
            await connectDB();
            await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
            return '🗑️ Cart cleared successfully.';
        } catch (err) {
            return `Error: ${err.message}`;
        }
    },

    place_order: async ({ paymentMethod }, userId) => {
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
                `⏳ Status: Pending | Payment: ${paymentMethod || 'Cash on Delivery'}\n\nTrack it from your Dashboard!`
            );
        } catch (err) {
            return `Order error: ${err.message}`;
        }
    },

    get_order_history: async ({}, userId) => {
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

    get_recommendations: async ({}, userId) => {
        try {
            await connectDB();
            let products;
            if (userId) {
                // Personalized: find products similar to purchase history categories
                const user = await User.findById(userId).lean();
                const purchasedIds = user?.purchaseHistory || [];
                if (purchasedIds.length > 0) {
                    // Get categories of purchased items
                    const purchased = await Product.find({ _id: { $in: purchasedIds } }).lean();
                    const cats = [...new Set(purchased.map(p => p.category))];
                    // Recommend top-rated from same categories, excluding already bought
                    products = await Product.find({
                        category: { $in: cats },
                        _id: { $nin: purchasedIds },
                    }).sort({ rating: -1 }).limit(5).lean();
                }
            }
            // Fallback: top-rated products
            if (!products?.length) {
                products = await Product.find().sort({ rating: -1 }).limit(5).lean();
            }
            return 'Here are personalized picks for you:\n\n' + products.map((p, i) =>
                `${i + 1}. **${p.title}** [ID:${p._id}] — $${p.price} | ⭐ ${p.rating}/5 | 🏷️ ${p.category}`
            ).join('\n');
        } catch (err) {
            return `Error: ${err.message}`;
        }
    },

    get_categories: async () => {
        try {
            await connectDB();
            const cats = await Product.distinct('category');
            return `Available categories (${cats.length} total):\n${cats.map(c => `• ${c}`).join('\n')}\n\nAsk me to search any of these!`;
        } catch (err) {
            return `Error: ${err.message}`;
        }
    },

    add_to_wishlist: async ({ productId, productName }, userId) => {
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
};

// ─── Gemini Function Declarations (schema for Gemini native function calling) ─

export const geminiToolDeclarations = {
    functionDeclarations: [
        {
            name: 'search_products',
            description: 'Search products by keyword, category, max price, or minimum rating. Returns up to 5 results with product IDs. Use when user wants to find, browse, or discover products.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    query: { type: 'STRING', description: 'Search keyword — product name, type, brand, or use case' },
                    category: { type: 'STRING', description: 'Category filter e.g. laptops, smartphones, furniture' },
                    maxPrice: { type: 'NUMBER', description: 'Maximum price in USD' },
                    minRating: { type: 'NUMBER', description: 'Minimum rating between 1-5' },
                },
            },
        },
        {
            name: 'get_product_details',
            description: 'Get full details of a product: description, price, warranty, shipping, return policy, reviews. Use productId from search results.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    productId: { type: 'STRING', description: 'MongoDB product ID from search results' },
                    productName: { type: 'STRING', description: 'Product name if no ID available' },
                },
            },
        },
        {
            name: 'add_to_cart',
            description: "Add a product to the user's cart. Always use productId from search results. Can specify quantity.",
            parameters: {
                type: 'OBJECT',
                properties: {
                    productId: { type: 'STRING', description: 'Product ID (preferred — use from search results)' },
                    productName: { type: 'STRING', description: 'Product name fallback' },
                    quantity: { type: 'NUMBER', description: 'Quantity to add, default 1' },
                },
            },
        },
        {
            name: 'view_cart',
            description: "Show the user's current cart with all items, quantities, prices and total.",
            parameters: { type: 'OBJECT', properties: {} },
        },
        {
            name: 'remove_from_cart',
            description: "Remove a specific product from the user's cart.",
            parameters: {
                type: 'OBJECT',
                properties: {
                    productId: { type: 'STRING', description: 'Product ID to remove' },
                    productName: { type: 'STRING', description: 'Product name to remove' },
                },
            },
        },
        {
            name: 'clear_cart',
            description: "Empty the user's entire cart. Only call if user explicitly asks to clear all items.",
            parameters: { type: 'OBJECT', properties: {} },
        },
        {
            name: 'place_order',
            description: "Checkout — convert the user's cart into a confirmed order. Call when user says checkout, place order, or buy now.",
            parameters: {
                type: 'OBJECT',
                properties: {
                    paymentMethod: { type: 'STRING', description: 'Payment method: cod, card. Default: cod' },
                },
            },
        },
        {
            name: 'get_order_history',
            description: "Show the user's recent orders with status, total, and date.",
            parameters: { type: 'OBJECT', properties: {} },
        },
        {
            name: 'get_recommendations',
            description: "Get AI-powered personalized product recommendations based on user's purchase history and preferences.",
            parameters: { type: 'OBJECT', properties: {} },
        },
        {
            name: 'get_categories',
            description: 'List all available product categories in the store.',
            parameters: { type: 'OBJECT', properties: {} },
        },
        {
            name: 'add_to_wishlist',
            description: "Save a product to the user's wishlist for later.",
            parameters: {
                type: 'OBJECT',
                properties: {
                    productId: { type: 'STRING', description: 'Product ID (preferred)' },
                    productName: { type: 'STRING', description: 'Product name fallback' },
                },
            },
        },
    ],
};
