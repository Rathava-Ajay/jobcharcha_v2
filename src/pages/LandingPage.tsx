import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { JobsSection } from '../components/JobsSection';
import { ExamsResultsSection } from '../components/ExamsResultsSection';
import { MockTestsSection } from '../components/MockTestsSection';
import { LearningResourcesSection } from '../components/LearningResourcesSection';
import { SchemesNewsSection } from '../components/SchemesNewsSection';
import { PricingSection } from '../components/PricingSection';
import { Footer } from '../components/Footer';
import { ExamTrackerSidebar } from '../components/ExamTrackerSidebar';
import { useAuth } from '../context/AuthContext';

import { Job } from '../types';
import { searchJobs } from '../api/jobs';
import { getAdmitCards, ApiAdmitCardListItem } from '../api/admitCards';
import { getResults, ApiResultListItem } from '../api/results';
import { searchTests, ApiTestListItem } from '../api/tests';
import { searchOldPapers, ApiOldPaperListItem } from '../api/oldPapers';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedQualification, setSelectedQualification] = useState('All Qualifications');
  const [selectedLocation, setSelectedLocation] = useState('All India / Central');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [totalJobCount, setTotalJobCount] = useState(0);
  const LANDING_JOB_LIMIT = 10;
  const [mockTests, setMockTests] = useState<ApiTestListItem[]>([]);
  const [oldPapers, setOldPapers] = useState<ApiOldPaperListItem[]>([]);
  const [showExamTrackerSidebar, setShowExamTrackerSidebar] = useState(false);

  const [admitCards, setAdmitCards] = useState<ApiAdmitCardListItem[]>([]);
  const [results, setResults] = useState<ApiResultListItem[]>([]);
  const [totalOldPapersCount, setTotalOldPapersCount] = useState(0);

  useEffect(() => {
    getAdmitCards().then(setAdmitCards).catch(() => setAdmitCards([]));
    getResults().then(setResults).catch(() => setResults([]));
    searchTests().then((all) => setMockTests(all.slice(0, 6))).catch(() => setMockTests([]));
    searchOldPapers()
      .then((all) => {
        setOldPapers(all.slice(0, 6));
        setTotalOldPapersCount(all.length);
      })
      .catch(() => setOldPapers([]));
  }, []);

  useEffect(() => {
    document.title = 'JobCharcha - Verified Government & Private Job Vacancies 2026';
  }, []);

  // Re-queries the server whenever a filter changes, debounced so the search textbox doesn't
  // fire a request per keystroke — category/qualification/location changes still apply instantly
  // since only `searchQuery` needs debouncing.
  useEffect(() => {
    setJobsLoading(true);
    const handle = setTimeout(() => {
      searchJobs({
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        qualification: selectedQualification !== 'All Qualifications' ? selectedQualification : undefined,
        location: selectedLocation !== 'All India / Central' ? selectedLocation : undefined,
        page: 1,
        pageSize: LANDING_JOB_LIMIT,
      })
        .then((res) => {
          setJobs(res.items);
          setTotalJobCount(res.totalCount);
        })
        .catch(() => setJobs([]))
        .finally(() => setJobsLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedCategory, selectedQualification, selectedLocation]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Deep-link support for Navbar's section links when arriving from another page (e.g. /#jobs-section).
  // Re-runs once job cards finish loading too, since that async content shifts section
  // positions after the first paint and would otherwise leave the scroll short.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const timer = setTimeout(() => scrollToSection(id), jobsLoading ? 0 : 150);
    return () => clearTimeout(timer);
  }, [location.hash, jobsLoading]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col">
      <Navbar
        user={user}
        onOpenExamTracker={() => setShowExamTrackerSidebar(true)}
      />

      <main className="flex-1">
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedQualification={selectedQualification}
          setSelectedQualification={setSelectedQualification}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          onOpenCutoffPredictor={() => navigate('/cutoff-predictor')}
          onOpenQuickQuiz={() => navigate('/daily-quiz')}
          onSelectTab={(tabId) => scrollToSection(`${tabId}-section`)}
          totalJobCount={totalJobCount}
          totalOldPapersCount={totalOldPapersCount}
        />

        <div id="jobs-section">
          {jobsLoading ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading latest vacancies…</div>
          ) : (
            <JobsSection
              jobs={jobs}
              use3d
              onSelectJob={(job) => navigate(`/jobs/${job.slug || job.id}`)}
              onOpenNewJobModal={() => navigate('/login')}
              footerSlot={
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    onClick={() => navigate('/jobs')}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold px-8 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>View All {totalJobCount > 0 ? totalJobCount.toLocaleString() : ''} Jobs</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Showing {jobs.length} of {totalJobCount.toLocaleString()} verified listings
                  </span>
                </div>
              }
            />
          )}
        </div>

        <div id="exams-section">
          <ExamsResultsSection
            admitCards={admitCards}
            results={results}
            onSelectAdmitCard={(slug) => navigate(`/admit-cards/${slug}`)}
            onSelectResult={(slug) => navigate(`/results/${slug}`)}
            onViewAllAdmitCards={() => navigate('/admit-cards')}
            onViewAllResults={() => navigate('/results')}
            onOpenCutoffPredictor={(slug) => navigate(slug ? `/cutoff-predictor?slug=${encodeURIComponent(slug)}` : '/cutoff-predictor')}
          />
        </div>

        <div id="mocktests-section">
          <MockTestsSection
            mockTests={mockTests}
            oldPapers={oldPapers}
            onStartFullMockTest={(test) => navigate(`/mock-tests/${test.slug}`)}
            onViewAllMockTests={() => navigate('/mock-tests')}
            onSelectOldPaper={(slug) => navigate(`/old-papers/${slug}`)}
            onViewAllOldPapers={() => navigate('/old-papers')}
            onOpenDailyQuiz={() => navigate('/daily-quiz')}
          />
        </div>

        <LearningResourcesSection />

        <div id="schemes-section">
          <SchemesNewsSection />
        </div>

        <div id="pricing-section">
          <PricingSection
            activeRole="aspirant"
            setActiveRole={() => {}}
          />
        </div>
      </main>

      <Footer use3d />

      <ExamTrackerSidebar
        isOpen={showExamTrackerSidebar}
        onClose={() => setShowExamTrackerSidebar(false)}
        onOpenMockTest={() => scrollToSection('mocktests-section')}
      />
    </div>
  );
}
