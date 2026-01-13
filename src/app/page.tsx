'use client';

import Link from 'next/link';
import { ArrowRight, Users, FileText, Shield, Zap, Link2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 2xl:px-6 py-4 2xl:py-6 max-w-5xl 2xl:max-w-7xl">
          <div className="flex items-center justify-between">
            <Link className="flex items-center gap-3" href="/">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <span className="text-primary-foreground font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">StatusFlowApp</h1>
                <p className="text-sm text-muted-foreground">Privacy-First Team Status Generator</p>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              {/* Trust indicators */}
              <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>🔒</span>
                  <span>No backend</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <span>URL storage</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 2xl:px-6 py-12 2xl:py-16 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Your<span className="text-primary"> Team Status</span> Updates
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create shareable status links for your daily updates, then combine them into comprehensive team reports.
            No accounts, no backend, just pure productivity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/create-status"
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Create Individual Status
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/merge-team-status"
            className="inline-flex items-center gap-3 px-8 py-4 border border-border bg-card text-card-foreground rounded-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Users className="w-5 h-5" />
            Merge Team Status
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Individual Status</h3>
            <p className="text-sm text-muted-foreground">
              Create rich, formatted status updates with links, lists, and formatting. Generate shareable links instantly.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Team Aggregation</h3>
            <p className="text-sm text-muted-foreground">
              Combine multiple individual status links into organized team reports. Group by person or application.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Your data never leaves your browser. All status information is stored in URLs only.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-card border border-border rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-2">Create Status</h3>
              <p className="text-sm text-muted-foreground">
                Each team member creates their status update with rich formatting and generates a shareable link.
              </p>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-2">Share Links</h3>
              <p className="text-sm text-muted-foreground">
                Team members share their status links via chat, email, or any communication channel.
              </p>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">Merge Reports</h3>
              <p className="text-sm text-muted-foreground">
                Combine all individual links into organized team status reports, grouped by person or application.
              </p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-linear-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Why StatusFlowApp?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">Generate status links instantly with rich text editing</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Privacy Focused</h3>
                <p className="text-sm text-muted-foreground">Zero backend storage, works completely offline</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Link2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">URL Based</h3>
                <p className="text-sm text-muted-foreground">All data stored in shareable URLs only</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Team Ready</h3>
                <p className="text-sm text-muted-foreground">Organize status by person or application seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-16 2xl:mt-20">
        <div className="container mx-auto px-4 2xl:px-6 py-6 2xl:py-8 max-w-5xl 2xl:max-w-7xl">
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
