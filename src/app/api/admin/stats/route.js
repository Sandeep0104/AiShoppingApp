import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import Review from '@/lib/models/Review';

export async function GET() {
    try {
        await connectDB();

        const [totalProducts, totalOrders, totalUsers, totalReviews, recentOrders] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments(),
            Review.countDocuments(),
            Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email').lean(),
        ]);

        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);

        // Category distribution
        const categoryStats = await Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Order status distribution
        const orderStatusStats = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Sentiment overview
        const sentimentStats = await Review.aggregate([
            { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        ]);

        return NextResponse.json({
            totalProducts,
            totalOrders,
            totalUsers,
            totalReviews,
            totalRevenue: totalRevenue[0]?.total || 0,
            categoryStats,
            orderStatusStats,
            monthlyRevenue,
            sentimentStats,
            recentOrders,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
