# Palette Pals

A color harmony palette generator. Generates beautiful 5-color palettes using color theory.

## Features

- **5 harmony modes**: Analogous, Complementary, Triadic, Split Complementary, Random
- **Click to copy**: Click any swatch to copy its hex code
- **Keyboard shortcut**: Press `Space` to generate a new palette
- **Responsive**: Works on desktop and mobile
- **Zero dependencies**: Pure HTML, CSS, and vanilla JavaScript

## Live Demo

Deployed automatically via GitHub Actions to GitHub Pages.

## Infrastructure

This project uses **GitHub Actions** as Infrastructure as Code:

- `.github/workflows/deploy.yml` defines the deployment pipeline
- Every push to `main` triggers an automatic deployment to GitHub Pages
- Uses official GitHub Pages actions (`configure-pages`, `upload-pages-artifact`, `deploy-pages`)
- No build step — static files are deployed directly

## Local Development

```bash
# Just open in a browser — no build tools needed
open index.html
```

## How It Works

1. A random base hue is selected (0-360 degrees)
2. The chosen harmony algorithm computes 5 related hues using color theory
3. Each hue is given a random saturation and lightness
4. Colors are converted from HSL to hex for display
5. Text contrast is automatically adjusted based on luminance
