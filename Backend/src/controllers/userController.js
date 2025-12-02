const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1️⃣ Validate fields
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required"
            });
        }
        // 2️⃣ Check if user exists
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid email"
            });
        }
        const user = users[0];
        // 3️⃣ Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                status: "error",
                message: "Incorrect password"
            });
        }
        // 4️⃣ Create Access Token (includes role)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "60m" }
        );
        
        // 5️⃣ Create Refresh Token
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );
        // 6️⃣ Remove old refresh tokens
        await db.query(
            "DELETE FROM refresh_tokens WHERE user_id = ?",
            [user.id]
        );

        // 7️⃣ Store new refresh token
        await db.query(
            "INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)",
            [user.id, refreshToken]
        );
        // 8️⃣ Success response
        return res.json({
            status: "success",
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong",
            error: error.message
        });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                status: "error",
                message: "Refresh token missing"
            });
        }
        // 1️⃣ Check if token is in DB
        const [rows] = await db.query(
            "SELECT * FROM refresh_tokens WHERE token = ?",
            [refreshToken]
        );
        if (rows.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "Invalid refresh token"
            });
        }
        // 2️⃣ Verify JWT
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, user) => {
                if (err) {
                    return res.status(403).json({
                        status: "error",
                        message: "Invalid or expired refresh token"
                    });
                }
                // 3️⃣ Generate new access token
                const newAccessToken = jwt.sign(
                    { id: user.id },
                    process.env.JWT_SECRET,
                    { expiresIn: "15m" }
                );
                return res.json({
                    status: "success",
                    message: "Token refreshed",
                    accessToken: newAccessToken
                });
            }
        );

    } catch (error) {
        console.error("Refresh Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Server error",
            error: error.message
        });
    }
};
exports.logoutUser = async (req, res) => {
    try {
        const token = req.token;      // Access token from middleware
        const decoded = req.user;     // Payload from middleware
        const expiresAt = new Date(decoded.exp * 1000); // JWT expiry time
        // 1️⃣ Add access token to blacklist
        await db.query(
            "INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)",
            [token, expiresAt]
        );
        // 2️⃣ Remove refresh token from DB
        await db.query(
            "DELETE FROM refresh_tokens WHERE user_id = ?",
            [decoded.id]
        );
        return res.json({
            status: "success",
            message: "Logout successful"
        });

    } catch (err) {
        console.error("Logout Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error",
            error: err.message
        });
    }
};
// userController.js

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required"
            });
        }
        
        // 1. CORRECTED: Call .query() directly on the promise-enabled 'db' pool
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "Email already exists"
            });
        }
        
        const hashed = await bcrypt.hash(password, 10);
        
        // 2. CORRECTED: Call .query() directly on the promise-enabled 'db' pool
        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
            [name, email, hashed]
        );
        
        return res.json({
            status: "success",
            message: "User registered successfully",
        });

    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error",
        });
    }
};


