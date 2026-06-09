import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Image, Edit3, Check, X,
  Mail, Save, User, Briefcase, CircleDot
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ── Photo Picker Modal ──────────────────────────────────────────────────────
function PhotoPickerModal({ onClose, onPhoto }) {
  const galleryRef = useRef(null);
  const cameraRef  = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onPhoto(file);
    onClose();
  };

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.sheet} onClick={e => e.stopPropagation()}>
        <div style={modal.handle} />
        <h3 style={modal.title}>Profile Photo</h3>
        <p style={modal.sub}>Choose how to set your photo</p>

        <button style={modal.option} onClick={() => cameraRef.current?.click()}>
          <div style={{ ...modal.optIcon, backgroundColor: '#d4c4a822', border: '1px solid #d4c4a833' }}>
            <Camera size={26} color="#d4c4a8" />
          </div>
          <div style={modal.optText}>
            <span style={modal.optLabel}>Open Camera</span>
            <span style={modal.optSub}>Take a photo right now</span>
          </div>
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFile} />

        <button style={modal.option} onClick={() => galleryRef.current?.click()}>
          <div style={{ ...modal.optIcon, backgroundColor: '#03dac622', border: '1px solid #03dac633' }}>
            <Image size={26} color="#03dac6" />
          </div>
          <div style={modal.optText}>
            <span style={modal.optLabel}>Choose from Gallery</span>
            <span style={modal.optSub}>Select from your device</span>
          </div>
        </button>
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        <button style={modal.cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Editable Field ──────────────────────────────────────────────────────────
function EditableField({ label, icon: Icon, value, onChange, readOnly, subtext, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  const save   = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  // Keep draft in sync if value changes externally
  React.useEffect(() => { setDraft(value); }, [value]);

  return (
    <div style={field.wrap}>
      <span style={field.label}>
        {Icon && <Icon size={11} style={{ marginRight: 5 }} />}
        {label}
      </span>
      <div style={{ ...field.box, borderColor: editing ? '#d4c4a844' : '#111' }}>
        {editing ? (
          <>
            <input
              autoFocus
              value={draft}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              style={field.input}
            />
            <button style={field.btn} onClick={save}><Check size={17} color="#d4c4a8" /></button>
            <button style={field.btn} onClick={cancel}><X size={17} color="#555" /></button>
          </>
        ) : (
          <>
            <span style={{ ...field.value, color: readOnly ? '#444' : (value ? '#fff' : '#333') }}>
              {value || placeholder || '—'}
            </span>
            {!readOnly && (
              <button style={field.btn} onClick={() => { setDraft(value); setEditing(true); }}>
                <Edit3 size={16} color="#444" />
              </button>
            )}
          </>
        )}
      </div>
      {subtext && <span style={field.sub}>{subtext}</span>}
    </div>
  );
}

// ── Main Profile Page ───────────────────────────────────────────────────────
export default function Profile() {
  const { userData, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  // All fields sourced from Firestore userData (auto-populated on signup)
  const [name,     setName]     = useState(userData?.name     || '');
  const [status,   setStatus]   = useState(userData?.status   || 'Available 👋');
  const [jobTitle, setJobTitle] = useState(userData?.jobTitle || '');
  const [bio,      setBio]      = useState(userData?.bio      || '');
  const [avatarUrl, setAvatarUrl] = useState(userData?.profilePic || null);

  const [showPicker,  setShowPicker]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [savedOk,     setSavedOk]     = useState(false);
  const [saveError,   setSaveError]   = useState('');

  // Compress avatar and save directly to Firestore as base64 string
  const handleAvatarFile = async (file) => {
    if (!userData?.uid) return;
    setUploading(true);
    setUploadPct(10);
    
    try {
      // Compress image using canvas
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
          const img = new window.Image();
          img.onerror = reject;
          img.onload = () => {
            // Compress to max 300x300 for avatars to keep Firestore doc size small
            let { width, height } = img;
            if (width > 300 || height > 300) {
              if (width > height) { height = Math.round(height * 300 / width); width = 300; }
              else { width = Math.round(width * 300 / height); height = 300; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            // Low quality jpeg since it's just a tiny avatar thumbnail
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
      
      setUploadPct(70);
      
      // Auto-save avatar immediately
      await updateUserProfile({ profilePic: base64 });
      setAvatarUrl(base64);
      setUploadPct(100);
    } catch (err) {
      console.error('Avatar update failed:', err);
      setSaveError('Failed to update photo. Please try another image.');
    } finally {
      setTimeout(() => { setUploading(false); setUploadPct(0); }, 500);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateUserProfile({ name, status, jobTitle, bio });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      console.error(err);
      setSaveError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const initials    = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const roleColor   = userData?.role === 'superadmin' ? '#ff4d6d' : userData?.role === 'admin' ? '#d4c4a8' : '#555';
  const roleLabel   = userData?.role === 'superadmin' ? 'Super Admin' : userData?.role === 'admin' ? 'Admin' : 'Employee';

  const JOB_TITLES  = ['HR', 'Manager', 'Team Lead', 'Developer', 'Designer', 'Sales', 'Finance', 'Operations', 'Marketing', 'Support'];

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.iconBtn}><ArrowLeft size={22} color="#fff" /></button>
        <span style={styles.topTitle}>My Profile</span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...styles.saveBtn, backgroundColor: savedOk ? '#1a3a1a' : '#d4c4a8', color: savedOk ? '#4caf50' : '#000' }}
        >
          {savedOk ? <><Check size={15} /> Saved!</> : saving ? 'Saving…' : <><Save size={15} /> Save</>}
        </button>
      </div>

      {saveError && (
        <div style={{ backgroundColor: '#3a1a1a', padding: '10px 16px', fontSize: 13, color: '#ff6b6b', textAlign: 'center' }}>
          {saveError}
        </div>
      )}

      {/* Avatar Section */}
      <div style={styles.avatarSection}>
        <div style={styles.avatarWrap}>
          {uploading ? (
            <div style={{ ...styles.avatarFallback, flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 40, height: 40, border: '3px solid #333', borderTop: '3px solid #d4c4a8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: 12, color: '#d4c4a8' }}>{uploadPct}%</span>
            </div>
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="Profile" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarFallback}>{initials}</div>
          )}
          <button style={styles.cameraBtn} onClick={() => setShowPicker(true)} title="Change Photo">
            <Camera size={18} color="#000" />
          </button>
        </div>

        {/* Role badge */}
        <span style={{ ...styles.roleBadge, color: roleColor, borderColor: roleColor + '44', backgroundColor: roleColor + '11' }}>
          {roleLabel}
        </span>
        <p style={styles.tapHint} onClick={() => setShowPicker(true)}>Tap camera icon to change photo</p>
      </div>

      {/* Editable Fields */}
      <div style={styles.fields}>

        {/* Section: Personal */}
        <span style={styles.sectionLabel}>PERSONAL INFO</span>

        <EditableField
          label="FULL NAME"
          icon={User}
          value={name}
          onChange={setName}
          placeholder="Enter your name"
        />
        <EditableField
          label="STATUS"
          icon={CircleDot}
          value={status}
          onChange={setStatus}
          placeholder="e.g. Available 👋"
          subtext="Let others know what you're up to"
        />
        <EditableField
          label="BIO"
          icon={User}
          value={bio}
          onChange={setBio}
          placeholder="Tell your team about yourself…"
        />

        {/* Read-only email from Firebase Auth */}
        <div style={field.wrap}>
          <span style={field.label}><Mail size={11} style={{ marginRight: 5 }} />EMAIL</span>
          <div style={{ ...field.box, borderColor: '#111' }}>
            <span style={{ ...field.value, color: '#555' }}>{userData?.email || '—'}</span>
            <span style={styles.lockTag}>🔒 Fixed</span>
          </div>
          <span style={field.sub}>Email cannot be changed here</span>
        </div>

        {/* Section: Job */}
        <span style={styles.sectionLabel}>JOB DETAILS</span>

        {/* Quick-pick job title chips */}
        <div style={{ marginBottom: 4 }}>
          <span style={field.label}><Briefcase size={11} style={{ marginRight: 5 }} />JOB TITLE</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {JOB_TITLES.map(t => (
              <button
                key={t}
                onClick={() => setJobTitle(t)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
                  backgroundColor: jobTitle === t ? '#d4c4a822' : '#0a0a0a',
                  color: jobTitle === t ? '#d4c4a8' : '#444',
                  borderColor: jobTitle === t ? '#d4c4a855' : '#1a1a1a',
                  transition: 'all 0.15s',
                }}
              >{t}</button>
            ))}
          </div>
          <EditableField
            label=""
            value={jobTitle}
            onChange={setJobTitle}
            placeholder="Or type a custom title (e.g. Senior Developer, CTO)"
          />
        </div>

        {/* Role - read-only */}
        <div style={styles.roleWrap}>
          <span style={field.label}>ROLE</span>
          <div style={{ ...field.box, borderColor: '#111' }}>
            <span style={{ flex: 1, fontSize: 16, fontWeight: '600', color: roleColor, textTransform: 'capitalize' }}>
              {roleLabel}
            </span>
            <span style={styles.lockTag}>🔒 Admin Panel</span>
          </div>
          <span style={field.sub}>Role can only be changed by the Super Admin</span>
        </div>
      </div>

      {/* Photo Picker Modal */}
      {showPicker && (
        <PhotoPickerModal
          onClose={() => setShowPicker(false)}
          onPhoto={handleAvatarFile}
        />
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page:      { height: '100%', overflowY: 'auto', backgroundColor: '#000', paddingBottom: 80 },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #111' },
  iconBtn:   { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' },
  topTitle:  { color: '#fff', fontWeight: '700', fontSize: '18px' },
  saveBtn:   { display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: '700', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.3s' },

  avatarSection:  { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 20px', gap: 10 },
  avatarWrap:     { position: 'relative' },
  avatarImg:      { width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid #d4c4a844' },
  avatarFallback: { width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, #2a1a4a, #4a2a7a)', border: '3px solid #d4c4a844', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: '800', color: '#d4c4a8' },
  cameraBtn:      { position: 'absolute', bottom: 4, right: 4, width: 34, height: 34, borderRadius: '50%', backgroundColor: '#d4c4a8', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  roleBadge:      { fontSize: 12, fontWeight: '700', padding: '4px 14px', borderRadius: 20, border: '1px solid' },
  tapHint:        { color: '#333', fontSize: 12, margin: 0, cursor: 'pointer' },

  sectionLabel: { display: 'block', fontSize: '10px', color: '#d4c4a866', fontWeight: '800', letterSpacing: '2px', padding: '20px 0 6px' },
  fields:       { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 },
  roleWrap:     { marginBottom: 4 },
  lockTag:      { fontSize: 11, color: '#444', backgroundColor: '#111', border: '1px solid #1a1a1a', padding: '3px 8px', borderRadius: 8, whiteSpace: 'nowrap' },
};

const field = {
  wrap:  { marginBottom: 4 },
  label: { display: 'flex', alignItems: 'center', fontSize: '11px', color: '#333', fontWeight: '700', letterSpacing: '1.5px', marginTop: 16, marginBottom: 8 },
  box:   { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#0a0a0a', borderRadius: 12, padding: '14px 16px', border: '1px solid', transition: 'border-color 0.2s' },
  value: { flex: 1, fontSize: 16, fontWeight: '500' },
  input: { flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: '500', outline: 'none', fontFamily: 'inherit' },
  btn:   { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 },
  sub:   { display: 'block', fontSize: 11, color: '#333', marginTop: 6, paddingLeft: 4 },
};

const modal = {
  overlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 },
  sheet:     { width: '100%', maxWidth: 480, backgroundColor: '#0d0d0d', borderRadius: '24px 24px 0 0', border: '1px solid #1a1a1a', padding: '12px 20px 32px', display: 'flex', flexDirection: 'column', gap: 4 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#222', margin: '0 auto 16px' },
  title:     { color: '#fff', fontWeight: '700', fontSize: 20, margin: '0 0 4px', textAlign: 'center' },
  sub:       { color: '#444', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  option:    { display: 'flex', alignItems: 'center', gap: 16, padding: '14px', backgroundColor: '#111', borderRadius: 14, border: '1px solid #1a1a1a', cursor: 'pointer', marginBottom: 8, textAlign: 'left', fontFamily: 'inherit' },
  optIcon:   { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optText:   { display: 'flex', flexDirection: 'column', gap: 3 },
  optLabel:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  optSub:    { color: '#444', fontSize: 12 },
  cancelBtn: { width: '100%', backgroundColor: '#1a1a1a', color: '#aaa', border: '1px solid #222', borderRadius: 14, padding: '14px', fontSize: 16, fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 },
};
