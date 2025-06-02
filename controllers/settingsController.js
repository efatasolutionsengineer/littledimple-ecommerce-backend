const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneralSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         link_instagram:
 *           type: string
 *         link_whatsapp:
 *           type: string
 *         link_tokopedia:
 *           type: string
 *         link_shopee:
 *           type: string
 *         alamat:
 *           type: string
 *         email:
 *           type: string
 *         logo:
 *           type: string
 *         favicon:
 *           type: string
 *         no_telepon:
 *           type: string
 *         about_media_link:
 *           type: string
 *         about_title:
 *           type: string
 *         about_description:
 *           type: string
 *         about_button_link:
 *           type: string
 *         about_button_title:
 *           type: string
 *         cta_title:
 *           type: string
 *         cta_button_link:
 *           type: string
 *         cta_button_title:
 *           type: string
 *         service_fee_mode:
 *           type: string
 *         service_fee_split_percentage_toko:
 *           type: integer
 *         service_fee_split_percentage_buyer:
 *           type: integer
 *         waktu_operasi_toko:
 *           type: string
 *         map_lokasi:
 *           type: string
 *         main_toko_alamat:
 *           type: string
 *         main_toko_provinsi:
 *           type: string
 *         main_toko_kabupaten:
 *           type: string
 *         main_toko_kecamatan:
 *           type: string
 *         main_toko_kelurahan:
 *           type: string
 *         main_toko_kodepos:
 *           type: string
 *         reviews_selected:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     Carousel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted carousel ID
 *         title:
 *           type: string
 *         title_sub:
 *           type: string
 *         button_1_title:
 *           type: string
 *         button_1_link:
 *           type: string
 *         button_2_title:
 *           type: string
 *         button_2_link:
 *           type: string
 *         images:
 *           type: string
 *         sort_order:
 *           type: integer
 *         status:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     AvailablePayment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted payment ID
 *         name:
 *           type: string
 *         logo:
 *           type: string
 *         sort_order:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     OurService:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted service ID
 *         icon:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         modals:
 *           type: object
 *         sort_order:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     ContactUs:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted contact ID
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         subject:
 *           type: string
 *         message:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

module.exports = {
    // ============ GENERAL SETTINGS ============
    /**
     * @swagger
     * /api/settings/general:
     *   get:
     *     summary: Get general settings
     *     tags: [Settings - General]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: General settings retrieved successfully
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
     *                   example: "General settings retrieved successfully"
     *                 data:
     *                   $ref: '#/components/schemas/GeneralSettings'
     */
    getGeneralSettings: async (req, res) => {
        try {
            const settings = await knex('general_settings').first();
            
            if (!settings) {
                return res.status(404).json({
                    status: 404,
                    message: 'General settings not found',
                    data: null
                });
            }

            res.status(200).json({
                status: 200,
                message: 'General settings retrieved successfully',
                
            });
        } catch (err) {
            console.error('getGeneralSettings error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/general:
     *   put:
     *     summary: Update general settings
     *     tags: [Settings - General]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/GeneralSettings'
     *     responses:
     *       200:
     *         description: General settings updated successfully
     */
    updateGeneralSettings: async (req, res) => {
        try {
            const updateData = {
                ...req.body,
                updated_at: knex.fn.now()
            };

            // Remove id from update data if present
            delete updateData.id;
            delete updateData.created_at;

            const settings = await knex('general_settings').first();
            
            if (!settings) {
                // If no settings exist, create new one
                const [newSettings] = await knex('general_settings')
                    .insert(updateData)
                    .returning('*');
                
                return res.status(201).json({
                    status: 201,
                    message: 'General settings created successfully',
                    
                });
            }

            // Update existing settings
            const [updatedSettings] = await knex('general_settings')
                .where('id', settings.id)
                .update(updateData)
                .returning('*');

            res.status(200).json({
                status: 200,
                message: 'General settings updated successfully',
                data: updatedSettings
            });
        } catch (err) {
            console.error('updateGeneralSettings error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    // ============ CAROUSELS ============
    /**
     * @swagger
     * /api/settings/carousels:
     *   get:
     *     summary: Get all carousels
     *     tags: [Settings - Carousel]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Carousels retrieved successfully
     */
    getCarousels: async (req, res) => {
        try {
            const carousels = await knex('carousels')
                .whereNull('deleted_at')
                .orderBy('sort_order')
                .orderBy('id');

            const processedCarousels = carousels.map(carousel => ({
                ...carousel,
                id: encryptId(carousel.id)
            }));

            res.status(200).json({
                status: 200,
                message: 'Carousels retrieved successfully',
                });
        } catch (err) {
            console.error('getCarousels error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/carousels:
     *   post:
     *     summary: Create new carousel
     *     tags: [Settings - Carousel]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               title_sub:
     *                 type: string
     *               button_1_title:
     *                 type: string
     *               button_1_link:
     *                 type: string
     *               button_2_title:
     *                 type: string
     *               button_2_link:
     *                 type: string
     *               images:
     *                 type: string
     *               sort_order:
     *                 type: integer
     *               status:
     *                 type: string
     *     responses:
     *       201:
     *         description: Carousel created successfully
     */
    createCarousel: async (req, res) => {
        try {
            const [carousel] = await knex('carousels')
                .insert({
                    ...req.body,
                    created_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                })
                .returning('*');

            const processedCarousel = {
                ...carousel,
                id: encryptId(carousel.id)
            };

            res.status(201).json({
                status: 201,
                message: 'Carousel created successfully',
                data: processedCarousel
            });
        } catch (err) {
            console.error('createCarousel error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/carousels/{id}:
     *   put:
     *     summary: Update carousel
     *     tags: [Settings - Carousel]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted carousel ID
     *     responses:
     *       200:
     *         description: Carousel updated successfully
     */
    updateCarousel: async (req, res) => {
        try {
            const carousel_id = decryptId(req.params.id);
            
            const updateData = {
                ...req.body,
                updated_at: knex.fn.now()
            };
            
            delete updateData.id;
            delete updateData.created_at;

            const [updatedCarousel] = await knex('carousels')
                .where('id', carousel_id)
                .whereNull('deleted_at')
                .update(updateData)
                .returning('*');

            if (!updatedCarousel) {
                return res.status(404).json({
                    status: 404,
                    message: 'Carousel not found',
                    data: null
                });
            }

            const processedCarousel = {
                ...updatedCarousel,
                id: encryptId(updatedCarousel.id)
            };

            res.status(200).json({
                status: 200,
                message: 'Carousel updated successfully',
                data: processedCarousel
            });
        } catch (err) {
            console.error('updateCarousel error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/carousels/{id}:
     *   delete:
     *     summary: Delete carousel (soft delete)
     *     tags: [Settings - Carousel]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted carousel ID
     *     responses:
     *       200:
     *         description: Carousel deleted successfully
     */
    deleteCarousel: async (req, res) => {
        try {
            const carousel_id = decryptId(req.params.id);
            
            const deleted = await knex('carousels')
                .where('id', carousel_id)
                .whereNull('deleted_at')
                .update({
                    deleted_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                });

            if (!deleted) {
                return res.status(404).json({
                    status: 404,
                    message: 'Carousel not found or already deleted',
                    });
            }

            res.status(200).json({
                status: 200,
                message: 'Carousel deleted successfully',
                data: null
            });
        } catch (err) {
            console.error('deleteCarousel error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    // ============ AVAILABLE PAYMENTS ============
    /**
     * @swagger
     * /api/settings/available-payments:
     *   get:
     *     summary: Get all available payments
     *     tags: [Settings - Available Payments]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Available payments retrieved successfully
     */
    getAvailablePayments: async (req, res) => {
        try {
            const payments = await knex('available_payments')
                .whereNull('deleted_at')
                .orderBy('sort_order')
                .orderBy('id');

            const processedPayments = payments.map(payment => ({
                ...payment,
                id: encryptId(payment.id)
            }));

            res.status(200).json({
                status: 200,
                message: 'Available payments retrieved successfully',
                ments
            });
        } catch (err) {
            console.error('getAvailablePayments error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/available-payments:
     *   post:
     *     summary: Create new available payment
     *     tags: [Settings - Available Payments]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *             properties:
     *               name:
     *                 type: string
     *               logo:
     *                 type: string
     *               sort_order:
     *                 type: integer
     *     responses:
     *       201:
     *         description: Available payment created successfully
     */
    createAvailablePayment: async (req, res) => {
        try {
            const { name, logo, sort_order } = req.body;

            if (!name) {
                return res.status(400).json({
                    status: 400,
                    message: 'Name is required',
                    data: null
                });
            }

            const [payment] = await knex('available_payments')
                .insert({
                    name,
                    logo,
                    sort_order,
                    created_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                })
                .returning('*');

            const processedPayment = {
                ...payment,
                id: encryptId(payment.id)
            };

            res.status(201).json({
                status: 201,
                message: 'Available payment created successfully',
                data: processedPayment
            });
        } catch (err) {
            console.error('createAvailablePayment error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/available-payments/{id}:
     *   put:
     *     summary: Update available payment
     *     tags: [Settings - Available Payments]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted payment ID
     *     responses:
     *       200:
     *         description: Available payment updated successfully
     */
    updateAvailablePayment: async (req, res) => {
        try {
            const payment_id = decryptId(req.params.id);
            
            const updateData = {
                ...req.body,
                updated_at: knex.fn.now()
            };
            
            delete updateData.id;
            delete updateData.created_at;

            const [updatedPayment] = await knex('available_payments')
                .where('id', payment_id)
                .whereNull('deleted_at')
                .update(updateData)
                .returning('*');

            if (!updatedPayment) {
                return res.status(404).json({
                    status: 404,
                    message: 'Available payment not found',
                    data: null
                });
            }

            const processedPayment = {
                ...updatedPayment,
                id: encryptId(updatedPayment.id)
            };

            res.status(200).json({
                status: 200,
                message: 'Available payment updated successfully',
                data: processedPayment
            });
        } catch (err) {
            console.error('updateAvailablePayment error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/available-payments/{id}:
     *   delete:
     *     summary: Delete available payment (soft delete)
     *     tags: [Settings - Available Payments]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted payment ID
     *     responses:
     *       200:
     *         description: Available payment deleted successfully
     */
    deleteAvailablePayment: async (req, res) => {
        try {
            const payment_id = decryptId(req.params.id);
            
            const deleted = await knex('available_payments')
                .where('id', payment_id)
                .whereNull('deleted_at')
                .update({
                    deleted_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                });

            if (!deleted) {
                return res.status(404).json({
                    status: 404,
                    message: 'Available payment not found or already deleted',
                    data: null
                });
            }

            res.status(200).json({
                status: 200,
                message: 'Available payment deleted successfully',
                data: null
            });
        } catch (err) {
            console.error('deleteAvailablePayment error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    // ============ OUR SERVICES ============
    /**
     * @swagger
     * /api/settings/our-services:
     *   get:
     *     summary: Get all our services
     *     tags: [Settings - Our Services]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Our services retrieved successfully
     */
    getOurServices: async (req, res) => {
        try {
            const services = await knex('our_services')
                .whereNull('deleted_at')
                .orderBy('sort_order')
                .orderBy('id');

            const processedServices = services.map(service => ({
                ...service,
                id: encryptId(service.id)
            }));

            res.status(200).json({
                status: 200,
                message: 'Our services retrieved successfully',
                data: processedServices
            });
        } catch (err) {
            console.error('getOurServices error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/our-services/{id}:
     *   put:
     *     summary: Update our service
     *     tags: [Settings - Our Services]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted service ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               icon:
     *                 type: string
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               modals:
     *                 type: object
     *               sort_order:
     *                 type: integer
     *     responses:
     *       200:
     *         description: Our service updated successfully
     */
    updateOurService: async (req, res) => {
        try {
            const service_id = decryptId(req.params.id);
            
            const updateData = {
                ...req.body,
                updated_at: knex.fn.now()
            };
            
            delete updateData.id;
            delete updateData.created_at;

            const [updatedService] = await knex('our_services')
                .where('id', service_id)
                .whereNull('deleted_at')
                .update(updateData)
                .returning('*');

            if (!updatedService) {
                return res.status(404).json({
                    status: 404,
                    message: 'Our service not found',
                    data: null
                });
            }

            const processedService = {
                ...updatedService,
                id: encryptId(updatedService.id)
            };

            res.status(200).json({
                status: 200,
                message: 'Our service updated successfully',
                data: processedService
            });
        } catch (err) {
            console.error('updateOurService error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    // ============ CONTACT US ============
    /**
     * @swagger
     * /api/settings/contact-us:
     *   get:
     *     summary: Get all contact us messages
     *     tags: [Settings - Contact Us]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Contact us messages retrieved successfully
     */
    getContactUs: async (req, res) => {
        try {
            const contacts = await knex('contact_us')
                .orderBy('created_at', 'desc');

            const processedContacts = contacts.map(contact => ({
                ...contact,
                id: encryptId(contact.id)
            }));

            res.status(200).json({
                status: 200,
                message: 'Contact us messages retrieved successfully',
                data: processedContacts
            });
        } catch (err) {
            console.error('getContactUs error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/contact-us:
     *   post:
     *     summary: Create new contact us message (public endpoint)
     *     tags: [Settings - Contact Us]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - email
     *               - subject
     *               - message
     *             properties:
     *               name:
     *                 type: string
     *                 maxLength: 100
     *                 example: "John Doe"
     *               email:
     *                 type: string
     *                 maxLength: 150
     *                 example: "john@example.com"
     *               phone:
     *                 type: string
     *                 maxLength: 20
     *                 example: "08123456789"
     *               subject:
     *                 type: string
     *                 maxLength: 255
     *                 example: "Inquiry about products"
     *               message:
     *                 type: string
     *                 example: "I would like to know more about your products"
     *     responses:
     *       201:
     *         description: Contact us message created successfully
     */
    createContactUs: async (req, res) => {
        try {
            const { name, email, phone, subject, message } = req.body;

            // Validation
            if (!name || !email || !subject || !message) {
                return res.status(400).json({
                    status: 400,
                    message: 'Name, email, subject, and message are required',
                    data: null
                });
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid email format',
                    });
            }

            const [contact] = await knex('contact_us')
                .insert({
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone?.trim() || null,
                    subject: subject.trim(),
                    message: message.trim(),
                    created_at: knex.fn.now()
                })
                .returning('*');

            const processedContact = {
                ...contact,
                id: encryptId(contact.id)
            };

            res.status(201).json({
                status: 201,
                message: 'Contact us message sent successfully',
                data: processedContact
            });
        } catch (err) {
            console.error('createContactUs error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/settings/contact-us/{id}:
     *   put:
     *     summary: Update contact us message
     *     tags: [Settings - Contact Us]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted contact ID
     *     responses:
     *       200:
     *         description: Contact us message updated successfully
     */
    updateContactUs: async (req, res) => {
        try {
            const contact_id = decryptId(req.params.id);
            
            const updateData = {
                ...req.body
            };
            
            delete updateData.id;
            delete updateData.created_at;

            const [updatedContact] = await knex('contact_us')
                .where('id', contact_id)
                .update(updateData)
                .returning('*');

            if (!updatedContact) {
                return res.status(404).json({
                    status: 404,
                    message: 'Contact us message not found',
                    });
            }

            const processedContact = {
                ...updatedContact,
                id: encryptId(updatedContact.id)
            };

            res.status(200).json({
                status: 200,
                message: 'Contact us message updated successfully',
                data: processedContact
            });
        } catch (err) {
            console.error('updateContactUs error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },
    
    /**
     * @swagger
     * /api/settings/contact-us/{id}:
     *   delete:
     *     summary: Delete contact us (soft delete)
     *     tags: [Settings - Contact Us]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted payment ID
     *     responses:
     *       200:
     *         description: Contact Us deleted successfully
     */
    deleteContactUs: async (req, res) => {
        try {
            const contact_us_id = decryptId(req.params.id);
            
            const deleted = await knex('contact_us')
                .where('id', contact_us_id)
                .whereNull('deleted_at')
                .update({
                    deleted_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                });

            if (!deleted) {
                return res.status(404).json({
                    status: 404,
                    message: 'Contact Us not found or already deleted',
                    data: null
                });
            }

            res.status(200).json({
                status: 200,
                message: 'Contact Us deleted successfully',
                data: null
            });
        } catch (err) {
            console.error('deleteContactUs error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },
}