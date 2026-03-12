/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import CustomerMenu from './pages/CustomerMenu';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import OrderTracking from './pages/OrderTracking';
import Receipt from './pages/Receipt';
import React, { useEffect } from 'react';
import { db } from './lib/db';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function AppInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Seed initial data to Supabase if tables are empty
    db.seedInitialData();
  }, []);
  return <>{children}</>;
}

export default function App() {
  return (
    <LanguageProvider>
      <CartProvider>
        <AuthProvider>
          <AppInit>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<CustomerMenu />} />
                <Route path="/order/:orderId" element={<OrderTracking />} />
                <Route path="/receipt/:orderId" element={<Receipt />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </AppInit>
        </AuthProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
