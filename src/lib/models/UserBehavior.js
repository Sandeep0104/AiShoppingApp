import mongoose from 'mongoose';

const UserBehaviorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Frequency maps — how many times the user searched/bought each category/brand
    searchedCategories: { type: Map, of: Number, default: {} },
    searchedKeywords: { type: Map, of: Number, default: {} },
    viewedBrands: { type: Map, of: Number, default: {} },
    purchasedCategories: { type: Map, of: Number, default: {} },

    // Price range derived from viewed & purchased products
    priceRangePreference: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 10000 },
        avg: { type: Number, default: 500 },
    },

    // Session & engagement stats
    totalSessions: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },

    // LLM-generated plain-English summary refreshed every 5 sessions
    behaviorSummary: { type: String, default: '' },

    lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.UserBehavior || mongoose.model('UserBehavior', UserBehaviorSchema);
