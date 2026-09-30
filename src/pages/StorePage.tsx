import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ECommerceMarketplaceSection } from '../components/ECommerceMarketplaceSection';
import { useAuth } from '../context/AuthContext';

export default function StorePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1">
        <ECommerceMarketplaceSection />
      </main>
      <Footer />
    </div>
  );
}
