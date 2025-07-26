import { User, Expense, ExpensePolicy, Currency } from '../types';

const API_URL = 'http://localhost:5001/api';

// API error handling helper
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `Error: ${response.status}`;
    throw new Error(errorMessage);
  }
  return response.json();
};

// Auth API
export const login = async (username: string, password: string): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
};

// User API
export const createUser = async (user: User): Promise<void> => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users`);
  return handleResponse(response);
};

export const getUsersByCompany = async (companyName: string): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users/company/${encodeURIComponent(companyName)}`);
  return handleResponse(response);
};

export const getPendingEmployees = async (companyName: string): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users/pending/${encodeURIComponent(companyName)}`);
  return handleResponse(response);
};

export const approveEmployee = async (userId: string): Promise<any> => {
  let retries = 0;
  const maxRetries = 3;
  
  while (retries <= maxRetries) {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error(`Attempt ${retries + 1} to approve employee (API) failed:`, error);
      retries++;
      
      if (retries > maxRetries) {
        throw error;
      }
      
      // Wait before retrying, with increasing delay
      await new Promise(resolve => setTimeout(resolve, 500 * retries));
    }
  }
};

export const updateUser = async (user: User): Promise<void> => {
  const response = await fetch(`${API_URL}/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
};

// Expense API
export const addExpense = async (expense: Expense): Promise<{id: string, status: string, message: string}> => {
  const response = await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(response);
};

export const updateExpense = async (expense: Expense): Promise<void> => {
  const response = await fetch(`${API_URL}/expenses/${expense.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(response);
};

export const getExpenseById = async (id: string): Promise<Expense> => {
  const response = await fetch(`${API_URL}/expenses/${id}`);
  return handleResponse(response);
};

export const getExpensesByUserId = async (userId: string, userRole: string): Promise<Expense[]> => {
  const response = await fetch(`${API_URL}/expenses/user/${userId}?role=${userRole}`);
  return handleResponse(response);
};

export const getAllExpenses = async (userRole: string): Promise<Expense[]> => {
  const response = await fetch(`${API_URL}/expenses?role=${userRole}`);
  return handleResponse(response);
};

// Policy API
export const getAllPolicies = async (): Promise<ExpensePolicy[]> => {
  const response = await fetch(`${API_URL}/policies`);
  return handleResponse(response);
};

export const getPolicyForCategory = async (category: string): Promise<ExpensePolicy> => {
  const response = await fetch(`${API_URL}/policies/${encodeURIComponent(category)}`);
  return handleResponse(response);
};

export const updatePolicy = async (policy: ExpensePolicy): Promise<void> => {
  const response = await fetch(`${API_URL}/policies/${encodeURIComponent(policy.category)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      maxAmount: policy.maxAmount,
      dailyLimit: policy.dailyLimit,
      weeklyLimit: policy.weeklyLimit,
      monthlyLimit: policy.monthlyLimit,
      description: policy.description,
      currency: policy.currency
    }),
  });
  return handleResponse(response);
};

// Currency API
export const getExchangeRates = async (): Promise<{
  base: string;
  date: string;
  rates: Record<string, Record<string, number>>;
}> => {
  const response = await fetch(`${API_URL}/exchange-rates`);
  return handleResponse(response);
};

export const convertCurrency = async (
  amount: number, 
  fromCurrency: Currency, 
  toCurrency: Currency
): Promise<{
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  result: number;
}> => {
  const response = await fetch(`${API_URL}/convert-currency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, fromCurrency, toCurrency }),
  });
  return handleResponse(response);
}; 