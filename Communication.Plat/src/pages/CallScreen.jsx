import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Volume2, VolumeX, RotateCcw, Users
} from 'lucide-react';

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function CallScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const { name, isVideo: startVideo, isGroup } = location.state || {};

  const [callState, setCallState] = useState('calling'); // 'calling' | 'connected'
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(!!startVideo);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [frontCamera, setFrontCamera] = useState(true);

  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const timer = useTimer();

  // Simulate ringing then connect after 3s
  useEffect(() => {
    const t = setTimeout(() => setCallState('connected'), 3000);
    return () => clearTimeout(t);
  }, []);

  // Request camera/mic
  useEffect(() => {
    if (!startVideo) return;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(() => setVideoOn(false));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [startVideo]);

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(m => !m);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !videoOn; });
    setVideoOn(v => !v);
  };

  const endCall = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={styles.page}>
      {/* Background gradient */}
      <div style={styles.bg} />

      {/* Remote video placeholder / avatar */}
      <div style={styles.remoteArea}>
        {startVideo && callState === 'connected' ? (
          <div style={styles.remoteVideoPlaceholder}>
            {/* In production: <video ref={remoteVideoRef} autoPlay /> */}
            <div style={styles.remoteAvatar}>{initials}</div>
          </div>
        ) : (
          <div style={styles.callerInfo}>
            <div style={styles.avatarRing}>
              <div style={styles.avatar}>
                {isGroup ? <Users size={44} color="#d4c4a8" /> : <span style={styles.avatarText}>{initials}</span>}
              </div>
            </div>
            <h2 style={styles.callerName}>{name || 'Unknown'}</h2>
            <p style={styles.callStatus}>
              {callState === 'calling'
                ? (startVideo ? '📹 Video calling...' : '🔔 Calling...')
                : timer}
            </p>
          </div>
        )}

        {/* Connected + video: timer overlay */}
        {callState === 'connected' && startVideo && (
          <div style={styles.timerOverlay}>
            <span style={styles.timerText}>{timer}</span>
          </div>
        )}
      </div>

      {/* Local camera preview (video calls only) */}
      {startVideo && videoOn && (
        <div style={styles.localPreview}>
          <video ref={localVideoRef} autoPlay muted playsInline style={styles.localVideo} />
        </div>
      )}

      {/* Control buttons */}
      <div style={styles.controls}>
        {/* Mic */}
        <div style={styles.ctrlGroup}>
          <button style={{ ...styles.ctrlBtn, backgroundColor: micOn ? '#1a1a2e' : '#ff5555' }} onClick={toggleMic}>
            {micOn ? <Mic size={24} color="#fff" /> : <MicOff size={24} color="#fff" />}
          </button>
          <span style={styles.ctrlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>
        </div>

        {/* Speaker */}
        <div style={styles.ctrlGroup}>
          <button style={{ ...styles.ctrlBtn, backgroundColor: speakerOn ? '#1a1a2e' : '#333' }} onClick={() => setSpeakerOn(s => !s)}>
            {speakerOn ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#aaa" />}
          </button>
          <span style={styles.ctrlLabel}>Speaker</span>
        </div>

        {/* Video toggle (only in video calls) */}
        {startVideo && (
          <div style={styles.ctrlGroup}>
            <button style={{ ...styles.ctrlBtn, backgroundColor: videoOn ? '#1a1a2e' : '#333' }} onClick={toggleVideo}>
              {videoOn ? <Video size={24} color="#fff" /> : <VideoOff size={24} color="#aaa" />}
            </button>
            <span style={styles.ctrlLabel}>{videoOn ? 'Camera' : 'No Cam'}</span>
          </div>
        )}

        {/* Flip camera */}
        {startVideo && videoOn && (
          <div style={styles.ctrlGroup}>
            <button style={{ ...styles.ctrlBtn, backgroundColor: '#1a1a2e' }} onClick={() => setFrontCamera(f => !f)}>
              <RotateCcw size={24} color="#fff" />
            </button>
            <span style={styles.ctrlLabel}>Flip</span>
          </div>
        )}
      </div>

      {/* End Call */}
      <div style={styles.endRow}>
        <button style={styles.endBtn} onClick={endCall}>
          <PhoneOff size={30} color="#fff" />
        </button>
        <span style={styles.ctrlLabel}>End Call</span>
      </div>
    </div>
  );
}

const styles = {
  page: { position: 'fixed', inset: 0, backgroundColor: '#050510', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', zIndex: 200, paddingBottom: 48, overflow: 'hidden' },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, #1a0a3a 0%, #000 70%)', zIndex: 0 },

  remoteArea: { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 },
  remoteVideoPlaceholder: { position: 'absolute', inset: 0, backgroundColor: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  remoteAvatar: { width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #2a1a4a,#4a2a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#d4c4a8' },
  timerOverlay: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 14px', backdropFilter: 'blur(8px)' },
  timerText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  callerInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 },
  avatarRing: {
    width: 140, height: 140, borderRadius: '50%',
    border: '2px solid rgba(187,134,252,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'pulse 2s infinite',
    boxShadow: '0 0 0 16px rgba(187,134,252,0.06), 0 0 0 32px rgba(187,134,252,0.03)'
  },
  avatar: { width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, #2a1a4a,#4a2a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#d4c4a8', fontWeight: '800', fontSize: 40 },
  callerName: { color: '#fff', fontWeight: '700', fontSize: 26, margin: 0 },
  callStatus: { color: 'rgba(255,255,255,0.5)', fontSize: 16, margin: 0 },

  localPreview: { position: 'absolute', bottom: 160, right: 20, width: 90, height: 130, borderRadius: 14, overflow: 'hidden', border: '2px solid #d4c4a844', zIndex: 10 },
  localVideo: { width: '100%', height: '100%', objectFit: 'cover' },

  controls: { display: 'flex', justifyContent: 'center', gap: 28, zIndex: 1, paddingBottom: 8 },
  ctrlGroup: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  ctrlBtn: { width: 58, height: 58, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s' },
  ctrlLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  endRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 },
  endBtn: { width: 70, height: 70, borderRadius: '50%', backgroundColor: '#ff3b30', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,59,48,0.5)' },
};
