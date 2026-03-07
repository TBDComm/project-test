# Project Blueprint: YouTube Video AI Analyzer

## Project Overview
A high-performance, aesthetically pleasing web application that analyzes YouTube videos. It provides a "premium" experience with AI-driven insights, glassmorphism UI, and community interaction.

## Core Features
- **YouTube Link Analysis:** Input field for YouTube URLs with instant preview and mock AI analysis data.
- **Visual Analytics:** Dashboard showing engagement metrics, sentiment analysis, and keyword extraction.
- **Partnership Inquiry:** Integrated Formspree system (`https://formspree.io/f/xlgpezwr`) for business inquiries.
- **Community Discussion:** Disqus comment system for user feedback and discussion.
- **Theme Customization:** Support for Dark and Light modes with persistent user preference.

## Design Philosophy
- **Aesthetics:** "Modern Dark/Light Hybrid" with `oklch` dynamic colors.
- **Components:** Custom Web Components for analytics cards.
- **Effects:** Backdrop filters (blur), multi-layered shadows, and subtle noise textures.
- **Interactivity:** Smooth transitions between themes and real-time dashboard updates.

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules), HTML5, CSS3 (Baseline).
- **Integrations:** Formspree (Forms), Disqus (Comments).

## Implementation Steps
1.  **Refactor index.html:** Add theme toggle button; ensure Disqus container has proper visibility.
2.  **Update style.css:** Define theme variables using `oklch`; add dark mode overrides and toggle button styles.
3.  **Rewrite main.js:** Implement Theme Manager (Dark/Light toggle with localStorage) and refine YouTube analysis logic.
4.  **Verification:** Confirm Disqus script loads and responds to domain troubleshooting.
