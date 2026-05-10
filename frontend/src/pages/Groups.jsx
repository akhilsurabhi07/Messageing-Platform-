import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, MoreHorizontal, UserPlus, UsersRound, MessageSquare } from 'lucide-react';
import { collection, getDocs, addDoc, doc, setDoc, query, where, getCountFromServer, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const Groups = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const q = query(collection(db, 'groups'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const groupList = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
        const gid = docSnap.id;
        const data = docSnap.data();
        
        // Fetch member count
        const membersSnap = await getCountFromServer(collection(db, 'groups', gid, 'members'));
        const messagesSnap = await getCountFromServer(query(collection(db, 'messages'), where('group_id', '==', gid)));
        
        return {
          id: gid,
          ...data,
          member_count: membersSnap.data().count,
          message_count: messagesSnap.data().count
        };
      }));

      setGroups(groupList);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        created_by: user.id,
        created_at: new Date().toISOString()
      });
      setNewGroupName('');
      setShowCreateModal(false);
      fetchGroups();
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const openAddMembersModal = (groupId) => {
    setSelectedGroupId(groupId);
    fetchUsers();
    setShowAddMembersModal(true);
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      await Promise.all(selectedUserIds.map(uid => 
        setDoc(doc(db, 'groups', selectedGroupId, 'members', uid), {
          user_id: uid,
          joined_at: new Date().toISOString()
        })
      ));
      setShowAddMembersModal(false);
      setSelectedUserIds([]);
      fetchGroups(); 
    } catch (err) {
      console.error('Error adding members:', err);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const filteredGroups = Array.isArray(groups) 
    ? groups.filter(g => g.name && g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const getColorClass = (id) => {
    const classes = ['icon-blue', 'icon-green', 'icon-yellow', 'icon-red', 'icon-purple', 'icon-teal'];
    // Use the first few chars of the Firestore ID for a stable color
    const charCode = id ? id.charCodeAt(0) : 0;
    return classes[charCode % classes.length];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Groups</h1>
          <p className="subtitle" style={{marginBottom: 0}}>Manage your broadcast groups and members</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Group
        </button>
      </div>

      <div className="card mb-6" style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search groups..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{border: 'none', padding: '0.5rem', flex: 1}}
        />
      </div>

      {loading ? (
        <p>Loading groups...</p>
      ) : (
        <div className="groups-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem'}}>
          {filteredGroups.length > 0 ? filteredGroups.map(group => (
            <div key={group.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <div className={`icon-container ${getColorClass(group.id)}`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 style={{fontSize: '1rem', fontWeight: 600}}>{group.name}</h3>
                    <p className="text-muted" style={{fontSize: '0.75rem'}}>Created {group.created_at ? new Date(group.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <button className="btn-outline" style={{padding: '0.25rem', border: 'none'}}><MoreHorizontal size={20} /></button>
              </div>
              
              <div className="flex gap-4 mb-4 text-muted" style={{fontSize: '0.875rem'}}>
                <div className="flex items-center gap-1"><UsersRound size={16}/> {group.member_count} members</div>
                <div className="flex items-center gap-1"><MessageSquare size={16}/> {group.message_count} sent</div>
              </div>

              <div className="flex gap-2">
                <button className="btn-outline flex-1" onClick={() => openAddMembersModal(group.id)}>Add Members</button>
                <button className="btn-primary flex-1" onClick={() => navigate(`/admin/messages?groupId=${group.id}`)}>Send Message</button>
              </div>
            </div>
          )) : (
            <p className="text-muted">No groups found. Create one to get started!</p>
          )}
        </div>
      )}

      {/* Basic Create Group Modal */}
      {showCreateModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div className="card" style={{width: '400px'}}>
            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4 mt-4">
              <input 
                type="text" 
                placeholder="Group Name" 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Basic Add Members Modal */}
      {showAddMembersModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div className="card" style={{width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
            <h2>Add Members to Group</h2>
            <div className="flex flex-col gap-2 mt-4" style={{overflowY: 'auto', flex: 1, paddingBottom: '1rem'}}>
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50" style={{backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)'}}>
                  <input 
                    type="checkbox" 
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => toggleUserSelection(u.id)}
                  />
                  <span>{u.name} ({u.email})</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-4 pt-4 border-t" style={{borderColor: 'var(--border-color)'}}>
              <button className="btn-outline" onClick={() => setShowAddMembersModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddMembers}>Add Selected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
