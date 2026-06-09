import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, 
  Share2, MoreVertical, X, Send, Paperclip, FileText,
  Maximize2, Minimize2, ScreenShare, RefreshCcw, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeetingContext } from '../contexts/MeetingContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

const VideoPlayer = ({ stream, isYou, isScreenSharing }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  // Don't mirror screen shares
  const transform = (isYou && !isScreenSharing) ? 'scaleX(-1)' : 'none';
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isYou}
      style={{ width: '100%', height: '100%', objectFit: isScreenSharing ? 'contain' : 'cover', transform }}
    />
  );
};

const RemoteAudio = ({ stream }) => {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

function MeetingRoomInner({ activeMeeting }) {
  const navigate = useNavigate();
  const { userData, isAdmin } = useAuth();
  const { leaveMeeting, minimizeMeeting, maximizeMeeting } = useMeetingContext();

  const { id: meetingId, title = 'Meeting', isMinimized } = activeMeeting;

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const [activeSidebar, setActiveSidebar] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([{ id: '1', sender: 'System', text: 'Welcome to the meeting room!', time: 'Now' }]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [meetingDoc, setMeetingDoc] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});

  const peersRef = useRef({});
  const iceCandidatesQueueRef = useRef({});
  const streamRef = useRef(null);
  const processedSignalsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const joinTimeRef = useRef(Date.now());

  // ── 1. Initialize Media Stream ──────────────────────────────────────────────
  const requestMedia = async (screenShare = false, facing = 'user') => {
    try {
      setPermissionError('');
      let stream;
      if (screenShare) {
        if (!navigator.mediaDevices.getDisplayMedia) {
          alert('Screen sharing is not supported on this browser/device.');
          setIsScreenSharing(false);
          return;
        }
        
        let displayStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } catch (err) {
          setIsScreenSharing(false);
          return; // User cancelled or not allowed
        }
        
        const videoTrack = displayStream.getVideoTracks()[0];
        const audioTrack = streamRef.current?.getAudioTracks()[0];
        
        stream = new MediaStream([videoTrack]);
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
        
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          requestMedia(false, facingMode);
        };
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true
        });
      }

      setLocalStream(stream);
      streamRef.current = stream;
      setPermissionGranted(true);

      // If we already have peers, replace tracks or add them
      Object.values(peersRef.current).forEach(async pc => {
        const senders = pc.getSenders();
        let addedNewTrack = false;
        
        stream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(e => console.error('replaceTrack error', e));
          } else {
            pc.addTrack(track, stream);
            addedNewTrack = true;
          }
        });
        
        // Force renegotiation to ensure updates reach peers
        try {
          const targetUid = Object.keys(peersRef.current).find(uid => peersRef.current[uid] === pc);
          if (targetUid) {
             // Only the designated offerer should initiate to avoid glare
             if (userData.uid > targetUid) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendSignal(targetUid, 'offer', { type: offer.type, sdp: offer.sdp });
             } else if (addedNewTrack) {
                // Tell the designated offerer to send us an offer
                await sendSignal(targetUid, 'renegotiate', {});
             }
          }
        } catch (e) {
          console.error('Renegotiation error:', e);
        }
      });
    } catch (err) {
      console.error('Media access error:', err);
      if (screenShare) {
        setIsScreenSharing(false);
      } else {
        setPermissionError('Camera/Microphone access denied. Please allow permissions.');
      }
    }
  };

  useEffect(() => {
    requestMedia(false, 'user');
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, []);

  const handleSwitchCamera = () => {
    if (isScreenSharing) return;
    
    // Crucial for Mobile: Stop current tracks before requesting the other camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    requestMedia(false, nextFacing);
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      requestMedia(false, facingMode);
    } else {
      setCamOn(true); // Force camera on so the screen track isn't muted
      setIsScreenSharing(true);
      requestMedia(true);
    }
  };

  // Toggle tracks
  useEffect(() => {
    if (localStream) localStream.getVideoTracks().forEach(t => { t.enabled = camOn; });
  }, [camOn, localStream]);
  useEffect(() => {
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn, localStream]);

  // ── Meeting Doc & End Listener ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'meetings', meetingId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeetingDoc(data);
        if (data.status === 'ended') {
          handleEnd(true); // forced end
        }
      }
    });
    return () => unsub();
  }, [meetingId]);

  // ── Helper: send a signal via Firestore ─────────────────────────────────────
  const sendSignal = useCallback(async (to, type, data) => {
    if (!userData?.uid) return;
    await addDoc(collection(db, `meetings/${meetingId}/signals`), {
      from: userData.uid,
      to,
      type,
      data,
      createdAt: serverTimestamp()
    });
  }, [meetingId, userData]);

  // ── Helper: Peer Connection ────────────────────────────────────────────────
  const getPeerConnection = useCallback((targetUid) => {
    if (peersRef.current[targetUid]) return peersRef.current[targetUid];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetUid] = pc;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetUid, 'candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [targetUid]: event.streams[0] }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }, [sendSignal]);

  // ── 2. Presence & Signaling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.uid || !permissionGranted) return;

    const participantRef = doc(db, `meetings/${meetingId}/activeParticipants`, userData.uid);
    setDoc(participantRef, {
      uid: userData.uid,
      name: userData.name || 'User',
      profilePic: userData.profilePic || null,
      camOn,
      micOn,
      isScreenSharing,
      joinedAt: serverTimestamp()
    }).catch(e => console.error('Presence err', e));

    const handleBeforeUnload = () => deleteDoc(participantRef);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const qUsers = query(collection(db, `meetings/${meetingId}/activeParticipants`));
    const unsubUsers = onSnapshot(qUsers, snap => {
      const users = snap.docs.map(d => d.data());
      setActiveUsers(users);

      const activeUids = new Set(users.map(u => u.uid));
      Object.keys(peersRef.current).forEach(uid => {
        if (!activeUids.has(uid)) {
          peersRef.current[uid].close();
          delete peersRef.current[uid];
          delete iceCandidatesQueueRef.current[uid];
          setRemoteStreams(prev => {
            const ns = { ...prev };
            delete ns[uid];
            return ns;
          });
        }
      });

      users.forEach(async (user) => {
        if (user.uid === userData.uid) return;
        if (peersRef.current[user.uid]) return;

        if (userData.uid > user.uid) {
          const pc = getPeerConnection(user.uid);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal(user.uid, 'offer', { type: offer.type, sdp: offer.sdp });
          } catch (e) {
            console.error('Offer error', e);
          }
        }
      });
    });

    const qSignals = query(collection(db, `meetings/${meetingId}/signals`));
    const unsubSignals = onSnapshot(qSignals, async (snap) => {
      const addedChanges = snap.docChanges().filter(c => c.type === 'added');
      const docs = addedChanges.map(c => ({ id: c.doc.id, data: c.doc.data() }));

      docs.sort((a, b) => {
        const tA = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : 0;
        const tB = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : 0;
        return tA - tB;
      });

      for (const item of docs) {
        if (processedSignalsRef.current.has(item.id)) continue;
        processedSignalsRef.current.add(item.id);

        const { from, to, type, data, createdAt } = item.data;
        if (to !== userData.uid || from === userData.uid) continue;
        
        // Ignore old signals from before we joined
        const time = createdAt?.toMillis ? createdAt.toMillis() : Date.now();
        if (time < joinTimeRef.current) continue;

        const pc = getPeerConnection(from);

        const drainIceQueue = async () => {
          const queue = iceCandidatesQueueRef.current[from] || [];
          for (const cand of queue) {
            try { await pc.addIceCandidate(cand); } catch (e) {}
          }
          delete iceCandidatesQueueRef.current[from];
        };

        if (type === 'offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(from, 'answer', { type: answer.type, sdp: answer.sdp });
            await drainIceQueue();
          } catch (e) {}
        } else if (type === 'answer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            await drainIceQueue();
          } catch (e) {}
        } else if (type === 'candidate') {
          const cand = new RTCIceCandidate(data);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try { await pc.addIceCandidate(cand); } catch (e) {}
          } else {
            if (!iceCandidatesQueueRef.current[from]) iceCandidatesQueueRef.current[from] = [];
            iceCandidatesQueueRef.current[from].push(cand);
          }
        } else if (type === 'renegotiate') {
          if (userData.uid > from) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal(from, 'offer', { type: offer.type, sdp: offer.sdp });
            } catch (e) {}
          }
        }
      }
    });

    return () => {
      unsubUsers();
      unsubSignals();
      deleteDoc(participantRef).catch(() => {});
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [meetingId, userData, permissionGranted, getPeerConnection, sendSignal, isScreenSharing]); // re-run if isScreenSharing changes so it broadcasts presence

  useEffect(() => {
    if (!userData?.uid || !permissionGranted) return;
    const participantRef = doc(db, `meetings/${meetingId}/activeParticipants`, userData.uid);
    updateDoc(participantRef, { camOn, micOn, isScreenSharing }).catch(() => {});
  }, [camOn, micOn, isScreenSharing, meetingId, userData, permissionGranted]);

  useEffect(() => {
    if (!permissionGranted) return;
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [permissionGranted]);

  useEffect(() => {
    const q = query(collection(db, `meetings/${meetingId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages([{ id: '1', sender: 'System', text: 'Welcome to the meeting room!', time: 'Now' }, ...msgs]);
    });
    return () => unsubscribe();
  }, [meetingId]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await addDoc(collection(db, `meetings/${meetingId}/messages`), {
        sender: userData?.name || 'User',
        senderId: userData?.uid,
        text: chatMessage,
        type: 'text',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: serverTimestamp()
      });
      setChatMessage('');
    } catch (err) {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadError('');

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Max is 5MB.');
      return;
    }

    setUploadProgress(10);
    try {
      let fileData;
      if (file.type.startsWith('image/')) {
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = (ev) => {
            const img = new window.Image();
            img.onerror = reject;
            img.onload = () => {
              let { width, height } = img;
              if (width > 800) { height = Math.round(height * 800 / width); width = 800; }
              const canvas = document.createElement('canvas');
              canvas.width = width; canvas.height = height;
              canvas.getContext('2d').drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.72));
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      } else {
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setUploadProgress(85);
      await addDoc(collection(db, `meetings/${meetingId}/messages`), {
        sender: userData?.name || 'User',
        senderId: userData?.uid,
        type: 'file',
        fileData,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        text: '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: serverTimestamp()
      });
      setUploadProgress(0);
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
      setUploadProgress(0);
    }
  };

  const handleEnd = async (forced = false) => {
    if (!forced && isAdmin) {
      const confirmEnd = window.confirm(
        'End meeting for everyone?\n\nOK = End for all participants\nCancel = Just leave (others stay)'
      );
      if (confirmEnd) {
        await updateDoc(doc(db, 'meetings', meetingId), {
          status: 'ended',
          endedAt: serverTimestamp()
        }).catch(() => {});
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peersRef.current).forEach(pc => pc.close());
    
    leaveMeeting();
  };

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleScreenShareAccess = async () => {
    if (!meetingDoc || !isAdmin) return;
    await updateDoc(doc(db, 'meetings', meetingId), {
      screenShareAllowed: !meetingDoc.screenShareAllowed
    });
  };

  const canShareScreen = isAdmin || userData?.uid === meetingDoc?.hostId || meetingDoc?.screenShareAllowed;

  const tiles = [
    { id: 'me', uid: userData?.uid, name: userData?.name || 'You', profilePic: userData?.profilePic, isYou: true, stream: localStream, camOn, micOn, isScreenSharing },
    ...activeUsers.filter(u => u.uid !== userData?.uid).map(u => ({
      id: u.uid,
      uid: u.uid,
      name: u.name,
      profilePic: u.profilePic,
      isYou: false,
      stream: remoteStreams[u.uid],
      camOn: u.camOn,
      micOn: u.micOn,
      isScreenSharing: u.isScreenSharing
    }))
  ];

  // PiP (Picture in Picture) View
  if (isMinimized) {
    return (
      <div style={styles.pipContainer}>
        <div style={styles.pipVideoArea} onClick={maximizeMeeting}>
          <VideoPlayer stream={localStream} isYou={true} isScreenSharing={isScreenSharing} />
          {/* Ensure remote audio still plays */}
          {tiles.filter(t => !t.isYou && t.stream).map(t => (
            <RemoteAudio key={t.id} stream={t.stream} />
          ))}
          <div style={styles.pipOverlay}>
            <span style={styles.pipTimer}>{formatTime(elapsed)}</span>
            <Maximize2 size={16} color="#fff" />
          </div>
        </div>
        <div style={styles.pipControls}>
          <button style={styles.iconBtnPip} onClick={() => setMicOn(!micOn)}>
            {micOn ? <Mic size={16} color="#fff" /> : <MicOff size={16} color="#ff5555" />}
          </button>
          <button style={styles.iconBtnPip} onClick={() => setCamOn(!camOn)}>
            {camOn ? <Video size={16} color="#fff" /> : <VideoOff size={16} color="#ff5555" />}
          </button>
          <button style={{ ...styles.iconBtnPip, backgroundColor: '#e53935' }} onClick={() => handleEnd(false)}>
            <PhoneOff size={16} color="#fff" />
          </button>
        </div>
      </div>
    );
  }

  // Full Screen View
  return (
    <div style={styles.room}>
      {!permissionGranted && (
        <div style={styles.permissionOverlay}>
          <div style={styles.permissionModal}>
            <div style={{ marginBottom: '16px' }}><Video size={42} color="#d4c4a8" /></div>
            <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Camera & Microphone Access</h2>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', textAlign: 'center', marginBottom: '24px' }}>
              {permissionError || 'To join this meeting, please allow the browser to access your camera and microphone.'}
            </p>
            {permissionError && (
              <button onClick={() => requestMedia(false, facingMode)} style={styles.primaryBtn}>Try Again</button>
            )}
            <button onClick={() => handleEnd(false)} style={styles.secondaryBtn}>Cancel & Leave</button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.meetingInfo}>
          <span style={styles.meetingTitle}>{title}</span>
          <span style={styles.timer}>{formatTime(elapsed)}</span>
        </div>
        <div style={styles.topActions}>
          <span style={{ color: '#555', fontSize: '12px' }}>{activeUsers.length} participant{activeUsers.length !== 1 ? 's' : ''}</span>
          <button style={styles.iconBtn} onClick={minimizeMeeting} title="Minimize to PiP">
            <Minimize2 size={20} color="#d4c4a8" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div style={styles.mainArea}>
        <div style={{
          ...styles.grid,
          gridTemplateColumns: tiles.length === 1 || (tiles.length <= 2 && activeSidebar) ? '1fr' : (tiles.length <= 4 || (tiles.length <= 6 && activeSidebar)) ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
        }}>
          {tiles.map(tile => (
            <div key={tile.id} style={styles.tile}>
              {tile.camOn && tile.stream ? (
                <VideoPlayer stream={tile.stream} isYou={tile.isYou} isScreenSharing={tile.isScreenSharing} />
              ) : (
                <div style={styles.cameraOff}>
                  <div style={styles.tileAvatarWrap}>
                    {tile.profilePic ? (
                      <img src={tile.profilePic} alt={tile.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                    ) : (
                      <div style={styles.tileAvatar}>{(tile.name || 'U').charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  {!tile.isYou && tile.stream && <RemoteAudio stream={tile.stream} />}
                </div>
              )}
              <div style={styles.tileLabel}>
                <span style={styles.tileName}>{tile.isYou ? `${tile.name} (You)` : tile.name}</span>
                {tile.micOn ? <Mic size={12} color="#d4c4a8" /> : <MicOff size={12} color="#ff5555" />}
                {tile.isScreenSharing && <ScreenShare size={12} color="#4caf50" style={{marginLeft: 4}}/>}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        {activeSidebar && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>{activeSidebar === 'chat' ? 'In-call Messages' : 'People'}</h3>
              <button style={styles.closeSidebarBtn} onClick={() => setActiveSidebar(null)}><X size={20} color="#888" /></button>
            </div>

            {activeSidebar === 'people' && (
              <div style={styles.sidebarContent}>
                {isAdmin && (
                  <div style={styles.adminControls}>
                    <ShieldCheck size={16} color="#d4c4a8" />
                    <span style={{flex: 1, fontSize: 13, color: '#fff'}}>Allow Screen Share</span>
                    <input 
                      type="checkbox" 
                      checked={meetingDoc?.screenShareAllowed || false}
                      onChange={toggleScreenShareAccess}
                    />
                  </div>
                )}
                {tiles.map(t => (
                  <div key={t.id} style={styles.participantRow}>
                    <div style={styles.pRowAvatarWrap}>
                      {t.profilePic ? (
                        <img src={t.profilePic} alt={t.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                      ) : (
                        <div style={styles.pRowAvatar}>{(t.name || 'U').charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                    <span style={styles.pRowName}>{t.isYou ? `${t.name} (You)` : t.name}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      {t.micOn ? <Mic size={14} color="#d4c4a8" /> : <MicOff size={14} color="#ff5555" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSidebar === 'chat' && (
              <div style={styles.chatArea}>
                <div style={styles.messagesList}>
                  {messages.map(msg => (
                    <div key={msg.id} style={styles.msgItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={styles.msgSender}>{msg.sender}</span>
                        <span style={styles.msgTime}>{msg.time}</span>
                      </div>
                      <div style={styles.msgText}>
                        {msg.type === 'file' ? (
                          msg.fileType && msg.fileType.startsWith('image/') ? (
                            <img src={msg.fileData} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                          ) : (
                            <a href={msg.fileData} target="_blank" rel="noreferrer" download={msg.fileName} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4c4a8', textDecoration: 'none', backgroundColor: '#1a1a1a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
                              <FileText size={16} />
                              <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{msg.fileName}</span>
                            </a>
                          )
                        ) : msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                {uploadProgress > 0 && <div style={{ backgroundColor: '#1a1a2e', padding: '6px 16px', fontSize: 12, color: '#d4c4a8' }}>Uploading... {Math.round(uploadProgress)}%</div>}
                {uploadError && <div style={{ backgroundColor: '#3a1a1a', padding: '6px 16px', fontSize: 12, color: '#ff6b6b' }}>{uploadError}</div>}
                <div style={styles.chatInputWrapper}>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={handleFileUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.chatAttachBtn} title="Attach File">
                    <Paperclip size={18} color="#aaa" />
                  </button>
                  <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <input type="text" placeholder="Send a message..." style={styles.chatInput} value={chatMessage} onChange={e => setChatMessage(e.target.value)} />
                    <button type="submit" style={styles.chatSendBtn}><Send size={16} color="#000" /></button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <button style={{ ...styles.controlBtn, backgroundColor: micOn ? '#1a1a1a' : '#ff555533' }} onClick={() => setMicOn(m => !m)}>
            {micOn ? <Mic size={22} color="#fff" /> : <MicOff size={22} color="#ff5555" />}
          </button>
          <span style={styles.controlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>
        </div>
        <div style={styles.controlGroup}>
          <button style={{ ...styles.controlBtn, backgroundColor: camOn ? '#1a1a1a' : '#ff555533' }} onClick={() => setCamOn(c => !c)}>
            {camOn ? <Video size={22} color="#fff" /> : <VideoOff size={22} color="#ff5555" />}
          </button>
          <span style={styles.controlLabel}>{camOn ? 'Stop Video' : 'Start Video'}</span>
        </div>
        
        {/* Flip Camera (Mobile Friendly) */}
        <div style={styles.controlGroup}>
          <button style={styles.controlBtn} onClick={handleSwitchCamera} disabled={isScreenSharing}>
            <RefreshCcw size={22} color={isScreenSharing ? '#555' : '#fff'} />
          </button>
          <span style={{...styles.controlLabel, color: isScreenSharing ? '#555' : '#666'}}>Flip Cam</span>
        </div>

        {/* Screen Share */}
        {canShareScreen && (
          <div style={styles.controlGroup}>
            <button style={{ ...styles.controlBtn, backgroundColor: isScreenSharing ? '#4caf5033' : '#1a1a1a' }} onClick={handleToggleScreenShare}>
              <ScreenShare size={22} color={isScreenSharing ? '#4caf50' : '#fff'} />
            </button>
            <span style={styles.controlLabel}>{isScreenSharing ? 'Sharing' : 'Share Screen'}</span>
          </div>
        )}

        <div style={styles.controlGroup}>
          <button style={{ ...styles.controlBtn, backgroundColor: '#e53935' }} onClick={() => handleEnd(false)}>
            <PhoneOff size={22} color="#fff" />
          </button>
          <span style={styles.controlLabel}>End</span>
        </div>
        
        <div style={{ width: 1, height: 32, backgroundColor: '#333', margin: '0 8px' }} />

        <div style={styles.controlGroup}>
          <button style={{ ...styles.controlBtn, backgroundColor: activeSidebar === 'people' ? '#333' : '#1a1a1a' }} onClick={() => setActiveSidebar(activeSidebar === 'people' ? null : 'people')}>
            <Users size={22} color="#fff" />
          </button>
          <span style={styles.controlLabel}>People</span>
        </div>
        <div style={styles.controlGroup}>
          <button style={{ ...styles.controlBtn, backgroundColor: activeSidebar === 'chat' ? '#333' : '#1a1a1a' }} onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}>
            <MessageSquare size={22} color="#fff" />
          </button>
          <span style={styles.controlLabel}>Chat</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  primaryBtn: { backgroundColor: '#d4c4a8', color: '#000', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  secondaryBtn: { backgroundColor: 'transparent', color: '#888', fontWeight: 'bold', padding: '12px 24px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', marginTop: '12px' },
  permissionOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  permissionModal: { backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  room: { position: 'fixed', inset: 0, backgroundColor: '#060606', display: 'flex', flexDirection: 'column', zIndex: 9999 },
  
  pipContainer: { position: 'fixed', bottom: '80px', right: '20px', width: '200px', backgroundColor: '#111', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' },
  pipVideoArea: { width: '100%', height: '112px', backgroundColor: '#000', position: 'relative', cursor: 'pointer' },
  pipOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px', opacity: 0, transition: 'opacity 0.2s', ':hover': { opacity: 1 } },
  pipTimer: { color: '#fff', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  pipControls: { display: 'flex', padding: '8px', justifyContent: 'space-around', backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' },
  iconBtnPip: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#333', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #111' },
  meetingInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  meetingTitle: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  timer: { color: '#d4c4a8', fontSize: '13px', fontWeight: '500' },
  topActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px' },
  mainArea: { flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' },
  sidebar: { width: '320px', backgroundColor: '#0d0d0d', borderLeft: '1px solid #111', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sidebarTitle: { color: '#fff', fontSize: '15px', fontWeight: '600', margin: 0 },
  closeSidebarBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  sidebarContent: { flex: 1, overflowY: 'auto', padding: '16px' },
  
  adminControls: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#1a1a2e', borderRadius: '8px', border: '1px solid #d4c4a833', marginBottom: '16px' },
  
  participantRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  pRowAvatarWrap: { width: '32px', height: '32px', borderRadius: '50%' },
  pRowAvatar: { width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#222', color: '#d4c4a8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' },
  pRowName: { color: '#fff', fontSize: '14px' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  messagesList: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  msgItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  msgSender: { color: '#d4c4a8', fontSize: '12px', fontWeight: 'bold' },
  msgTime: { color: '#666', fontSize: '10px' },
  msgText: { color: '#fff', fontSize: '14px', lineHeight: '1.4' },
  chatInputWrapper: { padding: '16px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: '8px' },
  chatAttachBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' },
  chatSendBtn: { backgroundColor: '#d4c4a8', border: 'none', borderRadius: '8px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  grid: { flex: 1, display: 'grid', gap: '6px', padding: '10px', overflowY: 'auto' },
  tile: { position: 'relative', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#111', border: '1px solid #1a1a1a', minHeight: '150px' },
  cameraOff: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0d0d0d, #1a1a2e)', minHeight: '150px' },
  tileAvatarWrap: { width: '70px', height: '70px', borderRadius: '50%' },
  tileAvatar: { width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #d4c4a844, #b3a38844)', border: '2px solid #d4c4a844', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#d4c4a8' },
  tileLabel: { position: 'absolute', bottom: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(0,0,0,0.65)', padding: '4px 10px', borderRadius: '20px' },
  tileName: { color: '#fff', fontSize: '13px', fontWeight: '500' },
  controls: { display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'flex-start', gap: '12px', padding: '16px 20px', backgroundColor: '#0a0a0a', borderTop: '1px solid #111', minHeight: '80px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
  controlGroup: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 },
  controlBtn: { width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#1a1a1a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 },
  controlLabel: { color: '#666', fontSize: '11px', fontWeight: '500', textAlign: 'center', maxWidth: '50px' }
};

export default function MeetingRoom() {
  const { activeMeeting } = useMeetingContext();
  if (!activeMeeting) return null;
  return <MeetingRoomInner activeMeeting={activeMeeting} />;
}
