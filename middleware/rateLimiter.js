const rateLimit = require("express-rate-limit");

const createRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit each browser to 200 requests per windowMs
  keyGenerator: (req) => req.headers["user-agent"],
  message: {
    message: "Too many requests from this browser, please try again later",
  },
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { createRateLimiter };
