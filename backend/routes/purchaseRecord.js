import express from 'express';
import db from '../db.js';
import { notifyAllUsers } from '../server.js';

const router = express.Router();

// Get all purchase records
router.get('/purchase-records', async (req, res) => {
    try {
        const [purchaseResult] = await db.query(`
            SELECT pr.purchase_ID, pr.date, 
                   a.admin_name as recordedBy, 
                   COALESCE(p.publisher_name, 'Deleted Publisher') as publisher,
                   pr.publisher_ID
            FROM Purchases_Records pr
            JOIN Admin a ON pr.admin_ID = a.admin_ID
            LEFT JOIN Publisher p ON pr.publisher_ID = p.publisher_ID
            ORDER BY pr.date DESC
        `);

        if (!purchaseResult || purchaseResult.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [itemsResult] = await db.query(`
            SELECT pi.item_ID, pi.purchase_ID, 
                   b.book_name as itemName, 
                   pi.book_qty as unit, 
                   b.unit_price as unitPrice
            FROM Purchase_Items pi
            JOIN Book b ON pi.book_ISBN = b.book_ISBN
            WHERE pi.purchase_ID IN (?)
        `, [purchaseResult.map(record => record.purchase_ID)]);

        const recordsWithItems = purchaseResult.map(record => ({
            purchase_ID: record.purchase_ID,
            date: record.date,
            recordedBy: record.recordedBy,
            publisher: record.publisher,
            publisher_ID: record.publisher_ID,
            stock: itemsResult
                .filter(item => item.purchase_ID === record.purchase_ID)
                .map(item => ({
                    itemName: item.itemName,
                    unit: Number(item.unit),           // convert to Number
                    unitPrice: Number(item.unitPrice)  // convert to Number
                }))
        }));

        res.json({ success: true, data: recordsWithItems });
    } catch (err) {
        console.error('Error fetching purchase records:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add a new purchase record
router.post('/purchase-records', async (req, res) => {
    const { admin_ID, publisher_ID, date, stock } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Verify publisher exists
        const [publisher] = await connection.query(
            'SELECT publisher_name FROM Publisher WHERE publisher_ID = ?',
            [publisher_ID]
        );

        if (publisher.length === 0) {
            throw new Error('Publisher not found');
        }

        // Insert purchase record
        const [purchaseResult] = await connection.query(
            'INSERT INTO Purchases_Records (date, publisher_ID, admin_ID) VALUES (?, ?, ?)',
            [date, publisher_ID, admin_ID]
        );

        const purchase_ID = purchaseResult.insertId;

        // Process each item in stock
        for (const item of stock) {
            // Check if book exists
            const [book] = await connection.query(
                'SELECT 1 FROM Book WHERE book_ISBN = ?',
                [item.book_ISBN]
            );

            if (book.length === 0) {
                throw new Error(`Book with ISBN ${item.book_ISBN} not found`);
            }

            const unit_price = item.unit_price;
            const total_cost = unit_price * item.quantity;

            // Insert purchase item
            await connection.query(
                'INSERT INTO Purchase_Items (book_ISBN, book_qty, total_cost, purchase_ID) VALUES (?, ?, ?, ?)',
                [item.book_ISBN, item.quantity, total_cost, purchase_ID]
            );

            // Update book stock
            await connection.query(
                'UPDATE Book SET stock = stock + ? WHERE book_ISBN = ?',
                [item.quantity, item.book_ISBN]
            );
        }

        // Get admin details for response
        const [admin] = await connection.query(
            'SELECT admin_name FROM Admin WHERE admin_ID = ?',
            [admin_ID]
        );

        await connection.commit();

        notifyAllUsers({
            title: 'New Purchase added!',
            message: `From: ${publisher[0].publisher_name}`,
            time: new Date().toLocaleString()
        });

        res.status(201).json({
            success: true,
            message: 'Purchase record added successfully',
            data: {
                purchase_ID,
                recordedBy: admin[0]?.admin_name || 'Unknown',
                date,
                publisher: publisher[0].publisher_name,
                publisher_ID,
                stock: stock.map(item => ({
                    book_ISBN: item.book_ISBN,
                    quantity: item.quantity
                }))
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error adding purchase record:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    } finally {
        connection.release();
    }
});

export default router;