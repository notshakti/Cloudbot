/**
 * Maps a user's purpose description to a bot type and default intents.
 * Used to auto-train bots from "what should this chatbot do?" input.
 */

import type { BotType } from '../types';

export interface TemplateIntent {
  name: string;
  displayName: string;
  trainingPhrases: string[];
  response: string;
}

export interface BotTemplate {
  type: BotType;
  welcomeMessage: string;
  description: string;
  intents: TemplateIntent[];
}

const templates: Record<BotType, BotTemplate> = {
  customer_service: {
    type: 'customer_service',
    welcomeMessage: 'Hello! I\'m here to help with any customer queries. How can I assist you today?',
    description: 'Handles customer support, orders, and general inquiries.',
    intents: [
      { name: 'track_order', displayName: 'Track Order', trainingPhrases: ['Where is my order?', 'Track my order', 'Order status', 'When will I get my order?'], response: 'I can help you track your order. Please share your order number or registered email.' },
      { name: 'complaint', displayName: 'Complaint', trainingPhrases: ['I want to complain', 'Issue with my order', 'Not satisfied', 'Bad experience'], response: 'I\'m sorry to hear that. Please describe the issue and we\'ll resolve it as soon as possible.' },
      { name: 'product_info', displayName: 'Product Information', trainingPhrases: ['Tell me about a product', 'Product details', 'What do you sell?', 'Do you have...'], response: 'I can help with product information. Which product or category are you interested in?' },
      { name: 'return_refund', displayName: 'Return & Refund', trainingPhrases: ['Return policy', 'I want a refund', 'How to return?', 'Cancel order'], response: 'Our return window is typically 30 days. Share your order details and I\'ll guide you through the process.' },
      { name: 'general_inquiry', displayName: 'General Inquiry', trainingPhrases: ['Hello', 'Hi', 'Help', 'I have a question'], response: 'Hi! How can I help you today? You can ask about orders, products, returns, or anything else.' },
    ],
  },
  education: {
    type: 'education',
    welcomeMessage: 'Welcome! I\'m your admission and course assistant. What would you like to know?',
    description: 'Admissions, courses, enrollment, and student queries.',
    intents: [
      { name: 'admission_inquiry', displayName: 'Admission Inquiry', trainingPhrases: ['How do I apply?', 'Admission process', 'Eligibility for admission', 'When are admissions open?'], response: 'You can apply online through our portal. I can guide you on eligibility, deadlines, and required documents.' },
      { name: 'course_info', displayName: 'Course Information', trainingPhrases: ['What courses do you offer?', 'What are the courses available?', 'Courses available', 'Course details', 'Programs available', 'Fee structure', 'List of courses'], response: 'We offer a range of programs. Which stream or level are you interested in (e.g. undergraduate, postgraduate)?' },
      { name: 'enrollment', displayName: 'Enrollment', trainingPhrases: ['How to enroll?', 'Registration', 'Enroll in a course', 'Sign up'], response: 'Enrollment can be done online after admission. Do you already have an offer letter or application ID?' },
      { name: 'fees_scholarship', displayName: 'Fees & Scholarship', trainingPhrases: ['What is the fee?', 'Scholarship available?', 'Financial aid', 'Payment options'], response: 'Fee structure and scholarship details vary by program. Share the course name and I\'ll provide the relevant information.' },
      { name: 'general_help', displayName: 'General Help', trainingPhrases: ['Hello', 'Hi', 'Help', 'I need information'], response: 'Hello! I can help with admissions, courses, enrollment, and fees. What do you need?' },
    ],
  },
  ecommerce: {
    type: 'ecommerce',
    welcomeMessage: 'Hi! I\'m your shopping assistant. Ask me about products, orders, or promotions.',
    description: 'Product search, orders, cart, and store info.',
    intents: [
      { name: 'product_search', displayName: 'Product Search', trainingPhrases: ['Find a product', 'Do you have...', 'Search for', 'Looking for'], response: 'What product or category are you looking for? I can help you find it.' },
      { name: 'order_status', displayName: 'Order Status', trainingPhrases: ['Where is my order?', 'Order tracking', 'Delivery status'], response: 'Share your order ID or registered phone number and I\'ll fetch the status for you.' },
      { name: 'discount_codes', displayName: 'Discounts & Codes', trainingPhrases: ['Any discount?', 'Coupon code', 'Offer', 'Promotion'], response: 'We run regular promotions. Share your cart or product and I\'ll check for applicable offers.' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'Help'], response: 'Hi! I can help with products, orders, and offers. What do you need?' },
    ],
  },
  medical: {
    type: 'medical',
    welcomeMessage: 'Hello. I\'m here to help with appointment booking and general health queries. How can I assist?',
    description: 'Appointments, basic health info, and clinic queries.',
    intents: [
      { name: 'book_appointment', displayName: 'Book Appointment', trainingPhrases: ['Book an appointment', 'Schedule a visit', 'I need to see a doctor'], response: 'I can help you book an appointment. Which department or doctor do you need?' },
      { name: 'prescription_refill', displayName: 'Prescription Refill', trainingPhrases: ['Refill prescription', 'Need my medicine', 'Repeat prescription'], response: 'For prescription refills, please share your patient ID or registered mobile number.' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'Help', 'Timings'], response: 'How can I help you today? I can assist with appointments, refills, and basic information.' },
    ],
  },
  hr: {
    type: 'hr',
    welcomeMessage: 'Hi! I\'m your HR assistant. Ask me about leave, policies, or payroll.',
    description: 'Leave, payroll, policies, and HR queries.',
    intents: [
      { name: 'leave_request', displayName: 'Leave Request', trainingPhrases: ['Apply for leave', 'Leave balance', 'Leave policy'], response: 'I can help with leave requests. You can apply through the portal or share your employee ID for balance.' },
      { name: 'payroll', displayName: 'Payroll', trainingPhrases: ['Salary slip', 'Payroll query', 'When is salary?'], response: 'Payroll is processed monthly. For slip or deduction details, log in to the self-service portal.' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'HR help'], response: 'Hello! I can help with leave, payroll, and policies. What do you need?' },
    ],
  },
  real_estate: {
    type: 'real_estate',
    welcomeMessage: 'Hello! I can help you find properties, schedule viewings, and answer questions.',
    description: 'Property search, viewings, and inquiries.',
    intents: [
      { name: 'property_search', displayName: 'Property Search', trainingPhrases: ['Looking for a property', 'Houses for sale', 'Apartments in...'], response: 'What type of property and location are you looking for? I\'ll share matching listings.' },
      { name: 'schedule_viewing', displayName: 'Schedule Viewing', trainingPhrases: ['Schedule a viewing', 'I want to visit', 'Book a site visit'], response: 'Share the property ID or listing link and your preferred date; I\'ll confirm the viewing.' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'Help'], response: 'Hi! I can help with property search and viewings. What do you need?' },
    ],
  },
  financial: {
    type: 'financial',
    welcomeMessage: 'Welcome. I can assist with account queries, products, and general banking.',
    description: 'Banking and financial product inquiries.',
    intents: [
      { name: 'account_balance', displayName: 'Account Balance', trainingPhrases: ['Check balance', 'Account balance', 'My balance'], response: 'For balance and account details, please use net banking or the app, or call our helpline for security.' },
      { name: 'product_inquiry', displayName: 'Product Inquiry', trainingPhrases: ['Loans', 'Interest rates', 'Credit card', 'Fixed deposit'], response: 'I can explain our products and rates. Which product are you interested in?' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'Help'], response: 'How can I help you today? I can assist with products and general queries.' },
    ],
  },
  restaurant: {
    type: 'restaurant',
    welcomeMessage: 'Hi! I can help you with reservations, menu, and orders.',
    description: 'Reservations, menu, and order queries.',
    intents: [
      { name: 'reservation', displayName: 'Reservation', trainingPhrases: ['Book a table', 'Reservation', 'I want to reserve'], response: 'I can help you reserve a table. How many people and for when?' },
      { name: 'menu', displayName: 'Menu', trainingPhrases: ['Menu', 'What do you serve?', 'Vegetarian options'], response: 'Our menu includes a variety of cuisines. Would you like to see starters, mains, or drinks?' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'Help'], response: 'Hi! I can help with reservations and menu. What do you need?' },
    ],
  },
  it_helpdesk: {
    type: 'it_helpdesk',
    welcomeMessage: 'Hello! I\'m the IT helpdesk bot. Describe your issue and I\'ll try to help.',
    description: 'IT support, tickets, and troubleshooting.',
    intents: [
      { name: 'password_reset', displayName: 'Password Reset', trainingPhrases: ['Reset password', 'Forgot password', 'Cannot login'], response: 'Use the "Forgot password" link on the login page, or raise a ticket for admin reset.' },
      { name: 'ticket_status', displayName: 'Ticket Status', trainingPhrases: ['Ticket status', 'Where is my ticket?', 'Support ticket'], response: 'Share your ticket number and I\'ll look up the status.' },
      { name: 'general', displayName: 'General', trainingPhrases: ['Hello', 'Hi', 'I have an issue', 'Help'], response: 'Describe your issue briefly and I\'ll guide you or create a ticket if needed.' },
    ],
  },
  custom: {
    type: 'custom',
    welcomeMessage: 'Hello! How can I help you today?',
    description: 'General-purpose chatbot. Add intents and knowledge to customize.',
    intents: [
      { name: 'greeting', displayName: 'Greeting', trainingPhrases: ['Hello', 'Hi', 'Hey', 'Good morning'], response: 'Hello! How can I help you today?' },
      { name: 'help', displayName: 'Help', trainingPhrases: ['Help', 'What can you do?', 'I need assistance'], response: 'I\'m here to help. Tell me what you need and I\'ll do my best to assist.' },
    ],
  },
};

const KEYWORDS: { keywords: string[]; type: BotType }[] = [
  { keywords: ['admission', 'admissions', 'college', 'university', 'student', 'course', 'enrollment', 'education', 'school'], type: 'education' },
  { keywords: ['customer', 'support', 'query', 'complaint', 'order', 'return', 'refund', 'track order'], type: 'customer_service' },
  { keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'product', 'cart', 'buy', 'purchase'], type: 'ecommerce' },
  { keywords: ['medical', 'health', 'doctor', 'appointment', 'clinic', 'hospital', 'prescription'], type: 'medical' },
  { keywords: ['hr', 'human resource', 'leave', 'payroll', 'employee', 'policy'], type: 'hr' },
  { keywords: ['real estate', 'property', 'house', 'apartment', 'viewing', 'rent', 'buy property'], type: 'real_estate' },
  { keywords: ['financial', 'bank', 'loan', 'account', 'interest'], type: 'financial' },
  { keywords: ['restaurant', 'reservation', 'table', 'menu', 'food', 'dining'], type: 'restaurant' },
  { keywords: ['it', 'helpdesk', 'help desk', 'technical', 'password', 'ticket', 'login issue'], type: 'it_helpdesk' },
];

/**
 * Infer bot type and return template from free-text purpose.
 */
export function getTemplateForPurpose(purpose: string): BotTemplate {
  const lower = purpose.toLowerCase().trim();
  if (!lower) return templates.custom;

  for (const { keywords, type } of KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return templates[type];
  }
  return templates.custom;
}

const TEMPLATE_LABELS: Record<BotType, string> = {
  customer_service: 'Customer Support',
  education: 'Admission & Education',
  ecommerce: 'E-commerce',
  medical: 'Medical & Healthcare',
  hr: 'HR & Employee',
  real_estate: 'Real Estate',
  financial: 'Financial & Banking',
  restaurant: 'Restaurant & Booking',
  it_helpdesk: 'IT Helpdesk',
  custom: 'Custom / General',
};

/**
 * List all template types for marketplace/selection.
 */
export function listTemplates(): { id: BotType; name: string; description: string }[] {
  return (Object.keys(templates) as BotType[]).map((id) => ({
    id,
    name: TEMPLATE_LABELS[id],
    description: templates[id].description,
  }));
}

/**
 * Get template by bot type (for from-template creation).
 */
export function getTemplateByType(type: BotType): BotTemplate {
  return templates[type] || templates.custom;
}

/**
 * Suggest a short bot name from purpose (e.g. "Customer support bot").
 */
export function suggestBotName(purpose: string): string {
  const t = getTemplateForPurpose(purpose);
  const names: Record<BotType, string> = {
    customer_service: 'Customer Support Bot',
    education: 'Admission & Course Bot',
    ecommerce: 'Shopping Assistant',
    medical: 'Health & Appointment Bot',
    hr: 'HR Assistant',
    real_estate: 'Property Assistant',
    financial: 'Banking Assistant',
    restaurant: 'Restaurant Bot',
    it_helpdesk: 'IT Helpdesk Bot',
    custom: 'My Chatbot',
  };
  return names[t.type];
}
