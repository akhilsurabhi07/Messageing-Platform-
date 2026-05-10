import React from 'react';
import { Bell } from 'lucide-react';

const Notifications = () => {
  return (
    <div>
      <div className="mb-6">
        <h1>Notifications</h1>
        <p className="subtitle">Stay updated with the latest alerts</p>
      </div>

      <div className="card text-center py-12">
        <Bell size={48} className="mx-auto mb-4 text-muted" style={{opacity: 0.3}} />
        <p className="text-muted">You're all caught up! No new notifications.</p>
      </div>
    </div>
  );
};

export default Notifications;
