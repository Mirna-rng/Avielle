window.AvielleSearch = {
  filterProducts(products, query, category, maxPrice, sortValue) {
    const normalizedQuery = query.trim().toLowerCase();

    let filtered = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      const matchesCategory = category === "all" || product.category === category;
      const priceValue = product.salePrice || product.price;
      const matchesPrice = priceValue <= maxPrice;

      return matchesQuery && matchesCategory && matchesPrice;
    });

    if (sortValue === "price-low") {
      filtered = filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    }

    if (sortValue === "price-high") {
      filtered = filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    }

    if (sortValue === "popular") {
      filtered = filtered.sort((a, b) => b.rating - a.rating);
    }

    return filtered;
  }
};
