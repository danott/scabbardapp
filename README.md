# Scabbard

A tool for memorizing passages of scripture. Search for a passage with a reference such as "John 3:16" and it's saved in your browser's `localStorage`. There are no accounts and no syncing.

## Practicing

Each passage has four ways to practice, each built on retrieval: trying to recall the words is what makes them stick, much more than rereading them.

- **Read** it aloud a few times to start.
- **Blanks** hides a share of the words (a quarter, half, three quarters, then all of them). Say the passage aloud and tap a blank to peek. Rating it Good or Easy hides more next time.
- **Letters** leaves only the first letter of each word, a long-standing method for learning text word for word.
- **Type** asks for the first letter of each word from memory and counts the misses.

After practicing, rate how well you recalled it: Again, Hard, Good, or Easy. A small take on the SM-2 spaced-repetition algorithm (the one Anki grew out of) picks the day it comes back, and the gaps grow as you keep remembering it. The list shows what's due, and **Review** walks through it. Progress is saved in `localStorage` under `progress`, keyed by passage title.

## How it's built

No dependencies and no build step.

- `public/` is a static site: `index.html`, `app.js`, `style.css`, and a `service-worker.js` that lets it work offline and install to a home screen.
- `netlify/functions/text.mjs` handles `/api/text`. It calls the [ESV API](https://api.esv.org/) so the API token stays on the server.

## Deploying

On Netlify, set the `ESV_API_AUTHORIZATION_TOKEN` environment variable. There's no build command; `netlify.toml` publishes `public/` and Netlify picks up the function automatically.

## Running locally

To see the front end on its own, serve `public/` with any static server, for example `python3 -m http.server -d public`. Searching needs the function, which runs with `netlify dev` from the [Netlify CLI](https://docs.netlify.com/cli/get-started/) and an `ESV_API_AUTHORIZATION_TOKEN` in a `.env` file.
