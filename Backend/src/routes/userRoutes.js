const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, refreshToken } = require("../controllers/userController");
const auth = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);

// protected route example
router.post("/logout", auth, logoutUser);

module.exports = router;
