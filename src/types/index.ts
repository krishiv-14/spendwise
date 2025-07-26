export type UserRole = 'employee' | 'manager';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  isActive: boolean;
  preferredCurrency: Currency;
}

export type ExpenseCategory = 
  | 'Office Supplies'
  | 'Food & Entertainment'
  | 'Travelling'
  | 'Accommodation' 
  | 'Client & Project Expenses'
  | 'Subscriptions';

export interface ExpensePolicy {
  category: ExpenseCategory;
  maxAmount?: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  description: string;
  currency: Currency;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  date: string;
  category: ExpenseCategory;
  description: string;
  receiptImage?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  notes?: string;
  createdAt: string;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  count: number;
}

export interface UserSummary {
  userId: string;
  userName: string;
  total: number;
  count: number;
}

export interface CurrencyRates {
  base: Currency;
  rates: {
    [key in Currency]: number;
  };
  timestamp: number;
} 