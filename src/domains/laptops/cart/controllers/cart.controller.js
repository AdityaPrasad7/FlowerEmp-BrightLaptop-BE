/**
 * Cart Controller (Laptops Domain)
 * Handles shopping cart operations with MOQ, bulk pricing, and B2B pricing
 */
import Cart from '../models/Cart.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { calculateUnitPrice } from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/laptops/cart/add
 * @desc    Add product to cart or update quantity
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity, selectedWarranty, selectedConfig } = req.body;

  console.log('ADD TO CART BODY:', JSON.stringify(req.body, null, 2));

  if (!productId || !quantity) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  }

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  let unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role,
    product.b2bPrice || null,
    product.moq || 1,
    product.bulkPricing || []
  );

  // Handle selected configuration variants (RAM/Storage)
  console.log(`[Config Debug] ====== PROCESSING CONFIG ======`);
  console.log(`[Config Debug] selectedConfig received:`, JSON.stringify(selectedConfig));
  console.log(`[Config Debug] product.configurationVariants exists:`, !!product.configurationVariants);
  console.log(`[Config Debug] product.configurationVariants length:`, product.configurationVariants?.length || 0);
  
  if (selectedConfig && product.configurationVariants && product.configurationVariants.length > 0) {
    console.log(`[Config Debug] Available variants:`, JSON.stringify(product.configurationVariants.map(v => ({ type: v.type, value: v.value, adjustment: v.priceAdjustment }))));
    
    if (selectedConfig.ram) {
      const ramValue = selectedConfig.ram.trim().toLowerCase();
      console.log(`[Config Debug] Looking for RAM variant matching: "${ramValue}"`);
      const ramVariant = product.configurationVariants.find(
        v => v.type === 'RAM' && v.value.trim().toLowerCase() === ramValue
      );
      if (ramVariant) {
        console.log(`[Config Debug] ✅ RAM MATCH FOUND: ${selectedConfig.ram} -> adjustment: ${ramVariant.priceAdjustment}`);
        unitPrice += ramVariant.priceAdjustment;
        console.log(`[Config Debug] UnitPrice after RAM: ${unitPrice}`);
      } else {
        console.log(`[Config Debug] ❌ RAM VARIANT NOT FOUND for: "${selectedConfig.ram}"`);
        console.log(`[Config Debug] Available RAM variants:`, product.configurationVariants.filter(v => v.type === 'RAM').map(v => v.value));
      }
    } else {
      console.log(`[Config Debug] No RAM in selectedConfig`);
    }
    
    if (selectedConfig.storage) {
      const storageValue = selectedConfig.storage.trim().toLowerCase();
      console.log(`[Config Debug] Looking for Storage variant matching: "${storageValue}"`);
      const storageVariant = product.configurationVariants.find(
        v => v.type === 'STORAGE' && v.value.trim().toLowerCase() === storageValue
      );
      if (storageVariant) {
        console.log(`[Config Debug] ✅ STORAGE MATCH FOUND: ${selectedConfig.storage} -> adjustment: ${storageVariant.priceAdjustment}`);
        unitPrice += storageVariant.priceAdjustment;
        console.log(`[Config Debug] UnitPrice after Storage: ${unitPrice}`);
      } else {
        console.log(`[Config Debug] ❌ STORAGE VARIANT NOT FOUND for: "${selectedConfig.storage}"`);
        console.log(`[Config Debug] Available Storage variants:`, product.configurationVariants.filter(v => v.type === 'STORAGE').map(v => v.value));
      }
    } else {
      console.log(`[Config Debug] No Storage in selectedConfig`);
    }
  } else {
    console.log(`[Config Debug] ⚠️ Config processing skipped - selectedConfig:`, !!selectedConfig, 'variants exist:', !!product.configurationVariants);
  }

  // Handle selected warranty
  let warrantyObj = { duration: 'Default', price: 0 };

  // Defensive check: extract duration string if object passed
  let warrantyKey = selectedWarranty;
  if (typeof selectedWarranty === 'object' && selectedWarranty !== null) {
    warrantyKey = selectedWarranty.duration || selectedWarranty.id;
  }

  if (warrantyKey && warrantyKey !== 'default') {
    // Debug logging for warranty matching
    console.log(`[Warranty Debug] Looking for: '${warrantyKey}' (len=${warrantyKey.length})`);
    if (product.warrantyOptions && product.warrantyOptions.length > 0) {
      product.warrantyOptions.forEach(opt => {
        console.log(`[Warranty Debug] Available: '${opt.duration}' (len=${opt.duration.length})`);
      });
    } else {
      console.log('[Warranty Debug] No warranty options found on product');
    }

    // Match by duration (case-insensitive, trimmed)
    const warrantyOption = product.warrantyOptions.find(w =>
      w.duration.trim().toLowerCase() === warrantyKey.trim().toLowerCase()
    );

    if (warrantyOption) {
      console.log(`[Warranty Debug] Match found: ${warrantyOption.duration}, Price: ${warrantyOption.price}`);
      unitPrice += warrantyOption.price;
      warrantyObj = {
        duration: warrantyOption.duration,
        price: warrantyOption.price
      };
    } else {
      console.log('[Warranty Debug] No match found');
    }
  }

  const totalPrice = unitPrice * quantity;
  console.log(`[Add To Cart Debug] Final Calculated UnitPrice: ${unitPrice}, Total: ${totalPrice}`);

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    if (product.stock < newQuantity) {
      return next(
        new AppError(
          `Insufficient stock. You already have ${cart.items[existingItemIndex].quantity} in cart. Available: ${product.stock}`,
          400
        )
      );
    }

    // Recalculate based on new total quantity
    let newUnitPrice = calculateUnitPrice(
      product.basePrice,
      newQuantity,
      req.user.role,
      product.b2bPrice || null,
      product.moq || 1,
      product.bulkPricing || []
    );

    // Apply configuration adjustments
    // Use new config if provided, otherwise keep existing config
    const effectiveConfig = (selectedConfig && Object.keys(selectedConfig).length > 0) 
      ? selectedConfig 
      : cart.items[existingItemIndex].selectedConfig;
    
    console.log(`[Update Cart Debug] Effective Config:`, JSON.stringify(effectiveConfig));
    console.log(`[Update Cart Debug] Selected Config from request:`, JSON.stringify(selectedConfig));
    console.log(`[Update Cart Debug] Existing Config in cart:`, JSON.stringify(cart.items[existingItemIndex].selectedConfig));
    
    if (effectiveConfig && product.configurationVariants && product.configurationVariants.length > 0) {
      if (effectiveConfig.ram) {
        const ramVariant = product.configurationVariants.find(
          v => v.type === 'RAM' && v.value.trim().toLowerCase() === effectiveConfig.ram.trim().toLowerCase()
        );
        if (ramVariant) {
          console.log(`[Update Cart Debug] Applied RAM adjustment: ${effectiveConfig.ram} -> ${ramVariant.priceAdjustment}`);
          newUnitPrice += ramVariant.priceAdjustment;
        } else {
          console.log(`[Update Cart Debug] RAM variant not found for: ${effectiveConfig.ram}`);
        }
      }
      if (effectiveConfig.storage) {
        const storageVariant = product.configurationVariants.find(
          v => v.type === 'STORAGE' && v.value.trim().toLowerCase() === effectiveConfig.storage.trim().toLowerCase()
        );
        if (storageVariant) {
          console.log(`[Update Cart Debug] Applied Storage adjustment: ${effectiveConfig.storage} -> ${storageVariant.priceAdjustment}`);
          newUnitPrice += storageVariant.priceAdjustment;
        } else {
          console.log(`[Update Cart Debug] Storage variant not found for: ${effectiveConfig.storage}`);
        }
      }
    }

    // Recalculate warranty for existing item update
    let updateWarrantyObj = { duration: 'Default', price: 0 };
    if (selectedWarranty && selectedWarranty !== 'default' && selectedWarranty !== 'Default') {
      let warrantyKey = selectedWarranty;
      if (typeof selectedWarranty === 'object' && selectedWarranty !== null) {
        warrantyKey = selectedWarranty.duration || selectedWarranty.id;
      }
      
      if (warrantyKey && warrantyKey !== 'default' && product.warrantyOptions && product.warrantyOptions.length > 0) {
        const warrantyOption = product.warrantyOptions.find(w =>
          w.duration.trim().toLowerCase() === warrantyKey.trim().toLowerCase()
        );
        if (warrantyOption) {
          console.log(`[Update Cart Debug] Warranty match found: ${warrantyOption.duration}, Price: ${warrantyOption.price}`);
          updateWarrantyObj = {
            duration: warrantyOption.duration,
            price: warrantyOption.price
          };
          newUnitPrice += warrantyOption.price;
        } else {
          console.log(`[Update Cart Debug] Warranty not matched, using existing: ${cart.items[existingItemIndex].selectedWarranty?.duration || 'Default'}`);
          // Use existing warranty if new one doesn't match
          if (cart.items[existingItemIndex].selectedWarranty?.price > 0) {
            newUnitPrice += cart.items[existingItemIndex].selectedWarranty.price;
            updateWarrantyObj = cart.items[existingItemIndex].selectedWarranty;
          }
        }
      }
    } else if (cart.items[existingItemIndex].selectedWarranty?.price > 0) {
      // Keep existing warranty if no new one provided
      newUnitPrice += cart.items[existingItemIndex].selectedWarranty.price;
      updateWarrantyObj = cart.items[existingItemIndex].selectedWarranty;
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].unitPrice = newUnitPrice;
    cart.items[existingItemIndex].totalPrice = newUnitPrice * newQuantity;

    // Always update config if provided in request
    if (selectedConfig && Object.keys(selectedConfig).length > 0) {
      // Ensure we preserve existing values if new ones aren't provided
      const existingConfig = cart.items[existingItemIndex].selectedConfig || {};
      cart.items[existingItemIndex].selectedConfig = {
        ram: selectedConfig.ram ? String(selectedConfig.ram).trim() : (existingConfig.ram || null),
        storage: selectedConfig.storage ? String(selectedConfig.storage).trim() : (existingConfig.storage || null)
      };
      // Mark the path as modified to ensure Mongoose saves it
      cart.markModified(`items.${existingItemIndex}.selectedConfig`);
      console.log(`[Update Cart Debug] ✅ Updated selectedConfig in cart item:`, JSON.stringify(cart.items[existingItemIndex].selectedConfig));
    } else {
      console.log(`[Update Cart Debug] ⚠️ No selectedConfig provided, keeping existing:`, JSON.stringify(cart.items[existingItemIndex].selectedConfig));
    }
    
    // Always update warranty if selectedWarranty is provided in request
    if (selectedWarranty !== undefined && selectedWarranty !== null) {
      cart.items[existingItemIndex].selectedWarranty = updateWarrantyObj;
      // Mark the path as modified to ensure Mongoose saves it
      cart.markModified(`items.${existingItemIndex}.selectedWarranty`);
      console.log(`[Update Cart Debug] ✅ Updated selectedWarranty in cart item:`, JSON.stringify(updateWarrantyObj));
    } else {
      console.log(`[Update Cart Debug] ⚠️ No selectedWarranty provided, keeping existing:`, JSON.stringify(cart.items[existingItemIndex].selectedWarranty));
    }

  } else {
    // New item - ensure config is saved properly
    const newItemConfig = (selectedConfig && Object.keys(selectedConfig).length > 0) ? selectedConfig : {};
    console.log(`[Add New Item Debug] Adding new item with config:`, JSON.stringify(newItemConfig));
    console.log(`[Add New Item Debug] Warranty:`, JSON.stringify(warrantyObj));
    console.log(`[Add New Item Debug] Calculated unitPrice:`, unitPrice);
    
    cart.items.push({
      productId: product._id,
      quantity,
      unitPrice,
      totalPrice,
      selectedWarranty: warrantyObj,
      selectedConfig: newItemConfig
    });
  }

  cart.calculateTotal();
  
  // Log what we're about to save
  console.log(`[Save Debug] Cart items before save:`, JSON.stringify(cart.items.map(item => ({
    productId: item.productId.toString(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    selectedConfig: item.selectedConfig,
    selectedWarranty: item.selectedWarranty
  })), null, 2));
  
  await cart.save();
  
  console.log(`[Save Debug] Cart saved successfully`);

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq stock isActive images brand specifications configurationVariants warrantyOptions mrp discountPercentage');
  
  // Log what we're returning
  console.log(`[Response Debug] Cart items after populate:`, JSON.stringify(cart.items.map(item => ({
    productId: item.productId?._id || item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    selectedConfig: item.selectedConfig,
    selectedWarranty: item.selectedWarranty
  })), null, 2));

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product added to cart successfully',
  });
});

/**
 * @route   GET /api/laptops/cart
 * @desc    Get user's cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res, next) => {
  let cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId',
    'name description basePrice b2bPrice moq stock isActive images brand specifications mrp discountPercentage configurationVariants warrantyOptions'
  );

  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  } else {
    let cartUpdated = false;
    const validItems = [];

    for (const item of cart.items) {
      const product = item.productId;

      if (!product || !product.isActive) {
        cartUpdated = true;
        continue;
      }

      let newUnitPrice = calculateUnitPrice(
        product.basePrice,
        item.quantity,
        req.user.role,
        product.b2bPrice || null,
        product.moq || 1,
        product.bulkPricing || []
      );

      console.log(`[Cart Sync Debug] Product: ${product.name}, Base: ${newUnitPrice}`);
      console.log(`[Cart Sync Debug] Selected Config: ${JSON.stringify(item.selectedConfig)}`);
      if (product.configurationVariants) {
        product.configurationVariants.forEach(v => {
          console.log(`[Cart Sync Debug] Variant Available: ${v.type} | ${v.value} | Adj: ${v.priceAdjustment}`);
        });
      }

      // Add configuration adjustments
      if (item.selectedConfig && product.configurationVariants && product.configurationVariants.length > 0) {
        if (item.selectedConfig.ram) {
          const ramVariant = product.configurationVariants.find(
            v => v.type === 'RAM' && v.value.trim().toLowerCase() === item.selectedConfig.ram.trim().toLowerCase()
          );
          if (ramVariant) {
            console.log(`[Cart Sync Debug] Match RAM: ${item.selectedConfig.ram} -> ${ramVariant.priceAdjustment}`);
            newUnitPrice += ramVariant.priceAdjustment;
          } else {
            console.log(`[Cart Sync Debug] NO Match RAM: ${item.selectedConfig.ram}`);
          }
        }
        if (item.selectedConfig.storage) {
          const storageVariant = product.configurationVariants.find(
            v => v.type === 'STORAGE' && v.value.trim().toLowerCase() === item.selectedConfig.storage.trim().toLowerCase()
          );
          if (storageVariant) {
            console.log(`[Cart Sync Debug] Match Storage: ${item.selectedConfig.storage} -> ${storageVariant.priceAdjustment}`);
            newUnitPrice += storageVariant.priceAdjustment;
          } else {
            console.log(`[Cart Sync Debug] NO Match Storage: ${item.selectedConfig.storage}`);
          }
        }
      }

      // Add warranty price
      if (item.selectedWarranty && item.selectedWarranty.price > 0) {
        console.log(`[Cart Sync Debug] Adding Warranty: ${item.selectedWarranty.duration} -> ${item.selectedWarranty.price}`);
        newUnitPrice += item.selectedWarranty.price;
      }

      console.log(`[Cart Sync Debug] Final UnitPrice: ${newUnitPrice}, Stored: ${item.unitPrice}`);

      if (newUnitPrice !== item.unitPrice) {
        item.unitPrice = newUnitPrice;
        item.totalPrice = newUnitPrice * item.quantity;
        cartUpdated = true;
      }

      validItems.push(item);
    }

    if (cart.items.length !== validItems.length) {
      cart.items = validItems;
      cartUpdated = true;
    }

    if (cartUpdated) {
      cart.calculateTotal();
      await cart.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
  });
});

/**
 * @route   PUT /api/laptops/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 */
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    return next(new AppError('Product not found in cart', 404));
  }

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  let unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role,
    product.b2bPrice || null,
    product.moq || 1,
    product.bulkPricing || []
  );

  // Apply configuration adjustments from stored cart item
  const storedItem = cart.items[itemIndex];
  if (storedItem.selectedConfig && product.configurationVariants && product.configurationVariants.length > 0) {
    if (storedItem.selectedConfig.ram) {
      const ramVariant = product.configurationVariants.find(
        v => v.type === 'RAM' && v.value.trim().toLowerCase() === storedItem.selectedConfig.ram.trim().toLowerCase()
      );
      if (ramVariant) {
        unitPrice += ramVariant.priceAdjustment;
      }
    }
    if (storedItem.selectedConfig.storage) {
      const storageVariant = product.configurationVariants.find(
        v => v.type === 'STORAGE' && v.value.trim().toLowerCase() === storedItem.selectedConfig.storage.trim().toLowerCase()
      );
      if (storageVariant) {
        unitPrice += storageVariant.priceAdjustment;
      }
    }
  }

  // Preserve warranty price if exists
  if (cart.items[itemIndex].selectedWarranty && cart.items[itemIndex].selectedWarranty.price > 0) {
    unitPrice += cart.items[itemIndex].selectedWarranty.price;
  }

  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].unitPrice = unitPrice;
  cart.items[itemIndex].totalPrice = unitPrice * quantity;

  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq stock isActive images brand specifications configurationVariants warrantyOptions mrp discountPercentage');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Cart updated successfully',
  });
});

/**
 * @route   DELETE /api/laptops/cart/remove/:productId
 * @desc    Remove product from cart
 * @access  Private
 */
export const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );

  if (cart.items.length === initialLength) {
    return next(new AppError('Product not found in cart', 404));
  }

  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq stock isActive images brand specifications configurationVariants warrantyOptions mrp discountPercentage');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product removed from cart',
  });
});

/**
 * @route   DELETE /api/laptops/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
export const clearCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: {
      cart,
    },
  });
});

