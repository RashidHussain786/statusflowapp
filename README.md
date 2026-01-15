# Status Generator

This is a modern Next.js application designed to streamline the process of creating individual status reports and aggregating them into comprehensive team overviews. It features a rich text editor for detailed report creation, custom tagging, advanced text styling, and a user-friendly interface.

## Features

*   **Individual Status Creation:**
    *   Utilize a feature-rich editor to draft detailed status updates.
    *   **Rich Text Formatting:** Apply **Bold**, **Italic**, **Strikethrough**, **Underline**, and structure content with **Bullet** and **Numbered Lists**.
    *   **Custom Status Tags:** Create, manage, and seamlessly insert custom colored tags (e.g., `[Planned]`, `[Blocked]`) to categorize and highlight critical status information.
    *   **Dynamic Link Handling:** Easily include multiple URLs within your status reports by typing them directly; the application is designed to track and process these links.
*   **Team Status Aggregation:**
    *   Consolidate and review status reports from multiple team members into a comprehensive overview.
    *   **Advanced Text Styling for Review:** Enhance readability and draw attention to key points within aggregated reports by applying **Text Colors** and **Highlighting**.
    *   **Visual Tags Display:** Status updates are presented with their associated custom visual tags for quick comprehension.
*   **Responsive User Interface:** A clean and adaptive design ensures optimal viewing and interaction across various screen sizes.
*   **Dark Mode Support:** Toggle between light and dark themes for enhanced readability and user preference.
*   **Type-Safe Development:** Built with TypeScript for improved code quality, reliability, and maintainability.

## Technologies Used

*   **Next.js 14:** A powerful React framework for building full-stack web applications.
*   **React 18:** For building dynamic and interactive user interfaces.
*   **TypeScript:** Superset of JavaScript that provides static typing for robust development.
*   **Tailwind CSS:** A utility-first CSS framework for highly efficient and customizable styling.
*   **Tiptap:** A headless editor framework for rich text editing capabilities.
    *   Extensions include: `StarterKit` (with basic formatting), `UnderlineExtension`, `OrderedList`, `VisualTagsExtension` (for custom tags), `TextColor`, and `TextHighlight`.
    *   `@tiptap/extension-link` is available in the project for potential link functionalities.
*   **Radix UI:** High-quality, accessible UI component primitives for building robust design systems.
*   **Lucide React:** A comprehensive collection of beautiful and customizable open-source icons.
*   **next-themes:** Simplifies theme switching (light/dark mode) implementation.
*   **clsx & tailwind-merge:** Utilities for intelligently combining and overriding CSS class names.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (LTS version recommended)
*   A package manager: npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/statusgenrator.git # Replace with your actual repository URL
    cd statusgenrator
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

### Running the Development Server

To run the application in development mode:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The page will auto-update as you make changes.

### Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
# or
pnpm build
# or
bun build
```

This command compiles the application into an optimized build located in the `.next` folder.

### Running in Production

To start the production server after building:

```bash
npm run start
# or
yarn start
# or
pnpm start
# or
bun start
```

## Usage

*   **Create Status (`/create-status`):** Navigate to this page to access the rich text editor. Here, you can compose new status reports using all available formatting options, insert custom tags, and include relevant links by typing them directly into the editor.
*   **Merge Team Status (`/merge-team-status`):** Visit this page to view aggregated status reports from your team. This interface allows you to review and annotate reports, utilizing text coloring and highlighting features to draw attention to critical updates or changes.

---
