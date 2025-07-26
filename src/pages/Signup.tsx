import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../utils/db';
import { User, Currency, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('employee');
  const [companyName, setCompanyName] = useState<string>('');
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('USD');
  
  // Form validation and submission state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors and success message
    setErrors({});
    setSuccessMessage('');
    
    // Validate fields
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create new user
      const newUser: User = {
        id: uuidv4(),
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        role,
        companyName: companyName.trim(),
        isActive: role === 'manager', // Managers are active immediately
        preferredCurrency
      };
      
      // Add the user to the database
      await db.createUser(newUser);
      
      // Show success message
      if (role === 'employee') {
        setSuccessMessage('Account created! You will receive an email notification when your account is approved by the manager.');
      } else {
        setSuccessMessage('Account created successfully! You can now log in.');
      }
      
      // Clear form fields
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setCompanyName('');
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Username already exists')) {
          setErrors({ username: 'Username already exists. Please choose another.' });
        } else if (error.message.includes('Email already exists')) {
          setErrors({ email: 'Email already exists. Please use another email address.' });
        } else if (error.message.includes('Database connection')) {
          setErrors({ general: 'Database connection error. Please try again or reload the page.' });
        } else if (error.message.includes('Missing required user fields')) {
          setErrors({ general: 'Some required information is missing. Please check all fields.' });
        } else {
          setErrors({ general: 'An error occurred while creating your account. Please try again.' });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 md:space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-center text-primary">SpendWise</h1>
          <h2 className="mt-2 text-center text-lg md:text-xl font-semibold text-gray-800">Create a New Account</h2>
          <p className="mt-2 text-center text-xs md:text-sm text-gray-600">
            Sign up to start tracking your company expenses
          </p>
        </div>
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {errors.general && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            
            {/* Username */}
            <div>
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`form-input ${errors.username ? 'border-red-500' : ''}`}
                placeholder="johndoe"
              />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            
            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${errors.password ? 'border-red-500' : ''}`}
                placeholder="******"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
            
            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="******"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>
            
            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <div className="flex space-x-4 mt-1">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-primary"
                    name="role"
                    value="employee"
                    checked={role === 'employee'}
                    onChange={() => setRole('employee')}
                  />
                  <span className="ml-2 text-sm text-gray-700">Employee</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-primary"
                    name="role"
                    value="manager"
                    checked={role === 'manager'}
                    onChange={() => setRole('manager')}
                  />
                  <span className="ml-2 text-sm text-gray-700">Manager</span>
                </label>
              </div>
            </div>
            
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="form-label">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`form-input ${errors.companyName ? 'border-red-500' : ''}`}
                placeholder="Acme Inc."
              />
              {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>}
              {role === 'employee' && (
                <p className="mt-1 text-xs text-gray-500">
                  If your company already has a manager on SpendWise, make sure to use the exact company name.
                </p>
              )}
            </div>
            
            {/* Preferred Currency */}
            <div>
              <label htmlFor="currency" className="form-label">
                Preferred Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value as Currency)}
                className="form-input"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            
            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full btn btn-primary ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
            
            {/* Login Link */}
            <div className="text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup; 