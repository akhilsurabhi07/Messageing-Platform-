import React, { useState, useEffect, useContext } from 'react';
import { Users, UsersRound, MessageSquare, Bell } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalGroups: 0, totalMembers: 0, messagesSent: 0 });
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Stats
        const [groupsSnap, membersSnap, messagesSnap] = await Promise.all([
          getCountFromServer(collection(db, 'groups')),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'user'))),
          getCountFromServer(query(collection(db, 'messages'), where('sender_id', '==', user.id)))
        ]);

        setStats({
          totalGroups: groupsSnap.data().count,
          totalMembers: membersSnap.data().count,
          messagesSent: messagesSnap.data().count
        });

        // 2. Fetch Recent Messages
        const q = query(
          collection(db, 'messages'),
          where('sender_id', '==', user.id),
          orderBy('created_at', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const messages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentMessages(messages);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">Overview of your broadcast communication platform</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Groups</span>
            <UsersRound size={20} />
          </div>
          <div className="stat-value">{stats.totalGroups}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Members</span>
            <Users size={20} />
          </div>
          <div className="stat-value">{stats.totalMembers}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Messages Sent</span>
            <MessageSquare size={20} />
          </div>
          <div className="stat-value">{stats.messagesSent}</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <h2>Recent Messages</h2>
          <div className="flex flex-col gap-4 mt-4">
            {recentMessages.length === 0 ? (
              <p className="text-muted">No recent messages</p>
            ) : (
              recentMessages.map(msg => (
                <div key={msg.id} className="flex gap-4 p-4 border rounded shadow-sm" style={{borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)'}}>
                  <div className="icon-container icon-blue" style={{ flexShrink: 0 }}>
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-6">
                      <div className="font-semibold" style={{fontSize: '0.9rem', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', flex: 1}}>
                        {msg.content}
                      </div>
                      <div className="text-muted text-right" style={{fontSize: '0.7rem', whiteSpace: 'nowrap', marginTop: '0.2rem', minWidth: '80px'}}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                    <div className="text-muted mt-2 flex items-center gap-2" style={{fontSize: '0.75rem'}}>
                      <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                        {msg.group_name || 'Individual'}
                      </span>
                      <span>•</span>
                      <span>{msg.recipients_count || 0} recipients</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>Recent Activity</h2>
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-muted text-sm">Activity log coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
