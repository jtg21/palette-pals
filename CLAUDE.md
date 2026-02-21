# CLAUDE.md — Tiny Tools

## What is this?
A collection of small browser apps deployed to GitHub Pages via GitHub Actions (IaC).
All apps are pure static HTML/CSS/JS with zero dependencies.

## Project structure
```
index.html                        # Hub landing page — links to all apps
palette/                          # Palette Pals color generator
  index.html, style.css, app.js
ascii-art/                        # Image to ASCII art converter
  index.html, style.css, app.js
housing/                          # Home value estimator (uses RapidAPI)
  index.html, style.css, app.js
.github/workflows/deploy.yml      # IaC — auto-deploys to Pages on push
CLAUDE.md                         # This file
README.md                         # Human-facing docs
```

## Adding a new app
1. Create a new directory (e.g., `my-app/`)
2. Add `index.html`, `style.css`, `app.js` inside it
3. Add a card linking to it in the root `index.html`
4. Update this file and README.md
5. Push to `main` — GitHub Actions deploys automatically

## App: Palette Pals (`palette/`)
- Generates 5-color palettes using color theory harmonies
- `generatePalette(type)` picks a base hue, computes 5 related hues via the chosen strategy
- Strategies: analogous, complementary, triadic, split-complementary, random
- HSL → RGB → hex conversion, luminance for text contrast
- Click to copy hex codes

## App: ASCII Art Converter (`ascii-art/`)
- Converts uploaded images to ASCII art using pure pixel math (no AI)
- Algorithm:
  1. Image is drawn onto an offscreen `<canvas>`
  2. Canvas is divided into a grid of cells (charWidth x charHeight)
  3. Each cell's pixels are averaged for RGB values
  4. Perceived brightness is calculated via ITU-R BT.601 formula
  5. Brightness is mapped to a character from the selected charset
- 4 character sets: standard, detailed (70 chars), block elements, minimal
- Color mode: wraps each character in a `<span>` with `rgb()` color from the source pixel
- Invert mode: flips brightness mapping
- Supports drag-and-drop, file picker, and clipboard paste

## App: Home Value Estimator (`housing/`)
- Searches active listings and recently sold homes by ZIP code
- Uses RapidAPI "Realty in US" API (`realty-in-us.p.rapidapi.com`)
- User provides their own API key (stored in localStorage, never sent elsewhere)
- API endpoints:
  - `POST /properties/v3/list` with `status: ['for_sale']` — active listings
  - `POST /properties/v3/list` with `status: ['sold']` — recently sold homes
- Comp analysis algorithm:
  1. For each active listing, finds recently sold homes within ±30% sqft
  2. Sorts comps by sqft similarity (closest match first), takes top 5
  3. Calculates weighted avg $/sqft (weight = inverse of sqft difference ratio)
  4. Estimated price = listing sqft × weighted avg $/sqft
- Shows market summary: active count, recent sales count, median sold price, avg $/sqft
- Color-coded estimates: green (possibly underpriced), red (possibly overpriced), white (fair)
- Expandable comps list for each listing

## IaC: GitHub Actions
The workflow at `.github/workflows/deploy.yml`:
1. Triggers on push to `main` or manual dispatch
2. Uploads the entire repo root as a Pages artifact
3. Deploys to the `github-pages` environment
No build step needed — all static files.

## Deployment
Live at: `https://jtg21.github.io/palette-pals/`
Push to `main` and it auto-deploys.
