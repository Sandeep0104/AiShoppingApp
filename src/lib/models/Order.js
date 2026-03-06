import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        thumbnail: String,
    }],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
    },
    paymentMethod: { type: String, default: 'cod' },
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
