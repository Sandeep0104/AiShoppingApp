# Team Member 1: AI & Machine Learning Engineer

**Focus:** Natural Language Processing, Sentiment Analysis, and Recommendation Systems
**Key Responsibility:** Developing the core intelligence of the platform without relying on paid external APIs (like OpenAI).

## Major Contributions

### 1. NLP Chatbot Engine (`lib/ai/chatbot.js`)
Built a robust, rule-based NLP engine capable of intent classification across 14 different intents (e.g., searching products, adding to cart, checking order status, getting recommendations, wishlist, categories). 
The system implemented entity extraction using Regular Expressions to handle dynamic user input such as extracting product names or search queries from natural language text.

**Key Implementation Details:**
- Defined extensive regex pattern matching for over 14 conversation intents.
- Handled fallback gracefully for unknown or vague queries, guiding users on how to interact.
- Extracted parameters seamlessly to pass data context to backend functions.

**Important Code Snippets:**
```javascript
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
```

### 2. Sentiment Analysis Module (`lib/ai/sentiment.js`)
Engineered a custom lexicon-based sentiment analyzer. The algorithm carefully processes text without relying on external libraries. It normalizes text and calculates a score based on a predefined dictionary of words. 
Crucially, it handles negations (e.g., "not good") by partially reversing scores, and intensifiers (e.g., "very bad") by scaling the sentiment weight. It outputs a positive, negative, or neutral classification along with an aggregate score.
Applied this to automatically tag and analyze all customer reviews intelligently.

**Key Implementation Details:**
- Custom dictionaries for positive and negative lexicons, negators, and intensifiers.
- Dynamic sentiment scoring system based on context-aware word weights (accounting for nearby intensifiers and negations).

**Important Code Snippets:**
```javascript
export function analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
        return { sentiment: 'neutral', score: 0, keywords: [] };
    }

    const words = text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/);
    let totalScore = 0;
    const keywords = [];
    let negated = false;
    let intensifier = 1;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        // Check for negators and intensifiers
        if (NEGATORS.includes(word)) { negated = true; continue; }
        if (INTENSIFIERS[word]) { intensifier = INTENSIFIERS[word]; continue; }

        let wordScore = 0;
        if (POSITIVE_WORDS[word] !== undefined) {
            wordScore = POSITIVE_WORDS[word];
            keywords.push(word);
        } else if (NEGATIVE_WORDS[word] !== undefined) {
            wordScore = NEGATIVE_WORDS[word];
            keywords.push(word);
        }

        if (wordScore !== 0) {
            wordScore *= intensifier;
            if (negated) wordScore *= -0.5; // Partial negation
            totalScore += wordScore;
        }

        // Reset modifiers after use
        negated = false;
        intensifier = 1;
    }

    // Normalize score to -1 to 1 range
    const maxPossible = Math.max(words.length * 0.5, 1);
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / maxPossible));
    
    // ... Returns positive, negative, or neutral based on normalizedScore
}
```

### 3. Recommendation Engine (`lib/ai/recommendations.js`)
Designed a sophisticated hybrid recommendation system tailored to user behavior. 
It seamlessly combines Content-Based Filtering (matching product categories, tags, and brands to find similar items) and Collaborative Filtering (analyzing the purchase history of similar users) to deliver highly personalized product suggestions on the user dashboard.
It incorporates a weighted scoring system, heavily weighting content behavior (40%), collaborative behavior (35%), and falling back to general popularity (25%) when user data is sparse.

**Key Implementation Details:**
- Computes content similarity efficiently using matched tags and shared attributes.
- Leverages collective user data for grouping associated purchases in collaborative processing.
- Combines algorithms dynamically based on data availability constraints using a hybrid weighting parameter.

**Important Code Snippets:**
```javascript
// Hybrid recommendation: combines content + collaborative + popularity
export async function getHybridRecommendations(userId, limit = 12) {
    try {
        // ... Retrieve user interactions (orders, wishlist, cart)
        const recommendations = new Map();

        // 1. Content-based recommendations (weight: 0.4)
        if (interactedIds.length > 0) {
            const contentRecs = await getContentBasedRecommendations(interactedIds, limit);
            contentRecs.forEach((p, i) => {
                const id = p._id.toString();
                if (!recommendations.has(id)) recommendations.set(id, { product: p, score: 0 });
                recommendations.get(id).score += (limit - i) * 0.4;
            });
        }

        // 2. Collaborative filtering (weight: 0.35)
        const collabRecs = await getCollaborativeRecommendations(userId, limit);
        collabRecs.forEach((p, i) => {
            const id = p._id.toString();
            if (!recommendations.has(id)) recommendations.set(id, { product: p, score: 0 });
            recommendations.get(id).score += (limit - i) * 0.35;
        });

        // 3. Popular products fallback (weight: 0.25)
        const popular = await Product.find({ _id: { $nin: interactedIds } })
                                     .sort({ rating: -1, 'reviewsSummary.totalReviews': -1 }).limit(limit).lean();

        popular.forEach((p, i) => {
            const id = p._id.toString();
            if (!recommendations.has(id)) recommendations.set(id, { product: p, score: 0 });
            recommendations.get(id).score += (limit - i) * 0.25;
        });

        // Sort by hybrid score and return
        return [...recommendations.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(r => r.product);
    } catch (error) {
        return Product.find().sort({ rating: -1 }).limit(limit).lean();
    }
}
```
