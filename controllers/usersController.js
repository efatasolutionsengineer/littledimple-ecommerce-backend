const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const knex = require('../db/knex');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../models/mailer.js');
const { encryptId, decryptId } = require('../models/encryption.js');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1h';

const formatKabupatenId = (id) => {
  const idStr = id.toString();
  if (idStr.length >= 3) {
    return `${idStr.substring(0, 2)}.${idStr.substring(2)}`;
  }
  return idStr; // Return as-is if less than 3 characters
}

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

            const hashedPassword = await bcrypt.hash(password, 10);

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

            const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await sendVerificationEmail(user.email, token);

            // try {
            //     const transporter = nodemailer.createTransport({
            //         service: 'gmail',
            //         port: 587,         // Change from 465 to 587
            //         secure: false,
            //         auth: {
            //             user: process.env.EMAIL_USER,
            //             pass: process.env.EMAIL_PASS,
            //         },
            //     });
                
            //     const welcomeMailOptions = {
            //         from: process.env.EMAIL_USER,
            //         to: user.email,
            //         subject: 'Selamat Datang di Little Dimple Ecommerce!',
            //         html: `
            //             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            //                 <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px;">🎉 Selamat Datang di Little Dimple Ecommerce!</h2>
                            
            //                 <p>Halo ${full_name || username},</p>
                            
            //                 <p>Terima kasih telah mendaftar di Little Dimple Ecommerce. Kami senang Anda bergabung dengan komunitas kami!</p>
                            
            //                 <div style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin: 20px 0;">
            //                     <p><strong>Detail akun Anda:</strong></p>
            //                     <p>Nama: ${full_name || username}</p>
            //                     <p>Email: ${email}</p>
            //                     <p>Akun dibuat pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
            //                 </div>
                            
            //                 <p>Anda sekarang dapat berbelanja produk terbaru kami, melacak pesanan Anda, dan menikmati pengalaman berbelanja yang dipersonalisasi.</p>
                            
            //                 <div style="margin: 30px 0; text-align: center;">
            //                     <a href="${process.env.FRONTEND_URL || 'https://littledimple.com'}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Kunjungi Toko Kami</a>
            //                 </div>
                            
            //                 <p>Jika Anda memiliki pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi tim layanan pelanggan kami.</p>
                            
            //                 <p>Selamat berbelanja!</p>
                            
            //                 <p>Salam hangat,<br>Tim Little Dimple</p>
                            
            //                 <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            //                 <small style="color: #999;">Ini adalah pesan otomatis. Mohon tidak membalas email ini.</small>
            //             </div>
            //         `,
            //     };
                
            //     // Send welcome email without awaiting (non-blocking)
            //     transporter.sendMail(welcomeMailOptions)
            //         .then(() => console.log(`Welcome email sent to ${email}`))
            //         .catch(error => console.warn(`Failed to send welcome email to ${email}: ${error.message}`));
                    
            // } catch (emailError) {
            //     // Just log the error and continue - welcome email is non-mandatory
            //     console.warn(`Error preparing welcome email for ${email}: ${emailError.message}`);
            // }

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
        
            const token = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
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

            const email = decoded.email;
            const updated = await knex('users')
                .where({ email })
                .whereNull('deleted_at')
                .update({ is_verified_email: true });
        
            if (!updated) return res.status(404).json({ message: 'User tidak ditemukan' });
        
            res.status(200).json({ message: 'Email berhasil diverifikasi' });
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

            const hashedPassword = await bcrypt.hash(password, 10);
            
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

    // /**
    //  * @swagger
    //  * /api/users/grabdata_kecamatan:
    //  *   post:
    //  *     summary: Grab ~8000 kecamatan data from 514 kabupaten via external API
    //  *     tags: [Users]
    //  *     security:
    //  *       - cookieAuth: []
    //  *     requestBody:
    //  *       required: false
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               api_key:
    //  *                 type: string
    //  *                 example: "YOUR_API_KEY"
    //  *                 description: "Optional API key, will use environment variable if not provided"
    //  *               batch_size:
    //  *                 type: integer
    //  *                 example: 25
    //  *                 description: "Number of kabupaten to process in each batch (default: 25)"
    //  *               delay_ms:
    //  *                 type: integer
    //  *                 example: 750
    //  *                 description: "Delay between API calls in milliseconds (default: 750ms)"
    //  *               max_retries:
    //  *                 type: integer
    //  *                 example: 3
    //  *                 description: "Maximum retry attempts for failed API calls (default: 3)"
    //  */
    grabDataKecamatan: async (req, res) => {
        const API_KEY = "60a1dda5d39eae25a99b6ee3ecdb2c9e6e93cf078dfb502d8765aa0a33e5fd80";
        const BATCH_SIZE = req.body.batch_size || 25; // Optimal for 514 kabupaten
        const DELAY_MS = req.body.delay_ms || 750; // Optimized for ~8-10 minute total time
        const MAX_RETRIES = req.body.max_retries || 3;
        
        let processedCount = 0;
        let totalKecamatanInserted = 0;
        let failedKabupaten = [];
        let duplicateCount = 0;
        let totalApiCalls = 0;
        
        // Helper function for retry logic
        const makeAPICallWithRetry = async (kabupaten, retryCount = 0) => {
        try {
            totalApiCalls++;
            const response = await axios.get('https://api.binderbyte.com/wilayah/kecamatan', {
            params: {
                api_key: API_KEY,
                id_kabupaten: formatKabupatenId(kabupaten.id),
            },
            timeout: 15000,
            // headers: {
            //     'User-Agent': 'Indonesia-Region-Data-Grabber/1.0'
            // }
            });

            if (response.data && response.data.code === "200") {
            return response.data;
            } else {
            throw new Error(`API returned code: ${response.data?.code || 'unknown'}, message: ${response.data?.messages || 'No message'}`);
            }
        } catch (error) {
            if (retryCount < MAX_RETRIES && (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.response?.status >= 500)) {
            console.log(`🔄 Retrying ${kabupaten.name} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return makeAPICallWithRetry(kabupaten, retryCount + 1);
            }
            throw error;
        }
        };

        try {
        // Get all kabupaten from database
        const kabupatenList = await knex('kabupaten')
            .select('id', 'name')
            .orderBy('id');
        
        if (kabupatenList.length === 0) {
            return res.status(404).json({
            status: 404,
            message: 'No kabupaten found in database',
            data: null
            });
        }

        const actualTotal = kabupatenList.length;
        const estimatedTime = Math.ceil((actualTotal * DELAY_MS) / 60000);
        const totalBatches = Math.ceil(actualTotal / BATCH_SIZE);

        // Send immediate response
        res.status(200).json({
            status: 200,
            message: `Kecamatan data grabbing started for ${actualTotal} kabupaten`,
            data: {
            total_kabupaten: actualTotal,
            total_batches: totalBatches,
            batch_size: BATCH_SIZE,
            estimated_kecamatan: 8000,
            estimated_time_minutes: estimatedTime,
            delay_ms: DELAY_MS,
            note: `Processing ${actualTotal} kabupaten in ${totalBatches} batches. Monitor server logs for detailed progress.`
            }
        });

        console.log('=== STARTING KECAMATAN DATA GRABBING ===');
        console.log(`📊 Total kabupaten to process: ${actualTotal}`);
        console.log(`📁 Total batches: ${totalBatches} (${BATCH_SIZE} per batch)`);
        console.log(`⏱️  Expected kecamatan records: ~8,000`);
        console.log(`⏰ Estimated completion time: ~${estimatedTime} minutes`);
        console.log(`🔄 Delay between calls: ${DELAY_MS}ms`);
        console.log('=============================================');

        const startTime = Date.now();

        // Process kabupaten in batches
        for (let i = 0; i < actualTotal; i += BATCH_SIZE) {
            const batch = kabupatenList.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
            
            console.log(`\n🔄 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} kabupaten)`);
            
            for (const kabupaten of batch) {
                try {
                    const progress = `[${processedCount + 1}/${actualTotal}]`;
                    console.log(`${progress} 🏛️ Processing: ${kabupaten.name} (${kabupaten.id})`);
                    
                    // Make API request with retry logic
                    const apiResponse = await makeAPICallWithRetry(kabupaten);

                    if (apiResponse.value && Array.isArray(apiResponse.value)) {
                    const kecamatanData = apiResponse.value;
                    
                    if (kecamatanData.length > 0) {
                        // Prepare data for batch insert with validation
                        const insertData = kecamatanData
                        .filter(kecamatan => kecamatan.id && kecamatan.name)
                        .map(kecamatan => ({
                            id: kecamatan.id.toString(),
                            id_kabupaten: kecamatan.id_kabupaten.toString(),
                            name: kecamatan.name.trim()
                        }));

                        if (insertData.length > 0) {
                        // Check for existing records
                        const existingIds = await knex('kecamatan')
                            .whereIn('id', insertData.map(item => item.id))
                            .pluck('id');

                        const newData = insertData.filter(item => !existingIds.includes(item.id));
                        duplicateCount += (insertData.length - newData.length);

                        if (newData.length > 0) {
                            // Use transaction for batch insert
                            await knex.transaction(async (trx) => {
                            await trx('kecamatan').insert(newData);
                            });
                            
                            totalKecamatanInserted += newData.length;
                            console.log(`   ✅ Inserted ${newData.length} new kecamatan ${existingIds.length > 0 ? `(${existingIds.length} duplicates skipped)` : ''}`);
                        } else {
                            console.log(`   ⚠️ All ${insertData.length} kecamatan already exist`);
                        }
                        } else {
                        console.log(`   ⚠️ No valid kecamatan data after filtering`);
                        }
                    } else {
                        console.log(`   ⚠️ No kecamatan found`);
                    }
                    } else {
                    throw new Error('Invalid API response structure');
                    }

                    processedCount++;

                } catch (error) {
                    console.error(`   ❌ Error processing ${kabupaten.name}: ${error.message}`);
                    failedKabupaten.push({
                    id: kabupaten.id,
                    name: kabupaten.name,
                    error: error.message
                    });
                    processedCount++;
                }

                // Rate limiting delay
                if (DELAY_MS > 0) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
            }

            // Progress update every batch
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const avgTimePerKabupaten = elapsed / processedCount;
            const remainingKabupaten = actualTotal - processedCount;
            const remainingTime = Math.round(remainingKabupaten * avgTimePerKabupaten);
            const successRate = ((processedCount - failedKabupaten.length) / processedCount * 100).toFixed(1);
            
            console.log(`\n📊 Batch ${batchNumber}/${totalBatches} completed!`);
            console.log(`   Progress: ${processedCount}/${actualTotal} kabupaten (${(processedCount/actualTotal*100).toFixed(1)}%)`);
            console.log(`   Kecamatan inserted: ${totalKecamatanInserted.toLocaleString()}`);
            console.log(`   Success rate: ${successRate}%`);
            console.log(`   Time: ${Math.floor(elapsed/60)}m ${elapsed%60}s elapsed, ~${Math.floor(remainingTime/60)}m ${remainingTime%60}s remaining`);
            console.log(`   API calls made: ${totalApiCalls}`);
        }

        // Final results
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        const avgKecamatanPerKabupaten = totalKecamatanInserted / (processedCount - failedKabupaten.length);
        
        console.log('\n🎉 === KECAMATAN DATA GRABBING COMPLETED ===');
        console.log(`⏱️  Total processing time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
        console.log(`🏛️  Total kabupaten processed: ${processedCount}/${actualTotal}`);
        console.log(`🏘️  Total kecamatan inserted: ${totalKecamatanInserted.toLocaleString()}`);
        console.log(`🔄 Total API calls made: ${totalApiCalls}`);
        console.log(`📝 Duplicate records skipped: ${duplicateCount.toLocaleString()}`);
        console.log(`❌ Failed kabupaten: ${failedKabupaten.length}`);
        console.log(`✅ Success rate: ${((processedCount - failedKabupaten.length) / processedCount * 100).toFixed(1)}%`);
        console.log(`📊 Average kecamatan per kabupaten: ${avgKecamatanPerKabupaten.toFixed(1)}`);
        console.log(`⚡ Average processing time per kabupaten: ${(totalTime/processedCount).toFixed(1)}s`);
        
        if (failedKabupaten.length > 0) {
            console.log(`\n❌ --- FAILED KABUPATEN (${failedKabupaten.length}) ---`);
            failedKabupaten.forEach((failed, index) => {
            console.log(`${index + 1}. ${failed.name} (${failed.id}): ${failed.error}`);
            });
            console.log('\n💡 Tip: Re-run the endpoint to retry failed kabupaten');
        }
        
        console.log('==============================================');

        // Optional: Log summary statistics
        if (totalKecamatanInserted >= 7500) {
            console.log('🎯 SUCCESS: Retrieved expected number of kecamatan records!');
        } else if (totalKecamatanInserted >= 6000) {
            console.log('⚠️  WARNING: Lower than expected kecamatan count. Some kabupaten might have failed.');
        } else {
            console.log('❌ ERROR: Significantly lower kecamatan count. Check failed kabupaten list.');
        }

        } catch (error) {
        console.error('💥 Fatal error in grabDataKecamatan:', error);
        
        if (!res.headersSent) {
            return res.status(500).json({
            status: 500,
            message: 'Fatal error during kecamatan data grabbing',
            error: error.message,
            data: {
                processed_kabupaten: processedCount,
                kecamatan_inserted: totalKecamatanInserted,
                failed_kabupaten: failedKabupaten.length,
                api_calls_made: totalApiCalls
            }
            });
        }
        }
    },

    // /**
    //  * @swagger
    //  * /api/users/grabdata_kelurahan:
    //  *   post:
    //  *     summary: Grab ~84000 kelurahan data from ~8000 kecamatan via external API
    //  *     tags: [Users]
    //  *     security:
    //  *       - cookieAuth: []
    //  *     requestBody:
    //  *       required: false
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               api_key:
    //  *                 type: string
    //  *                 example: "YOUR_API_KEY"
    //  *                 description: "Optional API key, will use environment variable if not provided"
    //  *               batch_size:
    //  *                 type: integer
    //  *                 example: 20
    //  *                 description: "Number of kecamatan to process in each batch (default: 20)"
    //  *               delay_ms:
    //  *                 type: integer
    //  *                 example: 500
    //  *                 description: "Delay between API calls in milliseconds (default: 500ms)"
    //  *               max_retries:
    //  *                 type: integer
    //  *                 example: 3
    //  *                 description: "Maximum retry attempts for failed API calls (default: 3)"
    //  */
    grabDataKelurahan: async (req, res) => {
        const API_KEY = "60a1dda5d39eae25a99b6ee3ecdb2c9e6e93cf078dfb502d8765aa0a33e5fd80";
        const BATCH_SIZE = req.body.batch_size || 20; // Smaller batch for ~8000 kecamatan
        const DELAY_MS = req.body.delay_ms || 500; // Faster for large dataset
        const MAX_RETRIES = req.body.max_retries || 3;
        
        let processedCount = 0;
        let totalKelurahanInserted = 0;
        let failedKecamatan = [];
        let duplicateCount = 0;
        let totalApiCalls = 0;
        let skippedCount = 0;
        
        // Helper function for retry logic
        const makeAPICallWithRetry = async (kecamatan, retryCount = 0) => {
            try {
                totalApiCalls++;
                
                console.log(`   🔗 API Call: id_kecamatan=${kecamatan.id}`);
                
                const response = await axios.get('https://api.binderbyte.com/wilayah/kelurahan', {
                    params: {
                        api_key: API_KEY,
                        id_kecamatan: kecamatan.id, // Fixed: use kecamatan.id instead of undefined variable
                    },
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Indonesia-Region-Data-Grabber/1.0'
                    }
                });

                if (response.data && response.data.code === "200") {
                    return response.data;
                } else {
                    throw new Error(`API returned code: ${response.data?.code || 'unknown'}, message: ${response.data?.messages || 'No message'}`);
                }
            } catch (error) {
                if (retryCount < MAX_RETRIES && (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.response?.status >= 500)) {
                    console.log(`🔄 Retrying ${kecamatan.name} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
                    return makeAPICallWithRetry(kecamatan, retryCount + 1);
                }
                throw error;
            }
        };

        try {
            // Get all kecamatan from database (NOT kabupaten)
            const kecamatanList = await knex('kecamatan')
                .select('id', 'name', 'id_kabupaten')
                .orderBy('id');
            
            if (kecamatanList.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'No kecamatan found in database',
                    data: null
                });
            }

            const actualTotal = kecamatanList.length;
            const estimatedTime = Math.ceil((actualTotal * DELAY_MS) / 60000);
            const totalBatches = Math.ceil(actualTotal / BATCH_SIZE);

            // Send immediate response
            res.status(200).json({
                status: 200,
                message: `Kelurahan data grabbing started for ${actualTotal} kecamatan`,
                data: {
                    total_kecamatan: actualTotal,
                    total_batches: totalBatches,
                    batch_size: BATCH_SIZE,
                    estimated_kelurahan: 84000,
                    estimated_time_minutes: estimatedTime,
                    delay_ms: DELAY_MS,
                    note: `Processing ${actualTotal} kecamatan in ${totalBatches} batches. Expected ~84,000 kelurahan records. Monitor server logs for detailed progress.`
                }
            });

            console.log('=== STARTING KELURAHAN DATA GRABBING ===');
            console.log(`📊 Total kecamatan to process: ${actualTotal}`);
            console.log(`📁 Total batches: ${totalBatches} (${BATCH_SIZE} per batch)`);
            console.log(`⏱️  Expected kelurahan records: ~84,000`);
            console.log(`⏰ Estimated completion time: ~${estimatedTime} minutes`);
            console.log(`🔄 Delay between calls: ${DELAY_MS}ms`);
            console.log('=============================================');

            const startTime = Date.now();

            // Process kecamatan in batches
            for (let i = 0; i < actualTotal; i += BATCH_SIZE) {
                const batch = kecamatanList.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
                
                console.log(`\n🔄 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} kecamatan)`);
                
                for (const kecamatan of batch) {
                    try {
                        const progress = `[${processedCount + 1}/${actualTotal}]`;
                        console.log(`${progress} 🏘️ Processing: ${kecamatan.name} (ID: ${kecamatan.id})`);
                        
                        // Make API request with retry logic
                        const apiResponse = await makeAPICallWithRetry(kecamatan);

                        if (apiResponse.value && Array.isArray(apiResponse.value)) {
                            const kelurahanData = apiResponse.value;
                            
                            if (kelurahanData.length > 0) {
                                // Prepare data for batch insert with validation
                                const insertData = kelurahanData
                                    .filter(kelurahan => kelurahan.id && kelurahan.name)
                                    .map(kelurahan => ({
                                        id: kelurahan.id.toString(),
                                        id_kecamatan: kelurahan.id_kecamatan.toString(),
                                        name: kelurahan.name.trim()
                                    }));

                                if (insertData.length > 0) {
                                    // Check for existing records
                                    const existingIds = await knex('kelurahan')
                                        .whereIn('id', insertData.map(item => item.id))
                                        .pluck('id');

                                    const newData = insertData.filter(item => !existingIds.includes(item.id));
                                    duplicateCount += (insertData.length - newData.length);

                                    if (newData.length > 0) {
                                        // Use transaction for batch insert
                                        await knex.transaction(async (trx) => {
                                            await trx('kelurahan').insert(newData);
                                        });
                                        
                                        totalKelurahanInserted += newData.length;
                                        console.log(`   ✅ Inserted ${newData.length} new kelurahan ${existingIds.length > 0 ? `(${existingIds.length} duplicates skipped)` : ''}`);
                                    } else {
                                        console.log(`   ⚠️ All ${insertData.length} kelurahan already exist`);
                                    }
                                } else {
                                    console.log(`   ⚠️ No valid kelurahan data after filtering`);
                                }
                            } else {
                                console.log(`   ⚠️ No kelurahan found`);
                                skippedCount++;
                            }
                        } else {
                            throw new Error('Invalid API response structure');
                        }

                        processedCount++;

                    } catch (error) {
                        console.error(`   ❌ Error processing ${kecamatan.name} (${kecamatan.id}): ${error.message}`);
                        failedKecamatan.push({
                            id: kecamatan.id,
                            name: kecamatan.name,
                            id_kabupaten: kecamatan.id_kabupaten,
                            error: error.message
                        });
                        processedCount++;
                    }

                    // Rate limiting delay
                    if (DELAY_MS > 0) {
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }

                // Progress update every batch
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const avgTimePerKecamatan = elapsed / processedCount;
                const remainingKecamatan = actualTotal - processedCount;
                const remainingTime = Math.round(remainingKecamatan * avgTimePerKecamatan);
                const successRate = ((processedCount - failedKecamatan.length) / processedCount * 100).toFixed(1);
                
                console.log(`\n📊 Batch ${batchNumber}/${totalBatches} completed!`);
                console.log(`   Progress: ${processedCount}/${actualTotal} kecamatan (${(processedCount/actualTotal*100).toFixed(1)}%)`);
                console.log(`   Kelurahan inserted: ${totalKelurahanInserted.toLocaleString()}`);
                console.log(`   Success rate: ${successRate}%`);
                console.log(`   Empty kecamatan: ${skippedCount}`);
                console.log(`   Time: ${Math.floor(elapsed/60)}m ${elapsed%60}s elapsed, ~${Math.floor(remainingTime/60)}m ${remainingTime%60}s remaining`);
                console.log(`   API calls made: ${totalApiCalls}`);
            }

            // Final results
            const totalTime = Math.round((Date.now() - startTime) / 1000);
            const avgKelurahanPerKecamatan = totalKelurahanInserted / (processedCount - failedKecamatan.length);
            
            console.log('\n🎉 === KELURAHAN DATA GRABBING COMPLETED ===');
            console.log(`⏱️  Total processing time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
            console.log(`🏘️  Total kecamatan processed: ${processedCount}/${actualTotal}`);
            console.log(`🏠 Total kelurahan inserted: ${totalKelurahanInserted.toLocaleString()}`);
            console.log(`🔄 Total API calls made: ${totalApiCalls}`);
            console.log(`📝 Duplicate records skipped: ${duplicateCount.toLocaleString()}`);
            console.log(`⚠️  Empty kecamatan (no kelurahan): ${skippedCount}`);
            console.log(`❌ Failed kecamatan: ${failedKecamatan.length}`);
            console.log(`✅ Success rate: ${((processedCount - failedKecamatan.length) / processedCount * 100).toFixed(1)}%`);
            console.log(`📊 Average kelurahan per kecamatan: ${avgKelurahanPerKecamatan.toFixed(1)}`);
            console.log(`⚡ Average processing time per kecamatan: ${(totalTime/processedCount).toFixed(1)}s`);
            
            if (failedKecamatan.length > 0) {
                console.log(`\n❌ --- FAILED KECAMATAN (${failedKecamatan.length}) ---`);
                failedKecamatan.forEach((failed, index) => {
                    console.log(`${index + 1}. ${failed.name} (${failed.id}): ${failed.error}`);
                });
                console.log('\n💡 Tip: Re-run the endpoint to retry failed kecamatan');
            }
            
            console.log('==============================================');

            // Success validation
            if (totalKelurahanInserted >= 75000) {
                console.log('🎯 SUCCESS: Retrieved expected number of kelurahan records!');
            } else if (totalKelurahanInserted >= 60000) {
                console.log('⚠️  WARNING: Lower than expected kelurahan count. Some kecamatan might have failed.');
            } else {
                console.log('❌ ERROR: Significantly lower kelurahan count. Check failed kecamatan list.');
            }

        } catch (error) {
            console.error('💥 Fatal error in grabDataKelurahan:', error);
            
            if (!res.headersSent) {
                return res.status(500).json({
                    status: 500,
                    message: 'Fatal error during kelurahan data grabbing',
                    error: error.message,
                    data: {
                        processed_kecamatan: processedCount,
                        kelurahan_inserted: totalKelurahanInserted,
                        failed_kecamatan: failedKecamatan.length,
                        api_calls_made: totalApiCalls
                    }
                });
            }
        }
    },

    /**
     * @swagger
     * /api/users:
     *   get:
     *     summary: Get all users with pagination, filtering, sorting, and search (Admin only)
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
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
     *           default: 10
     *         description: Number of items per page
     *         example: 10
     *       - in: query
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [role, gender]
     *         description: Sort by field
     *         example: role
     *       - in: query
     *         name: sort_order
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: asc
     *         description: Sort order
     *         example: desc
     *       - in: query
     *         name: email
     *         schema:
     *           type: string
     *         description: Filter by email
     *         example: john@example.com
     *       - in: query
     *         name: phone_no
     *         schema:
     *           type: string
     *         description: Filter by phone number
     *         example: "+1234567890"
     *       - in: query
     *         name: date_from
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter created_at from date (YYYY-MM-DD)
     *         example: "2023-01-01"
     *       - in: query
     *         name: date_to
     *         schema:
     *           type: string
     *           format: date
     *         description: Filter created_at to date (YYYY-MM-DD)
     *         example: "2023-12-31"
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search across all fields (username, email, full_name, phone, address)
     *         example: "john"
     *     responses:
     *       200:
     *         description: Users retrieved successfully
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
     *                   properties:
     *                     users:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/User'
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         current_page:
     *                           type: integer
     *                         per_page:
     *                           type: integer
     *                         total:
     *                           type: integer
     *                         total_pages:
     *                           type: integer
     *                         has_next:
     *                           type: boolean
     *                         has_prev:
     *                           type: boolean
     *                     filters:
     *                       type: object
     *                       description: Applied filters
     *       400:
     *         description: Bad request - invalid parameters
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Admin access required
     *       500:
     *         description: Internal server error
     */
    getAllUsers: async (req, res) => {
        try {
            // Check if user is admin
            const decryptedUserId = decryptId(req.user.id);
            const adminCheck = await knex('admins')
                .where('user_id', decryptedUserId)
                .whereNull('deleted_at')
                .first();

            if (!adminCheck) {
                return res.status(403).json({
                    status: 403,
                    message: 'Access denied. Admin privileges required.',
                    data: null
                });
            }

            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Sorting parameters
            const sort_by = req.query.sort_by;
            const sort_order = req.query.sort_order || 'asc';

            // Filter parameters
            const email = req.query.email;
            const phone_no = req.query.phone_no;
            const date_from = req.query.date_from;
            const date_to = req.query.date_to;
            const search = req.query.search;

            // Validate pagination parameters
            if (page < 1) {
                return res.status(400).json({
                    status: 400,
                    message: 'Page must be greater than 0',
                    data: null
                });
            }

            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    status: 400,
                    message: 'Limit must be between 1 and 100',
                    data: null
                });
            }

            // Validate sort parameters
            const validSortFields = ['role', 'gender'];
            const validSortOrders = ['asc', 'desc'];

            if (sort_by && !validSortFields.includes(sort_by)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid sort_by field. Must be: role, gender',
                    data: null
                });
            }

            if (!validSortOrders.includes(sort_order)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid sort_order. Must be: asc, desc',
                    data: null
                });
            }

            // Build base query
            let baseQuery = knex('users')
                .whereNull('deleted_at');

            // Apply filters
            if (email) {
                baseQuery = baseQuery.where('email', 'ilike', `%${email}%`);
            }

            if (phone_no) {
                baseQuery = baseQuery.where('phone', 'ilike', `%${phone_no}%`);
            }

            // Date range filter
            if (date_from || date_to) {
                if (date_from && date_to) {
                    baseQuery = baseQuery.whereBetween('created_at', [date_from, date_to + ' 23:59:59']);
                } else if (date_from) {
                    baseQuery = baseQuery.where('created_at', '>=', date_from);
                } else if (date_to) {
                    baseQuery = baseQuery.where('created_at', '<=', date_to + ' 23:59:59');
                }
            }

            // Search across multiple fields
            if (search) {
                baseQuery = baseQuery.where(function() {
                    this.where('username', 'ilike', `%${search}%`)
                        .orWhere('email', 'ilike', `%${search}%`)
                        .orWhere('full_name', 'ilike', `%${search}%`)
                        .orWhere('phone', 'ilike', `%${search}%`)
                        .orWhere('address', 'ilike', `%${search}%`);
                });
            }

            // Get total count
            const totalCount = await baseQuery.clone()
                .count('id as count')
                .first();

            const total = parseInt(totalCount.count);
            const totalPages = Math.ceil(total / limit);

            // Apply sorting and pagination
            let usersQuery = baseQuery.clone()
                .select('id', 'username', 'email', 'full_name', 'phone', 'address', 'role', 'created_at', 'updated_at')
                .orderBy('id', 'desc'); // Default order by id desc

            // Apply custom sorting if specified
            if (sort_by) {
                usersQuery = usersQuery.orderBy(sort_by, sort_order);
            }

            const usersData = await usersQuery
                .limit(limit)
                .offset(offset);

            // Encrypt user IDs
            const users = usersData.map(user => ({
                ...user,
                id: encryptId(user.id)
            }));

            const pagination = {
                current_page: page,
                per_page: limit,
                total: total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1
            };

            // Applied filters for response
            const appliedFilters = {
                sort_by: sort_by || null,
                sort_order: sort_order,
                email: email || null,
                phone_no: phone_no || null,
                date_from: date_from || null,
                date_to: date_to || null,
                search: search || null
            };

            res.status(200).json({
                status: 200,
                message: 'Users retrieved successfully',
                data: {
                    users,
                    pagination,
                    filters: appliedFilters
                }
            });

        } catch (err) {
            console.error('getAllUsers error:', err);
            
            // Handle decryption errors specifically
            if (err.message && err.message.includes('decrypt')) {
                return res.status(401).json({
                    status: 401,
                    message: 'Invalid authentication token',
                    data: null
                });
            }

            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },
};