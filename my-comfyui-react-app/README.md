# My ComfyUI Frontend

A modern, React-based frontend for interacting with ComfyUI, designed for a streamlined and aesthetic user experience. This application features a custom control panel, character selection, and advanced generation settings.

## Features

-   **Modern UI**: Built with **React 19** and **Tailwind CSS** for a sleek, dark-themed interface.
-   **Resizable Layout**: customizable workspace with resizable panels for the Model Rail, Output Preview, and Control Panel.
-   **Character Selection**: Visual character selection with thumbnail previews.
-   **Advanced Generation Settings**:
    -   **Sticky Prompt Header**: Always-visible prompt input with dynamic transparency.
    -   **Resolution Templates**: Quick-select buttons for common resolutions (HD, Full HD, etc.) with aspect ratio preview.
    -   **ControlNet & LoRA**: Dedicated sections for managing LoRA models and ControlNet settings.
    -   **Hires Fix**: Integrated High-Res Fix settings.

## Tech Stack

-   **Frontend Framework**: [React](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Layout**: [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
-   **Icons**: [Lucide React](https://lucide.dev/)

## Setup & Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Project Structure

-   `src/components/`: Reusable UI components (ControlPanel, ModelRail, etc.).
-   `src/context/`: React Context for state management (GenerationContext, SettingsContext).
-   `src/utils/`: Utility functions and constants.
-   `src/App.jsx`: Main application layout and routing.
