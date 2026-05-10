import React, { useState, useEffect, useContext } from 'react';
import { Shield, ShieldAlert, Trash2, ArrowDownCircle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const [actionConfirm, setActionConfirm] = useState({ id: null, type: null });

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      await fetchUsers();
      setActionConfirm({ id: null, type: null });
    } catch (err) {
      console.error('Role update failed:', err);
      alert('Error updating role');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchUsers();
      setActionConfirm({ id: null, type: null });
    } catch (err) {
      console.error('Deletion failed:', err);
      alert('Error removing user');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1>Users Management</h1>
        <p className="subtitle">View all registered users and manage their roles</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p className="p-4">Loading users...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'var(--bg-main)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>Name</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>Email</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>Role</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>Joined</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div className="font-semibold">{u.name}</div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '100px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: u.role === 'admin' ? '#3b82f6' : 'inherit'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {actionConfirm.id === u.id ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                if (actionConfirm.type === 'delete') handleDelete(u.id);
                                else handleRoleUpdate(u.id, actionConfirm.type === 'promote' ? 'admin' : 'user');
                              }}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: actionConfirm.type === 'delete' ? 'var(--danger)' : 'var(--info)' }}
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setActionConfirm({ id: null, type: null })}
                              className="btn-outline"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            {u.role === 'user' ? (
                              <button 
                                onClick={() => setActionConfirm({ id: u.id, type: 'promote' })}
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'var(--info)' }}
                              >
                                <ShieldAlert size={14} /> Promote
                              </button>
                            ) : (
                              String(u.id) !== String(currentUser?.id) ? (
                                <button 
                                  onClick={() => setActionConfirm({ id: u.id, type: 'demote' })}
                                  className="btn-outline"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--warning)', borderColor: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <ArrowDownCircle size={14} /> Demote
                                </button>
                              ) : null
                            )}
                            {String(u.id) !== String(currentUser?.id) && (
                              <button 
                                onClick={() => setActionConfirm({ id: u.id, type: 'delete' })}
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'var(--danger)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            {String(u.id) === String(currentUser?.id) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                YOU (ADMIN)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
