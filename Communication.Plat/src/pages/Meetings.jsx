import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Users, User, Clock, Lock, ChevronRight, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeetingContext } from '../contexts/MeetingContext';

import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';

// ---- Create Meeting Modal ----
function CreateMeetingModal({ onClose }) {
  const { allUsers, allGroups, currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [tab, setTab] = useState('contacts'); // 'contacts' | 'groups'
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState(1); // 1=details, 2=participants
  const navigate = useNavigate();
  const { joinMeeting } = useMeetingContext();

  // Filter out current user from contacts, with fallbacks for safety
  const contactsList = (allUsers || []).filter(u => u.uid !== currentUser?.uid && !u.disabled).map(u => ({ ...u, id: u.uid, type: 'contact' }));
  const groupsList = (allGroups || []).map(g => ({ ...g, type: 'group', memberCount: g.members?.length || 0 }));

  const toggleSelect = (item) => {
    const exists = selected.find(s => s.id === item.id);
    if (exists) setSelected(selected.filter(s => s.id !== item.id));
    else setSelected([...selected, item]);
  };

  const isSelected = (id) => selected.some(s => s.id === id);

  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
    if (!title.trim() || selected.length === 0 || !meetingTime || creating) return;
    setCreating(true);
    
    try {
      const meetingData = {
        title: title.trim(),
        time: meetingTime,
        hostId: currentUser?.uid,
        hostName: currentUser?.name || 'Admin',
        participants: selected.map(s => ({ id: s.id, name: s.name, type: s.type })),
        participantIds: selected.map(s => s.id),
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      
      // Send notifications to all participants
      const allTargetUserIds = new Set();
      selected.forEach(s => {
        if (s.type === 'contact') {
          allTargetUserIds.add(s.id);
        } else if (s.type === 'group') {
          const groupData = (allGroups || []).find(g => g.id === s.id);
          if (groupData && groupData.members) {
            groupData.members.forEach(memberId => allTargetUserIds.add(memberId));
          }
        }
      });
      allTargetUserIds.delete(currentUser?.uid); // Don't notify the host

      const notifPromises = Array.from(allTargetUserIds).map(uid => 
        addDoc(collection(db, `users/${uid}/notifications`), {
          type: 'meeting_invite',
          meetingId: docRef.id,
          title: `Invited to Meeting: ${title.trim()}`,
          body: `You have been invited to a meeting. Join from the Meetings section.`,
          read: false,
          createdAt: serverTimestamp(),
          link: '/meetings'
        })
      );
      await Promise.all(notifPromises);

      onClose();
      joinMeeting({ id: docRef.id, title, time: meetingTime, participants: selected });
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>
            {step === 1 ? 'New Meeting' : 'Select Participants'}
          </span>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} color="#fff" /></button>
        </div>

        {/* Step 1: Meeting Title & Time */}
        {step === 1 && (
          <div style={styles.modalBody}>
            <label style={styles.label}>Meeting Title</label>
            <input
              type="text"
              placeholder="e.g. Weekly Sprint Review"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>Meeting Time</label>
            <input
              type="datetime-local"
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
              style={styles.input}
            />

            <button
              style={{ ...styles.primaryBtn, opacity: (title.trim() && meetingTime) ? 1 : 0.5 }}
              disabled={!title.trim() || !meetingTime}
              onClick={() => setStep(2)}
            >
              Next: Select Participants <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Select Participants */}
        {step === 2 && (
          <div style={styles.modalBody}>
            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                style={{ ...styles.tab, ...(tab === 'contacts' ? styles.tabActive : {}) }}
                onClick={() => setTab('contacts')}
              >
                <User size={14} /> Contacts
              </button>
              <button
                style={{ ...styles.tab, ...(tab === 'groups' ? styles.tabActive : {}) }}
                onClick={() => setTab('groups')}
              >
                <Users size={14} /> Groups
              </button>
            </div>

            {/* List */}
            <div style={styles.participantList}>
              {(tab === 'contacts' ? contactsList : groupsList).map(item => (
                <div
                  key={item.id}
                  style={{ ...styles.participantItem, ...(isSelected(item.id) ? styles.participantSelected : {}) }}
                  onClick={() => toggleSelect(item)}
                >
                  <div style={styles.pAvatar}>
                    {item.type === 'group' ? <Users size={18} color="#d4c4a8" /> : (item.profilePic ? <img src={item.profilePic} alt={item.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : (item.name || 'U').charAt(0).toUpperCase())}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.pName}>{item.name}</div>
                    {item.type === 'group' && <div style={styles.pSub}>{item.memberCount} members</div>}
                    {item.role && <div style={styles.pSub}>{item.role}</div>}
                  </div>
                  {isSelected(item.id) && (
                    <div style={styles.checkCircle}><Check size={14} color="#000" /></div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected count + Start */}
            <div style={styles.modalFooter}>
              <span style={styles.selectedCount}>
                {selected.length > 0 ? `${selected.length} selected` : 'Select at least one'}
              </span>
              <button
                style={{ ...styles.primaryBtn, opacity: (selected.length > 0 && !creating) ? 1 : 0.5 }}
                disabled={selected.length === 0 || creating}
                onClick={handleStart}
              >
                <Video size={16} /> {creating ? 'Creating...' : 'Start Meeting'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Meeting Card ----
function MeetingCard({ meeting, isPast = false }) {
  const [now, setNow] = useState(new Date());
  const { joinMeeting } = useMeetingContext();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000); // update every 10s
    return () => clearInterval(interval);
  }, []);

  const safeFormatDate = (timeStr) => {
    if (!timeStr) return 'No time set';
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return String(timeStr);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const meetTime = meeting.time ? new Date(meeting.time) : new Date(0);
  const isEarly = !isNaN(meetTime.getTime()) && meetTime > now && !isPast;

  return (
    <div style={{ ...styles.card, opacity: isPast ? 0.7 : 1 }}>
      <div style={styles.cardIconBox}>
        <Video size={22} color={isPast ? "#666" : "#d4c4a8"} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.cardTitle}>{meeting.title}</div>
        <div style={styles.cardSub}>
          <Clock size={12} color="#666" /> {safeFormatDate(meeting.time)}
        </div>
        <div style={styles.cardSub}>
          <Users size={12} color="#666" /> {(meeting.participants || []).map(p => p.name || p).join(', ') || 'No participants'}
        </div>
      </div>
      <button 
        style={{ 
          ...styles.joinBtn, 
          opacity: isPast || isEarly ? 0.5 : 1, 
          cursor: isPast || isEarly ? 'not-allowed' : 'pointer',
          backgroundColor: isPast || isEarly ? 'transparent' : '#1a1a2e'
        }} 
        onClick={() => !isPast && !isEarly && joinMeeting(meeting)}
        disabled={isPast || isEarly}
      >
        {isPast ? 'Ended' : (isEarly ? 'Starts later' : 'Join')}
      </button>
    </div>
  );
}

export default function Meetings() {
  const { userData, allGroups, allUsers, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [meetingsList, setMeetingsList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    const q = query(collection(db, 'meetings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const filtered = msgs.filter(m => {
         if (isAdmin) return true;
         if (m.hostId === userData.uid) return true;
         if (Array.isArray(m.participantIds) && m.participantIds.includes(userData.uid)) return true;
         
         const userGroups = (allGroups || []).filter(g => g.members?.includes(userData.uid)).map(g => g.id);
         return userGroups.some(gid => Array.isArray(m.participantIds) && m.participantIds.includes(gid));
      });
      
      filtered.sort((a, b) => {
        const timeA = a.time ? new Date(a.time).getTime() : 0;
        const timeB = b.time ? new Date(b.time).getTime() : 0;
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      });
      setMeetingsList(filtered);
    });
    return () => unsubscribe();
  }, [userData, isAdmin, allGroups]);

  const now = new Date();
  const activeDuration = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  
  const upcomingMeetings = meetingsList.filter(m => {
    if (m.status === 'ended') return false;
    if (!m.time) return false;
    const d = new Date(m.time);
    if (isNaN(d.getTime())) return false; 
    // A meeting is upcoming/active if we are currently BEFORE (start time + 4 hours)
    return now.getTime() < d.getTime() + activeDuration;
  });
  
  const pastMeetings = meetingsList.filter(m => {
    if (m.status === 'ended') return true;
    if (!m.time) return false;
    const d = new Date(m.time);
    if (isNaN(d.getTime())) return true; 
    // A meeting is past ONLY if it's been more than 4 hours since start time
    return now.getTime() >= d.getTime() + activeDuration;
  }).reverse(); // newest past first

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Meetings</h1>
        {isAdmin ? (
          <button style={styles.createBtn} onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Meeting
          </button>
        ) : (
          <div style={styles.lockBadge}>
            <Lock size={14} color="#666" />
            <span style={{ color: '#555', fontSize: '13px' }}>Admin only</span>
          </div>
        )}
      </div>

      {/* Upcoming Meetings */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>UPCOMING</span>
        {upcomingMeetings.map(m => (
          <MeetingCard key={m.id} meeting={m} />
        ))}
      </div>

      {/* Past Meetings */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>PAST (HISTORY)</span>
        {pastMeetings.map(m => (
          <MeetingCard key={m.id} meeting={m} isPast />
        ))}
      </div>

      {/* Empty state for non-admins */}
      {!isAdmin && (
        <div style={styles.emptyNote}>
          <Lock size={40} color="#222" />
          <p style={{ color: '#444', marginTop: '12px', textAlign: 'center' }}>
            Only Admins can create meetings.<br />You can join meetings you are invited to.
          </p>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showModal && <CreateMeetingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

const styles = {
  page: { padding: '0', overflowY: 'auto', height: '100%', backgroundColor: '#000' },
  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px 10px', borderBottom: '1px solid #111'
  },
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#d4c4a8', color: '#000', fontWeight: '700',
    padding: '10px 18px', borderRadius: '12px', fontSize: '14px',
    cursor: 'pointer', border: 'none'
  },
  lockBadge: { display: 'flex', alignItems: 'center', gap: '6px' },
  section: { padding: '16px' },
  sectionLabel: { fontSize: '11px', color: '#444', fontWeight: '700', letterSpacing: '1px', display: 'block', marginBottom: '12px' },
  card: {
    display: 'flex', alignItems: 'center', gap: '14px',
    backgroundColor: '#0d0d0d', borderRadius: '14px',
    padding: '14px 16px', marginBottom: '10px',
    border: '1px solid #1a1a1a'
  },
  cardIconBox: {
    width: '46px', height: '46px', borderRadius: '12px',
    backgroundColor: '#1a1a2e', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  cardTitle: { color: '#fff', fontWeight: '600', fontSize: '15px', marginBottom: '4px' },
  cardSub: { color: '#555', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' },
  joinBtn: {
    backgroundColor: '#1a1a2e', color: '#d4c4a8',
    border: '1px solid #d4c4a833', borderRadius: '10px',
    padding: '8px 16px', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
  },
  emptyNote: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 20px'
  },
  // Modal styles
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999
  },
  modal: {
    backgroundColor: '#0d0d0d', borderRadius: '20px',
    border: '1px solid #222', width: '90%', maxWidth: '420px',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: '1px solid #1a1a1a'
  },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { color: '#888', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
  input: {
    backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '12px', padding: '14px 16px',
    color: '#fff', fontSize: '15px', width: '100%'
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    backgroundColor: '#d4c4a8', color: '#000', fontWeight: '700',
    padding: '14px', borderRadius: '12px', fontSize: '15px',
    cursor: 'pointer', border: 'none', width: '100%'
  },
  tabs: { display: 'flex', gap: '8px' },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', padding: '10px', borderRadius: '10px',
    border: '1px solid #1a1a1a', color: '#666', fontSize: '14px',
    cursor: 'pointer', background: 'none', fontWeight: '500'
  },
  tabActive: { borderColor: '#d4c4a844', color: '#d4c4a8', backgroundColor: '#1a1a2e' },
  participantList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' },
  participantItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '12px', border: '1px solid #1a1a1a',
    cursor: 'pointer', backgroundColor: '#0d0d0d'
  },
  participantSelected: { borderColor: '#d4c4a844', backgroundColor: '#1a1a2e' },
  pAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    backgroundColor: '#222', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '16px', flexShrink: 0
  },
  pName: { color: '#fff', fontWeight: '600', fontSize: '14px' },
  pSub: { color: '#555', fontSize: '12px', marginTop: '2px' },
  checkCircle: {
    width: '24px', height: '24px', borderRadius: '50%',
    backgroundColor: '#d4c4a8', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  modalFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: '4px', gap: '12px'
  },
  selectedCount: { color: '#666', fontSize: '13px', flexShrink: 0 }
};
