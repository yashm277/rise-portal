import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login, loginWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [loginMethod, setLoginMethod] = useState('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setSuccess(true);
      setWelcomeName(user.name);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  }, [user, navigate]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: '1025298686811-8dsibc99d7lf2tq3kl4mgm4av93ceue1.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: 350,
          text: 'signin_with',
          shape: 'pill',
        }
      );
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      setError('');
      setLoading(true);

      const result = await login(response);

      if (result.success) {
        setSuccess(true);
        setWelcomeName(result.name || user?.name || 'User');

        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setLoading(false);
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setError('An error occurred during authentication. Please try again.');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const result = await loginWithEmail(email, password);

      if (result.success) {
        setSuccess(true);
        setWelcomeName(result.name || 'User');

        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setLoading(false);
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      setLoading(false);
      setError('An error occurred during authentication. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-card glass animate-slide-up">
          <div className="login-body" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2 className="login-welcome" style={{ color: '#1c7c54', marginBottom: '10px' }}>
              Login Successful!
            </h2>
            <p className="login-description">
              Welcome back, {welcomeName}!
            </p>
            <p className="login-footer-text" style={{ marginTop: '20px' }}>
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-card glass animate-slide-up">
          <div className="login-body" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div className="spinner-large" style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(28,124,84,0.2)',
              borderTop: '4px solid #1c7c54',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 30px'
            }}></div>
            <h2 className="login-welcome" style={{ marginBottom: '10px' }}>
              Authenticating...
            </h2>
            <p className="login-description">
              Please wait while we verify your credentials
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-card glass animate-slide-up">
          <div className="login-body" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h2 className="login-welcome" style={{ color: 'var(--status-red)', marginBottom: '10px' }}>
              Access Denied
            </h2>
            <div className="error-message" style={{ marginBottom: '30px' }}>
              {error}
            </div>
            <button
              onClick={() => {
                setError('');
                window.location.reload();
              }}
              style={{
                padding: '12px 30px',
                background: '#1c7c54',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Try Again
            </button>
          </div>
        </div>

        <div className="login-info">
          <p>© 2026 RISE Research. All rights reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-card glass animate-slide-up">
        <div className="login-header">
          <h1 className="login-title">RISE Research</h1>
          <p className="login-subtitle">Student Management System</p>
        </div>

        <div className="login-body">
          <h2 className="login-welcome">Welcome Back</h2>
          <p className="login-description">
            Sign in to continue
          </p>

          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '25px',
            background: 'rgba(0,0,0,0.05)',
            padding: '4px',
            borderRadius: '12px'
          }}>
            <button
              onClick={() => setLoginMethod('google')}
              style={{
                flex: 1,
                padding: '10px',
                background: loginMethod === 'google' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: loginMethod === 'google' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: loginMethod === 'google' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Google
            </button>
            <button
              onClick={() => setLoginMethod('email')}
              style={{
                flex: 1,
                padding: '10px',
                background: loginMethod === 'email' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: loginMethod === 'email' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: loginMethod === 'email' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Email
            </button>
          </div>

          {loginMethod === 'google' && (
            <div id="google-signin-button" className="google-button-container"></div>
          )}

          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} style={{ marginTop: '10px' }}>
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: 'rgba(255,255,255,0.8)',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1c7c54';
                    e.target.style.boxShadow = '0 0 0 3px rgba(28,124,84,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: 'rgba(255,255,255,0.8)',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1c7c54';
                    e.target.style.boxShadow = '0 0 0 3px rgba(28,124,84,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#1c7c54',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(28,124,84,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#155f40';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#1c7c54';
                }}
              >
                Sign In
              </button>
            </form>
          )}

          <p className="login-footer-text">
            By logging in, you agree to our{' '}
            <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: '#1c7c54', textDecoration: 'none' }}>
              Terms of Service
            </a>
          </p>
        </div>
      </div>

      <div className="login-info">
        <p>© 2026 RISE Research. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
