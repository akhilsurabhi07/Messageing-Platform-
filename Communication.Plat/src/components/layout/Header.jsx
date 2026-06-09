import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, LogOut, User, Settings, X, Users, MessageSquare, Crown, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';

export default function Header() {
  const { logout, userData, currentUser, allUsers, allGroups, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  
  // Notification states
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch notifications
  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(
      collection(db, `users/${userData.uid}/notifications`),
      where('read', '==', false)
    );
    // Sort by createdAt is tricky without a composite index if combining with 'where'. 
    // We will sort them on the client.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA; // newest first
      });
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [userData?.uid]);

  const handleNotifClick = async (notif) => {
    setNotifOpen(false);
    if (!userData?.uid) return;
    try {
      await updateDoc(doc(db, `users/${userData.uid}/notifications`, notif.id), { read: true });
    } catch (e) {
      console.error(e);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const displayName   = userData?.name       || 'User';
  const displayAvatar = userData?.profilePic || null;

  const searchItems = [
    ...allUsers
      .filter(u => u.uid !== currentUser?.uid && !u.disabled)
      .map(u => ({ id: u.uid, name: u.name, subtitle: u.email, profilePic: u.profilePic, isGroup: false })),
    ...allGroups
      .filter(g => g.members?.includes(currentUser?.uid))
      .map(g => ({ id: g.id, name: g.name, subtitle: `${g.members?.length || 0} members`, isGroup: true })),
  ];

  const results = queryText.trim()
    ? searchItems.filter(i => i.name.toLowerCase().includes(queryText.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSearchSelect = (item) => {
    setSearchOpen(false);
    setQueryText('');
    navigate(`/chat/${item.id}`, { state: { name: item.name, isGroup: item.isGroup } });
  };

  return (
    <header style={styles.header}>
      {searchOpen ? (
        <div style={styles.searchContainer}>
          <div style={styles.searchBar}>
            <Search size={17} color="#555" />
            <input
              autoFocus
              type="text"
              placeholder="Search contacts, groups..."
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              style={styles.searchInput}
            />
            <button onClick={() => { setSearchOpen(false); setQueryText(''); }} style={styles.iconBtn}>
              <X size={18} color="#555" />
            </button>
          </div>

          {results.length > 0 && (
            <div style={styles.searchResults}>
              {results.map(item => (
                <button
                  key={item.id}
                  style={styles.resultItem}
                  onClick={() => handleSearchSelect(item)}
                >
                  <div style={styles.resultAvatar}>
                    {item.isGroup ? <Users size={16} color="#d4c4a8" /> : (item.profilePic ? <img src={item.profilePic} alt={item.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : item.name.charAt(0))}
                  </div>
                  <div style={styles.resultInfo}>
                    <span style={styles.resultName}>{item.name}</span>
                    <span style={styles.resultMsg}>{item.subtitle}</span>
                  </div>
                  <MessageSquare size={14} color="#333" />
                </button>
              ))}
            </div>
          )}

          {queryText.trim() && results.length === 0 && (
            <div style={styles.noResults}>No results for "{queryText}"</div>
          )}
        </div>
      ) : (
        <>
          <div style={styles.brandRow}>
            <div style={styles.logoWrap}>
              <span style={styles.logoText}>C</span>
            </div>
            <h1 style={styles.title}>CommPlat</h1>
          </div>

          <div style={styles.actions}>
            <button style={styles.iconBtn} onClick={() => setSearchOpen(true)} title="Search">
              <Search size={22} color="#aaa" />
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button style={styles.iconBtn} onClick={() => setNotifOpen(o => !o)} title="Notifications">
                <Bell size={22} color="#aaa" />
                {notifications.length > 0 && (
                  <span style={styles.badge}>{notifications.length}</span>
                )}
              </button>

              {notifOpen && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={styles.dropName}>Notifications</div>
                  </div>
                  <div style={styles.dropDivider} />
                  {notifications.length === 0 ? (
                    <div style={{ padding: '16px', color: '#666', fontSize: '13px', textAlign: 'center' }}>
                      No new notifications
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notifications.map(notif => (
                        <button key={notif.id} style={styles.notifItem} onClick={() => handleNotifClick(notif)}>
                          <div style={styles.notifTitle}>{notif.title}</div>
                          <div style={styles.notifBody}>{notif.body}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Three-dot menu */}
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button style={styles.iconBtn} onClick={() => setMenuOpen(o => !o)} title="More options">
                <MoreVertical size={22} color="#aaa" />
              </button>

              {menuOpen && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={styles.dropAvatar}>
                      {displayAvatar
                        ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : (displayName.charAt(0) || 'U')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.dropName}>{displayName}</div>
                      <div style={styles.dropEmail}>{userData?.email}</div>
                    </div>
                  </div>
                  <div style={styles.dropDivider} />
                  <button style={styles.dropItem} onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                    <User size={15} /> Profile
                  </button>
                  <button style={styles.dropItem} onClick={() => { navigate('/settings'); setMenuOpen(false); }}>
                    <Settings size={15} /> Settings
                  </button>
                  {isAdmin && (
                    <button style={{ ...styles.dropItem, color: '#d4c4a8' }} onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                      <Crown size={15} /> Admin Panel
                    </button>
                  )}
                  <div style={styles.dropDivider} />
                  <button style={{ ...styles.dropItem, color: '#ff5555' }} onClick={handleLogout}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

const styles = {
  header: {
    height: '60px', backgroundColor: '#080808',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 14px',
    borderBottom: '1px solid #111', position: 'relative', zIndex: 50,
    flexShrink: 0
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoWrap: {
    width: '34px', height: '34px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #d4c4a8, #b3a388)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { color: '#000', fontWeight: '900', fontSize: '18px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: '4px' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
    padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '8px'
  },
  badge: {
    position: 'absolute', top: '4px', right: '4px',
    backgroundColor: '#ff5555', color: '#fff', fontSize: '10px',
    fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  // Search
  searchContainer: {
    flex: 1, display: 'flex', flexDirection: 'column', position: 'relative'
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: '#111', borderRadius: '10px', padding: '8px 12px',
    border: '1px solid #1a1a1a'
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none',
    color: '#fff', fontSize: '15px', outline: 'none'
  },
  searchResults: {
    position: 'absolute', top: '46px', left: 0, right: 0,
    backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: '14px', overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)', zIndex: 999
  },
  resultItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 14px', background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
    borderBottom: '1px solid #111'
  },
  resultAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a1a2e, #2a2a4a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: '700', fontSize: '16px', flexShrink: 0
  },
  resultInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  resultName: { color: '#fff', fontWeight: '600', fontSize: '14px' },
  resultMsg: { color: '#444', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  noResults: {
    position: 'absolute', top: '46px', left: 0, right: 0,
    backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: '12px', padding: '16px', color: '#444',
    fontSize: '14px', textAlign: 'center', zIndex: 999
  },
  // Dropdown menu
  dropdown: {
    position: 'absolute', top: '42px', right: 0,
    backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: '14px', width: '250px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 999
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px'
  },
  dropAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4c4a844, #b3a38844)',
    border: '2px solid #d4c4a844',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#d4c4a8', fontWeight: '700', fontSize: '16px', flexShrink: 0
  },
  dropName: { color: '#fff', fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dropEmail: { color: '#444', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dropDivider: { height: '1px', backgroundColor: '#111' },
  dropItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
    padding: '13px 16px', background: 'none', border: 'none',
    color: '#ccc', fontSize: '14px', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'inherit'
  },
  notifItem: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #111',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
  },
  notifTitle: { color: '#fff', fontSize: '13px', fontWeight: '600' },
  notifBody: { color: '#888', fontSize: '12px', lineHeight: '1.4' }
};
