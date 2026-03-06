import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';

export async function GET(request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 12;
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'rating';
        const brand = searchParams.get('brand');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');

        const filter = {};

        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        const sortOptions = {};
        switch (sort) {
            case 'price_asc': sortOptions.price = 1; break;
            case 'price_desc': sortOptions.price = -1; break;
            case 'rating': sortOptions.rating = -1; break;
            case 'newest': sortOptions.createdAt = -1; break;
            default: sortOptions.rating = -1;
        }

        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
            Product.countDocuments(filter),
        ]);

        // Get categories and brands for filters
        const [categories, brands] = await Promise.all([
            Product.distinct('category'),
            Product.distinct('brand'),
        ]);

        return NextResponse.json({
            products,
            total,
            page,
            pages: Math.ceil(total / limit),
            categories,
            brands: brands.filter(Boolean),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
