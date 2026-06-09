import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Phone, Video, Bell, BellOff, Users, Mail, CircleDot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ContactProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { allUsers, allGroups, currentUser } = useAuth();

  // Look up real user or group from Firestore data
  const user = allUsers.find(u => u.uid === id);
  const group = allGroups.find(g => g.id === id);
  const stateData = location.state || {};

  // Build contact object from real data, falling back to location.state
  const isGroup = group ? true : (stateData.isGroup || false);
  const contact = group
    ? {
        id: group.id,
        isGroup: true,
        name: group.name,
        status: 'Active group',
        members: group.members || [],
        email: null,
        role: null,
        online: true,
      }
    : user
    ? {
        id: user.uid,
        isGroup: false,
        name: user.name,
        status: 'Available',
        email: user.email,
        role: user.role,
        online: user.isOnline || false,
      }
    : {
        id,
        isGroup: stateData.isGroup || false,
        name: stateData.name || 'Unknown',
        status: stateData.isGroup ? 'Group' : 'Available',
        members: [],
        email: null,
        role: null,
        online: false,
      };

  // Resolve member names for groups (look up by uid in allUsers)
  const memberNames = isGroup
    ? contact.members.map(uid => {
        const u = allUsers.find(x => x.uid === uid);
        return u ? u.name : uid;
      })
    : [];

  // Load saved profile data (status, jobTitle set by the user themselves)
  const savedProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`profile_${id}`) || '{}'); } catch { return {}; }
  })();
  const displayName = savedProfile.name || contact.name;
  const displayStatus = savedProfile.status || contact.status;
  const displayEmail = savedProfile.email || contact.email;
  const jobTitle = savedProfile.jobTitle || '';

  // Mute state for this chat
  const [muted, setMuted] = React.useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('muted_chats') || '[]');
      return list.includes(id);
    } catch { return false; }
  });

  const toggleMute = () => {
    const list = JSON.parse(localStorage.getItem('muted_chats') || '[]');
    const next = muted ? list.filter(m => m !== id) : [...list, id];
    localStorage.setItem('muted_chats', JSON.stringify(next));
    setMuted(!muted);
  };

  const initials = contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <span style={styles.topTitle}>{contact.isGroup ? 'Group Info' : 'Contact Info'}</span>
        <div style={{ width: 38 }} />
      </div>

      {/* Avatar + Name + Status */}
      <div style={styles.hero}>
        <div style={{ ...styles.avatar, background: contact.isGroup ? 'linear-gradient(135deg, #1a1a2e, #3a3a5e)' : (user?.profilePic ? 'none' : 'linear-gradient(135deg, #1a2e1a, #2a4a2a)') }}>
          {contact.isGroup ? <Users size={44} color="#d4c4a8" /> : (user?.profilePic ? <img src={user.profilePic} alt={contact.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : <span style={styles.avatarText}>{initials}</span>)}
        </div>
        <h2 style={styles.heroName}>{displayName}</h2>
        {jobTitle && <span style={styles.jobTitleBadge}>{jobTitle}</span>}
        <div style={styles.onlineRow}>
          <CircleDot size={12} color={contact.online ? '#4caf50' : '#555'} />
          <span style={{ ...styles.statusText, color: contact.online ? '#4caf50' : '#555' }}>
            {contact.online ? 'Online' : 'Offline'}
          </span>
        </div>
        {displayStatus && <p style={styles.statusMsg}>"{displayStatus}"</p>}
      </div>

      {/* Quick Action Buttons */}
      <div style={styles.quickActions}>
        <button style={styles.qBtn} onClick={() => navigate(`/chat/${id}`, { state: { name: contact.name, isGroup: contact.isGroup } })}>
          <MessageSquare size={22} color="#d4c4a8" />
          <span style={styles.qLabel}>Message</span>
        </button>
        {!contact.isGroup && (
          <>
            <button style={styles.qBtn} onClick={() => navigate('/call', { state: { name: contact.name, isVideo: false } })}>
              <Phone size={22} color="#d4c4a8" />
              <span style={styles.qLabel}>Call</span>
            </button>
            <button style={styles.qBtn} onClick={() => navigate('/call', { state: { name: contact.name, isVideo: true } })}>
              <Video size={22} color="#d4c4a8" />
              <span style={styles.qLabel}>Video</span>
            </button>
          </>
        )}
        <button style={styles.qBtn} onClick={toggleMute}>
          {muted ? <Bell size={22} color="#aaa" /> : <BellOff size={22} color="#aaa" />}
          <span style={{ ...styles.qLabel, color: '#aaa' }}>{muted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>

      {/* Contact Details */}
      {!contact.isGroup && (
        <div style={styles.section}>
          <span style={styles.sectionLabel}>CONTACT DETAILS</span>
          <div style={styles.detailCard}>
            {displayEmail && (
              <div style={styles.detailRow}>
                <Mail size={16} color="#d4c4a8" />
                <div style={styles.detailText}>
                  <span style={styles.detailVal}>{displayEmail}</span>
                  <span style={styles.detailSub}>Work email</span>
                </div>
              </div>
            )}
            {contact.role && (
              <div style={styles.detailRow}>
                <CircleDot size={16} color="#d4c4a8" />
                <div style={styles.detailText}>
                  <span style={styles.detailVal} style={{ textTransform: 'capitalize' }}>{contact.role}</span>
                  <span style={styles.detailSub}>Role</span>
                </div>
              </div>
            )}
            {jobTitle && (
              <div style={styles.detailRow}>
                <CircleDot size={16} color="#d4c4a8" />
                <div style={styles.detailText}>
                  <span style={styles.detailVal}>{jobTitle}</span>
                  <span style={styles.detailSub}>Job Title</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group Members */}
      {contact.isGroup && memberNames.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionLabel}>{memberNames.length} MEMBERS</span>
          <div style={styles.detailCard}>
            {memberNames.map((memberName, i) => {
              const memberUser = allUsers.find(u => contact.members[i] === u.uid);
              return (
                <div key={i} style={{ ...styles.memberRow, borderBottom: i < memberNames.length - 1 ? '1px solid #0d0d0d' : 'none' }}>
                  <div style={styles.memberAvatar}>
                    {memberUser?.profilePic ? <img src={memberUser.profilePic} alt={memberName} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : memberName.charAt(0)}
                  </div>
                  <span style={styles.memberName}>{memberName}</span>
                  {contact.members[i] === currentUser?.uid && <span style={styles.adminTag}>You</span>}
                  {memberUser?.role === 'superadmin' && <span style={styles.adminTag}>Admin</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mute status indicator */}
      {muted && (
        <div style={styles.mutedBanner}>
          <BellOff size={14} color="#d4c4a8" />
          <span style={{ color: '#d4c4a8', fontSize: 13 }}>Notifications muted for this chat</span>
          <button style={styles.unmuteBtn} onClick={toggleMute}>Unmute</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { height: '100%', overflowY: 'auto', backgroundColor: '#000', paddingBottom: 80 },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #111' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  topTitle: { color: '#fff', fontWeight: '700', fontSize: '18px' },

  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 20px', gap: 10 },
  avatar: { width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #d4c4a833' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 36 },
  heroName: { color: '#fff', fontWeight: '700', fontSize: 22, margin: 0 },
  jobTitleBadge: { fontSize: 12, color: '#d4c4a8', backgroundColor: '#d4c4a811', border: '1px solid #d4c4a833', padding: '4px 14px', borderRadius: 20, fontWeight: 700 },
  onlineRow: { display: 'flex', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusMsg: { color: '#444', fontSize: 14, fontStyle: 'italic', margin: 0, textAlign: 'center', paddingLeft: 16, paddingRight: 16 },

  quickActions: { display: 'flex', justifyContent: 'space-around', padding: '16px 20px', borderBottom: '1px solid #0d0d0d' },
  qBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', cursor: 'pointer', padding: '10px 16px', borderRadius: 12, backgroundColor: '#0a0a0a', border: '1px solid #111' },
  qLabel: { color: '#d4c4a8', fontSize: 11, fontWeight: '700', fontFamily: 'inherit' },

  section: { padding: '0 14px', marginTop: 20 },
  sectionLabel: { display: 'block', fontSize: '11px', color: '#333', fontWeight: '700', letterSpacing: '1.5px', marginBottom: 8 },
  detailCard: { backgroundColor: '#0a0a0a', borderRadius: 14, border: '1px solid #111', overflow: 'hidden' },
  detailRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid #0d0d0d' },
  detailText: { display: 'flex', flexDirection: 'column', gap: 2 },
  detailVal: { color: '#fff', fontSize: 15, fontWeight: '500' },
  detailSub: { color: '#444', fontSize: 12 },

  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' },
  memberAvatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #2a2a4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4c4a8', fontWeight: '700', fontSize: 15, flexShrink: 0 },
  memberName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  adminTag: { fontSize: 11, color: '#d4c4a8', backgroundColor: '#d4c4a811', border: '1px solid #d4c4a833', padding: '2px 8px', borderRadius: 6, fontWeight: 700 },

  mutedBanner: { margin: '16px 14px 0', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 12, padding: '12px 16px', border: '1px solid #d4c4a822' },
  unmuteBtn: { marginLeft: 'auto', background: 'none', border: '1px solid #d4c4a844', color: '#d4c4a8', fontSize: 12, fontWeight: '700', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
};
