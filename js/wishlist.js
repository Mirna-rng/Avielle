function renderWishlistPage() {
  const savedIds = JSON.parse(localStorage.getItem("avielleWishlist")) || [];
  const listContainer = document.querySelector("[data-wishlist-list]");
  const summary = document.querySelector("[data-wishlist-summary]");

  if (!listContainer || !summary) {
    return;
  }

  if (!savedIds.length) {
    listContainer.innerHTML = `
      <div class="empty-wishlist">
        <h3>Your wishlist is empty.</h3>
        <p>Save the pieces you love and move them to your cart when you're ready.</p>
        <a href="shop.html" class="btn btn--primary">Browse the Shop</a>
      </div>
    `;
    summary.innerHTML = `
      <h3>Saved Items</h3>
      <div class="summary-line"><span>Items saved</span><strong>0</strong></div>
      <button class="btn btn--secondary" type="button" style="width:100%; margin-top:1rem;" onclick="window.location.href='shop.html'">Explore more</button>
    `;
    return;
  }

  const items = savedIds
    .map((id) => getProductById(id))
    .filter(Boolean);

  listContainer.innerHTML = items.map((product) => `
    <article class="wishlist-item">
      <img class="wishlist-item__image" src="${product.image}" alt="${product.alt}">
      <div class="wishlist-item__meta">
        <div class="wishlist-item__top">
          <div>
            <h3>${product.name}</h3>
            <p class="text-muted">${product.category}</p>
          </div>
          <strong>${product.salePrice ? formatPrice(product.salePrice) : formatPrice(product.price)}</strong>
        </div>
        <p class="text-muted">${product.description}</p>
        <div class="cart-actions">
          <button class="btn btn--primary" type="button" data-action="move-to-cart" data-product-id="${product.id}">Move to Cart</button>
          <button class="link-button danger" type="button" data-action="remove-from-wishlist" data-product-id="${product.id}">Remove</button>
        </div>
      </div>
    </article>
  `).join("");

  summary.innerHTML = `
    <h3>Saved Items</h3>
    <div class="summary-line"><span>Items saved</span><strong>${items.length}</strong></div>
    <a href="shop.html" class="btn btn--secondary" style="width:100%; margin-top:1rem; display:inline-flex;">Continue Shopping</a>
  `;
}
