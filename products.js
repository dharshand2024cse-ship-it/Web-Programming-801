/* =========================================================
   PRODUCT CATALOG
   ---------------------------------------------------------
   A typical Tamil Nadu supermarket's products, grouped by
   section. Each entry only needs [name, price, unit, icon] -
   shelf codes and map coordinates are generated automatically
   from the section layout in supermarketMap.js, so adding a
   new product is just adding one line below.
   ========================================================= */

const ZONE_CODE = {
  grocery: "GR", masala: "MS", snacks: "SN", beverages: "BV", dairy: "DA",
  fruits: "FR", vegetables: "VG", personal: "PC", cleaning: "CL",
  pooja: "PJ", baby: "BC",
};

const CATALOG_BY_ZONE = {
  grocery: [
    ["Rice", 55, "1 kg", "🌾"], ["Ponni Rice", 62, "1 kg", "🌾"], ["Idli Rice", 58, "1 kg", "🌾"],
    ["Sona Masoori Rice", 68, "1 kg", "🌾"], ["Basmati Rice", 120, "1 kg", "🌾"],
    ["Toor Dal", 145, "1 kg", "🫘"], ["Urad Dal", 130, "1 kg", "🫘"], ["Moong Dal", 135, "1 kg", "🫘"],
    ["Wheat Atta", 48, "1 kg", "🌾"], ["Rava", 55, "1 kg", "🌾"],
    ["Sugar", 45, "1 kg", "🧂"], ["Salt", 22, "1 kg", "🧂"], ["Jaggery", 65, "1 kg", "🍯"],
    ["Tamarind", 90, "500 g", "🌰"], ["Coconut Oil", 210, "1 L", "🥥"], ["Groundnut Oil", 190, "1 L", "🛢️"],
  ],
  masala: [
    ["Turmeric Powder", 35, "100 g", "🌶️"], ["Chilli Powder", 45, "100 g", "🌶️"],
    ["Coriander Powder", 30, "100 g", "🌶️"], ["Garam Masala", 55, "100 g", "🌶️"],
    ["Sambar Powder", 60, "200 g", "🌶️"], ["Rasam Powder", 55, "200 g", "🌶️"],
    ["Pepper", 90, "100 g", "🌶️"], ["Cumin Seeds", 60, "100 g", "🌶️"],
    ["Mustard Seeds", 25, "100 g", "🌶️"], ["Fennel Seeds", 40, "100 g", "🌶️"],
  ],
  snacks: [
    ["Murukku", 90, "200 g", "🍿"], ["Mixture", 85, "200 g", "🍿"], ["Banana Chips", 80, "200 g", "🍌"],
    ["Potato Chips", 20, "1 pack", "🥔"], ["Appalam", 60, "1 pack", "🍿"], ["Biscuits", 30, "1 pack", "🍪"],
    ["Instant Noodles", 14, "1 pack", "🍜"], ["Chocolate", 40, "1 bar", "🍫"],
  ],
  beverages: [
    ["Filter Coffee Powder", 140, "200 g", "☕"], ["Tea Powder", 110, "250 g", "🍵"],
    ["Horlicks", 210, "500 g", "🥤"], ["Boost", 215, "500 g", "🥤"], ["Fruit Juice", 45, "1 L", "🧃"],
    ["Soft Drinks", 40, "750 ml", "🥤"], ["Packaged Water", 20, "1 L", "💧"],
  ],
  dairy: [
    ["Milk", 30, "500 ml", "🥛"], ["Curd", 35, "400 g", "🥛"], ["Buttermilk", 15, "200 ml", "🥛"],
    ["Paneer", 90, "200 g", "🧀"], ["Butter", 55, "100 g", "🧈"], ["Cheese", 120, "200 g", "🧀"],
    ["Ghee", 320, "500 ml", "🧈"],
  ],
  fruits: [
    ["Banana", 45, "1 dozen", "🍌"], ["Apple", 180, "1 kg", "🍎"], ["Orange", 90, "1 kg", "🍊"],
    ["Grapes", 80, "500 g", "🍇"], ["Mango", 110, "1 kg", "🥭"], ["Watermelon", 40, "1 piece", "🍉"],
  ],
  vegetables: [
    ["Tomato", 30, "1 kg", "🍅"], ["Potato", 25, "1 kg", "🥔"], ["Onion", 35, "1 kg", "🧅"],
    ["Carrot", 40, "1 kg", "🥕"], ["Brinjal", 30, "1 kg", "🍆"], ["Beans", 45, "500 g", "🫛"],
    ["Green Chilli", 20, "100 g", "🌶️"], ["Drumstick", 35, "4 pieces", "🥬"],
    ["Ladies Finger", 30, "500 g", "🥬"], ["Curry Leaves", 5, "1 bunch", "🌿"],
  ],
  personal: [
    ["Shampoo", 145, "180 ml", "🧴"], ["Bath Soap", 40, "1 bar", "🧼"], ["Toothpaste", 55, "100 g", "🪥"],
    ["Toothbrush", 30, "1 piece", "🪥"], ["Face Wash", 110, "100 g", "🧴"], ["Hair Oil", 95, "200 ml", "🧴"],
    ["Conditioner", 130, "180 ml", "🧴"], ["Deodorant", 180, "150 ml", "🧴"],
  ],
  cleaning: [
    ["Detergent Powder", 95, "1 kg", "🧺"], ["Dishwash Liquid", 85, "500 ml", "🧴"],
    ["Dish Soap", 25, "1 bar", "🧼"], ["Floor Cleaner", 90, "500 ml", "🧴"],
    ["Toilet Cleaner", 75, "500 ml", "🧴"], ["Phenyl", 60, "500 ml", "🧴"],
    ["Garbage Bags", 45, "1 pack", "🗑️"], ["Tissue Paper", 55, "1 pack", "🧻"],
  ],
  pooja: [
    ["Camphor", 30, "50 g", "🪔"], ["Incense Sticks", 25, "1 pack", "🪔"], ["Kumkum", 15, "1 pack", "🔴"],
    ["Pooja Turmeric", 20, "100 g", "🟡"], ["Pooja Oil", 60, "200 ml", "🪔"],
  ],
  baby: [
    ["Baby Soap", 60, "1 bar", "🧼"], ["Baby Shampoo", 140, "200 ml", "🧴"],
    ["Baby Powder", 110, "200 g", "🧴"], ["Diapers", 350, "1 pack", "👶"], ["Baby Wipes", 90, "1 pack", "👶"],
  ],
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildProductCatalog() {
  const products = [];
  ZONES.forEach((zone) => {
    const items = CATALOG_BY_ZONE[zone.id];
    if (!items) return; // decorative zones (e.g. Trolley Bay) carry no products
    const slots = zoneOpenSlots(zone);
    const codePrefix = ZONE_CODE[zone.id];
    items.forEach((item, index) => {
      const [name, price, unit, icon] = item;
      const slot = slots[index];
      products.push({
        id: slugify(name),
        name,
        category: zone.category,
        section: zone.label,
        zoneId: zone.id,
        shelf: `${codePrefix}-${String(index + 1).padStart(2, "0")}`,
        x: slot.x,
        y: slot.y,
        icon: icon || zone.icon,
        price,
        unit,
      });
    });
  });
  return products;
}

const PRODUCTS = buildProductCatalog();
const CATEGORY_LIST = ["All", ...ZONES.filter((z) => !z.decorative).map((z) => z.category)];
