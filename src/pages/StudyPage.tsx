import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { StudyMaterialSection } from '../components/StudyMaterialSection';
import { useAuth } from '../context/AuthContext';

export default function StudyPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <StudyMaterialSection />
      </main>
      <Footer />
    </div>
  );
}
