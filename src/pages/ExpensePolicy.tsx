import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { ExpensePolicy as ExpensePolicyType, Currency } from '../types';
import { formatCurrency } from '../utils/currency';

// Define props interface for the PolicyList component
interface PolicyListProps {
  policies: ExpensePolicyType[];
  editingPolicy: ExpensePolicyType | null;
  isManager: boolean;
  currencies: Currency[];
  handleEdit: (policy: ExpensePolicyType) => void;
  handleSave: () => void;
  handleCancel: () => void;
  setEditingPolicy: React.Dispatch<React.SetStateAction<ExpensePolicyType | null>>;
}

// Memoize the policy list component for better performance
const PolicyList = React.memo(({ 
  policies, 
  editingPolicy, 
  isManager, 
  currencies, 
  handleEdit, 
  handleSave, 
  handleCancel, 
  setEditingPolicy 
}: PolicyListProps) => (
  <div className="bg-white shadow-md rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Category
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Monthly Limit
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Currency
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Description
          </th>
          {isManager && (
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {policies.map(policy => (
          <tr key={policy.category}>
            {editingPolicy && editingPolicy.category === policy.category ? (
              // Editing row
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {policy.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={editingPolicy.monthlyLimit || 0}
                    onChange={(e) => 
                      setEditingPolicy({ 
                        ...editingPolicy, 
                        monthlyLimit: parseFloat(e.target.value) || 0 
                      })
                    }
                    className="form-input w-32 py-1"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={editingPolicy.currency}
                    onChange={(e) => 
                      setEditingPolicy({ 
                        ...editingPolicy, 
                        currency: e.target.value as Currency 
                      })
                    }
                    className="form-select w-24 py-1"
                  >
                    {currencies.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editingPolicy.description}
                    onChange={(e) => 
                      setEditingPolicy({ 
                        ...editingPolicy, 
                        description: e.target.value 
                      })
                    }
                    className="form-input w-full py-1"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={handleSave}
                    className="text-primary hover:text-indigo-700 mr-4"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </td>
              </>
            ) : (
              // Display row
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {policy.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {policy.monthlyLimit ? formatCurrency(policy.monthlyLimit, policy.currency) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {policy.currency}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {policy.description}
                </td>
                {isManager && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(policy)}
                      className="text-primary hover:text-indigo-700"
                      disabled={editingPolicy !== null}
                    >
                      Edit
                    </button>
                  </td>
                )}
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

// Add displayName property
PolicyList.displayName = 'PolicyList';

// Add displayName property
const ExpensePolicy: React.FC = () => {
  const { policies, updatePolicy, isLoading: policiesLoading } = useExpenses();
  const { isManager } = useAuth();
  const [editingPolicy, setEditingPolicy] = useState<ExpensePolicyType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'INR'];
  
  // Function to start editing a policy
  const handleEdit = (policy: ExpensePolicyType) => {
    // Only managers can edit policies
    if (!isManager) return;
    
    setEditingPolicy({ ...policy });
    setError(null);
    setSuccess(null);
  };
  
  // Function to cancel editing
  const handleCancel = () => {
    setEditingPolicy(null);
    setError(null);
  };
  
  // Function to save policy changes
  const handleSave = async () => {
    if (!editingPolicy) return;
    
    try {
      // Validate input
      if ((editingPolicy.monthlyLimit ?? 0) <= 0) {
        setError('Monthly limit must be greater than zero');
        return;
      }
      
      if (!editingPolicy.description.trim()) {
        setError('Description is required');
        return;
      }
      
      // Get existing policy to preserve all limits
      const existingPolicy = policies.find(p => p.category === editingPolicy.category);
      if (existingPolicy) {
        // Preserve existing limits that might not be editable in the UI
        editingPolicy.weeklyLimit = Math.round((editingPolicy.monthlyLimit || 0) / 4); // Set weekly limit to 1/4 of monthly
        editingPolicy.dailyLimit = existingPolicy.dailyLimit;
        editingPolicy.maxAmount = existingPolicy.maxAmount;
      }
      
      // Update policy
      await updatePolicy(editingPolicy);
      
      // Show success message
      setSuccess(`Policy for ${editingPolicy.category} updated successfully`);
      
      // Exit editing mode
      setEditingPolicy(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating policy:', err);
      setError('Failed to update policy. Please try again.');
    }
  };
  
  if (policiesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-700">Loading policies...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Expense Policies</h1>
        <p className="text-sm text-gray-500">
          {isManager 
            ? "Set spending limits and guidelines for expense categories" 
            : "View spending limits and guidelines for expense categories"}
        </p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Policies table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Limit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              {isManager && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.map(policy => (
              <tr key={policy.category}>
                {editingPolicy && editingPolicy.category === policy.category ? (
                  // Editing row
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {policy.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={editingPolicy.monthlyLimit || 0}
                        onChange={(e) => 
                          setEditingPolicy({ 
                            ...editingPolicy, 
                            monthlyLimit: parseFloat(e.target.value) || 0 
                          })
                        }
                        className="form-input w-32 py-1"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={editingPolicy.currency}
                        onChange={(e) => 
                          setEditingPolicy({ 
                            ...editingPolicy, 
                            currency: e.target.value as Currency 
                          })
                        }
                        className="form-select w-24 py-1"
                      >
                        {currencies.map(curr => (
                          <option key={curr} value={curr}>{curr}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editingPolicy.description}
                        onChange={(e) => 
                          setEditingPolicy({ 
                            ...editingPolicy, 
                            description: e.target.value 
                          })
                        }
                        className="form-input w-full py-1"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={handleSave}
                        className="text-primary hover:text-indigo-700 mr-4"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  // Display row
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {policy.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {policy.monthlyLimit ? formatCurrency(policy.monthlyLimit, policy.currency) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {policy.currency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {policy.description}
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(policy)}
                          className="text-primary hover:text-indigo-700"
                          disabled={editingPolicy !== null}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Policy information */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-4">About Expense Policies</h2>
        <p className="text-gray-600 mb-4">
          Expense policies define the maximum spending limits for each expense category. 
          These limits are used to validate expenses during submission and can help control company spending.
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-2">
          <li>Set reasonable limits based on typical expenses in each category</li>
          <li>Provide clear descriptions to help employees understand what&apos;s covered</li>
          <li>Expenses exceeding limits will be flagged for review</li>
          {isManager && <li>You can update these policies at any time based on company needs</li>}
        </ul>
      </div>
    </div>
  );
};

// Set displayName for component
ExpensePolicy.displayName = 'ExpensePolicy';

export default ExpensePolicy;