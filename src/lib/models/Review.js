import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    reviewerName: { type: String, required: true },
    reviewerEmail: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral',
    },
    sentimentScore: { type: Number, default: 0 },
    sentimentKeywords: [{ type: String }],
}, { timestamps: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
