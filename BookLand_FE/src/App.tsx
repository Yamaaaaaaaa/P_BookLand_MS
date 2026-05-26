import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { isCustomerAuthenticated, isAdminAuthenticated, isShipperAuthenticated } from './utils/auth';

// Layouts
import ShopLayout from './layouts/ShopLayout';
import AdminLayout from './layouts/AdminLayout';

// Shop Pages
import HomePage from './pages/shop/HomePage';
import BooksPage from './pages/shop/BooksPage';
import BookDetailPage from './pages/shop/BookDetailPage';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import ProfilePage from './pages/shop/ProfilePage';
import MyOrdersPage from './pages/shop/MyOrdersPage';
import MyReviewsPage from './pages/shop/MyReviewsPage';
import LoginPage from './pages/shop/auth/LoginPage';
import RegisterPage from './pages/shop/auth/RegisterPage';
import PaymentPage from './pages/shop/PaymentPage';
import PaymentResultPage from './pages/shop/PaymentResultPage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import AdminLoginPage from './pages/admin/auth/AdminLoginPage';
import ManageUserPage from './pages/admin/ManageUserPage';
import ManageRolePage from './pages/admin/ManageRolePage';
import AllBillsPage from './pages/admin/manage-business/AllBillsPage';
import PaymentMethodPage from './pages/admin/manage-business/PaymentMethodPage';
import ShippingMethodPage from './pages/admin/manage-business/ShippingMethodPage';
import BillDetailPage from './pages/admin/manage-business/BillDetailPage';
import BookManagementPage from './pages/admin/manage-information/BookManagementPage';
import CategoryPage from './pages/admin/manage-information/CategoryPage';
import AuthorPage from './pages/admin/manage-information/AuthorPage';
import SeriePage from './pages/admin/manage-information/SeriePage';
import AdminBookDetailPage from './pages/admin/manage-information/AdminBookDetailPage';
import AdminUserDetailPage from './pages/admin/manage-information/AdminUserDetailPage';
import WishList from './pages/shop/WishList';
import EventDetailPage from './pages/shop/EventDetailPage';
import EventPage from './pages/admin/manage-business/EventPage';
import EventFormPage from './pages/admin/manage-business/EventFormPage';
import Gallery from './pages/admin/Gallery';
import AdminChatListPage from './pages/admin/AdminChatListPage';
import AdminChatDetailPage from './pages/admin/AdminChatDetailPage';
import AdminSendEmailPage from './pages/admin/AdminSendEmailPage';

// Shipper Pages
import ShipperLoginPage from './pages/shipper/auth/ShipperLoginPage';
import ShipperDashboardPage from './pages/shipper/ShipperDashboardPage';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Defaults redirect to Shop Home */}
        <Route path="/" element={<Navigate to="/shop/home" replace />} />

        {/* SHOP ROUTES */}
        <Route path="/shop" element={<ShopLayout />}>
          {/* Public Routes */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="payment-result" element={<PaymentResultPage />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="book-detail/:id" element={<BookDetailPage />} />
          <Route path="event-detail/:id" element={<EventDetailPage />} />

          {/* Protected Customer Routes */}
          <Route element={<ProtectedRoute checkAuth={isCustomerAuthenticated} redirectPath="/shop/login" />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="wishlist" element={<WishList />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="payment/:billId" element={<PaymentPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
            <Route path="my-reviews" element={<MyReviewsPage />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES */}
        <Route path="/admin" >
          <Route index element={<Navigate to="dashboard" replace />} />
          {/* Public Admin Routes */}
          <Route path="login" element={<AdminLoginPage />} />

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute checkAuth={isAdminAuthenticated} redirectPath="/admin/login" />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="manage-user" element={<ManageUserPage />} />
              <Route path="manage-role" element={<ManageRolePage />} />
              <Route path="send-email" element={<AdminSendEmailPage />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="chat" element={<AdminChatListPage />} />
              <Route path="chat/:userId" element={<AdminChatDetailPage />} />
              <Route path="manage-user/:id" element={<AdminUserDetailPage />} />

              {/* Manage Business */}
              <Route path="manage-business">
                <Route path="bills" element={<AllBillsPage />} />
                <Route path="bill-detail/:id" element={<BillDetailPage />} />

                <Route path="payment" element={<Navigate to="payment-method" replace />} />
                <Route path="payment-method" element={<PaymentMethodPage />} />

                <Route path="shipping" element={<Navigate to="shipping-method" replace />} />
                <Route path="shipping-method" element={<ShippingMethodPage />} />

                <Route path="event" element={<EventPage />} />
                <Route path="event/:id" element={<EventFormPage />} />
              </Route>

              {/* Manage Information */}
              <Route path="manage-information">
                <Route path="book" element={<BookManagementPage />} />
                <Route path="category" element={<CategoryPage />} />
                <Route path="author" element={<AuthorPage />} />
                <Route path="serie" element={<SeriePage />} />
                <Route path="book-detail/:id" element={<AdminBookDetailPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* SHIPPER ROUTES - standalone, no ShopLayout */}
        <Route path="/shop/shipper/login" element={<ShipperLoginPage />} />
        <Route
          element={
            <ProtectedRoute
              checkAuth={isShipperAuthenticated}
              redirectPath="/shop/shipper/login"
            />
          }
        >
          <Route path="/shop/shipper" element={<ShipperDashboardPage />} />
        </Route>

        {/* 404 - Redirect to home */}
        <Route path="*" element={<Navigate to="/shop/home" replace />} />
      </Routes>
    </>
  );
}

export default App;
