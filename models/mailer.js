const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // atau gunakan provider lain
  port: 587,         // Change from 465 to 587
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (to, token) => {
  // Frontend must be: /verify-email
  const verificationUrl = `${process.env.APP_URL}/api/users/verify-email/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: '[Little Dimple] Verifikasi Email Anda',
    html: `<p>Klik link berikut untuk verifikasi email:</p>
           <a href="${verificationUrl}">${verificationUrl}</a>`
  };

  await transporter.sendMail(mailOptions);
};

// Send verification email
const sendPasswordResetEmail = (email, token) => {
  // Frontend must be: /reset-password
  const resetLink = `${process.env.APP_URL}/api/users/reset-password/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '[Little Dimple] Password Reset Request',
    text: `Click the following link to reset your password: ${resetLink}`,
  };

  return transporter.sendMail(mailOptions);
};

// const sendBillingEmail = (userEmail, invoiceNumber, totalPrice, paymentMethod, paymentDetails) => {
//   let paymentInstruction = '';
  
//   // Menentukan instruksi pembayaran sesuai metode
//   switch (paymentMethod) {
//       case 'VA':
//           // Mengirimkan nomor Virtual Account
//           paymentInstruction = `
//               Mohon lakukan pembayaran melalui Virtual Account kami.
//               Nomor Virtual Account: ${paymentDetails.virtualAccountNumber}
//               Total Pembayaran: Rp ${totalPrice}
//               Harap transfer sebelum batas waktu yang ditentukan.
//           `;
//           break;
      
//       case 'QRIS':
//           // Mengirimkan gambar QRIS
//           paymentInstruction = `
//               Mohon lakukan pembayaran menggunakan QRIS berikut:
//               <img src="${paymentDetails.qrisImageUrl}" alt="QRIS" />
//               Scan kode QR untuk melakukan pembayaran.
//           `;
//           break;
      
//       case 'EWALLET':
//           // Mengirimkan link pembayaran untuk E-Wallet
//           paymentInstruction = `
//               Silakan lakukan pembayaran menggunakan E-Wallet.
//               Anda dapat melakukan pembayaran melalui link berikut:
//               ${paymentDetails.paymentLink}
//               Total Pembayaran: Rp ${totalPrice}
//           `;
//           break;

//       case 'CC':
//           // Mengirimkan link pembayaran untuk kartu kredit
//           paymentInstruction = `
//               Silakan lakukan pembayaran dengan menggunakan kartu kredit melalui link berikut:
//               ${paymentDetails.paymentLink}
//               Total Pembayaran: Rp ${totalPrice}
//           `;
//           break;

//       default:
//           paymentInstruction = `Metode pembayaran tidak dikenali.`;
//           break;
//   }

//   // Menyusun konten email
//   const mailOptions = {
//       from: 'your-email@gmail.com',
//       to: userEmail,
//       subject: 'Tagihan Pesanan Anda',
//       html: `
//           <h3>Yth. Pelanggan,</h3>
//           <p>Terima kasih telah melakukan pemesanan dengan nomor invoice: <strong>${invoiceNumber}</strong>.</p>
//           <p>Total Tagihan: Rp ${totalPrice}</p>
//           <p>Harap lakukan pembayaran sesuai dengan metode pembayaran yang dipilih:</p>
//           <p>${paymentInstruction}</p>
//           <p>Jika Anda memiliki pertanyaan atau membutuhkan bantuan lebih lanjut, silakan hubungi kami.</p>
//           <p>Salam hormat,<br>Toko Anda</p>
//       `,
//   };

//   // Mengirim email
//   return transporter.sendMail(mailOptions);
// };

const sendReceiptEmail = (userEmail, invoiceNumber, paymentDetails) => {
  const mailOptions = {
      from: 'your-email@gmail.com',
      to: userEmail,
      subject: 'Bukti Pembayaran Pesanan Anda',
      text: `Yth. Pelanggan,

      Pembayaran untuk pesanan dengan nomor invoice: ${invoiceNumber} telah berhasil.

      Detail Pembayaran:
      Metode Pembayaran: ${paymentDetails.method}
      Nominal: Rp ${paymentDetails.amount}
      Tanggal Pembayaran: ${paymentDetails.date}

      Terima kasih atas pembelian Anda. Jika Anda memiliki pertanyaan, silakan hubungi kami.

      Salam hormat,
      Toko Anda`,
  };

  return transporter.sendMail(mailOptions);
};


/**
 * Send order confirmation email to customer
 * @param {Object} emailData - Email data containing order information
 * @param {string} emailData.email - Customer email
 * @param {string} emailData.invoice_number - Invoice number
 * @param {number} emailData.total_amount - Total amount
 * @param {string} emailData.payment_url - Payment URL
 * @param {Array} emailData.order_details - Array of order items
 */
const sendOrderConfirmationEmail = async (emailData) => {
    try {
        const {
            email,
            invoice_number,
            total_amount
        } = emailData;

        

        // Validate required fields
        if (!email || !invoice_number || !total_amount) {
            throw new Error('Missing required email data: email, invoice_number, or total_amount');
        }

        // Generate HTML template
        const htmlTemplate = generateOrderConfirmationTemplate(emailData);

        const mailOptions = {
            // from: `"${process.env.COMPANY_NAME || 'Little Dimple'}" <${process.env.EMAIL_USER}>`,
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Order Confirmation - ${invoice_number}`,
            html: htmlTemplate
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

/**
 * Generate HTML template for order confirmation
 * @param {Object} emailData - Email data
 * @returns {string} HTML template
 */
const generateOrderConfirmationTemplate = (emailData) => {
    const {
        invoice_number,
        total_amount,
        payment_url,
        order_details = []
    } = emailData;

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    };

    // Generate order items HTML
    const orderItemsHtml = order_details.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                    ${item.product_name || item.name || 'Product'}
                </div>
                <div style="font-size: 14px; color: #666;">
                    ${formatCurrency(item.price)} × ${item.quantity}
                </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
                ${formatCurrency(item.subtotal || (item.price * item.quantity))}
            </td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${invoice_number}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 300;">Order Confirmation</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your order!</p>
            </div>

            <!-- Order Summary -->
            <div style="padding: 30px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Order Summary</h2>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 600;">Invoice Number:</span>
                        <span style="color: #667eea; font-weight: 600; margin-left: 10px;">${invoice_number}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 600;">Order Date:</span>
                        <span style="margin-left: 10px;">${new Date().toLocaleDateString('id-ID', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                    <div>
                        <span style="font-weight: 600;">Total Amount:</span>
                        <span style="color: #28a745; font-weight: 700; font-size: 18px; margin-left: 10px;">${formatCurrency(total_amount)}</span>
                    </div>
                </div>

                <!-- Payment Instructions -->
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #1976d2; font-size: 18px;">Complete Your Payment</h3>
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                        Please complete your payment to process your order. Click the button below to proceed to the payment page.
                    </p>
                    ${payment_url ? `
                        <div style="text-align: center;">
                            <a href="${payment_url}" style="display: inline-block; background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                                Pay Now
                            </a>
                        </div>
                        <p style="margin: 15px 0 0 0; font-size: 12px; color: #999; text-align: center;">
                            Or copy this link: <br>
                            <a href="${payment_url}" style="color: #1976d2; word-break: break-all;">${payment_url}</a>
                        </p>
                    ` : `
                        <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
                            Payment link will be provided shortly.
                        </p>
                    `}
                </div>

                ${order_details.length > 0 ? `
                <!-- Order Items -->
                <div style="margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <thead>
                            <tr style="background: #667eea; color: white;">
                                <th style="padding: 15px; text-align: left; font-weight: 600;">Item</th>
                                <th style="padding: 15px; text-align: right; font-weight: 600;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderItemsHtml}
                            
                            <!-- Total -->
                            <tr style="background: #f8f9fa;">
                                <td style="padding: 15px; font-weight: 700; font-size: 16px;">Total</td>
                                <td style="padding: 15px; text-align: right; font-weight: 700; font-size: 18px; color: #28a745;">${formatCurrency(total_amount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- Important Notes -->
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">Important Notes:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px;">
                        <li>Please complete your payment within 24 hours to avoid order cancellation</li>
                        <li>Your order will be processed once payment is confirmed</li>
                        <li>You will receive a shipping notification with tracking details</li>
                        <li>Keep this email for your records</li>
                    </ul>
                </div>

                <!-- Contact Information -->
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Need Help?</h4>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">If you have any questions about your order, please contact us:</p>
                    <p style="margin: 0; color: #667eea; font-size: 14px;">
                        <strong>Email:</strong> ${process.env.SUPPORT_EMAIL || 'support@yourstore.com'}<br>
                        <strong>Phone:</strong> ${process.env.SUPPORT_PHONE || '+62-xxx-xxxx-xxxx'}
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px;">Thank you for shopping with us!</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.7;">
                    © ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Store'}. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmationEmail, sendReceiptEmail };
