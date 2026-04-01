# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Jekyll 4.x personal blog deployed to GitHub Pages via GitHub Actions.
URL: https://stekyne.github.io/

## Development Commands

```bash
# Install dependencies
bundle install

# Run local dev server (auto-regenerates on file changes)
bundle exec jekyll serve

# Build the site (outputs to _site/)
bundle exec jekyll build
```

Note: Changes to `_config.yml` require restarting the server.

## Architecture

- **`_config.yml`** — Site-wide settings (title, URL, theme, plugins)
- **`_posts/`** — Blog posts in Markdown, named `YYYY-MM-DD-title.markdown`
- **`index.markdown`** — Home page (uses `home` layout from minima theme)
- **`about.markdown`** — About page at `/about/`
- **`404.html`** — Custom 404 page
- **`Gemfile`** — Ruby dependencies (Jekyll 4.x, minima 2.5.x)
- **`.github/workflows/jekyll.yml`** — GitHub Actions deployment workflow

## Deployment

Site is deployed automatically via GitHub Actions on push to `master`.
The workflow builds with Jekyll in production mode and deploys to GitHub Pages.

## Key Details

- Theme: minima 2.5.x — override defaults by creating `_layouts/`, `_includes/`, or `_sass/` files
- Plugins: jekyll-feed (Atom feed), jekyll-seo-tag (meta tags), jekyll-sitemap (sitemap.xml)
- Ruby 3.3 is used in CI; local development should use Ruby >= 3.0
