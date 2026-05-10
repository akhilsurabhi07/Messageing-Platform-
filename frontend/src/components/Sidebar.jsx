import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UsersRound, MessageSquare, Bell, Settings, Radio } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const isAdmin = user?.role === 'admin';
  const prefix = isAdmin ? '/admin' : '/user';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Radio size={24} />
        <span>BroadcastHub</span>
      </div>

      <nav className="sidebar-nav">
        {isAdmin ? (
          <>
            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={20} />
              Users
            </NavLink>
            <NavLink to="/admin/groups" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <UsersRound size={20} />
              Groups
            </NavLink>
            <NavLink to="/admin/messages" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <MessageSquare size={20} />
              Messages
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/user/inbox" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <MessageSquare size={20} />
              Inbox
            </NavLink>
            <NavLink to="/user/notifications" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Bell size={20} />
              Notifications
            </NavLink>
          </>
        )}

      </nav>

      <div className="sidebar-footer">
        <div className="avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="user-info flex-1">
          <span className="user-name">{user?.name}</span>
          <span className="user-email">{user?.email}</span>
        </div>
        <button className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={logout}>
          Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
