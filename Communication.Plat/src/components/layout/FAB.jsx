import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, Users, X, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';

// ── New Chat Modal ──────────────────────────────────────────────────────────
function NewChatModal({ onClose, onStart, contacts }) {
  const [search, setSearch] = useState('');
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>New Chat</span>
          <button onClick={onClose} style={s.closeBtn}><X size={20} color="#fff" /></button>
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <Search size={16} color="#555" />
          <input
            autoFocus
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
          {search && <button style={s.clearBtn} onClick={() => setSearch('')}><X size={14} color="#444" /></button>}
        </div>

        {/* Contact list */}
        <div style={s.contactList}>
          {filtered.length === 0 && (
            <div style={s.empty}>{search ? 'No contacts found' : 'No other users yet'}</div>
          )}
          {filtered.map(c => (
            <button key={c.uid} style={s.contactRow} onClick={() => onStart(c)}>
              <div style={s.avatar}>
                {c.profilePic ? <img src={c.profilePic} alt={c.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : c.name.charAt(0)}
              </div>
              <div style={s.contactInfo}>
                <span style={s.contactName}>{c.name}</span>
                <span style={s.contactRole}>{c.email}</span>
              </div>
              <div style={s.statusDot(c.isOnline)} />
              <div style={s.msgIcon}><MessageSquare size={16} color="#d4c4a8" /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Create Group Modal ──────────────────────────────────────────────────────
function NewGroupModal({ onClose, contacts, createGroup, currentUser }) {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (c) => setSelected(prev =>
    prev.find(s => s.uid === c.uid) ? prev.filter(s => s.uid !== c.uid) : [...prev, c]
  );

  const create = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    setError('');
    try {
      // Pass selected member UIDs so they are all added to the group
      const selectedUids = selected.map(c => c.uid);
      await createGroup(groupName.trim(), currentUser?.name || 'User', selectedUids);
      onClose();
    } catch (err) {
      console.error('Group creation error:', err);
      setError('Failed to create group. Try again.');
    }
    setCreating(false);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>Create Group</span>
          <button onClick={onClose} style={s.closeBtn}><X size={20} color="#fff" /></button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '60vh' }}>
          {/* Group name */}
          <input
            autoFocus
            placeholder="Group name (e.g. Project Alpha)..."
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            style={{ ...s.searchInput, backgroundColor: '#111', border: '1px solid #222', borderRadius: 12, padding: '13px 16px', outline: 'none' }}
          />

          {/* Member search */}
          <div style={s.searchWrap}>
            <Search size={16} color="#555" />
            <input placeholder="Search members..." value={search}
              onChange={e => setSearch(e.target.value)} style={s.searchInput} />
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selected.map(c => (
                <div key={c.uid} style={s.chip}>
                  <span style={{ color: '#d4c4a8', fontSize: 12, fontWeight: 700 }}>{c.name.split(' ')[0]}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => toggle(c)}>
                    <X size={12} color="#555" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <span style={s.sectionLabel}>SELECT MEMBERS</span>
          {filtered.length === 0 && <div style={s.empty}>No other users</div>}
          {filtered.map(c => (
            <button key={c.uid} style={{ ...s.contactRow, backgroundColor: selected.find(x => x.uid === c.uid) ? '#1a1a2e' : 'transparent', borderColor: selected.find(x => x.uid === c.uid) ? '#d4c4a833' : '#111' }} onClick={() => toggle(c)}>
              <div style={s.avatar}>
                {c.profilePic ? <img src={c.profilePic} alt={c.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : c.name.charAt(0)}
              </div>
              <div style={s.contactInfo}>
                <span style={s.contactName}>{c.name}</span>
                <span style={s.contactRole}>{c.email}</span>
              </div>
              {selected.find(x => x.uid === c.uid) && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#d4c4a8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#000', fontSize: 12, fontWeight: 900 }}>✓</span>
                </div>
              )}
            </button>
          ))}

          {error && <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #111' }}>
          <button
            onClick={create}
            disabled={!groupName.trim() || selected.length === 0 || creating}
            style={{ ...s.createBtn, opacity: (groupName.trim() && selected.length && !creating) ? 1 : 0.4 }}
          >
            {creating ? 'Creating...' : `Create Group · ${selected.length} member${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Broadcast Modal ─────────────────────────────────────────────────────────
function BroadcastModal({ onClose, contacts, currentUser }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError('');
    
    try {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let sentCount = 0;
      
      for (const contact of contacts) {
        const id = contact.uid;
        const me = currentUser;
        const combinedId = me.uid > id ? `${me.uid}_${id}` : `${id}_${me.uid}`;
        
        const msgData = {
          senderId: me.uid,
          senderName: me.name || me.email?.split('@')[0] || 'User',
          time: now,
          type: 'text',
          text: message.trim(),
          timestamp: serverTimestamp(),
          isBroadcast: true
        };
        
        await addDoc(collection(db, `chats/${combinedId}/messages`), msgData);
        
        await setDoc(doc(db, 'chats', combinedId), {
          lastMessage: message.trim(),
          lastTime: serverTimestamp(),
          isGroup: false,
          participants: [me.uid, id],
          [`unread_${id}`]: increment(1)
        }, { merge: true });
        
        sentCount++;
        setProgress(Math.round((sentCount / contacts.length) * 100));
      }
      onClose();
    } catch (err) {
      console.error('Broadcast error:', err);
      setError('Failed to send broadcast. Try again.');
      setSending(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>Broadcast Message</span>
          <button onClick={onClose} style={s.closeBtn}><X size={20} color="#fff" /></button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.4 }}>
            This will send an individual direct message to all <strong>{contacts.length}</strong> active users.
          </p>
          <textarea
            autoFocus
            placeholder="Type your announcement here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ ...s.searchInput, backgroundColor: '#111', border: '1px solid #222', borderRadius: 12, padding: '13px 16px', outline: 'none', minHeight: 100, resize: 'none' }}
          />
          
          {progress > 0 && progress < 100 && (
            <div style={{ color: '#4caf50', fontSize: 13, textAlign: 'center' }}>Sending... {progress}%</div>
          )}
          {error && <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #111' }}>
          <button
            onClick={handleBroadcast}
            disabled={!message.trim() || sending}
            style={{ ...s.createBtn, opacity: (message.trim() && !sending) ? 1 : 0.4 }}
          >
            {sending ? 'Sending...' : 'Send to All'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FAB ─────────────────────────────────────────────────────────────────────
export default function FAB() {
  const { userData, currentUser, allUsers, allGroups, isAdmin, createGroup } = useAuth();
  const navigate = useNavigate();

  // Real contacts = all non-disabled users except yourself
  const contacts = allUsers.filter(u => u.uid !== currentUser?.uid && !u.disabled);

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [showNewChat,   setShowNewChat]   = useState(false);
  const [showNewGroup,  setShowNewGroup]  = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const startChat = (contact) => {
    setShowNewChat(false);
    navigate(`/chat/${contact.uid}`, { state: { name: contact.name, isGroup: false } });
  };

  return (
    <>
      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStart={startChat}
          contacts={contacts}
        />
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          contacts={contacts}
          createGroup={createGroup}
          currentUser={currentUser}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          contacts={contacts}
          currentUser={currentUser}
        />
      )}

      {/* FAB sub-menu — only shown to admins (who have both options) */}
      {menuOpen && isAdmin && (
        <div style={fab.menu}>
          <button style={fab.item} onClick={() => { setMenuOpen(false); setShowBroadcast(true); }}>
            <span style={fab.label}>Broadcast</span>
            <div style={{ ...fab.iconBox, borderColor: '#f4433622' }}><Users size={20} color="#f44336" /></div>
          </button>
          <button style={fab.item} onClick={() => { setMenuOpen(false); setShowNewGroup(true); }}>
            <span style={fab.label}>New Group</span>
            <div style={fab.iconBox}><Users size={20} color="#d4c4a8" /></div>
          </button>
          <button style={fab.item} onClick={() => { setMenuOpen(false); setShowNewChat(true); }}>
            <span style={fab.label}>New Chat</span>
            <div style={fab.iconBox}><MessageSquare size={20} color="#d4c4a8" /></div>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        style={{ ...fab.btn, transform: (isAdmin && menuOpen) ? 'rotate(45deg)' : 'rotate(0)' }}
        onClick={() => {
          if (isAdmin) {
            setMenuOpen(o => !o);
          } else {
            setShowNewChat(true);
          }
        }}
        title={isAdmin ? 'New Chat / Group' : 'New Chat'}
      >
        <MessageSquarePlus size={24} color="#000" />
      </button>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  overlay:     { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal:       { backgroundColor: '#0d0d0d', borderRadius: 20, border: '1px solid #1a1a1a', width: '92%', maxWidth: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #111' },
  modalTitle:  { color: '#fff', fontWeight: 700, fontSize: 18 },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  searchWrap:  { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#111', borderRadius: 12, padding: '10px 14px', margin: '12px 20px 4px', border: '1px solid #1a1a1a' },
  searchInput: { flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  clearBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' },
  contactList: { overflowY: 'auto', maxHeight: '50vh', padding: '8px 0 16px' },
  empty:       { textAlign: 'center', color: '#333', padding: 40, fontSize: 14 },
  contactRow:  { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: '1px solid transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit', borderRadius: 0 },
  avatar:      { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1a2e,#2a2a4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4c4a8', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  contactInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  contactName: { color: '#fff', fontSize: 15, fontWeight: 600 },
  contactRole: { color: '#444', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusDot:   (online) => ({ width: 10, height: 10, borderRadius: '50%', backgroundColor: online ? '#4caf50' : '#333', flexShrink: 0, border: '2px solid #0d0d0d' }),
  msgIcon:     { width: 34, height: 34, borderRadius: '50%', backgroundColor: '#d4c4a811', border: '1px solid #d4c4a822', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chip:        { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#1a1a2e', border: '1px solid #d4c4a833', borderRadius: 20, padding: '4px 10px' },
  sectionLabel:{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: 1.5, paddingLeft: 20 },
  createBtn:   { width: '100%', backgroundColor: '#d4c4a8', color: '#000', fontWeight: 700, border: 'none', borderRadius: 12, padding: 14, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' },
};

const fab = {
  btn:     { position: 'fixed', bottom: 84, right: 20, width: 56, height: 56, borderRadius: '50%', backgroundColor: '#d4c4a8', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(187,134,252,.45)', cursor: 'pointer', zIndex: 90, transition: 'transform 0.25s ease' },
  menu:    { position: 'fixed', bottom: 152, right: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 89 },
  item:    { display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexDirection: 'row-reverse' },
  label:   { backgroundColor: '#111', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid #222', boxShadow: '0 4px 12px rgba(0,0,0,.4)', whiteSpace: 'nowrap' },
  iconBox: { width: 44, height: 44, borderRadius: '50%', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.4)', flexShrink: 0 },
};
