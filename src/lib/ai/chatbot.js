// AI Chatbot with NLP Intent Classification
// Handles: search, product details, cart, orders, reviews, recommendations, help

const INTENT_PATTERNS = {
    greeting: {
        patterns: [/^(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening)|what'?s?\s*up)/i],
        response: "Hello! 👋 I'm your AI shopping assistant. I can help you:\n\n🔍 Search for products\n🛒 Manage your cart\n📦 Track orders\n⭐ Write reviews\n💡 Get personalized recommendations\n\nWhat would you like to do today?",
    },
    search_product: {
        patterns: [
            /(?:search|find|show|look\s*(?:for|up)|browse|get|i\s*(?:want|need|looking\s*for))\s+(.+)/i,
            /(?:do you have|any)\s+(.+?)(?:\s+available)?$/i,
            /^(.+?)\s+(?:products?|items?|stuff)$/i,
        ],
        extract: (match) => match[1]?.trim().replace(/\s*(products?|items?|please|me|some|the)\s*/gi, '').trim(),
    },
    product_details: {
        patterns: [
            /(?:details?|info|information|more|tell\s*me)\s*(?:about|on|for)?\s*(?:product)?\s*(.+)/i,
            /(?:what\s*(?:is|about))\s+(.+)/i,
            /(?:describe|explain)\s+(.+)/i,
        ],
        extract: (match) => match[1]?.trim(),
    },
    add_to_cart: {
        patterns: [
            /(?:add|put)\s+(?:this|it|that|the)?\s*(?:to|in)\s*(?:my)?\s*cart/i,
            /(?:add|put)\s+(.+?)\s*(?:to|in)\s*(?:my)?\s*cart/i,
            /(?:i'?ll?\s*(?:take|buy|get)\s*(?:it|this|that))/i,
            /(?:buy|purchase)\s+(?:this|it|that)/i,
        ],
    },
    view_cart: {
        patterns: [
            /(?:show|view|see|check|open|what'?s?\s*in)\s*(?:my)?\s*cart/i,
            /(?:my\s*)?cart\s*(?:items?|contents?|status)?$/i,
        ],
    },
    remove_from_cart: {
        patterns: [
            /(?:remove|delete|take\s*out)\s+(.+?)\s*(?:from)?\s*(?:my)?\s*cart/i,
            /(?:remove|delete|clear)\s*(?:from)?\s*(?:my)?\s*cart/i,
        ],
    },
    place_order: {
        patterns: [
            /(?:place|make|create|submit)\s*(?:an?\s*)?order/i,
            /(?:checkout|check\s*out)/i,
            /(?:buy|purchase)\s*(?:everything|all|cart)/i,
            /(?:i'?m?\s*ready\s*to\s*(?:buy|order|checkout))/i,
        ],
    },
    order_status: {
        patterns: [
            /(?:order|orders?)\s*(?:status|history|track|tracking)/i,
            /(?:where|track|check)\s*(?:is|are)?\s*(?:my)?\s*orders?/i,
            /(?:my\s*)?orders?$/i,
            /(?:show|view|see)\s*(?:my)?\s*orders?/i,
        ],
    },
    write_review: {
        patterns: [
            /(?:review|rate|feedback)\s+(.+)/i,
            /(?:write|leave|give|add)\s*(?:a)?\s*review/i,
        ],
    },
    get_recommendations: {
        patterns: [
            /(?:recommend|suggestion|suggest|what\s*should\s*i\s*buy)/i,
            /(?:similar|like\s*this|more\s*like)/i,
            /(?:personalized|for\s*me|my\s*recommendations?)/i,
        ],
    },
    help: {
        patterns: [
            /(?:help|assist|support|what\s*can\s*you\s*do|commands?|options?|menu)/i,
        ],
        response: "Here's what I can help you with:\n\n🔍 **Search Products** — \"Show me laptops\" or \"Find wireless headphones\"\n📋 **Product Details** — \"Tell me about [product name]\"\n🛒 **Add to Cart** — \"Add this to my cart\"\n🛍️ **View Cart** — \"Show my cart\"\n📦 **Place Order** — \"Checkout\" or \"Place my order\"\n📊 **Order Status** — \"Track my orders\"\n⭐ **Write Review** — \"Review [product name]\"\n💡 **Recommendations** — \"What should I buy?\" or \"Suggest something\"\n\nJust type naturally — I understand regular questions too!",
    },
    clear_cart: {
        patterns: [
            /(?:clear|empty)\s*(?:my)?\s*cart/i,
        ],
    },
    wishlist: {
        patterns: [
            /(?:wishlist|wish\s*list|save\s*(?:for\s*later|this))/i,
            /(?:add|put)\s+(?:this|it)?\s*to\s*(?:my)?\s*wishlist/i,
        ],
    },
    categories: {
        patterns: [
            /(?:categories|category|types?|what\s*(?:do\s*you|categories?))/i,
            /(?:show|list|browse)\s*(?:all)?\s*categories/i,
        ],
    },
};

export function classifyIntent(message) {
    const trimmed = message.trim();

    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of config.patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    intent,
                    confidence: 0.85,
                    extracted: config.extract ? config.extract(match) : null,
                    staticResponse: config.response || null,
                };
            }
        }
    }

    // Fallback: try to detect if it's a search query (any noun phrase)
    if (trimmed.length > 2 && trimmed.length < 100 && !trimmed.endsWith('?')) {
        return {
            intent: 'search_product',
            confidence: 0.5,
            extracted: trimmed,
            staticResponse: null,
        };
    }

    return {
        intent: 'unknown',
        confidence: 0,
        extracted: null,
        staticResponse: "I'm not sure what you mean. Type **help** to see what I can do! 😊",
    };
}

// Format products for chat display
export function formatProductsForChat(products) {
    if (!products || products.length === 0) {
        return "I couldn't find any products matching that. Try different keywords!";
    }

    const list = products.slice(0, 5).map((p, i) =>
        `**${i + 1}. ${p.title}**\n   💰 $${p.price} ${p.discountPercentage > 0 ? `(${p.discountPercentage}% off!)` : ''}\n   ⭐ ${p.rating}/5 | 📦 ${p.availabilityStatus || 'In Stock'}\n   🏷️ ${p.category}`
    ).join('\n\n');

    return `Here's what I found:\n\n${list}\n\nWould you like details on any of these? Just say "details about [product name]" or "add [number] to cart"!`;
}

export function formatOrdersForChat(orders) {
    if (!orders || orders.length === 0) {
        return "You don't have any orders yet. Start shopping and place your first order! 🛍️";
    }

    const statusEmoji = {
        pending: '⏳', processing: '🔄', shipped: '🚚', delivered: '✅', cancelled: '❌'
    };

    const list = orders.slice(0, 5).map((o, i) =>
        `**Order #${o._id.toString().slice(-6).toUpperCase()}**\n   ${statusEmoji[o.status] || '📦'} Status: ${o.status.charAt(0).toUpperCase() + o.status.slice(1)}\n   💰 Total: $${o.total.toFixed(2)}\n   📅 ${new Date(o.createdAt).toLocaleDateString()}\n   📦 Items: ${o.items.length}`
    ).join('\n\n');

    return `Here are your recent orders:\n\n${list}`;
}

export function formatCartForChat(cart) {
    if (!cart || cart.length === 0) {
        return "Your cart is empty! 🛒\n\nSearch for products to add something. Try: \"Show me electronics\"";
    }

    let total = 0;
    const list = cart.map((item, i) => {
        const itemTotal = (item.product?.price || item.price || 0) * (item.quantity || 1);
        total += itemTotal;
        return `**${i + 1}. ${item.product?.title || item.title}**\n   💰 $${item.product?.price || item.price} × ${item.quantity} = $${itemTotal.toFixed(2)}`;
    }).join('\n\n');

    return `🛒 **Your Cart:**\n\n${list}\n\n💰 **Total: $${total.toFixed(2)}**\n\nReady to checkout? Say "place order" or "checkout"!`;
}
