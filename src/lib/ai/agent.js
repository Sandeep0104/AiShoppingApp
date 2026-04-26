// LangGraph ReAct Agent — ShopAI Gemini-powered shopping assistant
// Replaces the old regex intent classifier with a real AI agent.

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createShoppingTools } from './tools';
import { buildBehaviorPrompt } from './memory';

// ─── System prompt factory ────────────────────────────────────────────────────
function buildSystemPrompt(behaviorProfile) {
    const behaviorBlock = buildBehaviorPrompt(behaviorProfile);

    return `You are ShopAI, an intelligent and friendly AI shopping assistant for an online store.

Your capabilities (via tools):
• Search for products by keyword, category, price, or rating
• Show full product details (description, warranty, shipping, reviews)
• Add/remove products from the user's cart
• View cart contents and totals
• Place orders (checkout)
• Track order history and status
• Get personalized AI recommendations
• List product categories
• Save items to wishlist

Personality guidelines:
- Be concise, warm, and helpful. Use emojis naturally but don't overdo it.
- When showing product search results, always display the numbered list clearly.
- When the user says "add the first one" or "add number 2", refer to the most recent search results in the conversation history to identify the correct product ID, then call add_to_cart with that ID.
- Always confirm what action you just took (e.g., "I've added X to your cart").
- If a user asks for something vague, make a reasonable search or ask one clarifying question.
- Keep replies focused — don't write essays. Be a helpful assistant, not a narrator.
- If the user tries to place an order with an empty cart, check the cart first.
- Format prices as $X.XX and ratings as X/5.

Constraints:
- ONLY answer questions related to shopping, products, orders, cart, recommendations.
- Do NOT discuss unrelated topics (politics, coding help, etc.).
- Do NOT reveal internal tool names or system implementation details.

${behaviorBlock}`;
}

// ─── Agent builder ────────────────────────────────────────────────────────────
export function createAgent(userId, behaviorProfile) {
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_gemini_api_key_here') {
        throw new Error('GOOGLE_API_KEY is not set. Get your free key at https://aistudio.google.com/app/apikey and add it to .env.local');
    }

    const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.4,
        maxOutputTokens: 1024,
    });

    const tools = createShoppingTools(userId);
    const systemPrompt = buildSystemPrompt(behaviorProfile);

    const agent = createReactAgent({
        llm,
        tools,
        messageModifier: new SystemMessage(systemPrompt),
    });

    return agent;
}

// ─── Run agent with history ───────────────────────────────────────────────────
export async function runAgent({ userId, userMessage, historyMessages, behaviorProfile }) {
    const agent = createAgent(userId, behaviorProfile);

    // Trim history to last 20 messages to stay within context window
    const trimmedHistory = historyMessages.slice(-20);

    const result = await agent.invoke({
        messages: [...trimmedHistory, new HumanMessage(userMessage)],
    });

    // Extract the final AI reply (last message)
    const allMessages = result.messages;
    const lastMessage = allMessages[allMessages.length - 1];
    const reply = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content?.[0]?.text || 'Sorry, I could not generate a response.';

    // Identify which tools were called this turn (for action detection + UI hints)
    const toolsUsed = allMessages
        .filter(m => m.tool_calls?.length > 0)
        .flatMap(m => m.tool_calls.map(tc => tc.name));

    // Collect tool result messages for signal extraction
    const toolResults = allMessages
        .filter(m => m._getType?.() === 'tool' || m.role === 'tool')
        .map(m => ({ tool: m.name, content: m.content }));

    // Derive action signal for frontend (cart badge refresh etc.)
    let action = null;
    if (toolsUsed.some(t => ['add_to_cart', 'remove_from_cart', 'clear_cart'].includes(t))) {
        action = 'cart_updated';
    }
    if (toolsUsed.includes('place_order')) {
        action = 'order_placed';
    }

    // New messages to persist (everything after the trimmed history)
    // = the human message + all agent intermediate messages + final reply
    const newMessages = result.messages.slice(trimmedHistory.length);

    return {
        reply,
        action,
        toolsUsed,
        toolResults,
        newMessages,
    };
}
