import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Video, Calendar, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { userData } = useAuth();

  const navItems = [
    { path: '/', label: 'Chats', icon: MessageSquare, exact: true },
    { path: '/meetings', label: 'Meetings', icon: Video },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/calls', label: 'Calls', icon: Phone },
  ];

  return (
    <div style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>C</div>
        <span style={styles.brandName}>CommPlat</span>
      </div>

      {/* Nav Items */}
      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive ? '#1a1a2e' : 'transparent',
              color: isActive ? '#d4c4a8' : '#555',
              borderLeft: isActive ? '3px solid #d4c4a8' : '3px solid transparent',
            })}
          >
            <item.icon size={22} />
            <span style={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Badge at bottom */}
      <div style={styles.userBadge}>
        <div style={styles.userAvatar}>
          {userData?.profilePic
            ? <img src={userData.profilePic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : (userData?.name?.charAt(0)?.toUpperCase() || 'U')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.userName}>{userData?.name || 'User'}</div>
          <div style={styles.userRole}>{userData?.jobTitle || userData?.role || 'employee'}</div>
        </div>
        {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
          <span style={styles.adminBadge}>Admin</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: '#242424', overflow: 'hidden'
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '22px 20px', borderBottom: '1px solid #111'
  },
  brandIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #d4c4a8, #b3a388)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: '800', fontSize: '18px', flexShrink: 0
  },
  brandName: { fontSize: '20px', fontWeight: '700', color: '#fff' },
  nav: { display: 'flex', flexDirection: 'column', padding: '12px 0', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 20px', textDecoration: 'none',
    fontSize: '15px', fontWeight: '500',
    transition: 'all 0.15s ease'
  },
  label: { fontSize: '15px' },
  userBadge: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px 20px', borderTop: '1px solid #111',
    backgroundColor: '#0a0a0a'
  },
  userAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4c4a844, #b3a38844)',
    border: '2px solid #d4c4a844',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#d4c4a8', fontWeight: '700', fontSize: '16px', flexShrink: 0
  },
  userName: { color: '#fff', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { color: '#444', fontSize: '12px', textTransform: 'capitalize' },
  adminBadge: {
    backgroundColor: '#d4c4a822', color: '#d4c4a8',
    border: '1px solid #d4c4a844', fontSize: '11px',
    fontWeight: '700', padding: '3px 8px', borderRadius: '6px', flexShrink: 0
  }
};
