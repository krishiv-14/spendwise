import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { User } from '../types';
import { formatCurrency } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import EmployeeSpendingChart from '../components/EmployeeSpendingChart';
import * as api from '../services/api';

const Employees: React.FC = () => {
  const { currentUser, isManager } = useAuth();
  const { expenses } = useExpenses();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-managers
    if (!isManager) {
      navigate('/dashboard');
      return;
    }

    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        // Load all users from the API
        const allUsers = await api.getAllUsers();
        // Filter to get only employees (not managers)
        const employeeUsers = allUsers.filter(user => user.role === 'employee');
        console.log('Found employees:', employeeUsers.length);
        setEmployees(employeeUsers);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, [currentUser, isManager, navigate]);

  // Calculate total expenses per employee
  const getEmployeeTotalExpenses = (userId: string) => {
    const employeeExpenses = expenses.filter(expense => expense.userId === userId);
    
    // Group by currency
    const currencyTotals: Record<string, number> = {};
    employeeExpenses.forEach(expense => {
      if (!currencyTotals[expense.currency]) {
        currencyTotals[expense.currency] = 0;
      }
      currencyTotals[expense.currency] += expense.amount;
    });
    
    // Format totals with currency
    return Object.entries(currencyTotals).map(([currency, amount]) => (
      formatCurrency(amount, currency as any)
    )).join(', ');
  };

  // View employee's expenses
  const viewEmployeeExpenses = (userId: string) => {
    // In a real app, we would navigate to a filtered view
    // For now, we just alert a message
    alert('This would navigate to a filtered view of this employee\'s expenses.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-700">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          Employees Overview
        </h1>
      </div>

      {/* Employee spending distribution chart */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Employee Spending Distribution</h2>
        <div className="h-80">
          <EmployeeSpendingChart expenses={expenses} users={employees} />
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Employee List</h2>
          <p className="text-sm text-gray-500">Manage and view employee expense details</p>
        </div>
        
        {employees.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No employees found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Expenses
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-700 font-medium">{employee.name.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">@{employee.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.preferredCurrency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getEmployeeTotalExpenses(employee.id) || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => viewEmployeeExpenses(employee.id)}
                        className="text-primary hover:text-indigo-700"
                      >
                        View Expenses
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

export default Employees; 