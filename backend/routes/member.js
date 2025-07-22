import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all members
router.get('/all_members', async (req, res) => {
    const { page = 1, limit = 10, sort_by = 'member_ID', order = 'asc' } = req.query;

    // Validate sort_by and order to prevent SQL injection
    const allowedSortFields = ['member_ID', 'member_name', 'total_spent', 'gift_get'];
    const allowedOrders = ['asc', 'desc'];

    if (!allowedSortFields.includes(sort_by) || !allowedOrders.includes(order.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid sorting parameters' });
    }

    const offset = (page - 1) * limit;
    const sql = `
    SELECT * FROM Membership
    ORDER BY ${sort_by} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `;

    try {
        const [results] = await db.query(sql, [parseInt(limit), parseInt(offset)]);
        const [countResult] = await db.query(`SELECT COUNT(*) AS total FROM Membership`);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        res.json({
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            totalRecords,
            sortBy: sort_by,
            order: order.toUpperCase(),
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add member
router.post('/add_member', async (req, res) => {
    const { member_name, phone_num } = req.body;
    const sql = `INSERT INTO Membership (member_name, phone_num) VALUES (?, ?)`;
    try {
        const [result] = await db.execute(sql, [member_name, phone_num]);
        res.status(201).json({ message: 'Member added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete member
router.delete('/delete_member/:id', async (req, res) => {
    const sql = `DELETE FROM Membership WHERE member_ID = ?`;
    try {
        await db.execute(sql, [req.params.id]);
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Edit member
router.put('/edit_member/:id', async (req, res) => {
    const { member_name, phone_num, total_spent, is_eligible_gift, gift_get } = req.body;
    const sql = `
    UPDATE Membership 
    SET member_name=?, phone_num=?, total_spent=?, is_eligible_gift=?, gift_get=? 
    WHERE member_ID=?`;
    try {
        await db.execute(sql, [member_name, phone_num, total_spent, is_eligible_gift, gift_get, req.params.id]);
        res.json({ message: 'Member updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search member by name
router.get('/search_member/name/:name', async (req, res) => {
    const { page = 1, limit = 10, sort_by = 'member_ID', order = 'asc' } = req.query;
    const name = req.params.name;

    const allowedSortFields = ['member_ID', 'member_name', 'total_spent', 'gift_get'];
    const allowedOrders = ['asc', 'desc'];

    if (!allowedSortFields.includes(sort_by) || !allowedOrders.includes(order.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid sorting parameters' });
    }

    const limitNum = parseInt(limit);
    const offsetNum = (parseInt(page) - 1) * limitNum;

    const sql = `
        SELECT * FROM Membership
        WHERE member_name LIKE ?
        ORDER BY ${sort_by} ${order.toUpperCase()}
        LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    try {
        const [results] = await db.execute(sql, [`%${name}%`]);

        const [countResult] = await db.execute(
            `SELECT COUNT(*) AS total FROM Membership WHERE member_name LIKE ?`,
            [`%${name}%`]
        );

        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limitNum);

        res.json({
            currentPage: parseInt(page),
            limit: limitNum,
            totalPages,
            totalRecords,
            sortBy: sort_by,
            order: order.toUpperCase(),
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search member by phone number
router.get('/search_member/phone/:phone', async (req, res) => {
    const sql = `SELECT member_ID FROM Membership WHERE phone_num = ?`;
    try {
        const [results] = await db.execute(sql, [req.params.phone]);
        if (results.length > 0) {
            res.json({ member_ID: results[0].member_ID });
        } else {
            res.status(404).json({ message: 'Phone number not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get member by ID
router.get('/member/:id', async (req, res) => {
    const sql = `SELECT * FROM Membership WHERE member_ID = ?`;
    try {
        const [results] = await db.execute(sql, [req.params.id]);
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: 'Member not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;