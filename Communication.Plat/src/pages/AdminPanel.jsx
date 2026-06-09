import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, UserX, UserCheck, Users, Crown, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ROLE_COLOR = { superadmin: '#ff4d6d', admin: '#d4c4a8', employee: '#555' };
const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', employee: 'Employee' };

export default function AdminPanel() {
  const navigate = useNavigate();
  const { 
    allUsers, allGroups, userData, isSuperAdmin, isAdmin, 
    promoteToAdmin, demoteToEmployee, removeUser, reinstateUser,
    deleteGroup, addMemberToGroup, removeMemberFromGroup 
  } = useAuth();
  const [tab, setTab] = useState('users'); // 'users' | 'groups'
  const [confirm, setConfirm] = useState(null); // { action, uid, name }
  const [managingGroup, setManagingGroup] = useState(null);

  if (!isAdmin) {
    return (
      <div style={styles.noAccess}>
        <Shield size={48} color="#222" />
        <p style={{ color: '#444', marginTop: 12 }}>Admin access required.</p>
        <button style={styles.backBtn2} onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const handleAction = () => {
    if (!confirm) return;
    const { action, uid } = confirm;
    if (action === 'promote') promoteToAdmin(uid);
    if (action === 'demote') demoteToEmployee(uid);
    if (action === 'remove') removeUser(uid);
    if (action === 'reinstate') reinstateUser(uid);
    if (action === 'deleteGroup') deleteGroup(uid);
    setConfirm(null);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={22} color="#fff" /></button>
        <div style={styles.topCenter}>
          <Crown size={18} color="#d4c4a8" />
          <span style={styles.topTitle}>Admin Panel</span>
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(tab === 'users' ? styles.tabActive : {}) }} onClick={() => setTab('users')}>
          Users ({allUsers.length})
        </button>
        <button style={{ ...styles.tab, ...(tab === 'groups' ? styles.tabActive : {}) }} onClick={() => setTab('groups')}>
          Groups ({allGroups.length})
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div style={styles.list}>
          {allUsers.map(user => {
            const isMe = user.uid === userData?.uid;
            const canPromote = isAdmin && user.role === 'employee' && !isMe;
            const canDemote = isSuperAdmin && user.role === 'admin' && !isMe;
            const canRemove = isAdmin && user.role !== 'superadmin' && !isMe && !user.disabled;
            const canReinstate = isAdmin && user.disabled;

            return (
              <div key={user.uid} style={{ ...styles.userCard, opacity: user.disabled ? 0.45 : 1 }}>
                <div style={styles.userAvatar}>
                  {user.profilePic ? <img src={user.profilePic} alt={user.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : user.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.userName}>
                    {user.name} {isMe && <span style={styles.youTag}>You</span>}
                  </div>
                  <div style={styles.userEmail}>{user.email}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ ...styles.roleBadge, color: ROLE_COLOR[user.role], borderColor: ROLE_COLOR[user.role] + '44', backgroundColor: ROLE_COLOR[user.role] + '11' }}>
                      {ROLE_LABEL[user.role]}
                    </span>
                    {user.disabled && <span style={styles.disabledBadge}>Removed</span>}
                  </div>
                </div>
                <div style={styles.actions}>
                  {canPromote && (
                    <button style={styles.actionBtn} title="Promote to Admin" onClick={() => setConfirm({ action: 'promote', uid: user.uid, name: user.name })}>
                      <Shield size={16} color="#d4c4a8" />
                    </button>
                  )}
                  {canDemote && (
                    <button style={styles.actionBtn} title="Demote to Employee" onClick={() => setConfirm({ action: 'demote', uid: user.uid, name: user.name })}>
                      <ShieldOff size={16} color="#ff9800" />
                    </button>
                  )}
                  {canRemove && (
                    <button style={styles.actionBtn} title="Remove User" onClick={() => setConfirm({ action: 'remove', uid: user.uid, name: user.name })}>
                      <UserX size={16} color="#ff5555" />
                    </button>
                  )}
                  {canReinstate && (
                    <button style={styles.actionBtn} title="Reinstate User" onClick={() => setConfirm({ action: 'reinstate', uid: user.uid, name: user.name })}>
                      <UserCheck size={16} color="#4caf50" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Groups Tab */}
      {tab === 'groups' && (
        <div style={styles.list}>
          {allGroups.map(g => (
            <div key={g.id} style={styles.userCard}>
              <div style={{ ...styles.userAvatar, background: 'linear-gradient(135deg, #1a1a2e, #2a2a4a)' }}>
                <Users size={20} color="#d4c4a8" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.userName}>{g.name}</div>
                <div style={styles.userEmail}>{g.members?.length || 0} members · Created by {g.createdBy}</div>
              </div>
              <div style={styles.actions}>
                <button
                  style={{ ...styles.actionBtn }}
                  title="Manage Members"
                  onClick={() => setManagingGroup(g)}
                >
                  <Settings size={16} color="#d4c4a8" />
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: '#1a0a0a' }}
                  title="Delete Group"
                  onClick={() => setConfirm({ action: 'deleteGroup', uid: g.id, name: g.name })}
                >
                  <UserX size={16} color="#ff5555" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>
              {confirm.action === 'promote' && <Shield size={32} color="#d4c4a8" />}
              {confirm.action === 'demote' && <ShieldOff size={32} color="#ff9800" />}
              {(confirm.action === 'remove' || confirm.action === 'deleteGroup') && <UserX size={32} color="#ff5555" />}
              {confirm.action === 'reinstate' && <UserCheck size={32} color="#4caf50" />}
            </div>
            <div style={styles.modalTitle}>
              {confirm.action === 'promote' && `Promote ${confirm.name} to Admin?`}
              {confirm.action === 'demote' && `Demote ${confirm.name} to Employee?`}
              {confirm.action === 'remove' && `Remove ${confirm.name} from CommPlat?`}
              {confirm.action === 'reinstate' && `Reinstate ${confirm.name}?`}
              {confirm.action === 'deleteGroup' && `Delete group "${confirm.name}"?`}
            </div>
            <div style={styles.modalSub}>This action can be reversed from the Admin Panel.</div>
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setConfirm(null)}>Cancel</button>
              <button style={{ ...styles.confirmBtn, backgroundColor: confirm.action === 'promote' || confirm.action === 'reinstate' ? '#d4c4a8' : '#ff5555' }} onClick={handleAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {managingGroup && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, width: '90%', maxWidth: 400, padding: '24px 0 16px 0', alignItems: 'stretch' }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>Manage "{managingGroup.name}"</h3>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }} onClick={() => setManagingGroup(null)}>Close</button>
            </div>
            <div style={{ maxHeight: 350, overflowY: 'auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allUsers.map(u => {
                if (u.disabled) return null;
                const isMember = managingGroup.members?.includes(u.uid);
                return (
                  <div key={u.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '12px 16px', borderRadius: 12, border: '1px solid #1a1a1a' }}>
                    <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>{u.name}</span>
                    <button
                      style={{ 
                        backgroundColor: isMember ? '#2a1a1a' : '#1a1a2e', 
                        color: isMember ? '#ff5555' : '#d4c4a8', 
                        border: isMember ? '1px solid #441111' : '1px solid #333344', 
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 
                      }}
                      onClick={() => {
                        if (isMember) {
                          removeMemberFromGroup(managingGroup.id, u.uid);
                          setManagingGroup(prev => ({ ...prev, members: prev.members.filter(id => id !== u.uid) }));
                        } else {
                          addMemberToGroup(managingGroup.id, u.uid);
                          setManagingGroup(prev => ({ ...prev, members: [...(prev.members || []), u.uid] }));
                        }
                      }}
                    >
                      {isMember ? 'Remove' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { height: '100%', overflowY: 'auto', backgroundColor: '#000', paddingBottom: 80 },
  noAccess: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #111' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  backBtn2: { marginTop: 16, backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' },
  topCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  topTitle: { color: '#fff', fontWeight: '700', fontSize: '18px' },
  tabs: { display: 'flex', margin: '12px 14px', backgroundColor: '#0d0d0d', borderRadius: 12, border: '1px solid #111', overflow: 'hidden' },
  tab: { flex: 1, padding: '12px', background: 'none', border: 'none', color: '#444', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  tabActive: { backgroundColor: '#1a1a2e', color: '#d4c4a8' },
  list: { padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  userCard: { display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#0a0a0a', border: '1px solid #111', borderRadius: 14, padding: '14px', transition: 'opacity 0.2s' },
  userAvatar: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #d4c4a822, #b3a38822)', border: '2px solid #d4c4a822', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4c4a8', fontWeight: '700', fontSize: 18, flexShrink: 0 },
  userName: { color: '#fff', fontWeight: '600', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 },
  youTag: { fontSize: 11, backgroundColor: '#d4c4a822', color: '#d4c4a8', border: '1px solid #d4c4a844', padding: '1px 6px', borderRadius: 6, fontWeight: 700 },
  userEmail: { color: '#444', fontSize: 12, marginTop: 2 },
  roleBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, border: '1px solid' },
  disabledBadge: { fontSize: 11, color: '#ff5555', backgroundColor: '#ff555511', border: '1px solid #ff555533', padding: '2px 8px', borderRadius: 8, fontWeight: 700 },
  actions: { display: 'flex', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#111', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal: { backgroundColor: '#0d0d0d', border: '1px solid #222', borderRadius: 20, padding: '28px 24px', width: '85%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  modalIcon: { width: 64, height: 64, borderRadius: '50%', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  modalSub: { color: '#444', fontSize: 13, textAlign: 'center' },
  modalBtns: { display: 'flex', gap: 10, width: '100%', marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#1a1a1a', color: '#aaa', border: '1px solid #222', borderRadius: 12, padding: '12px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' },
  confirmBtn: { flex: 1, color: '#000', border: 'none', borderRadius: 12, padding: '12px', cursor: 'pointer', fontSize: 14, fontWeight: '700', fontFamily: 'inherit' },
};
