import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Lock, Globe, Volume2, Type, Info, ChevronRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: '50px', height: '28px', borderRadius: '14px',
        backgroundColor: on ? '#d4c4a8' : '#1a1a1a',
        border: `1px solid ${on ? '#d4c4a8' : '#2a2a2a'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'background-color 0.25s, border-color 0.25s', flexShrink: 0,
        boxShadow: on ? '0 0 10px rgba(187,134,252,0.4)' : 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: on ? '24px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%',
        backgroundColor: '#fff',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
      }} />
    </div>
  );
}

function SettingRow({ icon: Icon, label, sub, right }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowIcon}><Icon size={18} color="#d4c4a8" /></div>
      <div style={styles.rowText}>
        <span style={styles.rowLabel}>{label}</span>
        {sub && <span style={styles.rowSub}>{sub}</span>}
      </div>
      {right}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();

  const handleNotifications = (val) => {
    updateSetting('notifications', val);
    if (val && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('CommPlat Notifications Enabled', {
            body: 'You will now receive message notifications.',
            icon: '/logo.png'
          });
        }
      });
    }
  };

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <span style={styles.topTitle}>Settings</span>
        <div style={{ width: 38 }} />
      </div>

      {/* NOTIFICATIONS */}
      <span style={styles.groupLabel}>NOTIFICATIONS</span>
      <div style={styles.group}>
        <SettingRow
          icon={Bell}
          label="Push Notifications"
          sub={settings.notifications ? 'Notifications are ON' : 'Notifications are OFF'}
          right={<Toggle on={settings.notifications} onChange={handleNotifications} />}
        />
        <SettingRow
          icon={Volume2}
          label="Message Sounds"
          sub={settings.messageSound ? 'Play sound on new message' : 'Silent'}
          right={<Toggle on={settings.messageSound} onChange={v => updateSetting('messageSound', v)} />}
        />
      </div>

      {/* APPEARANCE */}
      <span style={styles.groupLabel}>APPEARANCE</span>
      <div style={styles.group}>
        <SettingRow
          icon={Moon}
          label="Dark Mode"
          sub="Pure black theme (always on)"
          right={<Toggle on={settings.darkMode} onChange={v => updateSetting('darkMode', v)} />}
        />
        <SettingRow
          icon={Type}
          label="Font Size"
          sub={settings.fontSize}
          right={
            <select
              value={settings.fontSize}
              onChange={e => updateSetting('fontSize', e.target.value)}
              style={styles.select}
            >
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          }
        />
      </div>

      {/* PRIVACY */}
      <span style={styles.groupLabel}>PRIVACY</span>
      <div style={styles.group}>
        <SettingRow
          icon={Lock}
          label="Read Receipts"
          sub={settings.readReceipts ? 'Others can see when you read messages' : 'Read receipts are hidden'}
          right={<Toggle on={settings.readReceipts} onChange={v => updateSetting('readReceipts', v)} />}
        />
      </div>

      {/* GENERAL */}
      <span style={styles.groupLabel}>GENERAL</span>
      <div style={styles.group}>
        <SettingRow
          icon={Globe}
          label="Language"
          sub={settings.language}
          right={
            <select
              value={settings.language}
              onChange={e => updateSetting('language', e.target.value)}
              style={styles.select}
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Kannada</option>
              <option>Malayalam</option>
            </select>
          }
        />
        <div style={{ ...styles.row, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
          <div style={styles.rowIcon}><Info size={18} color="#d4c4a8" /></div>
          <div style={styles.rowText}>
            <span style={styles.rowLabel}>Edit Profile</span>
            <span style={styles.rowSub}>Name, photo, status</span>
          </div>
          <ChevronRight size={16} color="#333" />
        </div>
      </div>

      {/* Live preview of applied settings */}
      <div style={styles.previewBox}>
        <span style={styles.previewLabel}>SETTINGS PREVIEW</span>
        <div style={styles.previewRow}><span style={styles.previewKey}>Notifications</span><span style={{ color: settings.notifications ? '#4caf50' : '#ff5555' }}>{settings.notifications ? 'ON' : 'OFF'}</span></div>
        <div style={styles.previewRow}><span style={styles.previewKey}>Sounds</span><span style={{ color: settings.messageSound ? '#4caf50' : '#ff5555' }}>{settings.messageSound ? 'ON' : 'OFF'}</span></div>
        <div style={styles.previewRow}><span style={styles.previewKey}>Read Receipts</span><span style={{ color: settings.readReceipts ? '#4caf50' : '#ff5555' }}>{settings.readReceipts ? 'ON' : 'OFF'}</span></div>
        <div style={styles.previewRow}><span style={styles.previewKey}>Font Size</span><span style={{ color: '#d4c4a8' }}>{settings.fontSize}</span></div>
        <div style={styles.previewRow}><span style={styles.previewKey}>Language</span><span style={{ color: '#d4c4a8' }}>{settings.language}</span></div>
      </div>

      {/* App Info */}
      <div style={styles.appInfo}>
        <img src="/logo.png" alt="logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
        <span style={styles.appName}>CommPlat</span>
        <span style={styles.appVersion}>Version 1.0.0 · All settings saved automatically</span>
      </div>
    </div>
  );
}

const styles = {
  page: { height: '100%', overflowY: 'auto', backgroundColor: '#000', paddingBottom: '80px' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #111'
  },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' },
  topTitle: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  groupLabel: {
    display: 'block', fontSize: '11px', color: '#333',
    fontWeight: '700', letterSpacing: '1.5px',
    padding: '20px 16px 8px'
  },
  group: {
    backgroundColor: '#0a0a0a', borderRadius: '14px',
    margin: '0 14px', overflow: 'hidden', border: '1px solid #111'
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', borderBottom: '1px solid #0d0d0d'
  },
  rowIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    backgroundColor: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  rowText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  rowLabel: { color: '#fff', fontWeight: '600', fontSize: '15px' },
  rowSub: { color: '#444', fontSize: '12px' },
  select: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
    color: '#d4c4a8', padding: '6px 10px', fontSize: '13px',
    cursor: 'pointer', outline: 'none'
  },
  previewBox: {
    margin: '20px 14px 0',
    backgroundColor: '#0a0a0a', border: '1px solid #111',
    borderRadius: '14px', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: '10px'
  },
  previewLabel: { fontSize: '11px', color: '#333', fontWeight: '700', letterSpacing: '1.5px' },
  previewRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  previewKey: { color: '#555', fontSize: '13px' },
  appInfo: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '32px 16px', gap: '8px'
  },
  appName: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  appVersion: { color: '#333', fontSize: '12px', textAlign: 'center' }
};
