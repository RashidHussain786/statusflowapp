'use client';

import { ThemeToggle } from './theme-toggle';

export function MainNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter:blur(12px)]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <div className="mr-8 flex items-center">
          <a className="flex items-center space-x-2" href="/">
            <div className="flex items-center justify-center w-8 h-8 bg-foreground rounded-lg">
              <span className="text-background font-bold text-lg">S</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl">StatusFlowApp</div>
              <div className="text-xs text-muted-foreground mt-0.5">Privacy-First Team Status Generator</div>
            </div>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Trust indicators */}
          <div className="hidden lg:flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>🔒</span>
              <span>No backend</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>📱</span>
              <span>Works offline</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔗</span>
              <span>URL storage</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}