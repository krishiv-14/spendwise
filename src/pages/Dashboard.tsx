import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { Expense, ExpenseCategory, Currency } from '../types';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { generateExpenseInsights } from '../utils/ai';
import { formatCurrency, convertCurrency } from '../utils/currency';
import * as api from '../services/api';

// Register the required Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const Dashboard: React.FC = () => {
  const { currentUser, isManager } = useAuth();
  const { expenses, policies, isLoading } = useExpenses();
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month');
  const [insights, setInsights] = useState<string[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [filteredView, setFilteredView] = useState<'all' | 'pending' | 'flagged'>('all');
  const [totalInINR, setTotalInINR] = useState<number | null>(null);
  const [showTotalInINR, setShowTotalInINR] = useState<boolean>(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  
  // State for category chart conversion
  const [categoryIsConverted, setCategoryIsConverted] = useState(false);
  const [categoryChartData, setCategoryChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'Expense by Category (INR)',
        data: [] as number[],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ]
  });
  
  // Load user data for mapping user IDs to names
  useEffect(() => {
    if (currentUser?.role === 'manager') {
      const loadUsers = async () => {
        try {
          const users = await api.getAllUsers();
          const mapping: Record<string, string> = {};
          users.forEach(user => {
            mapping[user.id] = user.name;
          });
          setUserMap(mapping);
        } catch (error) {
          console.error('Error loading users:', error);
        }
      };
      
      loadUsers();
    }
  }, [currentUser]);
  
  // Filter expenses based on time filter
  const filteredExpenses = React.useMemo(() => {
    if (!expenses.length) return [];
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    let result = expenses.filter(expense => new Date(expense.date) >= cutoffDate);
    
    // Apply status filter if needed
    if (filteredView === 'pending') {
      result = result.filter(expense => expense.status === 'pending');
    } else if (filteredView === 'flagged') {
      result = result.filter(expense => expense.status === 'flagged');
    }
    
    return result;
  }, [expenses, timeFilter, filteredView]);
  
  // Calculate total in INR if multiple currencies exist
  useEffect(() => {
    if (filteredExpenses.length > 0) {
      // Check if we have multiple currencies
      const uniqueCurrencies = new Set(filteredExpenses.map(exp => exp.currency));
      setShowTotalInINR(uniqueCurrencies.size > 1);
      
      if (uniqueCurrencies.size > 1) {
        // Convert all amounts to INR and sum
        const convertAndSum = async () => {
          let total = 0;
          for (const expense of filteredExpenses) {
            if (expense.currency === 'INR') {
              total += expense.amount;
            } else {
              const inINR = await convertCurrency(expense.amount, expense.currency, 'INR');
              total += inINR;
            }
          }
          setTotalInINR(total);
        };
        
        convertAndSum();
      }
    }
  }, [filteredExpenses]);
  
  // Generate insights and set recent expenses
  useEffect(() => {
    if (filteredExpenses.length > 0) {
      const insightsList = generateExpenseInsights(filteredExpenses);
      setInsights(insightsList);
      
      // Get 5 most recent expenses
      const sorted = [...filteredExpenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentExpenses(sorted.slice(0, 5));
    } else {
      setInsights([]);
      setRecentExpenses([]);
    }
  }, [filteredExpenses]);
  
  // Now that filteredExpenses is defined, we can use it for chart calculations
  // Prepare data for category chart - group by category and convert all to INR
  const categoryChartCalculation = React.useMemo(() => {
    // Initialize category totals in INR
    const categoryTotals: Record<ExpenseCategory, number> = {
      'Office Supplies': 0,
      'Food & Entertainment': 0,
      'Travelling': 0,
      'Accommodation': 0,
      'Client & Project Expenses': 0,
      'Subscriptions': 0
    };
    
    // Array of promises for currency conversion
    const conversionPromises: Promise<void>[] = [];
    
    // For each expense, convert amount to INR and add to category total
    filteredExpenses.forEach(expense => {
      const conversionPromise = async () => {
        try {
          // Convert to INR if not already in INR
          let amountInINR = expense.amount;
          if (expense.currency !== 'INR') {
            amountInINR = await convertCurrency(expense.amount, expense.currency, 'INR');
          }
          
          // Add to category total
          categoryTotals[expense.category] += amountInINR;
        } catch (error) {
          console.error('Error converting currency for chart:', error);
          // Use original amount as fallback if conversion fails
          categoryTotals[expense.category] += expense.amount;
        }
      };
      
      conversionPromises.push(conversionPromise());
    });
    
    return { categoryTotals, conversionPromises };
  }, [filteredExpenses]);
  
  // Execute category data calculations
  useEffect(() => {
    const { categoryTotals, conversionPromises } = categoryChartCalculation;
    
    Promise.all(conversionPromises)
      .then(() => {
        setCategoryChartData({
          labels: Object.keys(categoryTotals),
          datasets: [
            {
              label: 'Expense by Category (INR)',
              data: Object.values(categoryTotals),
              backgroundColor: [
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 99, 132, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 159, 64, 0.5)'
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1,
            },
          ]
        });
        setCategoryIsConverted(true);
      })
      .catch(error => {
        console.error('Error updating chart data:', error);
      });
  }, [categoryChartCalculation]);
  
  // Prepare data for monthly trend chart
  const trendChartData = React.useMemo(() => {
    // Group expenses by month and currency
    const monthlyData: Record<string, Record<Currency, number>> = {};
    const today = new Date();
    
    // Initialize last 6 months with 0 for each currency
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = { USD: 0, EUR: 0, GBP: 0, INR: 0 };
    }
    
    // Fill in actual expense data
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey][expense.currency] += expense.amount;
      }
    });
    
    // Create datasets for each currency
    const datasets = Object.keys(monthlyData[Object.keys(monthlyData)[0]] || {}).map((currency, index) => {
      const colors = [
        { border: 'rgb(79, 70, 229)', background: 'rgba(79, 70, 229, 0.1)' }, // USD
        { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' }, // EUR
        { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }, // GBP
        { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' }  // INR
      ];
      
      return {
        label: `${currency} Expenses`,
        data: Object.values(monthlyData).map(month => month[currency as Currency]),
        borderColor: colors[index].border,
        backgroundColor: colors[index].background,
        tension: 0.3,
        fill: true,
      };
    }).filter(dataset => 
      // Only include datasets with non-zero values
      dataset.data.some(value => value > 0)
    );
    
    return {
      labels: Object.keys(monthlyData),
      datasets
    };
  }, [filteredExpenses]);
  
  // Function to handle status card clicks
  const handleStatusCardClick = (status: 'all' | 'pending' | 'flagged') => {
    setFilteredView(status);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-700">Loading dashboard data...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          {currentUser?.name}&apos;s Dashboard
          {filteredView !== 'all' && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredView === 'pending' ? 'Pending Approval' : 'Flagged'} expenses)
            </span>
          )}
        </h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md ${
              timeFilter === 'week'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md ${
              timeFilter === 'month'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeFilter('year')}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md ${
              timeFilter === 'year'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div 
          className={`bg-white rounded-lg shadow-md p-4 md:p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
            filteredView === 'all' ? 'border-primary' : 'border-transparent'
          }`}
          onClick={() => handleStatusCardClick('all')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-full bg-indigo-100 text-primary">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-500">Total Expenses</p>
              
              {/* Display total with original currencies */}
              {!showTotalInINR ? (
                <p className="text-lg md:text-2xl font-semibold text-gray-800">
                  {filteredExpenses.length > 0 ? (
                    <>
                      {Object.entries(
                        filteredExpenses.reduce((acc, exp) => {
                          if (!acc[exp.currency]) acc[exp.currency] = 0;
                          acc[exp.currency] += exp.amount;
                          return acc;
                        }, {} as Record<Currency, number>)
                      ).map(([currency, amount]) => (
                        <span key={currency} className="mr-2">
                          {formatCurrency(amount, currency as Currency)}
                        </span>
                      ))}
                    </>
                  ) : (
                    formatCurrency(0, 'USD')
                  )}
                </p>
              ) : (
                // When multiple currencies, show in INR
                <p className="text-lg md:text-2xl font-semibold text-gray-800">
                  {formatCurrency(totalInINR || 0, 'INR')}
                  <span className="block text-xs font-normal text-gray-500 mt-1">(All currencies converted to INR)</span>
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-full bg-green-100 text-success">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-500">Total Entries</p>
              <p className="text-lg md:text-2xl font-semibold text-gray-800">
                {expenses.length}
              </p>
            </div>
          </div>
        </div>
        
        <div 
          className={`bg-white rounded-lg shadow-md p-4 md:p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
            filteredView === 'pending' ? 'border-yellow-500' : 'border-transparent'
          }`}
          onClick={() => handleStatusCardClick('pending')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-full bg-yellow-100 text-warning">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-500">Pending Approval</p>
              <p className="text-lg md:text-2xl font-semibold text-gray-800">
                {expenses.filter(exp => exp.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div 
          className={`bg-white rounded-lg shadow-md p-4 md:p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
            filteredView === 'flagged' ? 'border-red-500' : 'border-transparent'
          }`}
          onClick={() => handleStatusCardClick('flagged')}
        >
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-full bg-red-100 text-danger">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-500">Flagged</p>
              <p className="text-lg md:text-2xl font-semibold text-gray-800">
                {expenses.filter(exp => exp.status === 'flagged').length}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-4">Expenses by Category</h2>
          {filteredExpenses.length === 0 ? (
            <div className="flex items-center justify-center h-56 md:h-64 text-gray-500">
              No data available for the selected period
            </div>
          ) : !categoryIsConverted ? (
            <div className="flex items-center justify-center h-56 md:h-64">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mr-2"></div>
              <span className="text-gray-500">Converting currencies to INR...</span>
            </div>
          ) : categoryChartData.datasets[0].data.some(value => value > 0) ? (
            <div className="h-56 md:h-64">
              <Pie data={categoryChartData} options={{ maintainAspectRatio: false }} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-56 md:h-64 text-gray-500">
              No expenses found in the selected period
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-4">Monthly Expense Trend</h2>
          <div className="h-56 md:h-64">
            <Line
              data={trendChartData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Amount'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Insights section */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold mb-4">Expense Insights</h2>
        {insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs mr-2 md:mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-sm md:text-base text-gray-700">{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm md:text-base text-gray-500">No insights available for the selected period.</p>
        )}
      </div>
      
      {/* Recent expenses table */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <h2 className="text-base md:text-lg font-semibold mb-2 sm:mb-0">Recent Expenses</h2>
        </div>
        
        {recentExpenses.length > 0 ? (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  {currentUser?.role === 'manager' && (
                    <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500 hidden sm:table-cell">
                      {expense.category}
                    </td>
                    {currentUser?.role === 'manager' && (
                      <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {userMap[expense.userId] || 'Unknown User'}
                      </td>
                    )}
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                      {expense.description.length > 20
                        ? `${expense.description.substring(0, 20)}...`
                        : expense.description}
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap hidden md:table-cell">
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
                    <td className="px-4 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                      <a 
                        href={`/expenses/${expense.id}`}
                        className="text-primary hover:text-indigo-700"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">You haven&apos;t submitted any expenses yet.</p>
        )}
      </div>
    </div>
  );
};

// Set displayName property
Dashboard.displayName = 'Dashboard';

export default Dashboard; 