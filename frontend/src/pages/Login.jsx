import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Radio, ShieldCheck, ArrowRight } from 'lucide-react';
import { getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // 2FA States
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState(null);

  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    try {
      const selection = mfaResolver.hints[0];
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const cred = PhoneAuthProvider.credential(mfaResolver.hints[0].mfaId, mfaCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await mfaResolver.resolveSignIn(multiFactorAssertion);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Invalid verification code');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let firebaseUser;
      if (isLogin) {
        firebaseUser = await login(email, password);
      } else {
        firebaseUser = await register(name, email, password, 'user');
      }

      // Check role and navigate (logic moved to AuthContext onAuthStateChanged for stability, 
      // but we still navigate here for immediate feedback)
      // Since AuthContext already handles redirection/state, we just wait a bit or use the returned user
      if (firebaseUser) {
        // We might need to wait for Firestore doc to be created in register case
        setTimeout(() => navigate('/'), 500); 
      }
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(getMultiFactorResolver(auth, err));
        setMfaStep(true);
      } else {
        setError(err.message || 'An error occurred');
      }
    }
  };

  if (mfaStep) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="flex flex-col items-center mb-6">
            <div className="icon-container mb-4" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '64px', height: '64px'}}>
              <ShieldCheck size={32} />
            </div>
            <h2>Two-Factor Authentication</h2>
            <p className="subtitle">Enter the 6-digit code sent to your phone</p>
          </div>
          
          <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="000000" 
              value={mfaCode} 
              onChange={(e) => setMfaCode(e.target.value)} 
              required 
              style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold'}}
            />
            <button type="submit" className="btn-primary mt-2">
              Verify & Sign In <ArrowRight size={16} />
            </button>
            <button type="button" className="btn-outline" onClick={() => setMfaStep(false)}>
              Back to Login
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
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <button type="submit" className="btn-primary mt-2">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
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
      </div>
    </div>
  );
};

export default Login;
