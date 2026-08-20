/* Daily Cart — static Supabase frontend */

const SUPABASE_URL = "sb_publishable_Wy9yeMRLXTfBL2oeYSsRpA_sxYx4NJm";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjd2t2c2RzaG1kcGZ1cXJ4dWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTcyMTMsImV4cCI6MjEwMjc3MzIxM30.6XqbmJNttIrZenHsDEqf-49fsxoQus4fMj6eeynu0r4";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const state = { items: [], currentPage: "home" };

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
  $("itemForm").reset();
  $("itemId").value = "";
  $("quantity").value = "1";
  $("unit").value = "pcs";
  $("priority").value = "medium";
  $("category").value = "Groceries";
  $("submitBtn").textContent = "Add to list";
  $("formTitle").textContent = "Add an item";
}

function collectMainForm() {
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

function showPage(page) {
  state.currentPage = page;

  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  $(`page-${page}`).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  window.history.replaceState(null, "", page === "home" ? location.pathname : `${location.pathname}#list`);
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initPage() {
  const page = location.hash === "#list" ? "list" : "home";
  showPage(page);
}

function renderStats() {
  const total = state.items.length;
  const high = state.items.filter(x => x.priority === "high").length;

  $("totalCountHome").textContent = total;
  $("highCountHome").textContent = high;
  $("sidebarCount").textContent = total;

  const filtered = filteredItems();
  $("listSummaryText").textContent =
    filtered.length === total ? `${total} item${total === 1 ? "" : "s"}`
      : `${filtered.length} of ${total} items`;
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

function renderList() {
  renderStats();

  if (!configured) {
    $("listState").style.display = "block";
    $("listState").innerHTML = `<strong>Connect Supabase first</strong><br>Open <code>app.js</code> and replace the two placeholder values at the top.`;
    $("itemsList").innerHTML = "";
    return;
  }

  const items = filteredItems();
  $("listState").style.display = items.length ? "none" : "block";

  if (!items.length) {
    $("listState").innerHTML = `<strong>Your list is empty</strong><br>Add something from Home and it will appear here.`;
    $("itemsList").innerHTML = "";
    return;
  }

  $("itemsList").innerHTML = items.map(item => {
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
            <span class="meta-pill">Qty: ${esc(item.quantity)} ${esc(item.unit)}</span>
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
          <button class="icon-btn" type="button" data-action="edit" data-id="${esc(item.id)}">Edit</button>
          <button class="icon-btn delete" type="button" data-action="delete" data-id="${esc(item.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadItems() {
  if (!configured) {
    renderStats();
    renderList();
    return;
  }

  $("listState").style.display = "block";
  $("listState").textContent = "Loading your list…";

  const { data, error } = await client
    .from("shopping_items")
    .select("*")
    .order("priority_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    $("listState").innerHTML = `<strong>Could not load the list</strong><br>${esc(error.message)}`;
    return;
  }

  state.items = data || [];
  renderStats();
  renderList();
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

function openEditModal(item) {
  $("editItemId").value = item.id;
  $("editName").value = item.name || "";
  $("editQuantity").value = item.quantity || 1;
  $("editUnit").value = item.unit || "pcs";
  $("editPriority").value = item.priority || "medium";
  $("editCategory").value = item.category || "Groceries";
  $("editLocation").value = item.location || "";
  $("editLink").value = item.link || "";
  $("editPhone").value = item.phone || "";
  $("editNotes").value = item.notes || "";

  $("editModal").hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => $("editName").focus(), 20);
}

function closeEditModal() {
  $("editModal").hidden = true;
  document.body.classList.remove("modal-open");
}

$("itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!configured) {
    showToast("Connect Supabase first.");
    return;
  }

  const id = $("itemId").value || null;
  const payload = collectMainForm();

  if (!payload.name || payload.quantity < 1) {
    showToast("Enter an item name and valid quantity.");
    return;
  }

  if (payload.link && !safeUrl(payload.link)) {
    showToast("Shopping link must start with http:// or https://");
    return;
  }

  $("submitBtn").disabled = true;

  try {
    await saveItem(payload, id);
    showToast(id ? "Item updated." : "Item added.");
    resetForm();
    await loadItems();
    showPage(id ? "list" : "home");
  } catch (err) {
    showToast(err.message || "Could not save item.");
  } finally {
    $("submitBtn").disabled = false;
  }
});

$("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("editItemId").value;
  if (!configured || !id) return;

  const payload = {
    name: $("editName").value.trim(),
    quantity: Number($("editQuantity").value),
    unit: $("editUnit").value,
    priority: $("editPriority").value,
    category: $("editCategory").value,
    location: $("editLocation").value.trim() || null,
    link: $("editLink").value.trim() || null,
    phone: $("editPhone").value.trim() || null,
    notes: $("editNotes").value.trim() || null
  };

  if (!payload.name || payload.quantity < 1) {
    showToast("Enter an item name and valid quantity.");
    return;
  }

  if (payload.link && !safeUrl(payload.link)) {
    showToast("Shopping link must start with http:// or https://");
    return;
  }

  $("saveEditBtn").disabled = true;

  try {
    await saveItem(payload, id);
    closeEditModal();
    showToast("Item updated.");
    await loadItems();
  } catch (err) {
    showToast(err.message || "Could not update item.");
  } finally {
    $("saveEditBtn").disabled = false;
  }
});

$("itemsList").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button || !configured) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const item = state.items.find(x => String(x.id) === String(id));
  if (!item) return;

  try {
    if (action === "edit") {
      openEditModal(item);
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

$("resetBtn").addEventListener("click", resetForm);
$("searchInput").addEventListener("input", renderList);
$("filterPriority").addEventListener("change", renderList);
$("filterCategory").addEventListener("change", renderList);

$("closeModalBtn").addEventListener("click", closeEditModal);
$("cancelEditBtn").addEventListener("click", closeEditModal);

$("editModal").addEventListener("click", (e) => {
  if (e.target === $("editModal")) closeEditModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("editModal").hidden) closeEditModal();
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

$("viewListFromHome").addEventListener("click", () => showPage("list"));

$("addAnotherBtn").addEventListener("click", () => {
  resetForm();
  showPage("home");
  setTimeout(() => $("name").focus(), 250);
});

$("mobileMenuBtn").addEventListener("click", () => {
  document.querySelector(".sidebar")?.classList.toggle("open");
});

window.addEventListener("hashchange", initPage);

initPage();
renderStats();
renderList();
loadItems();
