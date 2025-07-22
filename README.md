# Bookstore-Management-System
Final Year Project

A full-featured **Book Store Management System** designed for both **Admin** and **In-Store POS Users**. Built with **Node.js**, **Express.js**, **React.js**, and **MySQL** to manage books, sales, members, and more in a physical bookstore setting.

---

## 🔧 Technologies Used

- **Frontend**: React.js, Bootstrap 5  
- **Backend**: Node.js, Express.js  
- **Database**: MySQL  
- **Authentication**: Role-based access  
- **Barcode Scanning**: HTML5 input or scanner support  
- **Notifications**: Real-time via Socket.IO  
- **Payment**: Payment gateway integration + e-Receipts  
- **Deployment**: PM2, Nodemon (Dev)

---

## 🧑‍💼 Admin Features

Admins can log in using secure credentials and access a robust dashboard with full control over bookstore operations.

### 🔐 Login
- Admin login via ID & password
- Special ID allows switching to user site mode

### 📚 Book Management
- Add, edit, delete books
- Display all book info in a table
- Search books by name
- Filter books by:
  - **Genre** (e.g., Science, Fiction, Mystery, Biography)
  - **Type** (e.g., Novel, Magazine, Comic)
  - **Low stock**
  - **Books without genre/type**

### 🏷️ Genre & Type Control
- Add/delete genres and book types

### 📊 Sales Report
- Yearly and monthly sales analysis
- Visual graphs and tables
- Track units sold, revenue, and top sellers

### 🧾 Purchase Records
- Record book purchases from publishers
- Automatically update book stock

### 🧑‍🤝‍🧑 Membership Management
- Add, edit, delete members
- Search by **name** or **phone number**
- Track:
  - Total spent
  - Gift eligibility
  - Gift redemption count

### 👤 Admin Profile
- View personal details

---

## 🙋‍♂️ User Site (POS + Self-Service Mode)

This acts as a **self-service payment terminal** within the physical bookstore.

> ✅ No login required for customers.  
> 🔐 Safe Key required to log out (only staff know this key).

### 🧭 Main Navigation
- Choose between:
  - **Search Book**
  - **Pay Now**

### 🔍 Search Book
- Display all books with:
  - Cover image
  - Book name
  - Price (sorted by sales)
- Filter by genre/type
- Search books by name
- Click to view book details
- Add/edit/delete **ratings and comments**

### 💳 Pay
- Scan barcode to add book to cart
- Option to enter Member ID
  - Applies automatic discount if eligible
- Proceed to secure **payment gateway**
- Generate **e-receipt** upon success
- Automatically update sales records
- Redirect to main screen after payment

### 🎁 Gift Redemption
- Members who spend a minimum threshold can **redeem a free gift**

---

## 📦 Installation

```bash
git clone https://github.com/your-username/bookstore-management-system.git
cd bookstore-management-system
npm install
cd backend
npm run dev
cd frontend
npm run dev
