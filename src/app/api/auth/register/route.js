import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request) {
    try {
        await connectDB();
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
        });

        return NextResponse.json({
            message: 'Registration successful',
            user: { id: user._id, name: user.name, email: user.email },
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Registration failed: ' + error.message }, { status: 500 });
    }
}
