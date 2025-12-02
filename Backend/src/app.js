const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("./middleware/rateLimit");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// SECURITY HEADERS
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

// RATE LIMIT
app.use(rateLimit);   // ✅ FIXED

// PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

module.exports = app;
