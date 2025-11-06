import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in sessionStorage
    const storedEmail = sessionStorage.getItem('userEmail');
    const storedName = sessionStorage.getItem('userName');
    const storedPicture = sessionStorage.getItem('userPicture');
    const storedRole = sessionStorage.getItem('userRole');

    if (storedEmail) {
      setUser({
        email: storedEmail,
        name: storedName,
        picture: storedPicture,
        role: storedRole,
      });
    }
    setLoading(false);
  }, []);

  const login = async (googleResponse) => {
    try {
      const { credential } = googleResponse;
      
      console.log('🔐 Verifying Google credentials with backend...');
      
      // Verify with backend
      const response = await authAPI.verifyGoogleToken(credential);
      
      if (response.data.success) {
        const userData = {
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture,
          role: response.data.role,
        };

        console.log(`✅ User authorized: ${userData.email} (Role: ${userData.role})`);

        // Store in sessionStorage (like vanilla JS does)
        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userName', userData.name);
        sessionStorage.setItem('userPicture', userData.picture || '');
        sessionStorage.setItem('userRole', userData.role || '');

        setUser(userData);
        return { success: true, name: userData.name, email: userData.email, role: userData.role };
      } else {
        console.log(`❌ User not authorized: ${response.data.message}`);
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userPicture');
    sessionStorage.removeItem('userRole');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
