# Project Blueprint: YouTube Video AI Analyzer

## Project Overview
A high-performance, aesthetically pleasing web application that analyzes YouTube videos. It provides a "premium" experience with AI-driven insights, glassmorphism UI, and community interaction.

## Core Features
- **YouTube Link Analysis:** Input field for YouTube URLs with instant preview and mock AI analysis data.
- **Visual Analytics:** Dashboard showing engagement metrics, sentiment analysis, and keyword extraction.
- **Partnership Inquiry:** Integrated Formspree system (`https://formspree.io/f/xlgpezwr`) for business inquiries.
- **Community Discussion:** Disqus comment system for user feedback and discussion.

## Design Philosophy
- **Aesthetics:** "Modern Dark/Light Hybrid" with `oklch` dynamic colors.
- **Components:** Custom Web Components for analytics cards.
- **Effects:** Backdrop filters (blur), multi-layered shadows, and subtle noise textures.

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules), HTML5, CSS3 (Baseline).
- **Integrations:** Formspree (Forms), Disqus (Comments), Three.js (Optional 3D background elements).

## Implementation Steps
1.  **Refactor index.html:** Remove course registration elements; add Video Input, Analysis Dashboard, and Disqus thread.
2.  **Update style.css:** Implement a cleaner, analysis-focused layout with a focus on "Data Visualization" aesthetics.
3.  **Rewrite main.js:** Logic for parsing YouTube IDs, generating mock analysis, and managing UI states.
4.  **Verification:** Ensure all integrations (Formspree, Disqus) load correctly.
