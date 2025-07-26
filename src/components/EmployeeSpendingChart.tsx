import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Expense, User } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface EmployeeSpendingChartProps {
  expenses: Expense[];
  users: User[];
}

const EmployeeSpendingChart: React.FC<EmployeeSpendingChartProps> = ({ expenses, users }) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!users.length || !expenses.length) return [];

    // For simplicity, we're just showing total amounts for primary currency
    // In a real app, you might want to do currency conversion
    return users.map(user => {
      const userExpenses = expenses.filter(expense => expense.userId === user.id);
      
      // Group by currency
      const currencyTotals: Record<string, number> = {};
      userExpenses.forEach(expense => {
        if (!currencyTotals[expense.currency]) {
          currencyTotals[expense.currency] = 0;
        }
        currencyTotals[expense.currency] += expense.amount;
      });
      
      // Get the primary currency (user's preferred currency)
      const primaryCurrency = user.preferredCurrency;
      const primaryAmount = currencyTotals[primaryCurrency] || 0;
      
      return {
        name: user.name,
        total: primaryAmount,
        currency: primaryCurrency,
      };
    });
  }, [expenses, users]);

  // Custom tooltip to display currency correctly
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            Total: {getCurrencySymbol(data.currency)}{data.total.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={60}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          tickFormatter={(value) => `${value}`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar 
          dataKey="total" 
          name="Total Spending" 
          fill="#6366F1" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EmployeeSpendingChart; 