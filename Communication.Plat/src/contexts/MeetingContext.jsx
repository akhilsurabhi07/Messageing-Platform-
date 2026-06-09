import React, { createContext, useContext, useState } from 'react';

const MeetingContext = createContext();

export function useMeetingContext() {
  return useContext(MeetingContext);
}

export function MeetingProvider({ children }) {
  const [activeMeeting, setActiveMeeting] = useState(null);

  const joinMeeting = (meeting) => {
    setActiveMeeting({ ...meeting, isMinimized: false });
  };

  const leaveMeeting = () => {
    setActiveMeeting(null);
  };

  const minimizeMeeting = () => {
    setActiveMeeting((prev) => (prev ? { ...prev, isMinimized: true } : null));
  };

  const maximizeMeeting = () => {
    setActiveMeeting((prev) => (prev ? { ...prev, isMinimized: false } : null));
  };

  return (
    <MeetingContext.Provider
      value={{
        activeMeeting,
        joinMeeting,
        leaveMeeting,
        minimizeMeeting,
        maximizeMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}
