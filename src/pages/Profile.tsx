import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { Expense, Currency } from '../types';
import { generateExpenseInsights } from '../utils/ai';
import { getCurrencySymbol } from '../utils/currency';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateUserPreferredCurrency } = useAuth();
  const { getUserExpenses, isLoading, formatExpenseAmount } = useExpenses();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currentUser?.preferredCurrency || 'USD');
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState({
    totalSubmitted: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalFlagged: 0,
    totalPending: 0,
    totalAmount: 0,
    formattedTotalAmount: '$0.00',
    approvedAmount: 0,
    formattedApprovedAmount: '$0.00'
  });
  
  // Load user's expenses and generate stats
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      
      try {
        // Get user's expenses
        const userExpenses = await getUserExpenses(currentUser.id);
        setExpenses(userExpenses);
        
        // Calculate stats
        const total = userExpenses.length;
        const approved = userExpenses.filter(exp => exp.status === 'approved').length;
        const rejected = userExpenses.filter(exp => exp.status === 'rejected').length;
        const flagged = userExpenses.filter(exp => exp.status === 'flagged').length;
        const pending = userExpenses.filter(exp => exp.status === 'pending').length;
        
        // Calculate amounts
        let totalAmount = 0;
        let formattedTotalAmount = getCurrencySymbol(currentUser.preferredCurrency) + '0.00';
        let approvedAmount = 0;
        let formattedApprovedAmount = getCurrencySymbol(currentUser.preferredCurrency) + '0.00';
        
        // Convert all expenses to user's preferred currency
        const totalPromises = userExpenses.map(async exp => {
          const convertedAmount = await formatExpenseAmount(exp, currentUser.preferredCurrency);
          return parseFloat(convertedAmount.replace(/[^0-9.-]+/g, ''));
        });
        
        const approvedPromises = userExpenses
          .filter(exp => exp.status === 'approved')
          .map(async exp => {
            const convertedAmount = await formatExpenseAmount(exp, currentUser.preferredCurrency);
            return parseFloat(convertedAmount.replace(/[^0-9.-]+/g, ''));
          });
        
        const totalAmounts = await Promise.all(totalPromises);
        const approvedAmounts = await Promise.all(approvedPromises);
        
        totalAmount = totalAmounts.reduce((sum, amount) => sum + amount, 0);
        approvedAmount = approvedAmounts.reduce((sum, amount) => sum + amount, 0);
        
        formattedTotalAmount = getCurrencySymbol(currentUser.preferredCurrency) + totalAmount.toFixed(2);
        formattedApprovedAmount = getCurrencySymbol(currentUser.preferredCurrency) + approvedAmount.toFixed(2);
        
        setStats({
          totalSubmitted: total,
          totalApproved: approved,
          totalRejected: rejected,
          totalFlagged: flagged,
          totalPending: pending,
          totalAmount,
          formattedTotalAmount,
          approvedAmount,
          formattedApprovedAmount
        });
        
        // Set currency in state
        setSelectedCurrency(currentUser.preferredCurrency);
        
        // Generate insights
        if (userExpenses.length > 0) {
          const expenseInsights = generateExpenseInsights(userExpenses);
          setInsights(expenseInsights);
        }
        
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, [currentUser, getUserExpenses, formatExpenseAmount]);
  
  const handleCurrencyChange = async () => {
    if (!currentUser || selectedCurrency === currentUser.preferredCurrency) return;
    
    try {
      setIsUpdatingCurrency(true);
      await updateUserPreferredCurrency(selectedCurrency);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating currency preference:', error);
    } finally {
      setIsUpdatingCurrency(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-700">Loading profile data...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">User not authenticated. Please log in.</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {showSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Currency preference updated successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* User Profile */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 sm:p-8 bg-primary bg-opacity-10">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold mb-4 sm:mb-0 sm:mr-6">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-800">{currentUser.name}</h1>
              <p className="text-gray-600">@{currentUser.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary bg-opacity-10 text-primary capitalize">
                  {currentUser.role}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {currentUser.companyName}
                </span>
              </div>
            </div>
            <div className="ml-auto mt-4 sm:mt-0">
              <button
                onClick={logout}
                className="btn btn-outline text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Currency Preference */}
        <div className="p-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Currency Preference</h2>
          <div className="flex items-center">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
              className="form-input mr-3 w-40"
              disabled={isUpdatingCurrency}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
            <button
              onClick={handleCurrencyChange}
              disabled={isUpdatingCurrency || selectedCurrency === currentUser.preferredCurrency}
              className={`btn btn-primary ${isUpdatingCurrency ? 'opacity-70 cursor-not-allowed' : ''} ${selectedCurrency === currentUser.preferredCurrency ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUpdatingCurrency ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Currency'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This will be used to display all expenses in your preferred currency.
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-800">
                {stats.formattedTotalAmount}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Approved: {stats.formattedApprovedAmount}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-semibold text-gray-800">
                {stats.totalApproved}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {stats.totalSubmitted > 0
              ? `${Math.round((stats.totalApproved / stats.totalSubmitted) * 100)}% of total`
              : 'No expenses submitted'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-800">
                {stats.totalPending}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {stats.totalSubmitted > 0
              ? `${Math.round((stats.totalPending / stats.totalSubmitted) * 100)}% of total`
              : 'No expenses submitted'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Flagged/Rejected</p>
              <p className="text-2xl font-semibold text-gray-800">
                {stats.totalFlagged + stats.totalRejected}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {stats.totalSubmitted > 0
              ? `${Math.round(((stats.totalFlagged + stats.totalRejected) / stats.totalSubmitted) * 100)}% of total`
              : 'No expenses submitted'}
          </p>
        </div>
      </div>
      
      {/* Insights */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Your Expense Insights</h2>
        {insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No insights available yet. Submit more expenses to get personalized insights.</p>
        )}
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <button
            onClick={() => navigate('/add-expense')}
            className="btn btn-primary text-sm"
          >
            Add New Expense
          </button>
        </div>
        
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map(expense => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          expense.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : expense.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : expense.status === 'flagged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => navigate(`/expenses/${expense.id}`)}
                          className="text-primary hover:text-indigo-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No expenses submitted yet</p>
            <button
              onClick={() => navigate('/add-expense')}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create your first expense
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 