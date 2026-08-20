# Daily Cart — Groceries & Shopping List

A simple, attractive shopping-list web app that works on GitHub Pages and stores data in Supabase.

## Features

- Add, edit, delete items
- Quantity + unit (pcs, kg, g, L, ml, pack, box, bottle, dozen)
- High / Medium / Low priority
- Categories
- Shopping link
- Location / shop name with Google Maps shortcut
- Phone number with tap/click-to-call
- Notes
- Search + filters
- Tick an item to permanently delete it from Supabase
- No login or authentication

## 1. Create the Supabase table

Open Supabase → SQL Editor → run `supabase_schema.sql`.

## 2. Get your Supabase project values

In Supabase open Project Settings → API.

Copy:
- Project URL
- Publishable / anon key

## 3. Configure the app

Open `app.js` and replace:

```js
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
```

Do not use the service-role key in a browser.

## 4. Publish with GitHub Pages

Put `index.html`, `styles.css`, `app.js`, and `supabase_schema.sql` in the root of a GitHub repository.

Then GitHub:
Settings → Pages → Deploy from branch → `main` → `/ (root)`.

The app is static, so no build step is required.

## Important privacy note

Because there is deliberately no login, the app cannot identify you.

The included Supabase policies allow the `anon` role to read, insert, update and delete rows. That means anybody who discovers the app URL could potentially access the same list. For a truly private list, authentication or another access-control layer would be required.
