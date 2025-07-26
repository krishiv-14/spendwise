import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import * as api from '../services/api';

const EmployeeApproval: React.FC = () => {
  const { currentUser } = useAuth();
  const [pendingEmployees, setPendingEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  
  // Load pending employees when component mounts
  useEffect(() => {
    const fetchPendingEmployees = async () => {
      if (!currentUser || currentUser.role !== 'manager') {
        setIsLoading(false);
        return;
      }
      
      try {
        const employees = await api.getPendingEmployees(currentUser.companyName);
        setPendingEmployees(employees);
      } catch (error) {
        console.error('Error fetching pending employees:', error);
        setMessage({
          text: 'Could not load pending employees. Please try again.',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPendingEmployees();
  }, [currentUser]);
  
  // Approve an employee
  const handleApprove = async (userId: string) => {
    try {
      // Set loading state for this specific approval
      setIsLoading(true);
      
      // Use the API service instead of direct DB access
      await api.approveEmployee(userId);
      
      // Update the local state to remove the approved employee
      setPendingEmployees(prev => prev.filter(emp => emp.id !== userId));
      
      setMessage({
        text: 'Employee approved successfully!',
        type: 'success'
      });
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error approving employee:', error);
      setMessage({
        text: 'Failed to approve employee. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-700">Loading pending employees...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Manage Employee Access</h1>
      </div>
      
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'} border-l-4`}>
          {message.text}
        </div>
      )}
      
      {pendingEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-700">No pending employee accounts to approve.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingEmployees.map(employee => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleApprove(employee.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeApproval; 