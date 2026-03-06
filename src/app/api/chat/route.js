import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { classifyIntent, formatProductsForChat, formatOrdersForChat, formatCartForChat } from '@/lib/ai/chatbot';

export async function POST(request) {
    try {
        await connectDB();
        const { message, userId, context } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const { intent, confidence, extracted, staticResponse } = classifyIntent(message);

        // If there's a static response, return it
        if (staticResponse) {
            return NextResponse.json({
                reply: staticResponse,
                intent,
                confidence,
                action: null,
                data: null,
            });
        }

        let reply = '';
        let action = intent;
        let data = null;

        switch (intent) {
            case 'search_product': {
                const searchTerm = extracted || message;
                const products = await Product.find({
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { category: { $regex: searchTerm, $options: 'i' } },
                        { brand: { $regex: searchTerm, $options: 'i' } },
                        { tags: { $regex: searchTerm, $options: 'i' } },
                    ],
                }).limit(5).lean();

                reply = formatProductsForChat(products);
                data = { products };
                break;
            }

            case 'product_details': {
                const searchTerm = extracted || '';
                const product = await Product.findOne({
                    title: { $regex: searchTerm, $options: 'i' },
                }).lean();

                if (product) {
                    reply = `📦 **${product.title}**\n\n${product.description}\n\n💰 **Price:** $${product.price}${product.discountPercentage > 0 ? ` (${product.discountPercentage}% off!)` : ''}\n⭐ **Rating:** ${product.rating}/5\n🏷️ **Category:** ${product.category}\n🏪 **Brand:** ${product.brand || 'N/A'}\n📦 **Stock:** ${product.stock} units (${product.availabilityStatus})\n🚚 **Shipping:** ${product.shippingInformation || 'Standard'}\n📋 **Warranty:** ${product.warrantyInformation || 'N/A'}\n↩️ **Returns:** ${product.returnPolicy || 'N/A'}\n\n📊 **Review Sentiment:**\n✅ Positive: ${product.reviewsSummary?.positive || 0} | ❌ Negative: ${product.reviewsSummary?.negative || 0} | ➖ Neutral: ${product.reviewsSummary?.neutral || 0}\n\nWould you like to add this to your cart?`;
                    data = { product };
                } else {
                    reply = `I couldn't find a product matching "${searchTerm}". Try searching with different keywords!`;
                }
                break;
            }

            case 'add_to_cart': {
                if (!userId) {
                    reply = "Please log in first to add items to your cart! 🔐";
                    break;
                }
                const currentProduct = context?.currentProduct;
                if (currentProduct) {
                    await User.findByIdAndUpdate(userId, {
                        $push: { cart: { product: currentProduct._id || currentProduct, quantity: 1 } },
                    });
                    reply = `✅ Added to your cart! Want to continue shopping or checkout?`;
                    action = 'cart_updated';
                } else {
                    reply = "Which product would you like to add? Search for a product first, then I can add it to your cart.";
                }
                break;
            }

            case 'view_cart': {
                if (!userId) {
                    reply = "Please log in to view your cart! 🔐";
                    break;
                }
                const user = await User.findById(userId).populate('cart.product').lean();
                reply = formatCartForChat(user?.cart || []);
                data = { cart: user?.cart || [] };
                break;
            }

            case 'clear_cart': {
                if (!userId) {
                    reply = "Please log in first! 🔐";
                    break;
                }
                await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
                reply = "🗑️ Your cart has been cleared!";
                action = 'cart_updated';
                break;
            }

            case 'place_order': {
                if (!userId) {
                    reply = "Please log in to place an order! 🔐";
                    break;
                }
                const orderUser = await User.findById(userId).populate('cart.product').lean();
                if (!orderUser?.cart?.length) {
                    reply = "Your cart is empty! Add some products first. 🛒";
                    break;
                }
                const items = orderUser.cart.map(c => ({
                    product: c.product._id,
                    title: c.product.title,
                    price: c.product.price,
                    quantity: c.quantity,
                    thumbnail: c.product.thumbnail,
                }));
                const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                const order = await Order.create({
                    user: userId,
                    items,
                    total,
                    status: 'pending',
                });
                await User.findByIdAndUpdate(userId, {
                    $set: { cart: [] },
                    $addToSet: { purchaseHistory: { $each: items.map(i => i.product) } },
                });
                reply = `🎉 **Order placed successfully!**\n\n📦 Order #${order._id.toString().slice(-6).toUpperCase()}\n💰 Total: $${total.toFixed(2)}\n📦 Items: ${items.length}\n⏳ Status: Pending\n\nYou can track your order from the dashboard!`;
                data = { order };
                action = 'order_placed';
                break;
            }

            case 'order_status': {
                if (!userId) {
                    reply = "Please log in to check your orders! 🔐";
                    break;
                }
                const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean();
                reply = formatOrdersForChat(orders);
                data = { orders };
                break;
            }

            case 'get_recommendations': {
                const products = await Product.find().sort({ rating: -1 }).limit(5).lean();
                reply = `💡 **Recommended for you:**\n\n${formatProductsForChat(products)}`;
                data = { products };
                break;
            }

            case 'categories': {
                const categories = await Product.distinct('category');
                reply = `📂 **Available Categories:**\n\n${categories.map(c => `• ${c}`).join('\n')}\n\nType a category name to browse products!`;
                data = { categories };
                break;
            }

            case 'wishlist': {
                if (!userId) {
                    reply = "Please log in to manage your wishlist! 🔐";
                    break;
                }
                const currentProd = context?.currentProduct;
                if (currentProd) {
                    await User.findByIdAndUpdate(userId, {
                        $addToSet: { wishlist: currentProd._id || currentProd },
                    });
                    reply = "💖 Added to your wishlist!";
                } else {
                    reply = "Search for a product first, then I can add it to your wishlist!";
                }
                break;
            }

            default:
                reply = "I'm not sure what you mean. Type **help** to see what I can do! 😊";
        }

        return NextResponse.json({
            reply,
            intent,
            confidence,
            action,
            data,
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json({
            reply: "Sorry, something went wrong. Please try again! 😅",
            intent: 'error',
            error: error.message,
        }, { status: 500 });
    }
}
