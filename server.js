const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

// Initialize database
let db;

// Exchange rate API
const EXCHANGE_RATE_API = 'https://api.exchangerate.host/latest';

async function initializeDatabase() {
  try {
    console.log('Opening database connection...');
    // Open database connection
    db = await open({
      filename: path.join(__dirname, 'spendwise.db'),
      driver: sqlite3.Database
    });
    
    console.log('Creating tables if they don\'t exist...');
    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT,
        companyName TEXT,
        isActive INTEGER DEFAULT 0,
        preferredCurrency TEXT DEFAULT 'USD'
      );
      
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        userId TEXT,
        amount REAL,
        currency TEXT,
        date TEXT,
        category TEXT,
        description TEXT,
        receiptImage TEXT,
        status TEXT,
        notes TEXT,
        createdAt TEXT,
        FOREIGN KEY (userId) REFERENCES users (id)
      );
      
      CREATE TABLE IF NOT EXISTS policies (
        category TEXT PRIMARY KEY,
        maxAmount REAL,
        dailyLimit REAL,
        weeklyLimit REAL,
        monthlyLimit REAL,
        description TEXT,
        currency TEXT
      );
      
      CREATE TABLE IF NOT EXISTS conversion_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_fetched TEXT,
        from_currency TEXT,
        to_currency TEXT,
        rate REAL,
        UNIQUE(date_fetched, from_currency, to_currency)
      );
    `);

    // Add indexes for performance
    try {
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_userId ON expenses(userId);`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);`);
    } catch (error) {
      console.warn('Index creation error (non-critical):', error);
    }

    // Check if we have any policies already
    const existingPolicies = await db.all('SELECT * FROM policies');
    
    if (existingPolicies.length === 0) {
      console.log('No policies found, inserting default policies...');
      // Insert default policies if not exist
      const policies = [
        {
          category: 'Office Supplies',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 2500,
          monthlyLimit: 10000,
          description: 'Items for office use including stationery, small equipment, etc.',
          currency: 'INR'
        },
        {
          category: 'Food & Entertainment',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 1250,
          monthlyLimit: 5000,
          description: 'Meals, client entertainment, and team events.',
          currency: 'INR'
        },
        {
          category: 'Travelling',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 2500,
          monthlyLimit: 10000,
          description: 'Transportation costs including airfare, train, taxi, etc.',
          currency: 'INR'
        },
        {
          category: 'Accommodation',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 1250,
          monthlyLimit: 5000,
          description: 'Hotel and lodging expenses while on business trips.',
          currency: 'INR'
        },
        {
          category: 'Client & Project Expenses',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 25000,
          monthlyLimit: 100000,
          description: 'Expenses directly related to client projects.',
          currency: 'INR'
        },
        {
          category: 'Subscriptions',
          maxAmount: null,
          dailyLimit: null,
          weeklyLimit: 12500,
          monthlyLimit: 50000,
          description: 'Software, services, and publication subscriptions.',
          currency: 'INR'
        }
      ];

      for (const policy of policies) {
        await db.run(
          `INSERT INTO policies (category, maxAmount, dailyLimit, weeklyLimit, monthlyLimit, description, currency) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [policy.category, policy.maxAmount, policy.dailyLimit, policy.weeklyLimit, policy.monthlyLimit, policy.description, policy.currency]
        );
      }
      console.log('Default policies initialized successfully');
    } else {
      console.log(`Found ${existingPolicies.length} existing policies`);
    }
    
    // Check if we have any users
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    console.log(`Database has ${userCount.count} users`);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Function to create default admin account if no users exist
async function createDefaultManagerIfNeeded() {
  try {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "manager"');
    if (userCount.count === 0) {
      console.log('No manager accounts found, creating default manager account...');
      const defaultManager = {
        id: 'default-manager-' + Date.now(),
        username: 'admin',
        password: 'admin123',
        name: 'Admin User',
        email: 'admin@spendwise.com',
        role: 'manager',
        companyName: 'SpendWise Inc.',
        isActive: 1,
        preferredCurrency: 'USD'
      };
      
      await db.run(
        `INSERT INTO users (id, username, password, name, email, role, companyName, isActive, preferredCurrency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultManager.id,
          defaultManager.username,
          defaultManager.password,
          defaultManager.name,
          defaultManager.email,
          defaultManager.role,
          defaultManager.companyName,
          defaultManager.isActive,
          defaultManager.preferredCurrency
        ]
      );
      console.log('Default manager account created: username=admin, password=admin123');
    }
  } catch (error) {
    console.error('Error creating default manager:', error);
  }
}

// Function to fetch and store currency rates
async function fetchAndStoreCurrencyRates() {
  try {
    console.log('Fetching current exchange rates...');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have rates for today
    const existingRates = await db.get(
      'SELECT COUNT(*) as count FROM conversion_rates WHERE date_fetched = ?',
      [today]
    );
    
    if (existingRates.count > 0) {
      console.log(`Exchange rates for ${today} already exist in the database.`);
      return;
    }
    
    // Fetch exchange rates with INR as base currency
    const response = await axios.get(`${EXCHANGE_RATE_API}?base=INR`);
    
    if (!response.data || !response.data.rates) {
      throw new Error('Invalid response from exchange rate API');
    }
    
    const { rates } = response.data;
    console.log('Exchange rates fetched successfully');
    
    // Store rates for USD, EUR, GBP (from INR)
    const currencies = ['USD', 'EUR', 'GBP'];
    
    // Begin a transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Insert INR to each currency exchange rate
      for (const currency of currencies) {
        if (rates[currency]) {
          await db.run(
            'INSERT INTO conversion_rates (date_fetched, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
            [today, 'INR', currency, rates[currency]]
          );
          
          // Also insert the inverse rate (currency to INR)
          await db.run(
            'INSERT INTO conversion_rates (date_fetched, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
            [today, currency, 'INR', 1 / rates[currency]]
          );
        }
      }
      
      // Add INR to INR rate (1:1)
      await db.run(
        'INSERT INTO conversion_rates (date_fetched, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
        [today, 'INR', 'INR', 1]
      );
      
      // Commit the transaction
      await db.run('COMMIT');
      console.log('Exchange rates stored in database successfully');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error fetching/storing exchange rates:', error);
    
    // If API fails, add fallback rates
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingRates = await db.get(
        'SELECT COUNT(*) as count FROM conversion_rates WHERE date_fetched = ?',
        [today]
      );
      
      if (existingRates.count === 0) {
        // Fallback rates
        const fallbackRates = [
          { from: 'INR', to: 'USD', rate: 0.012 },
          { from: 'INR', to: 'EUR', rate: 0.011 },
          { from: 'INR', to: 'GBP', rate: 0.0094 },
          { from: 'INR', to: 'INR', rate: 1 },
          { from: 'USD', to: 'INR', rate: 83.16 },
          { from: 'EUR', to: 'INR', rate: 90.91 },
          { from: 'GBP', to: 'INR', rate: 106.38 }
        ];
        
        await db.run('BEGIN TRANSACTION');
        
        for (const { from, to, rate } of fallbackRates) {
          await db.run(
            'INSERT INTO conversion_rates (date_fetched, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)',
            [today, from, to, rate]
          );
        }
        
        await db.run('COMMIT');
        console.log('Fallback exchange rates stored in database');
      }
    } catch (fallbackError) {
      console.error('Error storing fallback rates:', fallbackError);
      await db.run('ROLLBACK');
    }
  }
}

// API Routes
// Users
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    console.log(`Login attempt: ${username}`);
    
    // First check if the user exists at all, regardless of status
    const userExists = await db.get(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
    
    if (!userExists) {
      console.log(`Login failed: ${username} - User does not exist`);
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }
    
    // Now check password
    const userWithPassword = await db.get(
      `SELECT * FROM users WHERE username = ? AND password = ?`,
      [username, password]
    );
    
    if (!userWithPassword) {
      console.log(`Login failed: ${username} - Invalid password`);
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }
    
    // Debug output
    console.log(`User found: ${username}, role: ${userWithPassword.role}, isActive: ${userWithPassword.isActive}`);
    
    // If it's a manager, always allow login and make active if needed
    if (userWithPassword.role === 'manager') {
      if (!userWithPassword.isActive) {
        console.log(`Activating manager account: ${username}`);
        await db.run(
          `UPDATE users SET isActive = 1 WHERE id = ?`,
          [userWithPassword.id]
        );
        userWithPassword.isActive = 1;
      }
      
      // Don't send password back to client
      delete userWithPassword.password;
      console.log(`Login successful: ${username}, role: ${userWithPassword.role}`);
      return res.json(userWithPassword);
    }
    
    // For employees, check the activation status
    if (userWithPassword.isActive !== 1) {
      console.log(`Login failed: ${username} - Employee account not activated (isActive = ${userWithPassword.isActive})`);
      return res.status(401).json({ error: 'Your account has not been approved yet. Please contact your manager.' });
    }
    
    // Employee is active, allow login
    delete userWithPassword.password;
    console.log(`Login successful: ${username}, role: ${userWithPassword.role}`);
    res.json(userWithPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    
    console.log(`Creating user: ${user.username}, role: ${user.role}`);
    
    // Check if email already exists
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [user.email]);
    if (existingEmail) {
      console.log(`User creation failed: Email ${user.email} already exists`);
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Check if username already exists
    const existingUsername = await db.get('SELECT id FROM users WHERE username = ?', [user.username]);
    if (existingUsername) {
      console.log(`User creation failed: Username ${user.username} already exists`);
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Ensure required fields
    if (!user.id || !user.name || !user.username || !user.password || !user.email || !user.role || !user.companyName) {
      console.log('User creation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required user fields' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      console.log(`User creation failed: Invalid email format - ${user.email}`);
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Set activation status based on role
    // Managers are always active, employees need approval
    const isActive = user.role === 'manager' ? 1 : 0;
    user.preferredCurrency = user.preferredCurrency || 'USD';
    
    console.log(`User will be created with isActive=${isActive} (${user.role} role)`);
    
    // Insert user
    await db.run(
      `INSERT INTO users (id, username, password, name, email, role, companyName, isActive, preferredCurrency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.password,
        user.name,
        user.email,
        user.role,
        user.companyName,
        isActive,
        user.preferredCurrency
      ]
    );
    
    // Verify the user was created correctly
    const createdUser = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
    console.log(`User created successfully: ${user.username}, isActive=${createdUser.isActive}`);
    
    // If it's an employee, inform that approval is needed
    if (user.role === 'employee') {
      res.status(201).json({ 
        success: true, 
        message: 'Employee account created successfully. Your account needs manager approval before you can log in.',
        requiresApproval: true
      });
    } else {
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        requiresApproval: false
      });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users');
    // Remove passwords from response
    users.forEach(user => delete user.password);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/company/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const users = await db.all('SELECT * FROM users WHERE companyName = ?', [companyName]);
    users.forEach(user => delete user.password);
    res.json(users);
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    
    // Verify user exists
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    await db.run(
      `UPDATE users SET 
        name = ?, 
        username = ?, 
        email = ?, 
        role = ?, 
        companyName = ?, 
        isActive = ?, 
        preferredCurrency = ?
       WHERE id = ?`,
      [
        user.name,
        user.username,
        user.email,
        user.role,
        user.companyName,
        user.isActive ? 1 : 0,
        user.preferredCurrency,
        id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/pending/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const users = await db.all(
      'SELECT * FROM users WHERE companyName = ? AND role = ? AND isActive = 0',
      [companyName, 'employee']
    );
    users.forEach(user => delete user.password);
    res.json(users);
  } catch (error) {
    console.error('Get pending employees error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists first
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      console.log(`Approval failed: User with ID ${id} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Approving user: ${user.username} (ID: ${id})`);
    
    // Update user to be active
    const result = await db.run('UPDATE users SET isActive = 1 WHERE id = ?', [id]);
    
    console.log(`Approval result: ${result.changes} rows affected`);
    
    // Verify the update worked
    const updatedUser = await db.get('SELECT isActive FROM users WHERE id = ?', [id]);
    console.log(`User ${id} isActive status is now: ${updatedUser.isActive}`);
    
    // Return the success response with additional information
    res.json({ 
      success: true, 
      message: `User ${user.username} approved successfully`,
      userId: id,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    console.error('Approve employee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Expenses
app.post('/api/expenses', async (req, res) => {
  try {
    const expense = req.body;
    
    // Ensure required fields
    if (!expense.id || !expense.userId || !expense.amount || !expense.currency || 
        !expense.date || !expense.category || !expense.description) {
      return res.status(400).json({ error: 'Missing required expense fields' });
    }
    
    // Add timestamp if not present
    expense.createdAt = expense.createdAt || new Date().toISOString();
    
    // Check against expense policy limits
    console.log(`Checking expense against policy: ${expense.category}, amount: ${expense.amount} ${expense.currency}`);
    const policy = await db.get('SELECT * FROM policies WHERE category = ?', [expense.category]);
    
    if (!policy) {
      console.log(`No policy found for category: ${expense.category}`);
      // No policy found, set as pending for manager review
      expense.status = 'pending';
    } else {
      // Get the expense date and create date objects for period checks
      const expenseDate = new Date(expense.date);
      const expenseDay = expenseDate.getDate();
      const expenseMonth = expenseDate.getMonth();
      const expenseYear = expenseDate.getFullYear();
      
      // Check weekly spending limit
      const currentDate = new Date(expenseDate);
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek); // Go back to Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
      endOfWeek.setHours(23, 59, 59, 999);
      
      const weeklyExpenses = await db.all(
        `SELECT SUM(amount) as totalAmount 
         FROM expenses 
         WHERE userId = ? AND category = ? AND date >= ? AND date <= ? AND currency = ?`,
        [expense.userId, expense.category, startOfWeek.toISOString(), endOfWeek.toISOString(), expense.currency]
      );
      
      const weeklyTotal = (weeklyExpenses[0].totalAmount || 0) + expense.amount;
      let withinWeeklyLimit = true;
      
      if (policy.weeklyLimit && weeklyTotal > policy.weeklyLimit) {
        withinWeeklyLimit = false;
        console.log(`Expense exceeds weekly limit (${policy.weeklyLimit} ${policy.currency}), current weekly total: ${weeklyTotal}`);
      }
      
      // Check monthly spending limit
      const startOfMonth = new Date(expenseYear, expenseMonth, 1).toISOString();
      const endOfMonth = new Date(expenseYear, expenseMonth + 1, 0, 23, 59, 59).toISOString();
      
      const monthlyExpenses = await db.all(
        `SELECT SUM(amount) as totalAmount 
         FROM expenses 
         WHERE userId = ? AND category = ? AND date >= ? AND date <= ? AND currency = ?`,
        [expense.userId, expense.category, startOfMonth, endOfMonth, expense.currency]
      );
      
      const monthlyTotal = (monthlyExpenses[0].totalAmount || 0) + expense.amount;
      let withinMonthlyLimit = true;
      
      if (policy.monthlyLimit && monthlyTotal > policy.monthlyLimit) {
        withinMonthlyLimit = false;
        console.log(`Expense exceeds monthly limit (${policy.monthlyLimit} ${policy.currency}), current monthly total: ${monthlyTotal}`);
      }
      
      // Determine overall status based on all checks
      if (withinWeeklyLimit && withinMonthlyLimit) {
        // Within all limits - auto approve
        console.log(`Expense within all limits, auto-approving`);
        expense.status = 'approved';
      } else {
        // Determine most specific limit exceeded for message
        let limitMessage = "";
        if (!withinWeeklyLimit) {
          limitMessage = `Exceeds weekly limit of ${policy.weeklyLimit} ${policy.currency} (weekly total: ${weeklyTotal.toFixed(2)})`;
        } else if (!withinMonthlyLimit) {
          limitMessage = `Exceeds monthly limit of ${policy.monthlyLimit} ${policy.currency} (monthly total: ${monthlyTotal.toFixed(2)})`;
        }
        
        // Exceeds some limit - requires manager approval
        console.log(`Expense exceeds limits, setting to pending. ${limitMessage}`);
        expense.status = 'pending';
        expense.notes = expense.notes ? `${expense.notes}. ${limitMessage}` : limitMessage;
      }
    }
    
    // Set status if not already set (from client or above logic)
    expense.status = expense.status || 'pending';
    
    console.log(`Saving expense with status: ${expense.status}`);
    
    await db.run(
      `INSERT INTO expenses (id, userId, amount, currency, date, category, description, 
                            receiptImage, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.userId,
        expense.amount,
        expense.currency,
        expense.date,
        expense.category,
        expense.description,
        expense.receiptImage || null,
        expense.status,
        expense.notes || null,
        expense.createdAt
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      id: expense.id, 
      status: expense.status,
      message: expense.status === 'approved' 
        ? 'Expense approved automatically (within policy limits)' 
        : 'Expense submitted for approval'
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    // This endpoint should only return all expenses for managers
    // Ensure user role is passed in the header or query parameter
    const userRole = req.query.role;
    
    if (userRole !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access all expenses' });
    }
    
    const expenses = await db.all('SELECT * FROM expenses');
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/expenses/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.query.role;
    
    if (userRole === 'manager') {
      // Managers can see all expenses for any user
      const expenses = await db.all('SELECT * FROM expenses WHERE userId = ?', [userId]);
      return res.json(expenses);
    } else {
      // Employees can only see their own non-flagged expenses and approved/rejected ones
      const expenses = await db.all(
        `SELECT * FROM expenses 
         WHERE userId = ? 
         AND (status = 'approved' OR status = 'rejected' OR 
              (status = 'pending' AND NOT (status = 'flagged')))`,
        [userId]
      );
      return res.json(expenses);
    }
  } catch (error) {
    console.error('Get user expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await db.get('SELECT * FROM expenses WHERE id = ?', [id]);
    if (expense) {
      res.json(expense);
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const expense = req.body;
    
    await db.run(
      `UPDATE expenses SET 
        amount = ?, 
        currency = ?, 
        date = ?, 
        category = ?, 
        description = ?, 
        receiptImage = ?, 
        status = ?, 
        notes = ?
       WHERE id = ?`,
      [
        expense.amount,
        expense.currency,
        expense.date,
        expense.category,
        expense.description,
        expense.receiptImage || null,
        expense.status,
        expense.notes || null,
        id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Policies
app.get('/api/policies', async (req, res) => {
  try {
    const policies = await db.all('SELECT * FROM policies');
    res.json(policies);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/policies/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const policy = await db.get('SELECT * FROM policies WHERE category = ?', [category]);
    if (policy) {
      res.json(policy);
    } else {
      res.status(404).json({ error: 'Policy not found' });
    }
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/policies/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const policy = req.body;
    
    await db.run(
      `UPDATE policies SET 
        maxAmount = ?, 
        dailyLimit = ?,
        weeklyLimit = ?, 
        monthlyLimit = ?, 
        description = ?, 
        currency = ?
       WHERE category = ?`,
      [
        policy.maxAmount,
        policy.dailyLimit,
        policy.weeklyLimit,
        policy.monthlyLimit,
        policy.description,
        policy.currency,
        category
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve React app in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await createDefaultManagerIfNeeded();
    await fetchAndStoreCurrencyRates(); // Fetch rates on startup
    
    // Schedule daily exchange rate update
    setInterval(fetchAndStoreCurrencyRates, 24 * 60 * 60 * 1000); // Runs once per day
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Default login credentials (if no users existed):`);
      console.log(`  Username: admin`);
      console.log(`  Password: admin123`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Add API endpoints for currency conversion
app.get('/api/exchange-rates', async (req, res) => {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we have rates for today
    const rates = await db.all(
      'SELECT from_currency, to_currency, rate FROM conversion_rates WHERE date_fetched = ?',
      [today]
    );
    
    // If no rates found for today, trigger a fetch
    if (rates.length === 0) {
      await fetchAndStoreCurrencyRates();
      // Get the rates again
      const freshRates = await db.all(
        'SELECT from_currency, to_currency, rate FROM conversion_rates WHERE date_fetched = ?',
        [today]
      );
      
      // Format the response
      const formattedRates = {};
      
      freshRates.forEach(rate => {
        if (!formattedRates[rate.from_currency]) {
          formattedRates[rate.from_currency] = {};
        }
        formattedRates[rate.from_currency][rate.to_currency] = rate.rate;
      });
      
      return res.json({
        base: 'INR',
        date: today,
        rates: formattedRates
      });
    }
    
    // Format the response
    const formattedRates = {};
    
    rates.forEach(rate => {
      if (!formattedRates[rate.from_currency]) {
        formattedRates[rate.from_currency] = {};
      }
      formattedRates[rate.from_currency][rate.to_currency] = rate.rate;
    });
    
    res.json({
      base: 'INR',
      date: today,
      rates: formattedRates
    });
  } catch (error) {
    console.error('Error getting exchange rates:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
});

app.post('/api/convert-currency', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    
    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get the exchange rate
    const rate = await db.get(
      'SELECT rate FROM conversion_rates WHERE date_fetched = ? AND from_currency = ? AND to_currency = ?',
      [today, fromCurrency, toCurrency]
    );
    
    if (!rate) {
      // Try to fetch fresh rates
      await fetchAndStoreCurrencyRates();
      
      // Try again
      const freshRate = await db.get(
        'SELECT rate FROM conversion_rates WHERE date_fetched = ? AND from_currency = ? AND to_currency = ?',
        [today, fromCurrency, toCurrency]
      );
      
      if (!freshRate) {
        return res.status(404).json({ error: 'Exchange rate not found' });
      }
      
      const convertedAmount = amount * freshRate.rate;
      return res.json({
        amount,
        fromCurrency,
        toCurrency,
        rate: freshRate.rate,
        result: convertedAmount
      });
    }
    
    const convertedAmount = amount * rate.rate;
    
    res.json({
      amount,
      fromCurrency,
      toCurrency,
      rate: rate.rate,
      result: convertedAmount
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

startServer(); 