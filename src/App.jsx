// App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoaderProvider } from "./context/LoaderContext";

// Pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute";

// Products
import AddProducts from "./pages/Products/AddProducts";
import GetAllProduct from "./pages/Products/GetAllProduct";

// Customers
import AddCustomers from "./pages/customers/AddCustomers";
import GetAllCustomer from "./pages/customers/GetAllCustomer";

// Expenses
import CreateExpense from "./pages/Expenses/CreateExpense";
import Expenses from "./pages/Expenses/Expenses";
import Revenue from "./pages/Revenue/Revenue";

// Orders
import CreateOrder from "./pages/Orders/CreateOrder";
import WalkInCustomer from "./pages/Orders/WalkInCustomer";
import OrdersList from "./pages/Orders/OrdersList";
import OutstandingCustomers from "./pages/Orders/OutstandingCustomers";
import EditOrder from "./pages/Orders/EditOrder";

// Admin
import Admin from "./pages/Admin/Admin";
import Upload from "./pages/Admin/Upload";

function App() {
  return (
    <BrowserRouter>
      {/* 🔥 GLOBAL SPLASH / SERVER WAKE LOADER */}
      <LoaderProvider>
        <Routes>
          {/* ---------- Public Routes ---------- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/userorders" element={<Upload />} />

          {/* ---------- Protected Routes ---------- */}
          <Route
            path="/register"
            element={
              <ProtectedRoute>
                <RegisterPage />
              </ProtectedRoute>
            }
          />

          {/* Products */}
          <Route
            path="/addproduct"
            element={
              <ProtectedRoute>
                <AddProducts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/viewproduct"
            element={
              <ProtectedRoute>
                <GetAllProduct />
              </ProtectedRoute>
            }
          />

          {/* Customers */}
          <Route
            path="/addcustomer"
            element={
              <ProtectedRoute>
                <AddCustomers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/viewcustomer"
            element={
              <ProtectedRoute>
                <GetAllCustomer />
              </ProtectedRoute>
            }
          />

          {/* Expenses */}
          <Route
            path="/expense/create"
            element={
              <ProtectedRoute>
                <CreateExpense />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expense"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/revenue"
            element={
              <ProtectedRoute>
                <Revenue />
              </ProtectedRoute>
            }
          />

          {/* Orders */}
          <Route
            path="/orderlist"
            element={
              <ProtectedRoute>
                <OrdersList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/outstanding"
            element={
              <ProtectedRoute>
                <OutstandingCustomers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id/edit"
            element={
              <ProtectedRoute>
                <EditOrder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/createorder"
            element={
              <ProtectedRoute>
                <CreateOrder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/walk"
            element={
              <ProtectedRoute>
                <WalkInCustomer />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/liveorder"
            element={
              <ProtectedRoute role="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </LoaderProvider>
    </BrowserRouter>
  );
}

export default App;
