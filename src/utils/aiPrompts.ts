/** Master SEO extraction prompt — pasted into an external AI app (ChatGPT/Claude) alongside the
 * raw notification text, returning the JSON schema `aiJobImportValidation.ts` expects. */
const JOB_POST_EXTRACTION_PROMPT_TEMPLATE = `You are an expert SEO content writer and job posting data extraction assistant for JobCharcha.com — Gujarat's #1 trusted government job portal, ranking on Google for Gujarati government job searches.

TASK: Read the official job notification text below. Extract every factual detail AND generate SEO-optimized content that is written to rank on Google India for Gujarat job seekers searching in English, Gujarati-English (Hinglish), and Gujarati.

Return ONLY a valid JSON object. No explanation, no markdown formatting, no code fences, no text before or after — pure JSON only.

OFFICIAL NOTIFICATION TEXT:
{{NOTIFICATION_TEXT}}

===========================================
SEO WRITING RULES (apply to all text fields):
===========================================
- Primary keyword = "[Post Name] [Department/Board] Bharti [Year]" — use this EXACT phrase in title, metaTitle, slug, and first sentence of shortDescription.
- Include Gujarat location keywords naturally (Gujarat, Ahmedabad, Gandhinagar, Surat, Vadodara, Rajkot — only if genuinely relevant to the post).
- Include "Bharti", "Recruitment", "Notification", "Apply Online", "Last Date" as secondary keywords across description.
- Write shortDescription so the FIRST sentence alone can act as a Google search snippet — direct answer style, no fluff intro.
- Use numbers in headings/titles where possible (post count, year) — numbers boost CTR.
- Avoid keyword stuffing — max 1 keyword mention per 100 words in description body.
- Write in simple, scannable language (grade 8 reading level) — short sentences, bullet points, no jargon walls.
- The six content fields below (overview, keyHighlights, eligibilityDetails, howToApply, importantNotes, documentsRequired) are rendered as SEPARATE sections on the live page — do not repeat the same fact word-for-word across more than one of them. Also never restate as prose what the STRUCTURED fields further down this schema already cover as their own dedicated section on the page — vacancyBreakdown/categoryWiseVacancy → "Vacancy Details" table, applicationFee/applicationFeeDetails → "Application Fee" box, examPattern → "Exam Pattern" table, selectionProcess → "Selection Process" steps, importantDates → "Important Dates" box, minAge/maxAge → "Age Limit" box, minSalary/maxSalary/salaryBreakdown → "Salary / Pay Scale" box, advertisementNumber/department/totalPosts/qualification/salary/location/lastDate → "Recruitment Overview" table at the top of the page. Extract real facts into THOSE structured fields (don't leave them empty when the notification has the data) instead of dumping the same facts into overview/eligibilityDetails as paragraphs.
- Depth bar: each of these six fields should be as thorough as the source notification actually allows — a detailed multi-page notification should produce a detailed multi-item field, not a thin 2-3 line summary. Never pad with invented filler to hit a length target, but never compress real detail down to a token summary either. Prefer several short, labelled sub-points over one dense paragraph.
- Return clean semantic HTML only. Allowed tags everywhere: <p>, <ul>, <ol>, <li>, <strong>, <a>, <hr>. No markdown (no "**", no "-" bullets), no tailwind classes, no inline styles, no <div>/<span>.
- Extra allowance ONLY inside "eligibilityDetails": when the notification gives DIFFERENT numeric values per category (e.g. minimum marks/CGPA by General/SC/ST/OBC/PwD/EWS, or maximum age by category), present that as a real HTML table instead of prose — wrap it in <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">, use <th>/<td style="border:1px solid #ddd;padding:8px;text-align:left">, one table per fact type (a marks table and a separate age table, if both exist). If the notification gives only ONE flat value for everyone, just write a <p> — don't build a one-row table.

===========================================
RETURN THIS EXACT JSON STRUCTURE:
===========================================
{
  "title": "exact job title from notification, keyword-rich (e.g. 'GSSSB Talati Bharti 2026 - 1181 Posts')",
  "slug": "url-friendly-slug-with-hyphens-keyword-rich-no-stopwords",
  "department": "full department or organization name",
  "categoryName": "best match from: GPSC, GSSSB, OJAS, Police Bharti, Teacher Bharti, Talati, Panchayat, Health Department, Bank Jobs, Railway Jobs, Private",

  "focusKeyword": "primary SEO keyword phrase, e.g. 'GSSSB Talati Bharti 2026'",
  "secondaryKeywords": ["array", "of", "5-8", "related long-tail keyword phrases people search in Google"],
  "lsiKeywords": ["array", "of", "5-8", "semantically related terms Google associates with this job category (e.g. 'sarkari naukri', 'ojas gujarat', 'rojgar samachar')"],

  "totalPosts": 0,
  "salary": "salary range exactly as mentioned",
  "ageLimit": "age limit exactly as mentioned",
  "qualification": "qualification required",
  "location": "Gujarat or specific city",
  "lastDate": "YYYY-MM-DD format — the last date to SUBMIT the online application (same value as importantDates.applicationEnd)",
  "applyLink": "official apply URL or null",

  "advertisementNumber": "Advt. No. / Notification No. exactly as printed (e.g. 'GSSSB/202526/347'), or null",
  "officialWebsite": "home page of the recruiting body (e.g. 'https://gsssb.gujarat.gov.in'), or null — full URL with https://",
  "syllabusLink": "direct URL of the syllabus PDF/page if the notification gives one, else null",
  "state": "state name, e.g. 'Gujarat' (use 'All India' for central recruitments), or null",
  "district": "district name only if the posting is for ONE district, else null",
  "minAge": 18,
  "maxAge": 33,
  "experienceRequired": "number of years of experience required (0 if freshers can apply), or null if the notification is silent",
  "minSalary": 25500,
  "maxSalary": 81100,
  "salaryType": "Month | Year | Fixed Month (for fixed-pay 5-year contract posts) — or null",
  "applicationFeeAmount": "the General/UR category fee as a plain number (e.g. 500); 0 if no fee for anyone; null if not mentioned",
  "applicationFeeDetails": "one short plain-text line: payment mode(s), refund rule, fee deadline — e.g. 'Pay online via Net Banking / UPI / Card or by challan at post office. Fee is non-refundable.' — or null",

  "shortDescription": "2-3 sentence summary, max 400 chars, first sentence must stand alone as a direct-answer Google snippet. Must include: org name, post count, key qualification, last date.",

  "overview": "HTML, 2-4 short <p> paragraphs (NOT a wall of text, NOT a multi-section document — the structured fields below carry the depth). Paragraph 1: direct-answer intro repeating the focus keyword naturally in the first sentence — org name, post count/programme name, key qualification, last date. Paragraph 2 (only if the notification supports it): concrete context prose that has nowhere else to go in this schema — advertisement number, notification date, department/work-area or engineering-discipline breadth, programme type (e.g. campus recruitment vs direct recruitment), location/state or domicile preference, post-training career growth for trainee-style posts. Never restate vacancy counts, fee, exam pattern, selection stages, or date lists here — those get their own sections from the structured fields.",

  "keyHighlights": "HTML, a single <ul> with 4-8 <li> items. The page ALREADY shows organization, post name, total posts, qualification, salary, location, age and last date in its overview table and stats strip — so do NOT repeat those. Use this list for the scan-worthy facts a candidate would otherwise miss: e.g. 'No fee for women / SC / ST', 'Negative marking: 0.25 per wrong answer', 'Knowledge of Gujarati & Hindi mandatory', 'CCC computer certificate required at appointment', 'Fixed pay ₹26,000 for first 5 years', 'Female candidates: 33% reservation', 'Only one application per candidate'. e.g. '<ul><li><strong>No application fee</strong> for women, SC, ST, PwD and Ex-servicemen</li></ul>'",

  "eligibilityDetails": "HTML — the full eligibility deep-dive, richer than the short 'qualification' field. Always cover, each as its own <p> or <ul> block with a <strong> label: (1) exact qualification per post/discipline including any 'OR' alternative qualification paths (e.g. diploma-holders laterally eligible) and any minimum-percentage/CGPA cutoff; (2) minimum and maximum age with the as-on-date if given; (3) age relaxation and marks relaxation by category (SC/ST/OBC/PwD/EWS/Ex-servicemen/Transgender); (4) any programme-type restriction (e.g. full-time only, distance/part-time excluded) or existing-employee exclusion, if the notification states one. Use the category-wise <table> allowance above when marks or age genuinely differ by category — otherwise plain <p>/<ul> text. Never leave this thinner than what the notification actually contains.",

  "howToApply": "HTML, a single <ol> with as many <li> steps as the notification's application-process description supports (aim for 6-10 when the notification walks through the portal in detail: visit official website → locate the specific post/recruitment link → register/create login with email → fill personal details → fill educational/qualification details → upload scanned documents → pay application fee → review and submit → download/save the confirmation or registration number). Each <li> is one step in plain language; if a step has several distinct sub-items (e.g. which fields to fill, which documents to upload), nest a short <ul> of 2-4 bullets inside that <li> instead of cramming them into one sentence. Add a final step for query/helpdesk contact (email or phone) only if the notification gives one.",

  "importantNotes": "HTML — every important guideline, restriction, or warning the notification states, grouped under short <p><strong>Group Title</strong></p> headings so related points sit together (use whichever of these groups the notification actually supports, skip the rest — do not invent groups with no content: General Guidelines, Eligibility Conditions, Application & Fee, Communication & Document Verification, Fraud/Canvassing Warning). Each group is followed by its own <ol> of specific, concrete points — not vague filler. A short simple notification may only need one flat <ul> with no group headings. Null only if the notification truly gives nothing to put here.",

  "documentsRequired": "HTML — documents/certificates candidates must upload online or carry for verification, grouped under short <p><strong>Group Title</strong></p> headings when the notification lists several categories (typical groups: Academic Documents, Identity Documents, Category/Reservation Documents, Domicile Documents, Other Documents/Photo), each followed by its own <ul> of specific document names. If the notification only gives a flat list, use one <ul> with no headings. Null if the notification gives no document list at all.",

  "faqSchema": [
    {"question": "exact question text matching FAQ section above", "answer": "exact short answer text, plain text, 1-2 sentences, no markdown"}
  ],

  "vacancyBreakdown": [{"postName": "Post Name 1", "sc": 0, "st": 0, "obc": 0, "ews": 0, "ur": 0, "total": 0}],
  "categoryWiseVacancy": {"general": 0, "sc": 0, "st": 0, "obc": 0, "ews": 0, "pwdOh": 0, "pwdVh": 0, "exServicemen": 0, "total": 0},
  "applicationFee": [{"category": "General / OBC / EWS", "fee": "Rs. 000"}, {"category": "SC / ST / PwD / Women", "fee": "Rs. 000 or Nil"}],
  "selectionProcess": ["Preliminary Examination", "Main Examination", "Document Verification"],
  "examPattern": [{"paper": "Paper I", "subject": "General Awareness / Reasoning / English", "questions": 100, "marks": 100, "duration": "1 hour", "type": "MCQ"}],
  "salaryBreakdown": {"basicPay": "Rs. 00,000", "da": "as per rules", "hra": "as per rules", "grossSalary": "Rs. 00,000 approx", "netSalary": "Rs. 00,000 approx"},
  "importantDates": {"notificationDate": "YYYY-MM-DD or null", "applicationStart": "YYYY-MM-DD or null", "applicationEnd": "YYYY-MM-DD or null", "feePaymentEnd": "YYYY-MM-DD or null", "admitCardDate": "YYYY-MM-DD or null", "examDate": "YYYY-MM-DD or null", "resultDate": "YYYY-MM-DD or null", "otherDates": [{"label": "Correction Window", "date": "2026-11-02 to 2026-11-05"}, {"label": "Tier 1 Exam", "date": "December 2026 (Tentative)"}]},

  "metaTitle": "SEO title, max 60 chars, format: '[Focus Keyword] | JobCharcha' — front-load the keyword",
  "metaDescription": "SEO meta description, max 155 chars, include focus keyword + a call to action like 'Apply Online Now'",
  "metaKeywords": "10-12 Gujarat job keywords comma separated, mix of English + Hinglish terms",

  "ogTitle": "social share title, can be slightly more clickable/punchy than metaTitle, max 60 chars",
  "ogDescription": "social share description, max 160 chars",

  "internalLinkAnchors": ["array of 3-5 natural anchor text suggestions to link this post from related posts, e.g. 'GSSSB Bharti 2026'"],

  "autoPublish": true
}

===========================================
STRICT RULES:
===========================================
1. lastDate, all date fields → YYYY-MM-DD format only
2. totalPosts, examPattern.questions/marks → numbers, not strings
3. autoPublish always true
4. vacancyBreakdown → one row per post type; faqSchema → one object per FAQ pair
5. If SC/ST/OBC breakdown not given, use 0 for each (the page hides all-zero columns). "total" of every vacancyBreakdown row must be filled, and the row totals must add up to totalPosts. Use the post name only in "postName" (e.g. "Junior Clerk"), never "Post 1"
5b. minAge, maxAge, experienceRequired, minSalary, maxSalary, applicationFeeAmount → plain numbers (no "₹", no commas, no "years"), or null. Use the GENERAL category's age range for minAge/maxAge (relaxations go in eligibilityDetails). For a pay level like "Level 4 (₹25,500–81,100)" → minSalary 25500, maxSalary 81100. For fixed pay "₹26,000 fixed for 5 years" → minSalary 26000, maxSalary null, salaryType "Fixed Month"
6. selectionProcess must be an array of strings, in order
7. examPattern → empty array [] if not in notification
8. salaryBreakdown → all null if salary not mentioned
9. importantDates → null for any date not in notification. Convert DD/MM/YYYY and "24th October 2026" style dates to YYYY-MM-DD. A date without an exact day ("December 2026", "tentative", "will be announced later") must NOT be forced into a YYYY-MM-DD slot — put it in importantDates.otherDates as free text instead. Also use otherDates for milestones with no slot above (correction window, interview, skill test, document verification)
10. overview, keyHighlights, eligibilityDetails, howToApply, importantNotes, documentsRequired → clean semantic HTML only (<p>/<ul>/<ol>/<li>/<strong>/<a>/<hr>, plus the <table> allowance described above but ONLY inside eligibilityDetails), never markdown, never plain "- bullet" text, never repeat the same fact across more than one of these fields
11. overview and howToApply are always required (never null/empty); keyHighlights, eligibilityDetails, importantNotes, documentsRequired → null only if the notification truly gives nothing to put there — but populate them whenever the notification has the content, don't leave them null out of laziness
11b. Match the depth of the source: a long, detailed notification (multiple pages, many clauses) must produce long, detailed eligibilityDetails/howToApply/importantNotes/documentsRequired — a short one-page notification should produce correspondingly short fields. Do not compress real multi-point detail into a token 2-item list.
12. shortDescription max 400 characters strict; metaTitle max 60 chars strict; metaDescription max 155 chars strict
13. secondaryKeywords, lsiKeywords, internalLinkAnchors — real search-realistic phrases, not generic filler
14. If any field is truly not in the notification, use null (never invent facts — SEO fields like keywords/FAQs may still be generated from context)
15. Return PURE JSON only — no text before or after, no code fences
16. No trailing commas; all strings in double quotes only
17. SELF-CHECK before returning (fix silently, do not print the checklist): lastDate equals importantDates.applicationEnd when both are known; vacancyBreakdown totals sum to totalPosts; minAge < maxAge; minSalary <= maxSalary; every URL starts with https:// or http://; no field contains the placeholder text from this template (e.g. "Post Name 1", "Rs. 000", "YYYY-MM-DD or null")`;

/** Master SEO extraction prompt for Result posts — same schema philosophy as the Job Post prompt,
 * swapping in result-specific facts (result date, cut-off marks, selected candidates) per the
 * "keep identical / swap in" field table. */
const RESULT_EXTRACTION_PROMPT_TEMPLATE = `You are an expert SEO content writer and exam result data extraction assistant for JobCharcha.com — Gujarat's #1 trusted government job portal, ranking on Google for Gujarati government exam result searches.

TASK: Read the official result notification text below. Extract every factual detail AND generate SEO-optimized content that is written to rank on Google India for Gujarat candidates searching in English, Gujarati-English (Hinglish), and Gujarati.

Return ONLY a valid JSON object. No explanation, no markdown formatting, no code fences, no text before or after — pure JSON only.

OFFICIAL RESULT NOTIFICATION TEXT:
{{NOTIFICATION_TEXT}}

===========================================
SEO WRITING RULES (apply to all text fields):
===========================================
- Primary keyword = "[Exam Name] Result [Year]" — use this EXACT phrase in title, metaTitle, slug, and first sentence of shortDescription.
- Include "Result", "Merit List", "Cut Off", "Download" as secondary keywords across description.
- Write shortDescription so the FIRST sentence alone can act as a Google search snippet — direct answer style, no fluff intro.
- Every section heading in "description" doubles as an H2 for on-page SEO — keep them exactly as specified.
- Write in simple, scannable language (grade 8 reading level) — short sentences, bullet points, no jargon walls.

===========================================
RETURN THIS EXACT JSON STRUCTURE:
===========================================
{
  "title": "exact result title, keyword-rich (e.g. 'GSSSB Talati Result 2026 - Merit List Declared')",
  "slug": "url-friendly-slug-with-hyphens-keyword-rich-no-stopwords",
  "examName": "exam name",
  "organizationName": "full department or organization name",
  "categoryName": "best match from: GPSC, GSSSB, OJAS, Police Bharti, Teacher Bharti, Talati, Panchayat, Health Department, Bank Jobs, Railway Jobs, Private",

  "focusKeyword": "primary SEO keyword phrase, e.g. 'GSSSB Talati Result 2026'",
  "secondaryKeywords": ["array", "of", "5-8", "related long-tail keyword phrases people search in Google"],
  "lsiKeywords": ["array", "of", "5-8", "semantically related terms Google associates with this result category"],

  "resultDate": "YYYY-MM-DD format",
  "examDate": "YYYY-MM-DD format or null",
  "resultLink": "official result/merit-list URL or null",
  "resultPdf": "official result PDF URL or null",
  "cutOffMarks": "brief cutoff summary text or null",
  "selectedCandidates": "number/summary of selected candidates or null",
  "location": "Gujarat or specific state",

  "shortDescription": "2-3 sentence summary, max 400 chars, first sentence must stand alone as a direct-answer Google snippet. Must include: org name, exam name, result date.",

  "description": "Write structured content using EXACTLY these section headings on separate lines followed by bullet points:

OVERVIEW:
- 2-3 line direct-answer intro repeating the focus keyword naturally in the first sentence

RESULT DETAILS:
- Exam name, result declared date, organization

CUT OFF MARKS:
- category-wise cutoff summary if available

SELECTION STAGE CLEARED:
- which stage this result represents (e.g. Preliminary, Main, Final)

NEXT STAGE INFO:
- what happens next for selected candidates (e.g. document verification, interview date if known)

HOW TO CHECK RESULT:
- Step 1
- Step 2

FREQUENTLY ASKED QUESTIONS:
- Q: When was the [exam name] result declared? A: direct short answer with the date
- Q: Where can I check my [exam name] result? A: direct short answer
- Q: What is the cutoff for [exam name]? A: direct short answer",

  "faqSchema": [
    {"question": "exact question text matching FAQ section above", "answer": "exact short answer text, plain text, 1-2 sentences, no markdown"}
  ],

  "cutOffBreakdown": [{"postName": "Post Name 1", "general": "00", "sc": "00", "st": "00", "obc": "00", "ews": "00"}],

  "metaTitle": "SEO title, max 60 chars, format: '[Focus Keyword] | JobCharcha' — front-load the keyword",
  "metaDescription": "SEO meta description, max 155 chars, include focus keyword + a call to action like 'Check Result Now'",
  "metaKeywords": "10-12 keywords comma separated, mix of English + Hinglish terms",

  "ogTitle": "social share title, can be slightly more clickable/punchy than metaTitle, max 60 chars",
  "ogDescription": "social share description, max 160 chars",

  "internalLinkAnchors": ["array of 3-5 natural anchor text suggestions to link this result from related posts"],

  "autoPublish": true
}

===========================================
STRICT RULES:
===========================================
1. resultDate, examDate → YYYY-MM-DD format only
2. autoPublish always true
3. faqSchema → one object per FAQ pair
4. cutOffBreakdown → empty array [] if not in notification
5. description MUST use the exact section headings shown above, including FAQ section
6. shortDescription max 400 characters strict; metaTitle max 60 chars strict; metaDescription max 155 chars strict
7. secondaryKeywords, lsiKeywords, internalLinkAnchors — real search-realistic phrases, not generic filler
8. If any field is truly not in the notification, use null (never invent facts — SEO fields like keywords/FAQs may still be generated from context)
9. Return PURE JSON only — no text before or after, no code fences
10. No trailing commas; all strings in double quotes only`;

/** Master SEO extraction prompt for Admit Card posts — same schema philosophy as the Job/Result
 * prompts, swapping in admit-card-specific facts per the "keep identical / swap in" field table. */
const ADMIT_CARD_EXTRACTION_PROMPT_TEMPLATE = `You are an expert SEO content writer and admit card data extraction assistant for JobCharcha.com — Gujarat's #1 trusted government job portal, ranking on Google for Gujarati government exam admit card searches.

TASK: Read the official admit card notification text below. Extract every factual detail AND generate SEO-optimized content that is written to rank on Google India for Gujarat candidates searching in English, Gujarati-English (Hinglish), and Gujarati.

Return ONLY a valid JSON object. No explanation, no markdown formatting, no code fences, no text before or after — pure JSON only.

OFFICIAL ADMIT CARD NOTIFICATION TEXT:
{{NOTIFICATION_TEXT}}

===========================================
SEO WRITING RULES (apply to all text fields):
===========================================
- Primary keyword = "[Exam Name] Admit Card [Year]" — use this EXACT phrase in title, metaTitle, slug, and first sentence of shortDescription.
- Include "Admit Card", "Hall Ticket", "Download", "Exam Date" as secondary keywords across description.
- Write shortDescription so the FIRST sentence alone can act as a Google search snippet — direct answer style, no fluff intro.
- Every section heading in "description" doubles as an H2 for on-page SEO — keep them exactly as specified.
- Write in simple, scannable language (grade 8 reading level) — short sentences, bullet points, no jargon walls.

===========================================
RETURN THIS EXACT JSON STRUCTURE:
===========================================
{
  "title": "exact admit card title, keyword-rich (e.g. 'GSSSB Talati Admit Card 2026 - Download Hall Ticket')",
  "slug": "url-friendly-slug-with-hyphens-keyword-rich-no-stopwords",
  "examName": "exam name",
  "organizationName": "full department or organization name",
  "categoryName": "best match from: GPSC, GSSSB, OJAS, Police Bharti, Teacher Bharti, Talati, Panchayat, Health Department, Bank Jobs, Railway Jobs, Private",

  "focusKeyword": "primary SEO keyword phrase, e.g. 'GSSSB Talati Admit Card 2026'",
  "secondaryKeywords": ["array", "of", "5-8", "related long-tail keyword phrases people search in Google"],
  "lsiKeywords": ["array", "of", "5-8", "semantically related terms Google associates with this admit card category"],

  "admitCardReleaseDate": "YYYY-MM-DD format",
  "examDate": "YYYY-MM-DD format or null",
  "downloadLink": "official download URL or null",
  "postName": "post name or null",
  "year": 0,
  "location": "Gujarat or specific state",

  "shortDescription": "2-3 sentence summary, max 400 chars, first sentence must stand alone as a direct-answer Google snippet. Must include: org name, exam name, release date.",

  "description": "Write structured content using EXACTLY these section headings on separate lines followed by bullet points:

OVERVIEW:
- 2-3 line direct-answer intro repeating the focus keyword naturally in the first sentence

ADMIT CARD DETAILS:
- Exam name, release date, organization

EXAM DATE & CENTER:
- exam date and exam center info if available

FREQUENTLY ASKED QUESTIONS:
- Q: When was the [exam name] admit card released? A: direct short answer with the date
- Q: How can I download my [exam name] admit card? A: direct short answer",

  "howToDownload": "brief step-by-step how-to-download text or null",
  "instructionsForExam": ["array", "of", "exam-day instructions, e.g. 'Carry a valid photo ID proof'"],
  "documentsToCarryForExam": ["array", "of", "documents candidates must carry, e.g. 'Printed admit card'"],

  "faqSchema": [
    {"question": "exact question text matching FAQ section above", "answer": "exact short answer text, plain text, 1-2 sentences, no markdown"}
  ],

  "metaTitle": "SEO title, max 60 chars, format: '[Focus Keyword] | JobCharcha' — front-load the keyword",
  "metaDescription": "SEO meta description, max 155 chars, include focus keyword + a call to action like 'Download Now'",
  "metaKeywords": "10-12 keywords comma separated, mix of English + Hinglish terms",

  "ogTitle": "social share title, can be slightly more clickable/punchy than metaTitle, max 60 chars",
  "ogDescription": "social share description, max 160 chars",

  "internalLinkAnchors": ["array of 3-5 natural anchor text suggestions to link this admit card from related posts"],

  "autoPublish": true
}

===========================================
STRICT RULES:
===========================================
1. admitCardReleaseDate, examDate → YYYY-MM-DD format only
2. year → number, not string
3. autoPublish always true
4. faqSchema → one object per FAQ pair
5. instructionsForExam, documentsToCarryForExam → empty array [] if not in notification
6. description MUST use the exact section headings shown above, including FAQ section
7. shortDescription max 400 characters strict; metaTitle max 60 chars strict; metaDescription max 155 chars strict
8. secondaryKeywords, lsiKeywords, internalLinkAnchors — real search-realistic phrases, not generic filler
9. If any field is truly not in the notification, use null (never invent facts — SEO fields like keywords/FAQs may still be generated from context)
10. Return PURE JSON only — no text before or after, no code fences
11. No trailing commas; all strings in double quotes only`;

/** Extraction prompt for Mock Test posts — structurally different from Job/Result/AdmitCard: no SEO
 * content fields (the `Test` entity has none), instead a question-bank shape matching `UpsertTestRequest`
 * (`backend/JobPortal.Application/DTOs/Tests/TestDtos.cs`) — sections of MCQ questions with answers/explanations. */
const MOCK_TEST_EXTRACTION_PROMPT_TEMPLATE = `You are a data extraction assistant for JobCharcha.com, a Gujarat government exam preparation portal. You convert raw mock test / question paper text into clean structured JSON for JobCharcha's Computer Based Test (CBT) engine.

TASK: Read the raw test/question paper text below. Extract the test metadata and every question into the exact JSON structure specified. Preserve every question, option, and correct answer exactly as given — never invent or alter facts. If an explanation is not given for a question, write a brief 1-2 sentence factual explanation for the correct answer.

Return ONLY a valid JSON object. No explanation, no markdown formatting, no code fences, no text before or after — pure JSON only.

RAW TEST / QUESTION PAPER TEXT:
{{NOTIFICATION_TEXT}}

===========================================
RETURN THIS EXACT JSON STRUCTURE:
===========================================
{
  "title": "descriptive test title, e.g. 'SSC CGL Tier 1 Full Length Mock Test 1'",
  "examName": "best match exam name this test belongs to, e.g. 'SSC CGL', 'GSSSB Talati', 'GPSC'",
  "durationMinutes": 60,
  "negativeMarking": 0.25,
  "marksPerQuestion": 1,
  "isFree": true,
  "price": null,
  "instructions": "brief candidate instructions for this test, plain text with newlines between points",

  "sections": [
    {
      "name": "section name, e.g. 'General Awareness'",
      "displayOrder": 1,
      "questions": [
        {
          "subject": "subject this question belongs to, e.g. 'General Awareness'",
          "topic": "specific topic or null, e.g. 'Indian History'",
          "questionTextEn": "full question text",
          "optionAEn": "option A text",
          "optionBEn": "option B text",
          "optionCEn": "option C text",
          "optionDEn": "option D text",
          "correctOption": "A",
          "explanationEn": "1-2 sentence explanation of why this is correct",
          "marks": 1,
          "displayOrder": 1
        }
      ]
    }
  ]
}

===========================================
STRICT RULES:
===========================================
1. correctOption must be exactly one of: "A", "B", "C", "D"
2. durationMinutes, negativeMarking, marksPerQuestion, marks, displayOrder → numbers, not strings
3. price → null when isFree is true; a plain number (no currency symbol) when isFree is false
4. Group questions into sections exactly as they appear in the source text; if the source has no explicit sections, use a single section named "General"
5. displayOrder within a section starts at 1 and increases per question in source order; section displayOrder starts at 1 and increases per section in source order
6. Never skip or merge questions — one JSON question object per question in the source text
7. Never invent questions, options, or answers that are not in the source text
8. Return PURE JSON only — no text before or after, no code fences
9. No trailing commas; all strings in double quotes only`;

/** Extraction prompt for Daily Quiz posts — a small fixed-size question set (no sections, unlike Mock
 * Test), matching `AiImportDailyQuizRequest` (`backend/JobPortal.Application/DTOs/DailyQuizzes/AiImportDailyQuizRequest.cs`). */
const DAILY_QUIZ_EXTRACTION_PROMPT_TEMPLATE = `You are a data extraction assistant for JobCharcha.com, a Gujarat government exam preparation portal. You convert raw question text into a clean structured JSON for JobCharcha's Daily Quiz feature — a short daily quiz (typically 5-15 questions) shown to exam aspirants once per day.

TASK: Read the raw question text below. Extract the quiz metadata and every question into the exact JSON structure specified. Preserve every question, option, and correct answer exactly as given — never invent or alter facts. If an explanation is not given for a question, write a brief 1-2 sentence factual explanation for the correct answer.

Return ONLY a valid JSON object. No explanation, no markdown formatting, no code fences, no text before or after — pure JSON only.

RAW QUESTION TEXT:
{{NOTIFICATION_TEXT}}

===========================================
RETURN THIS EXACT JSON STRUCTURE:
===========================================
{
  "quizDate": "YYYY-MM-DD, the date this quiz should go live — use today's date unless the source text specifies otherwise",
  "title": "short descriptive title, e.g. 'Daily GK Quiz - Indian History & Polity'",
  "description": "1-2 sentence description of what this quiz covers, or null",

  "questions": [
    {
      "topic": "specific topic or null, e.g. 'Indian History'",
      "questionTextEn": "full question text",
      "optionAEn": "option A text",
      "optionBEn": "option B text",
      "optionCEn": "option C text",
      "optionDEn": "option D text",
      "correctOption": "A",
      "explanationEn": "1-2 sentence explanation of why this is correct",
      "displayOrder": 1
    }
  ]
}

===========================================
STRICT RULES:
===========================================
1. quizDate must be YYYY-MM-DD format
2. correctOption must be exactly one of: "A", "B", "C", "D"
3. displayOrder → number, not string, starting at 1 and increasing per question in source order
4. Never skip or merge questions — one JSON question object per question in the source text
5. Never invent questions, options, or answers that are not in the source text
6. Return PURE JSON only — no text before or after, no code fences
7. No trailing commas; all strings in double quotes only`;

/** Second-round prompt — pasted with the just-posted content's JSON to get an Instagram caption back,
 * for content types (Mock Test, Quiz) that don't fit the job-posting-shaped caption prompt below. */
const STUDY_CONTENT_CAPTION_PROMPT_TEMPLATE = `Using this JSON describing a newly published {{CONTENT_LABEL}} on JobCharcha.com: {{CONTENT_JSON}}

Write an Instagram caption for JobCharcha.com's Gujarat competitive exam aspirant audience. Rules:
- Hook line in first 8 words (before "more" cutoff)
- Mention the exam/topic it covers and whether it's free or premium
- Use 3-5 relevant emojis naturally (📝✅🎯📚)
- End with a clear CTA: "Attempt now — link in bio 🔗" or "Practice now on JobCharcha.com"
- Add 15-20 hashtags on a new line: mix of broad (#SarkariNaukri #MockTest) and specific (e.g. #SSCCGLMockTest) tags
- Keep total caption under 2200 characters
- Tone: energetic, trustworthy, motivating
Return plain text only, no JSON.`;

/** Second-round prompt — pasted with the just-posted job's JSON to get an Instagram caption back. */
const INSTAGRAM_CAPTION_PROMPT_TEMPLATE = `Using this job posting JSON: {{JOB_JSON}}

Write an Instagram caption for JobCharcha.com's Gujarat government job audience. Rules:
- Hook line in first 8 words (before "more" cutoff)
- Include post name, total posts, last date
- Use 3-5 relevant emojis naturally (📢💼📅✅)
- End with a clear CTA: "Apply link in bio 🔗" or "Full details on JobCharcha.com"
- Add 15-20 hashtags on a new line: mix of broad (#SarkariNaukri #GujaratJobs) and specific (#GSSSBBharti2026) tags
- Keep total caption under 2200 characters
- Tone: energetic, trustworthy, urgent but not spammy
Return plain text only, no JSON.`;

export function buildJobExtractionPrompt(notificationText: string): string {
  return JOB_POST_EXTRACTION_PROMPT_TEMPLATE.replace('{{NOTIFICATION_TEXT}}', notificationText.trim());
}

export function buildResultExtractionPrompt(notificationText: string): string {
  return RESULT_EXTRACTION_PROMPT_TEMPLATE.replace('{{NOTIFICATION_TEXT}}', notificationText.trim());
}

export function buildAdmitCardExtractionPrompt(notificationText: string): string {
  return ADMIT_CARD_EXTRACTION_PROMPT_TEMPLATE.replace('{{NOTIFICATION_TEXT}}', notificationText.trim());
}

export function buildMockTestExtractionPrompt(notificationText: string): string {
  return MOCK_TEST_EXTRACTION_PROMPT_TEMPLATE.replace('{{NOTIFICATION_TEXT}}', notificationText.trim());
}

export function buildDailyQuizExtractionPrompt(notificationText: string): string {
  return DAILY_QUIZ_EXTRACTION_PROMPT_TEMPLATE.replace('{{NOTIFICATION_TEXT}}', notificationText.trim());
}

export function buildInstagramCaptionPrompt(jobJson: string): string {
  return INSTAGRAM_CAPTION_PROMPT_TEMPLATE.replace('{{JOB_JSON}}', jobJson);
}

export function buildStudyContentCaptionPrompt(contentJson: string, contentLabel: string): string {
  return STUDY_CONTENT_CAPTION_PROMPT_TEMPLATE
    .replace('{{CONTENT_JSON}}', contentJson)
    .replace('{{CONTENT_LABEL}}', contentLabel);
}
