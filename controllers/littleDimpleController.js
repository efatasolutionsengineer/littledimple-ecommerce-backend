const knex = require('../db/knex');
const nodemailer = require('nodemailer');

/**
 * @swagger
 * tags:
 *   name: Little Dimple
 *   description: Manage Little dimple of the platform
 */

module.exports = {
  /**
   * @swagger
   * /api/ld/home:
   *   get:
   *     summary: Get Little dimple
   *     tags: [Little Dimple]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Little dimple data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 settings:
   *                   type: object
   *                   description: The settings data
   */
  getHome: async (req, res) => {
    try {
      // Link sosial dan info toko (ambil dari tabel general_settings)
      const [info] = await knex('general_settings').limit(1);

      // Explore Links (ambil dari tabel explore_links)
      const explore = await knex('explore_links')
        .select('title', 'link', 'sort_order')
        .whereNull('deleted_at')
        .orderBy('sort_order', 'asc'); // urutkan berdasarkan sort_order

      // Available payment (ambil dari tabel available_payments)
      const available_payment = await knex('available_payments')
        .select('name', 'logo', 'sort_order')
        .whereNull('deleted_at')
        .orderBy('sort_order', 'asc') // urutkan berdasarkan sort_order
        .limit(6); // Anda dapat menyesuaikan jumlah sesuai kebutuhan

      // Carousel (ambil dari tabel carousels)
      const carousel = await knex('carousels')
        .select('title', 'title_sub', 'button_1_title', 'button_1_link', 'button_2_title', 'button_2_link', 'images', 'sort_order', 'status')
        .whereNull('deleted_at')
        .andWhere('status', 'active') // filter hanya yang statusnya aktif
        .orderBy('sort_order', 'asc'); // urutkan berdasarkan sort_order

      // Our service + modal detail (ambil dari tabel our_services)
      const services = await knex('our_services')
        .whereNull('deleted_at')
        .orderBy('sort_order', 'asc'); // urutkan berdasarkan sort_order

      const our_service = services.map(service => {
        return {
          icon: service.icon,
          title: service.title,
          description: service.description,
          modals: service.modals || [] // ambil modals dari field JSONB
        };
      });

      // About Us (diambil dari tabel general_settings)
      const about_us = {
        media_link: info?.media_link || '',
        title: info?.about_title || '',
        description: info?.about_description || '',
        button_link: info?.about_button_link || '',
        button_title: info?.about_button_title || ''
      };

      // Reviews (ambil user info juga)
      const reviewsRaw = await knex('reviews as r')
        .join('users as u', 'r.user_id', 'u.id')
        .select(
          'u.profile_picture as user_profile_picture',
          'u.username as user_name',
          'r.created_at as timestamp',
          'r.rating as score',
          'r.review as description'
        )
        .whereNull('r.deleted_at')
        .orderBy('r.created_at', 'desc')
        .limit(10);

      // Call to action (ambil dari tabel call_to_action)
      const call_to_action = {
        title: info?.title || '',
        button_link: info?.button_link || '',
        button_title: info?.button_title || ''
      };

      // Mengirim response JSON dengan data yang sudah digabungkan
      res.json({
        link_instagram: info?.link_instagram || '',
        link_whatsapp: info?.link_whatsapp || '',
        link_tokopedia: info?.link_tokopedia || '',
        link_shopee: info?.link_shopee || '',
        alamat: info?.alamat || '',
        email: info?.email || '',
        logo: info?.logo || '',
        favicon: info?.favicon || '',
        no_telepon: info?.no_telepon || '',
        explore,
        available_payment,
        carousel,
        our_service,
        about_us,
        reviews: reviewsRaw,
        call_to_action
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/ld/contact-us:
   *   post:
   *     summary: Submit a contact us message
   *     tags: [Little Dimple]
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
   *               email:
   *                 type: string
   *                 format: email
   *               phone:
   *                 type: string
   *               subject:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Contact message submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 contact:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                     name:
   *                       type: string
   *                     email:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     subject:
   *                       type: string
   *                     message:
   *                       type: string
   *                     created_at:
   *                       type: string
   *                       format: date-time
   *       500:
   *         description: Server error
   */
  postContactUs: async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    try {
      // 1. Insert into DB
      const [contact] = await knex('contact_us')
        .insert({ name, email, phone, subject, message })
        .returning('*');

      // 2. Send Email
      const transporter = nodemailer.createTransport({
        service: 'gmail', // or your preferred SMTP provider
        port: 587,         // Change from 465 to 587
        secure: false,
        auth: {
          user: process.env.EMAIL_USER, // your email address
          pass: process.env.EMAIL_PASS, // your email app password
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL_CONTACTUS, // receiver email
        subject: `New Contact Us Submission: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px;">📬 New Contact Us Message</h2>

            <p><strong>Name:</strong> <span style="color: #555;">${name}</span></p>
            <p><strong>Email:</strong> <span style="color: #555;">${email}</span></p>
            <p><strong>Phone:</strong> <span style="color: #555;">${phone || '-'}</span></p>
            <p><strong>Subject:</strong> <span style="color: #555;">${subject}</span></p>

            <div style="margin-top: 20px;">
              <strong>Message:</strong>
              <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin-top: 5px; color: #333;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <small style="color: #999;">Submitted on ${new Date().toLocaleString()}</small>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(201).json({ contact, message: 'Message submitted and emailed successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to submit message', error: err.message });
    }
  },

  /**
   * @swagger
   * /api/ld/warranty:
   *   post:
   *     summary: Check if warranty exists by code
   *     tags: [Warranty]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               kode_warranty:
   *                 type: string
   *             required:
   *               - kode_warranty
   *     responses:
   *       200:
   *         description: Warranty found or not found
   *       400:
   *         description: Bad request
   *       500:
   *         description: Server error
   */
  checkWarranty: async (req, res) => {
    const { kode_warranty } = req.body;

    if (!kode_warranty) {
      return res.status(400).json({ error: 'kode_warranty is required' });
    }

    try {
      const result = await knex('warranty').where({ kode_warranty }).first();

      if (!result) {
        return res.status(404).json({ exists: false, message: 'Warranty not found' });
      }

      return res.status(200).json({ exists: true, data: result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/ld/manual-warranty:
   *   post:
   *     summary: Insert manual warranty data
   *     tags: [Warranty]
   *     consumes:
   *       - multipart/form-data
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               nohp:
   *                 type: string
   *               address:
   *                 type: string
   *               province:
   *                 type: string
   *               city:
   *                 type: string
   *               district:
   *                 type: string
   *               subdistrict:
   *                 type: string
   *               postalcode:
   *                 type: string
   *               description:
   *                 type: string
   *               attachment_receipt:
   *                 type: string
   *                 format: binary
   *               attachment_barcode:
   *                 type: string
   *                 format: binary
   *               attachment_product:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Manual warranty submitted successfully
   */
  insertManualWarranty: async (req, res) => {
    const {
      name,
      email,
      nohp,
      address,
      province,
      city,
      district,
      subdistrict,
      postalcode,
      description,
    } = req.body;

    const receiptFile = req.files['attachment_receipt']?.[0]?.path;
    const barcodeFile = req.files['attachment_barcode']?.[0]?.path;
    const productFile = req.files['attachment_product']?.[0]?.path;

    if (!name || !email || !nohp || !address || !receiptFile || !barcodeFile || !productFile) {
      return res.status(400).json({ error: 'Missing required fields or files' });
    }

    try {
      const fullAddress = `${address}, ${subdistrict}, ${district}, ${city}, ${province}, ${postalcode}`;

      const [id] = await knex('warranty').insert({
        nama: name,
        email,
        nomor_hp: nohp,
        alamat: fullAddress,
        attachments_receipt: receiptFile,
        attachments_barcode: barcodeFile,
        attachments_product: productFile,
        description,
        order_id: 0,
        status: 'submitted',
      }).returning('id');

      return res.status(201).json({ message: 'Manual warranty submitted', id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

};
