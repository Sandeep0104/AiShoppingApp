import mongoose from 'mongoose';

// Enhanced Chat schema for LangChain agent — stores full message thread per session
const ChatSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, index: true },

    messages: [{
        role: { type: String, enum: ['human', 'ai', 'tool'], required: true },
        content: { type: String, required: true },
        toolName: { type: String },      // populated for role=tool
        toolCallId: { type: String },    // links tool result back to AI tool_call
        timestamp: { type: Date, default: Date.now },
    }],

    // Which tools were invoked this session (for analytics & UI hints)
    toolsUsed: [{ type: String }],

    // Behavior signals extracted this session
    behaviorSignals: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
