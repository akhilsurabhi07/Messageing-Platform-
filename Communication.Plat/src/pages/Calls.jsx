import React, { useState } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video, Search } from 'lucide-react';

const callHistory = [
  { id: 1, name: 'Rahul Sharma', type: 'incoming', time: 'Today, 2:30 PM', duration: '5 min', isVideo: false },
  { id: 2, name: 'Engineering Team', type: 'outgoing', time: 'Today, 11:00 AM', duration: '22 min', isVideo: true },
  { id: 3, name: 'Sarah Jenkins', type: 'missed', time: 'Yesterday, 4:15 PM', duration: null, isVideo: false },
  { id: 4, name: 'Priya Nair', type: 'incoming', time: 'Yesterday, 1:00 PM', duration: '8 min', isVideo: false },
  { id: 5, name: 'Design Sync', type: 'outgoing', time: 'Mon, 3:00 PM', duration: '45 min', isVideo: true },
  { id: 6, name: 'Arjun Mehta', type: 'missed', time: 'Mon, 9:30 AM', duration: null, isVideo: false },
];

function CallIcon({ type }) {
  if (type === 'incoming') return <PhoneIncoming size={16} color="#4caf50" />;
  if (type === 'outgoing') return <PhoneOutgoing size={16} color="#d4c4a8" />;
  return <PhoneMissed size={16} color="#ff5555" />;
}

export default function Calls() {
  const [search, setSearch] = useState('');
  const filtered = callHistory.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Calls</h1>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <Search size={16} color="#444" />
        <input
          placeholder="Search calls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Call History */}
      <div style={styles.list}>
        <span style={styles.sectionLabel}>RECENT</span>
        {filtered.map(call => (
          <div key={call.id} style={styles.callItem}>
            {/* Avatar */}
            <div style={styles.avatar}>
              {call.name.charAt(0)}
            </div>

            {/* Info */}
            <div style={styles.callInfo}>
              <span style={{
                ...styles.callName,
                color: call.type === 'missed' ? '#ff5555' : '#fff'
              }}>
                {call.name}
              </span>
              <div style={styles.callMeta}>
                <CallIcon type={call.type} />
                <span style={styles.callTime}>{call.time}</span>
                {call.duration && <span style={styles.callDuration}>· {call.duration}</span>}
              </div>
            </div>

            {/* Call back button */}
            <button
              style={styles.callBackBtn}
              title={call.isVideo ? 'Video Call' : 'Voice Call'}
            >
              {call.isVideo
                ? <Video size={20} color="#d4c4a8" />
                : <Phone size={20} color="#d4c4a8" />}
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={styles.empty}>No call records found</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { height: '100%', overflowY: 'auto', backgroundColor: '#000' },
  pageHeader: {
    padding: '20px 16px 12px',
    borderBottom: '1px solid #111'
  },
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    margin: '12px 16px',
    backgroundColor: '#0d0d0d', borderRadius: '12px',
    padding: '10px 14px', border: '1px solid #1a1a1a'
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none',
    color: '#fff', fontSize: '14px', outline: 'none'
  },
  list: { padding: '0 0 80px' },
  sectionLabel: {
    display: 'block', fontSize: '11px', color: '#333',
    fontWeight: '700', letterSpacing: '1.5px',
    padding: '8px 16px 10px'
  },
  callItem: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px 16px', borderBottom: '1px solid #0d0d0d',
    cursor: 'pointer', transition: 'background-color 0.15s'
  },
  avatar: {
    width: '48px', height: '48px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a1a2e, #2a2a4a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: '700', fontSize: '18px', flexShrink: 0
  },
  callInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  callName: { fontSize: '16px', fontWeight: '600' },
  callMeta: { display: 'flex', alignItems: 'center', gap: '6px' },
  callTime: { fontSize: '12px', color: '#444' },
  callDuration: { fontSize: '12px', color: '#333' },
  callBackBtn: {
    width: '42px', height: '42px', borderRadius: '50%',
    backgroundColor: '#1a1a2e', border: '1px solid #d4c4a822',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0
  },
  empty: { color: '#333', textAlign: 'center', padding: '40px 0', fontSize: '14px' }
};
