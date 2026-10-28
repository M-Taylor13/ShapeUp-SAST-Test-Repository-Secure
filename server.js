const express = require('express');
const sqlite3 = require('sqlite3');
const escapeHtml = require('escape-html');
const sanitizeHtml = require('sanitize-html');
const sanitizeText = value => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const app = express();
const db = new sqlite3.Database(':memory:');
const port = Number(process.env.PORT || 3001);
app.disable('x-powered-by');
app.use(express.static(__dirname + '/public'));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

const pageStart = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Little Blog</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body><main>
  <header><p class="eyebrow">NOTES & LITTLE IDEAS</p><h1>Little Blog</h1>
  <p>A small corner of the internet for everyday thoughts.</p></header>
  <form action="/" method="get">
    <label for="q">Search posts</label>
    <div class="search"><input id="q" name="q" type="search" maxlength="2000"
      placeholder="Try coffee, weekend or hello"><button>Search</button></div>
  </form>`;
const pageEnd = '<footer>Little Blog &middot; Three posts and a search box.</footer></main></body></html>';

app.get('/', (req, res) => {
  if (req.query.q !== undefined && (typeof req.query.q !== 'string' || req.query.q.length > 2000)) {
    return res.status(400).type('text').send('Search must be a string of at most 2000 characters.');
  }
  // The normal search shows published posts only. The fourth seed post is a draft.
  // FIX: SQL parameters keep the search value separate from SQL syntax.
  db.all('SELECT * FROM posts WHERE published = 1 AND title LIKE ? ORDER BY id DESC', ['%' + (req.query.q || '') + '%'], (error, rows) => {
    if (error) return res.status(400).type('text').send('Unable to complete this search.');
    const posts = rows.map(post => `<article>
      <p class="date">${escapeHtml(post.date)}</p>
      <h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.body)}</p>
    </article>`).join('') || '<p>No posts found.</p>';
    // FIX: Remove input markup before rendering it in an HTML text context.
    res.type('html').send(pageStart + `<p>Search: ${sanitizeText(req.query.q || '')}</p>` + posts + pageEnd);
  });
});

// A fresh, disposable SQLite database is seeded every time the app starts.
db.exec(`
  CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, body TEXT, date TEXT, published INTEGER);
  INSERT INTO posts VALUES
    (1, 'Hello, little blog', 'A place for small updates and things worth remembering.', '28 October 2026', 1),
    (2, 'A slower weekend', 'A walk, a good book and no particular plans.', '27 October 2026', 1),
    (3, 'Coffee notes', 'Today I finally remembered to water the plants before making coffee.', '26 October 2026', 1),
    (4, 'Unpublished draft', 'This draft should never appear in a normal search.', '25 October 2026', 0);
`, error => {
  if (error) { console.error('Could not initialise demo database.'); process.exit(1); }
  app.listen(port, '127.0.0.1', () => console.log(`Little Blog: http://127.0.0.1:${port}`));
});
