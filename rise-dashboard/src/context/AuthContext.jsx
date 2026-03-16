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
    const storedEmail = sessionStorage.getItem('userEmail');
    const storedName = sessionStorage.getItem('userName');
    const storedPicture = sessionStorage.getItem('userPicture');
    const storedRole = sessionStorage.getItem('userRole');
    const storedEmployeeTypes = sessionStorage.getItem('userEmployeeTypes');

    if (storedEmail) {
      setUser({
        email: storedEmail,
        name: storedName,
        picture: storedPicture,
        role: storedRole,
        employeeTypes: storedEmployeeTypes ? JSON.parse(storedEmployeeTypes) : [],
      });
    }
    setLoading(false);
  }, []);

  const login = async (googleResponse) => {
    try {
      const { credential } = googleResponse;

      const response = await authAPI.verifyGoogleToken(credential);

      if (response.data.success) {
        const userData = {
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture,
          role: response.data.role,
          employeeTypes: response.data.employeeTypes || [],
        };

        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userName', userData.name);
        sessionStorage.setItem('userPicture', userData.picture || '');
        sessionStorage.setItem('userRole', userData.role || '');
        sessionStorage.setItem('userEmployeeTypes', JSON.stringify(userData.employeeTypes));

        setUser(userData);
        return { success: true, name: userData.name, email: userData.email, role: userData.role };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';
      return { success: false, message: errorMessage };
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const response = await authAPI.loginWithEmail(email, password);

      if (response.data.success) {
        const userData = {
          email: response.data.email,
          name: response.data.name,
          picture: '',
          role: response.data.role,
          employeeTypes: response.data.employeeTypes || [],
        };

        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userName', userData.name);
        sessionStorage.setItem('userPicture', '');
        sessionStorage.setItem('userRole', userData.role || '');
        sessionStorage.setItem('userEmployeeTypes', JSON.stringify(userData.employeeTypes));

        setUser(userData);
        return { success: true, name: userData.name, email: userData.email, role: userData.role };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userPicture');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmployeeTypes');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithEmail, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
