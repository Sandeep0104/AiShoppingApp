import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Review from '@/lib/models/Review';

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const product = await Product.findById(id).lean();
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const reviews = await Review.find({ product: id })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ product, reviews });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Admin: Update product
export async function PUT(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const data = await request.json();
        const product = await Product.findByIdAndUpdate(id, data, { new: true });
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ product });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Admin: Delete product
export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        await Product.findByIdAndDelete(id);
        await Review.deleteMany({ product: id });
        return NextResponse.json({ message: 'Product deleted' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
