import { Job, AdmitCard, ExamResult, MockTest, OldPaper, GovtScheme, NewsPost, PricingPlan, UserProfile } from '../types';

export const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'SSC CGL 2026 Assistant Section Officer & Inspector Posts',
    companyOrDept: 'Staff Selection Commission (SSC)',
    category: 'SSC',
    location: 'All India (Central Gov)',
    district: 'New Delhi',
    vacancyCount: 14250,
    salary: '₹44,900 - ₹1,42,400 (Level 7)',
    qualification: 'Bachelor Degree in Any Stream',
    type: 'public',
    lastDate: '2026-09-15',
    postedDate: '2026-08-10',
    isBoosted: true,
    tags: ['UPSC/SSC', 'Graduate Job', 'Central Gov', 'High Salary'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  },
  {
    id: 'job-2',
    title: 'IBPS PO XVI Probationary Officer Recruitment 2026',
    companyOrDept: 'Institute of Banking Personnel Selection',
    category: 'Banking',
    location: 'Pan India Public Sector Banks',
    district: 'Mumbai',
    vacancyCount: 4500,
    salary: '₹52,000 - ₹68,000 / month',
    qualification: 'Graduate in Any Discipline',
    type: 'public',
    lastDate: '2026-09-02',
    postedDate: '2026-08-08',
    isBoosted: true,
    tags: ['Banking', 'Bank PO', 'Direct Recruitment'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  },
  {
    id: 'job-3',
    title: 'RRB NTPC Graduate & Undergraduate Railway Posts 2026',
    companyOrDept: 'Indian Railways Recruitment Board',
    category: 'Railways',
    location: 'Pan India Zones',
    district: 'Kolkata',
    vacancyCount: 11558,
    salary: '₹29,200 - ₹63,200 / month',
    qualification: '12th Pass / Graduate',
    type: 'public',
    lastDate: '2026-10-01',
    postedDate: '2026-08-11',
    isBoosted: false,
    tags: ['Railways', '12th Pass', 'Graduate'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  },
  {
    id: 'job-4',
    title: 'UPSC Civil Services IAS / IFS Examination 2026',
    companyOrDept: 'Union Public Service Commission',
    category: 'UPSC',
    location: 'All India',
    district: 'New Delhi',
    vacancyCount: 1056,
    salary: '₹56,100 + DA/HRA (Level 10)',
    qualification: 'Degree in Any Stream',
    type: 'public',
    lastDate: '2026-09-28',
    postedDate: '2026-08-01',
    isBoosted: true,
    tags: ['UPSC', 'IAS', 'Group A Gazetted'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  },
  {
    id: 'job-5',
    title: 'Senior Software Engineer - EduTech Infrastructure',
    companyOrDept: 'EdTech Solutions India Pvt Ltd',
    category: 'Private',
    location: 'Bengaluru / Remote',
    district: 'Bengaluru Urban',
    vacancyCount: 15,
    salary: '₹18,00000 - ₹28,00000 / year',
    qualification: 'B.Tech / MCA / Computer Science',
    type: 'private',
    lastDate: '2026-08-30',
    postedDate: '2026-08-09',
    isBoosted: true,
    tags: ['Private Job', 'IT / Software', 'Remote Work'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  },
  {
    id: 'job-6',
    title: 'UPPSC Assistant Conservator of Forest & PCS Officer 2026',
    companyOrDept: 'Uttar Pradesh Public Service Commission',
    category: 'State PSC',
    location: 'Uttar Pradesh',
    district: 'Lucknow',
    vacancyCount: 380,
    salary: '₹9,300 - ₹34,800 + Grade Pay',
    qualification: 'Graduate / B.Sc Agriculture / Forestry',
    type: 'public',
    lastDate: '2026-09-10',
    postedDate: '2026-08-05',
    isBoosted: false,
    tags: ['State PSC', 'UP Jobs', 'Group B'],
    officialNotificationUrl: '#',
    applyUrl: '#'
  }
];

export const INITIAL_ADMIT_CARDS: AdmitCard[] = [
  {
    id: 'ac-0a',
    examName: 'GSSSB Revenue Talati & Junior Clerk CCE Hall Ticket 2026',
    organization: 'OJAS Gujarat / GSSSB Board',
    releaseDate: '2026-08-12',
    examDate: '2026-08-28',
    downloadUrl: 'https://ojas.gujarat.gov.in',
    status: 'Released',
    category: 'Talati',
    downloadsCount: 148500
  },
  {
    id: 'ac-0b',
    examName: 'GPSC Class 1-2 Prelims Call Letter / Hall Ticket',
    organization: 'Gujarat Public Service Commission',
    releaseDate: '2026-08-11',
    examDate: '2026-09-05',
    downloadUrl: 'https://gpsc.gujarat.gov.in',
    status: 'Released',
    category: 'GPSC',
    downloadsCount: 92400
  },
  {
    id: 'ac-1',
    examName: 'SSC CHSL Tier-II Computer Based Examination 2026',
    organization: 'Staff Selection Commission',
    releaseDate: '2026-08-11',
    examDate: '2026-08-28',
    downloadUrl: '#',
    status: 'Released',
    category: 'SSC'
  },
  {
    id: 'ac-2',
    examName: 'SBI PO Mains Exam Hall Ticket 2026',
    organization: 'State Bank of India',
    releaseDate: '2026-08-10',
    examDate: '2026-08-25',
    downloadUrl: '#',
    status: 'Released',
    category: 'Banking'
  },
  {
    id: 'ac-3',
    examName: 'CDS II Armed Forces Entrance Admit Card',
    organization: 'UPSC Defense Division',
    releaseDate: '2026-08-15',
    examDate: '2026-09-01',
    downloadUrl: '#',
    status: 'Upcoming',
    category: 'Defense'
  },
  {
    id: 'ac-4',
    examName: 'RRB Technician Grade III Admit Card Zone Wise',
    organization: 'Railway Recruitment Boards',
    releaseDate: '2026-08-09',
    examDate: '2026-08-22',
    downloadUrl: '#',
    status: 'Released',
    category: 'Railways'
  }
];

export const INITIAL_RESULTS: ExamResult[] = [
  {
    id: 'res-1',
    examName: 'UPSC Civil Services Prelims Result & Merit List 2026',
    organization: 'UPSC',
    publishDate: '2026-08-08',
    cutoffGen: 88.5,
    cutoffOBC: 84.0,
    cutoffSC: 75.2,
    cutoffST: 71.0,
    resultPdfUrl: '#',
    category: 'UPSC'
  },
  {
    id: 'res-2',
    examName: 'SSC CGL Tier-I Written Exam Official Result & Cutoff',
    organization: 'SSC',
    publishDate: '2026-08-04',
    cutoffGen: 137.5,
    cutoffOBC: 132.0,
    cutoffSC: 115.0,
    cutoffST: 108.5,
    resultPdfUrl: '#',
    category: 'SSC'
  },
  {
    id: 'res-3',
    examName: 'IBPS Clerk XIII Final Allotment Result Out',
    organization: 'IBPS',
    publishDate: '2026-07-30',
    cutoffGen: 72.25,
    cutoffOBC: 69.5,
    cutoffSC: 62.0,
    cutoffST: 58.0,
    resultPdfUrl: '#',
    category: 'Banking'
  }
];

export const INITIAL_MOCK_TESTS: MockTest[] = [
  {
    id: 'mt-1',
    title: 'SSC CGL Tier-1 Full Length Mock Test 2026 #01',
    examCategory: 'SSC',
    totalQuestions: 100,
    durationMinutes: 60,
    totalMarks: 200,
    attemptsCount: 42800,
    difficulty: 'Moderate',
    isFree: true,
    questions: [
      {
        id: 'q1',
        questionText: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Ribosome', 'Mitochondria', 'Golgi Apparatus', 'Endoplasmic Reticulum'],
        correctIndex: 1,
        explanation: 'Mitochondria produce ATP via cellular respiration and are termed cellular powerhouses.'
      },
      {
        id: 'q2',
        questionText: 'If 15 men complete a work in 20 days, how many men are needed to complete the same work in 12 days?',
        options: ['20', '25', '30', '18'],
        correctIndex: 1,
        explanation: 'Men x Days = Constant. 15 x 20 = M2 x 12 => 300 / 12 = 25 men.'
      },
      {
        id: 'q3',
        questionText: 'Who was appointed as the Chief Justice of India in 2026?',
        options: ['Justice D.Y. Chandrachud', 'Justice Sanjiv Khanna', 'Justice B.R. Gavai', 'Justice Surya Kant'],
        correctIndex: 2,
        explanation: 'Justice B.R. Gavai was elevated as CJI in accordance with seniority.'
      }
    ]
  },
  {
    id: 'mt-2',
    title: 'IBPS PO Quantitative Aptitude Speed Test',
    examCategory: 'Banking',
    totalQuestions: 35,
    durationMinutes: 20,
    totalMarks: 35,
    attemptsCount: 29100,
    difficulty: 'Hard',
    isFree: true,
    questions: [
      {
        id: 'bq1',
        questionText: 'What is 35% of 800 + 45% of 1200?',
        options: ['720', '820', '800', '780'],
        correctIndex: 1,
        explanation: '(0.35 * 800) + (0.45 * 1200) = 280 + 540 = 820.'
      }
    ]
  },
  {
    id: 'mt-3',
    title: 'UPSC CSAT Analytical & Logical Reasoning Mock',
    examCategory: 'UPSC',
    totalQuestions: 80,
    durationMinutes: 120,
    totalMarks: 200,
    attemptsCount: 18400,
    difficulty: 'Moderate',
    isFree: false,
    questions: []
  }
];

export const INITIAL_OLD_PAPERS: OldPaper[] = [
  {
    id: 'op-1',
    title: 'SSC CGL 2025 Tier-I Shift 1 Question Paper with Key',
    examName: 'SSC CGL',
    year: 2025,
    shift: 'Shift 1 (9 AM - 10 AM)',
    fileSize: '4.2 MB',
    downloadCount: 124000,
    downloadUrl: '#'
  },
  {
    id: 'op-2',
    title: 'UPSC Civil Services Prelims GS Paper I Solved (2015-2025 Compilation)',
    examName: 'UPSC CSE',
    year: 2025,
    fileSize: '12.8 MB',
    downloadCount: 310000,
    downloadUrl: '#'
  },
  {
    id: 'op-3',
    title: 'IBPS PO Mains Memory Based Paper 2024',
    examName: 'IBPS PO',
    year: 2024,
    fileSize: '3.1 MB',
    downloadCount: 89000,
    downloadUrl: '#'
  }
];

export const INITIAL_SCHEMES: GovtScheme[] = [
  {
    id: 'sch-1',
    title: 'PM-Vidyalaxmi Education Loan & Scholarship Scheme 2026',
    ministry: 'Ministry of Education',
    eligibility: 'Meritorious Students in Higher Education Institutes',
    benefits: 'Collateral-free loans up to ₹10 Lakhs with 3% interest subvention.',
    category: 'Education & Youth',
    applyLink: '#'
  },
  {
    id: 'sch-2',
    title: 'National Career Service (NCS) Youth Skill Training Scheme',
    ministry: 'Ministry of Labour & Employment',
    eligibility: 'Jobseekers aged 18 to 35',
    benefits: 'Free digital skills training, direct employer interview matching & allowance.',
    category: 'Employment',
    applyLink: '#'
  },
  {
    id: 'sch-3',
    title: 'PM Kaushal Vikas Yojana (PMKVY 4.0)',
    ministry: 'Ministry of Skill Development',
    eligibility: 'Unemployed youth & school dropouts',
    benefits: 'Free industry-aligned certifications & post-placement stipend.',
    category: 'Skill Building',
    applyLink: '#'
  }
];

export const INITIAL_NEWS: NewsPost[] = [
  {
    id: 'news-1',
    title: '7th Pay Commission DA Hiked to 53% for Central Gov Employees',
    summary: 'The Union Cabinet has approved a 3% hike in Dearness Allowance benefiting over 49 lakh employees and 68 lakh pensioners.',
    date: '2026-08-11',
    category: 'Government Policies',
    author: 'Govt Portal Editorial',
    readTime: '3 min read'
  },
  {
    id: 'news-2',
    title: 'SSC Calendar 2026-27 Revised: CGL, CHSL, GD Constable Dates Out',
    summary: 'Check official tentative exam schedules and online application windows for upcoming Staff Selection Commission recruitment.',
    date: '2026-08-10',
    category: 'Exam Updates',
    author: 'Exam Desk',
    readTime: '4 min read'
  },
  {
    id: 'news-3',
    title: 'How to Prepare for UPSC Prelims 2027: Topper Strategy & Booklist',
    summary: 'Detailed roadmap covering NCERTs, Standard Reference Books, Mock Test Series analysis, and Current Affairs preparation.',
    date: '2026-08-07',
    category: 'Strategy & Tips',
    author: 'IAS Mentors',
    readTime: '6 min read'
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'plan-free',
    name: 'Aspirant Starter',
    priceMonthly: 0,
    priceYearly: 0,
    targetRole: 'aspirant',
    features: [
      'Access to Free Daily Quizzes',
      'Public Job Notifications & Email Alerts',
      'Basic Cutoff Predictor Tool',
      'Admit Card & Result Status Notifications',
      'Download Previous Year Papers (Limited)'
    ],
    popular: false,
    badge: 'Always Free'
  },
  {
    id: 'plan-pass-pro',
    name: 'Aspirant Pass Pro',
    priceMonthly: 199,
    priceYearly: 999,
    targetRole: 'aspirant',
    features: [
      'Unlimited Full Mock Tests (800+ Exams)',
      'Detailed Performance Analytics & AI Weakness Finder',
      'Instant WhatsApp & Telegram Instant Alerts',
      'Advanced AI Cutoff Predictor with Rank Multiplier',
      'Unlimited PDF Notes & Solutions Download',
      '500 Wallet Bonus Credits for Store Discounts'
    ],
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'emp-starter',
    name: 'Employer Basic Job Post',
    priceMonthly: 999,
    priceYearly: 8999,
    targetRole: 'employer',
    features: [
      'Post 5 Active Jobs / Month',
      'Direct Applicant Inbox & Excel Export',
      'Unlock 50 Verified Candidate Resumes',
      'Basic Job Boosting on Search Feed',
      'Company Profile Page'
    ],
    popular: false,
    badge: 'Small Business'
  },
  {
    id: 'emp-growth',
    name: 'Employer Unlimited & Bulk',
    priceMonthly: 2999,
    priceYearly: 24999,
    targetRole: 'employer',
    features: [
      'Unlimited Job Postings (Public & Private)',
      'Automated Multi-Channel Broadcast (Telegram, Socials)',
      'Unlock 500 Candidate Resumes / Month',
      'Featured Job Boosting & Priority Feed Placement',
      'API & Excel Bulk Job Import/Export',
      'Dedicated Account Manager & Anti-Bot Filtering'
    ],
    popular: true,
    badge: 'High Conversion'
  }
];

export const DEFAULT_USER: UserProfile = {
  id: 'usr-101',
  name: 'Ajay Rathava',
  email: 'ajayrathava942@gmail.com',
  phone: '+91 98765 43210',
  role: 'aspirant',
  walletBalance: 450,
  unlockedResumesCount: 12,
  referralCode: 'GOVPREP2026',
  referralsCount: 7,
  profileScore: 88,
  education: 'B.Tech Computer Engineering (2024)',
  skills: ['Aptitude', 'General Awareness', 'Reasoning', 'Data Analysis']
};

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    title: 'SSC CGL Tier-1 & Tier-2 Master Guidebook (Latest 2026 Edition)',
    category: 'Books' as const,
    price: 499,
    originalPrice: 850,
    rating: 4.8,
    reviewsCount: 342,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Comprehensive paper collection with 5,000+ solved MCQs, detailed explanations, and speed shortcut tricks for Quant, English, and Reasoning.',
    inStock: true,
    isDigital: false
  },
  {
    id: 'prod-2',
    title: 'UPSC IAS Prelims GS Paper-1 & CSAT 10-Year Topicwise Solved Archive',
    category: 'Books' as const,
    price: 699,
    originalPrice: 1100,
    rating: 4.9,
    reviewsCount: 512,
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    description: 'High-yield prelims notes curated by top rankers with mindmaps, trend breakdown, and eliminate-option strategies.',
    inStock: true,
    isDigital: false
  },
  {
    id: 'prod-3',
    title: 'IBPS PO XVI Hardcopy OMR Mock Test Workbook (25 Full Length Sets)',
    category: 'Test Series' as const,
    price: 349,
    originalPrice: 600,
    rating: 4.7,
    reviewsCount: 189,
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Simulate real bank examination at home with printed OMR answer sheets and online video solutions.',
    inStock: true,
    isDigital: false
  },
  {
    id: 'prod-4',
    title: 'Complete Quantitative Aptitude & Data Interpretation HD Video Course',
    category: 'Video Courses' as const,
    price: 999,
    originalPrice: 2499,
    rating: 4.9,
    reviewsCount: 890,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    description: '120+ Hours of concept lectures covering Vedic math shortcuts, DI tables, algebra, and geometry.',
    inStock: true,
    isDigital: true
  }
];

export const INITIAL_STUDY_MATERIALS = [
  {
    id: 'sm-1',
    title: 'Indian Polity & Constitution Mindmaps Summary (2026 Revised)',
    category: 'UPSC',
    subject: 'General Studies',
    type: 'Notes' as const,
    author: 'Editorial Team',
    fileSize: '4.2 MB PDF',
    rating: 4.9,
    downloadUrl: '#'
  },
  {
    id: 'sm-2',
    title: 'SSC CGL Quant Formulas & Speed Calculation Cheat Sheet',
    category: 'SSC',
    subject: 'Quantitative Aptitude',
    type: 'Notes' as const,
    author: 'Aptitude Wing',
    fileSize: '2.1 MB PDF',
    rating: 4.8,
    downloadUrl: '#'
  },
  {
    id: 'sm-3',
    title: 'Banking Awareness & RBI Financial Current Affairs 2026',
    category: 'Banking',
    subject: 'General Awareness',
    type: 'Book PDF' as const,
    author: 'Bankers Vault',
    fileSize: '8.5 MB PDF',
    rating: 4.7,
    downloadUrl: '#'
  },
  {
    id: 'sm-4',
    title: 'Railway RRB NTPC Mathematics 1000 Most Expected MCQs',
    category: 'Railways',
    subject: 'Mathematics',
    type: 'Notes' as const,
    author: 'RRB Expert Panel',
    fileSize: '5.8 MB PDF',
    rating: 4.8,
    downloadUrl: '#'
  }
];

export const INITIAL_APPLICATIONS = [
  {
    id: 'app-1',
    jobId: 'job-1',
    jobTitle: 'SSC CGL 2026 Assistant Section Officer',
    companyOrDept: 'Staff Selection Commission',
    applicantName: 'Ajay Rathava',
    applicantEmail: 'ajayrathava942@gmail.com',
    applicantPhone: '+91 98765 43210',
    appliedDate: '2026-08-11',
    status: 'Shortlisted' as const,
    resumeUrl: 'https://jobcharcha.com/resumes/ajay_rathava_cv.pdf',
    qualification: 'B.Tech',
    experienceYears: 2
  },
  {
    id: 'app-2',
    jobId: 'job-2',
    jobTitle: 'IBPS PO XVI Probationary Officer',
    companyOrDept: 'Institute of Banking Personnel Selection',
    applicantName: 'Ajay Rathava',
    applicantEmail: 'ajayrathava942@gmail.com',
    applicantPhone: '+91 98765 43210',
    appliedDate: '2026-08-09',
    status: 'Under Review' as const,
    resumeUrl: 'https://jobcharcha.com/resumes/ajay_rathava_cv.pdf',
    qualification: 'B.Tech',
    experienceYears: 2
  }
];

