// middlewares/payment.js
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { generateRSASignature, baseURLPaymentGateway } = require('../models/utils.js');

// === Konfigurasi ===
const WINPAY_MERCHANT_CODE = process.env.WINPAY_MERCHANT_CODE;
const WINPAY_PRIVATE_KEY_PATH = path.resolve(__dirname, '../certs/winpay-private-key.pem');
const WINPAY_API_URL = baseURLPaymentGateway(process.env.RECENT_GATEWAY);
const WINPAY_PUBLIC_KEY_PATH = path.resolve(__dirname, '../certs/winpay-public-key.pem');

// panduan
// Channel Code	    Institusi	                One Off (c)	    Open Recurring (o)	    Close Recurring (r)
// BRI	            Bank Rakyat Indonesia	    ✔️	            ✔️	                     ✔️
// BNI	            Bank Negara Indonesia	    ✔️	            ❌	                    ❌
// MANDIRI	        Bank Mandiri	            ✔️	            ❌	                    ❌
// PERMATA	        Bank Permata	            ✔️	            ✔️	                     ✔️
// BSI	            Bank Syariah Indonesia	    ✔️	            ✔️	                     ✔️
// MUAMALAT	        Bank Muamalat	            ✔️	            ✔️	                     ✔️
// BCA	            Bank Central ASIA	        ✔️	            ✔️	                     ✔️
// CIMB	            Bank CIMB NIAGA	            ✔️	            ✔️	                     ✔️
// SINARMAS	        Bank Sinarmas	            ✔️	            ✔️	                     ✔️
// BNC	Bank        Neo Commerce	            ✔️	            ✔️	                     ✔️
// INDOMARET	    Indomaret	                ✔️	            ❌	                    ❌ 
// ALFAMART	        Alfamart	                ✔️	            ❌	                    ❌

// === Virtual Account (has include retail merchant) ===
// Service ini digunakan untuk membuat akun virtual (VA) baru.
async function createVirtualAccountPayment(data, timestamp, method_channel) {
    /*
        Sample Payload
        {
            "customerNo": "000003212",
            "virtualAccountName": "Chus Pandi",
            "trxId": "INV-000000023212x2221",
            "totalAmount": {
                "value": "25000.00",
                "currency": "IDR"
            },
            "virtualAccountTrxType": "c",
            "expiredDate": "2023-09-05T19:30:14+07:00",
            "additionalInfo": {
                "channel": "CIMB"
            }
        }

        Sample Response
        {
            "responseCode": "2002700",
            "responseMessage": "Success",
            "virtualAccountData": {
                "partnerServiceId": "   22691",
                "customerNo": "41693898987",
                "virtualAccountNo": "   2269141693898987",
                "virtualAccountName": "Chus Pandi",
                "trxId": "INV-000000023212x2221",
                "totalAmount": {
                "value": "25000.00",
                "currency": "IDR"
                },
                "virtualAccountTrxType": "c",
                "expiredDate": "2023-09-05T19:30:14+07:00",
                "additionalInfo": {
                "channel": "CIMB",
                "contractId": "cia80bff69-1073-4811-b1e1-13b738784d8b"
                }
            }
        }
    */
    const endpoint = '/transfer-va/create-va';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
// Service ini digunakan untuk mengecek status virtual akun aktif / tidak.
async function inquiryVirtualAccountPayment(data, timestamp, method_channel) {
    /*
        Sample Payload
        {
            "responseCode": "2003000",
            "responseMessage": "Success",
            "virtualAccountData": {
                "virtualAccountNo": "2269186000003212",
                "virtualAccountName": "Mas Nchus",
                "trxId": "INV-000000023212x22",
                "totalAmount": {
                "value": "25000.00",
                "currency": "IDR"
                },
                "expiredDate": "2023-09-01T19:30:14+00:00",
                "additionalInfo": {
                "channel": "CIMB",
                "contractId": "ci302a21c9-bb4b-40c5-880d-e99691ed0af9"
                }
            }
        }
        
        Sample Response
        {
            "responseCode": "2003000",
            "responseMessage": "Success",
            "virtualAccountData": {
                "virtualAccountNo": "2269186000003212",
                "virtualAccountName": "Mas Nchus",
                "trxId": "INV-000000023212x22",
                "totalAmount": {
                "value": "25000.00",
                "currency": "IDR"
                },
                "expiredDate": "2023-09-01T19:30:14+00:00",
                "additionalInfo": {
                "channel": "CIMB",
                "contractId": "ci302a21c9-bb4b-40c5-880d-e99691ed0af9"
                }
            }
        }
        
        List Response:
        Kode Respon	    Pesan Respon	                        Deskripsi
        2003000	        Success	
        4003000	        Invalid response from biller	        Cek responseMessage untuk detail errornya
        4003001	        Invalid field format { field name }	
        4003002	        Invalid mandatory field {field name}	
        4013000	        Invalid signature	                    X-Signature salah
        4043001	        Transaction tidak ada	                trxId dan contractId tidak ditemukan
        4043016	        Partner tidak ada	                    X-Partner-ID tidak terdaftar
        4093000	        Cannot use same                         X-EXTERNAL-ID in same day	X-External-ID sudah pernah digunakan di hari yang sama
        4093001	        Duplicate trxId	                        trxId sudah pernah digunakan
        5003002	        reqbill tidak ada	                    contractId tidak ditemukan
    */
    const endpoint = '/transfer-va/inquiry-va';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
};
// Layanan ini digunakan untuk memeriksa status transaksi virtual akun
async function inquirystatusVirtualAccountPayment(data, timestamp, method_channel) {
    /*
        Sample Payload
        {
            "virtualAccountNo": "   2269141708949044",
            "additionalInfo": {
                "contractId": "ciaf1b982a-9d06-4e27-ba39-a6aefd9e813d",
                "channel": "CIMB",
                "trxId": "xxxxxxxxxxx13"
            }
        }
        
        List Response:
        Kode Respon	    Pesan Respon	                        Deskripsi
        2002600	        Success	
        4002600	        Invalid response from biller	        Cek responseMessage untuk detail error
        4002601	        Invalid field format { field name }	
        4002602	        Invalid mandatory field {field name}	
        4012600	        Invalid signature	                    X-Signature salah
        4042601	        Transaction tidak ada	                trxId dan contractId tidak ada
        4042616	        Partner tidak ada	                    X-Partner-ID tidak terdaftar
        4092600	        Cannot use same                         X-EXTERNAL-ID in same day	X-External-ID sudah digunakan pada hari yang sama
        4092601	        Duplicate trxId	                        trxId sudah digunakan pada hari yang sama ...
        5002602	        reqbill tidak ada	                    contractId tidak ada
    */
    const endpoint = '/transfer-va/status';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function cancelVirtualAccountPayment(data, timestamp, method_channel) {
    /*
        Sample Payload
        {
            "virtualAccountNo": "   2269131710748503",
            "trxId": "XINV-000000170104",
            "additionalInfo": {
                "contractId": "ci067a0336-4ddf-4001-9cef-3eb107c331f4",
                "channel": "CIMB"
            }
        }
        
        Sample Response
        {
            "responseCode": "2003100",
            "responseMessage": "Success",
            "virtualAccountData": {
                "trxId": "xxxxxxxxxxx20"
            },
            "additionalInfo": {
                "contractId": "si4390d6cb-5e9f-41fb-bfa3-51f6e7c9e4b4",
                "channel": "BSI"
            }
        }
    */
    const endpoint = '/transfer-va/delete-va';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function callbackVirtualAccountPayment(data, timestamp, method_channel){
    const endpoint = '/transfer-va/payment';
    
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
}

async function createQRISPayment(data, timestamp) {
    const endpoint = '/qr/qr-mpm-generate';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'QRIS',
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function statusQRISPayment(data, timestamp) {
    const endpoint = '/qr/qr-mpm-query';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'QRIS',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function cancelQRISPayment(data, timestamp) {
    const endpoint = '/qr/qr-mpm-cancel';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);
  
    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'QRIS',
    };
  
    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function refundQRISPayment(data, timestamp) {
    const endpoint = '/qr/qr-mpm-refund';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'QRIS',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
};
async function callbackQRISPayment(data, timestamp) {
    const endpoint = '/qr/qr-mpm-notify';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'QRIS',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
};

// === eWallet ===
/*
    Kode Channel	Institusi
    SC	            Speedcash
    OVO	            OVO
    DANA	        DANA
    SPAY	        ShopeePay
*/
async function createEWalletPayment(data, timestamp, method_channel) {
    const endpoint = '/debit/payment-host-to-host';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function statusEWalletPayment(data, timestamp, method_channel) {
    const endpoint = '/debit/status';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function cancelEWalletPayment(data, timestamp, method_channel) {
    const endpoint = '/debit/cancel';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function callbackEWalletPayment(data, timestamp, method_channel) {
    const endpoint = '/debit/notify';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': method_channel,
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}


// === Credit Card ===
async function createCreditCardPayment(data, timestamp) {
    const endpoint = '/debit/payment-host-to-host';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'CC',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function statusCreditCardPayment(data, timestamp) {
    const endpoint = '/debit/status';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'CC',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function cancelCreditCardPayment(data, timestamp) {
    const endpoint = '/debit/cancel';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'CC',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}
async function callbackCreditCardPayment(data, timestamp) {
    const endpoint = '/debit/notify';
    const url = `${WINPAY_API_URL}${endpoint}`;
    const signature = generateRSASignature('POST', endpoint, data, timestamp);

    const headers = {
        'Content-Type': 'application/json',
        'X-SIGNATURE': signature,
        'X-TIMESTAMP': timestamp,
        'X-PARTNER-ID': WINPAY_MERCHANT_CODE,
        'X-EXTERNAL-ID': timestamp,
        'CHANNEL-ID': 'CC',
    };

    const response = await axios.post(url, data, { headers });
    return response.data;
}

// === Callback Signature ===
function validateCallbackSignature(req, res, next) {
  const signature = req.headers['signature'];
  const timestamp = req.headers['timestamp'];
  const bodyString = JSON.stringify(req.body);
  const hashedBody = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  const stringToVerify = `POST:/payment/callback:${hashedBody}:${timestamp}`;

  const publicKey = fs.readFileSync(WINPAY_PUBLIC_KEY_PATH);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(stringToVerify);

  const isValid = verifier.verify(publicKey, signature, 'base64');
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
}
  
module.exports = {
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

  validateCallbackSignature,
};
