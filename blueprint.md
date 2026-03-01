
# Lotto Number Generator

## Overview

This project is a web-based Lotto Number Generator that allows users to generate random sets of lottery numbers. It's built using modern web technologies, including Web Components, to create a reusable and encapsulated UI element.

## Style, Design, and Features

The application is designed to be visually appealing and user-friendly, adhering to modern design principles.

*   **Aesthetics:** The interface is clean, with a balanced layout and polished styles.
*   **Responsiveness:** The application is fully responsive and works on both mobile and desktop devices.
*   **Color Palette:** A vibrant and energetic color palette is used to create a positive user experience.
*   **Typography:** Expressive typography is used to create a clear visual hierarchy.
*   **Interactivity:** The number generation process is accompanied by subtle animations to make it more engaging.
*   **Web Component:** The core functionality is encapsulated in a `<lotto-generator>` custom element, making it reusable and easy to maintain.

## Current Plan

The current plan is to build the initial version of the Lotto Number Generator.

1.  **Update `index.html`:**
    *   Set the page title to "Lotto Number Generator".
    *   Add the `<lotto-generator>` custom element to the body.
2.  **Create the `LottoGenerator` Web Component in `main.js`:**
    *   Define a `LottoGenerator` class that extends `HTMLElement`.
    *   Create the component's UI using a Shadow DOM, including a title, a "Generate" button, and a container for the numbers.
    *   Implement the logic to generate 6 unique random numbers between 1 and 45.
    *   Style the component with modern CSS, including a color scheme, fonts, and animations.
3.  **Update `style.css`:**
    *   Apply global styles to the body for the background and font.
