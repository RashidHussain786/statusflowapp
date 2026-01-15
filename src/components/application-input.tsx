import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { AppStatus } from '../lib/types';

interface ApplicationInputProps {
  app: AppStatus;
  index: number;
  isExpanded: boolean;
  onUpdate: (index: number, field: keyof AppStatus, value: string) => void;
  onRemove: (index: number) => void;
  onToggleExpand: (index: number) => void;
  currentUrlLength: number;
  urlCount: number;
  canRemove: boolean;
}

export function ApplicationInput({
  app,
  index,
  isExpanded,
  onUpdate,
  onRemove,
  onToggleExpand,
  currentUrlLength,
  urlCount,
  canRemove,
}: ApplicationInputProps) {
  return (
    <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={() => onToggleExpand(index)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title={isExpanded ? "Collapse application" : "Expand application"}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <input
            type="text"
            value={app.app}
            onChange={(e) => onUpdate(index, 'app', e.target.value)}
            placeholder="Application name (e.g., Payments, Auth, Dashboard)"
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="ml-3 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Remove application"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="px-4 pb-4">
          <RichTextEditor
            value={app.content}
            onChange={(value) => onUpdate(index, 'content', value)}
            placeholder="Describe your updates for this application..."
            currentUrlLength={currentUrlLength}
            urlCount={urlCount}
          />
        </div>
      )}
    </div>
  );
}
