const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  placeOrder,
  getOrdersByRole,updateOrderStatus
} = require("../controllers/orderController");

router.post("/", auth,authorize(["admin", "user"]), placeOrder);
router.get("/", auth,authorize(["admin", "user"]), getOrdersByRole);
router.put("/:orderId/status", auth, authorize("admin"), updateOrderStatus);
module.exports = router;
