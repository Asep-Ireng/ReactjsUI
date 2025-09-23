# ComfyUI React App

This project is a React-based user interface for interacting with a ComfyUI backend. It provides a user-friendly way to generate images and manage workflows.

## Architecture Overview

The application consists of three main parts:

1.  **Frontend:** A React application that provides the user interface.
2.  **Gateway:** A Python FastAPI server that acts as a bridge between the frontend and the ComfyUI backend.
3.  **Backend:** The core ComfyUI service for image generation.

Communication between the React frontend and the FastAPI gateway is handled via WebSockets, allowing for real-time updates.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and npm (or yarn) installed on your machine.

*   [Node.js](https://nodejs.org/)
*   [npm](https://www.npmjs.com/get-npm)

### Installing

1.  Clone the repository:
    ```sh
    git clone https://github.com/Asep-Ireng/ReactjsUI.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd ReactjsUI/my-comfyui-react-app
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

## Running the Application

To run the application in development mode, use the following command:

```sh
npm run dev
```

or

```sh
npm start
```

This will start the development server and open the application in your default browser.

## Project Structure

The project is organized into the following directories:

*   `src/api`: Contains the logic for making API calls to the ComfyUI backend.
*   `src/assets`: Contains static assets like images and icons.
*   `src/components`: Contains the reusable React components that make up the UI.
*   `src/context`: Contains React context providers for managing global state.
*   `src/services`: Contains business logic and services that are not directly related to UI components.
*   `src/utils`: Contains utility functions and constants.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.