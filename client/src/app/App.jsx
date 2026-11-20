import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './providers/AuthContext';
import { AppRouter } from './router';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 999999 }} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
