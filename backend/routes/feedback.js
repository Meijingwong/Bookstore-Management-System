import express from 'express';
import db from '../db.js';
const router = express.Router();

// Get all feedback for a book by ISBN
router.get('/feedback', async (req, res) => {
  const { isbn } = req.query;
  if (!isbn) return res.status(400).json({ error: "Missing ISBN" });
  try {
    const [rows] = await db.query(
      "SELECT Feedback_ID, Book_ISBN, rating, comment FROM Feedback WHERE Book_ISBN = ? ORDER BY Feedback_ID DESC",
      [isbn]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Submit new feedback
router.post('/feedback', async (req, res) => {
  const { isbn, rating, comment } = req.body;
  if (!isbn || !rating || !comment) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      "INSERT INTO Feedback (Book_ISBN, rating, comment) VALUES (?, ?, ?)",
      [isbn, rating, comment]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// Update feedback
router.put('/feedback', async (req, res) => {
  const { feedbackId, rating, comment } = req.body;
  if (!feedbackId || !rating || !comment) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      "UPDATE Feedback SET rating = ?, comment = ? WHERE Feedback_ID = ?",
      [rating, comment, feedbackId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

// Delete feedback
router.delete('/feedback/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    await db.query("DELETE FROM Feedback WHERE Feedback_ID = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

export default router;