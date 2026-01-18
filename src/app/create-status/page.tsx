'use client';

import { MainNav } from '@/components/main-nav';
import { IndividualStatusForm } from '@/components/individual-status-form';
import { Footer } from '@/components/footer';

export default function CreateStatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto px-4 2xl:px-6 py-6 2xl:py-8 max-w-5xl 2xl:max-w-7xl">
        <IndividualStatusForm />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}