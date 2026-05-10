import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Radio, Smartphone, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Login = () => {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [isLogin, setIsLogin] = useState(true); // only for email method
  
  // Email states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpStep, setOtpStep] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/inbox');
      }
    }
  }, [user, navigate]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved
        }
      });
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      // Ensure phone number has country code, e.g., +1
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpStep(true);
    } catch (err) {
      setError(err.message || 'Error sending SMS');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const firebaseUser = result.user;
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        // Create new user profile for phone login
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          name: 'Phone User',
          phone: firebaseUser.phoneNumber,
          role: 'user',
          created_at: new Date().toISOString()
        });
      }
      
      // The useEffect will handle navigation
    } catch (err) {
      setError('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, 'user');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (otpStep) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="flex flex-col items-center mb-6">
            <div className="icon-container mb-4" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '64px', height: '64px'}}>
              <ShieldCheck size={32} />
            </div>
            <h2>Verify Phone</h2>
            <p className="subtitle">Enter the 6-digit code sent to {phoneNumber}</p>
          </div>
          
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="000000" 
              value={verificationCode} 
              onChange={(e) => setVerificationCode(e.target.value)} 
              required 
              style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold'}}
            />
            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'} <ArrowRight size={16} />
            </button>
            <button type="button" className="btn-outline" onClick={() => {
              setOtpStep(false);
              setConfirmationResult(null);
              setVerificationCode('');
            }}>
              Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="flex flex-col items-center mb-6">
          <Radio size={48} color="#1a1a1a" className="mb-4" />
          <h2>Welcome to BroadcastHub</h2>
          <p className="subtitle" style={{marginBottom: 0}}>
            {loginMethod === 'email' 
              ? (isLogin ? 'Sign in to your account' : 'Create a new account')
              : 'Sign in with your phone number'
            }
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6" style={{backgroundColor: 'var(--bg-main)'}}>
          <button 
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${loginMethod === 'email' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'}`}
            style={loginMethod === 'email' ? {backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'} : {color: 'var(--text-muted)'}}
            onClick={() => setLoginMethod('email')}
          >
            <Mail size={16} /> Email
          </button>
          <button 
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${loginMethod === 'phone' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'}`}
            style={loginMethod === 'phone' ? {backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'} : {color: 'var(--text-muted)'}}
            onClick={() => {
              setLoginMethod('phone');
              setError('');
            }}
          >
            <Smartphone size={16} /> Phone
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loginMethod === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-semibold mb-1 block">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>

            <div className="text-center mt-4 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="btn-outline" 
                style={{padding: '0.25rem 0.5rem', border: 'none', color: 'var(--info)', fontWeight: 600}}
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Phone Number</label>
              <input 
                type="tel" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                required 
                placeholder="+1234567890"
              />
              <p className="text-muted text-xs mt-1">Include your country code (e.g., +1 for US/Canada, +91 for India).</p>
            </div>
            
            <div id="recaptcha-container"></div>

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'Sending Code...' : 'Send SMS Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
