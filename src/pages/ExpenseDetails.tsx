import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { Expense, User } from '../types';
import { detectFraud } from '../utils/ai';
import * as api from '../services/api';

const ExpenseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isManager } = useAuth();
  const { getExpenseById, updateExpense, getUserExpenses } = useExpenses();
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [fraudDetails, setFraudDetails] = useState<{ isFraud: boolean; reasons: string[] } | null>(null);
  const [expenseUser, setExpenseUser] = useState<User | null>(null);
  
  // Load expense data
  useEffect(() => {
    const fetchExpenseData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const expenseData = await getExpenseById(id);
        
        if (!expenseData) {
          setError('Expense not found');
          return;
        }
        
        setExpense(expenseData);
        
        // Load user's other expenses for fraud detection
        const userExps = await getUserExpenses(expenseData.userId);
        setUserExpenses(userExps);
        
        // Get user information
        try {
          const users = await api.getAllUsers();
          const user = users.find(u => u.id === expenseData.userId);
          if (user) {
            setExpenseUser(user);
          }
        } catch (userErr) {
          console.error('Error loading user details:', userErr);
        }
        
        // Check for potential fraud
        if (expenseData.status === 'flagged') {
          const fraudResult = detectFraud(expenseData);
          setFraudDetails(fraudResult);
        }
        
      } catch (err) {
        console.error('Error loading expense:', err);
        setError('Failed to load expense details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExpenseData();
  }, [id, getExpenseById, getUserExpenses]);
  
  // Handle status update
  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected' | 'pending' | 'flagged') => {
    if (!expense || !isManager) return;
    
    try {
      const updatedExpense = {
        ...expense,
        status: newStatus
      };
      
      await updateExpense(updatedExpense);
      setExpense(updatedExpense);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update expense status');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-700">Loading expense details...</p>
      </div>
    );
  }
  
  if (error || !expense) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error || 'Failed to load expense'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Go back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">
              Expense Details
            </h1>
            <span
              className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                expense.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : expense.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : expense.status === 'flagged'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Submitted on {new Date(expense.createdAt).toLocaleDateString()} at{' '}
            {new Date(expense.createdAt).toLocaleTimeString()}
            {expenseUser && (
              <span className="ml-2">
                by <span className="font-medium">{expenseUser.name}</span>
              </span>
            )}
          </p>
        </div>
        
        {/* Main content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-700 mb-2">Amount</h2>
              <p className="text-3xl font-bold text-gray-900">${expense.amount.toFixed(2)}</p>
            </div>
            
            {isManager && expenseUser && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Submitted By</h2>
                <p className="text-gray-900">
                  {expenseUser.name} ({expenseUser.email})
                </p>
              </div>
            )}
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-700 mb-2">Category</h2>
              <p className="text-gray-900">{expense.category}</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-700 mb-2">Date</h2>
              <p className="text-gray-900">{new Date(expense.date).toLocaleDateString()}</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-700 mb-2">Description</h2>
              <p className="text-gray-900 whitespace-pre-wrap">{expense.description}</p>
            </div>
          </div>
          
          <div>
            {expense.receiptImage && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Receipt</h2>
                <img
                  src={expense.receiptImage}
                  alt="Receipt"
                  className="max-w-full rounded-md border border-gray-300"
                />
              </div>
            )}
            
            {fraudDetails && fraudDetails.isFraud && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-red-600 mb-2">Potential Fraud Detected</h2>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {fraudDetails.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {expense.notes && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-700 mb-2">Notes</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 justify-end">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
            
            {isManager && expense.status !== 'approved' && (
              <button
                onClick={() => handleStatusUpdate('approved')}
                className="btn btn-success"
              >
                Approve Expense
              </button>
            )}
            
            {isManager && expense.status !== 'rejected' && (
              <button
                onClick={() => handleStatusUpdate('rejected')}
                className="btn btn-danger"
              >
                Reject Expense
              </button>
            )}
            
            {isManager && expense.status === 'flagged' && (
              <button
                onClick={() => handleStatusUpdate('pending')}
                className="btn btn-warning"
              >
                Clear Flag
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Similar expenses (for managers only) */}
      {isManager && userExpenses.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Other Expenses by This User</h2>
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
                {userExpenses
                  .filter(exp => exp.id !== expense.id)
                  .slice(0, 5) // Show max 5 other expenses
                  .map(exp => (
                    <tr key={exp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exp.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          exp.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : exp.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : exp.status === 'flagged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => navigate(`/expenses/${exp.id}`)}
                          className="text-primary hover:text-indigo-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetails; 