# Scabbard

A tool for memorizing passages of scripture. Search for a passage with a reference such as "John 3:16" and it's saved in your browser's `localStorage`. There are no accounts and no syncing.

## How it's built

No dependencies and no build step.

- `public/` is a static site: `index.html`, `app.js`, `style.css`, and a `service-worker.js` that lets it work offline and install to a home screen.
- `netlify/functions/text.mjs` handles `/api/text`. It calls the [ESV API](https://api.esv.org/) so the API token stays on the server.

## Deploying

On Netlify, set the `ESV_API_AUTHORIZATION_TOKEN` environment variable. There's no build command; `netlify.toml` publishes `public/` and Netlify picks up the function automatically.

## Running locally

To see the front end on its own, serve `public/` with any static server, for example `python3 -m http.server -d public`. Searching needs the function, which runs with `netlify dev` from the [Netlify CLI](https://docs.netlify.com/cli/get-started/) and an `ESV_API_AUTHORIZATION_TOKEN` in a `.env` file.
