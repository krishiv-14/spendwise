import { ExpenseCategory } from '../types';

// API endpoints for Indian industry spending trends
const API_URL = 'https://api.data.gov.in/resource/mock-industry-spend';

// Interface for the API response
interface IndustrySpendingResponse {
  success: boolean;
  data: {
    category: string;
    average_monthly: number;
    percentage_total: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    region: string;
  }[];
}

// Since we can't actually connect to a real API in this demo, we'll simulate a fetch
export const fetchIndianIndustrySpendingTrends = async (): Promise<{
  category: ExpenseCategory;
  averageMonthly: number;
  percentageOfTotal: number;
}[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // More realistic India-specific data (based on research)
  // Note: In a real app, this would come from an actual API
  const mockIndianData = [
    {
      category: 'Office Supplies' as ExpenseCategory,
      averageMonthly: 18500, // INR
      percentageOfTotal: 6
    },
    {
      category: 'Food & Entertainment' as ExpenseCategory,
      averageMonthly: 35000, // INR
      percentageOfTotal: 12
    },
    {
      category: 'Travelling' as ExpenseCategory,
      averageMonthly: 75000, // INR
      percentageOfTotal: 26
    },
    {
      category: 'Accommodation' as ExpenseCategory,
      averageMonthly: 60000, // INR
      percentageOfTotal: 21
    },
    {
      category: 'Client & Project Expenses' as ExpenseCategory,
      averageMonthly: 70000, // INR
      percentageOfTotal: 24
    },
    {
      category: 'Subscriptions' as ExpenseCategory,
      averageMonthly: 32000, // INR
      percentageOfTotal: 11
    }
  ];
  
  return mockIndianData;
};

// Fetch industry trends for a specific sector
export const fetchIndustrySectorTrends = async (
  sector: string
): Promise<{
  month: string;
  spending: number;
}[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Generate last 6 months of data with realistic variations
  const months = [];
  const today = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = month.toLocaleString('default', { month: 'short' });
    const year = month.getFullYear();
    
    // Base spending with monthly variations (higher in festival seasons)
    let baseSpend = 0;
    switch (sector) {
      case 'IT Services':
        baseSpend = 250000 + Math.random() * 50000;
        break;
      case 'Manufacturing':
        baseSpend = 380000 + Math.random() * 70000;
        break;
      case 'Healthcare':
        baseSpend = 220000 + Math.random() * 40000;
        break;
      case 'Financial Services':
        baseSpend = 310000 + Math.random() * 60000;
        break;
      default:
        baseSpend = 270000 + Math.random() * 50000;
    }
    
    // Add seasonal factors (Diwali, year-end, etc.)
    if (monthName === 'Oct' || monthName === 'Nov') {
      baseSpend *= 1.2; // Diwali season
    } else if (monthName === 'Mar') {
      baseSpend *= 1.3; // Financial year-end
    } else if (monthName === 'Dec') {
      baseSpend *= 1.15; // Christmas/New Year
    }
    
    months.push({
      month: `${monthName} ${year}`,
      spending: Math.round(baseSpend)
    });
  }
  
  return months;
}; 