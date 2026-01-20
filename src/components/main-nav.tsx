'use client';

import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function MainNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter:blur(12px)]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <div className="flex-1 flex items-center">
          <Link className="flex items-center space-x-2" href="/">
            <div className="flex items-center justify-center w-8 h-8 bg-foreground rounded-lg">
              <span className="text-background font-bold text-lg">S</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl">StatusFlowApp</div>
              <div className="text-xs text-muted-foreground mt-0.5">Privacy-First Team Status Generator</div>
            </div>
          </Link>
        </div>
        <nav className="hidden md:flex items-center justify-center space-x-6 text-sm font-medium">
          <Link href="/create-status" className="hover:text-primary transition-colors">Individual</Link>
          <Link href="/merge-team-status" className="hover:text-primary transition-colors">Team Merge</Link>
          <Link href="/create-weekly" className="hover:text-primary transition-colors">Weekly</Link>
          <Link href="/history" className="hover:text-primary transition-colors">History</Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}