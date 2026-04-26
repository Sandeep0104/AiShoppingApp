import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { runAgent } from '@/lib/ai/agent';
import {
    getChatHistory,
    getUserBehaviorProfile,
    updateUserBehavior,
    incrementSessionCount,
    extractSignalsFromToolCalls,
} from '@/lib/ai/memory';

export async function POST(request) {
    try {
        await connectDB();

        const { message, userId, sessionId } = await request.json();

        // ── Auth guard: only logged-in users may chat ──────────────────────
        if (!userId) {
            return NextResponse.json({
                reply: '🔐 Please **log in** to chat with the ShopAI assistant. Your conversations and recommendations are personalized just for you!',
                action: 'require_login',
            });
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // ── Resolve session ID ─────────────────────────────────────────────
        // sessionId comes from the client; it's a UUID created once per browser session.
        const resolvedSessionId = sessionId || `${userId}-${Date.now()}`;
        const isNewSession = !sessionId;

        // ── Load memory ────────────────────────────────────────────────────
        const [chatHistory, behaviorProfile] = await Promise.all([
            getChatHistory(resolvedSessionId),
            getUserBehaviorProfile(userId),
        ]);

        const historyMessages = await chatHistory.getMessages();

        if (isNewSession) {
            // Fire-and-forget — don't block the response
            incrementSessionCount(userId).catch(() => {});
        }

        // ── Run the LangGraph agent ────────────────────────────────────────
        const { reply, action, toolsUsed, toolResults, newMessages } = await runAgent({
            userId,
            userMessage: message,
            historyMessages,
            behaviorProfile,
        });

        // ── Persist new messages to MongoDB (short-term memory) ───────────
        if (newMessages?.length > 0) {
            chatHistory.addMessages(newMessages).catch(err =>
                console.error('[Chat API] Failed to save history:', err.message)
            );
        }

        // ── Update long-term behavior profile (non-blocking) ──────────────
        const signals = extractSignalsFromToolCalls(toolsUsed, toolResults);
        signals.keyword = message.slice(0, 60); // store raw query as keyword signal
        updateUserBehavior(userId, signals).catch(() => {});

        // ── Build a human-readable "thinking" label for the UI ─────────────
        const toolLabels = {
            search_products: '🔍 Searching products',
            get_product_details: '📋 Fetching product details',
            add_to_cart: '🛒 Adding to cart',
            view_cart: '🛒 Loading cart',
            remove_from_cart: '🗑️ Removing from cart',
            clear_cart: '🗑️ Clearing cart',
            place_order: '📦 Placing order',
            get_order_history: '📦 Loading orders',
            get_recommendations: '💡 Finding recommendations',
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

        // Friendly error for missing API key
        if (error.message?.includes('GOOGLE_API_KEY')) {
            return NextResponse.json({
                reply: '⚠️ The AI assistant is not configured yet. Please add your **GOOGLE_API_KEY** to `.env.local`. Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey)',
                action: null,
            });
        }

        return NextResponse.json({
            reply: '😅 Something went wrong on my end. Please try again in a moment!',
            action: null,
            error: error.message,
        }, { status: 500 });
    }
}
