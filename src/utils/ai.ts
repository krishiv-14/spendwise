import { Expense, ExpenseCategory, Currency } from '../types';
import { industryBenchmarks } from './db';
import { formatCurrency } from './currency';

// Simple fraud detection algorithm that doesn't require previous expenses
export const detectFraud = (expense: Expense): { isFraud: boolean, reasons: string[] } => {
  const reasons: string[] = [];
  
  // Check for unusually high amount
  const categoryBenchmark = industryBenchmarks[expense.category as keyof typeof industryBenchmarks];
  if (categoryBenchmark && expense.amount > categoryBenchmark.averageMonthly * 3) {
    reasons.push(`Amount is more than 3x the average for ${expense.category}`);
  }
  
  // Add any other simple fraud checks that don't require user history
  // For example, check if the expense is submitted on a weekend or holiday
  const expenseDate = new Date(expense.date);
  const dayOfWeek = expenseDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 is Sunday, 6 is Saturday
    reasons.push('Expense submitted on a weekend');
  }
  
  // Check for future-dated expenses
  const now = new Date();
  if (expenseDate > now) {
    reasons.push('Expense dated in the future');
  }
  
  // Check for suspicious keywords in description
  const suspiciousKeywords = ['gift', 'personal', 'cash', 'advance', 'reimbursement'];
  if (expense.description) {
    const lowercaseDesc = expense.description.toLowerCase();
    for (const keyword of suspiciousKeywords) {
      if (lowercaseDesc.includes(keyword)) {
        reasons.push(`Description contains suspicious keyword: "${keyword}"`);
        break;
      }
    }
  }
  
  return {
    isFraud: reasons.length > 0,
    reasons
  };
};

// Industry comparison function
export const compareWithIndustry = (
  categoryExpenses: Record<ExpenseCategory, number>,
  totalExpense: number
): {
  category: ExpenseCategory,
  amount: number,
  industryAverage: number,
  percentageOfTotal: number,
  industryPercentage: number,
  difference: number
}[] => {
  return Object.entries(categoryExpenses).map(([category, amount]) => {
    const benchmark = industryBenchmarks[category as keyof typeof industryBenchmarks];
    const percentageOfTotal = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
    
    return {
      category: category as ExpenseCategory,
      amount,
      industryAverage: benchmark.averageMonthly,
      percentageOfTotal,
      industryPercentage: benchmark.percentageOfTotal,
      difference: percentageOfTotal - benchmark.percentageOfTotal
    };
  });
};

// Generate expense insights with proper currency formatting
export const generateExpenseInsights = (expenses: Expense[]): string[] => {
  if (expenses.length === 0) return ['No expenses to analyze.'];
  
  const insights: string[] = [];
  
  // Group expenses by currency
  const currencyGroups: Record<Currency, Expense[]> = {
    'USD': [],
    'EUR': [],
    'GBP': [],
    'INR': []
  };
  
  expenses.forEach(exp => {
    if (!currencyGroups[exp.currency]) {
      currencyGroups[exp.currency] = [];
    }
    currencyGroups[exp.currency].push(exp);
  });
  
  // Get list of used currencies
  const usedCurrencies = Object.keys(currencyGroups).filter(
    currency => currencyGroups[currency as Currency].length > 0
  ) as Currency[];
  
  // If only one currency is used, create insights for that currency
  if (usedCurrencies.length === 1) {
    const currency = usedCurrencies[0];
    const currencyExpenses = currencyGroups[currency];
    
    const totalAmount = currencyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgAmount = totalAmount / currencyExpenses.length;
    
    // Categorize expenses
    const categoryMap: Record<ExpenseCategory, number> = {
      'Office Supplies': 0,
      'Food & Entertainment': 0,
      'Travelling': 0,
      'Accommodation': 0,
      'Client & Project Expenses': 0,
      'Subscriptions': 0
    };
    
    currencyExpenses.forEach(exp => {
      categoryMap[exp.category] += exp.amount;
    });
    
    // Find highest spending category
    let highestCategory: ExpenseCategory = 'Office Supplies';
    let highestAmount = 0;
    
    Object.entries(categoryMap).forEach(([category, amount]) => {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestCategory = category as ExpenseCategory;
      }
    });
    
    insights.push(`Total expense amount: ${formatCurrency(totalAmount, currency)}`);
    insights.push(`Average expense amount: ${formatCurrency(avgAmount, currency)}`);
    insights.push(`Highest spending in "${highestCategory}" at ${formatCurrency(highestAmount, currency)}`);
    
    // Compare with industry benchmarks
    const comparison = compareWithIndustry(categoryMap, totalAmount);
    const significantDifferences = comparison.filter(c => Math.abs(c.difference) > 5);
    
    if (significantDifferences.length > 0) {
      significantDifferences.forEach(diff => {
        const direction = diff.difference > 0 ? 'higher' : 'lower';
        insights.push(
          `"${diff.category}" spending is ${Math.abs(diff.difference).toFixed(1)}% ${direction} than industry average`
        );
      });
    }
  } 
  // Multiple currencies - provide aggregated insights with currency-specific amounts
  else {
    let totalInsight = "Total expenses: ";
    const multiCurrencyTotals: string[] = [];
    
    usedCurrencies.forEach(currency => {
      const currencyTotal = currencyGroups[currency].reduce((sum, exp) => sum + exp.amount, 0);
      if (currencyTotal > 0) {
        multiCurrencyTotals.push(formatCurrency(currencyTotal, currency));
      }
    });
    
    totalInsight += multiCurrencyTotals.join(", ");
    insights.push(totalInsight);
    
    // Per-currency average insights
    let averageInsight = "Average expenses: ";
    const multiCurrencyAverages: string[] = [];
    
    usedCurrencies.forEach(currency => {
      const currencyExpenses = currencyGroups[currency];
      if (currencyExpenses.length > 0) {
        const average = currencyExpenses.reduce((sum, exp) => sum + exp.amount, 0) / currencyExpenses.length;
        multiCurrencyAverages.push(formatCurrency(average, currency));
      }
    });
    
    averageInsight += multiCurrencyAverages.join(", ");
    insights.push(averageInsight);
    
    // Find highest spending category per currency
    let highestSpendingInsight = "Highest spending categories: ";
    const highestPerCurrency: string[] = [];
    
    usedCurrencies.forEach(currency => {
      const currencyExpenses = currencyGroups[currency];
      if (currencyExpenses.length > 0) {
        // Categorize expenses for this currency
        const categoryMap: Record<ExpenseCategory, number> = {
          'Office Supplies': 0,
          'Food & Entertainment': 0,
          'Travelling': 0,
          'Accommodation': 0,
          'Client & Project Expenses': 0,
          'Subscriptions': 0
        };
        
        currencyExpenses.forEach(exp => {
          categoryMap[exp.category] += exp.amount;
        });
        
        // Find highest for this currency
        let highestCategory: ExpenseCategory = 'Office Supplies';
        let highestAmount = 0;
        
        Object.entries(categoryMap).forEach(([category, amount]) => {
          if (amount > highestAmount) {
            highestAmount = amount;
            highestCategory = category as ExpenseCategory;
          }
        });
        
        if (highestAmount > 0) {
          highestPerCurrency.push(`"${highestCategory}" at ${formatCurrency(highestAmount, currency)}`);
        }
      }
    });
    
    highestSpendingInsight += highestPerCurrency.join(", ");
    insights.push(highestSpendingInsight);
  }
  
  return insights;
};

// Simplified industry trend insights function
export const generateIndustryTrendInsights = async (
  categoryExpenses: Record<ExpenseCategory, number>,
  totalExpense: number
): Promise<{
  category: ExpenseCategory,
  industryAverage: number,
  companyAverage: number,
  difference: number,
  percentageDifference: number,
  insight: string,
  trend: string
}[]> => {
  return Object.entries(categoryExpenses).map(([category, amount]) => {
    const typedCategory = category as ExpenseCategory;
    const industryAvg = industryBenchmarks[typedCategory].averageMonthly * 50; // Convert to INR
    
    // Calculate difference
    const difference = amount - industryAvg;
    const percentageDifference = industryAvg > 0 
      ? (difference / industryAvg) * 100 
      : 0;
    
    // Generate insight based on difference
    let insight = '';
    if (Math.abs(percentageDifference) < 10) {
      insight = `Your spending on ${typedCategory} is in line with industry standards in India.`;
    } else if (percentageDifference > 10) {
      insight = `Your company is spending ${percentageDifference.toFixed(1)}% more on ${typedCategory} than the industry average in India.`;
    } else {
      insight = `Your company is efficiently managing ${typedCategory} expenses, spending ${Math.abs(percentageDifference).toFixed(1)}% less than the industry average in India.`;
    }
    
    return {
      category: typedCategory,
      industryAverage: industryAvg,
      companyAverage: amount,
      difference,
      percentageDifference,
      insight,
      trend: 'Stable trend' // Simplified trend
    };
  });
}; 