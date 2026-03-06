import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getHybridRecommendations } from '@/lib/ai/recommendations';
import Product from '@/lib/models/Product';

export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let recommendations;

        if (userId) {
            recommendations = await getHybridRecommendations(userId, 12);
        } else {
            // Non-authenticated users get popular products
            recommendations = await Product.find()
                .sort({ rating: -1 })
                .limit(12)
                .lean();
        }

        return NextResponse.json({ recommendations });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
