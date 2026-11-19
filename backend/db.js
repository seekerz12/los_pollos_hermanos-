// Mock database mirroring the 9 ER tables.

const users = [
  { user_id: 1, username: "walter", password: "customer123", full_name: "Walter White", role: "CUSTOMER" },
  { user_id: 2, username: "lyle", password: "staff123", full_name: "Lyle (Assistant)", role: "STAFF" },
  { user_id: 3, username: "gus", password: "manager123", full_name: "Gustavo Fring", role: "MANAGER" },
];

const menuItems = [
  { item_id: 1, category: "Signature Chicken", item_name: "Los Pollos Classic Bucket (8 pcs)", unit_price: 18.50, is_available: true },
  { item_id: 2, category: "Combo Meals", item_name: "Pollos Signature Combo", unit_price: 11.99, is_available: true },
  { item_id: 3, category: "Sides", item_name: "Southwest Spice Curls", unit_price: 4.50, is_available: true },
  { item_id: 4, category: "Beverages", item_name: "Albuquerque Iced Tea", unit_price: 2.75, is_available: true },
];

const ingredients = [
  { ingredient_id: 1, ingredient_name: "Whole Chicken", supplier: "Albuquerque Farms", unit: "kg", current_stock: 45, reorder_level: 15 },
  { ingredient_id: 2, ingredient_name: "Franch Batter Mix", supplier: "Madrigal Electromotive GmbH", unit: "kg", current_stock: 8, reorder_level: 10 },
  { ingredient_id: 3, ingredient_name: "Southwest Spice Blend", supplier: "Madrigal Electromotive GmbH", unit: "kg", current_stock: 12, reorder_level: 5 },
];

let orders = [
  {
    order_id: 101,
    order_number: "#LPH-101",
    customer_id: 1,
    customer_name: "Walter White",
    staff_id: 2,
    order_type: "TAKEAWAY",
    order_status: "PREPARING",
    payment_status: "PAID",
    total_amount: 16.49,
    created_at: new Date().toISOString(),
    items: [
      { item_id: 2, item_name: "Pollos Signature Combo", quantity: 1, unit_price: 11.99, special_instructions: "Extra Franch dip" },
      { item_id: 3, item_name: "Southwest Spice Curls", quantity: 1, unit_price: 4.50, special_instructions: "Extra crispy" },
    ],
  },
];

let nextUserId = 4;
let nextOrderId = 102;
let nextMenuItemId = 5;

module.exports = {
  users,
  menuItems,
  ingredients,
  addUser: (user) => {
    const newUser = { ...user, user_id: nextUserId++ };
    users.push(newUser);
    return newUser;
  },
  getOrders: () => orders,
  addOrder: (order) => {
    const newOrder = { ...order, order_id: nextOrderId, order_number: `#LPH-${nextOrderId}` };
    nextOrderId++;
    orders.unshift(newOrder);
    return newOrder;
  },
  addMenuItem: (item) => {
    const newItem = { ...item, item_id: nextMenuItemId++ };
    menuItems.push(newItem);
    return newItem;
  },
 getAlerts: () => alerts,
  addAlert: (alert) => {
    const newAlert = {
      ...alert,
      alert_id: nextAlertId++,
      resolved: false,
      created_at: new Date().toISOString(),
    };
    alerts.unshift(newAlert);
    return newAlert;
  },
  resolveAlert: (id) => {
    const alert = alerts.find((a) => a.alert_id === Number(id));
    if (alert) alert.resolved = true;
    return alert;
  },
};

let alerts = [
  {
    alert_id: 1,
    ingredient_name: "Franch Batter Mix",
    reported_by: "Lyle (Assistant)",
    message: "Almost out of batter mix — cannot make Classic Buckets soon!",
    resolved: false,
    created_at: new Date().toISOString(),
  },
];

let nextAlertId = 2;
