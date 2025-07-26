import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Expense, ExpensePolicy, ExpenseCategory, CategorySummary, UserSummary, Currency } from '../types';
import * as api from '../services/api';
import { useAuth } from './AuthContext';
import { detectFraud } from '../utils/ai';
import { convertCurrency, formatCurrency } from '../utils/currency';

interface ExpenseContextType {
  expenses: Expense[];
  policies: ExpensePolicy[];
  isLoading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<{id: string, status: string, message: string}>;
  updateExpense: (expense: Expense) => Promise<void>;
  getExpenseById: (id: string) => Promise<Expense | undefined>;
  getUserExpenses: (userId: string) => Promise<Expense[]>;
  getAllExpenses: () => Promise<Expense[]>;
  updatePolicy: (policy: ExpensePolicy) => Promise<void>;
  getCategorySummary: () => CategorySummary[];
  getUserSummary: () => UserSummary[];
  getExpensesByCategory: (category: ExpenseCategory) => Expense[];
  getExpensesByDateRange: (startDate: string, endDate: string) => Promise<Expense[]>;
  validateExpenseAgainstPolicy: (amount: number, category: ExpenseCategory) => {
    valid: boolean;
    message: string;
  };
  convertExpenseAmount: (expense: Expense, targetCurrency: Currency) => Promise<number>;
  formatExpenseAmount: (expense: Expense, targetCurrency?: Currency) => Promise<string>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { currentUser } = useAuth();
  
  // Load expenses and policies on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load policies
        const allPolicies = await api.getAllPolicies();
        setPolicies(allPolicies);
        
        // Load expenses based on user role
        let expensesData: Expense[] = [];
        if (currentUser) {
          if (currentUser.role === 'manager') {
            expensesData = await api.getAllExpenses(currentUser.role);
          } else {
            expensesData = await api.getExpensesByUserId(currentUser.id, currentUser.role);
          }
        }
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error loading expense data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);
  
  // Add a new expense
  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<{id: string, status: string, message: string}> => {
    try {
      // Create a temp expense object for fraud detection
      const tempExpense = {
        ...expense,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      } as Expense;
      
      // Check for potential fraud
      const { isFraud, reasons } = detectFraud(tempExpense);
      
      // Create expense object for submission
      // If fraud detected, mark as flagged, otherwise allow server to set status based on policy
      const expenseToSubmit = {
        ...tempExpense,
        // Using type assertion to handle the undefined case - the server will assign appropriate status
        status: isFraud ? 'flagged' as const : 'pending' as const
      };
      
      // For server submission, we can use any status or undefined
      // TypeScript doesn't allow us to have undefined in the type union, so we need to do this:
      const apiSubmission = {
        ...expenseToSubmit
      };
      
      // If not fraud, remove the status so server can decide
      if (!isFraud) {
        delete (apiSubmission as any).status;
      }
      
      // Add to database - server will determine final status based on policy
      const result = await api.addExpense(apiSubmission as Expense);
      
      // Get the assigned status from the server (which considers policy limits)
      const finalStatus = isFraud ? 'flagged' : result.status;
      
      // Update the local expense object with the server-determined status
      const savedExpense = {
        ...expenseToSubmit,
        status: finalStatus as 'pending' | 'approved' | 'flagged' | 'rejected'
      };
      
      // Update local state
      setExpenses(prevExpenses => [...prevExpenses, savedExpense]);
      
      return {
        id: result.id,
        status: finalStatus,
        message: isFraud 
          ? 'Expense flagged for potential fraud' 
          : result.message
      };
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };
  
  // Update an existing expense
  const updateExpense = async (expense: Expense): Promise<void> => {
    try {
      await api.updateExpense(expense);
      
      // Update local state
      setExpenses(prevExpenses => 
        prevExpenses.map(e => e.id === expense.id ? expense : e)
      );
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };
  
  // Get an expense by ID
  const getExpenseById = async (id: string): Promise<Expense | undefined> => {
    try {
      return await api.getExpenseById(id);
    } catch (error) {
      console.error(`Error getting expense ID ${id}:`, error);
      throw error;
    }
  };
  
  // Get expenses for a specific user
  const getUserExpenses = async (userId: string): Promise<Expense[]> => {
    try {
      return await api.getExpensesByUserId(userId, currentUser?.role || 'employee');
    } catch (error) {
      console.error(`Error getting expenses for user ${userId}:`, error);
      throw error;
    }
  };
  
  // Get all expenses (for managers)
  const getAllExpenses = async (): Promise<Expense[]> => {
    try {
      return await api.getAllExpenses(currentUser?.role || 'employee');
    } catch (error) {
      console.error('Error getting all expenses:', error);
      throw error;
    }
  };
  
  // Update expense policy
  const updatePolicy = async (policy: ExpensePolicy): Promise<void> => {
    try {
      await api.updatePolicy(policy);
      
      // Update local state
      setPolicies(prevPolicies => 
        prevPolicies.map(p => p.category === policy.category ? policy : p)
      );
    } catch (error) {
      console.error('Error updating policy:', error);
      throw error;
    }
  };
  
  // Get expenses summarized by category
  const getCategorySummary = (): CategorySummary[] => {
    const categories: ExpenseCategory[] = [
      'Office Supplies',
      'Food & Entertainment',
      'Travelling',
      'Accommodation', 
      'Client & Project Expenses',
      'Subscriptions'
    ];
    
    return categories.map(category => {
      const categoryExpenses = expenses.filter(e => e.category === category);
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        category,
        total,
        count: categoryExpenses.length
      };
    });
  };
  
  // Get expenses summarized by user
  const getUserSummary = (): UserSummary[] => {
    const userMap = new Map<string, UserSummary>();
    
    expenses.forEach(expense => {
      if (!userMap.has(expense.userId)) {
        userMap.set(expense.userId, {
          userId: expense.userId,
          userName: '', // Will be populated later
          total: 0,
          count: 0
        });
      }
      
      const summary = userMap.get(expense.userId)!;
      summary.total += expense.amount;
      summary.count += 1;
    });
    
    return Array.from(userMap.values());
  };
  
  // Get expenses filtered by category
  const getExpensesByCategory = (category: ExpenseCategory): Expense[] => {
    return expenses.filter(expense => expense.category === category);
  };
  
  // Get expenses within a date range
  const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
    // Filter client-side to avoid extra API calls
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return expenseDate >= start && expenseDate <= end;
    });
  };
  
  // Validate expense against policy
  const validateExpenseAgainstPolicy = (amount: number, category: ExpenseCategory): { valid: boolean; message: string } => {
    const policy = policies.find(p => p.category === category);
    
    if (!policy) {
      return { valid: true, message: 'No policy found for this category' };
    }
    
    // Use monthly limit instead of weekly limit
    const limit = policy.monthlyLimit || 0;
    const valid = amount <= limit;
    const message = valid 
      ? `Amount is within policy limit of ${formatCurrency(limit, policy.currency)}`
      : `Amount exceeds policy limit of ${formatCurrency(limit, policy.currency)}`;
    
    return { valid, message };
  };
  
  // Convert expense amount to target currency
  const convertExpenseAmount = async (expense: Expense, targetCurrency: Currency): Promise<number> => {
    try {
      return await convertCurrency(expense.amount, expense.currency, targetCurrency);
    } catch (error) {
      console.error('Error converting currency:', error);
      return expense.amount; // Return original amount if conversion fails
    }
  };
  
  // Format expense amount with currency symbol
  const formatExpenseAmount = async (expense: Expense, targetCurrency?: Currency): Promise<string> => {
    try {
      const currency = targetCurrency || (currentUser?.preferredCurrency || 'USD');
      
      if (expense.currency === currency) {
        return formatCurrency(expense.amount, expense.currency);
      }
      
      const convertedAmount = await convertExpenseAmount(expense, currency);
      return formatCurrency(convertedAmount, currency);
    } catch (error) {
      console.error('Error formatting expense amount:', error);
      return formatCurrency(expense.amount, expense.currency);
    }
  };
  
  // Context value
  const value = {
    expenses,
    policies,
    isLoading,
    addExpense,
    updateExpense,
    getExpenseById,
    getUserExpenses,
    getAllExpenses,
    updatePolicy,
    getCategorySummary,
    getUserSummary,
    getExpensesByCategory,
    getExpensesByDateRange,
    validateExpenseAgainstPolicy,
    convertExpenseAmount,
    formatExpenseAmount
  };
  
  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};

// Custom hook to use the expense context
export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}; 