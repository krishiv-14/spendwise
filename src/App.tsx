import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import './styles/index.css';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import ExpenseDetails from './pages/ExpenseDetails';
import ExpensePolicy from './pages/ExpensePolicy';
import Profile from './pages/Profile';
import EmployeeApproval from './pages/EmployeeApproval';
import Employees from './pages/Employees';
import NotFound from './pages/NotFound';

// Layout component
import Layout from './components/Layout';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Manager-only route wrapper
const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isManager, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Employee-only route wrapper
const EmployeeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  if (!currentUser || currentUser.role !== 'employee') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ExpenseProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Add Expense route - only for employees */}
              <Route
                path="add-expense"
                element={
                  <EmployeeRoute>
                    <AddExpense />
                  </EmployeeRoute>
                }
              />
              
              <Route path="expenses/:id" element={<ExpenseDetails />} />
              
              {/* Route for expense policies - available to all users */}
              <Route path="expense-policy" element={<ExpensePolicy />} />
              
              <Route
                path="employee-approval"
                element={
                  <ManagerRoute>
                    <EmployeeApproval />
                  </ManagerRoute>
                }
              />
              
              {/* Route for employees management - only for managers */}
              <Route
                path="employees"
                element={
                  <ManagerRoute>
                    <Employees />
                  </ManagerRoute>
                }
              />
              
              <Route path="profile" element={<Profile />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ExpenseProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 