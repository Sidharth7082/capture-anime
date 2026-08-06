# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/ebb8ae88-c202-42cf-bd53-21e124fdd4b6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ebb8ae88-c202-42cf-bd53-21e124fdd4b6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ebb8ae88-c202-42cf-bd53-21e124fdd4b6) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Backend (MyAnimeList OAuth)

The `server/` folder contains a standalone Node/Express backend that handles
MAL OAuth so the **client secret never reaches the browser**.

```sh
cd server
cp .env.example .env     # fill in MAL_CLIENT_ID, MAL_CLIENT_SECRET, SESSION_SECRET
npm install
npm start                # http://localhost:3000
```

- Dev mode: `npm run dev` in the repo root proxies `/api` → `http://localhost:3000`.
- The registered MAL callback is `http://localhost:3000/api/auth/callback/mal`.
- **Before going live: rotate the MAL client secret** (it was shared in
  plaintext during development) and set `CORS_ORIGINS`, `STATIC_DIR` and
  `NODE_ENV=production` in `server/.env`.
- Production: `STATIC_DIR=../dist` makes the server serve the built frontend,
  so everything (UI + API) runs on one process for a home server.
