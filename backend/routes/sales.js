import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/years', async (req, res) => {
  const sql = `
    SELECT DISTINCT YEAR(sr.transaction_date) AS year
    FROM Sales_records sr
    ORDER BY year DESC
  `;

  try {
    const [results] = await db.query(sql);
    const years = results.map(row => row.year);
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:year', async (req, res) => {
  const year = req.params.year;

  const sql = `
    SELECT 
      b.book_name AS book_name,
      b.unit_price,
      sr.quantity,
      sr.total_price,
      MONTH(sr.transaction_date) AS transaction_month
    FROM Sales_records sr
    JOIN Book b ON b.book_ISBN = sr.book_ISBN
    WHERE YEAR(sr.transaction_date) = ?
  `;

  try {
    const [results] = await db.query(sql, [year]);

    // Group sales per book per month
    const books = {};
    const unitPriceMap = {};

    results.forEach(row => {
      const { book_name, unit_price, quantity, total_price, transaction_month } = row;

      // Store unit_price once for each book
      if (!unitPriceMap[book_name]) {
        unitPriceMap[book_name] = unit_price;
      }

      if (!books[book_name]) {
        books[book_name] = {};
      }

      books[book_name][transaction_month] = {
        unit_price,
        units_sold: quantity,
        total: total_price,
      };
    });

    // Build final 12-month data with consistent unit price
    const finalData = {};

    for (const book in unitPriceMap) {
      finalData[book] = [];

      for (let month = 1; month <= 12; month++) {
        const existing = books[book]?.[month];

        finalData[book].push(
          existing
            ? existing
            : {
              unit_price: unitPriceMap[book],
              units_sold: 0,
              total: 0,
            }
        );
      }
    }

    res.json(finalData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
