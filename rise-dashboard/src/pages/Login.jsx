import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  useEffect(() => {
    // Check if user is already logged in (like vanilla JS does)
    if (user) {
      console.log('User already logged in, redirecting...');
      setSuccess(true);
      setWelcomeName(user.name);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: '1025298686811-8dsibc99d7lf2tq3kl4mgm4av93ceue1.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      });

      // Render the button
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
      setLoading(true); // Show loading state
      
      console.log('User attempting login via Google...');
      
      const result = await login(response);
      
      if (result.success) {
        // Show success state
        setSuccess(true);
        setWelcomeName(result.name || user?.name || 'User');
        
        // Redirect after 2 seconds (like vanilla JS)
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setLoading(false);
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setLoading(false);
      setError('An error occurred during authentication. Please try again.');
    }
  };

  // Show success state (like vanilla JS successSection)
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
            <h2 className="login-welcome" style={{ color: 'var(--apple-green)', marginBottom: '10px' }}>
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

  // Show loading state (like vanilla JS loadingSection)
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
              border: '4px solid rgba(0,122,255,0.2)', 
              borderTop: '4px solid var(--apple-blue)',
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

  // Show error state if error exists (like vanilla JS errorSection)
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
            <h2 className="login-welcome" style={{ color: 'var(--apple-red)', marginBottom: '10px' }}>
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
                background: 'var(--apple-blue)',
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
          <p>© 2024 RISE Research. All rights reserved.</p>
        </div>
      </div>
    );
  }

  // Default login state (like vanilla JS loginSection)
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
            Sign in with your Google account to continue
          </p>

          <div id="google-signin-button" className="google-button-container"></div>

          <p className="login-footer-text">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <div className="login-info">
        <p>© 2024 RISE Research. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
