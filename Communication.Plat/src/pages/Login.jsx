import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { sendOtpEmail } from '../utils/emailjs';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');

  const { login, logout, firebaseUser, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Already logged in — go to dashboard
  if (firebaseUser && !loading && !otpStep) return <Navigate to="/" />;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccessMessage('');
      setLoading(true);
      
      await login(email, password);
      await logout();
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      await sendOtpEmail(email, otp);
      
      setSuccessMessage('An OTP has been sent to your email.');
      setOtpStep(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
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
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign in. ' + err.message);
    }
    setLoading(false);
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link sent to your email.');
      setForgotPasswordStep(false);
    } catch (err) {
      setError(err.message || 'Error sending password reset email');
    } finally {
      setLoading(false);
    }
  };

  if (forgotPasswordStep) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Reset Password</h2>
          {error && <div style={styles.error}>{error}</div>}
          {successMessage && <div style={{...styles.error, backgroundColor: '#dcfce7', color: '#166534'}}>{successMessage}</div>}
          <form onSubmit={handleForgotPassword} style={styles.form}>
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
            <button disabled={loading} type="submit" style={styles.button}>
              Send Reset Link
            </button>
            <button type="button" onClick={() => { setForgotPasswordStep(false); setError(''); setSuccessMessage(''); }} style={styles.ghostButton}>
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Login Verification</h2>
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
              Verify & Log In
            </button>
            <button type="button" onClick={() => { setOtpStep(false); setError(''); setSuccessMessage(''); }} style={styles.ghostButton}>
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={{...styles.error, backgroundColor: '#dcfce7', color: '#166534'}}>{successMessage}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{...styles.label, marginBottom: 0}}>Password</label>
              <button type="button" onClick={() => { setForgotPasswordStep(true); setError(''); setSuccessMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, flex: 1, paddingRight: '40px' }}
                placeholder="Enter your password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button disabled={loading} type="submit" style={styles.button}>
            Log In
          </button>
        </form>
        <div style={styles.footer}>
          Need an account? <Link to="/register" style={styles.link}>Sign Up</Link>
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
    gap: '20px'
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
