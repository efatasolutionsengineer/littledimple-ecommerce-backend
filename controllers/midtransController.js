const midtransClient = require('midtrans-client');
const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');

// Initialize Midtrans client
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true' || false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

const coreApi = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true' || false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * @swagger
 * components:
 *   schemas:
 *     MidtransTransaction:
 *       type: object
 *       properties:
 *         order_id:
 *           type: string
 *           description: Encrypted order ID
 *         gross_amount:
 *           type: number
 *           description: Total amount
 *         customer_details:
 *           type: object
 *           properties:
 *             first_name:
 *               type: string
 *             last_name:
 *               type: string
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *         item_details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 */

module.exports = {
    /**
     * @swagger
     * /api/midtrans/create-transaction:
     *   post:
     *     summary: Create Midtrans payment transaction
     *     tags: [Midtrans]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - order_id
     *               - gross_amount
     *               - customer_details
     *               - item_details
     *             properties:
     *               order_id:
     *                 type: string
     *                 description: Encrypted order ID
     *                 example: "08f9efede18cf28268e06bd86eedf249"
     *               gross_amount:
     *                 type: number
     *                 description: Total amount
     *                 example: 2400000
     *               customer_details:
     *                 type: object
     *                 properties:
     *                   first_name:
     *                     type: string
     *                     example: "Rano"
     *                   last_name:
     *                     type: string
     *                     example: "Muhamad"
     *                   email:
     *                     type: string
     *                     example: "ranomuhamad98@gmail.com"
     *                   phone:
     *                     type: string
     *                     example: "+6285716800875"
     *                   billing_address:
     *                     type: object
     *                     properties:
     *                       address:
     *                         type: string
     *                         example: "Jl. Palapa Blok F12"
     *                       city:
     *                         type: string
     *                         example: "KOTA TANGERANG SELATAN"
     *                       postal_code:
     *                         type: string
     *                         example: "15414"
     *                       country_code:
     *                         type: string
     *                         default: "IDN"
     *               item_details:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                       example: "8647400b88aca0ce58a52a58b0efc638"
     *                     name:
     *                       type: string
     *                       example: "Baby Stroller"
     *                     price:
     *                       type: number
     *                       example: 2400000
     *                     quantity:
     *                       type: integer
     *                       example: 1
     *               payment_type:
     *                 type: string
     *                 enum: [credit_card, bank_transfer, gopay, shopeepay]
     *                 description: Preferred payment method
     *                 example: "bank_transfer"
     *     responses:
     *       200:
     *         description: Transaction created successfully
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
     *                   example: "Transaction created successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     token:
     *                       type: string
     *                       description: Midtrans snap token
     *                     redirect_url:
     *                       type: string
     *                       description: Payment page URL
     *                     order_id:
     *                       type: string
     *                     gross_amount:
     *                       type: number
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    createTransaction: async (req, res) => {
        try {
            const user_id = decryptId(req.user.id);
            const {
                order_id,
                gross_amount,
                customer_details,
                item_details,
                payment_type
            } = req.body;

            console.log(`req: ${JSON.stringify(req)}`);

            // Validate required fields
            if (!order_id || !gross_amount || !customer_details || !item_details) {
                return res.status(400).json({
                    status: 400,
                    message: 'Missing required fields: order_id, gross_amount, customer_details, item_details',
                    data: null
                });
            }

            // Decrypt order ID to verify it exists
            const decrypted_order_id = decryptId(order_id);
            
            // Verify order exists and belongs to user
            // const order = await knex('orders')
            //     .where('id', decrypted_order_id)
            //     .where('user_id', user_id)
            //     .whereNull('deleted_at')
            //     .first();

            // if (!order) {
            //     return res.status(404).json({
            //         status: 404,
            //         message: 'Order not found or unauthorized',
            //         data: null
            //     });
            // }

            // Generate unique transaction ID
            // const transaction_id = `TXN-${Date.now()}-${decrypted_order_id}`;
            const transaction_id = `${process.env.MIDTRANS_MERCHANT_ID}-${Date.now()}-${decrypted_order_id}`;

            // Prepare Midtrans parameter
            let parameter = {
                transaction_details: {
                    order_id: transaction_id,
                    gross_amount: gross_amount
                },
                customer_details: customer_details,
                item_details: item_details,
                callbacks: {
                    finish: `${process.env.FRONTEND_URL}/payment/finish`,
                    error: `${process.env.FRONTEND_URL}/payment/error`,
                    pending: `${process.env.FRONTEND_URL}/payment/pending`
                },
                custom_field1: process.env.MIDTRANS_MERCHANT_ID,
                custom_field2: `ORDER-${decrypted_order_id}`,
                custom_field3: `USER-${user_id}`
            };

            // Add payment type if specified
            if (payment_type) {
                parameter.enabled_payments = [payment_type];
            }

            if (payment_type === 'bank_transfer') {
                parameter.bank_transfer = {
                    bank: "bca",
                    va_number: process.env.MIDTRANS_MERCHANT_ID + String(decrypted_order_id).padStart(6, '0')
                };
            }

            // Create transaction with Midtrans
            const transaction = await snap.createTransaction(parameter);

            // Save transaction to database
            await knex('midtrans_transactions').insert({
                transaction_id: transaction_id,
                order_id: decrypted_order_id,
                user_id: user_id,
                merchant_id: process.env.MIDTRANS_MERCHANT_ID,
                gross_amount: gross_amount,
                snap_token: transaction.token,
                redirect_url: transaction.redirect_url,
                status: 'pending',
                midtrans_response: JSON.stringify(transaction),
                created_at: knex.fn.now()
            });

            res.status(200).json({
                status: 200,
                message: 'Transaction created successfully',
                data: {
                    token: transaction.token,
                    redirect_url: transaction.redirect_url,
                    order_id: order_id,
                    transaction_id: transaction_id,
                    merchant_id: process.env.MIDTRANS_MERCHANT_ID,
                    gross_amount: gross_amount
                }
            });

        } catch (err) {
            console.error('createTransaction error:', err);
            
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
                data: null,
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/midtrans/notification:
     *   post:
     *     summary: Handle Midtrans payment notification with signature verification
     *     tags: [Midtrans]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               transaction_time:
     *                 type: string
     *                 format: date-time
     *                 example: "2023-11-15 18:45:13"
     *               transaction_status:
     *                 type: string
     *                 enum: [capture, settlement, pending, deny, cancel, expire, failure]
     *                 example: "settlement"
     *               transaction_id:
     *                 type: string
     *                 example: "513f1f01-c9da-474c-9fc9-d5c64364b709"
     *               status_message:
     *                 type: string
     *                 example: "midtrans payment notification"
     *               status_code:
     *                 type: string
     *                 example: "200"
     *               signature_key:
     *                 type: string
     *                 description: SHA512 hash for verification
     *                 example: "225b3489980d496ca7312da836629af28576031a6901ed64c8cc93a1a14877c866121986b20c2a3b8967ac09a820e9d7b035711918a7cae718d73643fc41bb53"
     *               settlement_time:
     *                 type: string
     *                 format: date-time
     *                 example: "2023-11-15 22:45:13"
     *               payment_type:
     *                 type: string
     *                 example: "gopay"
     *               order_id:
     *                 type: string
     *                 example: "payment_notif_test_G589882883_93bc9bdd-b8cf-4bc2-96fa-a5d73654f6f2"
     *               merchant_id:
     *                 type: string
     *                 example: "G589882883"
     *               gross_amount:
     *                 type: string
     *                 example: "105000.00"
     *               fraud_status:
     *                 type: string
     *                 enum: [accept, challenge, deny]
     *                 example: "accept"
     *               currency:
     *                 type: string
     *                 example: "IDR"
     *             required:
     *               - transaction_time
     *               - transaction_status
     *               - transaction_id
     *               - order_id
     *               - merchant_id
     *               - gross_amount
     *               - signature_key
     *     responses:
     *       200:
     *         description: Notification processed successfully
     *       400:
     *         description: Invalid notification or signature verification failed
     *       404:
     *         description: Transaction not found
     *       500:
     *         description: Internal server error
     */
    handleNotification: async (req, res) => {
        const crypto = require('crypto');
        const trx = await knex.transaction();
        
        try {
            const notification = req.body;
            const {
                transaction_time,
                transaction_status,
                transaction_id,
                status_message,
                status_code,
                signature_key,
                settlement_time,
                payment_type,
                order_id,
                merchant_id,
                gross_amount,
                fraud_status,
                currency
            } = notification;

            console.log('Midtrans Notification received:', {
                transaction_id,
                order_id,
                transaction_status,
                payment_type,
                merchant_id,
                gross_amount,
                signature_provided: !!signature_key,
                timestamp: new Date().toISOString()
            });

            // Validate required fields
            const requiredFields = [
                'transaction_id', 'order_id', 'transaction_status', 
                'merchant_id', 'gross_amount', 'signature_key'
            ];
            
            const missingFields = requiredFields.filter(field => !notification[field]);
            
            if (missingFields.length > 0) {
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: {
                        required_fields: requiredFields,
                        missing_fields: missingFields
                    }
                });
            }

            // Verify merchant ID
            if (merchant_id !== process.env.MIDTRANS_MERCHANT_ID) {
                console.error('Invalid merchant ID:', {
                    received: merchant_id,
                    expected: process.env.MIDTRANS_MERCHANT_ID
                });
                
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid merchant ID in notification',
                    data: null
                });
            }

            // **Signature Verification** - Critical for security
            const serverKey = process.env.MIDTRANS_SERVER_KEY;
            if (!serverKey) {
                console.error('MIDTRANS_SERVER_KEY not configured');
                await trx.rollback();
                return res.status(500).json({
                    status: 500,
                    message: 'Server configuration error',
                    data: null
                });
            }

            // Create signature hash according to Midtrans documentation
            // Format: order_id + status_code + gross_amount + server_key
            const signatureData = order_id + status_code + gross_amount + serverKey;
            const calculatedSignature = crypto
                .createHash('sha512')
                .update(signatureData)
                .digest('hex');

            console.log('Signature verification:', {
                provided_signature: signature_key,
                calculated_signature: calculatedSignature,
                signature_data: `${order_id}${status_code}${gross_amount}[SERVER_KEY]`,
                match: signature_key === calculatedSignature
            });

            // Verify signature
            if (signature_key !== calculatedSignature) {
                console.error('Signature verification failed:', {
                    transaction_id,
                    order_id,
                    provided: signature_key,
                    calculated: calculatedSignature
                });
                
                await trx.rollback();
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid signature - notification rejected for security',
                    data: {
                        transaction_id,
                        order_id
                    }
                });
            }

            console.log('✅ Signature verification passed');

            // Additional verification with Midtrans API (optional but recommended)
            let statusResponse;
            try {
                statusResponse = await coreApi.transaction.status(order_id);
                console.log('Midtrans API verification response:', {
                    order_id: statusResponse.order_id,
                    transaction_status: statusResponse.transaction_status,
                    gross_amount: statusResponse.gross_amount
                });

                // Cross-check the data from API with notification
                if (statusResponse.transaction_status !== transaction_status || 
                    statusResponse.gross_amount !== gross_amount) {
                    console.warn('Data mismatch between notification and API:', {
                        notification: { transaction_status, gross_amount },
                        api_response: { 
                            transaction_status: statusResponse.transaction_status, 
                            gross_amount: statusResponse.gross_amount 
                        }
                    });
                }
            } catch (apiError) {
                console.error('Midtrans API verification failed:', apiError.message);
                // Continue processing - API might be temporarily unavailable
                statusResponse = notification;
            }

            // Find existing transaction in database
            const existingTransaction = await trx('midtrans_transactions')
                .where('transaction_id', order_id)
                .where('merchant_id', merchant_id)
                .first();

            if (!existingTransaction) {
                console.error('Transaction not found in database:', {
                    transaction_id: order_id,
                    merchant_id
                });
                
                await trx.rollback();
                return res.status(404).json({
                    status: 404,
                    message: 'Transaction not found in database',
                    data: {
                        transaction_id: order_id,
                        merchant_id
                    }
                });
            }

            const previousStatus = existingTransaction.status;

            // Prevent processing duplicate notifications
            if (previousStatus === 'success' && transaction_status === 'settlement') {
                console.log('Duplicate settlement notification - already processed:', {
                    transaction_id: order_id,
                    current_status: previousStatus
                });
                
                await trx.rollback();
                return res.status(200).json({
                    status: 200,
                    message: 'Notification already processed',
                        transaction_id: order_id,
                        current_status: previousStatus
                });
            }

            // Prepare update data
            const updateData = {
                status: transaction_status,
                payment_type: payment_type,
                currency: currency,
                fraud_status: fraud_status,
                signature_key: signature_key,
                status_code: status_code,
                status_message: status_message,
                transaction_id_midtrans: transaction_id,
                transaction_status_midtrans: transaction_status,
                transaction_time_midtrans: transaction_time,
                midtrans_response: JSON.stringify({
                    ...statusResponse,
                    notification_received_at: new Date().toISOString(),
                    signature_verified: true
                }),
                updated_at: knex.fn.now()
            };

            // Handle different transaction statuses
            let finalStatus = transaction_status;
            let shouldUpdateOrder = false;

            switch (transaction_status) {
                case 'capture':
                    if (fraud_status === 'challenge') {
                        finalStatus = 'challenge';
                        updateData.status = 'challenge';
                        console.log('Transaction flagged for manual review (fraud challenge)');
                    } else if (fraud_status === 'accept') {
                        finalStatus = 'success';
                        updateData.status = 'success';
                        updateData.paid_at = settlement_time ? new Date(settlement_time) : knex.fn.now();
                        shouldUpdateOrder = true;
                        console.log('✅ Payment captured and accepted');
                    } else {
                        finalStatus = 'pending';
                        updateData.status = 'pending';
                        console.log('Payment captured but pending fraud review');
                    }
                    break;

                case 'settlement':
                    finalStatus = 'success';
                    updateData.status = 'success';
                    updateData.paid_at = settlement_time ? new Date(settlement_time) : knex.fn.now();
                    shouldUpdateOrder = true;
                    console.log('✅ Payment settled successfully');
                    break;

                case 'pending':
                    finalStatus = 'pending';
                    updateData.status = 'pending';
                    console.log('Payment is pending');
                    break;

                case 'deny':
                    finalStatus = 'failed';
                    updateData.status = 'failed';
                    console.log('❌ Payment denied');
                    break;

                case 'cancel':
                    finalStatus = 'failed';
                    updateData.status = 'failed';
                    console.log('❌ Payment cancelled');
                    break;

                case 'expire':
                    finalStatus = 'failed';
                    updateData.status = 'failed';
                    console.log('❌ Payment expired');
                    break;

                case 'failure':
                    finalStatus = 'failed';
                    updateData.status = 'failed';
                    console.log('❌ Payment failed');
                    break;

                default:
                    console.warn('⚠️ Unknown transaction status:', transaction_status);
                    finalStatus = transaction_status;
                    updateData.status = transaction_status;
            }

            // Update transaction in database
            const updatedRows = await trx('midtrans_transactions')
                .where('transaction_id', order_id)
                .where('merchant_id', merchant_id)
                .update(updateData);

            if (updatedRows === 0) {
                await trx.rollback();
                return res.status(404).json({
                    status: 404,
                    message: 'Failed to update transaction - no rows affected',
                    data: null
                });
            }

            console.log('✅ Transaction status updated:', {
                transaction_id: order_id,
                previous_status: previousStatus,
                new_status: finalStatus,
                should_update_order: shouldUpdateOrder
            });

            // Update order status if payment is successful
            let orderUpdated = false;
            if (shouldUpdateOrder) {
                const orderUpdateResult = await trx('orders')
                    .where('id', existingTransaction.order_id)
                    .update({
                        payment_status: 'paid',
                        status: 'processing',
                        updated_at: knex.fn.now()
                    });

                orderUpdated = orderUpdateResult > 0;

                console.log('✅ Order status updated:', {
                    order_id: existingTransaction.order_id,
                    updated_rows: orderUpdateResult,
                    new_payment_status: 'paid',
                    new_status: 'processing'
                });

                // Optional: Send success email notification
                if (orderUpdated) {
                    try {
                        const order = await trx('orders')
                            .leftJoin('users', 'orders.user_id', 'users.id')
                            .where('orders.id', existingTransaction.order_id)
                            .select('orders.*', 'users.email', 'users.name')
                            .first();

                        if (order && order.email) {
                            console.log('📧 Order payment confirmed - email notification queued for:', order.email);
                            // Add your email notification logic here
                            // await sendPaymentConfirmationEmail(order);
                        }
                    } catch (emailError) {
                        console.error('Failed to process email notification:', emailError);
                        // Don't fail the transaction for email errors
                    }
                }
            }

            await trx.commit();

            console.log('🎉 Notification processing completed successfully');

            // Return success response
            res.status(200).json({
                status: 200,
                message: 'Notification processed successfully',
                data: {
                    transaction_id: order_id,
                    order_id: existingTransaction.order_id,
                    previous_status: previousStatus,
                    new_status: finalStatus,
                    payment_type: payment_type,
                    gross_amount: parseFloat(gross_amount),
                    order_updated: orderUpdated,
                    signature_verified: true,
                    processed_at: new Date().toISOString()
                }
            });

        } catch (err) {
            await trx.rollback();
            console.error('❌ handleNotification error:', {
                error: err.message,
                stack: err.stack,
                notification: {
                    transaction_id: req.body?.transaction_id,
                    order_id: req.body?.order_id,
                    transaction_status: req.body?.transaction_status
                }
            });
            
            res.status(500).json({
                status: 500,
                message: 'Internal server error while processing notification',
                data: {
                    error: err.message,
                    transaction_id: req.body?.transaction_id || null,
                    order_id: req.body?.order_id || null
                }
            });
        }
    },


    // hanya untuk testing
    // /**
    //  * @swagger
    //  * /api/midtrans/notification:
    //  *   post:
    //  *     summary: Handle Midtrans payment notification with signature verification only
    //  *     tags: [Midtrans]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               transaction_time:
    //  *                 type: string
    //  *                 format: date-time
    //  *                 example: "2023-11-15 18:45:13"
    //  *               transaction_status:
    //  *                 type: string
    //  *                 enum: [capture, settlement, pending, deny, cancel, expire, failure]
    //  *                 example: "settlement"
    //  *               transaction_id:
    //  *                 type: string
    //  *                 example: "513f1f01-c9da-474c-9fc9-d5c64364b709"
    //  *               status_message:
    //  *                 type: string
    //  *                 example: "midtrans payment notification"
    //  *               status_code:
    //  *                 type: string
    //  *                 example: "200"
    //  *               signature_key:
    //  *                 type: string
    //  *                 description: SHA512 hash for verification
    //  *                 example: "225b3489980d496ca7312da836629af28576031a6901ed64c8cc93a1a14877c866121986b20c2a3b8967ac09a820e9d7b035711918a7cae718d73643fc41bb53"
    //  *               settlement_time:
    //  *                 type: string
    //  *                 format: date-time
    //  *                 example: "2023-11-15 22:45:13"
    //  *               payment_type:
    //  *                 type: string
    //  *                 example: "gopay"
    //  *               order_id:
    //  *                 type: string
    //  *                 example: "payment_notif_test_G589882883_93bc9bdd-b8cf-4bc2-96fa-a5d73654f6f2"
    //  *               merchant_id:
    //  *                 type: string
    //  *                 example: "G589882883"
    //  *               gross_amount:
    //  *                 type: string
    //  *                 example: "105000.00"
    //  *               fraud_status:
    //  *                 type: string
    //  *                 enum: [accept, challenge, deny]
    //  *                 example: "accept"
    //  *               currency:
    //  *                 type: string
    //  *                 example: "IDR"
    //  *             required:
    //  *               - transaction_time
    //  *               - transaction_status
    //  *               - transaction_id
    //  *               - order_id
    //  *               - merchant_id
    //  *               - gross_amount
    //  *               - signature_key
    //  *     responses:
    //  *       200:
    //  *         description: Notification verified and processed successfully
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 status:
    //  *                   type: integer
    //  *                   example: 200
    //  *                 message:
    //  *                   type: string
    //  *                   example: "Notification verified successfully"
    //  *                 data:
    //  *                   type: object
    //  *                   properties:
    //  *                     transaction_id:
    //  *                       type: string
    //  *                     order_id:
    //  *                       type: string
    //  *                     transaction_status:
    //  *                       type: string
    //  *                     payment_type:
    //  *                       type: string
    //  *                     gross_amount:
    //  *                       type: number
    //  *                     signature_verified:
    //  *                       type: boolean
    //  *                     api_verified:
    //  *                       type: boolean
    //  *                     processed_at:
    //  *                       type: string
    //  *       400:
    //  *         description: Invalid notification or signature verification failed
    //  *       500:
    //  *         description: Internal server error
    //  */
    // handleNotification: async (req, res) => {
    //     const crypto = require('crypto');
        
    //     try {
    //         const notification = req.body;
    //         const {
    //             transaction_time,
    //             transaction_status,
    //             transaction_id,
    //             status_message,
    //             status_code,
    //             signature_key,
    //             settlement_time,
    //             payment_type,
    //             order_id,
    //             merchant_id,
    //             gross_amount,
    //             fraud_status,
    //             currency
    //         } = notification;

    //         console.log('Midtrans Notification received:', {
    //             transaction_id,
    //             order_id,
    //             transaction_status,
    //             payment_type,
    //             merchant_id,
    //             gross_amount,
    //             signature_provided: !!signature_key,
    //             timestamp: new Date().toISOString()
    //         });

    //         // Validate required fields
    //         const requiredFields = [
    //             'transaction_id', 'order_id', 'transaction_status', 
    //             'merchant_id', 'gross_amount', 'signature_key'
    //         ];
            
    //         const missingFields = requiredFields.filter(field => !notification[field]);
            
    //         if (missingFields.length > 0) {
    //             return res.status(400).json({
    //                 status: 400,
    //                 message: `Missing required fields: ${missingFields.join(', ')}`,
    //                 data: {
    //                     required_fields: requiredFields,
    //                     missing_fields: missingFields
    //                 }
    //             });
    //         }

    //         // Verify merchant ID
    //         if (merchant_id !== process.env.MIDTRANS_MERCHANT_ID) {
    //             console.error('Invalid merchant ID:', {
    //                 received: merchant_id,
    //                 expected: process.env.MIDTRANS_MERCHANT_ID
    //             });
                
    //             return res.status(400).json({
    //                 status: 400,
    //                 message: 'Invalid merchant ID in notification',
    //                 data: null
    //             });
    //         }

    //         // **Signature Verification** - Critical for security
    //         const serverKey = process.env.MIDTRANS_SERVER_KEY;
    //         if (!serverKey) {
    //             console.error('MIDTRANS_SERVER_KEY not configured');
    //             return res.status(500).json({
    //                 status: 500,
    //                 message: 'Server configuration error',
    //                 data: null
    //             });
    //         }

    //         // Create signature hash according to Midtrans documentation
    //         // Format: order_id + status_code + gross_amount + server_key
    //         const signatureData = order_id + status_code + gross_amount + serverKey;
    //         const calculatedSignature = crypto
    //             .createHash('sha512')
    //             .update(signatureData)
    //             .digest('hex');

    //         console.log('Signature verification:', {
    //             provided_signature: signature_key,
    //             calculated_signature: calculatedSignature,
    //             signature_data: `${order_id}${status_code}${gross_amount}[SERVER_KEY]`,
    //             match: signature_key === calculatedSignature
    //         });

    //         // Verify signature
    //         if (signature_key !== calculatedSignature) {
    //             console.error('Signature verification failed:', {
    //                 transaction_id,
    //                 order_id,
    //                 provided: signature_key,
    //                 calculated: calculatedSignature
    //             });
                
    //             return res.status(400).json({
    //                 status: 400,
    //                 message: 'Invalid signature - notification rejected for security',
    //                 data: {
    //                     transaction_id,
    //                     order_id,
    //                     signature_verified: false
    //                 }
    //             });
    //         }

    //         console.log('✅ Signature verification passed');

    //         // Additional verification with Midtrans API (optional but recommended)
    //         let statusResponse;
    //         let apiVerified = false;
            
    //         try {
    //             statusResponse = await coreApi.transaction.status(order_id);
    //             apiVerified = true;
                
    //             console.log('Midtrans API verification response:', {
    //                 order_id: statusResponse.order_id,
    //                 transaction_status: statusResponse.transaction_status,
    //                 gross_amount: statusResponse.gross_amount
    //             });

    //             // Cross-check the data from API with notification
    //             if (statusResponse.transaction_status !== transaction_status || 
    //                 statusResponse.gross_amount !== gross_amount) {
    //                 console.warn('Data mismatch between notification and API:', {
    //                     notification: { transaction_status, gross_amount },
    //                     api_response: { 
    //                         transaction_status: statusResponse.transaction_status, 
    //                         gross_amount: statusResponse.gross_amount 
    //                     }
    //                 });
    //             }
    //         } catch (apiError) {
    //             console.error('Midtrans API verification failed:', apiError.message);
    //             // Continue processing - API might be temporarily unavailable
    //             statusResponse = notification;
    //             apiVerified = false;
    //         }

    //         // Process transaction status for logging purposes
    //         let processedStatus = transaction_status;
    //         let statusDescription = '';

    //         switch (transaction_status) {
    //             case 'capture':
    //                 if (fraud_status === 'challenge') {
    //                     processedStatus = 'challenge';
    //                     statusDescription = 'Transaction flagged for manual review (fraud challenge)';
    //                     console.log('🔍 ' + statusDescription);
    //                 } else if (fraud_status === 'accept') {
    //                     processedStatus = 'success';
    //                     statusDescription = 'Payment captured and accepted';
    //                     console.log('✅ ' + statusDescription);
    //                 } else {
    //                     processedStatus = 'pending';
    //                     statusDescription = 'Payment captured but pending fraud review';
    //                     console.log('⏳ ' + statusDescription);
    //                 }
    //                 break;

    //             case 'settlement':
    //                 processedStatus = 'success';
    //                 statusDescription = 'Payment settled successfully';
    //                 console.log('✅ ' + statusDescription);
    //                 break;

    //             case 'pending':
    //                 processedStatus = 'pending';
    //                 statusDescription = 'Payment is pending';
    //                 console.log('⏳ ' + statusDescription);
    //                 break;

    //             case 'deny':
    //                 processedStatus = 'failed';
    //                 statusDescription = 'Payment denied';
    //                 console.log('❌ ' + statusDescription);
    //                 break;

    //             case 'cancel':
    //                 processedStatus = 'failed';
    //                 statusDescription = 'Payment cancelled';
    //                 console.log('❌ ' + statusDescription);
    //                 break;

    //             case 'expire':
    //                 processedStatus = 'failed';
    //                 statusDescription = 'Payment expired';
    //                 console.log('❌ ' + statusDescription);
    //                 break;

    //             case 'failure':
    //                 processedStatus = 'failed';
    //                 statusDescription = 'Payment failed';
    //                 console.log('❌ ' + statusDescription);
    //                 break;

    //             default:
    //                 console.warn('⚠️ Unknown transaction status:', transaction_status);
    //                 processedStatus = transaction_status;
    //                 statusDescription = `Unknown status: ${transaction_status}`;
    //         }

    //         // Log successful payment completion
    //         if (processedStatus === 'success') {
    //             console.log('🎉 Payment successful - Transaction completed:', {
    //                 transaction_id,
    //                 order_id,
    //                 gross_amount: parseFloat(gross_amount),
    //                 payment_type,
    //                 settlement_time
    //             });
    //         }

    //         console.log('🎉 Notification processing completed successfully');

    //         // Return success response without any database updates
    //         res.status(200).json({
    //             status: 200,
    //             message: 'Notification verified and processed successfully',
    //             data: {
    //                 transaction_id,
    //                 midtrans_transaction_id: transaction_id,
    //                 order_id,
    //                 transaction_status,
    //                 processed_status: processedStatus,
    //                 status_description: statusDescription,
    //                 payment_type,
    //                 gross_amount: parseFloat(gross_amount),
    //                 fraud_status,
    //                 currency,
    //                 signature_verified: true,
    //                 api_verified: apiVerified,
    //                 settlement_time,
    //                 transaction_time,
    //                 merchant_id,
    //                 status_code,
    //                 status_message,
    //                 processed_at: new Date().toISOString(),
    //                 notification_data: {
    //                     ...notification,
    //                     server_key: '[HIDDEN]' // Don't expose server key in response
    //                 }
    //             }
    //         });

    //     } catch (err) {
    //         console.error('❌ handleNotification error:', {
    //             error: err.message,
    //             stack: err.stack,
    //             notification: {
    //                 transaction_id: req.body?.transaction_id,
    //                 order_id: req.body?.order_id,
    //                 transaction_status: req.body?.transaction_status,
    //                 merchant_id: req.body?.merchant_id
    //             }
    //         });
            
    //         res.status(500).json({
    //             status: 500,
    //             message: 'Internal server error while processing notification',
    //             data: {
    //                 error: err.message,
    //                 transaction_id: req.body?.transaction_id || null,
    //                 order_id: req.body?.order_id || null,
    //                 processed_at: new Date().toISOString()
    //             }
    //         });
    //     }
    // },

    /**
     * @swagger
     * /api/midtrans/status/{transaction_id}:
     *   get:
     *     summary: Check transaction status
     *     tags: [Midtrans]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: transaction_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Transaction ID
     *     responses:
     *       200:
     *         description: Transaction status retrieved successfully
     *       404:
     *         description: Transaction not found
     *       500:
     *         description: Internal server error
     */
    checkStatus: async (req, res) => {
        try {
            const { transaction_id } = req.params;
            const user_id = decryptId(req.user.id);

            // Get transaction from database (verify merchant_id)
            const transaction = await knex('midtrans_transactions')
                .where('transaction_id', transaction_id)
                .where('user_id', user_id)
                .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                .first();

            if (!transaction) {
                return res.status(404).json({
                    status: 404,
                    message: 'Transaction not found',
                    data: null
                });
            }

            // Check status from Midtrans
            let midtransStatus;
            try {
                midtransStatus = await coreApi.transaction.status(transaction_id);
            } catch (err) {
                // If Midtrans API fails, return database status
                return res.status(200).json({
                    status: 200,
                    message: 'Transaction status retrieved from database',
                            transaction_id: transaction.transaction_id,
                        order_id: encryptId(transaction.order_id),
                        merchant_id: transaction.merchant_id,
                        status: transaction.status,
                        gross_amount: transaction.gross_amount,
                        payment_type: transaction.payment_type,
                        created_at: transaction.created_at,
                        updated_at: transaction.updated_at
                    }
                );
            }

            // Update database with latest status from Midtrans
            await knex('midtrans_transactions')
                .where('transaction_id', transaction_id)
                .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                .update({
                    status: midtransStatus.transaction_status,
                    midtrans_response: JSON.stringify(midtransStatus),
                    updated_at: knex.fn.now()
                });

            res.status(200).json({
                status: 200,
                message: 'Transaction status retrieved successfully',
                data: {
                    transaction_id: transaction_id,
                    order_id: encryptId(transaction.order_id),
                    merchant_id: process.env.MIDTRANS_MERCHANT_ID,
                    status: midtransStatus.transaction_status,
                    gross_amount: midtransStatus.gross_amount,
                    payment_type: midtransStatus.payment_type,
                    transaction_time: midtransStatus.transaction_time,
                    settlement_time: midtransStatus.settlement_time
                }
            });

        } catch (err) {
            console.error('checkStatus error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/midtrans/cancel/{transaction_id}:
     *   post:
     *     summary: Cancel transaction
     *     tags: [Midtrans]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: transaction_id
     *         required: true
     *         schema: 
     *           type: string
     *         description: Transaction ID
     *     responses:
     *       200:
     *         description: Transaction cancelled successfully
     *       404:
     *         description: Transaction not found
     *       500:
     *         description: Internal server error
     */
    cancelTransaction: async (req, res) => {
        try {
            const { transaction_id } = req.params;
            const user_id = decryptId(req.user.id);

            // Verify transaction belongs to user
            const transaction = await knex('midtrans_transactions')
                .where('transaction_id', transaction_id)
                .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                .where('user_id', user_id)
                .first();

            if (!transaction) {
                return res.status(404).json({
                    status: 404,
                    message: 'Transaction not found or unauthorized',
                    data: null
                });
            }

            // Cancel transaction in Midtrans
            const cancelResult = await coreApi.transaction.cancel(transaction_id);

            // Update database
            await knex('midtrans_transactions')
                .where('transaction_id', transaction_id)
                .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                .update({
                    status: 'cancel',
                    midtrans_response: JSON.stringify(cancelResult),
                    updated_at: knex.fn.now()
                });

            res.status(200).json({
                status: 200,
                message: 'Transaction cancelled successfully',
                data: {
                    transaction_id: transaction_id,
                    status: 'cancel'
                }
            });

        } catch (err) {
            console.error('cancelTransaction error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    }
};