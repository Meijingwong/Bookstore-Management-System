import React from 'react';
import { useContext } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleContext } from './components/RoleContext.jsx';
import { CartProvider } from './components/CartContext.jsx';
import MainLayout from './layout/MainLayout.jsx';
import UserLayout from './layout/UserLayout.jsx';
import Home from './pages/UserHome.jsx';
import Dashboard from './pages/AdminProfile.jsx';
import SalesReport from './pages/SalesReport.jsx';
import ManageMember from './pages/ManageMember.jsx';
import UserMember from './pages/UserMember.jsx';
import PurchaseRecord from './pages/purchaseRecord.jsx';
import ManageBook from './pages/Managebook.jsx';
import BooksSearchResults from './pages/AdminSearch.jsx';
import DisplayBook from './pages/DisplayBook.jsx';
import UserSearch from './pages/UserSearch.jsx';
import BookDetails from './pages/BookDetails.jsx';
import UserBarcodeScan from './pages/ScanBarcode.jsx';
import UserPaymentPage from './pages/Payment.jsx';
import UserEReceipt from './pages/EReceipt.jsx';
import ThankYou from './pages/ThankYou.jsx';
import UserCart from './pages/Cart.jsx';
import AdminLogin from './pages/Login&Signup.jsx';
import Redeem from './pages/Redeem.jsx';

const App = () => {
  const { role } = useContext(RoleContext);
  console.log("Current role:", role);

  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin Routes */}
          {role === "admin" && (
            <Route path="/" element={<MainLayout />}>
              <Route path="/profile" element={<Dashboard />} />
              <Route path="/search" element={<BooksSearchResults />} />
              <Route path="/manage-book" element={<ManageBook />} />
              <Route path="/purchase-records" element={<PurchaseRecord />} />
              <Route path="/sales-report" element={<SalesReport />} />
              <Route path="/manage-member" element={<ManageMember />} />
              <Route path="*" element={<h1>404 not found</h1>} />
            </Route>
          )}

          {/* User Routes */}
          {role === "user" && (
            <Route path="/" element={<UserLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/display-book" element={<DisplayBook />} />
              <Route path="/search-book" element={<UserSearch />} />
              <Route path="/display/:title" element={<BookDetails />} />
              <Route path="/scan-barcode" element={<UserBarcodeScan />} />
              <Route path="/payment" element={<UserPaymentPage />} />
              <Route path="/e-receipt/:transactionId" element={<UserEReceipt />} />
              <Route path="/cart" element={<UserCart />} />
              <Route path="/thankyou" element={<ThankYou />} />
              <Route path="/redeem/:memberid" element={<Redeem />} />
              <Route path="/member" element={<UserMember />} />
              <Route path="*" element={<h1>404 not found</h1>} />
            </Route>
          )}

          {/* Public Login Route */}
          <Route path="*" element={<AdminLogin />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;