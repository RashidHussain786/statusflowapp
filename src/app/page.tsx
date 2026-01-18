'use client';

import Link from 'next/link';
import { ArrowRight, Users, FileText, Shield, Zap, Link2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/footer';

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
        <div className="flex flex-col items-center justify-center gap-6 mb-16">
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <Link
              href="/create-status"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg min-w-[280px]"
            >
              <FileText className="w-5 h-5" />
              Create Individual Status
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/merge-team-status"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-border bg-card text-card-foreground rounded-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors min-w-[280px]"
            >
              <Users className="w-5 h-5" />
              Merge Team Status
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <Link
            href="/create-weekly"
            className="inline-flex items-center gap-3 px-8 py-4 border border-border bg-card text-card-foreground rounded-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span className="text-xl">📅</span>
            Weekly Report
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Individual Status</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Create rich, formatted status updates with links, lists, and formatting. Generate shareable links instantly.
            </p>
            <div className="text-left mt-2 text-xs bg-muted/50 border border-border p-3 rounded-md text-foreground">
              <strong className="text-primary">Best Practices:</strong>
              <ul className="list-disc list-inside mt-1 ml-1 text-muted-foreground space-y-1">
                <li>Use <strong>Tags (Labels)</strong> for every status item.</li>
                <li>Use <strong>Bullet Points</strong> or <strong>Numbered Lists</strong>.</li>
                <li>Always use <strong>"Load Previous"</strong> to start a new day (essential for Weekly Reports).</li>
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Team Aggregation</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Combine multiple individual status links into organized team reports. Group by person or application.
            </p>
            <div className="text-left mt-2 text-xs bg-muted/50 border border-border p-3 rounded-md text-foreground">
              <strong className="text-primary">Tip:</strong> Collect <strong className="text-primary">Same Day</strong> links from all team members to generate a complete daily snapshot.
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Weekly Report</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Paste your daily status links to auto-generate a weekly summary. Smartly tracks what's "In Progress" vs "Deployed".
            </p>
            <div className="text-left mt-2 text-xs bg-muted/50 border border-border p-3 rounded-md text-foreground">
              <strong className="text-primary">Requirement:</strong> accurate weekly tracking requires that you maintained the same task chain (using "Load Previous") throughout the week.
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Privacy First</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your data never leaves your browser. All status information is compressed and stored within the shareable URLs themselves.
            </p>
            <div className="text-left mt-2 text-xs bg-muted/50 border border-border p-3 rounded-md text-foreground">
              <strong className="text-primary">Security Features:</strong>
              <ul className="list-disc list-inside mt-1 ml-1 text-muted-foreground space-y-1">
                <li>No Database / Server Storage</li>
                <li>No Analytics / Tracking</li>
                <li>Zero Data Leaks</li>
              </ul>
            </div>
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
      {/* Footer */}
      <Footer />
    </div>
  );
}
