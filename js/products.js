const PRODUCT_STORAGE_KEY = "avielleProductsData";

const defaultProducts = [
  {
    id: 1,
    name: "The Verona Tote",
    category: "Handbags",
    price: 420,
    salePrice: 360,
    rating: 5,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    alt: "Brown leather handbag from Avielle",
    description: "A softly structured leather tote finished with brushed gold hardware and room for everyday essentials.",
    details: [
      "Full-grain Italian leather",
      "Interior zip pocket",
      "Adjustable shoulder strap"
    ],
    tags: ["handbag", "leather", "work", "luxury"],
    stock: 12
  },
  {
    id: 2,
    name: "Soleil Silk Dress",
    category: "Dresses",
    price: 280,
    salePrice: null,
    rating: 4,
    badge: "New",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    alt: "Elegant cream silk dress",
    description: "An airy silk silhouette with a flattering drape, perfect for evenings and polished daytime events.",
    details: [
      "Silk blend fabric",
      "Satin lining",
      "Hidden back zip"
    ],
    tags: ["dress", "silk", "evening", "fashion"],
    stock: 8
  },
  {
    id: 3,
    name: "Aurora Necklace",
    category: "Jewelry",
    price: 180,
    salePrice: 150,
    rating: 5,
    badge: "Sale",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
    alt: "Gold necklace with gemstone pendant",
    description: "A delicate necklace designed to layer beautifully with everyday neutrals and dressy occasion looks.",
    details: [
      "18k gold vermeil",
      "Austrian crystal detail",
      "Gift-ready box"
    ],
    tags: ["jewelry", "necklace", "gift", "gold"],
    stock: 15
  },
  {
    id: 4,
    name: "Velvet Bloom Perfume",
    category: "Perfume",
    price: 140,
    salePrice: null,
    rating: 5,
    badge: "Signature",
    image: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=900&q=80",
    alt: "Glass perfume bottle with floral scent",
    description: "A warm floral fragrance with soft rose, amber, and vanilla notes for an elegant signature trail.",
    details: [
      "50 ml bottle",
      "Rose and amber blend",
      "Clean, elegant finish"
    ],
    tags: ["perfume", "fragrance", "beauty", "gift"],
    stock: 19
  },
  {
    id: 5,
    name: "Luna Accent Table",
    category: "Home Decor",
    price: 360,
    salePrice: 310,
    rating: 4,
    badge: "Limited",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    alt: "Modern accent table in a luxury living room",
    description: "Elegant side table with sculptural lines that adds a quiet sense of refinement to any room.",
    details: [
      "Solid walnut finish",
      "Statement silhouette",
      "Easy-care surface"
    ],
    tags: ["home", "decor", "living", "luxury"],
    stock: 5
  },
  {
    id: 6,
    name: "Cedar & Fig Candle",
    category: "Candles",
    price: 52,
    salePrice: null,
    rating: 5,
    badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1602872029705-7b5f7c1ea9d0?auto=format&fit=crop&w=900&q=80",
    alt: "Luxury candle in glass vessel",
    description: "A warm cedar and fig scent designed to create a cozy, elevated atmosphere in any space.",
    details: [
      "Soy wax blend",
      "8-hour burn time",
      "Hand-poured in small batches"
    ],
    tags: ["candle", "home", "cozy", "gift"],
    stock: 26
  },
  {
    id: 7,
    name: "Mira Leather Wallet",
    category: "Accessories",
    price: 120,
    salePrice: 95,
    rating: 4,
    badge: "Editor Pick",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80",
    alt: "Minimal leather wallet",
    description: "A sleek leather wallet with card slots and a compact silhouette designed for daily carry.",
    details: [
      "Soft-touch leather",
      "Slim profile",
      "Magnetic clasp"
    ],
    tags: ["wallet", "accessory", "leather", "daily"],
    stock: 20
  },
  {
    id: 8,
    name: "Celeste Gift Set",
    category: "Gifts",
    price: 160,
    salePrice: null,
    rating: 5,
    badge: "Gift Edit",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    alt: "Luxury gift box with curated beauty items",
    description: "A thoughtful assortment of home and beauty favorites arranged in a premium keepsake box.",
    details: [
      "Curated product selection",
      "Beautiful presentation",
      "Ready to gift"
    ],
    tags: ["gift", "curated", "beauty", "premium"],
    stock: 11
  },
  {
    id: 9,
    name: "Marlow Sunglasses",
    category: "Accessories",
    price: 230,
    salePrice: null,
    rating: 4,
    badge: "Trending",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    alt: "Luxury sunglasses in sunglasses store",
    description: "Classic acetate frames and subtle gold details give these sunglasses a timeless finish.",
    details: [
      "UV protection",
      "Acetate frame",
      "Soft leather case included"
    ],
    tags: ["sunglasses", "accessory", "summer", "fashion"],
    stock: 9
  },
  {
    id: 10,
    name: "Noor Statement Ring",
    category: "Jewelry",
    price: 210,
    salePrice: 180,
    rating: 5,
    badge: "New Arrival",
    image: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=900&q=80",
    alt: "Gold statement ring on a marble background",
    description: "A bold, modern ring with polished detailing that adds instant presence to any outfit.",
    details: [
      "Brushed gold finish",
      "Statement stone setting",
      "Comfort-fit band"
    ],
    tags: ["ring", "jewelry", "gold", "statement"],
    stock: 7
  },
  {
    id: 11,
    name: "Atelier Ceramic Vase",
    category: "Home Decor",
    price: 190,
    salePrice: null,
    rating: 4,
    badge: "Special",
    image: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80",
    alt: "Ceramic vase placed on a table",
    description: "Crafted to add texture and quiet elegance to shelves, mantels, and side tables.",
    details: [
      "Hand-finished ceramic",
      "Textured matte glaze",
      "Sophisticated neutral tone"
    ],
    tags: ["vase", "decor", "ceramic", "home"],
    stock: 14
  },
  {
    id: 12,
    name: "Reverie Mini Perfume",
    category: "Perfume",
    price: 95,
    salePrice: 80,
    rating: 4,
    badge: "Mini Edition",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",
    alt: "Luxury mini perfume bottle",
    description: "A refined, softly floral perfume in a travel-friendly format for everyday elegance.",
    details: [
      "Travel size",
      "Soft floral notes",
      "Elegant packaging"
    ],
    tags: ["perfume", "mini", "beauty", "travel"],
    stock: 18
  }
];

function normalizeProduct(product, fallbackIndex = 0) {
  const name = String(product?.name || `Product ${fallbackIndex + 1}`).trim();
  const category = String(product?.category || "General").trim() || "General";
  const price = Number(product?.price ?? 0);
  const stock = Number(product?.stock ?? 0);

  return {
    id: Number(product?.id ?? Date.now() + fallbackIndex + 1),
    name,
    category,
    price: Number.isFinite(price) ? price : 0,
    salePrice: product?.salePrice != null && Number(product.salePrice) > 0 ? Number(product.salePrice) : null,
    rating: Number(product?.rating ?? 4) || 4,
    badge: product?.badge || "New",
    image: product?.image || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    alt: product?.alt || `${name} by Avielle`,
    description: String(product?.description || "A thoughtfully curated addition to the Avielle collection.").trim(),
    details: Array.isArray(product?.details) && product.details.length ? product.details : [String(product?.description || "A thoughtfully curated addition to the Avielle collection.").trim()],
    tags: Array.isArray(product?.tags) && product.tags.length ? product.tags : [category.toLowerCase(), name.toLowerCase()],
    stock: Number.isFinite(stock) ? stock : 0
  };
}

function readStoredProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      return saved.map((item, index) => normalizeProduct(item, index));
    }
  } catch (error) {
    console.warn("Unable to parse stored Avielle products.", error);
  }

  return null;
}

function persistProducts(products) {
  const normalizedProducts = (Array.isArray(products) ? products : defaultProducts).map((product, index) => normalizeProduct(product, index));
  window.avielleProducts = normalizedProducts;
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(normalizedProducts));
  return normalizedProducts;
}

window.saveAvielleProducts = function (products) {
  return persistProducts(products);
};

window.avielleProducts = persistProducts(readStoredProducts() || defaultProducts);
