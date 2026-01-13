import Order from '../../order/models/Order.model.js';
import { asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   GET /api/laptops/analytics/summary
 * @desc    Get analytical data (trends, charts)
 * @access  Private (Admin only)
 */
export const getAnalyticsSummary = asyncHandler(async (req, res) => {
    // 1. Revenue & Order Growth (Last 30 Days vs Previous 30 Days)
    const allOrders = await Order.find({ status: { $ne: 'CANCELLED' } });

    let totalRevenue = 0;
    let b2cRevenue = 0;
    let b2bRevenue = 0;
    let b2cCount = 0;
    let b2bCount = 0;

    allOrders.forEach(order => {
        // CORRECTION: Use totalAmount, not amount
        const amount = order.totalAmount || 0;
        totalRevenue += amount;

        // Simple B2B vs B2C logic based on totalAmount or orderType if available
        // Assuming B2B orders are high value for now if orderType missing
        const isB2B = order.orderType === 'B2B' || amount > 100000;

        if (isB2B) {
            b2bRevenue += amount;
            b2bCount++;
        } else {
            b2cRevenue += amount;
            b2cCount++;
        }
    });

    const b2cPercentage = totalRevenue > 0 ? Math.round((b2cRevenue / totalRevenue) * 100) : 0;
    const b2bPercentage = totalRevenue > 0 ? Math.round((b2bRevenue / totalRevenue) * 100) : 0;

    // 2. Growth Calculation (Current Month vs Last Month)
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfCurrentMonth);
    const lastMonthOrders = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    // CORRECTION: Use totalAmount
    const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    let growthPercentage = 0;
    if (lastMonthRevenue > 0) {
        growthPercentage = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
        growthPercentage = 100; // 100% growth
    }

    // 3. Sales Trend (Last 7 Days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

        const dayOrders = allOrders.filter(o =>
            new Date(o.createdAt).toISOString().split('T')[0] === dateStr
        );
        // CORRECTION: Use totalAmount
        const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        salesTrend.push({
            date: d.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: dayRevenue
        });
    }

    // 4. Top Selling Products
    // Aggegating using 'products' array and Looking up product names
    const topProducts = await Order.aggregate([
        { $unwind: "$products" },
        {
            $lookup: {
                from: "products", // Looking up in 'products' collection
                localField: "products.productId",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: "$products.productId",
                name: { $first: "$productDetails.name" },
                totalSold: { $sum: "$products.quantity" },
                // CORRECTION: Use priceAtPurchase
                revenue: { $sum: { $multiply: ["$products.priceAtPurchase", "$products.quantity"] } }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 3 }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalRevenue,
            totalOrders: allOrders.length,
            growth: growthPercentage.toFixed(1) + '%',
            b2b: {
                percentage: b2bPercentage,
                revenue: b2bRevenue,
                count: b2bCount
            },
            b2c: {
                percentage: b2cPercentage,
                revenue: b2cRevenue,
                count: b2cCount
            },
            salesTrend,
            topProducts: topProducts.map(p => ({
                id: p._id,
                name: p.name || 'Unknown Product',
                sales: p.totalSold,
                revenue: p.revenue
            }))
        }
    });
});

/**
 * @route   GET /api/laptops/analytics/warranty-expiry
 * @desc    Get list of products with expiring warranties
 * @access  Private (Admin only)
 */
export const getWarrantyExpiry = asyncHandler(async (req, res) => {
    const { days = 30, page = 1, limit = 10 } = req.query;
    const daysInt = parseInt(days);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Calculate the target date range (from now until X days in future)
    // Calculate the target date range (from now until X days in future)
    // TEST MODE: Simulating today is Dec 15, 2026 to catch warranties expiring in Jan 2027
    // const today = new Date('2026-12-15');
    const today = new Date();
    console.log("today", today);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysInt);

    const expiringWarranties = await Order.aggregate([
        // 1. Match ONLY orders that are Approved or Shipped (active warranties)
        {
            $match: {
                status: { $in: ['APPROVED', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
            }
        },
        // 2. Unwind products to handle each item's warranty individually
        { $unwind: "$products" },
        // 3. Project necessary fields including calculated Warranty Duration in Months
        {
            $project: {
                orderId: "$_id",
                userId: "$userId",
                productName: "$products.name", // Assuming name is stored in product snapshot, otherwise lookup needed
                productId: "$products.productId",
                purchaseDate: "$createdAt",
                // Improved Parsing: Handle "Default", "Extra 1 Year", and standard "X months"
                warrantyDurationMonths: {
                    $let: {
                        vars: {
                            durationStr: { $toLower: { $ifNull: ["$products.selectedWarranty.duration", "0"] } }
                        },
                        in: {
                            $switch: {
                                branches: [
                                    // Case 1: "Default" warranty -> 12 months
                                    { case: { $eq: ["$$durationStr", "default"] }, then: 12 },

                                    // Case 2: "Extra 1 Year" -> 12 (Base) + 12 (Extra) = 24 months
                                    { case: { $regexMatch: { input: "$$durationStr", regex: /extra 1 year/ } }, then: 24 },

                                    // Case 3: "Extra 2 Years" -> 12 (Base) + 24 (Extra) = 36 months
                                    { case: { $regexMatch: { input: "$$durationStr", regex: /extra 2 years?/ } }, then: 36 },

                                    // Case 4: "1 Year" or "1 Yr" -> 12 months
                                    { case: { $regexMatch: { input: "$$durationStr", regex: /1 (year|yr)/ } }, then: 12 },

                                    // Case 5: "2 Years" -> 24 months
                                    { case: { $regexMatch: { input: "$$durationStr", regex: /2 (year|yr)s?/ } }, then: 24 },

                                    // Case 6: "3 Years" -> 36 months
                                    { case: { $regexMatch: { input: "$$durationStr", regex: /3 (year|yr)s?/ } }, then: 36 }
                                ],
                                default: {
                                    // Fallback: Try to extract the first number (e.g., "6 months" -> 6)
                                    $convert: {
                                        input: {
                                            $arrayElemAt: [
                                                { $split: ["$$durationStr", " "] },
                                                0
                                            ]
                                        },
                                        to: "int",
                                        onError: 0, // Fallback to 0 if parsing fails
                                        onNull: 0
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        // 4. Calculate Expiry Date
        {
            $addFields: {
                expiryDate: {
                    $dateAdd: {
                        startDate: "$purchaseDate",
                        unit: "month",
                        amount: "$warrantyDurationMonths"
                    }
                }
            }
        },
        // 5. Filter for warranties expiring in the next X days (and not already expired efficiently if needed)
        // Note: You might want to show recently expired too, so we just check <= futureDate
        {
            $match: {
                expiryDate: {
                    $gte: today,
                    $lte: futureDate
                }
            }
        },
        // 6. Lookup User Details
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        { $unwind: "$userDetails" },
        // 7. Lookup Product Details (for name if not in order snapshot)
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        // 8. Final Projection
        {
            $project: {
                _id: 0,
                orderId: 1,
                customerName: "$userDetails.name",
                customerEmail: "$userDetails.email",
                productName: "$productDetails.name",
                purchaseDate: 1,
                expiryDate: 1,
                daysRemaining: {
                    $dateDiff: {
                        startDate: new Date(),
                        endDate: "$expiryDate",
                        unit: "day"
                    }
                }
            }
        },
        // Sort by soonest to expire
        { $sort: { expiryDate: 1 } },
        // Use $facet to get both total count and paginated results
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: parseInt(limit) }]
            }
        },
        // Unwind metadata to get an object instead of array (optional but cleaner)
        // Check if metadata is empty (no results)
        {
            $project: {
                data: 1,
                // Get total from metadata array, default to 0 if empty
                total: { $arrayElemAt: ["$metadata.total", 0] }
            }
        }
    ]);

    const result = expiringWarranties[0];
    const totalCount = result.total || 0;
    const data = result.data || [];

    res.status(200).json({
        success: true,
        count: totalCount, // Send total count of all matching records
        data: data
    });
});
