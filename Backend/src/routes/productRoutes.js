const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
//const upload = require("../middleware/upload");
const authorize = require("../middleware/authorize");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImages
} = require("../controllers/productController");

// CRUD
router.post("/", auth, authorize("user"), createProduct);//upload.array("images", 10)
router.get("/",auth, getProducts);
router.get("/:id", auth, getProductById);
router.put("/:id", auth,authorize("user"), updateProduct);
router.delete("/:id", auth,authorize("user"), deleteProduct);

// Multiple image upload
router.post("/:productId/images", auth, uploadProductImages);//upload.array("images", 10)

module.exports = router;
