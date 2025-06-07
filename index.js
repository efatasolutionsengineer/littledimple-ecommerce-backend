require('dotenv').config();
const express = require('express');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const { initializeDb } = require("./db/knex");
const { configureCors } = require("./config/cors");
const { createRateLimiter } = require("./middleware/rateLimiter");

const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const productsRoutes = require('./routes/productsRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
// const shippingRoutes = require('./routes/shippingRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const blogPostRoutes = require('./routes/blogPostRoutes');
const reportRoutes = require('./routes/reportsRoutes');
const generalSettingsRoutes = require('./routes/generalSettingsRoutes');
const notLoginRoutes = require('./routes/notLoginRoutes');
const productStoreRoutes = require('./routes/productStoreRoutes');
const dimpleSquadRoutes = require('./routes/dimpleSquadRoutes');
const rajaongkirRoutes = require('./routes/rajaongkirRoutes');
const warrantyRoutes = require('./routes/warrantyRoutes');
const couponsRoutes = require('./routes/couponsRoutes');
const midtransRoutes = require('./routes/midtransRoutes');
const settingsRoutes = require('./routes/settingsRoute');
const galleryRoutes = require('./routes/galleryRoutes');
const mediaRoutes = require('./routes/mediaRoutes');



const { registerUser } = require('./models/utils');

// Configure CORS
const corsOptions = configureCors(process.env.CORS);

const app = express();

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
// const { encryptId } = require('./models/encryption');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
          title: 'E-Commerce API',
          version: '1.0.0',
          description: 'API documentation for the E-Commerce platform'
        },
        servers: [{ url: 'http://localhost:3300' }],
        components: {
          securitySchemes: {
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'token'
            }
          }
        },
        security: [
          {
            cookieAuth: []
          }
        ]
    },      
    apis: ['./controllers/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Serve OpenAPI JSON
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocs);
});

// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    customCss: `
      .swagger-ui .topbar .download-openapi-btn {
        margin-left: 15px;
        background-color: #007bff;
        border: none;
        color: white;
        padding: 6px 12px;
        font-size: 14px;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
    customJs: '/swagger-custom.js', // <== file eksternal
}));  
  

// Optional: Save to file on startup (useful for CI or documentation portals)
fs.writeFileSync(
  path.join(__dirname, 'openapi.json'),
  JSON.stringify(swaggerDocs, null, 2)
);

// Apply rate limiting
app.use(createRateLimiter);

app.use(express.json());
app.use(cookieParser());

// Configure CORS
app.use(cors(corsOptions));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
// app.use('/api/shipping', shippingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/blog-posts', blogPostRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/general-settings', generalSettingsRoutes);
app.use('/api/ld', notLoginRoutes);
app.use('/api/stores', productStoreRoutes);
app.use('/api/dimple-squad', dimpleSquadRoutes);
app.use('/api/rajaongkir', rajaongkirRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/midtrans', midtransRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/media', mediaRoutes);

// Serve static files for payment pages
// app.use('/payment', express.static('public/payment'));

// Or create specific routes
app.get('/payment/finish', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/payment/finish.html'));
});

app.get('/payment/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/payment/error.html'));
});

app.get('/payment/pending', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/payment/pending.html'));
});


// Example usage:
const newUser = {
    username: 'admin',
    email: 'admin@domain.com',
    password: 'admin1234',
    full_name: 'Admin',
    phone: '08123456789',
    address: '123 Main St',
    province_id: null,
    province_name: null,
    city_id: null,
    city_name: null,
    subdistrict_id: null,
    subdistrict_name: null
};

// registerUser(newUser).then(response => {
//     if (response.status === 201) {
//         console.log('User registered successfully:', response.user);
//     } else {
//         console.log('Error:', response.message);
//     }
// });


const PORT = process.env.PORT || 3300;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
