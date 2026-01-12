'use client';

import { MainNav } from '@/components/main-nav';
import { TeamAggregationForm } from '@/components/team-aggregation-form';

export default function MergeTeamStatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <TeamAggregationForm />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 bg-foreground rounded-lg">
                  <span className="text-background font-bold text-lg">S</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    StatusFlowApp
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Privacy-First Team Status Generator
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Built with Next.js, Tailwind CSS, and LZ compression
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span>Zero backend</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span>Offline-first</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔗</span>
                <span>URL storage</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}