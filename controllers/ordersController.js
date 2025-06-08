const knex = require('../db/knex');
const { 
    createVirtualAccountPayment,
    inquiryVirtualAccountPayment,
    inquirystatusVirtualAccountPayment,
    cancelVirtualAccountPayment,
    callbackVirtualAccountPayment,

    createQRISPayment,
    statusQRISPayment,
    cancelQRISPayment,
    refundQRISPayment,
    callbackQRISPayment,

    createEWalletPayment,
    statusEWalletPayment,
    cancelEWalletPayment,
    callbackEWalletPayment,

    createCreditCardPayment,
    statusCreditCardPayment,
    cancelCreditCardPayment,
    callbackCreditCardPayment,
    
    validateCallbackSignature
   } = require('../middleware/paymentMiddleware.js'); 
const { sendOrderConfirmationEmail } = require('../models/mailer.js');
const { getTimestamp, generateExpiredDate, formattedPrice, getSubMerchantID, generateInvoiceNumber, isValidCoupon, isValidVoucher, checkProductDiscount, formatRupiah } = require('../models/utils.js');
const { decryptId, encryptId } = require('../models/encryption.js');
const { get } = require('./shippingController.js');
const productsController = require('./productsController.js');
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order transactions
 */

// Helper function to apply coupon
const applyCouponToOrder = async ({ code, order_amount, shipping_cost, destination, user_id, dry_run }) => {
    // This should call your existing applyCoupon function logic
    // You can extract the logic from your midtrans applyCoupon function
    const midtransController = require('./midtransController');
    
    // Create a mock request object for the applyCoupon function
    const mockReq = {
        user: { id: encryptId(user_id) },
        body: {
            code,
            order_amount,
            shipping_cost,
            destination,
            dry_run
        }
    };

    return new Promise((resolve, reject) => {
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    if (code === 200) {
                        resolve({ success: true, data });
                    } else {
                        reject(new Error(data.message || 'Coupon validation failed'));
                    }
                }
            })
        };

        midtransController.applyCoupon(mockReq, mockRes);
    });
};

// Helper function to create Midtrans transaction
const createMidtransTransaction = async (transactionData, user_id) => {
    // console.log(`transactionData: ${JSON.stringify(transactionData)}`);
    const midtransController = require('./midtransController');
    
    const mockReq = {
        user: { id: encryptId(user_id) },
        body: transactionData
    };

    return new Promise((resolve, reject) => {
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    if (code === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(data.message || 'Payment creation failed'));
                    }
                }
            })
        };

        midtransController.createTransaction(mockReq, mockRes);
    });
};

module.exports = {

    /**
     * @swagger
     * /api/orders:
     *   post:
     *     summary: Create a new order with Midtrans payment
     *     tags: [Orders]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - total_price
     *               - payment_method
     *               - payment_method_channel
     *               - shipping_name
     *               - shipping_code
     *               - shipping_service
     *               - shipping_cost
     *               - shipping_etd
     *               - shipping_weight
     *               - receiver_name
     *               - receiver_phone
     *               - receiver_address
     *               - receiver_subdistrict_id
     *               - receiver_subdistrict_name
     *               - receiver_city_id
     *               - receiver_city_name
     *               - receiver_state_id
     *               - receiver_state_name
     *               - receiver_zip_code
     *               - items
     *             properties:
     *               total_price:
     *                 type: number
     *                 description: Total price before discount
     *                 example: 2889000
     *               coupon_code:
     *                 type: array
     *                 description: Optional array of coupon codes
     *                 items:
     *                   type: string
     *                 example: ["DISCOUNT5", "FREEONGKIR"]
     *               payment_method:
     *                 type: string
     *                 enum: [VA, EWALLET, QRIS, CC]
     *                 example: "VA"
     *               payment_method_channel:
     *                 type: string
     *                 example: "BCA"
     *               shipping_name:
     *                 type: string
     *                 example: "SiCepat Express"
     *               shipping_code:
     *                 type: string
     *                 example: "sicepat"
     *               shipping_service:
     *                 type: string
     *                 example: "GOKIL"
     *               shipping_description:
     *                 type: string
     *                 example: "Cargo Per Kg (Minimal 10kg)"
     *               shipping_cost:
     *                 type: number
     *                 example: 38500
     *               shipping_etd:
     *                 type: string
     *                 example: "2-3 day"
     *               shipping_weight:
     *                 type: number
     *                 example: 10500
     *               receiver_name:
     *                 type: string
     *                 example: "Budi Santoso"
     *               receiver_phone:
     *                 type: string
     *                 example: "08123456789"
     *               receiver_address:
     *                 type: string
     *                 example: "Jl. Merdeka No.123"
     *               receiver_address_detail:
     *                 type: string
     *                 example: "RT 03 / RW 05, dekat warung bu Sari"
     *               receiver_subdistrict_id:
     *                 type: string
     *                 example: "3603281001"
     *               receiver_subdistrict_name:
     *                 type: string
     *                 example: "KELAPA DUA"
     *               receiver_district_id:
     *                 type: string
     *                 example: "360328"
     *               receiver_district_name:
     *                 type: string
     *                 example: "KELAPA DUA"
     *               receiver_city_id:
     *                 type: string
     *                 example: "3603"
     *               receiver_city_name:
     *                 type: string
     *                 example: "KABUPATEN TANGERANG"
     *               receiver_state_id:
     *                 type: string
     *                 example: "36"
     *               receiver_state_name:
     *                 type: string
     *                 example: "BANTEN"
     *               receiver_zip_code:
     *                 type: string
     *                 example: "15831"
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     product_id:
     *                       type: string
     *                       description: Encrypted product ID
     *                       example: "8647400b88aca0ce58a52a58b0efc638"
     *                     quantity:
     *                       type: integer
     *                       example: 1
     *                     price:
     *                       type: number
     *                       example: 2160000
     *     responses:
     *       201:
     *         description: Order created successfully with payment details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 201
     *                 message:
     *                   type: string
     *                   example: "Order created successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     order:
     *                       type: object
     *                       properties:
     *                         id:
     *                           type: string
     *                           description: Encrypted order ID
     *                         invoice_number:
     *                           type: string
     *                         total_price:
     *                           type: number
     *                         status:
     *                           type: string
     *                     payment:
     *                       type: object
     *                       properties:
     *                         token:
     *                           type: string
     *                           description: Midtrans snap token
     *                         redirect_url:
     *                           type: string
     *                           description: Payment page URL
     *                         transaction_id:
     *                           type: string
     *                     coupons_applied:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           code:
     *                             type: string
     *                           discount_amount:
     *                             type: number
     *                           type:
     *                             type: string
     *       400:
     *         description: Bad request - validation errors
     *       404:
     *         description: Product not found or coupon invalid
     *       500:
     *         description: Internal server error
     */
    createOrder: async (req, res) => {
        const trx = await knex.transaction();
        
        try {
            const user_id = decryptId(req.user.id);
            const {
                total_price,
                coupon_code = [], // Default to empty array
                shipping_name,
                shipping_code,
                shipping_service,
                shipping_description,
                shipping_cost = 0,
                shipping_etd,
                shipping_weight,
                receiver_name,
                receiver_phone,
                receiver_address,
                receiver_address_detail,
                receiver_subdistrict_id,
                receiver_subdistrict_name,
                receiver_district_id,
                receiver_district_name,
                receiver_city_id,
                receiver_city_name,
                receiver_state_id,
                receiver_state_name,
                receiver_zip_code,
                items
            } = req.body;
            // payment_method,
            // payment_method_channel,

            //  'payment_method', 'payment_method_channel',
            // Validate required fields
            const requiredFields = [
                'total_price',
                'shipping_name', 'shipping_code', 'shipping_service', 'shipping_cost',
                'shipping_etd', 'shipping_weight', 'receiver_name', 'receiver_phone',
                'receiver_address', 'receiver_subdistrict_id', 'receiver_subdistrict_name',
                'receiver_city_id', 'receiver_city_name', 'receiver_state_id',
                'receiver_state_name', 'receiver_zip_code', 'items'
            ];

            const missingFields = requiredFields.filter(field => 
                req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
            );

            if (missingFields.length > 0) {
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: 'Items must be a non-empty array',
                    data: null
                });
            }

            // Get user details
            const user = await trx('users')
                .where('id', user_id)
                .whereNull('deleted_at')
                .first();

            if (!user) {
                await trx.rollback();
                return res.status(404).json({
                    status: 404,
                    message: 'User not found',
                    data: null
                });
            }

            // Generate invoice number
            const invoice_number = generateInvoiceNumber();

            // 1. Validate and calculate product prices
            let calculatedSubtotal = 0;
            let validatedItems = [];
            let hasExpiredDiscount = false;
            let expiredDiscountProducts = [];

            // calculatedSubtotal += shipping_cost;
            
            for (const item of items) {
                const product_id = decryptId(item.product_id);
                
                // Get current product price with discount
                let currentPrice = await checkProductDiscount(product_id);
                
                if (currentPrice && currentPrice.valid && currentPrice.product) {
                    const finalPrice = currentPrice.product.final_price;
                    const productName = currentPrice.product.name;
                    
                    // Check if price has changed
                    if (finalPrice !== item.price) {
                        hasExpiredDiscount = true;
                        expiredDiscountProducts.push({
                            product_id: product_id,
                            product_name: productName,
                            old_price: item.price,
                            new_price: finalPrice
                        });
                    }
                    
                    // Check stock availability
                    const product = await trx('products').where('id', product_id).first();
                    if (!product) {
                        await trx.rollback();
                        return res.status(404).json({
                            status: 404,
                            message: `Product with ID ${item.product_id} not found`,
                            data: null
                        });
                    }

                    if (product.stock < item.quantity) {
                        await trx.rollback();
                        return res.status(400).json({
                            status: 400,
                            message: `Insufficient stock for ${productName}. Available: ${product.stock}, Requested: ${item.quantity}`,
                            data: null
                        });
                    }
                    
                    calculatedSubtotal += finalPrice * item.quantity;
                    validatedItems.push({
                        product_id: product_id,
                        quantity: item.quantity,
                        price: finalPrice,
                        name: productName,
                        subtotal: finalPrice * item.quantity
                    });
                } else {
                    await trx.rollback();
                    return res.status(404).json({
                        status: 404,
                        message: `Invalid product ID: ${item.product_id}`,
                        data: null
                    });
                }
            }

            // Return error if any discount expired
            if (hasExpiredDiscount) {
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: 'Some products have expired discounts or price changes',
                    data: {
                        expired_discount_products: expiredDiscountProducts
                    }
                });
            }

            // 2. Validate and apply multiple coupons
            let totalCouponDiscount = 0;
            let appliedCoupons = [];
            let finalSubtotal = calculatedSubtotal;
            let finalShippingCost = shipping_cost;

            if (coupon_code && Array.isArray(coupon_code) && coupon_code.length > 0) {
                // Check for duplicate coupon codes
                const uniqueCoupons = [...new Set(coupon_code)];
                if (uniqueCoupons.length !== coupon_code.length) {
                    await trx.rollback();
                    return res.status(400).json({
                        status: 400,
                        message: 'Duplicate coupon codes are not allowed',
                        original_codes: coupon_code,
                        duplicate_codes: coupon_code.filter((code, index) => coupon_code.indexOf(code) !== index)
                    });
                }

                // Prepare destination for regional coupons
                const destination = {
                    province_id: parseInt(receiver_state_id),
                    city_id: parseInt(receiver_city_id),
                    subdistrict_id: parseInt(receiver_subdistrict_id)
                };

                // Process each unique coupon
                for (const code of uniqueCoupons) {
                    try {
                        // Get coupon from database
                        const coupon = await trx('coupons')
                            .where('code', code)
                            .where('status', 'active')
                            .whereNull('deleted_at')
                            .where('valid_from', '<=', knex.fn.now())
                            .where('valid_until', '>=', knex.fn.now())
                            .first();

                        if (!coupon) {
                            await trx.rollback();
                            return res.status(404).json({
                                status: 404,
                                message: `Coupon '${code}' not found or not available`,
                                data: null
                            });
                        }

                        // Check usage limit
                        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
                            await trx.rollback();
                            return res.status(400).json({
                                status: 400,
                                message: `Coupon '${code}' has reached its usage limit`,
                                data: null
                            });
                        }

                        // Check if personal coupon belongs to user
                        if (coupon.user_id && coupon.user_id !== user_id) {
                            await trx.rollback();
                            return res.status(400).json({
                                status: 400,
                                message: `Coupon '${code}' is not available for your account`,
                                data: null
                            });
                        }

                        // Check minimum purchase requirement (use original calculated subtotal)
                        if (coupon.min_purchase && calculatedSubtotal < coupon.min_purchase) {
                            await trx.rollback();
                            return res.status(400).json({
                                status: 400,
                                message: `Coupon '${code}' requires minimum purchase of ${coupon.min_purchase}`,
                                });
                        }

                        // Check regional restrictions
                        if (coupon.type === 'regional') {
                            const coverageAreas = await trx('coupon_coverage_areas')
                                .where('coupon_id', coupon.id);

                            const isInCoverage = coverageAreas.some(area => {
                                if (area.subdistrict_id && destination.subdistrict_id) {
                                    return area.subdistrict_id === destination.subdistrict_id;
                                }
                                if (area.city_id && destination.city_id) {
                                    return area.city_id === destination.city_id;
                                }
                                if (area.province_id && destination.province_id) {
                                    return area.province_id === destination.province_id;
                                }
                                return false;
                            });

                            if (!isInCoverage) {
                                await trx.rollback();
                                return res.status(400).json({
                                    status: 400,
                                    message: `Coupon '${code}' is not available for your delivery location`,
                                    data: null
                                });
                            }
                        }

                        // Calculate discount based on coupon type
                        let discountAmount = 0;
                        let applicableAmount = 0;
                        let discountTarget = '';

                        if (coupon.type === 'shipping') {
                            // For shipping coupons, apply discount to shipping cost
                            applicableAmount = finalShippingCost;
                            discountTarget = 'shipping';
                        } else {
                            // For other coupons (general, regional), apply discount to subtotal
                            applicableAmount = finalSubtotal;
                            discountTarget = 'subtotal';
                        }

                        // Calculate discount amount
                        if (coupon.discount_type === 'percentage') {
                            discountAmount = Math.round((applicableAmount * coupon.discount_percentage) / 100);
                        } else {
                            discountAmount = Math.min(coupon.discount_amount, applicableAmount);
                        }

                        // Ensure discount doesn't exceed applicable amount
                        discountAmount = Math.min(discountAmount, applicableAmount);

                        // Apply discount to the appropriate target
                        if (coupon.type === 'shipping') {
                            finalShippingCost = Math.max(0, finalShippingCost - discountAmount);
                            
                            // Also decrement from calculatedSubtotal for shipping discounts
                            calculatedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
                            finalSubtotal = Math.max(0, finalSubtotal - discountAmount);
                        } else {
                            finalSubtotal = Math.max(0, finalSubtotal - discountAmount);
                        }

                        // Track total discount
                        totalCouponDiscount += discountAmount;

                        // Store applied coupon details
                        appliedCoupons.push({
                            id: coupon.id,
                            code: coupon.code,
                            type: coupon.type,
                            discount_type: coupon.discount_type,
                            discount_percentage: coupon.discount_percentage,
                            discount_amount: discountAmount,
                            applicable_amount: applicableAmount,
                            discount_target: discountTarget,
                            description: coupon.description,
                            min_purchase: coupon.min_purchase,
                            applied_at: new Date().toISOString()
                        });

                        console.log(`Applied coupon ${code}:`, {
                            type: coupon.type,
                            discount_amount: discountAmount,
                            discount_target: discountTarget,
                            remaining_subtotal: finalSubtotal,
                            remaining_shipping: finalShippingCost
                        });

                    } catch (couponError) {
                        await trx.rollback();
                        return res.status(400).json({
                            status: 400,
                            message: `Error processing coupon '${code}': ${couponError.message}`,
                            });
                    }
                }

                // Validate that we haven't over-discounted
                if (finalSubtotal < 0 || finalShippingCost < 0) {
                    await trx.rollback();
                    return res.status(400).json({
                        status: 400,
                        message: 'Total discount exceeds applicable amounts',
                        data: {
                            original_subtotal: calculatedSubtotal,
                            final_subtotal: finalSubtotal,
                            original_shipping: shipping_cost,
                            final_shipping: finalShippingCost,
                            total_discount: totalCouponDiscount
                        }
                    });
                }

                console.log('Coupon processing summary:', {
                    original_subtotal: calculatedSubtotal + totalCouponDiscount, // Add back to show original
                    final_subtotal: finalSubtotal,
                    original_shipping: shipping_cost,
                    final_shipping: finalShippingCost,
                    total_discount: totalCouponDiscount,
                    applied_coupons: appliedCoupons.map(c => ({ code: c.code, type: c.type, discount: c.discount_amount }))
                });
            }

            // 3. Calculate final total
            const grandTotal = finalSubtotal + finalShippingCost;

            // 4. Create order record
            const [order] = await trx('orders')
                .insert({
                    user_id: user_id,
                    status: 'pending',
                    order_date: knex.fn.now(),
                    total_price: calculatedSubtotal,
                    shipping_cost: shipping_cost,
                    final_shipping_cost: finalShippingCost,
                    grand_total: grandTotal,
                    coupon_code: JSON.stringify(coupon_code), // Store as JSON array
                    discount_amount: totalCouponDiscount,
                    
                    // Shipping details
                    shipping_name,
                    shipping_code,
                    shipping_service,
                    shipping_description,
                    shipping_etd,
                    shipping_weight,
                    
                    // Receiver details
                    receiver_name,
                    receiver_phone,
                    receiver_address,
                    receiver_address_detail,
                    receiver_subdistrict_id,
                    receiver_subdistrict_name,
                    receiver_district_id,
                    receiver_district_name,
                    receiver_city_id,
                    receiver_city_name,
                    receiver_state_id,
                    receiver_state_name,
                    receiver_zip_code,
                    
                    // Payment details
                    payment_transaction_id: invoice_number,
                    // payment_method,
                    // payment_method_channel,
                    payment_status: 'pending',
                    
                    updated_at: knex.fn.now()
                })
                .returning('*');

            // 5. Insert order details and update stock
            for (const item of validatedItems) {
                await trx('order_details').insert({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                    created_at: knex.fn.now()
                });

                // Update product stock
                await trx('products')
                    .where('id', item.product_id)
                    .decrement('stock', item.quantity);
            }

            // 6. Apply coupon usage (increment count) and store applied coupons
            for (const appliedCoupon of appliedCoupons) {
                // Increment coupon usage count
                await trx('coupons')
                    .where('id', appliedCoupon.id)
                    .increment('usage_count', 1)
                    .update('updated_at', knex.fn.now());

                // Store applied coupon details (if you have an order_coupons table)
                // await trx('order_coupons').insert({
                //     order_id: order.id,
                //     coupon_id: appliedCoupon.id,
                //     coupon_code: appliedCoupon.code,
                //     discount_amount: appliedCoupon.discount_amount,
                //     created_at: knex.fn.now()
                // });
            }

            // 7. Prepare Midtrans transaction data
            const customer_details = {
                first_name: user.name ? user.name.split(' ')[0] : receiver_name.split(' ')[0],
                last_name: user.name ? user.name.split(' ').slice(1).join(' ') : receiver_name.split(' ').slice(1).join(' '),
                email: user.email,
                phone: user.phone || receiver_phone,
                billing_address: {
                    first_name: receiver_name.split(' ')[0],
                    last_name: receiver_name.split(' ').slice(1).join(' '),
                    email: user.email,
                    phone: receiver_phone,
                    address: receiver_address,
                    city: receiver_city_name,
                    postal_code: receiver_zip_code,
                    country_code: "IDN"
                },
                shipping_address: {
                    first_name: receiver_name.split(' ')[0],
                    last_name: receiver_name.split(' ').slice(1).join(' '),
                    email: user.email,
                    phone: receiver_phone,
                    address: `${receiver_address}${receiver_address_detail ? ', ' + receiver_address_detail : ''}`,
                    city: receiver_city_name,
                    postal_code: receiver_zip_code,
                    country_code: "IDN"
                }
            };

            const item_details = [
                // Product items
                ...validatedItems.map((item) => ({
                    id: encryptId(item.product_id),
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                
                // Shipping cost as separate item
                {
                    id: "SHIPPING",
                    name: `${shipping_name} - ${shipping_service}`,
                    price: shipping_cost,
                    quantity: 1
                },
                
                // Coupon discounts as negative items
                ...appliedCoupons.map((coupon, index) => ({
                    id: `DISCOUNT-${index + 1}`,
                    name: `Discount - ${coupon.code}`,
                    price: -coupon.discount_amount,
                    quantity: 1
                }))
            ];
            // console.log(`item_details: ${JSON.stringify(item_details)}`);
            const sum_item_details = item_details.reduce((sum, item) => {
                return sum + item.price;
            }, 0);
            // console.log(`sum of item_details: ${sum_item_details}`);
            // console.log(`gross_amount: ${grandTotal}`);
            // console.log(`finalSubtotal: ${finalSubtotal}`);
            // console.log(`finalShippingCost: ${finalShippingCost}`);

            // Validate total price matches calculated subtotal
            if (Math.abs(sum_item_details - total_price) > 1) {
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: `Total price mismatch. Expected: ${sum_item_details}, Received: ${total_price}`,
                    data: null
                });
            }

            // 8. Create Midtrans transaction
            const midtransData = {
                order_id: encryptId(order.id),
                gross_amount: sum_item_details,
                customer_details: customer_details,
                item_details: item_details
            };
            // payment_type: payment_method

            // Call Midtrans createTransaction
            const paymentResult = await createMidtransTransaction(midtransData, user_id);

            // 9. Update order with Midtrans transaction details
            await trx('orders')
                .where('id', order.id)
                .update({
                    payment_transaction_id: paymentResult.data.transaction_id,
                    updated_at: knex.fn.now()
                });

            await trx.commit();

            // 10. Send confirmation email (optional)
            try {
                await sendOrderConfirmationEmail({
                    email: user.email,
                    invoice_number: invoice_number,
                    total_amount: sum_item_details,
                    payment_url: paymentResult.data.redirect_url,
                    order_details: validatedItems
                });
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the order creation if email fails
            }

            // 11. Return success response
            res.status(201).json({
                status: 201,
                message: 'Order created successfully',
                data: {
                    order: {
                        id: encryptId(order.id),
                        invoice_number: invoice_number,
                        subtotal: calculatedSubtotal,
                        shipping_cost: shipping_cost,
                        final_shipping_cost: finalShippingCost,
                        total_discount: totalCouponDiscount,
                        grand_total: grandTotal,
                        status: order.status,
                        payment_status: order.payment_status,
                        created_at: order.order_date,
                        
                        shipping_details: {
                            name: shipping_name,
                            code: shipping_code,
                            service: shipping_service,
                            description: shipping_description,
                            cost: shipping_cost,
                            final_cost: finalShippingCost,
                            etd: shipping_etd,
                            weight: shipping_weight
                        },
                        
                        receiver_details: {
                            name: receiver_name,
                            phone: receiver_phone,
                            address: receiver_address,
                            address_detail: receiver_address_detail,
                            subdistrict_id: receiver_subdistrict_id,
                            subdistrict_name: receiver_subdistrict_name,
                            district_id: receiver_district_id,
                            district_name: receiver_district_name,
                            city_id: receiver_city_id,
                            city_name: receiver_city_name,
                            state_id: receiver_state_id,
                            state_name: receiver_state_name,
                            zip_code: receiver_zip_code
                        }
                    },
                    
                    payment: {
                        token: paymentResult.data.token,
                        redirect_url: paymentResult.data.redirect_url,
                        transaction_id: paymentResult.data.transaction_id
                    },
                    
                    coupons_applied: appliedCoupons,
                    
                    items: validatedItems.map(item => ({
                        product_id: encryptId(item.product_id),
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        subtotal: item.subtotal
                    }))
                }
            });

        } catch (err) {
            await trx.rollback();
            console.error('createOrder error:', err);
            
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/orders/me:
     *   get:
     *     summary: Get all orders for the authenticated user
     *     tags: [Orders]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *         description: Page number for pagination
     *         example: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *         description: Number of orders per page
     *         example: 10
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [pending, processing, shipped, delivered, cancelled]
     *         description: Filter orders by status
     *         example: "processing"
     *       - in: query
     *         name: payment_status
     *         schema:
     *           type: string
     *           enum: [pending, paid, failed]
     *         description: Filter orders by payment status
     *         example: "paid"
     *     responses:
     *       200:
     *         description: User orders retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: "Orders retrieved successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     orders:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: string
     *                             description: Encrypted order ID
     *                             example: "encrypted_order_id"
     *                           user_id:
     *                             type: string
     *                             description: Encrypted user ID
     *                             example: "encrypted_user_id"
     *                           status:
     *                             type: string
     *                             enum: [pending, processing, shipped, delivered, cancelled]
     *                             example: "processing"
     *                           order_date:
     *                             type: string
     *                             format: date-time
     *                             example: "2023-11-15T10:30:00Z"
     *                           total_price:
     *                             type: number
     *                             example: 150000
     *                           shipping_cost:
     *                             type: number
     *                             example: 15000
     *                           grand_total:
     *                             type: number
     *                             example: 165000
     *                           discount_amount:
     *                             type: number
     *                             example: 5000
     *                           coupon_codes:
     *                             type: string
     *                             description: JSON string of applied coupon codes
     *                             example: '["DISCOUNT5", "FREEONGKIR"]'
     *                           shipping_name:
     *                             type: string
     *                             example: "SiCepat Express"
     *                           shipping_service:
     *                             type: string
     *                             example: "GOKIL"
     *                           shipping_etd:
     *                             type: string
     *                             example: "2-3 day"
     *                           receiver_name:
     *                             type: string
     *                             example: "Budi Santoso"
     *                           receiver_phone:
     *                             type: string
     *                             example: "08123456789"
     *                           receiver_address:
     *                             type: string
     *                             example: "Jl. Merdeka No.123"
     *                           receiver_city_name:
     *                             type: string
     *                             example: "KABUPATEN TANGERANG"
     *                           receiver_state_name:
     *                             type: string
     *                             example: "BANTEN"
     *                           receiver_zip_code:
     *                             type: string
     *                             example: "15831"
     *                           payment_method:
     *                             type: string
     *                             example: "VA"
     *                           payment_method_channel:
     *                             type: string
     *                             example: "BCA"
     *                           payment_status:
     *                             type: string
     *                             enum: [pending, paid, failed]
     *                             example: "paid"
     *                           payment_transaction_id:
     *                             type: string
     *                             example: "TXN-123456789"
     *                           tracking_number:
     *                             type: string
     *                             example: "SICEPAT123456789"
     *                           updated_at:
     *                             type: string
     *                             format: date-time
     *                             example: "2023-11-15T10:30:00Z"
     *                           items:
     *                             type: array
     *                             items:
     *                               type: object
     *                               properties:
     *                                 id:
     *                                   type: integer
     *                                   example: 1
     *                                 order_id:
     *                                   type: integer
     *                                   example: 123
     *                                 product_id:
     *                                   type: string
     *                                   description: Encrypted product ID
     *                                   example: "encrypted_product_id"
     *                                 quantity:
     *                                   type: integer
     *                                   example: 2
     *                                 price:
     *                                   type: number
     *                                   example: 75000
     *                                 subtotal:
     *                                   type: number
     *                                   example: 150000
     *                                 created_at:
     *                                   type: string
     *                                   format: date-time
     *                                   example: "2023-11-15T10:30:00Z"
     *                                 updated_at:
     *                                   type: string
     *                                   format: date-time
     *                                   example: "2023-11-15T10:30:00Z"
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         current_page:
     *                           type: integer
     *                           example: 1
     *                         per_page:
     *                           type: integer
     *                           example: 10
     *                         total:
     *                           type: integer
     *                           example: 25
     *                         total_pages:
     *                           type: integer
     *                           example: 3
     *                         has_next:
     *                           type: boolean
     *                           example: true
     *                         has_prev:
     *                           type: boolean
     *                           example: false
     *       401:
     *         description: Unauthorized - Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 401
     *                 message:
     *                   type: string
     *                   example: "Authentication required"
     *       404:
     *         description: No orders found
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 404
     *                 message:
     *                   type: string
     *                   example: "No orders found"
     *                 data:
     *                   type: null
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 500
     *                 message:
     *                   type: string
     *                   example: "Internal server error"
     *                 error:
     *                   type: string
     *                   example: "Database connection failed"
     */
    getUserOrders: async (req, res) => {
        try {
            const user_id = decryptId(req.user.id);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const status = req.query.status;
            const payment_status = req.query.payment_status;

            // Build base query
            let baseQuery = knex('orders')
                .where({ user_id })
                .whereNull('deleted_at');

            // Apply filters
            if (status) {
                baseQuery = baseQuery.where('status', status);
            }
            if (payment_status) {
                baseQuery = baseQuery.where('payment_status', payment_status);
            }

            // Get total count for pagination
            const totalCount = await baseQuery.clone().count('id as count').first();
            const total = parseInt(totalCount.count);
            const totalPages = Math.ceil(total / limit);

            // Get orders with pagination
            const orders = await baseQuery
                .select('*')
                .orderBy('order_date', 'desc')
                .limit(limit)
                .offset(offset);

            if (orders.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No orders found',
                    data: null
                });
            }

            // Get order items for each order
            for (const order of orders) {
                const orderItems = await knex('order_details')
                    .where({ order_id: order.id })
                    .whereNull('deleted_at')
                    .select('*');

                // Encrypt product IDs in order items
                order.items = orderItems.map(item => ({
                    ...item,
                    product_id: encryptId(item.product_id)
                }));

                // Encrypt order and user IDs
                order.id = encryptId(order.id);
                order.user_id = encryptId(order.user_id);
            }

            const pagination = {
                current_page: page,
                per_page: limit,
                total: total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1
            };

            res.status(200).json({
                status: 200,
                message: 'Orders retrieved successfully',
                data: {
                    orders,
                    pagination
                }
            });

        } catch (err) {
            console.error('getUserOrders error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/orders:
     *   get:
     *     summary: Get all orders with filtering and pagination
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Number of items per page
     *       - in: query
     *         name: start_date
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter orders from this date (YYYY-MM-DD)
     *       - in: query
     *         name: end_date
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter orders until this date (YYYY-MM-DD)
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *         description: Filter by order status (pending, processing, shipped, delivered, cancelled)
     *       - in: query
     *         name: payment_status
     *         schema:
     *           type: string
     *         description: Filter by payment status (pending, paid, failed, refunded)
     *       - in: query
     *         name: user_id
     *         schema:
     *           type: string
     *         description: Filter by encrypted user ID
     *     responses:
     *       200:
     *         description: List of orders retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: Orders retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     orders:
     *                       type: array
     *                       items:
     *                         type: object
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         total:
     *                           type: integer
     *                         per_page:
     *                           type: integer
     *                         current_page:
     *                           type: integer
     *                         last_page:
     *                           type: integer
     *                         from:
     *                           type: integer
     *                         to:
     *                           type: integer
     *       401:
     *         description: Unauthorized - Invalid or missing token
     *       403:
     *         description: Forbidden - User doesn't have admin access
     *       500:
     *         description: Server error
     */
    getAllOrders: async (req, res) => {
        try {
            // Get the authenticated user ID
            const user_id = decryptId(req.user.id);
            
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            // Filter parameters
            const { start_date, end_date, status, payment_status } = req.query;
            
            // Build base query with join to users table
            let query = knex('orders')
                .join('users', 'orders.user_id', '=', 'users.id')
                .whereNull('orders.deleted_at')
                .select(
                    'orders.*',
                    'users.name as user_name',
                    'users.email as user_email'
                );
            
            // Apply filters
            if (start_date) {
                query = query.where('orders.created_at', '>=', `${start_date} 00:00:00`);
            }
            
            if (end_date) {
                query = query.where('orders.created_at', '<=', `${end_date} 23:59:59`);
            }
            
            if (status) {
                query = query.where('orders.status', status);
            }
            
            if (payment_status) {
                query = query.where('orders.payment_status', payment_status);
            }
            
            if (user_id) {
                query = query.where('orders.user_id', user_id);
            }
            
            // Get total count for pagination
            const countQuery = query.clone();
            const totalResult = await countQuery.count('orders.id as total').first();
            const total = parseInt(totalResult.total);
            
            // Execute main query with pagination
            const orders = await query
                .orderBy('orders.created_at', 'desc')
                .limit(limit)
                .offset(offset);
            
            // Process orders
            const processedOrders = [];
            for (const order of orders) {
                // Get order items
                const orderItems = await knex('order_details')
                    .where({ order_id: order.id })
                    .whereNull('deleted_at');
                    
                // Process each order
                const processedOrder = {
                    id: encryptId(order.id),
                    user_id: encryptId(order.user_id),
                    user_name: order.user_name,
                    user_email: order.user_email,
                    order_number: order.order_number,
                    status: order.status,
                    total_amount: parseFloat(order.total_amount),
                    shipping_address: order.shipping_address,
                    billing_address: order.billing_address,
                    payment_method: order.payment_method,
                    payment_status: order.payment_status,
                    shipping_method: order.shipping_method,
                    tracking_number: order.tracking_number,
                    notes: order.notes,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    items: orderItems.map(item => ({
                        id: item.id,
                        product_id: encryptId(item.product_id),
                        quantity: item.quantity,
                        price: parseFloat(item.price),
                        subtotal: parseFloat(item.subtotal || (item.price * item.quantity))
                    }))
                };
                
                processedOrders.push(processedOrder);
            }
            
            // Calculate pagination info
            const last_page = Math.ceil(total / limit);
            
            res.status(200).json({
                status: 200,
                message: 'Orders retrieved successfully',
                data: {
                    orders: processedOrders,
                    pagination: {
                        total: total,
                        per_page: limit,
                        current_page: page,
                        last_page: last_page,
                        from: offset + 1,
                        to: Math.min(offset + limit, total)
                    }
                }
            });
        } catch (err) {
            console.error('getAllOrders error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
},

    /**
     * @swagger
     * /api/orders/details/{order_id}:
     *   get:
     *     summary: Get order details for a specific order
     *     tags: [Orders]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: order_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted order ID
     *         example: "encrypted_order_id_string"
     *       - in: query
     *         name: include_product_info
     *         schema:
     *           type: boolean
     *           default: false
     *         description: Include product information in response
     *         example: true
     *     responses:
     *       200:
     *         description: Order details retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: "Order details retrieved successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     order_id:
     *                       type: string
     *                       description: Encrypted order ID
     *                       example: "encrypted_order_id"
     *                     order_details:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: integer
     *                             example: 1
     *                           order_id:
     *                             type: string
     *                             description: Encrypted order ID
     *                             example: "encrypted_order_id"
     *                           product_id:
     *                             type: string
     *                             description: Encrypted product ID
     *                             example: "encrypted_product_id"
     *                           quantity:
     *                             type: integer
     *                             example: 2
     *                           price:
     *                             type: number
     *                             format: decimal
     *                             example: 75000.00
     *                           subtotal:
     *                             type: number
     *                             format: decimal
     *                             example: 150000.00
     *                           created_at:
     *                             type: string
     *                             format: date-time
     *                             example: "2023-11-15T10:30:00Z"
     *                           product_info:
     *                             type: object
     *                             description: Only included when include_product_info=true
     *                             properties:
     *                               id:
     *                                 type: string
     *                                 description: Encrypted product ID
     *                               name:
     *                                 type: string
     *                                 example: "iPhone 14 Pro"
     *                               description:
     *                                 type: string
     *                                 example: "Latest iPhone with advanced features"
     *                               image_url:
     *                                 type: string
     *                                 example: "https://example.com/images/iphone14pro.jpg"
     *                               category:
     *                                 type: string
     *                                 example: "Electronics"
     *                     summary:
     *                       type: object
     *                       properties:
     *                         total_items:
     *                           type: integer
     *                           example: 3
     *                         total_quantity:
     *                           type: integer
     *                           example: 5
     *                         total_amount:
     *                           type: number
     *                           example: 375000.00
     *       400:
     *         description: Bad request - Invalid order ID format
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 400
     *                 message:
     *                   type: string
     *                   example: "Invalid order ID format"
     *                 data:
     *                   type: null
     *       401:
     *         description: Unauthorized - Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 401
     *                 message:
     *                   type: string
     *                   example: "Authentication required"
     *       403:
     *         description: Forbidden - Order does not belong to user
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 403
     *                 message:
     *                   type: string
     *                   example: "Access denied - Order does not belong to you"
     *                 data:
     *                   type: null
     *       404:
     *         description: Order not found or no details found
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 404
     *                 message:
     *                   type: string
     *                   example: "Order not found or no details available"
     *                 data:
     *                   type: null
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 500
     *                 message:
     *                   type: string
     *                   example: "Internal server error"
     *                 error:
     *                   type: string
     *                   example: "Database connection failed"
     */
    getOrderDetails: async (req, res) => {
        try {
            const user_id = decryptId(req.user.id);
            const { order_id } = req.params;
            const include_product_info = req.query.include_product_info === 'true';
            // Validate and decrypt order ID
            let decrypted_order_id;
            try {
                decrypted_order_id = decryptId(order_id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid order ID format',
                    });
            }
            // Verify that the order belongs to the authenticated user
            const order = await knex('orders')
                .where('id', decrypted_order_id)
                .whereNull('deleted_at')
                .first();
            
            // admin check
            const isAdmin = await knex('admins')
            .where({ user_id })
            .whereNull('deleted_at')
            .first();
            if (!isAdmin && (!order || order.user_id !== user_id)) {
                return res.status(404).json({
                    status: 404,
                    message: 'Order not found or access denied',
                    data: null
                });
            }
            // Get order details
            let orderDetailsQuery = knex('order_details')
                .where('order_id', decrypted_order_id)
                .whereNull('deleted_at')
                .select('*')
                .orderBy('id');
            const orderDetails = await orderDetailsQuery;
            if (orderDetails.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No order details found for this order',
                });
            }
            // Process order details and optionally include product info
            let processedDetails = [];
            let totalQuantity = 0;
            let totalAmount = 0;
            for (const detail of orderDetails) {
                let processedDetail = {
                    id: detail.id,
                    order_id: encryptId(detail.order_id),
                    product_id: encryptId(detail.product_id),
                    quantity: detail.quantity,
                    price: parseFloat(detail.price),
                    subtotal: parseFloat(detail.subtotal || (detail.price * detail.quantity)),
                    created_at: detail.created_at
                };
                // Include product information if requested
                if (include_product_info) {
                    try {
                        const product = await knex('products')
                            .where('id', detail.product_id)
                            .whereNull('deleted_at')
                            .select('id', 'name', 'description', 'image_url', 'category', 'sku')
                            .first();
                        if (product) {
                            processedDetail.product_info = {
                                id: encryptId(product.id),
                                name: product.name,
                                description: product.description,
                                image_url: product.image_url,
                                category: product.category,
                                sku: product.sku
                            };
                        } else {
                            processedDetail.product_info = {
                                id: encryptId(detail.product_id),
                                name: 'Product not found',
                                description: null,
                                image_url: null,
                                category: null,
                                sku: null
                            };
                        }
                    } catch (productError) {
                        console.error('Error fetching product info:', productError);
                        processedDetail.product_info = null;
                    }
                }
                totalQuantity += detail.quantity;
                totalAmount += parseFloat(detail.subtotal || (detail.price * detail.quantity));
                
                processedDetails.push(processedDetail);
            }
            // Prepare summary
            const summary = {
                total_items: processedDetails.length,
                total_quantity: totalQuantity,
                total_amount: totalAmount
            };

            // Process order data to include in response
            const processedOrder = order ? {
                id: encryptId(order.id),
                user_id: encryptId(order.user_id),
                order_number: order.order_number,
                status: order.status,
                total_amount: parseFloat(order.total_amount),
                shipping_address: order.shipping_address,
                billing_address: order.billing_address,
                payment_method: order.payment_method,
                payment_status: order.payment_status,
                shipping_method: order.shipping_method,
                tracking_number: order.tracking_number,
                notes: order.notes,
                created_at: order.created_at,
                updated_at: order.updated_at
            } : null;

            res.status(200).json({
                status: 200,
                message: 'Order details retrieved successfully',
                order: processedOrder,
                    order_id: order_id,
                    order_details: processedDetails,
                    summary: summary
            });
        } catch (err) {
            console.error('getOrderDetails error:', err);
            
            if (err.message && err.message.includes('decrypt')) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid order ID format',
                    data: null
                });
            }
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/admin/order-details:
     *   get:
     *     summary: Get all order details with pagination (Admin only)
     *     tags: [Admin, Orders]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *         description: Page number
     *         example: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 20
     *         description: Number of items per page
     *         example: 20
     *       - in: query
     *         name: order_id
     *         schema:
     *           type: string
     *         description: Filter by specific encrypted order ID
     *         example: "encrypted_order_id"
     *       - in: query
     *         name: product_id
     *         schema:
     *           type: string
     *         description: Filter by specific encrypted product ID
     *         example: "encrypted_product_id"
     *     responses:
     *       200:
     *         description: Order details retrieved successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Admin access required
     *       500:
     *         description: Internal server error
     */
    getAllOrderDetails: async (req, res) => {
        try {
            // Check admin access
            const user_id = decryptId(req.user.id);
            const adminCheck = await knex('admins')
                .where('user_id', user_id)
                .whereNull('deleted_at')
                .first();

            if (!adminCheck) {
                return res.status(403).json({
                    status: 403,
                    message: 'Admin access required',
                    data: null
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const order_id_filter = req.query.order_id;
            const product_id_filter = req.query.product_id;

            // Build base query
            let baseQuery = knex('order_details as od')
                .leftJoin('orders as o', 'od.order_id', 'o.id')
                .leftJoin('products as p', 'od.product_id', 'p.id')
                .leftJoin('users as u', 'o.user_id', 'u.id')
                .whereNull('od.deleted_at');

            // Apply filters
            if (order_id_filter) {
                const decrypted_order_id = decryptId(order_id_filter);
                baseQuery = baseQuery.where('od.order_id', decrypted_order_id);
            }

            if (product_id_filter) {
                const decrypted_product_id = decryptId(product_id_filter);
                baseQuery = baseQuery.where('od.product_id', decrypted_product_id);
            }

            // Get total count
            const totalCount = await baseQuery.clone().count('od.id as count').first();
            const total = parseInt(totalCount.count);
            const totalPages = Math.ceil(total / limit);

            // Get order details with related info
            const orderDetails = await baseQuery
                .select(
                    'od.*',
                    'o.status as order_status',
                    'o.payment_status',
                    'o.order_date',
                    'p.name as product_name',
                    'p.sku as product_sku',
                    'u.name as customer_name',
                    'u.email as customer_email'
                )
                .orderBy('od.created_at', 'desc')
                .limit(limit)
                .offset(offset);

            // Process and encrypt IDs
            const processedDetails = orderDetails.map(detail => ({
                id: detail.id,
                order_id: encryptId(detail.order_id),
                product_id: encryptId(detail.product_id),
                quantity: detail.quantity,
                price: parseFloat(detail.price),
                subtotal: parseFloat(detail.subtotal || (detail.price * detail.quantity)),
                created_at: detail.created_at,
                order_info: {
                    status: detail.order_status,
                    payment_status: detail.payment_status,
                    order_date: detail.order_date
                },
                product_info: {
                    name: detail.product_name,
                    sku: detail.product_sku
                },
                customer_info: {
                    name: detail.customer_name,
                    email: detail.customer_email
                }
            }));

            const pagination = {
                current_page: page,
                per_page: limit,
                total: total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1
            };

            res.status(200).json({
                status: 200,
                message: 'Order details retrieved successfully',
                data: {
                    order_details: processedDetails,
                    pagination: pagination
                }
            });

        } catch (err) {
            console.error('getAllOrderDetails error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/orders/status/{order_id}:
     *   put:
     *     summary: Update order status, tracking number, or payment status
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: order_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted ID of the order to update
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               status:
     *                 type: string
     *                 enum: [pending, processing, shipped, delivered, cancelled]
     *                 description: New order status
     *               payment_status:
     *                 type: string
     *                 enum: [pending, paid, failed, refunded, cancelled]
     *                 description: New payment status
     *               tracking_number:
     *                 type: string
     *                 description: Shipping tracking number
     *               payment_cancel_reason:
     *                 type: string
     *                 description: Reason for payment cancellation (required when status or payment_status is cancelled)
     *             example:
     *               status: shipped
     *               tracking_number: TRACK123456789
     *     responses:
     *       200:
     *         description: Order status updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: Order status updated successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     order:
     *                       type: object
     *       400:
     *         description: Invalid input or request
     *       401:
     *         description: Unauthorized - Invalid or missing token
     *       403:
     *         description: Forbidden - User doesn't have admin access
     *       404:
     *         description: Order not found
     *       500:
     *         description: Server error
     */
    updateOrderStatus: async (req, res) => {
        try {
            // Get authenticated user ID
            // const user_id = decryptId(req.user.id);
            
            // Decrypt and validate order ID
            const { order_id } = req.params;
            let decrypted_order_id;
            
            try {
                decrypted_order_id = decryptId(order_id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid order ID format',
                });
            }
            
            // Get request body data
            const { 
                status, 
                payment_status, 
                tracking_number,
                payment_cancel_reason
            } = req.body;
            
            // Validate at least one field to update is provided
            if (!status && !payment_status && !tracking_number) {
                return res.status(400).json({
                    status: 400,
                    message: 'At least one of status, payment_status, or tracking_number must be provided',
                });
            }
            
            // Validate status value if provided
            if (status && !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid status value. Must be one of: pending, processing, shipped, delivered, cancelled',
                });
            }
            
            // Validate payment_status value if provided
            if (payment_status && !['pending', 'paid', 'failed', 'refunded', 'cancelled'].includes(payment_status)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid payment_status value. Must be one of: pending, paid, failed, refunded, cancelled',
                });
            }
            
            // If status or payment_status is cancelled, payment_cancel_reason is required
            if ((status === 'cancelled' || payment_status === 'cancelled') && !payment_cancel_reason) {
                return res.status(400).json({
                    status: 400,
                    message: 'Payment cancel reason is required when cancelling an order',
                });
            }
            
            // Check if order exists
            const existingOrder = await knex('orders')
                .where('id', decrypted_order_id)
                .whereNull('deleted_at')
                .first();
                
            if (!existingOrder) {
                return res.status(404).json({
                    status: 404,
                    message: 'Order not found',
                });
            }
            
            // Prepare update data
            const updateData = {};
            
            if (status) updateData.status = status;
            if (payment_status) updateData.payment_status = payment_status;
            if (tracking_number) updateData.tracking_number = tracking_number;
            if (payment_cancel_reason) updateData.payment_cancel_reason = payment_cancel_reason;
            
            // Add updated timestamp
            updateData.updated_at = knex.fn.now();
            
            // Update the order
            await knex('orders')
                .where('id', decrypted_order_id)
                .update(updateData);
                
            // Get updated order data
            const updatedOrder = await knex('orders')
                .where('id', decrypted_order_id)
                .first();
                
            // Process order data for response
            const processedOrder = {
                id: encryptId(updatedOrder.id),
                user_id: encryptId(updatedOrder.user_id),
                status: updatedOrder.status,
                order_date: updatedOrder.order_date,
                total_price: parseFloat(updatedOrder.total_price),
                coupon_code: updatedOrder.coupon_code,
                discount_amount: updatedOrder.discount_amount ? parseFloat(updatedOrder.discount_amount) : null,
                receiver_address: updatedOrder.receiver_address,
                shipping_service: updatedOrder.shipping_service,
                shipping_cost: updatedOrder.shipping_cost ? parseFloat(updatedOrder.shipping_cost) : null,
                shipping_etd: updatedOrder.shipping_etd,
                receiver_name: updatedOrder.receiver_name,
                receiver_phone: updatedOrder.receiver_phone,
                receiver_address_detail: updatedOrder.receiver_address_detail,
                receiver_subdistrict_id: updatedOrder.receiver_subdistrict_id,
                receiver_subdistrict_name: updatedOrder.receiver_subdistrict_name,
                payment_transaction_id: updatedOrder.payment_transaction_id,
                payment_contract_id: updatedOrder.payment_contract_id,
                payment_method: updatedOrder.payment_method,
                payment_method_channel: updatedOrder.payment_method_channel,
                payment_status: updatedOrder.payment_status,
                payment_cancel_reason: updatedOrder.payment_cancel_reason,
                tracking_number: updatedOrder.tracking_number,
                receiver_district_id: updatedOrder.receiver_district_id,
                receiver_district_name: updatedOrder.receiver_district_name,
                receiver_city_id: updatedOrder.receiver_city_id,
                receiver_city_name: updatedOrder.receiver_city_name,
                receiver_state_id: updatedOrder.receiver_state_id,
                receiver_state_name: updatedOrder.receiver_state_name,
                receiver_zip_code: updatedOrder.receiver_zip_code,
                origin_id: updatedOrder.origin_id,
                destination_id: updatedOrder.destination_id,
                shipping_name: updatedOrder.shipping_name,
                shipping_code: updatedOrder.shipping_code,
                shipping_description: updatedOrder.shipping_description,
                shipping_weight: updatedOrder.shipping_weight,
                final_shipping_cost: updatedOrder.final_shipping_cost ? parseFloat(updatedOrder.final_shipping_cost) : null,
                grand_total: updatedOrder.grand_total ? parseFloat(updatedOrder.grand_total) : null,
                updated_at: updatedOrder.updated_at
            };
            
            // Send success response
            res.status(200).json({
                status: 200,
                message: 'Order status updated successfully',
                data: {
                    order: processedOrder
                }
            });
            
        } catch (err) {
            console.error('updateOrderStatus error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/orders/payment-status:
     *   post:
     *     summary: Query payment status
     *     tags: [Orders]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               transaction_id:
     *                 type: string
     *                 example: "TXN-123456789"
     *     responses:
     *       200:
     *         description: Payment status retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "success"
     *                 data:
     *                   type: object
     *                   additionalProperties: true
     */
    statusPayment: async (req, res) => {
        const { transaction_id } = req.body;

        if (!transaction_id) {
            return res.status(400).json({ message: 'Transaction ID is required' });
        }

        const singleOrder = await knex('orders')
            .where({ payment_transaction_id: transaction_id })
            .whereNull('deleted_at')
            .select('payment_contract_id, payment_method, payment_method_channel')
            .first();
        
        if (!singleOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const SingleUser = await knex('users')
            .where({ id: singleOrder.user_id })
            .whereNull('deleted_at')
            .first();


        try {
            let paymentResponse;
            let statusPayment;
            // Check payment method based on transaction_id (can be extended)
            if (singleOrder.payment_method === "VA") {
                const payload = {
                    trxId: transaction_id,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id
                    }
                }
                const checkStatusVA = await inquiryVirtualAccountPayment(payload, getTimestamp());

                const expiredDateStr = checkStatusVA.virtualAccountData.expiredDate; // e.g. "2023-09-01T19:30:14+00:00"
                const expiredDate = new Date(expiredDateStr);
                const currentDate = new Date();

                if (expiredDate > currentDate) {
                    return res.status(400).json({ message: 'Payment has expired' });
                } else {
                    payload = {
                        virtualAccountNo: SingleUser.phone,
                        additionalInfo: {
                            contractId: singleOrder.payment_contract_id,
                            channel: singleOrder.payment_method_channel,
                            trxId: transaction_id
                        }
                    }
                    paymentResponse = await inquirystatusVirtualAccountPayment(payload, getTimestamp());
                }
                statusPayment = paymentResponse.virtualAccountData.paymentFlagStatus==="00" ? "paid" : "unpaid";
                
            }else if (singleOrder.payment_method === "EWALLET") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: singleOrder.payment_method_channel,
                    }
                }
                paymentResponse = await statusEWalletPayment(payload, getTimestamp());
                statusPayment = paymentResponse.latesTransactionStatus==="00" ? "paid" : "unpaid";
            }else if (singleOrder.payment_method === "QRIS") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    serviceCode: "47",
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                    }
                }
                paymentResponse = await statusQRISPayment(payload, getTimestamp());
                statusPayment = paymentResponse.latesTransactionStatus==="00" ? "paid" : "unpaid";
            }else if (singleOrder.payment_method === "CC") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: "CC"
                    }
                }
                paymentResponse = await queryCreditCardPayment(payload, getTimestamp());
                statusPayment = paymentResponse.latesTransactionStatus==="00" ? "paid" : "unpaid";
            }

            if(paymentResponse) {
                if(statusPayment === 'paid'){
                    await knex('orders')
                        .where({ id: singleOrder.id })
                        .update({
                            payment_status: 'paid'});
                }
                        
                return res.status(200).json({ message: statusPayment === 'paid' ? 'Payment Success' : 'Waiting Payment', status: statusPayment });
            }else{
                return res.status(400).json({ message: 'Invalid payment method' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/orders/cancel-payment:
     *   post:
     *     summary: Cancel a payment
     *     tags: [Orders]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               transaction_id:
     *                 type: string
     *                 example: "TXN-123456789"
     *     responses:
     *       200:
     *         description: Payment canceled successfully
     *       400:
     *         description: Invalid transaction ID or cancellation failed
     *       500:
     *         description: Server error
     */
    cancelPayment: async (req, res) => {
        const { transaction_id, reason } = req.body;

        if (!transaction_id) {
            return res.status(400).json({ message: 'Transaction ID is required' });
        }

        const singleOrder = await knex('orders')
            .where({ payment_transaction_id: transaction_id })
            .whereNull('deleted_at')
            .select('payment_contract_id, payment_method, payment_method_channel, receiver_phone')
            .first();
        
        if (!singleOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const SingleUser = await knex('users')
            .where({ id: singleOrder.user_id })
            .whereNull('deleted_at')
            .first();

        try {
            let cancelResponse;

            // Check payment method based on transaction_id (can be extended)
            if (singleOrder.payment_method === "VA") {
                payload = {
                    virtualAccountNo: SingleUser.phone,
                    trxId: transaction_id,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: singleOrder.payment_method_channel
                    }
                }
                cancelResponse = await cancelVirtualAccountPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method === "EWALLET") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: singleOrder.payment_method_channel
                    }
                }
                cancelResponse = await cancelEWalletPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method === "QRIS") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo:{
                        contractId: singleOrder.payment_contract_id
                    }
                }
                cancelResponse = await cancelQRISPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method ==="CC") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo:{
                        contractId: singleOrder.payment_contract_id,
                        channel: "CC"
                    }
                }
                cancelResponse = await cancelCreditCardPayment(payload, getTimestamp());
            } else {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if(cancelResponse && cancelResponse.responseCode === "2005700") {
                await knex('orders')
                    .where({ id: singleOrder.id, payment_contract_id: cancelResponse.additionalInfo.contractId })
                    .update({payment_status: 'cancel', payment_cancel_reason: reason});
                        
                res.status(200).json({
                    status: 'success',
                    message: 'Payment cancelled successfully',
                    });
            }else{
                res.status(400).json({
                    status: 'failure',
                    message: 'Payment cancellation failed',
                    });
            }

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    },

    callbackPayment: async (req, res) => {
        const { transaction_id } = req.body;

        if (!transaction_id) {
            return res.status(400).json({ message: 'Transaction ID is required' });
        }

        const singleOrder = await knex('orders')
            .where({ payment_transaction_id: transaction_id })
            .whereNull('deleted_at')
            .select('payment_contract_id, payment_method, payment_method_channel, receiver_phone, user_id')
            .first();
        
        if (!singleOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const SingleUser = await knex('users')
            .where({ id: singleOrder.user_id })
            .whereNull('deleted_at')
            .first();

        try {
            let callbackResponse;

            // Check payment method based on transaction_id (can be extended)
            if (singleOrder.payment_method === "VA") {
                payload = {
                    virtualAccountNo: SingleUser.phone,
                    trxId: transaction_id,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: singleOrder.payment_method_channel
                    }
                }
                payload = {
                    partnerServiceId: process.env.PARTNER_SERVICE_ID,
                    customerNo: process.env.CUSTOMER_NO,
                    virtualAccountNo: SingleUser.phone,
                    virtualAccountName: "Bayar 2269141693903614",
                    trxId: singleOrder.payment_transaction_id,
                    paymentRequestId: "88889123",
                    paidAmount: {
                      "value": "10000",
                      "currency": "IDR"
                    },
                    trxDateTime: "2023-09-05T22:47:00+07:00",
                    referenceNo: 36238,
                    additionalInfo: {
                        channel: singleOrder.payment_method_channel,
                        contractId: singleOrder.payment_contract_id
                    }
                  }
                callbackResponse = await cancelVirtualAccountPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method === "EWALLET") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo: {
                        contractId: singleOrder.payment_contract_id,
                        channel: singleOrder.payment_method_channel
                    }
                }
                callbackResponse = await cancelEWalletPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method === "QRIS") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo:{
                        contractId: singleOrder.payment_contract_id
                    }
                }
                callbackResponse = await cancelQRISPayment(payload, getTimestamp());
            } else if (singleOrder.payment_method ==="CC") {
                payload = {
                    originalPartnerReferenceNo: transaction_id,
                    reason: reason,
                    additionalInfo:{
                        contractId: singleOrder.payment_contract_id,
                        channel: "CC"
                    }
                }
                callbackResponse = await cancelCreditCardPayment(payload, getTimestamp());
            } else {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if(callbackResponse && callbackResponse.responseCode === "2005700") {
                await knex('orders')
                    .where({ id: singleOrder.id, payment_contract_id: cancelResponse.additionalInfo.contractId })
                    .update({payment_status: 'cancel', payment_cancel_reason: reason});
                        
                res.status(200).json({
                    status: 'success',
                    message: 'Payment cancelled successfully',
                    });
            }else{
                res.status(400).json({
                    status: 'failure',
                    message: 'Payment cancellation failed',
                    });
            }

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    },
};
