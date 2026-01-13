import Order from '../../order/models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import User from '../../../laptops/auth/models/User.model.js';
// We might need a Complaint model if it exists, or use a placeholder for now
// import Complaint from '../../complaint/models/Complaint.model.js'; 
import { asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   GET /api/laptops/dashboard/stats
 * @desc    Get operational stats for the dashboard (counts, recent activity)
 * @access  Private (Admin only)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
    // 1. Pending Actions Counts
    const pendingOrdersCount = await Order.countDocuments({ status: 'PENDING' });
    const shippedOrdersCount = await Order.countDocuments({ status: 'SHIPPED' });
    const processingOrdersCount = await Order.countDocuments({ status: 'PROCESSING' });

    // Low stock: active products with stock less than 5 (arbitrary threshold or MOQ)
    const lowStockCount = await Product.countDocuments({ isActive: true, stock: { $lt: 5 } });

    const totalProducts = await Product.countDocuments({ isActive: true });
    // Count B2C and B2B buyers
    const totalUsers = await User.countDocuments({ role: { $in: ['B2C_BUYER', 'B2B_BUYER'] } });

    // 2. Today's Snapshot
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({ createdAt: { $gte: startOfDay } });
    const todaySalesAmount = todayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const todayOrdersCount = todayOrders.length;

    // 3. Recent Activity Log (Simplified for now - fetching latest orders)
    // Ideally, we would have a dedicated ActivityLog model. 
    // For now, we mix recent orders and products.
    const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('userId', 'name')
        .select('orderId status createdAt amount');

    const activityLog = recentOrders.map(order => ({
        msg: `Order #${order._id.toString().slice(-6).toUpperCase()} placed by ${order.userId?.name || 'User'}`,
        time: order.createdAt,
        type: order.status === 'PENDING' ? 'warning' : 'success',
        amount: order.amount
    }));

    res.status(200).json({
        success: true,
        data: {
            counts: {
                pendingOrders: pendingOrdersCount,
                processingOrders: processingOrdersCount,
                shippedOrders: shippedOrdersCount,
                lowStock: lowStockCount,
                totalProducts,
                totalUsers
            },
            today: {
                sales: todaySalesAmount,
                orders: todayOrdersCount
            },
            activityLog
        }
    });
});
