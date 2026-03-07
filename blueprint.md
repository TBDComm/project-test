# Project Blueprint: University Course Registration System & Partnership Inquiry

## Project Overview
A modern, framework-less web application for university course registration, featuring real-time timetable management and now, a premium partnership inquiry system.

## Current Features & Design
- **Core Functionality:** Course searching, registration, and visual timetable representation.
- **Design Philosophy:** Clean, professional interface with a "Korea University Port" theme.
- **Tech Stack:** HTML5, CSS3 (Baseline features), Vanilla JavaScript (ES Modules).
- **Styling:** Responsive layout using CSS Grid and Flexbox, typography-focused design.

## Planned Changes: Partnership Inquiry Form
### Purpose
To allow potential partners to submit inquiry forms directly via the website using Formspree.

### Implementation Plan
1.  **UI Integration:**
    - Add a "제휴 문의" (Partnership Inquiry) button in the header.
    - Implement a modern modal dialog for the form to keep the user context.
2.  **Form Design:**
    - **Fields:** Name (이름), Email (이메일), Company (업체명), Inquiry Type (문의 유형), Message (내용).
    - **Aesthetics:** Glassmorphism effect for the modal, `oklch` color palettes, subtle noise texture, and deep shadows for a "premium" feel.
    - **Accessibility:** Proper labels, ARIA roles for the modal, and keyboard navigation support.
3.  **Functionality:**
    - Integrate Formspree (Endpoint: `https://formspree.io/f/xlgpezwr`).
    - Use JavaScript to handle modal states and provide visual feedback upon submission.
    - Ensure responsive design using Container Queries where applicable.

### Technical Details
- **Formspree Action:** `https://formspree.io/f/xlgpezwr`
- **CSS Techniques:** `@layer` for style organization, `:has()` for state-based styling, and CSS Variables for theming.
