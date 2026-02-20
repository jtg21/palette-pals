# Tiny Tools

A collection of small, useful browser apps. Zero dependencies, pure HTML/CSS/JS.

**Live:** https://jtg21.github.io/palette-pals/

## Apps

### Palette Pals
Generate harmonious 5-color palettes using color theory.
- 5 harmony modes: analogous, complementary, triadic, split-complementary, random
- Click to copy hex codes, press Space to regenerate

### ASCII Art Converter
Upload any image and convert it to ASCII art — no AI, pure pixel math.
- Drag-and-drop, file picker, or paste from clipboard
- Adjustable width (40–200 characters)
- 4 character sets (standard, detailed, block elements, minimal)
- Color mode preserves original image colors
- Invert mode for light backgrounds

## Infrastructure

Deployed automatically via **GitHub Actions** (Infrastructure as Code):

- `.github/workflows/deploy.yml` defines the full deployment pipeline
- Every push to `main` triggers deployment to GitHub Pages
- No build step — static files are deployed directly

## Local Development

```bash
# No build tools needed — just open in a browser
open index.html
```

## Adding a New App

1. Create a directory (e.g., `my-app/`)
2. Add `index.html`, `style.css`, `app.js`
3. Link it from the root `index.html`
4. Push to `main`
