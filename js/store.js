function normalizeApiProduct(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const image = images.find((item) => item.is_primary)?.image_url || images[0]?.image_url || product.image || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80';
  const price = Number(product.price || 0);
  const salePriceValue = product.salePrice != null ? Number(product.salePrice) : (product.sale_price != null ? Number(product.sale_price) : null);
  const salePrice = Number.isFinite(salePriceValue) && salePriceValue > 0 ? salePriceValue : null;
  const category = product.category || product.category_name || 'General';

  return {
    id: Number(product.id),
    name: product.name,
    category,
    price,
    salePrice,
    rating: Number(product.rating || 4),
    badge: product.badge || 'New',
    image,
    alt: `${product.name} by Avielle`,
    description: product.description || 'A thoughtfully curated addition to the Avielle collection.',
    details: Array.isArray(product.details) && product.details.length
      ? product.details
      : [product.description || 'A thoughtfully curated addition to the Avielle collection.'],
    tags: Array.isArray(product.tags) && product.tags.length ? product.tags : [category.toLowerCase(), product.name.toLowerCase()],
    stock: Number(product.stock || 0)
  };
}

async function loadStoreProducts() {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.products)) {
      return;
    }

    window.avielleProducts = data.products.map(normalizeApiProduct);
    window.dispatchEvent(new CustomEvent('avielle:products-loaded'));
  } catch (error) {
    console.warn('Unable to load products from Avielle API.', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body?.dataset?.page;
  if (page === 'home' || page === 'shop' || page === 'product') {
    loadStoreProducts();
  }
});
