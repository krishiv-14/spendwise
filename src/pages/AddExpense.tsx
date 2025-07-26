import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { ExpenseCategory, Currency } from '../types';
import { getCurrencySymbol, formatCurrency } from '../utils/currency';
import { performOCR, extractInfoFromOcrText } from '../utils/ocr';
import { detectFraudInReceipt, FraudDetectionResult } from '../utils/fraud';

// Speech Recognition Event Types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Interface for Speech Recognition
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addExpense, validateExpenseAgainstPolicy, expenses } = useExpenses();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>(currentUser?.preferredCurrency || 'USD');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Office Supplies');
  const [description, setDescription] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Process states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [fraudDetection, setFraudDetection] = useState<FraudDetectionResult | null>(null);
  
  // Voice command states
  const [isListening, setIsListening] = useState(false);
  const [voiceCommandFeedback, setVoiceCommandFeedback] = useState<string>('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  
  // Check if user is an employee
  useEffect(() => {
    if (currentUser?.role !== 'employee') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition: ISpeechRecognitionConstructor | undefined = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const command = event.results[0][0].transcript.toLowerCase();
        setVoiceCommandFeedback(`Command recognized: "${command}"`);
        
        // Process commands for adding expenses
        if (command.includes('set amount') || command.includes('amount')) {
          // Extract amount using regex
          const amountMatch = command.match(/\d+(\.\d+)?/);
          if (amountMatch && amountMatch[0]) {
            const newAmount = parseFloat(amountMatch[0]);
            setAmount(newAmount);
            setVoiceCommandFeedback(`Amount set to ${formatCurrency(newAmount, currency)}`);
          }
        } else if (command.includes('category')) {
          // Try to match category
          const categories: ExpenseCategory[] = [
            'Office Supplies', 'Food & Entertainment', 'Travelling', 
            'Accommodation', 'Client & Project Expenses', 'Subscriptions'
          ];
          
          for (const cat of categories) {
            if (command.includes(cat.toLowerCase())) {
              setCategory(cat);
              setVoiceCommandFeedback(`Category set to ${cat}`);
              break;
            }
          }
        } else if (command.includes('description') || command.includes('note')) {
          // Extract description after "description" or "note"
          const descMatch = command.match(/(description|note)\s+(.+)/i);
          if (descMatch && descMatch[2]) {
            setDescription(descMatch[2]);
            setVoiceCommandFeedback(`Description set to "${descMatch[2]}"`);
          }
        } else if (command.includes('submit') || command.includes('save')) {
          setVoiceCommandFeedback(`Ready to submit expense...`);
          // Simulate form submission after a brief delay
          setTimeout(() => {
            document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }, 1000);
        } else {
          setVoiceCommandFeedback(`Command not recognized: "${command}"`);
        }
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setVoiceCommandFeedback(`Error: ${event.error}`);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('SpeechRecognition is not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currency]);
  
  // Start/stop voice recognition
  const toggleVoiceCommand = () => {
    if (isListening) {
      recognitionRef.current?.abort();
      setIsListening(false);
      setVoiceCommandFeedback('');
    } else {
      setVoiceCommandFeedback('Listening for commands...');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };
  
  // Set initial currency from user preferences when component mounts
  useEffect(() => {
    if (currentUser?.preferredCurrency) {
      setCurrency(currentUser.preferredCurrency);
    }
  }, [currentUser]);
  
  // Handle form validation
  const validateForm = () => {
    // Reset errors
    const newErrors: {
      amount?: string;
      currency?: string;
      date?: string;
      category?: string;
      description?: string;
      general?: string;
      policyWarning?: string; // Added to separate warnings from errors
    } = {};
    
    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!date) {
      newErrors.date = 'Please select a date';
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future';
      }
    }
    
    if (!description || description.trim().length < 5) {
      newErrors.description = 'Please enter a description (minimum 5 characters)';
    }
    
    // Check against expense policy - now only creates a warning
    const validation = validateExpenseAgainstPolicy(amount, category);
    if (!validation.valid) {
      newErrors.policyWarning = validation.message;
    }
    
    return newErrors;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors and success message
    setErrors({});
    setSuccessMessage('');
    
    // Validate form
    const newErrors = validateForm();
    
    // Check for blocking errors - policyWarning is not a blocking error
    const blockingErrors = { ...newErrors };
    delete blockingErrors.policyWarning;
    
    // If there are blocking errors, don't submit
    if (Object.keys(blockingErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Set errors including warnings
    setErrors(newErrors);
    
    // Set submitting state to show spinner
    setIsSubmitting(true);
    
    try {
      // Create expense object
      const expense = {
        userId: currentUser!.id,
        amount,
        currency,
        date,
        category,
        description,
        receiptImage: receiptImage || undefined,
        notes: fraudDetection?.isFraud 
          ? 'Potential fraud detected: ' + fraudDetection.reasons.join(', ') 
          : newErrors.policyWarning 
            ? 'Policy limit warning: ' + newErrors.policyWarning
            : undefined,
        status: fraudDetection?.isFraud ? 'flagged' as const : 'pending' as const
      };
      
      // Add expense to database with retry mechanism
      let response: { id: string, status: string, message: string } | undefined;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount <= maxRetries) {
        try {
          response = await addExpense(expense);
          console.log('Expense added successfully, ID:', response.id, 'Status:', response.status);
          break; // Exit the retry loop if successful
        } catch (retryError) {
          console.error(`Attempt ${retryCount + 1} failed:`, retryError);
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw retryError; // Re-throw the error if we've exceeded retries
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (response) {
        // Display appropriate message based on status
        let statusMessage = 'Expense submitted successfully!';
        
        if (response.status === 'approved') {
          statusMessage = 'Expense approved automatically!';
        } else if (response.status === 'flagged') {
          statusMessage = 'Expense flagged for potential fraud and sent for review.';
        } else if (newErrors.policyWarning) {
          statusMessage = 'Expense submitted successfully, but exceeds policy limits. Manager approval required.';
        } else {
          statusMessage = 'Expense submitted successfully! Waiting for manager approval.';
        }
        
        // Show the message from the server if available
        if (response.message) {
          setSuccessMessage(`${statusMessage} ${response.message}`);
        } else {
          setSuccessMessage(statusMessage);
        }
        
        // Clear form fields
        setAmount(0);
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setReceiptImage(undefined);
        setExtractedText('');
        setFraudDetection(null);
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      
      // Provide more specific error message
      let errorMessage = 'An error occurred while submitting the expense. Please try again.';
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Database connection')) {
          errorMessage = 'Database connection issue. Please reload the page and try again.';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Storage issue. Your browser storage might be full or restricted.';
        } else if (error.message.includes('policy')) {
          errorMessage = 'Expense amount exceeds policy limits. Please adjust the amount or category.';
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Validation
  const [errors, setErrors] = useState<{
    amount?: string;
    currency?: string;
    date?: string;
    category?: string;
    description?: string;
    general?: string;
    policyWarning?: string;
  }>({});
  
  // Handle file upload for OCR
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    
    try {
      setIsProcessingImage(true);
      setFraudDetection(null);
      
      // Create a preview of the image
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setReceiptImage(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      
      // Extract text using OCR
      const text = await performOCR(file);
      setExtractedText(text);
      
      // Extract information and perform initial fraud checks
      const extractionResult = extractInfoFromOcrText(text);
      
      // Perform additional fraud detection against previous expenses
      const fraudResult = detectFraudInReceipt(
        text,
        extractionResult.amount,
        category
      );
      
      // Combine fraud detection results
      const combinedFraudResult: FraudDetectionResult = {
        isFraud: extractionResult.fraudDetection.isFraud || fraudResult.isFraud,
        reasons: [
          ...extractionResult.fraudDetection.reasons,
          ...fraudResult.reasons
        ]
      };
      
      setFraudDetection(combinedFraudResult);
      
      // Update form fields if data was extracted
      if (extractionResult.amount && !amount) {
        setAmount(extractionResult.amount);
      }
      
      if (extractionResult.date) {
        // Try to convert to YYYY-MM-DD format
        try {
          const parsedDate = new Date(extractionResult.date);
          if (!isNaN(parsedDate.getTime())) {
            setDate(parsedDate.toISOString().split('T')[0]);
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
      
      if (extractionResult.vendor) {
        setDescription(
          description ? `${description} - ${extractionResult.vendor}` : extractionResult.vendor
        );
      }
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      setErrors({ general: 'Failed to process the receipt. Please try manual entry.' });
    } finally {
      setIsProcessingImage(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Add New Expense</h1>
        
        {/* Error display */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className={`p-4 mb-4 rounded-md ${
            successMessage.includes("flagged") 
              ? "bg-yellow-100 text-yellow-800" 
              : successMessage.includes("approval") 
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {successMessage.includes("flagged") ? (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : successMessage.includes("approval") ? (
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Voice Command Feedback */}
          {voiceCommandFeedback && (
            <div className={`mb-4 p-3 rounded-md ${
              voiceCommandFeedback.includes('Error') 
                ? 'bg-red-100 text-red-800' 
                : voiceCommandFeedback.includes('not recognized')
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
            }`}>
              <p className="text-sm">{voiceCommandFeedback}</p>
            </div>
          )}
          
          {/* Voice Command Help */}
          {isListening && (
            <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
              <p className="font-medium mb-1">Voice Command Examples:</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>&ldquo;Amount 500&rdquo; - Set expense amount</li>
                <li>&ldquo;Category Travelling&rdquo; - Set expense category</li>
                <li>&ldquo;Description lunch with client&rdquo; - Add description</li>
                <li>&ldquo;Submit&rdquo; - Submit the expense</li>
              </ul>
            </div>
          )}
          
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-indigo-50 text-primary rounded-md hover:bg-indigo-100 transition-colors"
              disabled={isProcessingImage}
            >
              {isProcessingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Image...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Scan Receipt
                </>
              )}
            </button>
            
            {/* Voice Command Button */}
            <button
              type="button"
              onClick={toggleVoiceCommand}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-indigo-50 text-primary hover:bg-indigo-100'
              }`}
            >
              {isListening ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Listening...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Voice Command
                </>
              )}
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>
          
          {receiptImage && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Receipt Image:</p>
              <div className="relative">
                <img
                  src={receiptImage}
                  alt="Receipt"
                  className="max-h-48 rounded-md border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptImage(undefined);
                    setFraudDetection(null);
                    setExtractedText('');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Fraud Detection Results */}
                {fraudDetection && (
                  <div className={`mt-2 p-3 rounded-md ${fraudDetection.isFraud ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center">
                      {fraudDetection.isFraud ? (
                        <>
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium text-red-700">Possible Fraud Detected</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-medium text-green-700">Receipt Verified</span>
                        </>
                      )}
                    </div>
                    
                    {fraudDetection.isFraud && fraudDetection.reasons.length > 0 && (
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {fraudDetection.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                {/* Extracted Text Preview */}
                {extractedText && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-500">Extracted Text:</span>
                      <button 
                        type="button"
                        onClick={() => navigator.clipboard.writeText(extractedText)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {extractedText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Form Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4">
              {errors.general && (
                <div className="p-4 mb-2 bg-red-100 text-red-900 rounded-md" role="alert">
                  {errors.general}
                </div>
              )}
              
              {errors.policyWarning && (
                <div className="p-4 mb-2 bg-yellow-100 text-yellow-800 rounded-md" role="alert">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Warning:</strong> {errors.policyWarning} (You can still submit, but it will require approval)</span>
                  </div>
                </div>
              )}
              
              {/* Display other form errors */}
              {Object.entries(errors)
                .filter(([key]) => key !== 'general' && key !== 'policyWarning')
                .map(([key, value]) => (
                  <div key={key} className="p-2 mb-1 bg-red-100 text-red-900 rounded-md" role="alert">
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                  </div>
                ))
              }
            </div>
          )}
          
          {/* Expense Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="mb-4">
              <label htmlFor="amount" className="form-label">
                Amount
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">{getCurrencySymbol(currency)}</span>
                </div>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className={`form-input pl-8 ${errors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="currency" className="form-label">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={`form-input ${errors.currency ? 'border-red-500' : ''}`}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600">{errors.currency}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="date" className="form-label">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`form-input ${errors.date ? 'border-red-500' : ''}`}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="category" className="form-label">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className={`form-input ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="Office Supplies">Office Supplies</option>
                <option value="Food & Entertainment">Food & Entertainment</option>
                <option value="Travelling">Travelling</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Client & Project Expenses">Client & Project Expenses</option>
                <option value="Subscriptions">Subscriptions</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>
            
            <div className="mb-4 md:col-span-2">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`form-input h-20 ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Enter a detailed description of the expense"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </div>
                ) : (
                  'Submit Expense'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense; 