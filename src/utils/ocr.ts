// Do not import from fraud.ts to avoid circular dependency
// import { FraudDetectionResult, OcrExtractionResult } from './fraud';

/**
 * Simulated OCR functionality
 * In a real app, this would connect to a proper OCR service
 */

// Redefine the fraud detection result interface locally
export interface FraudDetectionResult {
  isFraud: boolean;
  reasons: string[];
}

// OCR utilities for processing receipt images

// Define interfaces
export interface OCRExtractionResult {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  fraudDetection: {
    isFraud: boolean;
    reasons: string[];
  };
  rawText: string;
}

// Sample receipt templates for more realistic demo
const receiptTemplates = [
  // Restaurant receipt
  `INVOICE #INV-{random}
  
  {restaurant}
  {address}
  Phone: +91-{phone}
  GST No: {gst}
  
  Date: {date}
  Time: {time}
  Server: {server}
  
  {item1} {item1price}
  {item2} {item2price}
  {item3} {item3price}
  
  Subtotal: INR {subtotal}
  Tax (18%): INR {tax}
  
  Total: INR {total}
  
  Payment Method: {payment}
  Card ending in: ****{card}
  
  Thank you for your business!`,
  
  // Office supplies receipt
  `TAX INVOICE
  
  {officestore}
  {address}
  GSTIN: {gst}
  
  Bill No: BL-{random}
  Date: {date}
  
  Customer: {customer}
  
  {item1} - {qty1} Nos. {item1price}
  {item2} - {qty2} Nos. {item2price}
  
  Subtotal: INR {subtotal}
  GST (18%): INR {tax}
  
  TOTAL AMOUNT: INR {total}
  
  Mode of Payment: {payment}
  
  ** This is a computer generated invoice **`,
  
  // Travel receipt
  `TRAVEL RECEIPT
  
  {travelagent}
  {address}
  
  Booking Ref: BK{random}
  Date: {date}
  
  Passenger: {customer}
  
  {traveltype}: {origin} to {destination}
  Date of Travel: {traveldate}
  
  Base Fare: INR {basefare}
  Taxes & Fees: INR {tax}
  
  Total Amount: INR {total}
  
  Payment: {payment}
  
  Thank you for booking with us!`
];

// Data for random generation
const restaurants = ['Taj Restaurant', 'Spice Garden', 'Delhi Darbar', 'Royal Cuisine', 'Mumbai Masala'];
const officeStores = ['Global Stationery', 'Office Solutions', 'Corporate Supplies', 'Business Essentials', 'Work Space'];
const travelAgents = ['Indian Travel Bureau', 'Fly High Travels', 'Journey Makers', 'Travel India', 'Sky Tours'];
const addresses = [
  'Shop 23, Main Market, Delhi-110001',
  '42/B, MG Road, Mumbai-400001',
  'Plot 7, Sector 5, Noida-201301',
  '123, Anna Salai, Chennai-600002',
  '56, Brigade Road, Bangalore-560001'
];
const people = ['Rahul', 'Priya', 'Amit', 'Neha', 'Rajesh', 'Sunita', 'Vikram', 'Ananya'];
const foodItems = [
  'Butter Chicken', 'Paneer Tikka', 'Dal Makhani', 'Biryani', 'Naan Bread', 
  'Masala Dosa', 'Veg Thali', 'Aloo Gobi', 'Samosa', 'Chicken Curry'
];
const officeItems = [
  'A4 Paper Ream', 'Ballpoint Pens', 'Stapler', 'Document Folders', 'Notebooks',
  'Whiteboard Markers', 'Desk Organizer', 'Calculator', 'Sticky Notes', 'Highlighters'
];
const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur'];
const paymentMethods = ['Credit Card', 'Debit Card', 'UPI', 'Cash', 'Net Banking'];

/**
 * Simulates OCR processing on an image file
 * Returns fake extracted text for demo purposes
 */
export const performOCR = async (imageFile: File): Promise<string> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Choose a random receipt template
  const template = receiptTemplates[Math.floor(Math.random() * receiptTemplates.length)];
  
  // Generate today's date in DD/MM/YYYY format
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
  // Generate time in HH:MM format
  const hours = today.getHours().toString().padStart(2, '0');
  const minutes = today.getMinutes().toString().padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;
  
  // Generate random travel date within next 30 days
  const travelDate = new Date(today);
  travelDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
  const formattedTravelDate = `${travelDate.getDate().toString().padStart(2, '0')}/${(travelDate.getMonth() + 1).toString().padStart(2, '0')}/${travelDate.getFullYear()}`;
  
  // Create a deterministic seed based on image file properties
  let seed = imageFile.size % 100;
  // Add timestamp to seed for additional entropy
  seed += Math.floor((imageFile.lastModified % 1000) / 10);
  // Use filename length if available 
  if (imageFile.name) {
    seed += imageFile.name.length;
  }
  
  // Generate random values with the seed influencing the outcome
  const random = Math.floor((Math.random() + seed/100) * 10000).toString().padStart(4, '0');
  const restaurantIndex = (Math.floor(Math.random() * 100) + seed) % restaurants.length;
  const restaurant = restaurants[restaurantIndex];
  const officestore = officeStores[(Math.floor(Math.random() * 100) + seed) % officeStores.length];
  const travelagent = travelAgents[(Math.floor(Math.random() * 100) + seed) % travelAgents.length];
  const address = addresses[(Math.floor(Math.random() * 100) + seed) % addresses.length];
  const phone = Math.floor((Math.random() + seed/100) * 9000000000) + 1000000000;
  const gst = `${Math.random().toString(36).substring(2, 7).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const server = people[(Math.floor(Math.random() * 100) + seed) % people.length];
  const customer = people[(Math.floor(Math.random() * 100) + seed) % people.length];
  
  // Food items and prices
  const foodItem1 = foodItems[(Math.floor(Math.random() * 100) + seed) % foodItems.length];
  const foodItem2 = foodItems[(Math.floor(Math.random() * 100) + seed) % foodItems.length];
  const foodItem3 = foodItems[(Math.floor(Math.random() * 100) + seed) % foodItems.length];
  const item1price = Math.floor((Math.random() + seed/100) * 400) + 100;
  const item2price = Math.floor((Math.random() + seed/100) * 300) + 150;
  const item3price = Math.floor((Math.random() + seed/100) * 250) + 200;
  
  // Office items
  const officeItem1 = officeItems[(Math.floor(Math.random() * 100) + seed) % officeItems.length];
  const officeItem2 = officeItems[(Math.floor(Math.random() * 100) + seed) % officeItems.length];
  const qty1 = Math.floor((Math.random() + seed/100) * 5) + 1;
  const qty2 = Math.floor((Math.random() + seed/100) * 3) + 1;
  
  // Travel info
  const travelTypes = ['Flight', 'Train', 'Bus'];
  const traveltype = travelTypes[(Math.floor(Math.random() * 100) + seed) % travelTypes.length];
  const origin = cities[(Math.floor(Math.random() * 100) + seed) % cities.length];
  let destination = cities[(Math.floor(Math.random() * 100) + seed + 1) % cities.length];
  // Make sure destination is different from origin
  while (destination === origin) {
    destination = cities[(Math.floor(Math.random() * 100) + seed + 2) % cities.length];
  }
  
  // Financial values
  const basefare = Math.floor((Math.random() + seed/100) * 8000) + 2000;
  const subtotal = item1price + item2price + (template.includes('item3') ? item3price : 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  const payment = paymentMethods[(Math.floor(Math.random() * 100) + seed) % paymentMethods.length];
  const card = Math.floor((Math.random() + seed/100) * 9000) + 1000;
  
  // Fill the template with random values
  const filledTemplate = template
    .replace('{random}', random)
    .replace('{restaurant}', restaurant)
    .replace('{officestore}', officestore)
    .replace('{travelagent}', travelagent)
    .replace('{address}', address)
    .replace('{phone}', phone.toString())
    .replace('{gst}', gst)
    .replace('{date}', formattedDate)
    .replace('{time}', formattedTime)
    .replace('{server}', server)
    .replace('{customer}', customer)
    .replace('{item1}', template.includes('Travel') ? '' : (template.includes('Office') ? officeItem1 : foodItem1))
    .replace('{item2}', template.includes('Travel') ? '' : (template.includes('Office') ? officeItem2 : foodItem2))
    .replace('{item3}', template.includes('Travel') ? '' : foodItem3)
    .replace('{item1price}', item1price.toString())
    .replace('{item2price}', item2price.toString())
    .replace('{item3price}', item3price.toString())
    .replace('{qty1}', qty1.toString())
    .replace('{qty2}', qty2.toString())
    .replace('{subtotal}', subtotal.toString())
    .replace('{tax}', tax.toString())
    .replace('{total}', total.toString())
    .replace('{payment}', payment)
    .replace('{card}', card.toString())
    .replace('{traveltype}', traveltype)
    .replace('{origin}', origin)
    .replace('{destination}', destination)
    .replace('{traveldate}', formattedTravelDate)
    .replace('{basefare}', basefare.toString());
  
  return filledTemplate;
};

/**
 * Extract structured information from OCR text
 */
export const extractInfoFromOcrText = (text: string): OCRExtractionResult => {
  // Define robust regex patterns to extract information
  
  // Extract amount - try different formats (INR X,XXX.XX, Total: X,XXX)
  const amountPatterns = [
    /total:?\s*(?:INR|Rs\.?)?\s*([\d,]+\.?\d*)/i,
    /total amount:?\s*(?:INR|Rs\.?)?\s*([\d,]+\.?\d*)/i,
    /amount:?\s*(?:INR|Rs\.?)?\s*([\d,]+\.?\d*)/i,
    /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i
  ];
  
  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Remove commas and convert to number
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Extract date - support various formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
  const datePatterns = [
    /date:?\s*(\d{1,2}[/-\\.]\d{1,2}[/-\\.]\d{2,4})/i,
    /(\d{1,2}[/-\\.]\d{1,2}[/-\\.]\d{2,4})/
  ];
  
  let date: string | null = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      date = match[1].trim();
      break;
    }
  }
  
  // Extract vendor - first non-empty line or specific patterns
  const vendorPatterns = [
    /invoice.*?\n\s*(.*)/i,
    /receipt.*?\n\s*(.*)/i,
    /^([^\n\r]+)/,
    /([A-Z][A-Za-z\s]{2,})/
  ];
  
  let vendor: string | null = null;
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      vendor = match[1].trim();
      // Skip if the vendor looks like a document title
      if (!/invoice|receipt|bill/i.test(vendor)) {
        break;
      }
    }
  }
  
  // Basic fraud detection
  const fraudDetection = {
    isFraud: false,
    reasons: [] as string[]
  };
  
  // Check for potential issues
  if (!amount) {
    fraudDetection.reasons.push('Could not extract amount from receipt');
  }
  
  if (!date) {
    fraudDetection.reasons.push('Could not extract date from receipt');
  }
  
  if (!vendor) {
    fraudDetection.reasons.push('Could not extract vendor information from receipt');
  }
  
  // Check for unusually high amount (if detected)
  if (amount && amount > 50000) {
    fraudDetection.reasons.push('Unusually high amount detected');
  }
  
  // Set fraud flag if any issues found
  if (fraudDetection.reasons.length > 0) {
    fraudDetection.isFraud = true;
  }
  
  return {
    amount,
    date,
    vendor,
    fraudDetection,
    rawText: text
  };
}; 