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
const { getTimestamp, generateExpiredDate, formattedPrice, getSubMerchantID, generateInvoiceNumber, isValidCoupon, isValidVoucher, formatRupiah } = require('../models/utils.js');
const { get } = require('./shippingController.js');
const productsController = require('./productsController.js');
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order transactions
 */

module.exports = {

    /**
     * @swagger
     * /api/orders:
     *   post:
     *     summary: Create a new order transaction
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
     *               total_price:
     *                 type: number
     *                 example: 50000.00
     *               shipping_address:
     *                 type: string
     *                 example: "Jl. Merdeka No.123"
     *               payment_method:
     *                 type: string
     *                 example: "VA"
     *               payment_method_channel:
     *                 type: string
     *                 example: "BCA"
     *               shipping_service:
     *                 type: string
     *                 example: "JNE REG"
     *               shipping_cost:
     *                 type: number
     *                 example: 9000
     *               shipping_etd:
     *                 type: string
     *                 example: "2-3 hari"
     *               receiver_name:
     *                 type: string
     *                 example: "Budi Santoso"
     *               receiver_phone:
     *                 type: string
     *                 example: "08123456789"
     *               receiver_address_detail:
     *                 type: string
     *                 example: "RT 03 / RW 05, dekat warung bu Sari"
     *               receiver_subdistrict_id:
     *                 type: integer
     *                 example: 123456
     *               receiver_subdistrict_name:
     *                 type: string
     *                 example: "Cempaka Putih"
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     product_id:
     *                       type: integer
     *                       example: 1
     *                     quantity:
     *                       type: integer
     *                       example: 2
     *                     price:
     *                       type: number
     *                       example: 25000
   */
    createOrder: async (req, res) => {
        const {
        total_price,


        shipping_address,
        shipping_service,
        shipping_cost,
        shipping_etd,
        receiver_name,
        receiver_phone,
        receiver_address_detail,
        receiver_subdistrict_id,
        receiver_subdistrict_name,

        payment_method,
        payment_method_channel,

        items,
        } = req.body;

        const user_id = req.user.id;
        const customer_name = req.user.name;

        const trx = await knex.transaction();
        try {
    
            let invoice_number = generateInvoiceNumber();

            // 1. Check Coupon Status
            const validateCoupon = await isValidCoupon(code);
            if (!validateCoupon.valid) {
                return res.status(404).json({ error: result.message });
            }

            // 2. Check Product Discount
            let temp_total_price = null;
            let hasExpiredDiscount = null;
            let arrayExpiredDiscount = [];
            for(const item of items){

                const getPrice = await checkProductDiscount(item.product_id);
                if(getPrice.final_price !== item.price){
                    const singleProduct = await productsController.ProductGetById(item.product_id);
                    hasExpiredDiscount = true;
                    arrayExpiredDiscount.push({ product_id: item.product_id, product_name: singleProduct.name});
                }
                temp_total_price += getPrice.final_price * item.quantity;
            }

            if(hasExpiredDiscount){
                return res.status(404).json({ 
                    error: "Terdapat produk yang diskon nya sudah tidak berlaku.",
                    expired_discount_product: arrayExpiredDiscount
                });
            }

            total_price = temp_total_price;
            total_price = total_price - (total_price * validateCoupon.coupon.discount_percentage / 100);

            // 3. Check Voucher Status
            const validateVoucher = await isValidVoucher(code);
            if (!validateVoucher.valid) {
                return res.status(404).json({ error: result.message });
            }

            if(validateVoucher.voucher.min_purchase < total_price){
                return res.status(404).json({ error: `Voucher tidak bisa digunakan, minimal pembelian ${formatRupiah(validateVoucher.voucher.min_purchase)}`});
            }
                
            total_price = formattedPrice(total_price - validateVoucher.voucher.discount_amount);

            // 4. Insert ke tabel Orders (sementara status pending)
            const [order] = await trx('Orders')
                .insert({
                user_id,
                status: 'pending',
                order_date: knex.fn.now(),
                total_price,
                coupon_code,
                
                shipping_address,
                shipping_service,
                shipping_cost,
                shipping_etd,

                receiver_name,
                receiver_phone,
                receiver_address_detail,
                receiver_subdistrict_id,
                receiver_subdistrict_name,
                payment_transaction_id: invoice_number,
                payment_method,
                payment_method_channel,
                payment_status: 'pending',
                payment_cancel_reason: null,
                tracking_number: null,
                deleted_at: null,
                })
                .returning('*');
            
            // 5. Insert semua item ke Order_Details
            for (const item of items) {
                await trx('Order_Details').insert({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                });
            }

            // 6. Proses pembayaran ke WinPay
            let paymentResult = null;
            const contractId = null;
            const paymentData = null;

            const SingleUser = await knex('users')
            .where({ id: user_id })
            .whereNull('deleted_at')
            .first();

            switch (payment_method) {
                case 'VA':
                    paymentData = {
                        customerNo: SingleUser.phone, // format harus diawali 08
                        virtualAccountName: customer_name,
                        trxId: invoice_number,
                        totalAmount: {
                            value: formattedPrice(total_price), // convert to decimal, example 25000.00
                            currency: "IDR"
                        },
                        virtualAccountTrxType: "c",
                        expiredDate: generateExpiredDate(60 * 24), //tolong buatkan +24 jam dari waktu saat ini 2025-04-12T09:53:14+07:00
                        additionalInfo: {
                            channel: payment_method_channel
                        }
                    }
                    paymentResult = await createVirtualAccountPayment(paymentData, getTimestamp(), payment_method_channel);
                    contractId = paymentResult.additionalInfo.contractId
                    break;
                case 'EWALLET':
                    paymentData = {
                        partnerReferenceNo: invoice_number,
                        amount: {
                            value: formattedPrice(total_price),
                            currency: "IDR"
                        },
                        urlParam: [
                        {
                            url: "https://test1.bi.go.id/v1/test",
                            type: "PAY_NOTIFY",
                            isDeeplink: "N"
                        },
                        {
                            url: "https://test1.bi.go.id/v1/test",
                            type: "PAY_RETURN",
                            isDeeplink: "N"
                        }
                        ],
                        validUpTo: generateExpiredDate(10),
                        additionalInfo: {
                            channel: payment_method_channel,
                            customerPhone: SingleUser.phone,
                            customerName: customer_name
                        }
                    }
                    paymentResult = await createEWalletPayment(paymentData, getTimestamp(), payment_method_channel);
                    contractId = paymentResult.additionalInfo.contractId;
                    break
                case 'QRIS':
                    paymentData = {
                        partnerReferenceNo: "ref00000000001",
                        terminalId: "TERM GIGIH",
                        subMerchantId: getSubMerchantID(),
                        amount: {
                            value: formattedPrice(total_price),
                            currency: "IDR"
                        },
                        validityPeriod: generateExpiredDate(60 * 1),
                        additionalInfo: {
                            isStatic: false
                        }
                    }
                    paymentResult = await createQRISPayment(paymentData, getTimestamp(), 'QRIS');
                    contractId = paymentResult.additionalInfo.contractId;
                    break;
                case 'CC':
                    paymentResult = await createCreditCardPayment(paymentData, getTimestamp(), 'CC');
                    break;
                default:
                    throw new Error('Metode pembayaran tidak dikenali');
            }

            // let paymentDetails = {};

            // switch (payment_method) {
            //     case 'VA':
            //         paymentDetails.virtualAccountNumber = "1234567890123456"; // Nomor Virtual Account
            //         break;
            //     case 'QRIS':
            //         paymentDetails.qrisImageUrl = "https://link.to/your/qris/image.png"; // URL gambar QRIS
            //         break;
            //     case 'EWALLET':
            //         paymentDetails.paymentLink = "https://link.to/ewallet/payment"; // Link pembayaran e-wallet
            //         break;
            //     case 'CC':
            //         paymentDetails.paymentLink = "https://link.to/credit-card/payment"; // Link pembayaran kartu kredit
            //         break;
            //     default:
            //         paymentDetails = {};
            //         break;
            // }

            // Mengirim email setelah pembuatan order
            await sendBillingEmail(SingleUser.email, invoice_number, total_price, payment_method, paymentDetails);


            // 7. Jika sukses, update order dengan status & ID transaksi dari WinPay
            if (paymentResult && paymentResult.transactionId) {
                await trx('Orders')
                .where({ id: order.id })
                .update({
                    status: 'paid', // Atau tetap 'pending' jika menunggu callback
                    payment_status: 'paid',
                    payment_contract_id: contractId
                });
            }

            await trx.commit();
            res.status(201).json({
                message: 'Order created successfully',
                order,
                payment: paymentResult,
            });
        } catch (err) {
            await trx.rollback();
            res.status(500).json({ message: err.message });
        }
    },
  

    /**
     * @swagger
     * /api/orders/me:
     *   get:
     *     summary: Get all orders by authenticated user
     *     tags: [Orders]
     */
    getUserOrders: async (req, res) => {
        const user_id = req.user.id;
        try {
            const orders = await knex('orders')
            .where({ user_id })
            .whereNull('deleted_at')
            .select('*');

            for (const order of orders) {
            order.items = await knex('order_details')
                .where({ order_id: order.id })
                .whereNull('deleted_at');
            }

            res.json({ orders });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/orders:
     *   get:
     *     summary: Get all orders
     *     tags: [Orders]
     */
    getAllOrders: async (req, res) => {
        try {
            const orders = await knex('orders')
            .whereNull('deleted_at')
            .select('*');

            for (const order of orders) {
            order.items = await knex('order_details')
                .where({ order_id: order.id })
                .whereNull('deleted_at');
            }

            res.json({ orders });
        } catch (err) {
            res.status(500).json({ message: err.message });
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
