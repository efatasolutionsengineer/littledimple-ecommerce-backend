const dayjs = require('dayjs');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcrypt');
const knex = require('../db/knex');

module.exports = {
    generateRSASignature(httpMethod, endpointUrl, body, timestamp) {
        const hashedBody = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').toLowerCase();
        const stringToSign = `${httpMethod}:${endpointUrl}:${hashedBody}:${timestamp}`;
    
        const privateKey = fs.readFileSync(WINPAY_PRIVATE_KEY_PATH);
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(stringToSign);
        return signer.sign(privateKey, 'base64');
    },
  
    getTimestamp() {
        const options = { timeZone: 'Asia/Jakarta', hour12: false };
        const dateString = new Date().toLocaleString('sv-SE', options);
        return dateString.replace(' ', 'T') + '+07:00';
    },

    generateExpiredDate(plustimeInMinutes) {
        const now = new Date();
      
        // Tambahkan waktu dalam menit
        const futureTime = new Date(now.getTime() + plustimeInMinutes * 60000);
      
        // Format ISO string dengan timezone offset +07:00
        const offset = 7 * 60; // Offset dalam menit untuk +07:00
        const tzOffsetMs = offset * 60 * 1000;
        const localTime = new Date(futureTime.getTime() + futureTime.getTimezoneOffset() * 60000 + tzOffsetMs);
      
        const pad = (n) => n.toString().padStart(2, '0');
      
        const formatted = `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}T${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}+07:00`;
      
        return formatted;
    },

    formattedPrice(price) {
        return price.toFixed(2);
    },

    getMerchantPaymentMethods(gateway, channel_code) {
        const listMerchant = [
            { gateway: "winpay", code: "BRI", institution: "Bank Rakyat Indonesia" },
            { gateway: "winpay", code: "BNI", institution: "Bank Negara Indonesia" },
            { gateway: "winpay", code: "MANDIRI", institution: "Bank Mandiri" },
            { gateway: "winpay", code: "PERMATA", institution: "Bank Permata" },
            { gateway: "winpay", code: "BSI", institution: "Bank Syariah Indonesia" },
            { gateway: "winpay", code: "MUAMALAT", institution: "Bank Muamalat" },
            { gateway: "winpay", code: "BCA", institution: "Bank Central ASIA" },
            { gateway: "winpay", code: "CIMB", institution: "Bank CIMB NIAGA" },
            { gateway: "winpay", code: "SINARMAS", institution: "Bank Sinarmas" },
            { gateway: "winpay", code: "BNC", institution: "Bank Neo Commerce" },
            { gateway: "winpay", code: "INDOMARET", institution: "Indomaret" },
            { gateway: "winpay", code: "ALFAMART", institution: "Alfamart" },
            { gateway: "winpay", code: "SC", institution: "Speedcash" },
            { gateway: "winpay", code: "OVO", institution: "OVO" },
            { gateway: "winpay", code: "DANA", institution: "DANA" },
            { gateway: "winpay", code: "SPAY", institution: "ShopeePay" }
        ];
    
        return listMerchant.find(item => item.gateway === gateway && item.code === channel_code);
    }, 

    baseURLPaymentGateway(gateway) {
        let envMode = process.env.NODE_ENV;
    
        const listBaseUrl = [
            {
                gateway: "winpay",
                url_prod: "https://snap.winpay.id",
                url_sandbox: "https://sandbox-api.bmstaging.id/snap"
            }
        ];
    
        const selectedGateway = listBaseUrl.find(item => item.gateway === gateway);
    
        if (!selectedGateway) return null; // optional: handle if gateway not found
    
        if (envMode === "dev") {
            return selectedGateway.url_sandbox;
        } else {
            return selectedGateway.url_prod;
        }
    },

    getSubMerchantID() {
        return process.env.SUB_MERCHANT_ID;
    },

    generateInvoiceNumber(){
        const date = new Date();
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const timeStamp = Math.floor(date.getTime() / 1000);
    
        const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
        const randomPart = Array.from({ length: 6 }, () =>
            allowedChars.charAt(Math.floor(Math.random() * allowedChars.length))
        ).join('');
    
        return `INV_${yy}${mm}_${randomPart}-${timeStamp}`;
    },
    
    async isValidCoupon(code) {
        try {
            const today = dayjs().format('YYYY-MM-DD');
    
            const rows = await knex('coupons')
            .where('code', code)
            .andWhere('status', 'active')
            .whereNull('deleted_at')
            .andWhere(builder => {
                builder
                .whereNull('valid_from')
                .orWhere('valid_from', '<=', today);
            })
            .andWhere(builder => {
                builder
                .whereNull('valid_until')
                .orWhere('valid_until', '>=', today);
            })
            .first(); // Sama seperti LIMIT 1

    
            if (rows.length === 0) {
                return {
                    valid: false,
                    message: 'Kupon tidak ditemukan atau sudah tidak aktif',
                };
            }
    
            const coupon = rows[0];
            if(coupon.usage_count >= coupon.usage_limit){
                return {
                    valid: false,
                    message: 'Kupon sudah mencapai batas penggunaan',
                };
            }else{
                return {
                    valid: true,
                    coupon: {
                        id: coupon.id,
                        code: coupon.code,
                        discount_percentage: coupon.discount_percentage,
                        valid_from: coupon.valid_from,
                        valid_until: coupon.valid_until,
                    }
                };
            }
            
        } catch (error) {
            console.error('Error checking coupon:', error);
            return {
                valid: false,
                message: 'Terjadi kesalahan saat memvalidasi kupon',
            };
        }
    },

    async isValidVoucher(code, userId = null) {
        try {
            const today = dayjs().format('YYYY-MM-DD');
        
            let voucher = null;
        
            // 1. Cek voucher umum (user_id IS NULL)
            const generalResult = await knex('vouchers')
            .where('code', code)
            .andWhere('status', 'active')
            .whereNull('deleted_at')
            .andWhere('is_used', false)
            .andWhere(function () {
                this.whereNull('valid_from').orWhere('valid_from', '<=', today);
            })
            .andWhere(function () {
                this.whereNull('valid_until').orWhere('valid_until', '>=', today);
            })
            .andWhereNull('user_id')
            .first(); // LIMIT 1

        
            if (generalResult.length > 0) {
              voucher = generalResult[0];
            }
        
            // 2. Jika tidak ditemukan, cek voucher personal (user_id = ?)
            if (!voucher && userId) {
                const personalResult = await knex('vouchers')
                .where('code', code)
                .andWhere('status', 'active')
                .andWhereNull('deleted_at')
                .andWhere('is_used', false)
                .andWhere(function () {
                  this.whereNull('valid_from').orWhere('valid_from', '<=', today);
                })
                .andWhere(function () {
                  this.whereNull('valid_until').orWhere('valid_until', '>=', today);
                })
                .andWhere('user_id', userId)
                .first(); // LIMIT 1              
        
                if (personalResult.length > 0) {
                    voucher = personalResult[0];
                }
            }
        
            if (!voucher) {
              return res.status(400).json({
                valid: false,
                message: 'Voucher tidak ditemukan, sudah digunakan, atau tidak berlaku untuk user ini',
              });
            }
        
            return res.json({
              valid: true,
              voucher: {
                id: voucher.id,
                code: voucher.code,
                discount_amount: parseFloat(voucher.discount_amount),
                min_purchase: parseFloat(voucher.min_purchase),
                valid_from: voucher.valid_from,
                valid_until: voucher.valid_until,
                user_id: voucher.user_id,
              }
            });
        
        } catch (error) {
            console.error('Error validating voucher:', error);
            return res.status(500).json({
              valid: false,
              message: 'Terjadi kesalahan saat memvalidasi voucher',
            });
        }
    },

    async checkProductDiscount(productId) {
        try {
          const today = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
          let product = await knex('products')
            .select('id', 'name', 'price', 'discount_percentage', 'discount_expires_at')
            .where('id', productId)
            .whereNull('deleted_at')
            .first(); // LIMIT 1

      
          if (!product) {
            return {
              valid: false,
              message: 'Produk tidak ditemukan',
            };
          }
          
    
          // Encrypt warranty IDs
          product = {
              ...product,
              discount_percentage: parseInt(product.discount_percentage),
              price: parseInt(product.price)
          };
          
          // console.log(`product: ${JSON.stringify(product)}`);
          const isDiscountActive =
            product.discount_percentage &&
            product.discount_percentage > 0 &&
            product.discount_expires_at &&
            dayjs(product.discount_expires_at).isAfter(today);

          // console.log(`isDiscountActive: ${isDiscountActive ? `true` : `false`}`);
          // console.log(`parseFloat(product.price): ${parseFloat(product.price)}`);
          
          const final_object = {
            valid: true,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              discount_percentage: isDiscountActive ? product.discount_percentage : 0,
              discount_expires_at: product.discount_expires_at,
              is_discount_active: isDiscountActive ? true : false,
              final_price: isDiscountActive
                ? parseFloat((product.price * (1 - product.discount_percentage / 100)).toFixed(2))
                : parseFloat(product.price),
            },
          };
          
          // console.log(`final_object: ${JSON.stringify(final_object)}`);
          return final_object;
        } catch (error) {
          console.error('Error checking product discount:', error);
          return {
            valid: false,
            message: 'Terjadi kesalahan saat mengecek diskon produk',
          };
        }
    },

    async isProductDiscountActive(productId) {
        try {
          const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
          const rows = await knex('products')
            .select('discount_percentage', 'discount_expires_at')
            .where('id', productId)
            .whereNull('deleted_at')
            .first(); // Sama seperti LIMIT 1

      
          if (rows.length === 0) {
            return {
              valid: false,
              message: 'Produk tidak ditemukan',
            };
          }
      
          const { discount_percentage, discount_expires_at } = rows[0];
      
          const isActive =
            discount_percentage &&
            discount_percentage > 0 &&
            discount_expires_at &&
            dayjs(discount_expires_at).isAfter(now);
      
          return {
            valid: true,
            is_discount_active: isActive
          };
        } catch (error) {
          console.error('Error checking discount status:', error);
          return {
            valid: false,
            message: 'Gagal memeriksa status diskon'
          };
        }
    },

    formatRupiah(value) {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(value);
    },

    async registerUser({
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
        subdistrict_name
    }) {
        try {
            // Check if the user already exists
            const existingUser = await knex('users').where({ email }).first();
            if (existingUser) {
                return { status: 400, message: 'Email sudah terdaftar' };
            }
    
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
    
            // Insert new user into the database
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
                    is_verified_email: false,
                    is_verified_phone: null,
                })
                .returning(['id', 'username', 'email']);
    
            // Return success response
            return { status: 201, user };
        } catch (err) {
            // Return error response
            return { status: 500, message: err.message };
        }
    },
}