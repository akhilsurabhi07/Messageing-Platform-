import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { sendOtpEmail } from '../utils/emailjs';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [otpStep, setOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');

  const { signup, firebaseUser } = useAuth();
  const navigate = useNavigate();

  const checkPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const passwordStrength = checkPasswordStrength(password);

  // Already logged in — go to dashboard
  if (firebaseUser) return <Navigate to="/" />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (passwordStrength < 3) {
      return setError('Please use a stronger password. Include at least 8 chars, a number, and a capital letter.');
    }

    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      await sendOtpEmail(email, otp);
      
      setSuccessMessage('An OTP has been sent to your email.');
      setOtpStep(true);
    } catch (err) {
      console.error('Email send error:', err);
      setError('Failed to send OTP. Please check your email address or try again later.');
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (userOtpInput !== generatedOtp) {
      return setError('Invalid OTP. Please try again.');
    }

    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      await signup(email, password, name);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please log in instead.');
        setOtpStep(false);
      } else {
        setError(err.message || 'Failed to create an account. ' + err.message);
      }
    }
    setLoading(false);
  }

  if (otpStep) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Verify Your Email</h2>
          {error && <div style={styles.error}>{error}</div>}
          {successMessage && <div style={{...styles.error, backgroundColor: '#dcfce7', color: '#166534'}}>{successMessage}</div>}
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter 6-digit OTP</label>
              <input
                type="text"
                required
                value={userOtpInput}
                onChange={(e) => setUserOtpInput(e.target.value)}
                style={styles.input}
                placeholder="123456"
                maxLength="6"
              />
            </div>
            <button disabled={loading} type="submit" style={styles.button}>
              Verify & Create Account
            </button>
            <button type="button" onClick={() => { setOtpStep(false); setError(''); setSuccessMessage(''); }} style={styles.ghostButton}>
              Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={{...styles.error, backgroundColor: '#dcfce7', color: '#166534'}}>{successMessage}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="John Doe"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, flex: 1, paddingRight: '40px' }}
                placeholder="Create a password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '4px', height: '4px', marginTop: '4px' }}>
              {[1, 2, 3, 4].map(level => (
                <div 
                  key={level} 
                  style={{
                    flex: 1, 
                    backgroundColor: passwordStrength >= level ? 
                      (passwordStrength < 3 ? '#ef4444' : passwordStrength === 3 ? '#eab308' : '#22c55e') 
                      : '#e5e7eb',
                    borderRadius: '2px',
                    transition: 'background-color 0.3s'
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Include at least 8 chars, a number, and a capital letter.</p>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...styles.input, flex: 1, paddingRight: '40px' }}
                placeholder="Confirm your password"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button disabled={loading} type="submit" style={styles.button}>
            Sign Up
          </button>
        </form>
        <div style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Log In</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-color)',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--item-bg)',
    padding: '40px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  },
  title: {
    color: 'var(--text-color)',
    marginBottom: '30px',
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: '600'
  },
  error: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    color: '#ff6b6b',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '14px'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--nav-bg)',
    color: 'var(--text-color)',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    padding: '14px',
    backgroundColor: 'var(--accent-color)',
    color: '#000',
    fontWeight: 'bold',
    fontSize: '16px',
    borderRadius: '8px',
    marginTop: '10px',
    transition: 'background-color 0.2s'
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  },
  link: {
    color: 'var(--accent-color)',
    textDecoration: 'none',
    fontWeight: '600'
  },
  ghostButton: {
    padding: '14px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    fontWeight: 'bold',
    fontSize: '16px',
    borderRadius: '8px',
    marginTop: '10px',
    transition: 'background-color 0.2s',
    border: '1px solid var(--border-color)',
    cursor: 'pointer'
  }
};
