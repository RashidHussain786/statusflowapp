# Status Generator

This is a modern Next.js application designed to streamline the process of creating individual status reports and aggregating them into comprehensive team overviews. It features a rich text editor for detailed report creation, custom tagging, advanced text styling, and a user-friendly interface.

## Features

*   **Individual Status Creation:**
    *   Utilize a feature-rich editor to draft detailed status updates.
    *   **Rich Text Formatting:** Apply **Bold**, **Italic**, **Strikethrough**, **Underline**, and structure content with **Bullet** and **Numbered Lists**.
    *   **Mandatory Validation:** Enforces professional standards by requiring status items to be in lists with bracketed tags.
    *   **Custom Status Tags:** Create, manage, and seamlessly insert custom colored tags (e.g., `[Planned]`, `[Blocked]`) to categorize status information.
    *   **Dynamic Link Handling:** Share status payloads via unique, privacy-first URLs with no backend required.
*   **Weekly Report Generation:**
    *   **Advanced Formatting:** Define custom categories and map multiple tags to them.
    *   **Drag & Drop Reordering:** Organically organize your report headers with a premium grip-based interface.
    *   **Non-Exclusive Mapping:** Items appear in every category they match (e.g., `[ENH][WORKING]` appears in both "Enhancements" and "Progress").
    *   **Prioritized Deployment:** Intelligent grouping for finished work that persists across category reordering.
*   **Team Status Aggregation:**
    *   Consolidate and review status reports from multiple team members into a comprehensive overview.
    *   **Advanced Text Styling for Review:** Enhance readability with **Text Colors** and **Highlighting**.
    *   **Visual Tags Display:** Status updates are presented with their associated custom visual tags.
*   **Responsive User Interface:** A clean and adaptive design ensuring optimal viewing across all devices.
*   **Dark Mode Support:** Toggle between light and dark themes for enhanced readability.
*   **Type-Safe Development:** Built with TypeScript for improved code quality and maintainability.

## Technologies Used

*   **Next.js 16:** A powerful React framework for building full-stack web applications.
*   **React 18:** For building dynamic and interactive user interfaces.
*   **TypeScript:** Statics for robust development.
*   **Tailwind CSS v4:** A utility-first CSS framework for efficient and customizable styling.
*   **Tiptap:** A headless editor framework for rich text editing.
*   **Dexie.js:** IndexedDB wrapper for local status persistence.
*   **Lucide React:** A comprehensive collection of customizable open-source icons.
*   **next-themes:** Simplifies theme switching (light/dark mode).

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   A package manager: npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RashidHussain786/statusflowapp.git
    cd statusflowapp
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

To run the application in development mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

To build the application for production:

```bash
npm run build
npm run start
```

## Usage

*   **Create Status (`/create-status`):** Composed new status reports with validation and custom tags.
*   **Weekly Report (`/create-weekly`):** Aggregate multiple daily links into a structured weekly summary with custom rules.
*   **Merge Team Status (`/merge-team-status`):** Consolidated view of team members' status reports with review tools.

---
