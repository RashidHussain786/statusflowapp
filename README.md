# StatusFlowApp - Privacy-First Team Status Generator

A 100% frontend, privacy-first web tool for creating and merging team status updates. All data lives only inside URL fragments - no backend, no login, no storage.

## 🚀 Features

### Individual Contributors
- Create shareable status links with rich text formatting
- Support for multiple applications per person
- Rich text formatting (bold, italic, underline, bullet lists, numbered lists)
- URL-encoded data with LZ compression
- Character limits and validation

### Team Leads
- Aggregate multiple individual status links
- Two merge modes: Application-wise and Person-wise
- Formatted output generation
- Copy to clipboard and download functionality

### Privacy & Security
- ✅ No backend storage
- ✅ No login required
- ✅ No analytics or tracking
- ✅ Works offline after load
- ✅ Data never leaves your browser
- ✅ URL fragment-based storage (#s=...)

## 🛠 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 with custom theme system
- **Rich Text Editor**: TipTap React (pure HTML output)
- **Compression**: LZ-string for URL encoding
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with theme system
│   ├── layout.tsx           # Root layout with theme provider
│   └── page.tsx             # Main page with tab navigation
├── components/
│   ├── main-nav.tsx         # Navigation between flows
│   ├── theme-provider.tsx   # Theme context and toggle
│   ├── theme-toggle.tsx     # Theme toggle button
│   ├── individual-status-form.tsx  # Status creation form
│   ├── team-aggregation-form.tsx   # Team aggregation form
│   └── rich-text-editor.tsx        # Rich text editor component
└── lib/
    ├── types.ts             # TypeScript type definitions
    └── encoding.ts          # URL encoding/decoding utilities
```

## 🎯 User Flows

### Flow 1: Individual Status Creation
1. Enter name and date
2. Add one or more applications
3. Write status updates with rich formatting
4. Generate and copy shareable link

### Flow 2: Team Status Aggregation
1. Paste multiple status links (one per line)
2. Choose merge mode (app-wise vs person-wise)
3. Generate formatted team report
4. Copy or download the final output

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 📊 Data Model

### StatusPayload (URL-encoded)
```typescript
{
  v: 1,              // schema version
  name: string,      // "Rashid"
  date: string,      // "2026-01-08"
  apps: AppStatus[]  // multiple apps
}
```

### AppStatus
```typescript
{
  app: string;       // "Payments"
  content: string;   // HTML content from TipTap rich text editor
}
```

## 🔄 Merge Modes

### Application-wise (Default)
```html
<h3>Payments Application:</h3>
<ul>
  <li><strong>Rashid:</strong> UPI validation fix deployed</li>
  <li><strong>Aman:</strong> Load testing completed</li>
</ul>

<h3>Auth Service:</h3>
<ul>
  <li><strong>Rashid:</strong> Token refresh bug fixed</li>
</ul>
```

### Person-wise
```html
<h3>Rashid:</h3>
<ul>
  <li><strong>Payments:</strong> UPI validation fix deployed</li>
  <li><strong>Auth:</strong> Token refresh bug fixed</li>
</ul>

<h3>Aman:</h3>
<ul>
  <li><strong>Payments:</strong> Load testing completed</li>
</ul>
```

## 📏 Validation Rules

- Max content per app: 600 characters (based on plain text length)
- Max encoded URL size: 1,800 characters
- One payload per person per day
- Rich text formatting: HTML output with bold, italic, underline, strikethrough, bullet lists, numbered lists

## 🌙 Theme System

- Light/Dark mode toggle
- System preference detection
- Persistent theme storage
- CSS custom properties for theming

## 🚀 Deployment

Deploy to any static hosting service (Vercel, Netlify, etc.) since it's 100% frontend.

```bash
npm run build
# Deploy the .next/static and .next/serverless folders
```

## 🤝 Contributing

This is a focused MVP implementation. For enhancements, consider:
- Additional rich text formatting options
- Better mobile responsiveness
- Export to different formats (PDF, etc.)
- Status history/timeline features

## 📄 License

MIT License - feel free to use and modify for your own privacy-first tools.