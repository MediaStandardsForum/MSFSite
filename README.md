# Media Standards Forum

A static website for publishing complaint analyses and rulings related to NZ Media Council cases.

## Structure

```
media-standards-forum/
├── index.html              # Main two-panel layout (sidebar + content)
├── style.css               # All styles
├── app.js                  # Search, navigation, sidebar logic
├── complaints/             # One HTML file per complaint
│   └── YYYY-MM-DD-case-XXXX.html
├── complaints.json         # Index of all complaints (metadata)
└── README.md               # This file
```

## Adding a Complaint

1. Create a new HTML fragment in `complaints/` with filename format: `YYYY-MM-DD-case-XXXX.html`
2. Add an entry to the top of the `complaints.json` array
3. Commit and push to GitHub

### Complaint File Format

Each complaint file is an HTML fragment (no `<html>` or `<head>` tags):

```html
<article class="complaint">
  <header>
    <h1>Case XXXX — Title</h1>
    <div class="meta">
      <time datetime="YYYY-MM-DD">DD Month YYYY</time>
      <span class="tags">
        <span class="tag">Tag 1</span>
        <span class="tag">Tag 2</span>
      </span>
    </div>
  </header>

  <section class="ruling-summary">
    <h2>Ruling Summary</h2>
    <p>...</p>
  </section>

  <section class="analysis">
    <h2>Analysis</h2>
    <p>...</p>
  </section>
</article>
```

### complaints.json Format

```json
[
  {
    "id": "case-XXXX",
    "title": "Case XXXX — Title",
    "date": "YYYY-MM-DD",
    "summary": "Brief summary for search",
    "file": "complaints/YYYY-MM-DD-case-XXXX.html",
    "tags": ["tag1", "tag2"]
  }
]
```

## Features

- Two-panel layout with fixed sidebar
- Client-side search (filters by title, summary, and tags)
- Mobile responsive with hamburger menu
- Automatic dark/light mode based on system preference
- No build tools or dependencies

## Hosting

Hosted on GitHub Pages from the main branch.
