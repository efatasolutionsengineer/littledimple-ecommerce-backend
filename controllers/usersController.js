const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const knex = require('../db/knex');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../models/mailer.js');
const { encryptId, decryptId } = require('../models/encryption.js');


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1h';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

module.exports = {
    /**
     * @swagger
     * /api/users/register:
     *   post:
     *     summary: Register a new user
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - username
     *               - email
     *               - password
     *               - full_name
     *             properties:
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *               full_name:
     *                 type: string
     *               dob:
     *                 type: string
     *               phone:
     *                 type: string
     *               address:
     *                 type: string
     *               province_id:
     *                 type: string
     *               province_name:
     *                 type: string
     *               city_id:
     *                 type: string
     *               city_name:
     *                 type: string
     *               subdistrict_id:
     *                 type: string
     *               subdistrict_name:
     *                 type: string
     *     responses:
     *       201:
     *         description: User registered successfully
     *       400:
     *         description: Email already exists
     *       500:
     *         description: Server error
     */
    register: async (req, res) => {
        const {
            username,
            email,
            password,
            full_name,
            phone,
            address,
            province_id,
            province_name,
            city_id,
            city_name,
            subdistrict_id,
            subdistrict_name,
            dob // <- Added here
        } = req.body;

        try {
            const existingUser = await knex('users').where({ email }).first();
            if (existingUser) {
            return res.status(400).json({
                code: "EMAIL_EXISTS",
                status: "error",
                message: "Email sudah terdaftar",
                data: []
            });
            }

            const hashedPassword = await bcrypt.hash(password, 20);

            const [user] = await knex('users')
            .insert({
                username,
                email,
                password: hashedPassword,
                full_name,
                phone,
                address,
                province_id,
                province_name,
                city_id,
                city_name,
                subdistrict_id,
                subdistrict_name,
                dob, // <- Inserted into DB
                is_verified_email: false,
                is_verified_phone: null,
            })
            .returning(['id', 'username', 'email']);

            user.id = encryptId(user.id);

            const token = jwt.sign({ email: encryptId(user.email) }, process.env.JWT_SECRET, { expiresIn: '1d' });
            await sendVerificationEmail(user.email, token);

            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
                
                const welcomeMailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Selamat Datang di Little Dimple Ecommerce!',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                            <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px;">🎉 Selamat Datang di Little Dimple Ecommerce!</h2>
                            
                            <p>Halo ${full_name || username},</p>
                            
                            <p>Terima kasih telah mendaftar di Little Dimple Ecommerce. Kami senang Anda bergabung dengan komunitas kami!</p>
                            
                            <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin: 20px 0;">
                                <p><strong>Detail akun Anda:</strong></p>
                                <p>Nama: ${full_name || username}</p>
                                <p>Email: ${email}</p>
                                <p>Akun dibuat pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                            </div>
                            
                            <p>Anda sekarang dapat berbelanja produk terbaru kami, melacak pesanan Anda, dan menikmati pengalaman berbelanja yang dipersonalisasi.</p>
                            
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'https://littledimple.com'}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Kunjungi Toko Kami</a>
                            </div>
                            
                            <p>Jika Anda memiliki pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi tim layanan pelanggan kami.</p>
                            
                            <p>Selamat berbelanja!</p>
                            
                            <p>Salam hangat,<br>Tim Little Dimple</p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                            <small style="color: #999;">Ini adalah pesan otomatis. Mohon tidak membalas email ini.</small>
                        </div>
                    `,
                };
                
                // Send welcome email without awaiting (non-blocking)
                transporter.sendMail(welcomeMailOptions)
                    .then(() => console.log(`Welcome email sent to ${email}`))
                    .catch(error => console.warn(`Failed to send welcome email to ${email}: ${error.message}`));
                    
            } catch (emailError) {
                // Just log the error and continue - welcome email is non-mandatory
                console.warn(`Error preparing welcome email for ${email}: ${emailError.message}`);
            }

            return res.status(201).json({
            code: "",
            status: "success",
            message: "User registered successfully",
            data: [user]
            });
        } catch (err) {
            return res.status(500).json({
            code: "SERVER_ERROR",
            status: "error",
            message: err.message,
            data: []
            });
        }
    },
    

    /**
     * @swagger
     * /api/users/login:
     *   post:
     *     summary: Login a user
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 example: admin@domain.com
     *               password:
     *                 type: string
     *                 example: admin1234
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     *       500:
     *         description: Server error
     */
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await knex('users').where({ email }).whereNull('deleted_at').first();
            if (!user) return res.status(401).json({ message: 'Invalid credentials' });

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

            const token = jwt.sign(
                { id: encryptId(user.id), role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 60 * 60 * 1000,
            });

            res.json({ message: 'Logged in successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/logout:
     *   post:
     *     summary: Logout a user
     *     tags: [Users]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Logout successful
     */
    logout: async (req, res) => {
        try {
            res.clearCookie('token'); // Menghapus token dari cookie
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/me:
     *   get:
     *     summary: Get user profile
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User profile retrieved successfully
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    getProfile: async (req, res) => {
        try {
            const user = await knex('users').where({ id: decryptId(req.user.id) }).whereNull('deleted_at').first().select('id', 'username', 'email', 'full_name', 'phone', 'address', 'role');
            if (!user) return res.status(404).json({ message: 'User not found' });

            user.id = encryptId(user.id);

            res.json({ user });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/{id}:
     *   delete:
     *     summary: Soft delete a user
     *     tags: [Users]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID
     *     responses:
     *       200:
     *         description: User soft-deleted successfully
     *       404:
     *         description: User not found or already deleted
     *       500:
     *         description: Server error
     */
    softDeleteUser: async (req, res) => {
        try {
            const decryptedId = decryptId(req.params.id);

            const deleted = await knex('users')
            .where({ id: decryptedId })
            .whereNull('deleted_at')
            .update({ deleted_at: knex.fn.now() });

            if (!deleted) {
            return res.status(404).json({ message: 'User not found or already deleted' });
            }

            res.json({ message: 'User soft-deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/send-verification:
     *   post:
     *     summary: Send verification email if not verified
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Verification email sent
     *       404:
     *         description: Email not found
     *       400:
     *         description: Email already verified
     *       500:
     *         description: Server error
     */
    sendVerification: async (req, res) => {
        try {
            const user = await knex('users').where({ email: req.body.email }).whereNull('deleted_at').first();
            if (!user) return res.status(404).json({ message: 'Email tidak ditemukan' });
            if (user.is_verified_email) return res.status(400).json({ message: 'Email sudah diverifikasi' });
        
            const token = jwt.sign({ email: encryptId(user.email) }, process.env.JWT_SECRET, { expiresIn: '1d' });
            await sendVerificationEmail(user.email, token);
        
            res.json({ message: 'Email verifikasi telah dikirim' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/verify-email/{token}:
     *   get:
     *     summary: Verify email using token
     *     tags: [Users]
     *     parameters:
     *       - in: path
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Email verified successfully
     *       400:
     *         description: Invalid or expired token
     *       404:
     *         description: User not found
     */
    verifyEmail: async (req, res) => {
        try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const email = decryptId(decoded.email);
    
        const updated = await knex('users')
            .where({ email })
            .whereNull('deleted_at')
            .update({ is_verified_email: true });
    
        if (!updated) return res.status(404).json({ message: 'User tidak ditemukan' });
    
        res.json({ message: 'Email berhasil diverifikasi' });
        } catch (err) {
        res.status(400).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
        }
    },
  
    /**
     * @swagger
     * /api/users/forgot-password:
     *   post:
     *     summary: Request password reset email
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Password reset email sent successfully
     *       404:
     *         description: Email not found
     *       500:
     *         description: Server error
     */
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            
            const user = await knex('users').where({ email }).whereNull('deleted_at').first();
            if (!user) return res.status(404).json({ message: 'Email tidak ditemukan' });

            const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await sendPasswordResetEmail(user.email, token);
            
            res.json({ message: 'Email reset password telah dikirim' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/users/reset-password/{token}:
     *   post:
     *     summary: Reset user password using token
     *     tags: [Users]
     *     parameters:
     *       - in: path
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - password
     *             properties:
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Password successfully updated
     *       400:
     *         description: Invalid or expired token
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    resetPassword: async (req, res) => {
        try {
            const { password } = req.body;
            const { token } = req.params;
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            const hashedPassword = await bcrypt.hash(password, 20);
            
            const updated = await knex('users')
                .where({ email })
                .whereNull('deleted_at')
                .update({ password: hashedPassword });

            if (!updated) return res.status(404).json({ message: 'User tidak ditemukan' });

            res.json({ message: 'Password berhasil direset' });
        } catch (err) {
            res.status(400).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
        }
    },
};