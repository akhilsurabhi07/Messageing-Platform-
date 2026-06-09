import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Video, Calendar, Phone } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Chats', icon: MessageSquare, exact: true },
  { path: '/meetings', label: 'Meetings', icon: Video },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/calls', label: 'Calls', icon: Phone },
];

export default function MobileNav() {
  return (
    <div style={styles.bottomNav}>
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.exact}
          style={({ isActive }) => ({
            ...styles.navItem,
            color: isActive ? '#d4c4a8' : '#444',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ ...styles.iconWrap, backgroundColor: isActive ? '#1a1a2e' : 'transparent' }}>
                <item.icon size={22} />
              </div>
              <span style={styles.label}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

const styles = {
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '68px',
    backgroundColor: '#242424', borderTop: '1px solid #111',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    zIndex: 100
  },
  navItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textDecoration: 'none', gap: '3px',
    flex: 1, height: '100%'
  },
  iconWrap: {
    width: '44px', height: '30px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  label: { fontSize: '11px', fontWeight: '600' }
};
