# CLAUDE.md — Palette Pals

## What is this?
A static color palette generator deployed to GitHub Pages via GitHub Actions (IaC).

## Project structure
- `index.html` — Entry point. Loads style.css and app.js.
- `style.css` — All styling. Dark theme, responsive, uses backdrop-filter for swatch labels.
- `app.js` — All logic. Pure vanilla JS, no dependencies.
- `.github/workflows/deploy.yml` — IaC. Deploys to GitHub Pages on every push to `main`.

## How the color generation works
- User picks a harmony type (analogous, complementary, triadic, split-complementary, random).
- A random base hue (0-360) is chosen.
- The harmony function computes 5 hues based on color theory offsets from the base.
- Each hue gets a random saturation (50-90%) and lightness (30-75%) in HSL space.
- HSL is converted to RGB, then to hex for display.
- Luminance determines whether the swatch label text is light or dark for readability.

## Key functions in app.js
- `hslToRgb()` / `rgbToHex()` — Color space conversion.
- `generateAnalogous()` etc. — Each returns an array of 5 hues based on the harmony strategy.
- `generatePalette()` — Orchestrates: picks base hue, delegates to strategy, adds S/L, converts.
- `renderPalette()` — Builds DOM swatches, attaches click-to-copy handlers.
- `getColorName()` — Approximates a human-readable color name from HSL values.

## IaC: GitHub Actions
The workflow at `.github/workflows/deploy.yml`:
1. Triggers on push to `main` or manual dispatch.
2. Checks out the repo.
3. Uploads the entire repo root as a Pages artifact.
4. Deploys to the `github-pages` environment.
No build step needed — it's all static files.

## How to develop locally
Just open `index.html` in a browser. No build tools, no server needed.

## Deployment
Push to `main` and GitHub Actions handles the rest. The live URL is:
`https://<owner>.github.io/palette-pals/`
