// Memory management for the LangChain AI agent
// Handles: short-term (session history) + long-term (user behavior profile)

import mongoose from 'mongoose';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import connectDB from '@/lib/mongodb';
import UserBehavior from '@/lib/models/UserBehavior';

// ─── Short-term memory: session chat history via MongoDB ──────────────────────
export async function getChatHistory(sessionId) {
    await connectDB();
    const collection = mongoose.connection.db.collection('agent_chat_sessions');
    return new MongoDBChatMessageHistory({ collection, sessionId });
}

// ─── Long-term memory: user behavior profile ──────────────────────────────────
export async function getUserBehaviorProfile(userId) {
    if (!userId) return null;
    try {
        await connectDB();
        return await UserBehavior.findOne({ user: userId }).lean();
    } catch {
        return null;
    }
}

// Update behavior signals after each turn (called async, non-blocking)
export async function updateUserBehavior(userId, signals = {}) {
    if (!userId) return;
    try {
        await connectDB();
        const inc = { totalMessages: 1 };

        if (signals.searchedCategory) {
            const key = signals.searchedCategory.toLowerCase().replace(/\s+/g, '_');
            inc[`searchedCategories.${key}`] = 1;
        }
        if (signals.keyword) {
            const key = signals.keyword.toLowerCase().replace(/\s+/g, '_').slice(0, 40);
            inc[`searchedKeywords.${key}`] = 1;
        }
        if (signals.viewedBrand) {
            const key = signals.viewedBrand.toLowerCase().replace(/\s+/g, '_');
            inc[`viewedBrands.${key}`] = 1;
        }
        if (signals.purchasedCategory) {
            const key = signals.purchasedCategory.toLowerCase().replace(/\s+/g, '_');
            inc[`purchasedCategories.${key}`] = 1;
        }

        await UserBehavior.findOneAndUpdate(
            { user: userId },
            { $inc: inc, $set: { lastActive: new Date() } },
            { upsert: true }
        );
    } catch (err) {
        console.error('[Memory] updateUserBehavior error:', err.message);
    }
}

// Increment session count at session start
export async function incrementSessionCount(userId) {
    if (!userId) return;
    try {
        await connectDB();
        await UserBehavior.findOneAndUpdate(
            { user: userId },
            { $inc: { totalSessions: 1 }, $set: { lastActive: new Date() } },
            { upsert: true }
        );
    } catch (err) {
        console.error('[Memory] incrementSessionCount error:', err.message);
    }
}

// Build a personalization block to inject into the system prompt
export function buildBehaviorPrompt(profile) {
    if (!profile) return '';

    const top = (map, n = 3) => {
        if (!map || typeof map.entries !== 'function') return '';
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([k]) => k.replace(/_/g, ' '))
            .join(', ');
    };

    const cats = top(profile.searchedCategories);
    const brands = top(profile.viewedBrands);
    const boughtCats = top(profile.purchasedCategories);

    if (!cats && !brands && !boughtCats && !profile.behaviorSummary) return '';

    const lines = ['--- User Behavior Profile (use to personalize responses) ---'];
    if (profile.totalSessions) lines.push(`Sessions: ${profile.totalSessions} | Messages: ${profile.totalMessages || 0}`);
    if (cats) lines.push(`Interested categories: ${cats}`);
    if (brands) lines.push(`Favourite brands: ${brands}`);
    if (boughtCats) lines.push(`Purchased from: ${boughtCats}`);
    if (profile.priceRangePreference?.avg > 0) {
        lines.push(`Price preference: $${profile.priceRangePreference.min}–$${profile.priceRangePreference.max} (avg $${profile.priceRangePreference.avg})`);
    }
    if (profile.behaviorSummary) lines.push(`Summary: ${profile.behaviorSummary}`);
    lines.push('---');

    return lines.join('\n');
}

// Extract behavior signals from the list of tools that were called this turn
export function extractSignalsFromToolCalls(toolsUsed = [], toolResults = []) {
    const signals = {};

    if (toolsUsed.includes('search_products') && toolResults.length > 0) {
        // Try to extract the category from search results text
        const resultText = toolResults.find(r => r.tool === 'search_products')?.content || '';
        const catMatch = resultText.match(/🏷️\s*([a-z-]+)/i);
        if (catMatch) signals.searchedCategory = catMatch[1];
    }

    if (toolsUsed.includes('place_order')) {
        const resultText = toolResults.find(r => r.tool === 'place_order')?.content || '';
        const catMatch = resultText.match(/🏷️\s*([a-z-]+)/i);
        if (catMatch) signals.purchasedCategory = catMatch[1];
    }

    return signals;
}
