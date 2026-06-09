import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, MoreVertical, Phone, Video, Send,
  Smile, Paperclip, Image, FileText, X, Search, BellOff, Bell, Users,
  Edit2, Trash2, UserPlus, AlertCircle, Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, addDoc, increment
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE COMPRESSION  (canvas-based, no Storage required, stores as base64)
// Max output: ~700 KB base64 (fits in Firestore's 1 MB doc limit)
// ─────────────────────────────────────────────────────────────────────────────
function compressImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Common emoji list ────────────────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤔','😢','😡','🎉','🔥',
  '👍','👎','❤️','💯','🙏','✅','❌','⚡','🚀','💡',
  '😊','😅','🤣','😭','😱','🥳','😴','🤯','🥺','😏',
  '👋','🤝','💪','✌️','🤞','👏','🙌','🤦','🤷','💬',
  '🌟','⭐','🎯','📌','📎','💼','📞','📧','🔔','🔕',
];

// ── Attachment picker ────────────────────────────────────────────────────────
function AttachMenu({ onFile, onClose }) {
  const imageRef = useRef(null);
  const docRef   = useRef(null);

  const handle = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file, type);
    onClose();
  };

  return (
    <div style={am.overlay} onClick={onClose}>
      <div style={am.sheet} onClick={e => e.stopPropagation()}>
        <div style={am.handle} />
        <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
          Images auto-compressed · Max 5 MB
        </p>
        <div style={am.grid}>
          {/* Photo */}
          <button style={am.item} onClick={() => imageRef.current?.click()}>
            <div style={{ ...am.icon, background: '#1a2e1a' }}><Image size={26} color="#4caf50" /></div>
            <span style={am.label}>Photo</span>
          </button>
          <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e, 'image')} />

          {/* Document */}
          <button style={am.item} onClick={() => docRef.current?.click()}>
            <div style={{ ...am.icon, background: '#1a1a2e' }}><FileText size={26} color="#d4c4a8" /></div>
            <span style={am.label}>Document</span>
          </button>
          <input ref={docRef} type="file" accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv" style={{ display: 'none' }} onChange={e => handle(e, 'file')} />
        </div>
        <button style={am.cancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Emoji picker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onEmoji, onClose }) {
  return (
    <div style={ep.wrap}>
      <div style={ep.header}>
        <span style={ep.title}>EMOJI</span>
        <button style={ep.closeBtn} onClick={onClose}><X size={16} color="#555" /></button>
      </div>
      <div style={ep.grid}>
        {EMOJIS.map(e => (
          <button key={e} style={ep.emoji} onClick={() => onEmoji(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}

// ── Bubble component ─────────────────────────────────────────────────────────
function Bubble({ msg, isOwn, onEdit, onDelete }) {
  const [showOpts, setShowOpts] = useState(false);

  const fmtSize = (b) => {
    if (!b) return '';
    return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div
        onClick={() => isOwn && setShowOpts(!showOpts)}
        style={{
          maxWidth: '78%',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          overflow: 'hidden',
          backgroundColor: isOwn ? '#2a1a4a' : '#111',
          border: `1px solid ${isOwn ? '#d4c4a822' : '#1a1a1a'}`,
          cursor: isOwn ? 'pointer' : 'default',
        }}>

        {/* Sender name (group chats) */}
        {msg.senderName && !isOwn && (
          <div style={{ padding: '6px 12px 0', fontSize: 11, color: '#d4c4a8', fontWeight: 700 }}>
            {msg.senderName}
          </div>
        )}

        {/* Text message */}
        {(msg.type === 'text' || !msg.type) && msg.text && (
          <div style={{ padding: '10px 14px', color: '#fff', fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>
            {msg.text}
            {msg.edited && <span style={{ fontSize: 10, color: '#aaa', marginLeft: 6 }}>(edited)</span>}
          </div>
        )}

        {/* Image message (stored as base64) */}
        {msg.type === 'image' && msg.url && (
          <img
            src={msg.url}
            alt={msg.name || 'photo'}
            style={{ width: '100%', maxWidth: 280, display: 'block', cursor: 'pointer' }}
            onClick={() => {
              // Open image in new tab
              const win = window.open();
              win.document.write(`<img src="${msg.url}" style="max-width:100%;"/>`);
            }}
          />
        )}

        {/* Document message (base64 PDF/text) */}
        {msg.type === 'file' && (
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#d4c4a822', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={20} color="#d4c4a8" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.name || 'Document'}
                </div>
                <div style={{ color: '#555', fontSize: 11 }}>{fmtSize(msg.size)}</div>
              </div>
            </div>
            {msg.url && (
              <a
                href={msg.url}
                download={msg.name}
                style={{ display: 'inline-block', marginTop: 8, color: '#d4c4a8', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
              >
                ⬇ Download
              </a>
            )}
          </div>
        )}

        <div style={{ padding: '2px 12px 8px', textAlign: 'right', fontSize: 11, color: isOwn ? '#d4c4a855' : '#333' }}>
          {msg.time}
        </div>

        {/* Edit / Delete */}
        {showOpts && isOwn && (
          <div style={{ backgroundColor: '#1a1a2e', display: 'flex', justifyContent: 'flex-end', padding: '6px 12px', borderTop: '1px solid #ffffff11', gap: 12 }}>
            {(msg.type === 'text' || !msg.type) && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(msg); setShowOpts(false); }}
                style={{ background: 'none', border: 'none', color: '#d4c4a8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
              >
                <Edit2 size={12} /> Edit
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(msg.id); setShowOpts(false); }}
              style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChatRoom ─────────────────────────────────────────────────────────────────
export default function ChatRoom() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentUser, userData, firebaseUser,
    allUsers, allGroups, isAdmin,
    addMemberToGroup, removeMemberFromGroup
  } = useAuth();

  // Robust 'me' — prefer userData (has name), fall back to firebaseUser
  const me = userData || currentUser || (firebaseUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
  } : null);

  const myUid = me?.uid || '';

  // Resolve name and isGroup
  const isGroup = location.state?.isGroup ?? allGroups.some(g => g.id === id);
  const resolvedName = location.state?.name ||
    (isGroup ? allGroups.find(g => g.id === id)?.name : allUsers.find(u => u.uid === id)?.name) || 'Chat';
  const chatName = resolvedName;
  
  const chatProfilePic = location.state?.profilePic || 
    (isGroup ? null : allUsers.find(u => u.uid === id)?.profilePic) || null;

  // Chat document ID
  const combinedId  = myUid > id ? `${myUid}_${id}` : `${id}_${myUid}`;
  const actualChatId = isGroup ? id : combinedId;

  // ── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages]     = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMsg, setEditingMsg] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [sendError, setSendError]   = useState('');

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [showEmoji,       setShowEmoji]       = useState(false);
  const [showAttach,      setShowAttach]      = useState(false);
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [showAddMembers,  setShowAddMembers]  = useState(false);

  const currentGroup = isGroup ? allGroups.find(g => g.id === id) : null;

  const endRef  = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actualChatId || !myUid) return;
    const q = query(collection(db, `chats/${actualChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q,
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })));
      },
      err => setSendError('Could not load messages: ' + err.message)
    );
    return () => unsub();
  }, [actualChatId, myUid]);

  // ── Mark as read ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actualChatId || !myUid || messages.length === 0) return;
    updateDoc(doc(db, 'chats', actualChatId), { [`unread_${myUid}`]: 0 }).catch(() => {});
  }, [actualChatId, myUid, messages.length]);

  // ── Mute ──────────────────────────────────────────────────────────────────
  const [muted, setMuted] = useState(() => {
    try { const l = JSON.parse(localStorage.getItem('muted_chats') || '[]'); return Array.isArray(l) && l.includes(id); }
    catch { return false; }
  });

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Close menu on outside click
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Update chat metadata ──────────────────────────────────────────────────
  const updateMeta = async (preview) => {
    const unreadUpdates = {};
    if (isGroup) {
      (currentGroup?.members || []).forEach(uid => {
        if (uid !== myUid) unreadUpdates[`unread_${uid}`] = increment(1);
      });
    } else {
      unreadUpdates[`unread_${id}`] = increment(1);
    }
    await setDoc(doc(db, 'chats', actualChatId), {
      lastMessage: preview,
      lastTime: serverTimestamp(),
      isGroup,
      participants: isGroup ? (currentGroup?.members || []) : [myUid, id].filter(Boolean),
      ...unreadUpdates
    }, { merge: true });
  };

  // ── Push message to Firestore ─────────────────────────────────────────────
  const pushMsg = async (extra) => {
    if (!me || !myUid) { setSendError('Not logged in. Please refresh.'); return false; }
    if (!actualChatId || actualChatId.includes('undefined')) { setSendError('Chat not ready. Go back and try again.'); return false; }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgData = {
      senderId: myUid,
      senderName: me.name || me.email?.split('@')[0] || 'User',
      time: now,
      type: 'text',
      timestamp: serverTimestamp(),
      ...extra
    };

    try {
      await addDoc(collection(db, `chats/${actualChatId}/messages`), msgData);
      const preview =
        msgData.type === 'text'  ? (msgData.text || '') :
        msgData.type === 'image' ? '📷 Photo' :
        `📎 ${msgData.name || 'File'}`;
      await updateMeta(preview);
      return true;
    } catch (err) {
      console.error('pushMsg error:', err);
      setSendError('Failed to send: ' + err.message);
      return false;
    }
  };

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSendError('');
    try {
      if (editingMsg) {
        await updateDoc(doc(db, `chats/${actualChatId}/messages`, editingMsg.id), {
          text: newMessage, edited: true
        });
        setEditingMsg(null);
      } else {
        await pushMsg({ text: newMessage });
      }
      setNewMessage('');
      setShowEmoji(false);
      inputRef.current?.focus();
    } catch (err) {
      setSendError('Failed to send: ' + err.message);
    }
  };

  const handleDeleteMsg = async (msgId) => {
    await deleteDoc(doc(db, `chats/${actualChatId}/messages`, msgId)).catch(err => setSendError('Could not delete: ' + err.message));
  };

  const handleEditInit = (msg) => {
    setEditingMsg(msg);
    setNewMessage(msg.text);
    inputRef.current?.focus();
  };

  const handleEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // ── File handler — NO Firebase Storage required ───────────────────────────
  const handleFile = async (file, type) => {
    if (!file) return;
    setSendError('');

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setSendError(`File too large. Maximum is ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    setUploadPct(10);

    try {
      if (type === 'image') {
        // ── Compress image with canvas, store as base64 in Firestore ──────
        setUploadPct(30);
        const base64 = await compressImage(file, 900, 0.72);
        setUploadPct(80);

        // Estimate base64 size — warn if too large for Firestore (1 MB doc limit)
        const estimatedBytes = base64.length * 0.75;
        if (estimatedBytes > 850_000) {
          // Re-compress at lower quality
          const base64Small = await compressImage(file, 600, 0.55);
          setUploadPct(95);
          await pushMsg({ type: 'image', url: base64Small, name: file.name, size: file.size });
        } else {
          await pushMsg({ type: 'image', url: base64, name: file.name, size: file.size });
        }
        setUploadPct(100);

      } else {
        // ── Documents — read as base64 DataURL & store in Firestore ───────
        // Works for small text/PDF files; larger ones need Firebase Blaze plan
        setUploadPct(40);
        const base64 = await readFileAsDataURL(file);
        setUploadPct(85);

        const estimatedBytes = base64.length * 0.75;
        if (estimatedBytes > 800_000) {
          setSendError(
            '📎 This document is too large to send without Firebase Storage (Blaze plan). ' +
            'Try sending a smaller file (under ~600 KB) or an image instead.'
          );
          setUploading(false);
          setUploadPct(0);
          return;
        }

        await pushMsg({ type: 'file', url: base64, name: file.name, size: file.size });
        setUploadPct(100);
      }
    } catch (err) {
      console.error('File handle error:', err);
      setSendError('Could not process file: ' + err.message);
    } finally {
      setTimeout(() => { setUploading(false); setUploadPct(0); }, 500);
    }
  };

  // ── Read file as base64 DataURL ───────────────────────────────────────────
  const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleMute = () => {
    try {
      const l = JSON.parse(localStorage.getItem('muted_chats') || '[]');
      localStorage.setItem('muted_chats', JSON.stringify(muted ? l.filter(m => m !== id) : [...l, id]));
      setMuted(!muted);
    } catch {}
    setMenuOpen(false);
  };

  const filtered = searchQuery
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Guard: user not yet loaded
  if (!me) {
    return (
      <div style={{ ...s.container, alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={28} color="#444" />
        <div style={{ color: '#444', fontSize: 13, marginTop: 12 }}>Loading chat...</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.hLeft}>
          <button onClick={() => navigate('/')} style={s.iconBtn}><ArrowLeft size={24} color="#fff" /></button>
          <div style={{ ...s.avatar, background: isGroup ? 'linear-gradient(135deg,#1a1a2e,#2a2a4a)' : (chatProfilePic ? 'none' : 'linear-gradient(135deg,#1a2e1a,#2a4a2a)') }}>
            {isGroup ? <Users size={20} color="#d4c4a8" /> : (chatProfilePic ? <img src={chatProfilePic} alt={chatName} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : chatName.charAt(0))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={s.name}>{chatName}</span>
              {muted && <BellOff size={12} color="#555" />}
            </div>
            <span style={s.sub}>{isGroup ? `Group · ${currentGroup?.members?.length || 0} members` : '🟢 Online'}</span>
          </div>
        </div>
        <div style={s.hRight}>
          <button style={s.iconBtn} onClick={() => navigate('/call', { state: { name: chatName, isVideo: true, isGroup } })}><Video size={20} color="#aaa" /></button>
          <button style={s.iconBtn} onClick={() => navigate('/call', { state: { name: chatName, isVideo: false, isGroup } })}><Phone size={20} color="#aaa" /></button>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button style={s.iconBtn} onClick={() => setMenuOpen(o => !o)}><MoreVertical size={20} color="#aaa" /></button>
            {menuOpen && (
              <div style={s.dropdown}>
                <button style={s.dItem} onClick={() => { navigate(`/contact/${id}`, { state: { name: chatName, isGroup } }); setMenuOpen(false); }}>
                  <Users size={14} /> {isGroup ? 'Group Info' : 'View Contact'}
                </button>
                {isGroup && isAdmin && (
                  <button style={s.dItem} onClick={() => { setShowAddMembers(true); setMenuOpen(false); }}>
                    <UserPlus size={14} /> Add Members
                  </button>
                )}
                <button style={s.dItem} onClick={() => { setSearchOpen(true); setMenuOpen(false); }}>
                  <Search size={14} /> Search in Chat
                </button>
                <button style={s.dItem} onClick={handleMute}>
                  {muted ? <><Bell size={14} /> Unmute</> : <><BellOff size={14} /> Mute</>}
                </button>
                <div style={{ height: 1, backgroundColor: '#111', margin: '4px 0' }} />
                <button style={{ ...s.dItem, color: '#ff5555' }} onClick={() => navigate('/')}>
                  <X size={14} /> Close Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Search bar ── */}
      {searchOpen && (
        <div style={s.searchBar}>
          <Search size={15} color="#555" />
          <input autoFocus placeholder="Search messages..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} style={s.searchInput} />
          {searchQuery && <span style={{ color: '#444', fontSize: 12, whiteSpace: 'nowrap' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
          <button style={s.iconBtn} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}><X size={16} color="#555" /></button>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={s.chat} onClick={() => { setShowEmoji(false); setMenuOpen(false); }}>
        {filtered.map(msg => (
          <Bubble key={msg.id} msg={msg} isOwn={msg.senderId === myUid} onEdit={handleEditInit} onDelete={handleDeleteMsg} />
        ))}
        {filtered.length === 0 && searchQuery && (
          <div style={{ textAlign: 'center', color: '#333', padding: '40px 0', fontSize: 14 }}>No messages found for "{searchQuery}"</div>
        )}
        {messages.length === 0 && !searchQuery && (
          <div style={{ textAlign: 'center', color: '#222', padding: '60px 20px', fontSize: 14 }}>
            No messages yet. Say hello! 👋
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Emoji picker ── */}
      {showEmoji && <EmojiPicker onEmoji={handleEmoji} onClose={() => setShowEmoji(false)} />}

      {/* ── Upload progress bar ── */}
      {uploading && (
        <div style={{ backgroundColor: '#1a1a2e', padding: '8px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#d4c4a8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader size={12} color="#d4c4a8" /> Processing file...
            </span>
            <span style={{ color: '#d4c4a8', fontSize: 12 }}>{uploadPct}%</span>
          </div>
          <div style={{ height: 3, backgroundColor: '#333', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${uploadPct}%`, backgroundColor: '#d4c4a8', borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {sendError && (
        <div style={{ backgroundColor: '#1a0a0a', borderTop: '1px solid #ff555522', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={16} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#ff8888', fontSize: 13, flex: 1, lineHeight: 1.4 }}>{sendError}</span>
          <button onClick={() => setSendError('')} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Editing banner ── */}
      {editingMsg && (
        <div style={{ backgroundColor: '#2a1a4a', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#d4c4a8', fontSize: 12 }}>✏️ Editing message...</span>
          <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }} onClick={() => { setEditingMsg(null); setNewMessage(''); }}>Cancel</button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={s.inputBar}>
        <button style={s.iconBtn} onClick={() => { setShowEmoji(e => !e); setShowAttach(false); }}>
          <Smile size={24} color={showEmoji ? '#d4c4a8' : '#555'} />
        </button>
        <button style={s.iconBtn} onClick={() => { setShowAttach(true); setShowEmoji(false); }} disabled={uploading}>
          <Paperclip size={24} color={uploading ? '#333' : '#555'} />
        </button>
        <form onSubmit={handleSend} style={s.form}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={muted ? 'Notifications muted · Type...' : 'Type a message...'}
            style={s.input}
          />
          <button type="submit" style={{ ...s.sendBtn, opacity: newMessage.trim() ? 1 : 0.5 }}>
            <Send size={18} color="#000" />
          </button>
        </form>
      </div>

      {showAttach && <AttachMenu onFile={handleFile} onClose={() => setShowAttach(false)} />}

      {/* ── Add Members Modal ── */}
      {showAddMembers && currentGroup && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ backgroundColor:'#0d0d0d', borderRadius:20, border:'1px solid #222', width:'90%', maxWidth:400, overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'80vh' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #111' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <UserPlus size={18} color="#d4c4a8" />
                <span style={{ color:'#fff', fontWeight:700, fontSize:17 }}>Add Members</span>
              </div>
              <button onClick={() => setShowAddMembers(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                <X size={20} color="#fff" />
              </button>
            </div>
            <div style={{ padding:'8px 0', overflowY:'auto', flex:1 }}>
              {allUsers.filter(u => !u.disabled).map(u => {
                const isMember = currentGroup.members?.includes(u.uid);
                const isMe = u.uid === myUid;
                return (
                  <div key={u.uid} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid #0d0d0d' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#1a1a2e,#2a2a4a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#d4c4a8', fontWeight:700, fontSize:17, flexShrink:0 }}>
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>{u.name} {isMe && <span style={{ color:'#555', fontSize:11 }}>(You)</span>}</div>
                      <div style={{ color:'#444', fontSize:12 }}>{u.email}</div>
                    </div>
                    {!isMe && (
                      <button
                        onClick={() => isMember ? removeMemberFromGroup(currentGroup.id, u.uid) : addMemberToGroup(currentGroup.id, u.uid)}
                        style={{ padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', backgroundColor: isMember ? '#2a1a1a' : '#1a2e1a', color: isMember ? '#ff5555' : '#4caf50' }}
                      >
                        {isMember ? 'Remove' : '+ Add'}
                      </button>
                    )}
                    {isMe && isMember && (
                      <span style={{ fontSize:11, color:'#d4c4a8', backgroundColor:'#d4c4a811', border:'1px solid #d4c4a833', padding:'4px 10px', borderRadius:8 }}>Member</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #111' }}>
              <button onClick={() => setShowAddMembers(false)} style={{ width:'100%', backgroundColor:'#d4c4a8', color:'#000', fontWeight:700, border:'none', borderRadius:12, padding:13, fontSize:15, cursor:'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: { display:'flex', flexDirection:'column', position:'absolute', inset:0, zIndex:999, backgroundColor:'#050505' },
  header:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', backgroundColor:'#0a0a0a', borderBottom:'1px solid #111', flexShrink:0 },
  hLeft:   { display:'flex', alignItems:'center', gap:10 },
  hRight:  { display:'flex', gap:4 },
  avatar:  { width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:18, flexShrink:0 },
  name:    { color:'#fff', fontWeight:700, fontSize:16 },
  sub:     { color:'#555', fontSize:12 },
  iconBtn: { background:'none', border:'none', cursor:'pointer', padding:8, display:'flex', alignItems:'center', borderRadius:8 },
  dropdown:{ position:'absolute', top:40, right:0, backgroundColor:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:14, width:200, zIndex:999, boxShadow:'0 8px 24px rgba(0,0,0,.7)', padding:'4px 0' },
  dItem:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'none', border:'none', color:'#ccc', fontSize:14, cursor:'pointer', fontFamily:'inherit' },
  searchBar:{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', backgroundColor:'#0d0d0d', borderBottom:'1px solid #111', flexShrink:0 },
  searchInput:{ flex:1, background:'none', border:'none', color:'#fff', fontSize:14, outline:'none' },
  chat:    { flex:1, padding:'12px 14px', overflowY:'auto', display:'flex', flexDirection:'column' },
  inputBar:{ display:'flex', alignItems:'center', padding:'8px 10px', backgroundColor:'#0a0a0a', borderTop:'1px solid #111', gap:6, flexShrink:0 },
  form:    { flex:1, display:'flex', gap:8, minWidth:0 },
  input:   { flex:1, minWidth:0, backgroundColor:'#1a1a1a', border:'1px solid #222', borderRadius:22, padding:'11px 18px', color:'#fff', fontSize:'16px', outline:'none', fontFamily:'inherit' },
  sendBtn: { width:44, height:44, borderRadius:'50%', backgroundColor:'#d4c4a8', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
};
const ep = {
  wrap:    { backgroundColor:'#0d0d0d', borderTop:'1px solid #111', padding:'10px 12px', flexShrink:0 },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  title:   { color:'#333', fontSize:11, fontWeight:700, letterSpacing:1 },
  closeBtn:{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex' },
  grid:    { display:'flex', flexWrap:'wrap', gap:2 },
  emoji:   { fontSize:26, background:'none', border:'none', cursor:'pointer', padding:'5px', borderRadius:8, lineHeight:1 },
};
const am = {
  overlay: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,.80)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:500 },
  sheet:   { width:'100%', maxWidth:480, backgroundColor:'#0d0d0d', borderRadius:'24px 24px 0 0', border:'1px solid #1a1a1a', padding:'12px 20px 36px' },
  handle:  { width:40, height:4, borderRadius:2, backgroundColor:'#222', margin:'0 auto 16px' },
  grid:    { display:'flex', justifyContent:'space-around', marginBottom:20 },
  item:    { display:'flex', flexDirection:'column', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' },
  icon:    { width:64, height:64, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center' },
  label:   { color:'#aaa', fontSize:13, fontWeight:600 },
  cancel:  { width:'100%', backgroundColor:'#1a1a1a', color:'#aaa', border:'1px solid #222', borderRadius:14, padding:14, fontSize:16, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
};
