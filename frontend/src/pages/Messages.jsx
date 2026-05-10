import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, Check, UsersRound, User, Image as ImageIcon, FileText, Link as LinkIcon, Paperclip, X } from 'lucide-react';
import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const Messages = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'members'
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState(searchParams.get('groupId') || '');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSelectiveGroup, setIsSelectiveGroup] = useState(false);
  
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [linkUrl, setLinkUrl] = useState('');
  
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroupId && activeTab === 'group') {
      fetchGroupMembers(selectedGroupId);
    }
  }, [selectedGroupId, activeTab]);

  const fetchData = async () => {
    try {
      // 1. Fetch Groups
      const groupsSnap = await getDocs(collection(db, 'groups'));
      setGroups(groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Fetch Users
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')));
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Fetch Recent Sent Messages
      const messagesSnap = await getDocs(query(
        collection(db, 'messages'),
        where('sender_id', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(10)
      ));
      setSentMessages(messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
      const memberIds = membersSnap.docs.map(doc => doc.id);
      
      if (memberIds.length === 0) {
        setGroupMembers([]);
        return;
      }

      // Fetch user details for these IDs (Firestore limit is 10 for 'in' query, 
      // so we might need multiple chunks if group is large, but for now let's assume small groups)
      const userList = [];
      for (let i = 0; i < memberIds.length; i += 10) {
        const chunk = memberIds.slice(i, i + 10);
        const usersSnap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)));
        userList.push(...usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setGroupMembers(userList);
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent && attachments.length === 0 && !linkUrl) return;

    try {
      setIsSending(true);
      let finalRecipients = [];
      let groupName = 'Individual';

      if (activeTab === 'group') {
        const group = groups.find(g => g.id === selectedGroupId);
        groupName = group?.name || 'Group';

        if (isSelectiveGroup) {
          finalRecipients = selectedUserIds;
        } else {
          // Fetch all members for broadcast
          const membersSnap = await getDocs(collection(db, 'groups', selectedGroupId, 'members'));
          finalRecipients = membersSnap.docs.map(doc => doc.id);
        }
      } else {
        finalRecipients = selectedUserIds;
      }

      if (finalRecipients.length === 0) {
        setIsSending(false);
        return alert('No recipients selected');
      }

      // Upload attachments to Firebase Storage in parallel
      const uploadPromises = attachments.map(async (attachment) => {
        if (attachment.file) {
          const fileRef = ref(storage, `chat_attachments/${Date.now()}_${attachment.name}`);
          const snapshot = await uploadBytes(fileRef, attachment.file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          return {
            name: attachment.name,
            type: attachment.type,
            url: downloadUrl
          };
        }
        return attachment;
      });
      const uploadedAttachments = (await Promise.all(uploadPromises)).filter(Boolean);

      await addDoc(collection(db, 'messages'), {
        content: messageContent,
        sender_id: user.id,
        sender_name: user.name,
        group_id: activeTab === 'group' ? selectedGroupId : null,
        group_name: groupName,
        type: (activeTab === 'group' && !isSelectiveGroup) ? 'broadcast' : 'selective',
        link_url: linkUrl,
        attachments: uploadedAttachments,
        recipients: finalRecipients, // For Inbox query: where('recipients', 'array-contains', userId)
        created_at: new Date().toISOString()
      });
      
      setMessageContent('');
      setLinkUrl('');
      setAttachments([]);
      setSelectedGroupId('');
      setSelectedUserIds([]);
      setIsSelectiveGroup(false);
      fetchData(); // refresh history
    } catch (error) {
      console.error("Error sending message: ", error);
      alert(`Error sending message: ${error.message}\nIf this says "unauthorized" or "bucket not found", please go to your Firebase Console -> Storage and click "Get Started".`);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files.map(f => ({ file: f, name: f.name, type: f.type }))]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleUserSelection = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredUsers = (activeTab === 'group' ? groupMembers : users).filter(u => {
    return u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           u.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="mb-6">
        <h1>Messages</h1>
        <p className="subtitle">Broadcast messages to groups or selected members</p>
      </div>

      <div className="content-grid" style={{alignItems: 'start'}}>
        <div className="card">
          <h2 className="mb-4">Compose</h2>
          
          <div className="flex rounded-lg p-1 mb-6" style={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)'}}>
            <button 
              className={`flex-1 rounded py-2 text-sm font-medium transition-all ${activeTab === 'group' ? 'bg-primary shadow-sm' : ''}`}
              style={{
                backgroundColor: activeTab === 'group' ? 'var(--primary)' : 'transparent', 
                color: activeTab === 'group' ? 'var(--primary-contrast)' : 'var(--text-muted)'
              }}
              onClick={() => { setActiveTab('group'); setSelectedUserIds([]); setIsSelectiveGroup(false); }}
            >
              Group Channel
            </button>
            <button 
              className={`flex-1 rounded py-2 text-sm font-medium transition-all ${activeTab === 'members' ? 'bg-primary shadow-sm' : ''}`}
              style={{
                backgroundColor: activeTab === 'members' ? 'var(--primary)' : 'transparent', 
                color: activeTab === 'members' ? 'var(--primary-contrast)' : 'var(--text-muted)'
              }}
              onClick={() => { setActiveTab('members'); setSelectedUserIds([]); setIsSelectiveGroup(false); }}
            >
              Direct Select
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
            {activeTab === 'group' ? (
              <div>
                <label className="text-sm font-semibold mb-1 block">Select Group</label>
                <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} required>
                  <option value="">Choose a group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                {selectedGroupId && (
                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="checkbox" checked={isSelectiveGroup} onChange={(e) => setIsSelectiveGroup(e.target.checked)} />
                      Send to specific members of this group only
                    </label>
                  </div>
                )}
              </div>
            ) : null}

            {(activeTab === 'members' || isSelectiveGroup) && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold">Select Recipients</label>
                  <span className="text-xs text-muted">{selectedUserIds.length} selected</span>
                </div>
                
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search members..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{paddingLeft: '2.5rem', height: '38px'}}
                  />
                </div>

                <div className="selection-box" style={{maxHeight: '200px'}}>
                  {filteredUsers.map(u => (
                    <div 
                      key={u.id} 
                      className="selection-item" 
                      onClick={() => toggleUserSelection(u.id)}
                      style={{
                        backgroundColor: selectedUserIds.includes(u.id) ? 'var(--border-color)' : 'transparent',
                        padding: '0.5rem'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="avatar" style={{width: '24px', height: '24px', fontSize: '0.65rem'}}>
                            {u.name.charAt(0)}
                          </div>
                          <span style={{fontSize: '0.875rem'}}>{u.name}</span>
                        </div>
                        {selectedUserIds.includes(u.id) && <Check size={14} color="var(--info)" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold mb-1 block">Message Content</label>
              <textarea 
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Add Link</label>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="url" 
                  placeholder="https://example.com" 
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={{paddingLeft: '2.5rem'}}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold">Attachments</label>
                <label className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 px-3 py-1.5 rounded border border-primary hover:bg-primary hover:text-white transition-colors" style={{borderColor: 'var(--primary)', color: 'var(--primary)'}}>
                  <Paperclip size={14} /> Add Files
                  <input type="file" multiple className="hidden" style={{display: 'none'}} onChange={handleFileChange} />
                </label>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg text-xs" style={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)'}}>
                    {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                    <span className="truncate max-w-[100px]">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(idx)} className="text-muted hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSending} className="btn-primary" style={{marginTop: '1rem', width: '100%', opacity: isSending ? 0.7 : 1}}>
              {isSending ? 'Uploading Files...' : <><Send size={16} /> Send Now</>}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Recent History</h2>
          <div className="flex flex-col gap-4 mt-6">
            {loading ? <p>Loading history...</p> : sentMessages.map(msg => (
              <div key={msg.id} className="p-4 border rounded shadow-sm" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)'}}>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="icon-container" style={{
                      width: '28px', height: '28px', 
                      backgroundColor: msg.type === 'broadcast' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: msg.type === 'broadcast' ? '#3b82f6' : '#10b981'
                    }}>
                      {msg.type === 'broadcast' ? <UsersRound size={14} /> : <User size={14} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{msg.group_name || 'Individual'}</div>
                      <div className="text-xs text-muted">{(msg.recipients || []).length} recipients</div>
                    </div>
                  </div>
                  <span className="text-muted text-right" style={{fontSize: '0.7rem', whiteSpace: 'nowrap', marginTop: '0.2rem'}}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm mb-2" style={{
                  marginLeft: '36px', 
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>{msg.content}</p>
                {msg.link_url && (
                  <a href={msg.link_url} target="_blank" rel="noreferrer" className="text-xs text-info flex items-center gap-1 ml-9 mb-2 hover:underline truncate" style={{maxWidth: '100%', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    <LinkIcon size={12} className="inline mr-1" /> {msg.link_url}
                  </a>
                )}
                
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 ml-9 flex flex-col gap-2">
                    {msg.attachments.map((att, i) => {
                      if (typeof att === 'string') {
                        return (
                          <div key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs w-fit" style={{backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)'}}>
                            <Check size={10} /> {att}
                          </div>
                        );
                      }
                      
                      if (att.type && att.type.startsWith('image/')) {
                        return (
                          <div key={i} className="mt-1">
                            <a href={att.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              <img src={att.url} alt={att.name} className="max-w-[150px] max-h-[150px] rounded object-cover border" style={{borderColor: 'var(--border-color)'}} />
                            </a>
                          </div>
                        );
                      }

                      return (
                        <a 
                          key={i} 
                          href={att.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          download={att.name}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs font-semibold w-fit transition-colors hover:bg-gray-100" 
                          style={{backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)'}}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={12} /> {att.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
