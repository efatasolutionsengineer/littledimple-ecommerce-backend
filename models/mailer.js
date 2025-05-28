const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // atau gunakan provider lain
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (to, token) => {
  const verificationUrl = `${process.env.APP_URL}/api/users/verify-email/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Verifikasi Email Anda',
    html: `<p>Klik link berikut untuk verifikasi email:</p>
           <a href="${verificationUrl}">${verificationUrl}</a>`
  };

  await transporter.sendMail(mailOptions);
};

// Send verification email
const sendPasswordResetEmail = (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    text: `Click the following link to reset your password: ${resetLink}`,
  };

  return transporter.sendMail(mailOptions);
};

const sendBillingEmail = (userEmail, invoiceNumber, totalPrice, paymentMethod, paymentDetails) => {
  let paymentInstruction = '';
  
  // Menentukan instruksi pembayaran sesuai metode
  switch (paymentMethod) {
      case 'VA':
          // Mengirimkan nomor Virtual Account
          paymentInstruction = `
              Mohon lakukan pembayaran melalui Virtual Account kami.
              Nomor Virtual Account: ${paymentDetails.virtualAccountNumber}
              Total Pembayaran: Rp ${totalPrice}
              Harap transfer sebelum batas waktu yang ditentukan.
          `;
          break;
      
      case 'QRIS':
          // Mengirimkan gambar QRIS
          paymentInstruction = `
              Mohon lakukan pembayaran menggunakan QRIS berikut:
              <img src="${paymentDetails.qrisImageUrl}" alt="QRIS" />
              Scan kode QR untuk melakukan pembayaran.
          `;
          break;
      
      case 'EWALLET':
          // Mengirimkan link pembayaran untuk E-Wallet
          paymentInstruction = `
              Silakan lakukan pembayaran menggunakan E-Wallet.
              Anda dapat melakukan pembayaran melalui link berikut:
              ${paymentDetails.paymentLink}
              Total Pembayaran: Rp ${totalPrice}
          `;
          break;

      case 'CC':
          // Mengirimkan link pembayaran untuk kartu kredit
          paymentInstruction = `
              Silakan lakukan pembayaran dengan menggunakan kartu kredit melalui link berikut:
              ${paymentDetails.paymentLink}
              Total Pembayaran: Rp ${totalPrice}
          `;
          break;

      default:
          paymentInstruction = `Metode pembayaran tidak dikenali.`;
          break;
  }

  // Menyusun konten email
  const mailOptions = {
      from: 'your-email@gmail.com',
      to: userEmail,
      subject: 'Tagihan Pesanan Anda',
      html: `
          <h3>Yth. Pelanggan,</h3>
          <p>Terima kasih telah melakukan pemesanan dengan nomor invoice: <strong>${invoiceNumber}</strong>.</p>
          <p>Total Tagihan: Rp ${totalPrice}</p>
          <p>Harap lakukan pembayaran sesuai dengan metode pembayaran yang dipilih:</p>
          <p>${paymentInstruction}</p>
          <p>Jika Anda memiliki pertanyaan atau membutuhkan bantuan lebih lanjut, silakan hubungi kami.</p>
          <p>Salam hormat,<br>Toko Anda</p>
      `,
  };

  // Mengirim email
  return transporter.sendMail(mailOptions);
};


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


module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendBillingEmail, sendReceiptEmail };
