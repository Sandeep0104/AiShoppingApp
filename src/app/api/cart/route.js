import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ cart: [] });
        }

        const user = await User.findById(userId).populate('cart.product').lean();
        return NextResponse.json({ cart: user?.cart || [] });
    } catch (error) {
        console.error('Cart GET error:', error.message);
        return NextResponse.json({ cart: [], error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const { userId, productId, quantity = 1 } = await request.json();

        if (!userId || !productId) {
            return NextResponse.json({ error: 'User ID and Product ID required' }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const existingItem = user.cart.find(
            item => item.product.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({ product: productId, quantity });
        }

        await user.save();
        const updated = await User.findById(userId).populate('cart.product').lean();

        return NextResponse.json({ cart: updated.cart, message: 'Cart updated' });
    } catch (error) {
        console.error('Cart POST error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await connectDB();
        const { userId, productId, quantity } = await request.json();

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const item = user.cart.find(i => i.product.toString() === productId);

        if (item) {
            if (quantity <= 0) {
                user.cart = user.cart.filter(i => i.product.toString() !== productId);
            } else {
                item.quantity = quantity;
            }
            await user.save();
        }

        const updated = await User.findById(userId).populate('cart.product').lean();
        return NextResponse.json({ cart: updated.cart });
    } catch (error) {
        console.error('Cart PUT error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Valid User ID required' }, { status: 400 });
        }

        await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
        return NextResponse.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Cart DELETE error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
