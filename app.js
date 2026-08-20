/* Daily Cart — static Supabase frontend */

const SUPABASE_URL = "https://ucwkvsdshmdpfuqrxuif.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjd2t2c2RzaG1kcGZ1cXJ4dWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTcyMTMsImV4cCI6MjEwMjc3MzIxM30.6XqbmJNttIrZenHsDEqf-49fsxoQus4fMj6eeynu0r4";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const state = { items: [] };

const form = $("itemForm");
const list = $("itemsList");
const listState = $("listState");

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function resetForm() {
  form.reset();
  $("itemId").value = "";
  $("quantity").value = "1";
  $("unit").value = "pcs";
  $("priority").value = "medium";
  $("category").value = "Groceries";
  $("submitBtn").textContent = "Add to list";
}

function collectForm() {
  return {
    name: $("name").value.trim(),
    quantity: Number($("quantity").value),
    unit: $("unit").value,
    priority: $("priority").value,
    category: $("category").value,
    location: $("location").value.trim() || null,
    link: $("link").value.trim() || null,
    phone: $("phone").value.trim() || null,
    notes: $("notes").value.trim() || null
  };
}

function populateForm(item) {
  $("itemId").value = item.id;
  $("name").value = item.name || "";
  $("quantity").value = item.quantity || 1;
  $("unit").value = item.unit || "pcs";
  $("priority").value = item.priority || "medium";
  $("category").value = item.category || "Groceries";
  $("location").value = item.location || "";
  $("link").value = item.link || "";
  $("phone").value = item.phone || "";
  $("notes").value = item.notes || "";
  $("submitBtn").textContent = "Save changes";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filteredItems() {
  const q = $("searchInput").value.trim().toLowerCase();
  const priority = $("filterPriority").value;
  const category = $("filterCategory").value;

  return state.items.filter(item => {
    const hay = [item.name, item.category, item.location, item.notes, item.phone]
      .filter(Boolean).join(" ").toLowerCase();
    return (!q || hay.includes(q))
      && (priority === "all" || item.priority === priority)
      && (category === "all" || item.category === category);
  });
}

function render() {
  $("totalCount").textContent = state.items.length;
  $("highCount").textContent = state.items.filter(x => x.priority === "high").length;

  const items = filteredItems();
  listState.style.display = configured ? (items.length ? "none" : "block") : "block";

  if (!configured) {
    listState.innerHTML = `<strong>Connect Supabase first</strong><br>Open <code>app.js</code> and replace the two placeholder values at the top.`;
    list.innerHTML = "";
    return;
  }

  if (!items.length) {
    listState.innerHTML = `<strong>Your list is empty</strong><br>Add something above, then it will appear here.`;
    list.innerHTML = "";
    return;
  }

  list.innerHTML = items.map(item => {
    const link = safeUrl(item.link);
    const mapLink = item.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`
      : null;
    const tel = item.phone ? `tel:${item.phone.replace(/[^\d+]/g, "")}` : null;

    return `
      <article class="item-card">
        <button class="check-btn" type="button" data-action="complete" data-id="${esc(item.id)}" aria-label="Complete ${esc(item.name)}">✓</button>

        <div class="item-main">
          <div class="item-top">
            <span class="item-name">${esc(item.name)}</span>
            <span class="badge ${esc(item.priority)}">${esc(item.priority)}</span>
            <span class="meta-pill">${esc(item.category)}</span>
          </div>
          <div class="item-meta">
            <span class="meta-pill">${esc(item.quantity)} ${esc(item.unit)}</span>
            ${item.location ? `<span class="meta-pill">📍 ${esc(item.location)}</span>` : ""}
          </div>

          ${item.notes ? `<div class="item-notes">${esc(item.notes)}</div>` : ""}

          <div class="links">
            ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Open shopping link ↗</a>` : ""}
            ${mapLink ? `<a href="${esc(mapLink)}" target="_blank" rel="noopener">Open location ↗</a>` : ""}
            ${tel ? `<a href="${esc(tel)}">Call ${esc(item.phone)}</a>` : ""}
          </div>
        </div>

        <div class="item-actions">
          <button class="icon-btn" type="button" data-action="edit" data-id="${esc(item.id)}" aria-label="Edit">✎</button>
          <button class="icon-btn delete" type="button" data-action="delete" data-id="${esc(item.id)}" aria-label="Delete">⌫</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadItems() {
  if (!configured) return render();
  listState.textContent = "Loading your list…";
  listState.style.display = "block";

  const { data, error } = await client
    .from("shopping_items")
    .select("*")
    .order("priority_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    listState.innerHTML = `<strong>Could not load the list</strong><br>${esc(error.message)}`;
    return;
  }

  state.items = data || [];
  render();
}

async function saveItem(payload, id = null) {
  if (id) {
    const { data, error } = await client
      .from("shopping_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from("shopping_items")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteItem(id) {
  const { error } = await client.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) {
    showToast("Connect Supabase first.");
    return;
  }

  const id = $("itemId").value || null;
  const payload = collectForm();

  if (!payload.name || payload.quantity < 1) {
    showToast("Enter an item name and valid quantity.");
    return;
  }

  const link = payload.link;
  if (link && !safeUrl(link)) {
    showToast("Shopping link must start with http:// or https://");
    return;
  }

  $("submitBtn").disabled = true;
  try {
    await saveItem(payload, id);
    showToast(id ? "Item updated." : "Item added.");
    resetForm();
    await loadItems();
  } catch (err) {
    showToast(err.message || "Could not save item.");
  } finally {
    $("submitBtn").disabled = false;
  }
});

$("resetBtn").addEventListener("click", resetForm);
$("searchInput").addEventListener("input", render);
$("filterPriority").addEventListener("change", render);
$("filterCategory").addEventListener("change", render);

list.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button || !configured) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const item = state.items.find(x => String(x.id) === String(id));
  if (!item) return;

  try {
    if (action === "edit") {
      populateForm(item);
      return;
    }

    if (action === "delete" || action === "complete") {
      await deleteItem(id);
      showToast(action === "complete" ? "Completed and removed." : "Item deleted.");
      await loadItems();
    }
  } catch (err) {
    showToast(err.message || "Action failed.");
  }
});

render();
loadItems();
