import React, { useContext } from 'react';
import { Moon, Sun, User, Mail, Shield, LogOut, Palette, Check } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-8">
        <h1>Settings</h1>
        <p className="subtitle">Manage your account preferences and application theme</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Appearance Section */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Palette size={20} color="var(--info)" />
            <h2 className="m-0">Appearance</h2>
          </div>
          
          <div className="flex justify-between items-center p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
            <div>
              <div className="font-semibold mb-1">Theme Mode</div>
              <div className="text-xs text-muted">Switch between light and dark visual styles</div>
            </div>
            
            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-full shadow-inner" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => isDarkMode && toggleTheme()}
                className={`p-2 rounded-full transition-all flex items-center gap-2 px-4 ${!isDarkMode ? 'bg-primary text-primary-contrast shadow-sm' : 'text-muted hover:text-main'}`}
                style={{ 
                  backgroundColor: !isDarkMode ? 'var(--primary)' : 'transparent',
                  color: !isDarkMode ? 'var(--primary-contrast)' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                <Sun size={16} />
                <span className="text-xs font-bold">LIGHT</span>
                {!isDarkMode && <Check size={12} />}
              </button>
              <button 
                onClick={() => !isDarkMode && toggleTheme()}
                className={`p-2 rounded-full transition-all flex items-center gap-2 px-4 ${isDarkMode ? 'bg-primary text-primary-contrast shadow-sm' : 'text-muted hover:text-main'}`}
                style={{ 
                  backgroundColor: isDarkMode ? 'var(--primary)' : 'transparent',
                  color: isDarkMode ? 'var(--primary-contrast)' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                <Moon size={16} />
                <span className="text-xs font-bold">DARK</span>
                {isDarkMode && <Check size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <User size={20} color="var(--success)" />
            <h2 className="m-0">Account Profile</h2>
          </div>
          
          <div className="flex items-center gap-5 mb-8 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--bg-main) 0%, var(--bg-card) 100%)', border: '1px solid var(--border-color)' }}>
            <div className="avatar" style={{ width: '72px', height: '72px', fontSize: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="m-0 text-xl font-bold">{user?.name}</h3>
                <span style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.15rem 0.5rem', 
                  backgroundColor: user?.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                  color: user?.role === 'admin' ? '#3b82f6' : 'inherit',
                  borderRadius: '100px',
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  {user?.role?.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-muted">{user?.email}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="p-4 rounded-xl" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
              <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase mb-2">
                <Mail size={14} /> Email Verified
              </div>
              <div className="font-medium flex items-center gap-2">
                {user?.email}
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                  <Check size={10} color="white" />
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
              <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase mb-2">
                <Shield size={14} /> Security Status
              </div>
              <div className="font-medium">Protected by Firebase</div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <LogOut size={20} color="var(--danger)" />
            <h2 className="m-0" style={{ color: 'var(--danger)' }}>Account Actions</h2>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted m-0">Sign out of your account on this device</p>
            <button className="btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.5rem 1.5rem' }} onClick={logout}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
