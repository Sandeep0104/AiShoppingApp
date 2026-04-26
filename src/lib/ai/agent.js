// ShopAI Agent — Powered by Google Gemini 2.0 Flash with Native Function Calling
// Uses @google/generative-ai directly (no LangChain/LangGraph overhead)

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiToolDeclarations, toolFunctions } from './tools';
import { buildBehaviorPrompt } from './memory';

// ─── System prompt factory ────────────────────────────────────────────────────
function buildSystemPrompt(behaviorProfile) {
    const behaviorBlock = buildBehaviorPrompt(behaviorProfile);

    return `You are ShopAI, an intelligent and friendly AI shopping assistant for an online e-commerce store.

You have access to tools that can:
• Search for products by keyword, category, price, or rating
• Show full product details (description, warranty, shipping, reviews)
• Add/remove products from the user's cart
• View cart contents and totals
• Place orders (checkout)
• Track order history and status
• Get personalized product recommendations
• List all product categories
• Save items to wishlist

IMPORTANT RULES:
- ALWAYS use a tool to answer shopping-related questions. Do NOT make up product names, prices, or IDs.
- When showing search results, display the numbered list exactly as returned by the tool.
- When user says "add the first one" or "add number 2", look at the PREVIOUS search results in the conversation to find the product ID, then call add_to_cart with that ID.
- Always confirm what action you just performed.
- Be concise, warm, and use emojis naturally.
- If asked about non-shopping topics, politely redirect to shopping help.
- Format prices as $X.XX and ratings as X/5 ⭐.
- After searching, briefly summarize the top result and offer to add it to cart.

${behaviorBlock}`;
}

// ─── Execute a single tool call ───────────────────────────────────────────────
async function executeTool(name, args, userId) {
    const fn = toolFunctions[name];
    if (!fn) return `Unknown tool: ${name}`;
    try {
        // Tools that need userId receive it as second arg
        return await fn(args || {}, userId);
    } catch (err) {
        console.error(`[Tool Error] ${name}:`, err.message);
        return `Tool error: ${err.message}`;
    }
}

// ─── Main agent runner ────────────────────────────────────────────────────────
export async function runAgent({ userId, userMessage, historyMessages, behaviorProfile }) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is not set.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: buildSystemPrompt(behaviorProfile),
        tools: [geminiToolDeclarations],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
        },
    });

    // Convert stored history to Gemini chat format
    // historyMessages come from MongoDBChatMessageHistory as LangChain BaseMessage objects
    // We extract just role + text content
    const history = historyMessages
        .map(m => {
            const role = m._getType?.() === 'human' ? 'user' : 'model';
            const text = typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '';
            if (!text) return null;
            return { role, parts: [{ text }] };
        })
        .filter(Boolean)
        // Gemini requires alternating user/model turns — filter invalid pairs
        .reduce((acc, msg) => {
            if (acc.length === 0) {
                if (msg.role === 'user') acc.push(msg);
                return acc;
            }
            const last = acc[acc.length - 1];
            if (last.role !== msg.role) acc.push(msg);
            return acc;
        }, [])
        .slice(-10); // last 5 turns (10 messages)

    const chat = model.startChat({ history });

    // ─── Agentic loop: send message, handle tool calls, repeat ───────────────
    const toolsUsed = [];
    const toolResults = [];
    let finalText = '';
    let response = await chat.sendMessage(userMessage);

    // Loop up to 5 tool rounds (prevents infinite loops)
    for (let round = 0; round < 5; round++) {
        const candidate = response.response.candidates?.[0];
        if (!candidate) break;

        const parts = candidate.content?.parts || [];
        const functionCalls = parts.filter(p => p.functionCall);
        const textParts = parts.filter(p => p.text);

        if (functionCalls.length === 0) {
            // No more tool calls — we have our final answer
            finalText = textParts.map(p => p.text).join('');
            break;
        }

        // Execute all tool calls in parallel
        const toolResponseParts = await Promise.all(
            functionCalls.map(async (part) => {
                const { name, args } = part.functionCall;
                toolsUsed.push(name);
                console.log(`[Agent] Calling tool: ${name}`, args);
                const result = await executeTool(name, args, userId);
                toolResults.push({ tool: name, content: result });
                console.log(`[Agent] Tool result (${name}):`, result.slice(0, 100));
                return {
                    functionResponse: {
                        name,
                        response: { result },
                    },
                };
            })
        );

        // Send tool results back to Gemini
        response = await chat.sendMessage(toolResponseParts);
    }

    // Fallback: extract text if loop ended without explicit text
    if (!finalText) {
        const parts = response.response.candidates?.[0]?.content?.parts || [];
        finalText = parts.filter(p => p.text).map(p => p.text).join('') ||
            "I'm sorry, I couldn't process that request. Please try again.";
    }

    // Derive frontend action signal
    let action = null;
    if (toolsUsed.some(t => ['add_to_cart', 'remove_from_cart', 'clear_cart'].includes(t))) {
        action = 'cart_updated';
    }
    if (toolsUsed.includes('place_order')) action = 'order_placed';

    return {
        reply: finalText,
        action,
        toolsUsed,
        toolResults,
        // newMessages not needed with direct SDK — we handle history via MongoDB separately
        newMessages: [],
    };
}
