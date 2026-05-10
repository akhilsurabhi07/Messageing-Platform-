import React, { useState, useEffect, useContext } from 'react';
import { MessageSquare, Bell, CheckCircle, ExternalLink } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const Inbox = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch messages where user.id is in the recipients array in real-time
    const q = query(
      collection(db, 'messages'),
      where('recipients', 'array-contains', user.id),
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messageList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching inbox:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (msgId) => {
    try {
      const msgRef = doc(db, 'messages', msgId);
      await updateDoc(msgRef, {
        read_by: arrayUnion(user.id)
      });
      // Update local state
      setMessages(messages.map(m => 
        m.id === msgId 
          ? { ...m, read_by: [...(m.read_by || []), user.id] } 
          : m
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="p-8">Loading your inbox...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1>Your Inbox</h1>
        <p className="subtitle">Messages and announcements from the administrator</p>
      </div>

      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="card text-center py-12">
            <Bell size={48} className="mx-auto mb-4 text-muted" style={{opacity: 0.3}} />
            <p className="text-muted">No messages yet. You'll be notified when the admin sends something.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isRead = msg.read_by && msg.read_by.includes(user.id);
            const attachments = msg.attachments || [];
            
            return (
              <div 
                key={msg.id} 
                className={`card ${isRead ? '' : 'unread'}`} 
                style={{
                  borderLeft: isRead ? '1px solid var(--border-color)' : '4px solid var(--info)',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-color)'
                }}
                onClick={() => !isRead && markAsRead(msg.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="icon-container" style={{width: '32px', height: '32px', backgroundColor: isRead ? 'var(--border-color)' : 'var(--primary)', color: 'white'}}>
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">{msg.sender_name}</span>
                      <span className="text-xs text-muted block">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                  {!isRead && (
                    <span className="bg-primary text-primary-contrast px-2 py-1 rounded-full text-xs font-bold" style={{backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)'}}>NEW</span>
                  )}
                </div>
                
                <p className="mt-2 text-sm" style={{color: isRead ? 'var(--text-muted)' : 'var(--text-main)', marginLeft: '40px'}}>
                  {msg.content}
                </p>

                {msg.link_url && (
                  <div className="mt-2 ml-10">
                    <a 
                      href={msg.link_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs font-semibold text-info flex items-center gap-1 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} /> {msg.link_url}
                    </a>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="mt-3 ml-10 flex flex-col gap-2">
                    {attachments.map((att, i) => {
                      if (typeof att === 'string') {
                        // Legacy string attachment
                        return (
                          <div key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs w-fit" style={{backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)'}}>
                            <CheckCircle size={10} /> {att}
                          </div>
                        );
                      }
                      
                      // New object attachment
                      if (att.type && att.type.startsWith('image/')) {
                        return (
                          <div key={i} className="mt-1">
                            <a href={att.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] rounded object-cover border" style={{borderColor: 'var(--border-color)'}} />
                            </a>
                          </div>
                        );
                      }

                      // File attachment
                      return (
                        <a 
                          key={i} 
                          href={att.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          download={att.name}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold w-fit transition-colors hover:bg-gray-100" 
                          style={{backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)'}}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={12} /> Download {att.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;
