// Lexicon-based sentiment analyzer for product reviews
// No external API needed - uses scored word lists

const POSITIVE_WORDS = {
    'excellent': 3, 'amazing': 3, 'outstanding': 3, 'perfect': 3, 'fantastic': 3,
    'wonderful': 3, 'brilliant': 3, 'superb': 3, 'incredible': 3, 'exceptional': 3,
    'love': 2, 'great': 2, 'awesome': 2, 'good': 2, 'nice': 2,
    'happy': 2, 'pleased': 2, 'satisfied': 2, 'impressed': 2, 'recommend': 2,
    'best': 2, 'beautiful': 2, 'elegant': 2, 'stylish': 2, 'comfortable': 2,
    'durable': 2, 'reliable': 2, 'fast': 2, 'smooth': 2, 'lightweight': 2,
    'quality': 1, 'value': 1, 'worth': 1, 'fine': 1, 'decent': 1,
    'solid': 1, 'sturdy': 1, 'useful': 1, 'helpful': 1, 'effective': 1,
    'convenient': 1, 'practical': 1, 'premium': 2, 'professional': 1, 'sleek': 1,
    'like': 1, 'enjoy': 1, 'delight': 2, 'top': 1, 'superior': 2,
    'highly': 2, 'exceeded': 2, 'expectations': 1, 'flawless': 3, 'well-made': 2,
};

const NEGATIVE_WORDS = {
    'terrible': -3, 'horrible': -3, 'awful': -3, 'worst': -3, 'disgusting': -3,
    'dreadful': -3, 'pathetic': -3, 'useless': -3, 'rubbish': -3, 'abysmal': -3,
    'bad': -2, 'poor': -2, 'disappointing': -2, 'disappointed': -2, 'waste': -2,
    'broken': -2, 'defective': -2, 'cheap': -2, 'flimsy': -2, 'fragile': -2,
    'slow': -2, 'ugly': -2, 'uncomfortable': -2, 'unreliable': -2, 'overpriced': -2,
    'hate': -2, 'dislike': -2, 'avoid': -2, 'return': -1, 'refund': -1,
    'damaged': -2, 'faulty': -2, 'malfunctioning': -2, 'regret': -2, 'unhappy': -2,
    'frustrating': -2, 'annoying': -2, 'mediocre': -1, 'boring': -1, 'bland': -1,
    'problem': -1, 'issue': -1, 'complaint': -1, 'unfortunately': -1, 'barely': -1,
    'difficult': -1, 'confusing': -1, 'small': -1, 'wrong': -2, 'fail': -2,
    'never': -1, 'wouldn\'t': -1, 'not': -1, 'don\'t': -1, 'isn\'t': -1,
};

const NEGATORS = ['not', 'no', 'never', 'neither', 'nor', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "isn't", "aren't", "wasn't", "weren't"];
const INTENSIFIERS = { 'very': 1.5, 'really': 1.5, 'extremely': 2, 'absolutely': 2, 'totally': 1.5, 'completely': 1.5, 'highly': 1.5, 'incredibly': 2, 'super': 1.5, 'so': 1.3 };

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

        // Check for negators
        if (NEGATORS.includes(word)) {
            negated = true;
            continue;
        }

        // Check for intensifiers
        if (INTENSIFIERS[word]) {
            intensifier = INTENSIFIERS[word];
            continue;
        }

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
            if (negated) {
                wordScore *= -0.5; // Partial negation
            }
            totalScore += wordScore;
        }

        // Reset modifiers after use
        negated = false;
        intensifier = 1;
    }

    // Normalize score to -1 to 1 range
    const maxPossible = Math.max(words.length * 0.5, 1);
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / maxPossible));

    let sentiment;
    if (normalizedScore > 0.1) {
        sentiment = 'positive';
    } else if (normalizedScore < -0.1) {
        sentiment = 'negative';
    } else {
        sentiment = 'neutral';
    }

    return {
        sentiment,
        score: Math.round(normalizedScore * 100) / 100,
        keywords: [...new Set(keywords)],
    };
}

// Analyze multiple reviews and return summary
export function analyzeReviewsSentiment(reviews) {
    const results = reviews.map(review => ({
        ...review,
        ...analyzeSentiment(review.comment || review.text || ''),
    }));

    const summary = {
        totalReviews: results.length,
        averageRating: results.reduce((sum, r) => sum + (r.rating || 0), 0) / (results.length || 1),
        positive: results.filter(r => r.sentiment === 'positive').length,
        negative: results.filter(r => r.sentiment === 'negative').length,
        neutral: results.filter(r => r.sentiment === 'neutral').length,
    };

    return { results, summary };
}
