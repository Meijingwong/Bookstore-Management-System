import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import bookRoutes from './routes/bookRoutes.js';
import salesRouter from './routes/sales.js';
import memberRouter from './routes/member.js';
import purchaseRecord from './routes/purchaseRecord.js';
import publisherRouter from './routes/publisher.js';
import searchBookRouter from './routes/searchbook.js';
import feedbackRouter from './routes/feedback.js';
import paymentRouter from './routes/payment.js';
import webhookRouter from './routes/webhook.js';
import receiptRouter from './routes/receipt.js';
import loginRouter from './routes/signinLogin.js';

const app = express();
const port = process.env.PORT;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use('/api/payment', webhookRouter);
app.use(express.json());

// Middleware
// Enhanced CORS configuration
app.use(cors({
    origin: 'http://localhost:8000', // Your Vite frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type'], // Allowed headers
}));

// Store socket connections
let connectedUsers = [];

io.on('connection', (socket) => {
  //console.log('User connected:', socket.id);
  connectedUsers.push(socket);

  socket.on('disconnect', () => {
    connectedUsers = connectedUsers.filter(s => s.id !== socket.id);
    //console.log('User disconnected:', socket.id);
  });
});

// Emit on book/purchase addition (call this inside your route)
export const notifyAllUsers = (data) => {
  io.emit('new-notification', data); // Sends to all users
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'routes/uploads')));

app.use('/api', loginRouter);
app.use('/api/sales', salesRouter);
app.use('/api', memberRouter);
app.use('/api', purchaseRecord);
app.use('/api', publisherRouter);
app.use('/api', bookRoutes);
app.use('/api', searchBookRouter);
app.use('/api', feedbackRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/receipt', receiptRouter);

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});