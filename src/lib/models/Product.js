import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    dummyJsonId: { type: Number },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    brand: { type: String, default: '' },
    category: { type: String, required: true },
    tags: [{ type: String }],
    thumbnail: { type: String },
    images: [{ type: String }],
    warrantyInformation: { type: String },
    shippingInformation: { type: String },
    availabilityStatus: { type: String },
    returnPolicy: { type: String },
    reviewsSummary: {
        totalReviews: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
    },
}, { timestamps: true });

ProductSchema.index({ title: 'text', description: 'text', tags: 'text', brand: 'text', category: 'text' });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
