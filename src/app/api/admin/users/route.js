import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET() {
    try {
        await connectDB();
        const users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();
        return NextResponse.json({ users });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await connectDB();
        const { userId, role } = await request.json();

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true, select: '-password' }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
