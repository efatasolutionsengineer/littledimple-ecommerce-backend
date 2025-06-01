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
     *     summary: Handle Midtrans payment notification
     *     tags: [Midtrans]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Midtrans notification payload
     *     responses:
     *       200:
     *         description: Notification processed successfully
     *       400:
     *         description: Invalid notification
     *       500:
     *         description: Internal server error
     */
    handleNotification: async (req, res) => {
        try {
            const notification = req.body;
            const orderId = notification.order_id;
            const transactionStatus = notification.transaction_status;
            const fraudStatus = notification.fraud_status;

            console.log('Midtrans Notification:', notification);

            // Verify that the notification is for our merchant
            if (notification.custom_field1 !== process.env.MIDTRANS_MERCHANT_ID) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid merchant ID in notification'
                });
            }

            // Verify notification authenticity
            const statusResponse = await coreApi.transaction.notification(notification);

            const { order_id, transaction_status, gross_amount, payment_type } = statusResponse;

            // Update transaction status in database
            const updateData = {
                status: transaction_status,
                payment_type: payment_type,
                midtrans_response: JSON.stringify(statusResponse),
                updated_at: knex.fn.now()
            };

            // Handle different transaction statuses
            if (transaction_status === 'capture') {
                if (fraudStatus === 'challenge') {
                    updateData.status = 'challenge';
                } else if (fraudStatus === 'accept') {
                    updateData.status = 'success';
                    updateData.paid_at = knex.fn.now();
                }
            } else if (transaction_status === 'settlement') {
                updateData.status = 'success';
                updateData.paid_at = knex.fn.now();
            } else if (transaction_status === 'cancel' || 
                       transaction_status === 'deny' || 
                       transaction_status === 'expire') {
                updateData.status = 'failed';
            } else if (transaction_status === 'pending') {
                updateData.status = 'pending';
            }

            // Update transaction in database (verify merchant_id for security)
            const updated = await knex('midtrans_transactions')
                .where('transaction_id', order_id)
                .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                .update(updateData);

            if (updated) {
                // If payment successful, update order status
                if (updateData.status === 'success') {
                    const transaction = await knex('midtrans_transactions')
                        .where('transaction_id', order_id)
                        .where('merchant_id', process.env.MIDTRANS_MERCHANT_ID)
                        .first();

                    if (transaction) {
                        await knex('orders')
                            .where('id', transaction.order_id)
                            .update({
                                payment_status: 'paid',
                                status: 'processing',
                                updated_at: knex.fn.now()
                            });
                    }
                }
            }

            res.status(200).json({
                status: 200,
                message: 'Notification processed successfully'
            });

        } catch (err) {
            console.error('handleNotification error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

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