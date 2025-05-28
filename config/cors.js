// config/cors.js
function configureCors(allowedOrigins) {
    return {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
          const msg = `The CORS policy for this site does not allow access from the specified Origin. ${allowedOrigins}`;
          return callback(new Error(msg), false);
        }
        return callback(null, origin);
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-password",
        "x-username",
      ],
      credentials: true,
    };
}
  
module.exports = { configureCors };
  