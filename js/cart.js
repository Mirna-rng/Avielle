function renderCartPage() {
  const cartItems = JSON.parse(localStorage.getItem("avielleCart")) || [];
  const listContainer = document.querySelector("[data-cart-list]");
  const summary = document.querySelector("[data-cart-summary]");

  if (!listContainer || !summary) {
    return;
  }

  if (!cartItems.length) {
    listContainer.innerHTML = `
      <div class="empty-cart">
        <h3>Your cart is empty.</h3>
        <p>Browse our latest arrivals and add something beautiful to your bag.</p>
        <a href="shop.html" class="btn btn--primary">Continue Shopping</a>
      </div>
    `;
    summary.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-line"><span>Subtotal</span><strong>$0</strong></div>
      <div class="summary-line"><span>Shipping</span><strong>Free</strong></div>
      <div class="summary-total"><span>Total</span><span>$0</span></div>
      <button class="btn btn--primary" type="button" style="width:100%; margin-top:1rem;">Proceed to Checkout</button>
    `;
    return;
  }

  let subtotal = 0;

  listContainer.innerHTML = cartItems.map((item) => {
    const product = getProductById(item.id);
    if (!product) {
      return "";
    }

    const finalPrice = product.salePrice || product.price;
    const lineTotal = finalPrice * item.quantity;
    subtotal += lineTotal;

    return `
      <article class="cart-item">
        <img class="cart-item__image" src="${product.image}" alt="${product.alt}">
        <div class="cart-item__meta">
          <div class="cart-item__top">
            <div>
              <h3>${product.name}</h3>
              <p class="text-muted">${product.category}</p>
            </div>
            <strong>${formatPrice(lineTotal)}</strong>
          </div>
          <p class="text-muted">${formatPrice(finalPrice)} each</p>
          <div class="cart-actions">
            <div class="quantity-picker" aria-label="Update quantity for ${product.name}">
              <button type="button" data-action="decrease-quantity" data-product-id="${product.id}" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="increase-quantity" data-product-id="${product.id}" aria-label="Increase quantity">＋</button>
            </div>
            <button class="link-button danger" type="button" data-action="remove-from-cart" data-product-id="${product.id}">Remove</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  summary.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-line"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>
    <div class="summary-line"><span>Shipping</span><strong>Free</strong></div>
    <div class="summary-line"><span>Items</span><strong>${cartItems.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
    <div class="summary-total"><span>Total</span><span>${formatPrice(subtotal)}</span></div>
    <button class="btn btn--primary" type="button" style="width:100%; margin-top:1rem;">Proceed to Checkout</button>
  `;
}
