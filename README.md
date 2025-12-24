# TipsyContacts

## Elite Networking. Zero Amnesia.

TipsyContacts is an AI-powered tool designed to streamline your post-networking follow-ups. Stop manually inputting contact details from business cards or LinkedIn screenshots. Simply snap a photo or record a quick voice memo, and let our AI extract and organize the information directly into your Google Sheet, ensuring you never forget a valuable connection.

## Features

*   **Intelligent Data Extraction**: Upload images (business cards, LinkedIn profiles) or record voice notes. Gemini AI processes the input to extract relevant contact details like name, company, title, email, phone, and more.
*   **Voice Memo Integration**: Speak freely about your new connection, and the AI will transcribe and integrate key details into the contact profile.
*   **Editable Contact Forms**: Review and easily refine extracted information before saving, with smart suggestions for missing fields.
*   **Google Sheets Sync**: Seamlessly export structured contact data directly to a pre-configured Google Sheet, complete with automatic "Next Contact Due" calculations.
*   **Persistent Settings**: Your Google Sheets connection URL is saved in your browser's local storage, so you only set it up once.

## Getting Started

To get TipsyContacts up and running, you'll need a Google Cloud Project with the Gemini API enabled and a Google Sheet set up for integration.

### Prerequisites

*   **Node.js**: [Download & Install Node.js](https://nodejs.org/en/download/) (LTS recommended).
*   **npm** or **Yarn**: Usually comes with Node.js.
*   **Google Account**: Required for Google Cloud and Google Sheets.
*   **Google Cloud Project**: A project with the Gemini API enabled. [Learn how to set up](https://cloud.google.com/gemini/docs/quickstarts/nodejs).
*   **Google Sheet**: An empty or existing Google Sheet where you want to store your contacts.

### 1. Gemini API Key Setup

TipsyContacts uses the Google Gemini API to power its AI capabilities. The API key *must* be provided via an environment variable that is processed at build time for client-side use.

#### Obtaining Your API Key

1.  Go to the [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Create a new API key or select an existing one.
3.  Ensure your Google Cloud project associated with the API key has billing enabled if you plan for high usage or specific models.

#### Setting the API Key

To handle `process.env.API_KEY` in a browser application, a build tool is required. We'll use **Vite** for this.

**Project Initialization (if you haven't already)**:

First, ensure your project is set up to use Vite. If you previously only had `index.html` and `index.tsx` without `package.json` or a build tool, you'll need to add these:

1.  **Create `package.json` and install dependencies**:
    ```bash
    npm init -y
    npm install react react-dom @google/genai tailwindcss vite @vitejs/plugin-react typescript @types/react @types/react-dom
    ```
2.  **Create a `.env` file** in your project root for local development:
    ```
    VITE_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    *(Note: Vite requires variables to be prefixed with `VITE_` to be exposed to client-side code)*
3.  **Update `services/geminiService.ts`** to read `import.meta.env.VITE_API_KEY` as Vite injects environment variables this way:
    ```typescript
    import { GoogleGenAI } from "@google/genai";
    // ...
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY }); 
    // ...
    ```
4.  **Add a `vite.config.ts`** file in your project root:
    ```typescript
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      base: './', // Important for GitHub Pages deployment to ensure correct asset paths
    });
    ```
5.  **Update your `index.html`** to remove the `<script type="importmap">` and instead reference your Vite entry point:
    ```html
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TipsyContacts</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
          }
        </style>
        <!-- REMOVE THE FOLLOWING BLOCK IF IT EXISTS:
        <script type="importmap">
        {
          "imports": {
            "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
            "@google/genai": "https://esm.sh/@google/genai@^1.34.0",
            "react/": "https://esm.sh/react@^19.2.3/",
            "react": "https://esm.sh/react@^19.2.3"
          }
        }
        </script>
        -->
      </head>
      <body class="bg-slate-50 text-slate-900 antialiased">
        <div id="root"></div>
        <script type="module" src="/index.tsx"></script> <!-- Vite's entry point -->
      </body>
    </html>
    ```
6.  **Add scripts to `package.json`**:
    ```json
    {
      "name": "tipsycontacts",
      "version": "1.0.0",
      "description": "AI Contact Digitizer for Google Sheets",
      "main": "index.js",
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "@google/genai": "^1.34.0",
        "react": "^19.2.3",
        "react-dom": "^19.2.3"
      },
      "devDependencies": {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.1",
        "typescript": "^5.2.2",
        "vite": "^5.3.1"
      }
    }
    ```

**For Deployment (e.g., GitHub Pages via GitHub Actions):**

1.  **Store your API key as a GitHub Secret**: Go to your GitHub repository's `Settings > Secrets and variables > Actions`, and add a new repository secret named `VITE_API_KEY` with your Gemini API key as its value.
2.  Your GitHub Actions workflow will then be able to access this secret and inject it during the build process (see the Deployment section below).

### 2. Google Sheets Integration (Apps Script)

To connect TipsyContacts with your Google Sheet, you need to deploy a small Google Apps Script as a Web App.

1.  **Open your Google Sheet**. (It's okay if it is empty! The script will create headers).
2.  Go to `Extensions > Apps Script`.
3.  Delete any existing code in the editor and paste the `GOOGLE_SCRIPT_CODE` from your `App.tsx` file into `Code.gs`.
    *   **The Script**:
        ```javascript
        function doPost(e) {
          var lock = LockService.getScriptLock();
          lock.tryLock(10000); // Wait up to 10s for other processes to finish

          try {
            var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
            
            // We expect JSON string in the post body
            var data = JSON.parse(e.postData.contents);
            
            // Configuration: Map nice Headers to internal Keys
            var columns = [
              { header: "Meet When", key: "meetWhen" },
              { header: "First Name", key: "firstName" },
              { header: "Last Name", key: "lastName" },
              { header: "Title", key: "title" },
              { header: "Company", key: "company" },
              { header: "School", key: "school" },
              { header: "Industry", key: "industry" },
              { header: "Current Resident", key: "currentResident" },
              { header: "Nationality", key: "nationality" },
              { header: "Age Range", key: "ageRange" },
              { header: "Birthday", key: "birthday" },
              { header: "Email", key: "email" },
              { header: "Phone", key: "phone" },
              { header: "Link", key: "link" },
              { header: "First Impression", key: "firstImpression" },
              { header: "Importance", key: "importance" },
              { header: "Contact Frequency", key: "contactFrequency" },
              { header: "Last Contact", key: "lastContact" },
              { header: "Last Contact Notes", key: "lastContactNotes" },
              { header: "Notes", key: "notes" },
              { header: "Next Contact Due", key: "nextContactDue" }
            ];
            
            var headerNames = columns.map(function(c) { return c.header; });
            
            // Smart Header Check:
            // If the sheet is empty OR the first header looks like a raw key (e.g. "meetWhen"),
            // we overwrite row 1 with the nice Human Readable headers.
            
            var firstCell = "";
            if (sheet.getLastRow() > 0) {
              firstCell = sheet.getRange(1, 1).getValue();
            }
            
            if (sheet.getLastRow() === 0 || firstCell === "meetWhen" || firstCell === "meetwhen") {
              // If updating existing, we just set values, if new we append
              if (sheet.getLastRow() > 0) {
                sheet.getRange(1, 1, 1, headerNames.length).setValues([headerNames]);
              } else {
                sheet.appendRow(headerNames);
              }
              // Apply Formatting (Bold, Grey Background, Borders)
              sheet.getRange(1, 1, 1, headerNames.length)
                   .setFontWeight("bold")
                   .setBackground("#f3f4f6") // Light gray
                   .setBorder(true, true, true, true, true, true, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
              sheet.setFrozenRows(1);
            }
            
            // Map incoming data
            var row = columns.map(function(c) {
              return data[c.key] || "";
            });
            
            sheet.appendRow(row);
            
            return ContentService.createTextOutput(JSON.stringify({"result":"success"}))
              .setMimeType(ContentService.MimeType.JSON);
              
          } catch (e) {
            return ContentService.createTextOutput(JSON.stringify({"result":"error", "error": e.toString()}))
              .setMimeType(ContentService.MimeType.JSON);
          } finally {
            lock.releaseLock();
          }
        }
        ```
4.  Click `Deploy > New deployment`.
5.  Click the gear icon next to "Select type" and choose `Web app`.
6.  Set **Execute as:** `Me`.
7.  Set **Who has access:** `Anyone` (Important! This allows the frontend app to post data without authentication).
8.  Click **Deploy**. You might be asked to authorize permissions; grant them.
9.  Copy the `Web App URL` provided after deployment.
10. In the TipsyContacts app, open **Settings**, paste this URL into the "Google Apps Script Web App URL" field, and click "Save Connection".

### 3. Local Development

1.  **Install dependencies**:
    ```bash
    npm install
    # or yarn install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    # or yarn dev
    ```
    This will usually open the app in your browser at `http://localhost:5173` (or a similar port).

## Deployment to GitHub Pages

To deploy your TipsyContacts app to GitHub Pages, you'll use Vite to generate static files and then a GitHub Actions workflow to automate the deployment.

1.  **Ensure your `package.json` includes a `homepage` field** if you are deploying to a project page (e.g., `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`). If deploying to a user page (`https://<YOUR_USERNAME>.github.io/`), omit this. Example for a project page:
    ```json
    {
      // ...
      "homepage": "https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/",
      "scripts": {
        // ...
        "build": "tsc && vite build",
        // Add a deploy script for convenience if you want to test local deployment with gh-pages CLI
        "deploy": "gh-pages -d dist" 
      },
      "devDependencies": {
        // ...
        "gh-pages": "^6.1.1" // Install this for local gh-pages CLI: npm install gh-pages --save-dev
      }
    }
    ```
2.  **Create a GitHub Actions workflow**: Create a file `.github/workflows/deploy.yml` in your repository:

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches:
          - main # or master - the branch you push code to

    jobs:
      build-and-deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout 🚀
            uses: actions/checkout@v4

          - name: Set up Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20' # Use your preferred Node.js version, match local
              cache: 'npm' # Cache npm dependencies

          - name: Install dependencies 📦
            run: npm install

          - name: Build project 🏗️
            run: npm run build
            env:
              VITE_API_KEY: ${{ secrets.VITE_API_KEY }} # Inject the API key from GitHub Secrets
            # Note: The environment variable name (e.g., VITE_API_KEY) must match what your bundler expects.
            # For Vite, it's VITE_ prefix.

          - name: Deploy to GitHub Pages 🚀
            uses: peaceiris/actions-gh-pages@v3
            with:
              github_token: ${{ secrets.GITHUB_TOKEN }}
              publish_dir: ./dist # Or ./build if your bundler outputs there
              # The branch where your static site files will be published.
              # This will typically be 'gh-pages' for project pages.
              # If your repository is configured to serve from '/docs' in `main`, you can use 'main' and 'docs' folder.
              publish_branch: gh-pages 
              cname: example.com # OPTIONAL: If you're using a custom domain.
    ```
    **Important**: Remember to enable GitHub Pages for your repository in `Settings > Pages`, selecting the `gh-pages` branch (or `main` with `/docs` folder if you prefer that setup) as the source.

## Usage

1.  **Upload Input**: On the main page, either upload images (business cards, LinkedIn screenshots, contact info snippets) or record a voice note providing details about your contact.
2.  **Analyze**: Click "Analyze Connection" to let the Gemini AI process the input.
3.  **Review & Edit**: The extracted information will be displayed in an editable form. You can correct any details, fill in missing information, or use the "Smart Update" feature with additional images/audio.
4.  **Save to Google Sheet**: Once satisfied, click "Save to Google Sheet". The data will be pushed to your configured Google Sheet. If not connected, it will prompt you to visit settings.
5.  **View Sheet**: After a successful save, you'll have an option to open your Google Sheet directly.

## Contributing

Feel free to fork the repository, open issues, and submit pull requests.

## License

This project is licensed under the MIT License. (You might need to create a `LICENSE` file if it doesn't exist).
