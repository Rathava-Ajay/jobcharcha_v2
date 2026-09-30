export interface Job {
  id: string;
  slug?: string;
  title: string;
  companyOrDept: string;
  category: string; // UPSC, SSC, Banking, Railways, Defense, State PSC, GPSC, Police, Talati
  location: string;
  district: string;
  state?: string;
  vacancyCount: number;
  salary: string;
  qualification: string;
  type: 'public' | 'private';
  lastDate: string;
  postedDate: string;
  isBoosted?: boolean;
  isFeatured?: boolean;
  isUrgent?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
  status?: 'Active' | 'Expired' | 'Draft';
  officialNotificationUrl?: string;
  applyUrl?: string;
  syllabusLink?: string;
  organizationLogo?: string;
  overview?: string;
  eligibility?: string;
  documentsRequired?: string;
  importantDates?: { label: string; date: string }[];
  howToApply?: string;
  selectionProcess?: string;
  tags: string[];
  viewsCount?: number;
  applyClicksCount?: number;
  keyHighlights?: string;
  importantNotes?: string;
  minAge?: number;
  maxAge?: number;
  minSalary?: number;
  maxSalary?: number;
  salaryType?: string;
  experienceRequired?: number;
  advertisementNumber?: string;
  officialWebsite?: string;
  telegramLink?: string;
  whatsAppLink?: string;
  applicationFee?: number;
  applicationFeeDetails?: string;
  vacancyBreakdownJson?: string;
  categoryWiseVacancyJson?: string;
  selectionProcessJson?: string;
  applicationFeeJson?: string;
  faqSchemaJson?: string;
  examPatternJson?: string;
  salaryBreakdownJson?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface AdmitCard {
  id: string;
  examName: string;
  organization: string;
  releaseDate: string;
  examDate: string;
  downloadUrl: string;
  status: 'Released' | 'Upcoming' | 'Postponed';
  category: string;
  downloadsCount?: number;
}

export interface ExamResult {
  id: string;
  examName: string;
  organization: string;
  publishDate: string;
  cutoffGen: number;
  cutoffOBC: number;
  cutoffSC: number;
  cutoffST: number;
  resultPdfUrl: string;
  category: string;
  selectedCandidatesCount?: number;
}

export interface MockTest {
  id: string;
  title: string;
  examCategory: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  attemptsCount: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  isFree: boolean;
  questions: {
    id: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface OldPaper {
  id: string;
  title: string;
  examName: string;
  year: number;
  shift?: string;
  fileSize: string;
  downloadCount: number;
  downloadUrl: string;
}

export interface GovtScheme {
  id: string;
  title: string;
  ministry: string;
  eligibility: string;
  benefits: string;
  category: string;
  applyLink: string;
}

export interface NewsPost {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  author: string;
  readTime: string;
  imageUrl?: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  category: string;
  subject: string;
  type: 'Notes' | 'Video' | 'Book PDF' | 'Syllabus';
  author: string;
  fileSize: string;
  rating: number;
  downloadUrl: string;
}

export interface Product {
  id: string;
  title: string;
  category: 'Books' | 'Test Series' | 'Video Courses' | 'Class Notes' | 'GPSC' | 'Police' | 'Talati';
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  description: string;
  inStock: boolean;
  isDigital: boolean;
  isFree?: boolean;
  googleDriveEmbedUrl?: string;
  downloadUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  status: 'Processing' | 'Delivered' | 'Shipped' | 'Cancelled' | 'Refunded';
  paymentMethod: 'Razorpay' | 'Wallet';
  deliveryAddress?: string;
  invoiceUrl: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  targetRole: 'aspirant' | 'employer';
  features: string[];
  popular?: boolean;
  badge?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'aspirant' | 'employer' | 'admin' | 'superadmin';
  avatarUrl?: string;
  companyName?: string;
  companyLogo?: string;
  isCompanyVerified?: boolean;
  emailConfirmed?: boolean;
  walletBalance: number;
  unlockedResumesCount: number;
  referralCode: string;
  referralsCount: number;
  resumeUrl?: string;
  profileScore?: number;
  education?: string;
  skills?: string[];
  status?: 'Active' | 'Suspended';
  /** Aspirant only — true until the first-login Career Hub setup is completed. */
  needsProfileSetup?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'job' | 'admit_card' | 'result' | 'order' | 'system';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
  reply?: string;
}

export interface SystemSettings {
  siteName: string;
  logoUrl: string;
  description: string;
  seoTitle: string;
  seoKeywords: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  razorpayKeyId: string;
  telegramBotToken: string;
  facebookAppId: string;
  whatsAppChannelUrl?: string | null;
  telegramChannelUrl?: string | null;
}

export interface EmployerPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  isTopUp: boolean;
  includedCredits: number;
  isUnlimitedCredits: boolean;
  maxActiveJobs: number;
  maxFeaturedJobs: number;
  canAccessResumes: boolean;
  resumeViewsPerMonth: number;
  displayOrder: number;
  isActive: boolean;
}

export interface EmployerSubscriptionInfo {
  id?: string;
  planName?: string;
  status: 'none' | 'active' | 'expired' | 'cancelled' | 'pending_payment';
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  autoRenew: boolean;
  maxActiveJobs: number;
  maxFeaturedJobs: number;
  canAccessResumes: boolean;
}

export interface EmployerCreditsInfo {
  totalCredits: number;
  usedCredits: number;
  creditsRemaining: number;
  isUnlimited: boolean;
}

export interface CandidateListItem {
  userId: string;
  name: string;
  headline?: string;
  experienceYears: number;
  currentCity?: string;
  expectedSalary?: number;
  skills?: string;
  education?: string;
  noticePeriodDays: number;
  maskedPhone: string;
  maskedEmail: string;
  isAlreadyContacted: boolean;
}

export interface CandidateProfile {
  userId: string;
  name: string;
  headline?: string;
  aboutMe?: string;
  resumeUrl?: string;
  skills?: string;
  experienceYears: number;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays: number;
  currentCity?: string;
  preferredCities?: string;
  education?: string;
  workExperience?: string;
  isAlreadyContacted: boolean;
  phone: string;
  email: string;
}

export interface ContactAttemptResult {
  allowed: boolean;
  reason: 'already_unlocked' | 'success' | 'blocked_expired' | 'blocked_no_credits' | 'blocked_both';
  phone?: string;
  email?: string;
  creditsRemaining: number;
  isUnlimited: boolean;
}

export interface ContactHistoryItem {
  id: string;
  candidateUserId: string;
  candidateName: string;
  status: string;
  creditDeducted: boolean;
  initialMessage?: string;
  createdDate: string;
}

export interface EmployerAcknowledgmentStatus {
  hasAcknowledgedLatest: boolean;
  planVersion?: string;
  acceptedAt?: string;
  currentPlanVersion: string;
}


