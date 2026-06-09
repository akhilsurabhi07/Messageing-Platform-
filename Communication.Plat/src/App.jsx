import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import Meetings from './pages/Meetings';
import MeetingRoom from './pages/MeetingRoom';
import CalendarView from './pages/CalendarView';
import Calls from './pages/Calls';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import ContactProfile from './pages/ContactProfile';
import CallScreen from './pages/CallScreen';

import { MeetingProvider } from './contexts/MeetingContext';

function PrivateRoute({ children }) {
  const { firebaseUser } = useAuth();
  return firebaseUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MeetingProvider>
          <Router>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Full-screen — outside app shell */}
                <Route path="/call" element={<PrivateRoute><CallScreen /></PrivateRoute>} />
                
                {/* Protected App Shell */}
                <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                  <Route index element={<ChatList />} />
                  <Route path="chat/:id" element={<ChatRoom />} />
                  <Route path="meetings" element={<Meetings />} />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="calls" element={<Calls />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin" element={<AdminPanel />} />
                  <Route path="contact/:id" element={<ContactProfile />} />
                </Route>
              </Routes>
              
              {/* Global Overlays */}
              <MeetingRoom />
            </ErrorBoundary>
          </Router>
        </MeetingProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
