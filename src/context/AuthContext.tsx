import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Currency } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isManager: boolean;
  updateUserPreferredCurrency: (currency: Currency) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Check for stored login on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStoredUser();
  }, []);
  
  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const user = await api.login(username, password);
      
      if (user) {
        setCurrentUser(user);
        // Store user in localStorage for persistent session
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };
  
  // Check if user is manager
  const isManager = currentUser?.role === 'manager';
  
  // Update user's preferred currency
  const updateUserPreferredCurrency = async (currency: Currency): Promise<void> => {
    if (!currentUser) return;
    
    try {
      // Create updated user object
      const updatedUser = {
        ...currentUser,
        preferredCurrency: currency
      };
      
      // Update in database via API
      await api.updateUser(updatedUser);
      
      // Update in state and localStorage
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating currency preference:', error);
      throw error;
    }
  };
  
  // Context value
  const value = {
    currentUser,
    isLoading,
    login,
    logout,
    isAuthenticated: !!currentUser,
    isManager,
    updateUserPreferredCurrency
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 