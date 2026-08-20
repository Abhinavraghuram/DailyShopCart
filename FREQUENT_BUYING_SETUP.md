# Frequent Buying setup

This update adds a new Supabase table called `frequent_buying_items`.

1. Open Supabase → SQL Editor.
2. Run `frequent_buying_schema.sql` once.
3. Replace the existing `index.html`, `styles.css`, and `app.js` in GitHub with the files in this package.
4. Keep your current working Supabase URL and anon/publishable key at the top of `app.js`.

Features added:
- Frequent Buying page in the sidebar
- Add/delete frequent items
- Frequent item count in sidebar
- Home item-name suggestions based on the Frequent Buying list
- Suggestions update as the first few letters are typed
- "Use" button that sends a frequent item to the Home form
