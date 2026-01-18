'use client';

import { Plus, Copy, Check } from 'lucide-react';
import { useIndividualStatusForm } from '../hooks/use-individual-status-form';
import { ApplicationInput } from './application-input';

export function IndividualStatusForm() {
  const {
    name, setName,
    date, setDate,
    apps,
    expandedApps,
    generatedUrls,
    copied,
    error,
    currentUrlLength,
    statusLink, setStatusLink,
    addApp, removeApp, toggleAppExpansion, updateApp, copyToClipboard,
    isValid,
    loadYesterdayStatus,
  } = useIndividualStatusForm();

  return (
    <div className="max-w-none">
      <div className="mb-6 2xl:mb-8">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight text-foreground mb-2">
          Create Your Status Link
        </h1>
        <p className="text-muted-foreground text-base 2xl:text-lg">
          Generate a shareable link containing your daily status updates. No account required.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="status-link-input" className="block text-sm font-medium text-muted-foreground mb-2">
          Or paste a status link to edit
        </label>
        <textarea
          id="status-link-input"
          value={statusLink}
          onChange={(e) => setStatusLink(e.target.value)}
          placeholder="Paste a previously generated status link here..."
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          rows={2}
        />
      </div>


      <div className="bg-card border border-border rounded-lg p-4 2xl:p-6 shadow-sm mb-6 2xl:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-4 2xl:mb-4">
          <h2 className="text-base 2xl:text-lg font-semibold text-card-foreground">Applications</h2>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <input
                id="name-inline"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name *"
                className={`w-full md:w-auto px-3 py-1.5 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${!name.trim()
                  ? 'border-destructive focus:ring-destructive/20'
                  : 'border-input focus:ring-ring'
                  }`}
                required
              />
              {!name.trim() && (
                <span className="absolute -top-1 -right-1 text-xs text-destructive font-medium">*</span>
              )}
            </div>
            <input
              id="date-inline"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full md:w-auto px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            />

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 md:gap-3">
              <button
                onClick={loadYesterdayStatus}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors whitespace-nowrap"
                title="Load status from the last saved date"
              >
                Load Previous
              </button>
              <button
                type="button"
                onClick={addApp}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Application
              </button>
            </div>

            <button
              onClick={copyToClipboard}
              disabled={!isValid || generatedUrls.length === 0 || !name.trim()}
              title={!name.trim() ? 'Please enter your name first' : generatedUrls.length > 0 ? `Copy ${generatedUrls.length > 1 ? 'all shareable links' : 'shareable link'}` : 'Complete the form to generate link'}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${!isValid || generatedUrls.length === 0 || !name.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : generatedUrls.length > 1 ? `Copy All (${generatedUrls.length})` : 'Copy Link'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {apps.map((app, index) => (
            <ApplicationInput
              key={index}
              app={app}
              index={index}
              isExpanded={expandedApps.has(index)}
              onUpdate={updateApp}
              onRemove={removeApp}
              onToggleExpand={toggleAppExpansion}
              currentUrlLength={currentUrlLength}
              urlCount={generatedUrls.length}
              canRemove={apps.length > 1}
            />
          ))}
        </div>
      </div>


      <div className="bg-linear-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-lg">🔒</span>
          Privacy & Security
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">

          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>No account or login needed</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>No analytics or tracking</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Works completely offline</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Data stays in URLs only</span>
          </li>
        </ul>
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Pro tip:</strong> Open DevTools → Network tab → you'll see zero requests. Your data never leaves your browser.
          </p>
        </div>
      </div>
    </div>
  );
}