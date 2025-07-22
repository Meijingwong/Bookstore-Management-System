import express from 'express';
import db from '../db.js';
const router = express.Router();

// GET receipt data by transaction ID
router.get('/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;

        // 1. Get all sales records for this transaction
        const salesRecordsQuery = `
        SELECT sr.*, b.book_name, b.unit_price, m.member_name
        FROM Sales_records sr
        JOIN Book b ON sr.book_ISBN = b.book_ISBN
        LEFT JOIN Membership m ON sr.member_ID = m.member_ID
        WHERE sr.transaction_ID = ?
      `;
        const [salesRecordsResult] = await db.query(salesRecordsQuery, [transactionId]);

        if (salesRecordsResult.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const items = salesRecordsResult.map(record => ({
            name: record.book_name,
            quantity: record.quantity,
            price: parseFloat(record.unit_price),
            total: parseFloat(record.total_price)
        }));

        const total = items.reduce((sum, item) => sum + item.total, 0);

        const receiptData = {
            date: salesRecordsResult[0].transaction_date,
            items,
            discount: 'NONE',
            total,
            transactionId,
            member: salesRecordsResult[0].member_ID ? {
                member_ID: salesRecordsResult[0].member_ID,
                member_name: salesRecordsResult[0].member_name
            } : null
        };

        res.json(receiptData);
    } catch (error) {
        console.error('Error fetching receipt data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;