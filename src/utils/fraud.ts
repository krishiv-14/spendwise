import { Expense, ExpenseCategory } from '../types';

// Interface for fraud detection results
export interface FraudDetectionResult {
  isFraud: boolean;
  reasons: string[];
}

// Interface for OCR extraction results
export interface OcrExtractionResult {
  text: string;
  vendor?: string;
  amount?: number;
  date?: string;
  fraudDetection: FraudDetectionResult;
}

/**
 * Simplified fraud detection for expense receipts
 * In a real app, this would use more sophisticated ML/AI techniques
 */
export const detectFraudInReceipt = (
  receiptText: string,
  amount: number | null,
  category: ExpenseCategory
): FraudDetectionResult => {
  const result: FraudDetectionResult = {
    isFraud: false,
    reasons: []
  };

  // Skip intensive checks for demo
  if (!receiptText || receiptText.length < 20) {
    result.isFraud = true;
    result.reasons.push('Receipt text is too short or missing');
    return result;
  }

  // Check for high amounts
  if (amount) {
    const typicalMaxAmounts: Record<ExpenseCategory, number> = {
      'Office Supplies': 5000,
      'Food & Entertainment': 2000,
      'Travelling': 10000,
      'Accommodation': 8000,
      'Client & Project Expenses': 20000,
      'Subscriptions': 5000
    };

    if (amount > typicalMaxAmounts[category] * 1.5) {
      result.isFraud = true;
      result.reasons.push(`Amount is unusually high for ${category} category`);
    }
  }

  // For demo, add some randomness to simulate fraud detection
  if (Math.random() < 0.05) {
    result.isFraud = true;
    result.reasons.push('Suspicious pattern detected in receipt text');
  }

  return result;
}; 