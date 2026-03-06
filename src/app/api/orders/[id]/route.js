import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function PUT(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const { status } = await request.json();
        const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        return NextResponse.json({ order });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
