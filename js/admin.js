document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "admin") {
    return;
  }

  const form = document.getElementById("product-form");
  const list = document.getElementById("admin-product-list");
  const submitButton = document.getElementById("product-submit-btn");
  const resetButton = document.getElementById("product-reset-btn");
  const productIdField = document.getElementById("product-id");
  const websiteForm = document.getElementById("website-form");

  if (!form || !list || !submitButton || !resetButton || !productIdField) {
    return;
  }

  let editingProductId = null;
  let products = [];

  function resetForm() {
    form.reset();
    productIdField.value = "";
    editingProductId = null;
    submitButton.textContent = "Add Product";
    document.getElementById("product-form-title").textContent = "Add product";
    document.getElementById("product-category").value = "Handbags";
  }

  function renderProducts() {
    if (!products.length) {
      list.innerHTML = `
        <div class="empty-admin-state">
          <h3>No products yet.</h3>
          <p>Add your first Avielle product to begin curating the shop.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = products.map((product) => `
      <article class="admin-product-item">
        <img src="${product.image || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"}" alt="${product.alt || product.name}" />
        <div class="admin-product-item__meta">
          <h3>${product.name}</h3>
          <p>${product.category || "General"} · ${formatPrice(product.price || 0)} · Stock: ${product.stock || 0}</p>
          <p>${product.description || ""}</p>
        </div>
        <div class="admin-product-item__actions">
          <button class="btn--ghost" type="button" data-admin-action="edit" data-product-id="${product.id}">Edit</button>
          <button class="btn--danger" type="button" data-admin-action="delete" data-product-id="${product.id}">Delete</button>
        </div>
      </article>
    `).join("");
  }

  function populateForm(product) {
    document.getElementById("product-name").value = product.name || "";
    document.getElementById("product-price").value = product.price || 0;
    document.getElementById("product-category").value = product.category || "Handbags";
    document.getElementById("product-image").value = product.image || "";
    document.getElementById("product-stock").value = product.stock || 0;
    document.getElementById("product-description").value = product.description || "";
    productIdField.value = String(product.id);
    editingProductId = Number(product.id);
    submitButton.textContent = "Update Product";
    document.getElementById("product-form-title").textContent = "Edit product";
  }

  async function apiRequest(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  }

  async function loadProducts() {
    try {
      const data = await apiRequest('/api/admin/products');
      products = Array.isArray(data.products) ? data.products : [];
      renderProducts();
      window.avielleProducts = products;
    } catch (error) {
      list.innerHTML = `<div class="empty-admin-state"><h3>Unable to load products.</h3><p>${error.message}</p></div>`;
    }
  }

  async function loadWebsiteSettings() {
    if (!websiteForm) {
      return;
    }

    try {
      const data = await apiRequest('/api/admin/website');
      document.getElementById("hero-headline").value = data.settings.hero_headline || "Luxury made personal.";
      document.getElementById("hero-subtitle").value = data.settings.hero_subtitle || "";
      document.getElementById("hero-image").value = data.settings.hero_image || "";
    } catch (error) {
      console.warn(error);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("product-name").value.trim();
    const price = Number(document.getElementById("product-price").value);
    const category = document.getElementById("product-category").value;
    const image = document.getElementById("product-image").value.trim();
    const stock = Number(document.getElementById("product-stock").value);
    const description = document.getElementById("product-description").value.trim();

    if (!name || !image || !description || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
      alert("Please complete all product fields with a valid price and stock quantity.");
      return;
    }

    try {
      const payload = { name, price, category, image, stock, description, badge: "New" };
      const formData = new FormData();
      formData.append("product", JSON.stringify(payload));

      const endpoint = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';
      const method = editingProductId ? 'PUT' : 'POST';
      const result = await apiRequest(endpoint, { method, body: formData });
      await loadProducts();
      resetForm();
      if (result.product) {
        window.dispatchEvent(new CustomEvent("avielle:products-loaded"));
      }
    } catch (error) {
      alert(error.message || "Unable to save the product.");
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) {
      return;
    }

    const productId = Number(button.dataset.productId);
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    if (button.dataset.adminAction === "edit") {
      populateForm(product);
      return;
    }

    if (button.dataset.adminAction === "delete") {
      const confirmed = window.confirm(`Delete ${product.name}? This removes it from the shop immediately.`);
      if (!confirmed) {
        return;
      }

      try {
        await apiRequest(`/api/admin/products/${productId}`, { method: "DELETE" });
        await loadProducts();
        if (editingProductId === productId) {
          resetForm();
        }
        window.dispatchEvent(new CustomEvent("avielle:products-loaded"));
      } catch (error) {
        alert(error.message || "Unable to delete the product.");
      }
    }
  });

  if (websiteForm) {
    websiteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = {
          hero_headline: document.getElementById("hero-headline").value,
          hero_subtitle: document.getElementById("hero-subtitle").value,
          hero_image: document.getElementById("hero-image").value
        };
        await apiRequest('/api/admin/website', { method: 'POST', body: JSON.stringify(payload) });
        alert('Website settings saved successfully.');
      } catch (error) {
        alert(error.message || 'Unable to update website settings.');
      }
    });
  }

  resetButton.addEventListener("click", resetForm);
  resetForm();
  await loadProducts();
  await loadWebsiteSettings();
});
