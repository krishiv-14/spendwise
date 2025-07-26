import { Currency, CurrencyRates } from '../types';
import * as api from '../services/api';

// Cache for currency rates
let cachedRates: CurrencyRates | null = null;
let cacheTimestamp = 0;
const CACHE_LIFETIME = 3600000; // 1 hour in milliseconds

/**
 * Fetches currency exchange rates from our backend API
 * @param baseCurrency The base currency to get rates for
 * @returns Promise with currency rates data
 */
export const fetchCurrencyRates = async (baseCurrency: Currency = 'INR'): Promise<CurrencyRates> => {
  // Check if we have valid cached data
  const now = Date.now();
  if (cachedRates && cachedRates.base === baseCurrency && now - cacheTimestamp < CACHE_LIFETIME) {
    return cachedRates;
  }

  try {
    // Get rates from our backend which caches daily rates from the external API
    const data = await api.getExchangeRates();
    
    // Format data to match our interface
    const rates: Record<Currency, number> = {
      USD: data.rates['INR']?.['USD'] || 1,
      EUR: data.rates['INR']?.['EUR'] || 1, 
      GBP: data.rates['INR']?.['GBP'] || 1,
      INR: 1
    };
    
    cachedRates = {
      base: 'INR',
      rates,
      timestamp: now
    };
    
    cacheTimestamp = now;
    return cachedRates;
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    
    // Return default values if API fails
    return {
      base: 'INR',
      rates: {
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0094,
        INR: 1
      },
      timestamp: now
    };
  }
};

/**
 * Converts an amount from one currency to another
 * @param amount The amount to convert
 * @param fromCurrency The currency to convert from
 * @param toCurrency The currency to convert to
 * @returns Promise with the converted amount
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    // Use our backend conversion service which uses the daily rates
    const conversionResult = await api.convertCurrency(amount, fromCurrency, toCurrency);
    return conversionResult.result;
  } catch (error) {
    console.error('Error converting currency via API, using fallback method:', error);
    
    // Fallback: convert through INR as the base currency
    if (fromCurrency !== 'INR' && toCurrency !== 'INR') {
      // First convert from source currency to INR
      const rates = await fetchCurrencyRates();
      const amountInINR = amount / rates.rates[fromCurrency];
      
      // Then convert from INR to target currency
      return amountInINR * rates.rates[toCurrency];
    } else {
      // One of the currencies is INR
      const rates = await fetchCurrencyRates();
      if (fromCurrency === 'INR') {
        return amount * rates.rates[toCurrency];
      } else {
        return amount / rates.rates[fromCurrency];
      }
    }
  }
};

/**
 * Get currency symbol for display
 * @param currency The currency code
 * @returns The currency symbol
 */
export const getCurrencySymbol = (currency: Currency): string => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    default:
      return '$';
  }
};

/**
 * Format amount with currency symbol
 * @param amount The amount to format
 * @param currency The currency code
 * @returns Formatted amount with currency symbol
 */
export const formatCurrency = (amount: number, currency: Currency): string => {
  const symbol = getCurrencySymbol(currency);
  
  // Remove leading zeros
  const formattedAmount = parseFloat(amount.toString());
  
  // Format with 2 decimal places and ensure the currency symbol is displayed before the amount
  return `${symbol}${formattedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}; 