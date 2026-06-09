import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FAB from '../components/layout/FAB';
import { format } from 'date-fns';
import { Pin, PinOff, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

function loadReadMap() {
  try { return JSON.parse(localStorage.getItem('read_chats_ts') || '{}'); }
  catch { return {}; }
}
function markRead(chatId) {
  try {
    const r = JSON.parse(localStorage.getItem('read_chats_ts') || '{}');
    r[chatId] = Date.now();
    localStorage.setItem('read_chats_ts', JSON.stringify(r));
  } catch {}
}

const formatTime = (ts) => {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 86400000)   return format(d, 'HH:mm');
  if (diff < 604800000)  return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
};

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div style={styles.divider}>
      <div style={styles.dividerLine} />
      <span style={styles.dividerLabel}>{label}</span>
      <div style={styles.dividerLine} />
    </div>
  );
}

// ── Chat item ─────────────────────────────────────────────────────────────────
function ChatItem({ chat, onClick, onPin, isPinned }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={styles.chatItem}
        onClick={() => { setShowMenu(false); onClick(chat); }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0a0a0a'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onContextMenu={e => { e.preventDefault(); setShowMenu(s => !s); }}
      >
        {/* Avatar */}
        <div style={{ ...styles.avatar, background: chat.isGroup ? 'linear-gradient(135deg,#1a1a2e,#2a2a4a)' : (chat.profilePic ? 'none' : 'linear-gradient(135deg,#1a2e1a,#2a4a2a)') }}>
          {chat.isGroup
            ? <Users size={20} color="#d4c4a8" />
            : chat.profilePic 
              ? <img src={chat.profilePic} alt={chat.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>{chat.name.charAt(0)}</span>}
        </div>

        {/* Info */}
        <div style={styles.chatInfo}>
          <div style={styles.chatHeader}>
            <div style={styles.nameRow}>
              {isPinned && <Pin size={12} color="#d4c4a8" style={{ marginRight: 4 }} />}
              <span style={styles.name}>{chat.name}</span>
            </div>
            <span style={{ ...styles.time, color: chat.unread > 0 ? '#d4c4a8' : '#333' }}>
              {formatTime(chat.lastTime)}
            </span>
          </div>
          <div style={styles.chatFooter}>
            <span style={styles.message}>{chat.lastMessage}</span>
            {chat.unread > 0 && <span style={styles.badge}>{chat.unread}</span>}
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {showMenu && (
        <div style={styles.ctxMenu}>
          <button style={styles.ctxItem} onClick={() => { onPin(chat.id); setShowMenu(false); }}>
            {isPinned ? <><PinOff size={14} /> Unpin</> : <><Pin size={14} /> Pin to Top</>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatList() {
  const navigate = useNavigate();
  const { allUsers, allGroups, currentUser } = useAuth();

  const [chats, setChats] = useState([]);
  const [chatMeta, setChatMeta] = useState({});

  const [pinnedIds, setPinnedIds] = useState([]);

  // Load pinned chats ONLY for the logged-in user — never share across accounts
  useEffect(() => {
    if (!currentUser?.uid) {
      // User logged out or not yet loaded — always clear pins
      setPinnedIds([]);
      return;
    }
    try {
      const key = `pinned_chats_${currentUser.uid}`;
      setPinnedIds(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {
      setPinnedIds([]);
    }
  }, [currentUser?.uid]);

  // Listen to Firestore for all chat metadata
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(collection(db, 'chats'), (snapshot) => {
      const meta = {};
      snapshot.forEach(doc => {
        meta[doc.id] = doc.data();
      });
      setChatMeta(meta);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const readMap = loadReadMap();
    const dynamicChats = [];

    // Groups user is a member of
    allGroups.forEach(g => {
      if (g.members?.includes(currentUser?.uid)) {
        dynamicChats.push({
          id: g.id, name: g.name,
          actualChatId: g.id,
          defaultMsg: 'Group chat created', defaultTime: Date.now() - 60000,
          unread: 0, isGroup: true
        });
      }
    });

    // DMs (all other active users)
    allUsers.forEach(u => {
      if (u.uid !== currentUser?.uid && !u.disabled) {
        const combinedId = currentUser?.uid > u.uid ? `${currentUser.uid}_${u.uid}` : `${u.uid}_${currentUser?.uid}`;
        dynamicChats.push({
          id: u.uid, name: u.name, profilePic: u.profilePic,
          actualChatId: combinedId,
          defaultMsg: 'Start a conversation', defaultTime: Date.now() - 3600000,
          unread: 0, isGroup: false
        });
      }
    });

    const builtChats = dynamicChats.map(c => {
      const hasMeta = !!chatMeta[c.actualChatId];
      const m = chatMeta[c.actualChatId] || {};
      const ts = m.lastTime?.toMillis ? m.lastTime.toMillis() : (m.lastTime || c.defaultTime);
      const unreadCount = m[`unread_${currentUser?.uid}`] || 0;
      return {
        ...c,
        lastMessage: m.lastMessage || c.defaultMsg,
        lastTime: ts,
        unread: unreadCount,
      };
    });

    setChats(builtChats);
  }, [allUsers, allGroups, currentUser, chatMeta]);

  const togglePin = (id) => {
    if (!currentUser?.uid) return; // Safety: never pin without a known user
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem(`pinned_chats_${currentUser.uid}`, JSON.stringify(next));
      return next;
    });
  };

  const handleChatClick = (chat) => {
    markRead(chat.actualChatId);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    // Reset Firestore unread counter
    if (currentUser?.uid) {
      updateDoc(doc(db, 'chats', chat.actualChatId), {
        [`unread_${currentUser.uid}`]: 0
      }).catch(() => {}); // Ignore if doc doesn't exist yet
    }
    navigate(`/chat/${chat.id}`, { state: { name: chat.name, isGroup: chat.isGroup } });
  };

  // Sort non-pinned by lastTime descending (most recent first)
  const sorted = [...chats].sort((a, b) => b.lastTime - a.lastTime);

  const pinned   = sorted.filter(c =>  pinnedIds.includes(c.id));
  const groups   = sorted.filter(c =>  c.isGroup && !pinnedIds.includes(c.id));
  const contacts = sorted.filter(c => !c.isGroup && !pinnedIds.includes(c.id));

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {pinned.length > 0 && (
          <>
            <SectionDivider label="PINNED" />
            {pinned.map(c => <ChatItem key={c.id} chat={c} onClick={handleChatClick} onPin={togglePin} isPinned />)}
          </>
        )}

        <SectionDivider label="GROUPS" />
        {groups.map(c => <ChatItem key={c.id} chat={c} onClick={handleChatClick} onPin={togglePin} isPinned={false} />)}

        <SectionDivider label="DIRECT MESSAGES" />
        {contacts.map(c => <ChatItem key={c.id} chat={c} onClick={handleChatClick} onPin={togglePin} isPinned={false} />)}
      </div>
      <FAB />
    </div>
  );
}

const styles = {
  container: { height: '100%', position: 'relative', overflowY: 'auto', backgroundColor: '#000' },
  list:      { display: 'flex', flexDirection: 'column', paddingBottom: 80 },
  chatItem:  { display: 'flex', padding: '12px 16px', borderBottom: '1px solid #080808', cursor: 'pointer', backgroundColor: 'transparent', transition: 'background-color 0.15s' },
  avatar:    { width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  chatInfo:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  chatHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nameRow:   { display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, marginRight: 8 },
  name:      { fontSize: 16, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time:      { fontSize: 12, flexShrink: 0 },
  chatFooter:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  message:   { fontSize: 14, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 },
  badge:     { backgroundColor: '#d4c4a8', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, minWidth: 20, textAlign: 'center', flexShrink: 0 },
  divider:   { display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 10 },
  dividerLine:{ flex: 1, height: 1, backgroundColor: '#0d0d0d' },
  dividerLabel:{ fontSize: 11, fontWeight: 700, color: '#222', letterSpacing: '1.5px', whiteSpace: 'nowrap' },
  ctxMenu:   { position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', backgroundColor: '#111', border: '1px solid #222', borderRadius: 10, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,.6)', overflow: 'hidden' },
  ctxItem:   { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'none', border: 'none', color: '#ccc', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
};
