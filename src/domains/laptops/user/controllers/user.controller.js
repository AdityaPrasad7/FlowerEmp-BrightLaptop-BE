import { asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import User from '../../auth/models/User.model.js';

export const addAddress = asyncHandler(async (req, res) => {
    const { fullName, phone, addressLine1, addressLine2, city, state, pincode, country, details, isDefault, addressType } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const newAddress = {
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        details,
        isDefault: isDefault || false,
        addressType: addressType || 'Home'
    };

    // If new address is default, unset previous default
    if (newAddress.isDefault) {
        user.addresses.forEach(addr => {
            addr.isDefault = false;
        });
    } else if (user.addresses.length === 0) {
        // If it's the first address, make it default automatically
        newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
        success: true,
        data: user.addresses,
        message: 'Address added successfully'
    });
});

export const removeAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const addressId = req.params.addressId;

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);

    // If we deleted the default address, make the first one default (if exists)
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
        user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
        success: true,
        data: user.addresses,
        message: 'Address removed successfully'
    });
});

export const getAddresses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.json({
        success: true,
        data: user.addresses
    });
});

export const getCustomers = asyncHandler(async (req, res) => {
    // Fetch users with roles B2C_BUYER or B2B_BUYER
    const customers = await User.find({
        role: { $in: ['B2C_BUYER', 'B2B_BUYER'] }
    }).select('-password');

    res.json({
        success: true,
        count: customers.length,
        data: customers
    });
});

//////