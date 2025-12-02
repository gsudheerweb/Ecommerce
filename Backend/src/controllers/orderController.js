const db = require("../config/db");

// exports.placeOrder = async (req, res) => {
//     const userId = req.user.id;
//     const { items, totalAmount } = req.body;

//     try {
//         if (!items || items.length === 0) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Order items cannot be empty"
//             });
//         }

//         if (!totalAmount || totalAmount <= 0) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Invalid totalAmount"
//             });
//         }
//         // 2️⃣ Check products exist and validate stock for display or future check
//         for (const item of items) {
//             const [product] = await db.promise().query(
//                 "SELECT id, stock FROM products WHERE id = ?",
//                 [item.product_id]
//             );

//             if (product.length === 0) {
//                 return res.status(404).json({
//                     status: "error",
//                     message: `Product not found: ${item.product_id}`
//                 });
//             }
//         }

//         // 3️⃣ Create order
//         const [orderResult] = await db.promise().query(
//             "INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
//             [userId, totalAmount]
//         );

//         const orderId = orderResult.insertId;

//         // 4️⃣ Insert items
//         const orderItems = items.map(i => [orderId, i.product_id, i.qty]);

//         await db.promise().query(
//             "INSERT INTO order_items (order_id, product_id, qty) VALUES ?",
//             [orderItems]
//         );

//         // 5️⃣ NO STOCK REDUCTION HERE

//         return res.status(201).json({
//             status: "success",
//             message: "Order placed successfully",
//             orderId
//         });

//     } catch (err) {
//         console.error("Place Order Error:", err);
//         return res.status(500).json({
//             status: "error",
//             message: "Something went wrong while placing order",
//             error: err.message
//         });
//     }
// };

exports.placeOrder = async (req, res) => {
    const userId = req.user.id;
    const { items, totalAmount } = req.body;
    let connection; 

    try {
        // Basic Validation (assuming totalAmount calculation is handled client-side/verified here)
        if (!items || items.length === 0 || !totalAmount || totalAmount <= 0) {
            return res.status(400).json({ status: "error", message: "Invalid order details" });
        }

        // 1. Acquire a dedicated connection and start transaction
        connection = await db.getConnection(); 
        await connection.beginTransaction(); 

        // 2. Validate Stock and Product Existence
        for (const item of items) {
            // Locking the product row (SELECT FOR UPDATE) is the safest way to prevent concurrent purchases
            // But for simplicity here, we'll use a standard SELECT.
            const [product] = await connection.query(
                "SELECT id, stock FROM products WHERE id = ?",
                [item.product_id]
            );

            if (product.length === 0) {
                await connection.rollback(); 
                return res.status(404).json({ status: "error", message: `Product not found: ${item.product_id}` });
            }

            if (product[0].stock < item.qty) {
                 await connection.rollback(); 
                 return res.status(400).json({ status: "error", message: `Insufficient stock for product: ${item.product_id}` });
            }
        }

        // 3. Insert Order Header
        const [orderResult] = await connection.query(
            "INSERT INTO orders (user_id, total_amount, status, created_at, updated_at) VALUES (?, ?, 'pending', NOW(), NOW())",
            [userId, totalAmount]
        );

        const orderId = orderResult.insertId;

        // 4. Prepare and Insert Order Items
        const orderItems = items.map(i => [orderId, i.product_id, i.qty]);

        // Note: The 'VALUES ?' syntax is common for batch insertion with mysql2.
        await connection.query(
            "INSERT INTO order_items (order_id, product_id, qty) VALUES ?",
            [orderItems]
        );

        // 5. Commit the transaction
        await connection.commit(); 
        connection.release(); 

        return res.status(201).json({
            status: "success",
            message: "Order placed successfully (Stock validation passed)",
            orderId
        });

    } catch (err) {
        // 6. Rollback on any error and release connection
        if (connection) {
            await connection.rollback(); 
            connection.release();
        }
        console.error("Place Order Transaction Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong while placing order.",
            error: err.message
        });
    }
};

// orderController.js (Refactored getMyOrders)
exports.getOrdersByRole = async (req, res) => {
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role; // Role is expected to be 'admin' or 'user'
    let sql;
    let values;

    // --- Base SQL Query ---
    // Joins orders (o) with users (u) to get the role, and joins order_items (oi) with products (p) to get item details.
    const baseSql = `
        SELECT
            o.id,
            o.total_amount,
            o.status,
            o.user_id,
            u.role AS user_role,
            o.created_at,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'product_id', oi.product_id,
                        'name', p.name,
                        'qty', oi.qty
                    )
                )
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id
            ) AS items
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
    `;

    // --- Conditional Filtering Logic ---
    if (requestingUserRole === 'admin') {
        // ADMIN PATH: Retrieve ALL orders.
        sql = baseSql + `
            ORDER BY o.id DESC
        `;
        values = []; // No WHERE clause parameters needed
        console.log(`Admin user ${requestingUserId} fetching ALL orders.`);
        
    } else { 
        // STANDARD USER PATH: Retrieve only orders belonging to the user.
        sql = baseSql + `
            AND o.user_id = ?
            ORDER BY o.id DESC
        `;
        values = [requestingUserId]; // Filter by the specific user ID
        console.log(`Standard user ${requestingUserId} fetching their own orders.`);
    }

    try {
        // Execute the query against the database pool
        const [orders] = await db.query(sql, values);

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No orders found"
            });
        }

        // Parse the JSON string of items into a JavaScript array
        orders.forEach(order => {
            try {
                order.items = order.items ? JSON.parse(order.items) : [];
            } catch (err) {
                console.error("Error parsing JSON for order:", order.id, err);
                order.items = [];
            }
        });

        return res.json({
            status: "success",
            count: orders.length,
            orders
        });

    } catch (err) {
        console.error("Get Orders By Role Database Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Database error",
            error: err.message
        });
    }
};
// exports.getMyOrders = async (req, res) => {
//     const userId = req.user.id;
    
//     // NOTE: This complex query uses MySQL 8.0+ JSON functions (JSON_ARRAYAGG, JSON_OBJECT).
//     const sql = `
//         SELECT 
//             o.id,
//             o.total_amount,
//             o.status,
//             o.created_at,
//             (
//                 SELECT JSON_ARRAYAGG(
//                     JSON_OBJECT(
//                         'product_id', oi.product_id,
//                         'qty', oi.qty
//                     )
//                 )
//                 FROM order_items oi
//                 WHERE oi.order_id = o.id
//             ) AS items
//         FROM orders o
//         WHERE o.user_id = ?
//         ORDER BY o.id DESC
//     `;

//     try {
//         // Use db.query() for simple reads against the promise-based pool
//         const [orders] = await db.query(sql, [userId]); 

//         if (!orders || orders.length === 0) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "No orders found"
//             });
//         }
        
//         // Parse JSON items from the MySQL result
//         orders.forEach(order => {
//             try {
//                 // The 'items' column is returned as a string that needs explicit parsing
//                 order.items = order.items ? JSON.parse(order.items) : [];
//             } catch (err) {
//                 console.error("Error parsing JSON for order:", order.id, err);
//                 order.items = [];
//             }
//         });

//         return res.json({
//             status: "success",
//             count: orders.length,
//             orders
//         });

//     } catch (err) {
//         console.error("Get My Orders Error:", err);
//         return res.status(500).json({
//             status: "error",
//             message: "Database error",
//             error: err.message
//         });
//     }
// };

// exports.getMyOrders = (req, res) => {
//     const userId = req.user.id;
//     const sql = `
//         SELECT 
//             o.id,
//             o.total_amount,
//             o.status,
//             o.created_at,
//             (
//                 SELECT JSON_ARRAYAGG(
//                     JSON_OBJECT(
//                         'product_id', oi.product_id,
//                         'qty', oi.qty
//                     )
//                 )
//                 FROM order_items oi
//                 WHERE oi.order_id = o.id
//             ) AS items
//         FROM orders o
//         WHERE o.user_id = ?
//         ORDER BY o.id DESC
//     `;
//     db.query(sql, [userId], (err, orders) => {
//         if (err) {
//             console.log(err);
//             return res.status(500).json({
//                 status: "error",
//                 message: "Database error"
//             });
//         }
//         if (!orders || orders.length === 0) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "No orders found"
//             });
//         }
//         // Parse JSON items
//         orders.forEach(order => {
//             try {
//                 order.items = JSON.parse(order.items);
//             } catch (err) {
//                 order.items = [];
//             }
//         });
//         return res.json({
//             status: "success",
//             count: orders.length,
//             orders
//         });
//     });
// };
// exports.updateOrderStatus = async (req, res) => {
//     const orderId = req.params.orderId;
//     const { status } = req.body;
//     try {
//         // 1️⃣ Validate status
//         const validStatuses = ["pending", "processing", "shipped", "completed", "cancelled"];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Invalid order status"
//             });
//         }
//         // 2️⃣ Get existing order
//         const [orderResult] = await db.promise().query(
//             "SELECT status FROM orders WHERE id = ?",
//             [orderId]
//         );
//         if (orderResult.length === 0) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "Order not found"
//             });
//         }
//         const currentStatus = orderResult[0].status;
//         // 3️⃣ If already completed, do NOT reduce stock again
//         if (currentStatus === "completed") {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Order already completed, stock already updated"
//             });
//         }
//         // 4️⃣ Update the order status
//         await db.promise().query(
//             "UPDATE orders SET status = ? WHERE id = ?",
//             [status, orderId]
//         );
//         // 5️⃣ Only update stock when status becomes 'completed'
//         if (status === "completed") {
//             // Fetch order items
//             const [items] = await db.promise().query(
//                 "SELECT product_id, qty FROM order_items WHERE order_id = ?",
//                 [orderId]
//             );
//             // Reduce stock for each product
//             for (const item of items) {
//                 await db.promise().query(
//                     "UPDATE products SET stock = stock - ? WHERE id = ?",
//                     [item.qty, item.product_id]
//                 );
//             }
//         }
//         return res.json({
//             status: "success",
//             message: `Order status updated to ${status}`
//         });
//     } catch (err) {
//         console.error("Order Status Update Error:", err);
//         return res.status(500).json({
//             status: "error",
//             message: "Server error",
//             error: err.message
//         });
//     }
// };

// exports.updateOrderStatus = async (req, res) => {
//     const orderId = req.params.orderId;
//     const { status } = req.body;
//     let connection; // Declare connection for transaction
//     try {
//         // 1️⃣ Validate status
//         const validStatuses = ["pending", "processing", "shipped", "completed", "cancelled"];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Invalid order status"
//             });
//         }
//         // --- Acquire Connection and Begin Transaction ---
//         connection = await db.promise().getConnection();
//         await connection.beginTransaction();
//         // 2️⃣ Get existing order
//         // Use the transactional connection
//         const [orderResult] = await connection.query(
//             "SELECT status FROM orders WHERE id = ?",
//             [orderId]
//         );
        
//         if (orderResult.length === 0) {
//             await connection.rollback();
//             return res.status(404).json({
//                 status: "error",
//                 message: "Order not found"
//             });
//         }
//         const currentStatus = orderResult[0].status;
//         // 3️⃣ If already completed, do NOT reduce stock again
//         if (currentStatus === "completed") {
//             await connection.rollback();
//             return res.status(400).json({
//                 status: "error",
//                 message: "Order already completed, stock already updated"
//             });
//         }
//         // 4️⃣ Update the order status
//         await connection.query(
//             "UPDATE orders SET status = ? WHERE id = ?",
//             [status, orderId]
//         );
//         // 5️⃣ Only update stock when status becomes 'completed'
//         if (status === "completed") {
//             // Fetch order items using the transactional connection
//             const [items] = await connection.query(
//                 "SELECT product_id, qty FROM order_items WHERE order_id = ?",
//                 [orderId]
//             );
//             // Reduce stock for each product within the transaction
//             for (const item of items) {
//                 const [updateResult] = await connection.query(
//                     "UPDATE products SET stock = stock - ? WHERE id = ?",
//                     [item.qty, item.product_id]
//                 );
//                 // Optional: Check if the update actually modified a row (optional stock safety)
//                 if (updateResult.affectedRows === 0) {
//                     // This indicates the product ID was missing or the WHERE clause failed
//                     console.warn(`Stock update failed for product ${item.product_id}`);
//                 }
//             }
//         }
//         // --- Commit Transaction ---
//         await connection.commit();
//         connection.release();
//         return res.json({
//             status: "success",
//             message: `Order status updated to ${status}`
//         });
//     } catch (err) {
//         // --- Rollback on any failure ---
//         if (connection) {
//             await connection.rollback();
//             connection.release();
//         }
//         console.error("Order Status Update Transaction Error:", err);
//         return res.status(500).json({
//             status: "error",
//             message: "Transaction failed. Server error.",
//             error: err.message
//         });
//     }
// };
exports.updateOrderStatus = async (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;
    let connection;

    try {
        // 1. Validation
        const validStatuses = ["pending", "processing", "shipped", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: "error", message: "Invalid order status" });
        }

        // 2. Acquire connection and start transaction
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 3. Get existing order and check if already completed
        const [orderResult] = await connection.query(
            "SELECT status FROM orders WHERE id = ?",
            [orderId]
        );
        
        if (orderResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ status: "error", message: "Order not found" });
        }
        
        const currentStatus = orderResult[0].status;

        // Prevent multiple stock reductions
        if (currentStatus === "completed" && status === "completed") {
            await connection.rollback();
            return res.status(400).json({ status: "error", message: "Order already completed, stock already updated" });
        }

        // 4. Update the order status
        await connection.query(
            "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
            [status, orderId]
        );
        
        // 5. Stock Reduction (Only upon transition to 'completed')
        if (status === "completed" && currentStatus !== "completed") {
            // Fetch order items using the transactional connection
            const [items] = await connection.query(
                "SELECT product_id, qty FROM order_items WHERE order_id = ?",
                [orderId]
            );
            
            // Reduce stock for each product
            for (const item of items) {
                await connection.query(
                    "UPDATE products SET stock = stock - ? WHERE id = ?",
                    [item.qty, item.product_id]
                );
            }
        }
        
        // 6. Commit Transaction and release connection
        await connection.commit();
        connection.release();

        return res.json({
            status: "success",
            message: `Order status updated to ${status}`
        });
    } catch (err) {
        // 7. Rollback on any failure
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error("Order Status Update Transaction Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Transaction failed. Server error.",
            error: err.message
        });
    }
};

