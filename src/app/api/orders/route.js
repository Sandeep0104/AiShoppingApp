import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';

export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ orders });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const { userId, items, shippingAddress } = await request.json();

        if (!userId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
        }

        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = await Order.create({
            user: userId,
            items,
            total,
            shippingAddress: shippingAddress || {},
            status: 'pending',
        });

        // Add to purchase history
        const productIds = items.map(i => i.product).filter(Boolean);
        await User.findByIdAndUpdate(userId, {
            $addToSet: { purchaseHistory: { $each: productIds } },
            $set: { cart: [] }, // Clear cart after order
        });

        return NextResponse.json({ order, message: 'Order placed successfully!' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
