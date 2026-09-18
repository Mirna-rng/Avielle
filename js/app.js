document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initHeaderSearch();
  initFaqAccordions();
  updateCartCount();
  updateWishlistCount();

  document.addEventListener("avielle:products-loaded", () => {
    if (document.body.dataset.page === "home") {
      renderHomeProducts();
    }

    if (document.body.dataset.page === "product") {
      renderProductPage();
    }

    if (document.body.dataset.page === "shop") {
      initShopPage();
    }
  });

  if (document.body.dataset.page === "home") {
    renderHomeProducts();
  }

  if (document.body.dataset.page === "product") {
    renderProductPage();
  }

  if (document.body.dataset.page === "shop") {
    initShopPage();
  }

  if (document.body.dataset.page === "cart") {
    renderCartPage();
  }

  if (document.body.dataset.page === "wishlist") {
    renderWishlistPage();
  }
});

function initMobileMenu() {
  const toggle = document.querySelector(".mobile-toggle");
  const nav = document.querySelector(".main-nav");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function initHeaderSearch() {
  const forms = document.querySelectorAll(".search-form");

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input[name='search']");
      const query = input ? input.value.trim() : "";
      window.location.href = `shop.html${query ? `?search=${encodeURIComponent(query)}` : ""}`;
    });
  });
}

function initFaqAccordions() {
  const items = document.querySelectorAll(".faq-item");

  items.forEach((item) => {
    const button = item.querySelector(".faq-item__question");
    const answer = item.querySelector(".faq-item__answer");

    if (!button || !answer) {
      return;
    }

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      items.forEach((faqItem) => {
        faqItem.classList.remove("is-open");
        const faqAnswer = faqItem.querySelector(".faq-item__answer");
        if (faqAnswer) {
          faqAnswer.hidden = true;
        }
      });

      if (!isOpen) {
        item.classList.add("is-open");
        answer.hidden = false;
      }
    });

    answer.hidden = !item.classList.contains("is-open");
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0
  }).format(value);
}

function getProductById(productId) {
  return window.avielleProducts.find((product) => product.id === Number(productId));
}

function createStars(rating) {
  return Array.from({ length: 5 }, (_, index) => (index < rating ? "★" : "☆")).join("");
}

function createProductCard(product) {
  if (!product) {
    return "";
  }

  const discount = product.salePrice ? `
    <span class="product-price">${formatPrice(product.salePrice)}</span>
    <span class="original-price">${formatPrice(product.price)}</span>
  ` : `<span class="product-price">${formatPrice(product.price)}</span>`;

  const isWishlisted = isProductSaved(product.id, "wishlist");

  return `
    <article class="product-card">
      <div class="product-card__image-wrap">
        <img src="${product.image}" alt="${product.alt}" loading="lazy">
        ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
        <button
          class="icon-button product-card__wishlist ${isWishlisted ? "is-active" : ""}"
          type="button"
          data-action="toggle-wishlist"
          data-product-id="${product.id}"
          aria-label="${isWishlisted ? "Remove" : "Add"} ${product.name} from wishlist"
        >
          ${isWishlisted ? "♥" : "♡"}
        </button>
      </div>
      <div class="product-card__content">
        <p class="product-card__category">${product.category}</p>
        <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
        <div class="rating" aria-label="Rated ${product.rating} out of 5">${createStars(product.rating)}</div>
        <div class="product-card__price">
          ${discount}
        </div>
        <div class="product-card__actions">
          <button class="btn btn--primary" type="button" data-action="add-to-cart" data-product-id="${product.id}">Add to Cart</button>
          <button class="icon-button icon-button--small ${isWishlisted ? "is-active" : ""}" type="button" data-action="toggle-wishlist" data-product-id="${product.id}" aria-label="Save ${product.name} to wishlist">
            ${isWishlisted ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderHomeProducts() {
  const featuredGrid = document.querySelector("[data-home-featured]");
  const newArrivalGrid = document.querySelector("[data-home-new]");
  const bestSellerGrid = document.querySelector("[data-home-best]");

  if (!Array.isArray(window.avielleProducts) || !window.avielleProducts.length) {
    return;
  }

  if (!featuredGrid && !newArrivalGrid && !bestSellerGrid) {
    return;
  }

  const featuredProducts = window.avielleProducts.slice(0, 4);
  const newProducts = window.avielleProducts.slice(2, 6);
  const bestProducts = window.avielleProducts.slice(6, 10);

  if (featuredGrid) {
    featuredGrid.innerHTML = featuredProducts.map(createProductCard).join("");
  }

  if (newArrivalGrid) {
    newArrivalGrid.innerHTML = newProducts.map(createProductCard).join("");
  }

  if (bestSellerGrid) {
    bestSellerGrid.innerHTML = bestProducts.map(createProductCard).join("");
  }
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("avielleCart")) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cartItems) {
  localStorage.setItem("avielleCart", JSON.stringify(cartItems));
}

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem("avielleWishlist")) || [];
  } catch (error) {
    return [];
  }
}

function saveWishlist(productIds) {
  localStorage.setItem("avielleWishlist", JSON.stringify(productIds));
}

function isProductSaved(productId, listName) {
  const items = listName === "wishlist" ? getWishlist() : getCart();
  return items.includes(Number(productId)) || items.some((item) => Number(item.id) === Number(productId));
}

function addToCart(productId, quantity = 1) {
  const cartItems = getCart();
  const product = getProductById(productId);

  if (!product) {
    return;
  }

  const foundItem = cartItems.find((item) => item.id === Number(productId));

  if (foundItem) {
    foundItem.quantity += quantity;
  } else {
    cartItems.push({
      id: Number(productId),
      quantity: quantity
    });
  }

  saveCart(cartItems);
  updateCartCount();
}

function removeFromCart(productId) {
  const updatedCart = getCart().filter((item) => item.id !== Number(productId));
  saveCart(updatedCart);
  updateCartCount();
  if (document.body.dataset.page === "cart") {
    renderCartPage();
  }
}

function updateCartQuantity(productId, change) {
  const cartItems = getCart();
  const target = cartItems.find((item) => item.id === Number(productId));

  if (!target) {
    return;
  }

  target.quantity += change;

  if (target.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart(cartItems);
  updateCartCount();

  if (document.body.dataset.page === "cart") {
    renderCartPage();
  }
}

function updateCartCount() {
  const cartItems = getCart();
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = totalCount;
  });
}

function toggleWishlist(productId) {
  const wishlist = getWishlist();
  const numericId = Number(productId);
  const exists = wishlist.includes(numericId);

  const updated = exists
    ? wishlist.filter((item) => item !== numericId)
    : [...wishlist, numericId];

  saveWishlist(updated);
  updateWishlistCount();

  if (document.body.dataset.page === "wishlist") {
    renderWishlistPage();
  }

  if (document.body.dataset.page === "shop" || document.body.dataset.page === "home") {
    const cards = document.querySelectorAll("[data-action='toggle-wishlist']");
    cards.forEach((button) => {
      const productButtonId = Number(button.dataset.productId);
      if (productButtonId === numericId) {
        button.classList.toggle("is-active", !exists);
        button.innerHTML = !exists ? "♥" : "♡";
      }
    });
  }
}

function updateWishlistCount() {
  const wishlist = getWishlist();

  document.querySelectorAll("[data-wishlist-count]").forEach((element) => {
    element.textContent = wishlist.length;
  });
}

function moveWishlistToCart(productId) {
  addToCart(productId);
  toggleWishlist(productId);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const productId = button.dataset.productId;

  if (action === "add-to-cart") {
    const selectedQuantity = document.body.dataset.page === "product"
      ? Number(document.getElementById("product-quantity")?.textContent || 1)
      : 1;
    addToCart(productId, selectedQuantity);
  }

  if (action === "toggle-wishlist") {
    toggleWishlist(productId);
  }

  if (action === "move-to-cart") {
    moveWishlistToCart(productId);
  }

  if (action === "remove-from-cart") {
    removeFromCart(productId);
  }

  if (action === "decrease-quantity") {
    const quantityField = document.getElementById("product-quantity");
    if (document.body.dataset.page === "product" && quantityField) {
      const currentValue = Number(quantityField.textContent) || 1;
      quantityField.textContent = String(Math.max(1, currentValue - 1));
      return;
    }
    updateCartQuantity(productId, -1);
  }

  if (action === "increase-quantity") {
    const quantityField = document.getElementById("product-quantity");
    if (document.body.dataset.page === "product" && quantityField) {
      const currentValue = Number(quantityField.textContent) || 1;
      quantityField.textContent = String(currentValue + 1);
      return;
    }
    updateCartQuantity(productId, 1);
  }

  if (action === "remove-from-wishlist") {
    toggleWishlist(productId);
  }
});

function renderProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = Number(params.get("id") || "1");
  const productList = Array.isArray(window.avielleProducts) ? window.avielleProducts : [];
  const product = getProductById(productId) || productList[0];
  const container = document.querySelector("[data-product-page]");

  if (!container || !product) {
    return;
  }

  const relatedProducts = window.avielleProducts
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  const galleryImages = [
    product.image,
    product.image,
    product.image
  ];

  container.innerHTML = `
    <div class="product-layout">
      <div class="product-gallery">
        <div class="product-gallery__main">
          <img src="${galleryImages[0]}" alt="${product.alt || product.name}" id="main-product-image">
        </div>
        ${galleryImages.map((image, index) => `
          <div class="product-gallery__thumb" data-gallery-thumb="${index}">
            <img src="${image}" alt="${product.name} preview ${index + 1}">
          </div>
        `).join("")}
      </div>
      <div class="product-page__content">
        <p class="product-page__category">${product.category}</p>
        <h1 class="product-page__title">${product.name}</h1>
        <div class="product-page__meta">
          <div class="rating" aria-label="Rated ${product.rating} out of 5">${createStars(product.rating)}</div>
          <span class="text-muted">4.9/5 from 120 reviews</span>
        </div>
        <div class="product-page__price">
          <span class="product-price product-price--large">${product.salePrice ? formatPrice(product.salePrice) : formatPrice(product.price)}</span>
          ${product.salePrice ? `<span class="original-price">${formatPrice(product.price)}</span>` : ""}
        </div>
        <p class="lead">${product.description}</p>
        <div class="product-page__actions">
          <div class="quantity-picker" aria-label="Quantity selector">
            <button type="button" data-action="decrease-quantity" data-product-id="${product.id}" aria-label="Decrease quantity">−</button>
            <span id="product-quantity">1</span>
            <button type="button" data-action="increase-quantity" data-product-id="${product.id}" aria-label="Increase quantity">＋</button>
          </div>
          <button class="btn btn--primary" type="button" data-action="add-to-cart" data-product-id="${product.id}">Add to Cart</button>
          <button class="icon-button ${isProductSaved(product.id, "wishlist") ? "is-active" : ""}" type="button" data-action="toggle-wishlist" data-product-id="${product.id}" aria-label="Save ${product.name} to wishlist">
            ${isProductSaved(product.id, "wishlist") ? "♥" : "♡"}
          </button>
        </div>
        <div class="product-details">
          <h3>Product details</h3>
          <ul class="details-list">
            ${(product.details || [product.description]).map((detail) => `<li>• ${detail}</li>`).join("")}
          </ul>
        </div>
      </div>
    </div>

    <div class="related-products">
      <div class="filter-toolbar">
        <div>
          <p class="eyebrow">Related pieces</p>
          <h2 class="heading">You may also like</h2>
        </div>
      </div>
      <div class="product-grid">
        ${relatedProducts.map(createProductCard).join("")}
      </div>
    </div>
  `;

  const galleryButtons = document.querySelectorAll("[data-gallery-thumb]");
  galleryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mainImage = document.getElementById("main-product-image");
      if (mainImage) {
        mainImage.src = galleryImages[Number(button.dataset.galleryThumb)];
      }
    });
  });
}

function initShopPage() {
  const grid = document.querySelector("[data-shop-grid]");
  const searchInput = document.getElementById("shopSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const priceFilter = document.getElementById("priceFilter");
  const sortFilter = document.getElementById("sortFilter");

  if (!grid) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("search") || "";
  const initialCategory = params.get("category") || "all";

  if (searchInput) {
    searchInput.value = initialQuery;
  }

  if (categoryFilter && initialCategory !== "all") {
    categoryFilter.value = initialCategory;
  }

  function renderFilteredProducts() {
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const category = categoryFilter ? categoryFilter.value : "all";
    const maxPrice = priceFilter ? Number(priceFilter.value) : 1000;
    const sortValue = sortFilter ? sortFilter.value : "featured";

    let filteredProducts = Array.isArray(window.avielleProducts) ? window.avielleProducts.filter((product) => {
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory = category === "all" || product.category === category;
      const activePrice = product.salePrice ? product.salePrice : product.price;
      const matchesPrice = activePrice <= maxPrice;

      return matchesQuery && matchesCategory && matchesPrice;
    }) : [];

    if (sortValue === "price-low") {
      filteredProducts.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    }

    if (sortValue === "price-high") {
      filteredProducts.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    }

    if (sortValue === "popular") {
      filteredProducts.sort((a, b) => b.rating - a.rating);
    }

    const resultsText = document.querySelector("[data-results-count]");
    if (resultsText) {
      resultsText.textContent = `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`;
    }

    if (!filteredProducts.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No products match your filters.</h3>
          <p>Try a different search term or reset your category filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredProducts.map(createProductCard).join("");
  }

  [searchInput, categoryFilter, priceFilter, sortFilter].forEach((control) => {
    if (control) {
      control.addEventListener("input", renderFilteredProducts);
      control.addEventListener("change", renderFilteredProducts);
    }
  });

  renderFilteredProducts();
}
