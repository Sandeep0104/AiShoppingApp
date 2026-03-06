import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import { analyzeSentiment } from '@/lib/ai/sentiment';
import bcrypt from 'bcryptjs';

export async function GET(request) {
    try {
        await connectDB();

        // Clear existing data
        await Product.deleteMany({});
        await Review.deleteMany({});

        // Fetch all products from DummyJSON
        const response = await fetch('https://dummyjson.com/products?limit=194');
        const data = await response.json();

        let totalReviews = 0;

        for (const item of data.products) {
            // Create product
            const product = await Product.create({
                dummyJsonId: item.id,
                title: item.title,
                description: item.description,
                price: item.price,
                discountPercentage: item.discountPercentage || 0,
                rating: item.rating || 0,
                stock: item.stock || 0,
                brand: item.brand || '',
                category: item.category,
                tags: item.tags || [],
                thumbnail: item.thumbnail,
                images: item.images || [],
                warrantyInformation: item.warrantyInformation || '',
                shippingInformation: item.shippingInformation || '',
                availabilityStatus: item.availabilityStatus || 'In Stock',
                returnPolicy: item.returnPolicy || '',
            });

            // Create reviews with sentiment analysis
            if (item.reviews && item.reviews.length > 0) {
                let positive = 0, negative = 0, neutral = 0;

                for (const rev of item.reviews) {
                    const sentiment = analyzeSentiment(rev.comment);

                    await Review.create({
                        product: product._id,
                        reviewerName: rev.reviewerName,
                        reviewerEmail: rev.reviewerEmail,
                        rating: rev.rating,
                        comment: rev.comment,
                        sentiment: sentiment.sentiment,
                        sentimentScore: sentiment.score,
                        sentimentKeywords: sentiment.keywords,
                    });

                    if (sentiment.sentiment === 'positive') positive++;
                    else if (sentiment.sentiment === 'negative') negative++;
                    else neutral++;
                    totalReviews++;
                }

                // Update product with review summary
                await Product.findByIdAndUpdate(product._id, {
                    reviewsSummary: {
                        totalReviews: item.reviews.length,
                        averageRating: item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length,
                        positive,
                        negative,
                        neutral,
                    },
                });
            }
        }

        // Create demo users
        const adminPassword = await bcrypt.hash('admin123', 12);
        const userPassword = await bcrypt.hash('user123', 12);

        await User.deleteMany({ email: { $in: ['admin@shop.com', 'user@shop.com'] } });

        await User.create([
            {
                name: 'Admin User',
                email: 'admin@shop.com',
                password: adminPassword,
                role: 'admin',
            },
            {
                name: 'Demo User',
                email: 'user@shop.com',
                password: userPassword,
                role: 'user',
            },
        ]);

        return NextResponse.json({
            message: 'Database seeded successfully!',
            stats: {
                products: data.products.length,
                reviews: totalReviews,
                users: 2,
            },
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
