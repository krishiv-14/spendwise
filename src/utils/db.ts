import Dexie, { Table } from 'dexie';
import { User, Expense, ExpensePolicy, ExpenseCategory } from '../types';

// Default expense policies
const defaultPolicies: ExpensePolicy[] = [
  {
    category: 'Office Supplies',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 2500,
    monthlyLimit: 10000,
    description: 'Items for office use including stationery, small equipment, etc.',
    currency: 'INR'
  },
  {
    category: 'Food & Entertainment',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 1250,
    monthlyLimit: 5000,
    description: 'Meals, client entertainment, and team events.',
    currency: 'INR'
  },
  {
    category: 'Travelling',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 2500,
    monthlyLimit: 10000,
    description: 'Transportation costs including airfare, train, taxi, etc.',
    currency: 'INR'
  },
  {
    category: 'Accommodation',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 1250,
    monthlyLimit: 5000,
    description: 'Hotel and lodging expenses while on business trips.',
    currency: 'INR'
  },
  {
    category: 'Client & Project Expenses',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 25000,
    monthlyLimit: 100000,
    description: 'Expenses directly related to client projects.',
    currency: 'INR'
  },
  {
    category: 'Subscriptions',
    maxAmount: undefined,
    dailyLimit: undefined,
    weeklyLimit: 12500,
    monthlyLimit: 50000,
    description: 'Software, services, and publication subscriptions.',
    currency: 'INR'
  }
];

// Industry benchmark data (static/dummy data)
export const industryBenchmarks = {
  'Office Supplies': {
    averageMonthly: 350,
    percentageOfTotal: 8
  },
  'Food & Entertainment': {
    averageMonthly: 800,
    percentageOfTotal: 15
  },
  'Travelling': {
    averageMonthly: 1500,
    percentageOfTotal: 25
  },
  'Accommodation': {
    averageMonthly: 2000,
    percentageOfTotal: 20
  },
  'Client & Project Expenses': {
    averageMonthly: 3000,
    percentageOfTotal: 22
  },
  'Subscriptions': {
    averageMonthly: 700,
    percentageOfTotal: 10
  }
};

// Create the database class
class SpendWiseDatabase extends Dexie {
  users!: Table<User>;
  expenses!: Table<Expense>;
  policies!: Table<ExpensePolicy>;

  constructor() {
    super('spendwiseDB');
    this.version(5).stores({
      users: '++id, username, role, companyName, isActive, email',
      expenses: '++id, userId, category, date, status, createdAt, currency, [userId+date], [category+date]',
      policies: 'category'
    });

    // Initialize with default data on first load
    this.on('populate', async () => {
      try {
        await this.policies.bulkAdd(defaultPolicies);
        console.log('Default policies initialized successfully');
      } catch (error) {
        console.error('Error initializing default policies:', error);
      }
    });
  }

  async getUserByCredentials(username: string, password: string): Promise<User | undefined> {
    return this.users
      .where('username')
      .equals(username)
      .filter(user => user.password === password && user.isActive)
      .first();
  }

  async getAllUsers(): Promise<User[]> {
    return this.users.toArray();
  }

  async getUsersByCompany(companyName: string): Promise<User[]> {
    return this.users
      .where('companyName')
      .equals(companyName)
      .toArray();
  }

  async createUser(user: User): Promise<string> {
    try {
      // Ensure database is open
      if (!this.isOpen()) {
        console.log('Database was closed, attempting to reopen...');
        await this.open();
      }
      
      // Check if username already exists
      const existingUser = await this.users
        .where('username')
        .equals(user.username)
        .first();
      
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      // Add the user with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount <= maxRetries) {
        try {
          // Ensure user has all required fields
          if (!user.id || !user.name || !user.username || !user.password || !user.role || !user.companyName) {
            throw new Error('Missing required user fields');
          }

          // Set default values if not provided
          const userWithDefaults = {
            ...user,
            isActive: user.isActive ?? (user.role === 'manager'),
            preferredCurrency: user.preferredCurrency ?? 'USD'
          };

          const id = await this.users.add(userWithDefaults);
          console.log('User created successfully with ID:', id);
          return String(id);
        } catch (error) {
          console.error(`Attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw error;
          }
          
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      throw new Error('Failed to create user after multiple attempts');
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Try to recover database connection if possible
      if (!this.isOpen()) {
        try {
          await this.open();
          // Retry the operation
          const id = await this.users.add(user);
          return String(id);
        } catch (retryError) {
          console.error('Failed to recover and retry user creation:', retryError);
          throw new Error('Database connection error. Please try again or reload the page.');
        }
      }
      
      throw error;
    }
  }

  async updateUser(user: User): Promise<void> {
    await this.users.put(user);
  }

  async getPendingEmployees(companyName: string): Promise<User[]> {
    return this.users
      .where('companyName')
      .equals(companyName)
      .filter(user => user.role === 'employee' && !user.isActive)
      .toArray();
  }

  async approveEmployee(userId: string): Promise<void> {
    try {
      // Ensure database is open
      if (!this.isOpen()) {
        console.log('Database was closed, attempting to reopen...');
        await this.open();
      }

      // Get the user in a separate transaction first
      const user = await this.users.get(userId);
      
      if (!user) {
        console.error(`Employee with ID ${userId} not found.`);
        throw new Error(`Employee not found`);
      }
      
      // Update only the isActive property in a new transaction
      const updatedUser = { ...user, isActive: true };
      
      // Update the user with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount <= maxRetries) {
        try {
          await this.users.update(userId, { isActive: true });
          console.log(`Employee ${user.username} approved successfully`);
          return;
        } catch (error) {
          console.error(`Attempt ${retryCount + 1} to approve employee failed:`, error);
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw error;
          }
          
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
      
      throw new Error('Failed to approve employee after multiple attempts');
    } catch (error) {
      console.error('Error in approveEmployee:', error);
      throw error;
    }
  }

  async getPolicyForCategory(category: ExpenseCategory): Promise<ExpensePolicy | undefined> {
    return this.policies.get(category);
  }

  async getAllPolicies(): Promise<ExpensePolicy[]> {
    return this.policies.toArray();
  }

  async updatePolicy(policy: ExpensePolicy): Promise<void> {
    await this.policies.put(policy);
  }

  async addExpense(expense: Expense): Promise<string> {
    try {
      // Ensure IndexedDB is connected
      if (!this.isOpen()) {
        console.log('Database was closed, attempting to reopen...');
        await this.open();
      }
      
      // Add a timestamp if not present
      const expenseWithTimestamp = {
        ...expense,
        createdAt: expense.createdAt || new Date().toISOString()
      };
      
      // Try to add the expense
      const id = await this.expenses.add(expenseWithTimestamp);
      console.log('Successfully added expense with ID:', id);
      return String(id);
    } catch (error) {
      console.error('Error adding expense to IndexedDB:', error);
      
      // Try to recover database connection if possible
      if (!this.isOpen()) {
        try {
          await this.open();
          // Retry the operation
          const id = await this.expenses.add({
            ...expense,
            createdAt: expense.createdAt || new Date().toISOString()
          });
          return String(id);
        } catch (retryError) {
          console.error('Failed to recover and retry expense addition:', retryError);
          throw new Error('Database connection error. Please try again or reload the page.');
        }
      }
      
      throw error;
    }
  }

  async updateExpense(expense: Expense): Promise<void> {
    await this.expenses.put(expense);
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    return this.expenses.where('userId').equals(userId).toArray();
  }

  async getAllExpenses(): Promise<Expense[]> {
    return this.expenses.toArray();
  }

  async getRecentExpenses(limit = 10): Promise<Expense[]> {
    return this.expenses
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
    return this.expenses.where('category').equals(category).toArray();
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return this.expenses
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getExpensesByCompany(companyName: string): Promise<Expense[]> {
    // Get all users in the company
    const companyUsers = await this.getUsersByCompany(companyName);
    const userIds = companyUsers.map(user => user.id);
    
    // Get all expenses for those users
    const allExpenses = await this.expenses.toArray();
    return allExpenses.filter(expense => userIds.includes(expense.userId));
  }
}

// Create and export a singleton instance
export const db = new SpendWiseDatabase(); 