const db = require('../config/db');

exports.createProduct = async (req, res) => {
    try {
        const { name, price, description, stock } = req.body;
        // Validate required fields
        if (!name || !price || !description || !stock) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required"
            });
        }
        // Insert product
        const insertProductSQL = `
            INSERT INTO products (name, price, description, stock)
            VALUES (?, ?, ?, ?)
        `;
        const [productResult] = await db.query(
            insertProductSQL,
            [name, price, description, stock]
        );
        const productId = productResult.insertId;
        // If no images uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(201).json({
                status: "success",
                message: "Product created successfully",
                productId
            });
        }
        // // Upload images to S3 + Store URLs in DB
        // let imageUrls = [];
        // for (const file of req.files) {
        //     const imageUrl = file.location; // multer-s3 gives URL directly
        //     imageUrls.push(imageUrl);
        //     await db.query(
        //         "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
        //         [productId, imageUrl]
        //     );
        // }
        // // Success response
        // return res.status(201).json({
        //     status: "success",
        //     message: "Product created successfully with images",
        //     productId,
        //     images: imageUrls
        // });

    } catch (error) {
        console.error("Product Creation Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong while creating product",
            error: error.message
        });
    }
};

exports.getProducts = async (req, res) => {
    // const sql = `
    //     SELECT p.id, p.name, p.price, p.description, p.stock, 
    //            pi.image_url
    //     FROM products p
    //     LEFT JOIN product_images pi ON p.id = pi.product_id
    //     ORDER BY p.id DESC
    // `;
    const sql = `
        SELECT p.id, p.name, p.price, p.description, p.stock 
        FROM products p 
        ORDER BY p.id DESC
    `;

    try {
        const [rows] = await db.query(sql); 
        const products = {};
        rows.forEach(row => {
            if (!products[row.id]) {
                products[row.id] = {
                    id: row.id,
                    name: row.name,
                    price: row.price,
                    description: row.description,
                    stock: row.stock,
                };
            }
        });
        return res.json(Object.values(products)); 

    } catch (err) {
        console.error("Product Fetch Error:", err);
        return res.status(500).json({ status: "error", message: "Database error" });
    }
};

exports.getProductById = async (req, res) => {
    const id = req.params.id;
    const sql = `SELECT p.* FROM products p WHERE p.id = ? LIMIT 1`;
    try {
        const [result] = await db.query(sql, [id]); 
        if (result.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Product not found"
            });
        }
        const product = result[0];
        // const imageSql = `SELECT JSON_ARRAYAGG(image_url) AS images FROM product_images WHERE product_id = ?`;
        // const [imageResult] = await db.query(imageSql, [id]);
        // product.images = imageResult[0].images ? JSON.parse(imageResult[0].images) : [];
        // Success response
        return res.status(200).json({
            status: "success",
            message: "Product fetched successfully",
            product
        });

    } catch (err) {
        // Handle database or runtime errors
        console.error("Product Fetch Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Database error occurred",
            error: err.message
        });
    }
};

exports.updateProduct = async (req, res) => {
    const id = req.params.id;
    const { name, price, description, stock } = req.body;
    
    
    // --- SQL Query ---
    // Includes updated_at for tracking changes
    const sql = `
        UPDATE products 
        SET name = ?, price = ?, description = ?, stock = ? 
        WHERE id = ?
    `;
    try {
        const [result] = await db.query(
            sql,
            [name, price, description, stock, id] 
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Product not found or no changes were made"
            });
        }
        return res.json({
            status: "success",
            message: "Product updated successfully"
        });

    } catch (err) {
        console.error("Product Update Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Database error occurred",
            error: err.message
        });
    }
};


// Upload multiple images + save URLs
exports.uploadProductImages = async (req, res) => {
    const productId = req.params.productId;
    try {
        // 1️⃣ Validate product exists
        const [product] = await db.query(
            "SELECT id FROM products WHERE id = ?",
            [productId]
        );
        if (product.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Product not found"
            });
        }
        // 2️⃣ Check if images uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No images uploaded"
            });
        }
        // 3️⃣ Extract S3 URLs from multer-s3
        const urls = req.files.map(file => file.location);
        // 4️⃣ Insert into DB
        const values = urls.map(url => [productId, url]);
        const sql = "INSERT INTO product_images (product_id, image_url) VALUES ?";
        await db.query(sql, [values]);
        // 5️⃣ Success response
        return res.status(201).json({
            status: "success",
            message: "Images uploaded successfully",
            productId,
            images: urls
        });
    } catch (err) {
        console.error("Upload Product Images Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong while uploading images",
            error: err.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    const id = req.params.id;
    try {
        // 1️⃣ Check product exists
        const [product] = await db.query(
            "SELECT id FROM products WHERE id = ?",
            [id]
        );
        if (product.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Product not found"
            });
        }
        // 2️⃣ Delete product images from DB
        await db.query(
            "DELETE FROM product_images WHERE product_id = ?",
            [id]
        );
        // (optional) delete images from S3 also – I can add this if needed

        // 3️⃣ Delete product
        await db.query(
            "DELETE FROM products WHERE id = ?",
            [id]
        );
        return res.json({
            status: "success",
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error("Delete Product Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong",
            error: error.message
        });
    }
};


