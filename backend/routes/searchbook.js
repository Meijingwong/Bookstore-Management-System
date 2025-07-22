import express from 'express';
import db from '../db.js';
const router = express.Router();

router.get(['/books/search', '/api/books/search'], async (req, res) => {
  if (req.path === '/books/search') {
    try {
      const searchQuery = req.query.q;
      if (!searchQuery) {
        return res.status(400).json({ error: "Query parameter 'q' is required." });
      }
      const searchTerm = `%${searchQuery.toLowerCase()}%`;
      const [rows] = await db.query(
        `SELECT 
          b.book_ISBN AS isbn,
          b.book_name AS title,
          b.unit_price AS price,
          b.stock,
          b.sales,
          b.author,
          g.genre AS genre,
          bt.book_type AS type,
          b.book_img AS image,
          p.publisher_name AS publisher
        FROM Book b
        LEFT JOIN Publisher p ON b.publisher_ID = p.publisher_ID
        LEFT JOIN Genre g ON b.genre_ID = g.genre_ID
        LEFT JOIN Book_Type bt ON b.book_type_ID = bt.book_type_ID
        WHERE LOWER(b.book_name) LIKE ?`,
        [searchTerm]
      );
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.path === '/api/books/search') {
    const q = req.query.q || "";
    let sql = `
      SELECT 
        B.book_ISBN AS isbn,
        B.book_name AS title,
        B.unit_price AS price,
        B.stock,
        B.sales,
        B.author,
        G.genre AS genre,
        T.book_type AS type,
        P.publisher_name AS publisher,
        B.book_img AS image
      FROM Book B
      JOIN Publisher P ON B.publisher_ID = P.publisher_ID
      LEFT JOIN Genre G ON B.genre_ID = G.genre_ID
      LEFT JOIN Book_Type T ON B.book_type_ID = T.book_type_ID
      WHERE 1=1
    `;
    const params = [];
    if (q.trim()) {
      sql += ` AND (B.book_name LIKE ? OR B.author LIKE ? OR B.book_ISBN LIKE ? OR G.genre LIKE ? OR T.book_type LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ` LIMIT 50`;
    try {
      const [books] = await db.query(sql, params);
      return res.json(books);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(404).json({ error: "Not found" });
});

export default router;