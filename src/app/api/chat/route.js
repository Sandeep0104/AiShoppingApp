import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { runAgent } from '@/lib/ai/agent';
import {
    getChatHistory,
    getUserBehaviorProfile,
    updateUserBehavior,
    incrementSessionCount,
} from '@/lib/ai/memory';

// Tell Vercel to allow up to 60 seconds for this function (needed for AI + DB)
export const maxDuration = 60;

export async function POST(request) {
    try {
        await connectDB();

        const { message, userId, sessionId } = await request.json();

        // ── Auth guard ──────────────────────────────────────────────────────
        if (!userId) {
            return NextResponse.json({
                reply: '🔐 Please **log in** to chat with ShopAI. Your conversations and recommendations are personalized just for you!',
                action: 'require_login',
            });
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // ── Session & memory ────────────────────────────────────────────────
        const resolvedSessionId = sessionId || `${userId}-${Date.now()}`;
        const isNewSession = !sessionId;

        const [chatHistory, behaviorProfile] = await Promise.all([
            getChatHistory(resolvedSessionId),
            getUserBehaviorProfile(userId),
        ]);

        const historyMessages = await chatHistory.getMessages();

        if (isNewSession) {
            incrementSessionCount(userId).catch(() => {});
        }

        // ── Run the Gemini agent ────────────────────────────────────────────
        const { reply, action, toolsUsed, toolResults } = await runAgent({
            userId,
            userMessage: message,
            historyMessages,
            behaviorProfile,
        });

        // ── Persist conversation turn (human + AI) to MongoDB ──────────────
        try {
            await chatHistory.addMessages([
                { _getType: () => 'human', content: message },
                { _getType: () => 'ai', content: reply },
            ]);
        } catch (e) {
            // Non-fatal — don't let history save failure break the response
            console.error('[Chat API] History save failed:', e.message);
        }

        // ── Update long-term behavior profile ─────────────────────────────
        const signals = { keyword: message.slice(0, 60) };
        if (toolsUsed.includes('search_products')) {
            const catMatch = toolResults.find(r => r.tool === 'search_products')?.content?.match(/🏷️\s*([^\s|]+)/);
            if (catMatch) signals.searchedCategory = catMatch[1];
        }
        if (toolsUsed.includes('place_order')) {
            signals.purchasedCategory = 'general';
        }
        updateUserBehavior(userId, signals).catch(() => {});

        // ── Tool labels for UI chips ────────────────────────────────────────
        const toolLabels = {
            search_products: '🔍 Searching products',
            get_product_details: '📋 Fetching details',
            add_to_cart: '🛒 Adding to cart',
            view_cart: '🛒 Loading cart',
            remove_from_cart: '🗑️ Removing item',
            clear_cart: '🗑️ Clearing cart',
            place_order: '📦 Placing order',
            get_order_history: '📦 Loading orders',
            get_recommendations: '💡 Finding picks',
            get_categories: '📂 Loading categories',
            add_to_wishlist: '💖 Saving to wishlist',
        };
        const thinkingSteps = toolsUsed.map(t => toolLabels[t] || `🔧 ${t}`);

        return NextResponse.json({
            reply,
            action,
            toolsUsed,
            thinkingSteps,
            sessionId: resolvedSessionId,
        });

    } catch (error) {
        console.error('[Chat API] Error:', error);

        if (error.message?.includes('GOOGLE_API_KEY')) {
            return NextResponse.json({
                reply: '⚠️ AI not configured. Add GOOGLE_API_KEY to your environment variables.',
                action: null,
            });
        }

        return NextResponse.json({
            reply: `😅 Something went wrong: ${error.message}. Please try again!`,
            action: null,
        }, { status: 500 });
    }
}
