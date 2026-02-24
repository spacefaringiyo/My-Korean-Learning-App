# My Korean Learning App

A React + Vite application for learning Korean.

## Setup and Local Development

To run the application locally on your machine:

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    ```
    Once the server starts, open [http://localhost:5173](http://localhost:5173) in your browser.

## Data Management

The app uses YAML files in `src/data/raw_modules/` to generate the learning content.
- To rebuild the data modules: `npm run data:build`
- This is automatically handled when running `npm run dev` or `npm run build`.

## Deployment

The project is configured for GitHub Pages.
- To deploy: `npm run deploy`
