// Bazario Agent — Powered by Groq (Llama 3 70B) with Native Function Calling
// Uses groq-sdk

import Groq from 'groq-sdk';
import { groqToolDeclarations, toolFunctions } from './tools';
import { buildBehaviorPrompt } from './memory';

// ─── System prompt factory ────────────────────────────────────────────────────
function buildSystemPrompt(behaviorProfile) {
    const behaviorBlock = buildBehaviorPrompt(behaviorProfile);

    return `You are Bazario, an intelligent and friendly AI shopping assistant for an online e-commerce store.

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
- DO NOT call the same tool multiple times in a row if it gives you the same result. If a cart or order history is empty, tell the user it's empty.
- Always confirm what action you just performed.
- Be concise, warm, and use emojis naturally.
- If asked about non-shopping topics, politely redirect to shopping help.
- Format prices as $X.XX and ratings as X/5 ⭐.
- After searching, briefly summarize the top result and offer to add it to cart.

${behaviorBlock}`;
}

// ─── Execute a single tool call ───────────────────────────────────────────────
async function executeTool(name, argsStr, userId) {
    const fn = toolFunctions[name];
    if (!fn) return `Unknown tool: ${name}`;
    try {
        const args = JSON.parse(argsStr || '{}');
        return await fn(args, userId);
    } catch (err) {
        console.error(`[Tool Error] ${name}:`, err.message);
        return `Tool error: ${err.message}`;
    }
}

// ─── Main agent runner ────────────────────────────────────────────────────────
export async function runAgent({ userId, userMessage, historyMessages, behaviorProfile }) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not set.');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const systemPrompt = buildSystemPrompt(behaviorProfile);

    // Convert stored history to Groq chat format
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    historyMessages.slice(-10).forEach(m => {
        const role = m._getType?.() === 'human' ? 'user' : 'assistant';
        const text = typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '';
        if (text) messages.push({ role, content: text });
    });

    messages.push({ role: 'user', content: userMessage });

    // ─── Agentic loop: send message, handle tool calls, repeat ───────────────
    const toolsUsed = [];
    const toolResults = [];
    let finalText = '';

    // Loop up to 5 tool rounds (prevents infinite loops)
    for (let round = 0; round < 5; round++) {
        const response = await groq.chat.completions.create({
            model: 'qwen/qwen3-32b',
            messages: messages,
            tools: groqToolDeclarations,
            tool_choice: 'auto',
            temperature: 0.4,
            max_tokens: 1024,
        });

        const responseMessage = response.choices[0]?.message;
        if (!responseMessage) break;

        // Add the assistant's response to the conversation history
        messages.push(responseMessage);

        const toolCalls = responseMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            // No more tool calls — we have our final answer
            finalText = responseMessage.content || '';
            break;
        }

        // Execute all tool calls in parallel
        await Promise.all(
            toolCalls.map(async (toolCall) => {
                const name = toolCall.function.name;
                toolsUsed.push(name);
                console.log(`[Agent] Calling tool: ${name}`, toolCall.function.arguments);
                
                const result = await executeTool(name, toolCall.function.arguments, userId);
                toolResults.push({ tool: name, content: String(result) });
                console.log(`[Agent] Tool result (${name}):`, String(result).slice(0, 100));

                // Append the tool result to the messages array
                messages.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: name,
                    content: String(result),
                });
            })
        );
    }

    // Fallback: extract text if loop ended without explicit text
    if (!finalText) {
        finalText = "I'm sorry, I couldn't process that request. Please try again.";
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
        newMessages: [],
    };
}
