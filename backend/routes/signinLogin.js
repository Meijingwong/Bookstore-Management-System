import express from 'express';
import bcrypt from 'bcrypt'; //For password hashing.
import nodemailer from 'nodemailer'; //For sending emails (like OTP)
import jwt from 'jsonwebtoken'; //for generating JWT tokens, if delete it, will unable to login in admin
import dotenv from 'dotenv';
import db from '../db.js';

const router = express.Router();
//Use an In-Memory Store 
const otpStore = {};

// Clear expired OTPs every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const email in otpStore) {
        if (otpStore[email].expiry < now) {
            delete otpStore[email];
        }
    }
}, 60 * 1000);

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET_KEY;
//Chooses the JWT secret key for token generation.
// Nodemailer transporter

//Sets up Gmail as email sender using environment-provided credentials.
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    debug: true,
    logger: true,
});

// Admin Registration 
router.post("/register", async (req, res) => {
    const { adminId, name, email, password, contact, position, gender } = req.body;

    if (!adminId || !name || !email || !password || !contact || !position || !gender) {
        return res.status(400).send("All fields are required.");
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO Admin (admin_ID, admin_name, password, gender, email, contact_num, position) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [adminId, name, hashedPassword, gender, email, contact, position]
        );

        const token = jwt.sign(
            { adminId },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: "Registration successful!",
            token
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "The account already exists." });
        } else {
            console.error(error);
            res.status(500).send("Error registering admin.");
        }
    }
});

// Login Endpoint with Login Attempts Tracking 
router.post("/login", async (req, res) => {
    const { adminId, password } = req.body;
    const adminIdInt = parseInt(adminId);

    try {
        const [rows] = await db.query(`SELECT * FROM Admin WHERE admin_ID = ?`, [adminIdInt]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid admin ID" });
        }

        const admin = rows[0];

        const isValidPassword = await bcrypt.compare(password, admin.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '1h' });
        const profile = {
            admin_ID: admin.admin_ID,
            admin_name: admin.admin_name,
            position: admin.position,
            gender: admin.gender,
            contact_num: admin.contact_num,
            email: admin.email
        };
        res.status(200).json({ token, profile });
    } catch (error) {
        res.status(500).json({ message: "Error logging in." });
    }
});

router.get("/profile/:adminId", async (req, res) => {
    const { adminId } = req.params;
    const adminIdInt = parseInt(adminId);
    try {
        const [rows] = await db.query("SELECT * FROM Admin WHERE admin_ID = ?", [adminIdInt]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Admin not found." });
        }
        const admin = rows[0];
        const profile = {
            admin_ID: admin.admin_ID,
            admin_name: admin.admin_name,
            position: admin.position,
            gender: admin.gender,
            contact_num: admin.contact_num,
            email: admin.email
        };
        res.status(200).json(profile);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Get Admin name by ID
router.get("/admin-name/:adminId", async (req, res) => {
    const { adminId } = req.params;
    const adminIdInt = parseInt(adminId);
    try {
        const [rows] = await db.query("SELECT admin_name FROM Admin WHERE admin_ID = ?", [adminIdInt]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Admin not found." });
        }
        const adminName = rows[0].admin_name;
        res.status(200).json({ admin_name: adminName });
    } catch (error) {
        console.error("Error fetching admin name:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Forgot Password: Send OTP via Email (In-Memory OTP Store)
router.post("/forgot", async (req, res) => {
    const { email, adminId } = req.body;

    if (!email) {
        return res.status(400).send("Email is required.");
    }

    try {
        // Validate email and adminId if provided
        if (adminId) {
            const [rows] = await db.query("SELECT email FROM Admin WHERE admin_ID = ?", [adminId]);
            if (rows.length === 0) {
                return res.status(404).send("Admin ID not found.");
            }
            if (rows[0].email !== email) {
                return res.status(400).send("Incorrect email for the provided admin ID.");
            }
        } else {
            const [rows] = await db.query("SELECT email FROM Admin WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).send("Email not found.");
            }
        }

        const otp = Math.floor(10000 + Math.random() * 90000).toString().trim();
        const otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes expiry

        otpStore[email.trim().toLowerCase()] = { otp, expiry: otpExpiry };

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}. It is valid for 2 minutes.`,
        });

        res.status(200).send("OTP sent to your email.");
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).send("Internal server error while sending OTP."); // ✅ Added response here

    }
});

// OTP Verification 
router.post('/verify-otp', async (req, res) => {
    let { email, otp } = req.body;

    // Normalize inputs
    email = email.trim().toLowerCase();
    otp = String(otp).trim();

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    try {
        if (!otpStore[email]) {
            return res.status(400).json({ error: 'No OTP found for this email.' });
        }

        const { otp: storedOtp, expiry } = otpStore[email];

        if (Date.now() > expiry) {
            delete otpStore[email];
            return res.status(400).json({ error: 'OTP expired.' });
        }

        if (storedOtp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        delete otpStore[email];
        res.status(200).json({ message: 'OTP verified.' });
    } catch (err) {
        console.error("Error verifying OTP:", err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Reset Password 
router.put('/reset', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required.' });
        }

        if (newPassword.length < 8 || newPassword.length > 20) {
            return res.status(400).json({ error: 'Password must be 8-20 characters long.' });
        }

        const [rows] = await db.query('SELECT password FROM Admin WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const oldPasswordHash = rows[0].password;

        const isSamePassword = await bcrypt.compare(newPassword, oldPasswordHash);
        if (isSamePassword) {
            return res.status(400).json({ error: 'New password cannot be the same as the old password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            `UPDATE Admin SET password = ? WHERE email = ?`,
            [hashedPassword, email]
        );

        res.status(200).json({ message: 'Password reset successful.' });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;