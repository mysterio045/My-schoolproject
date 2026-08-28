import { MenuItem } from "../types";

export const mockMenu: MenuItem[] = [
  { id: "F-001", name: "Jollof Rice", description: "Classic Nigerian jollof rice with rich tomato sauce and spices", category: "Rice", price: 3500, available: true, image: "/food/jollof.jpg", rating: 4.8, orderCount: 1245 },
  { id: "F-002", name: "Chicken", description: "Grilled chicken portions, marinated and cooked to perfection", category: "Main Meals", price: 2500, available: true, image: "/food/chicken.jpg", rating: 4.7, orderCount: 1102 },
  { id: "F-003", name: "Fried Rice", description: "Nigerian-style fried rice with mixed vegetables and spices", category: "Rice", price: 3000, available: true, image: "/food/fried-rice.jpg", rating: 4.6, orderCount: 987 },
  { id: "F-004", name: "Beef", description: "Tender beef stew, slow-cooked with traditional Nigerian spices", category: "Main Meals", price: 2000, available: true, image: "/food/beef.jpg", rating: 4.5, orderCount: 876 },
  { id: "F-005", name: "Chicken Shawarma", description: "Spiced chicken wrapped in pita with fresh vegetables and sauce", category: "Snacks", price: 3500, available: true, image: "/food/shawarma.jpg", rating: 4.9, orderCount: 1567 },
  { id: "F-006", name: "Tuwo Shinkafa", description: "Soft rice pudding, a northern Nigerian staple", category: "Main Meals", price: 2000, available: true, image: "/food/tuwo.jpg", rating: 4.4, orderCount: 654 },
  { id: "F-007", name: "Miyan Kuka", description: "Baobab leaf soup, rich in nutrients and flavor", category: "Main Meals", price: 1500, available: true, image: "/food/miyan-kuka.jpg", rating: 4.3, orderCount: 543 },
  { id: "F-008", name: "Pounded Yam", description: "Smooth, stretchy pounded yam served with various soups", category: "Main Meals", price: 2500, available: true, image: "/food/pounded-yam.jpg", rating: 4.7, orderCount: 890 },
  { id: "F-009", name: "Egusi Soup", description: "Rich melon seed soup with spinach and assorted meats", category: "Main Meals", price: 2000, available: true, image: "/food/egusi.jpg", rating: 4.6, orderCount: 765 },
  { id: "F-010", name: "Coca-Cola", description: "Chilled Coca-Cola 500ml bottle", category: "Drinks", price: 500, available: true, image: "/food/coca-cola.jpg", rating: 4.5, orderCount: 2340 },
  { id: "F-011", name: "Fanta", description: "Chilled Fanta Orange 500ml bottle", category: "Drinks", price: 500, available: true, image: "/food/fanta.jpg", rating: 4.4, orderCount: 1876 },
  { id: "F-012", name: "Chivita", description: "Chivita fruit juice 1L, assorted flavors", category: "Drinks", price: 800, available: true, image: "/food/chivita.jpg", rating: 4.3, orderCount: 1234 },
  { id: "F-013", name: "Suya", description: "Grilled beef suya skewers with spicy yaji seasoning", category: "Snacks", price: 1500, available: true, image: "/food/suya.jpg", rating: 4.9, orderCount: 1456 },
  { id: "F-014", name: "Meat Pie", description: "Flaky pastry filled with seasoned minced meat and vegetables", category: "Pastries", price: 800, available: true, image: "/food/meat-pie.jpg", rating: 4.5, orderCount: 987 },
  { id: "F-015", name: "Chin Chin", description: "Crunchy fried dough snack, lightly sweetened", category: "Snacks", price: 500, available: true, image: "/food/chin-chin.jpg", rating: 4.4, orderCount: 1567 },
  { id: "F-016", name: "Puff Puff", description: "Soft, fluffy fried dough balls dusted with sugar", category: "Pastries", price: 300, available: true, image: "/food/puff-puff.jpg", rating: 4.6, orderCount: 1890 },
  { id: "F-017", name: "Masa", description: "Northern Nigerian rice cakes, soft and slightly sweet", category: "Pastries", price: 500, available: true, image: "/food/masa.jpg", rating: 4.3, orderCount: 654 },
  { id: "F-018", name: "Ice Cream", description: "Creamy vanilla ice cream, served in a cup or cone", category: "Desserts", price: 700, available: true, image: "/food/ice-cream.jpg", rating: 4.7, orderCount: 1123 },
  { id: "F-019", name: "Gulder", description: "Gulder Ultimate Beer 33cl bottle", category: "Drinks", price: 700, available: true, image: "/food/gulder.jpg", rating: 4.4, orderCount: 876 },
  { id: "F-020", name: "Star Lager", description: "Star Lager Beer 33cl bottle", category: "Drinks", price: 600, available: false, image: "/food/star.jpg", rating: 4.3, orderCount: 543 },
];

export const mockCategories = ["Main Meals", "Rice", "Snacks", "Pastries", "Drinks", "Desserts"];
