import express from 'express';
import db from '../db.js';
import { fileURLToPath } from 'url';  //used to simulate __dirname in ES modules
import { notifyAllUsers } from '../server.js';
import multer from 'multer';
import fs from 'fs'; //file system 
import path from 'path';

const router = express.Router();

// Emulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
//multer handles image upload and saves them in the uploads/ folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/[^a-z0-9.]/gi, '_');
    cb(null, uniqueSuffix + '-' + cleanName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpg and .png images are allowed'));
    }
  }
});

// Serve static files from the uploads directory
router.use('/uploads', express.static(uploadDir));

// GET all books
router.get('/books', async (req, res) => {
  try {
    const [books] = await db.query(`
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
    `);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new book (with image upload)
router.post('/books', (req, res, next) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { isbn, title, price, stock, genre, type, publisher, author, sales } = req.body;
    if (!isbn || !title || !price || !stock || !genre || !type || !publisher || !author) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    // Publisher
    const [publisherResult] = await connection.query(
      'SELECT publisher_ID FROM Publisher WHERE publisher_name = ?',
      [publisher]
    );
    let publisherId;
    if (publisherResult.length > 0) {
      publisherId = publisherResult[0].publisher_ID;
    } else {
      const [newPublisher] = await connection.query(
        'INSERT INTO Publisher (publisher_name) VALUES (?)',
        [publisher]
      );
      publisherId = newPublisher.insertId;
    }

    // Genre
    const [genreResult] = await connection.query(
      'SELECT genre_ID FROM Genre WHERE genre = ?', [genre]
    );
    let genreId;
    if (genreResult.length > 0) {
      genreId = genreResult[0].genre_ID;
    } else {
      const [newGenre] = await connection.query(
        'INSERT INTO Genre (genre) VALUES (?)', [genre]
      );
      genreId = newGenre.insertId;
    }

    // Book Type
    const [typeResult] = await connection.query(
      'SELECT book_type_ID FROM Book_Type WHERE book_type = ?', [type]
    );
    let typeId;
    if (typeResult.length > 0) {
      typeId = typeResult[0].book_type_ID;
    } else {
      const [newType] = await connection.query(
        'INSERT INTO Book_Type (book_type) VALUES (?)', [type]
      );
      typeId = newType.insertId;
    }

    await connection.query(
      `INSERT INTO Book (
        book_ISBN, book_name, book_img, unit_price, stock, sales,
        publisher_ID, author, genre_ID, book_type_ID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn, title, imagePath, price, stock, sales || 0, publisherId, author, genreId, typeId]
    );

    // After inserting the new book
    const [newBookRows] = await connection.query(`
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
      WHERE B.book_ISBN = ?
    `, [isbn]);

    await connection.commit();
    notifyAllUsers({
      title: 'New Book Added!',
      message: `Name: ${title}`,
      time: new Date().toLocaleString()
    });
    res.status(201).json(newBookRows[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT: Update book with image replacement
router.put('/books/:isbn', (req, res, next) => {
  upload.single('image')(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { isbn } = req.params;
    const {
      title,
      price,
      stock,
      genre,
      type,
      publisher,
      author,
      sales,
      existingImage
    } = req.body;

    let imagePath = null;
    let oldImagePath = null;

    if (req.file) {
      // New image uploaded
      const [imgRows] = await connection.query(
        'SELECT book_img FROM Book WHERE book_ISBN = ?',
        [isbn]
      );
      oldImagePath = imgRows[0]?.book_img || null;
      imagePath = `/uploads/${req.file.filename}`;
    } else if (existingImage) {
      // No new upload, use existing image path
      imagePath = existingImage;
    }

    // Ensure publisher exists or insert
    let [publisherResult] = await connection.query(
      'SELECT publisher_ID FROM Publisher WHERE publisher_name = ?',
      [publisher]
    );
    let publisherId = publisherResult.length
      ? publisherResult[0].publisher_ID
      : (await connection.query(
        'INSERT INTO Publisher (publisher_name) VALUES (?)',
        [publisher]
      ))[0].insertId;

    // Ensure genre exists or insert
    let [genreResult] = await connection.query(
      'SELECT genre_ID FROM Genre WHERE genre = ?',
      [genre]
    );
    let genreId = genreResult.length
      ? genreResult[0].genre_ID
      : (await connection.query(
        'INSERT INTO Genre (genre) VALUES (?)',
        [genre]
      ))[0].insertId;

    // Ensure book type exists or insert
    let [typeResult] = await connection.query(
      'SELECT book_type_ID FROM Book_Type WHERE book_type = ?',
      [type]
    );
    let typeId = typeResult.length
      ? typeResult[0].book_type_ID
      : (await connection.query(
        'INSERT INTO Book_Type (book_type) VALUES (?)',
        [type]
      ))[0].insertId;

    // Update the book record
    await connection.query(
      `UPDATE Book SET
        book_name = ?, book_img = ?, unit_price = ?, stock = ?, sales = ?,
        publisher_ID = ?, author = ?, genre_ID = ?, book_type_ID = ?
       WHERE book_ISBN = ?`,
      [title, imagePath, price, stock, sales || 0, publisherId, author, genreId, typeId, isbn]
    );

    // Delete old image file (if new one was uploaded)
    if (oldImagePath && req.file) {
      const fullPath = path.join(__dirname, '..', oldImagePath);
      fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(fullPath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting old image:', unlinkErr);
          });
        }
      });
    }

    // Fetch and return updated book info
    const [updatedRows] = await connection.query(`
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
      WHERE B.book_ISBN = ?
    `, [isbn]);

    await connection.commit();
    res.json(updatedRows[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error updating book:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE a book (also delete image)
router.delete('/books/:isbn', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { isbn } = req.params;

    // Get book image path first
    const [rows] = await connection.query('SELECT book_img FROM Book WHERE book_ISBN = ?', [isbn]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const imagePath = rows[0].book_img;

    const [name] = await connection.query('SELECT book_name FROM Book WHERE book_ISBN = ?', [isbn]);
    if (name.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const bookName = name[0].book_name;

    // Delete book from database
    await connection.query('DELETE FROM Book WHERE book_ISBN = ?', [isbn]);

    // Delete image file if exists
    if (imagePath) {
      const imageFullPath = path.join(__dirname, imagePath);
      fs.unlink(imageFullPath, (err) => {
        if (err) console.error('Failed to delete book image:', err);
      });
    }

    await connection.commit();
    notifyAllUsers({
      title: 'Book Deleted!',
      message: `Name: ${bookName}`,
      time: new Date().toLocaleString()
    });
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/genres - list all available genres
router.get('/genres', async (req, res) => {
  try {
    const [genres] = await db.query('SELECT genre FROM Genre');
    res.json(genres.map(g => g.genre));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/types - list all available book types
router.get('/types', async (req, res) => {
  try {
    const [types] = await db.query('SELECT book_type FROM Book_Type');
    res.json(types.map(t => t.book_type));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/genres/:name - delete genre if unused
router.delete('/genres/:name', async (req, res) => {
  const genreName = req.params.name;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT genre_ID FROM Genre WHERE genre = ?', [genreName]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Genre not found' });
    }
    const genreId = rows[0].genre_ID;
    await connection.query('DELETE FROM Genre WHERE genre_ID = ?', [genreId]);
    await connection.commit();
    res.json({ message: '✅ Genre deleted, books updated with NULL' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/types/:name
router.delete('/types/:name', async (req, res) => {
  const typeName = req.params.name;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT book_type_ID FROM Book_Type WHERE book_type = ?', [typeName]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Type not found' });
    }
    const typeId = rows[0].book_type_ID;
    await connection.query('UPDATE Book SET book_type_ID = NULL WHERE book_type_ID = ?', [typeId]);
    await connection.query('DELETE FROM Book_Type WHERE book_type_ID = ?', [typeId]);
    await connection.commit();
    res.json({ message: 'Category deleted and related books updated' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;