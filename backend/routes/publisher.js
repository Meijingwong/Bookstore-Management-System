import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all publishers
router.get('/publisher', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT publisher_ID, publisher_name FROM Publisher');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching publishers:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get publisher name only
router.get('/publisher/names', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT publisher_name FROM Publisher');
        res.json(rows.map(row => row.publisher_name));
    } catch (err) {
        console.error('Error fetching publisher names:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add new Publisher
router.post('/publisher', async (req, res) => {
    try {
        const { publisher_name } = req.body;
        
        if (!publisher_name || typeof publisher_name !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'Publisher name is required and must be a string' 
            });
        }

        const trimmedName = publisher_name.trim();
        
        if (trimmedName.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Publisher name cannot be empty' 
            });
        }

        // Check if publisher already exists
        const [existing] = await db.query(
            'SELECT publisher_ID FROM Publisher WHERE publisher_name = ?',
            [trimmedName]
        );

        if (existing.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Publisher already exists',
                publisherId: existing[0].publisher_ID
            });
        }

        // Insert new publisher
        const [result] = await db.query(
            'INSERT INTO Publisher (publisher_name) VALUES (?)',
            [trimmedName]
        );

        // Get the inserted publisher
        const [newPublisher] = await db.query(
            'SELECT publisher_ID, publisher_name FROM Publisher WHERE publisher_ID = ?',
            [result.insertId]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Publisher added successfully',
            data: newPublisher[0]
        });

    } catch (err) {
        console.error('Error adding publisher:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add publisher',
            error: err.message 
        });
    }
});

// Get publisher ID by name
router.get('/publisher/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const [rows] = await db.query(
            'SELECT publisher_ID FROM Publisher WHERE publisher_name = ?',
            [name]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Publisher not found' 
            });
        }

        res.json({ 
            success: true, 
            publisher_ID: rows[0].publisher_ID 
        });
    } catch (err) {
        console.error('Error getting publisher ID:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

export default router;