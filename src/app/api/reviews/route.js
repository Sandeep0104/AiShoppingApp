import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import Product from '@/lib/models/Product';
import { analyzeSentiment } from '@/lib/ai/sentiment';

export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const reviews = await Review.find({ product: productId })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate sentiment summary
        const summary = {
            totalReviews: reviews.length,
            averageRating: reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0,
            positive: reviews.filter(r => r.sentiment === 'positive').length,
            negative: reviews.filter(r => r.sentiment === 'negative').length,
            neutral: reviews.filter(r => r.sentiment === 'neutral').length,
        };

        return NextResponse.json({ reviews, summary });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const { userId, productId, reviewerName, rating, comment } = await request.json();

        if (!productId || !rating || !comment) {
            return NextResponse.json({ error: 'Product ID, rating, and comment are required' }, { status: 400 });
        }

        // Run sentiment analysis
        const sentimentResult = analyzeSentiment(comment);

        const review = await Review.create({
            user: userId || null,
            product: productId,
            reviewerName: reviewerName || 'Anonymous',
            rating,
            comment,
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.score,
            sentimentKeywords: sentimentResult.keywords,
        });

        // Update product review summary
        const allReviews = await Review.find({ product: productId }).lean();
        const summary = {
            totalReviews: allReviews.length,
            averageRating: allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length,
            positive: allReviews.filter(r => r.sentiment === 'positive').length,
            negative: allReviews.filter(r => r.sentiment === 'negative').length,
            neutral: allReviews.filter(r => r.sentiment === 'neutral').length,
        };

        await Product.findByIdAndUpdate(productId, {
            rating: summary.averageRating,
            reviewsSummary: summary,
        });

        return NextResponse.json({ review, sentiment: sentimentResult }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
