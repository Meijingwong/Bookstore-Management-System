import express from 'express';
import db from '../db.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Supported payment methods
const paymentMethods = {
  onlinebanking: {
    name: 'Online Banking',
    types: ['fpx'],
    banks: [
      { id: 'cimb', name: 'CIMB Bank' },
      { id: 'public', name: 'Public Bank' },
      { id: 'maybank', name: 'Maybank' },
      { id: 'rhb', name: 'RHB Bank' },
      { id: 'hongleong', name: 'Hong Leong Bank' }
    ]
  },
  card: {
    name: 'Credit/Debit Card',
    types: ['card']
  },
  TouchNGo: {
    name: 'TouchNGo eWallet',
    types: []
  }
};

router.get('/payment-methods', (req, res) => {
  res.status(200).json(paymentMethods);
});

router.post('/create-payment-intent', async (req, res) => {
  const { paymentMethod, items, amount, memberid, currency = 'myr', bank } = req.body;
  
  try {
    // Validate input
    if (!paymentMethod || !items?.length || !amount) {
      return res.status(400).json({ 
        error: 'Missing required payment information' 
      });
    }

    if (!paymentMethods[paymentMethod]) {
      return res.status(400).json({ 
        error: 'Invalid payment method' 
      });
    }

    // Calculate total amount
    let totalAmount = amount;
    const bookPrices = {};
    
    // Verify book prices if amount not provided
    if (!amount) {
      totalAmount = 0;
      for (const item of items) {
        const [book] = await db.query(
          'SELECT unit_price FROM Book WHERE book_ISBN = ?',
          [item.book_ISBN]
        );
        
        if (!book.length) {
          return res.status(404).json({ 
            error: `Book with ISBN ${item.book_ISBN} not found` 
          });
        }
        
        bookPrices[item.book_ISBN] = book[0].unit_price;
        totalAmount += book[0].unit_price * item.quantity;
      }
    }

    // Convert to cents for Stripe
    const stripeAmount = Math.round(totalAmount * 100);

    // Create PaymentIntent based on payment method
    let paymentIntent;
    
    if (paymentMethod === 'onlinebanking' && bank) {
      // Validate bank selection
      if (!paymentMethods.onlinebanking.banks.some(b => b.id === bank)) {
        return res.status(400).json({ 
          error: 'Invalid bank selection' 
        });
      }

      // FPX payment
      paymentIntent = await stripe.paymentIntents.create({
        amount: stripeAmount,
        currency,
        payment_method_types: ['fpx'],
        payment_method_data: {
          type: 'fpx',
          fpx: { bank }
        },
        metadata: {
          items: JSON.stringify(items),
          memberid,
          paymentMethod
        }
      });
    } 
    else if (paymentMethod === 'card') {
      // Card payment
      paymentIntent = await stripe.paymentIntents.create({
        amount: stripeAmount,
        currency,
        payment_method_types: ['card'],
        metadata: {
          items: JSON.stringify(items),
          memberid,
          paymentMethod
        }
      });
    }
    else if (paymentMethod === 'TouchNGo') {
      // Simulate TnG payment
      return res.status(200).json({
        clientSecret: 'simulated_tng_payment',
        memberid,
        simulated: true
      });
    }

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message
    });
  }
});

export default router;