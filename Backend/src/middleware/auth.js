// middleware/auth.js

const db = require('../config/db'); // The promise-based pool
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: "error",
                message: "Authorization header must be provided as 'Bearer <token>'"
            });
        }
        
        const token = authHeader.split(" ")[1];

        // 1. Check blacklist
        const [blacklisted] = await db.query(
            "SELECT id FROM token_blacklist WHERE token = ?", 
            [token]
        );

        if (blacklisted.length > 0) {
            return res.status(401).json({
                status: "error",
                message: "Token expired or logged out"
            });
        }

        // 2. Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach decoded user payload and the raw token to the request
        req.user = decoded; // contains id, email, role
        req.token = token;
        
        next();

    } catch (err) {
        let message = "Invalid or expired token";
        let status = 403;

        if (err.name === 'TokenExpiredError') {
            message = 'Token expired';
            status = 401; 
        } else if (err.name === 'JsonWebTokenError') {
            message = 'Invalid token signature';
        }
        
        console.error("Auth Middleware Error:", err.message);
        
        return res.status(status).json({
            status: "error",
            message: message
        });
    }
};