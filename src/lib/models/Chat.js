import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [{
        role: { type: String, enum: ['user', 'bot'], required: true },
        content: { type: String, required: true },
        action: { type: String },
        data: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
    }],
    context: {
        currentProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        lastIntent: String,
        cartPreview: [{ type: mongoose.Schema.Types.Mixed }],
    },
}, { timestamps: true });

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
