import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/currency';
import { useNavigate } from 'react-router-dom';

interface FlaggedExpensesViewProps {
  onClose: () => void;
  userMap: Record<string, string>;
}

const FlaggedExpensesView: React.FC<FlaggedExpensesViewProps> = ({ onClose, userMap }) => {
  const { expenses, updateExpense } = useExpenses();
  const [flaggedExpenses, setFlaggedExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  
  // Filter for flagged expenses
  useEffect(() => {
    const filteredExpenses = expenses.filter(e => e.status === 'flagged');
    setFlaggedExpenses(filteredExpenses);
  }, [expenses]);
  
  // Handle approving an expense
  const handleApprove = async (expense: Expense) => {
    try {
      const updatedExpense = {
        ...expense,
        status: 'approved' as const
      };
      
      await updateExpense(updatedExpense);
      
      // Show success message
      setMessage({
        text: `Expense for ${userMap[expense.userId] || 'Unknown user'} approved successfully`,
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error approving expense:', err);
      setMessage({
        text: 'Failed to approve expense. Please try again.',
        type: 'error'
      });
    }
  };
  
  // Handle rejecting an expense
  const handleReject = async (expense: Expense) => {
    try {
      const updatedExpense = {
        ...expense,
        status: 'rejected' as const
      };
      
      await updateExpense(updatedExpense);
      
      // Show success message
      setMessage({
        text: `Expense for ${userMap[expense.userId] || 'Unknown user'} rejected successfully`,
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error rejecting expense:', err);
      setMessage({
        text: 'Failed to reject expense. Please try again.',
        type: 'error'
      });
    }
  };
  
  // Handle clearing the flag
  const handleClearFlag = async (expense: Expense) => {
    try {
      const updatedExpense = {
        ...expense,
        status: 'pending' as const
      };
      
      await updateExpense(updatedExpense);
      
      // Show success message
      setMessage({
        text: `Flag cleared for ${userMap[expense.userId] || 'Unknown user'}'s expense, now pending review`,
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error clearing flag:', err);
      setMessage({
        text: 'Failed to clear flag. Please try again.',
        type: 'error'
      });
    }
  };
  
  // View expense details
  const handleViewDetails = (expenseId: string) => {
    navigate(`/expenses/${expenseId}`);
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-5 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Flagged Expenses</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}
        
        {flaggedExpenses.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No flagged expenses to display.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Flag Reason
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flaggedExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {userMap[expense.userId] || 'Unknown User'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {expense.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-500">
                      {expense.notes?.split('. ')[0] || 'Potential fraud detected'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(expense.id)}
                        className="text-primary hover:text-indigo-700 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleApprove(expense)}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(expense)}
                        className="text-red-600 hover:text-red-800 mr-3"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleClearFlag(expense)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        Clear Flag
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlaggedExpensesView; 