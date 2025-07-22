import express from 'express';
import db from '../db.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle successful payments
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const items = JSON.parse(paymentIntent.metadata.items);
      const memberId = paymentIntent.metadata.memberid || null;
      const transactionDate = new Date().toISOString().slice(0, 10);
      const totalAmount = paymentIntent.amount / 100;

      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Process each item
        for (const item of items) {
          // Get current price if not provided
          let price = item.price;
          if (!price) {
            const [book] = await connection.query(
              'SELECT unit_price FROM Book WHERE book_ISBN = ?',
              [item.book_ISBN]
            );
            price = book[0]?.unit_price || 0;
          }

          // Create sales record
          await connection.query(
            `INSERT INTO Sales_records 
            (book_ISBN, quantity, total_price, transaction_date, member_ID, transaction_ID) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [item.book_ISBN, item.quantity, price * item.quantity, transactionDate, memberId, paymentIntent.id]
          );

          if (memberId) {
            const parsedId = parseInt(memberId);
            const amount = parseFloat(price) * parseInt(item.quantity);

            const [updateResult] = await connection.query(
              'UPDATE Membership SET total_spent = total_spent + ? WHERE member_ID = ?',
              [amount, parsedId]
            );

            if (updateResult.affectedRows === 0) {
              console.warn(`No member found to update: ID ${parsedId}`);
            }
          }

          // Update book stock
          await connection.query(
            'UPDATE Book SET stock = stock - ?, sales = sales + ? WHERE book_ISBN = ?',
            [item.quantity, item.quantity, item.book_ISBN]
          );
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;