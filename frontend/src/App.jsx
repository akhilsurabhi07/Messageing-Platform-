import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Messages from './pages/Messages';
import Users from './pages/Users';
import Inbox from './pages/Inbox';
import Notifications from './pages/Notifications';

const ProtectedRoute = ({ children, role }) => {
  const { user } = React.useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/user/inbox'} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="groups" element={<Groups />} />
              <Route path="messages" element={<Messages />} />
              <Route path="users" element={<Users />} />
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* User Routes */}
            <Route path="/user" element={
              <ProtectedRoute role="user">
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="inbox" element={<Inbox />} />
              <Route path="notifications" element={<Notifications />} />
              <Route index element={<Navigate to="/user/inbox" replace />} />
            </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </AuthProvider>
);
}

export default App;
