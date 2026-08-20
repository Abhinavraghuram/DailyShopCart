/* Daily Cart — static Supabase frontend */

const SUPABASE_URL = "https://ucwkvsdshmdpfuqrxuif.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjd2t2c2RzaG1kcGZ1cXJ4dWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTcyMTMsImV4cCI6MjEwMjc3MzIxM30.6XqbmJNttIrZenHsDEqf-49fsxoQus4fMj6eeynu0r4";

const configured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const state = {
  items: [],
  currentPage: "home",
  undoItem: null,
  undoTimer: null,
  undoDeleting: false
};

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
  el.innerHTML = esc(message);
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function showUndoToast(item) {
  const el = $("toast");

  clearTimeout(window.__toastTimer);
  clearTimeout(state.undoTimer);

  // Store only the original item data in memory.
  // The database generates a fresh UUID when Undo restores it.
  state.undoItem = structuredClone(item);
  state.undoDeleting = false;

  el.innerHTML = `
    <span class="undo-toast">
      <span>✅ ${esc(item.name)} removed</span>
      <button id="undoCompleteBtn" type="button">UNDO</button>
    </span>
  `;
  el.classList.add("show");

  const undoBtn = el.querySelector("#undoCompleteBtn");

  undoBtn.addEventListener("click", async () => {
    if (!state.undoItem || state.undoDeleting || !configured) return;

    state.undoDeleting = true;
    undoBtn.disabled = true;
    undoBtn.textContent = "RESTORING…";

    const oldItem = { ...state.undoItem };

    // IMPORTANT:
    // Only send real table columns. Do not send:
    // - id (old deleted UUID)
    // - priority_order (generated column)
    // This lets Supabase generate a fresh row safely.
    const restorePayload = {
      name: oldItem.name ?? "",
      quantity: Number(oldItem.quantity ?? 1),
      unit: oldItem.unit ?? "pcs",
      priority: oldItem.priority ?? "medium",
      category: oldItem.category ?? "Groceries",
      location: oldItem.location ?? null,
      link: oldItem.link ?? null,
      phone: oldItem.phone ?? null,
      notes: oldItem.notes ?? null,
      created_at: oldItem.created_at ?? new Date().toISOString()
    };

    try {
      const { data: restoredRow, error } = await client
        .from("shopping_items")
        .insert([restorePayload])
        .select()
        .single();

      if (error) {
        console.error("Daily Cart Undo restore error:", error);
        throw error;
      }

      if (!restoredRow) {
        throw new Error("Supabase did not return the restored item.");
      }

      state.undoItem = null;
      state.undoDeleting = false;
      clearTimeout(state.undoTimer);

      el.classList.remove("show");
      showToast("↩️ Item restored.");
      await loadItems();

      if (!$("shoppingModeModal").hidden) {
        renderShoppingMode();
      }
    } catch (err) {
      console.error("Daily Cart Undo failed:", err);

      state.undoDeleting = false;
      undoBtn.disabled = false;
      undoBtn.textContent = "UNDO";

      showToast(`Undo failed: ${err.message || "Supabase restore failed"}`);
    }
  });

  state.undoTimer = setTimeout(() => {
    state.undoItem = null;
    state.undoDeleting = false;
    el.classList.remove("show");
  }, 5000);
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


function renderShoppingMode() {
  const items = state.items.slice().sort((a, b) => {
    const p = { high: 1, medium: 2, low: 3 };
    return (p[a.priority] - p[b.priority])
      || String(a.name).localeCompare(String(b.name));
  });

  $("shoppingRemaining").textContent = items.length;

  if (!items.length) {
    $("shoppingModeList").innerHTML = `
      <div class="empty">
        <strong>🎉 Shopping complete</strong>
        <span>There are no remaining items on your list.</span>
      </div>
    `;
    return;
  }

  $("shoppingModeList").innerHTML = items.map(item => `
    <div class="shopping-mode-item">
      <button class="shopping-complete-btn" type="button" data-shopping-complete="${esc(item.id)}" aria-label="Complete ${esc(item.name)}">✓</button>
      <div class="shopping-mode-item-main">
        <div class="shopping-mode-item-name">${esc(item.name)}</div>
        <div class="shopping-mode-item-sub">
          ${esc(item.quantity)} ${esc(item.unit)}${item.location ? ` · 📍 ${esc(item.location)}` : ""}
        </div>
      </div>
      <span class="badge ${esc(item.priority)} shopping-mode-badge">${esc(item.priority)}</span>
    </div>
  `).join("");
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
            ${item.location ? `<span class="meta-pill">📍 ${esc(item.location)}</span>` : ""}
          </div>

          <div class="inline-editor" data-editor-id="${esc(item.id)}">
            <div class="qty-control">
              <button type="button" data-inline-action="minus" data-id="${esc(item.id)}">−</button>
              <span data-qty="${esc(item.id)}">${esc(item.quantity)}</span>
              <button type="button" data-inline-action="plus" data-id="${esc(item.id)}">+</button>
            </div>

            <select class="inline-select" data-inline-field="unit" data-id="${esc(item.id)}" aria-label="Unit">
              ${["pcs","kg","g","L","ml","pack","box","bottle","dozen"].map(unit =>
                `<option value="${unit}" ${item.unit === unit ? "selected" : ""}>${unit}</option>`
              ).join("")}
            </select>

            <select class="inline-select" data-inline-field="priority" data-id="${esc(item.id)}" aria-label="Priority">
              ${["high","medium","low"].map(priority =>
                `<option value="${priority}" ${item.priority === priority ? "selected" : ""}>${priority[0].toUpperCase()+priority.slice(1)}</option>`
              ).join("")}
            </select>

            <button class="inline-save" type="button" data-inline-save="${esc(item.id)}">Save</button>
          </div>

          ${item.notes ? `<div class="item-notes">${esc(item.notes)}</div>` : ""}

          <div class="links">
            ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Open shopping link ↗</a>` : ""}
            ${mapLink ? `<a href="${esc(mapLink)}" target="_blank" rel="noopener">Open location ↗</a>` : ""}
            ${tel ? `<a href="${esc(tel)}">Call ${esc(item.phone)}</a>` : ""}
          </div>
        </div>

        <div class="item-actions">
          <button class="icon-btn" type="button" data-action="edit" data-id="${esc(item.id)}">More edit</button>
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
  const inlineAction = e.target.closest("[data-inline-action]");
  const inlineSave = e.target.closest("[data-inline-save]");

  if (inlineAction && configured) {
    const id = inlineAction.dataset.id;
    const item = state.items.find(x => String(x.id) === String(id));
    if (!item) return;

    const qtyEl = document.querySelector(`[data-qty="${CSS.escape(id)}"]`);
    if (!qtyEl) return;

    let qty = Number(qtyEl.textContent) || 1;
    qty = inlineAction.dataset.inlineAction === "plus" ? qty + 1 : Math.max(1, qty - 1);
    qtyEl.textContent = qty;
    return;
  }

  if (inlineSave && configured) {
    const id = inlineSave.dataset.inlineSave;
    const item = state.items.find(x => String(x.id) === String(id));
    if (!item) return;

    const editor = document.querySelector(`[data-editor-id="${CSS.escape(id)}"]`);
    if (!editor) return;

    const qty = Number(editor.querySelector(`[data-qty="${CSS.escape(id)}"]`).textContent);
    const unit = editor.querySelector(`[data-inline-field="unit"][data-id="${CSS.escape(id)}"]`).value;
    const priority = editor.querySelector(`[data-inline-field="priority"][data-id="${CSS.escape(id)}"]`).value;

    inlineSave.disabled = true;

    try {
      await saveItem({ quantity: qty, unit, priority }, id);
      showToast("Quantity and priority updated.");
      await loadItems();
      if (!$("shoppingModeModal").hidden) renderShoppingMode();
    } catch (err) {
      showToast(err.message || "Could not update item.");
    } finally {
      inlineSave.disabled = false;
    }

    return;
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

    if (action === "complete") {
      await deleteItem(id);
      await loadItems();
      showUndoToast(item);
      return;
    }

    if (action === "delete") {
      await deleteItem(id);
      state.undoItem = null;
      clearTimeout(state.undoTimer);
      showToast("Item deleted.");
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

$("totalItemsCard").addEventListener("click", () => {
  $("searchInput").value = "";
  $("filterPriority").value = "all";
  $("filterCategory").value = "all";
  renderList();
  showPage("list");
});

$("highPriorityCard").addEventListener("click", () => {
  $("searchInput").value = "";
  $("filterPriority").value = "high";
  $("filterCategory").value = "all";
  renderList();
  showPage("list");
});

$("addAnotherBtn").addEventListener("click", () => {
  resetForm();
  showPage("home");
  setTimeout(() => $("name").focus(), 250);
});

$("mobileMenuBtn").addEventListener("click", () => {
  document.querySelector(".sidebar")?.classList.toggle("open");
});


$("shoppingModeBtn").addEventListener("click", () => {
  $("shoppingModeModal").hidden = false;
  renderShoppingMode();
});

$("closeShoppingModeBtn").addEventListener("click", () => {
  $("shoppingModeModal").hidden = true;
});

$("exitShoppingModeBtn").addEventListener("click", () => {
  $("shoppingModeModal").hidden = true;
});

$("shoppingModeModal").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-shopping-complete]");
  if (!button || !configured) return;

  const id = button.dataset.shoppingComplete;
  const item = state.items.find(x => String(x.id) === String(id));
  if (!item) return;

  try {
    button.disabled = true;
    await deleteItem(id);
    await loadItems();
    renderShoppingMode();
    showUndoToast(item);

    if (!state.items.length) {
      setTimeout(() => {
        if (!$("shoppingModeModal").hidden) {
          renderShoppingMode();
        }
      }, 50);
    }
  } catch (err) {
    button.disabled = false;
    showToast(err.message || "Could not complete item.");
  }
});

$("shoppingModeModal").addEventListener("click", (e) => {
  if (e.target === $("shoppingModeModal")) $("shoppingModeModal").hidden = true;
});

window.addEventListener("hashchange", initPage);

initPage();
renderStats();
renderList();
loadItems();
