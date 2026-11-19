const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { authenticateToken, requireRole, JWT_SECRET } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// ==================== AUTH ====================
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const payload = { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

  res.json({ token, user: payload });
});

app.post("/api/auth/register", (req, res) => {
  const { full_name, username, password } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({ error: "Full name, username, and password are required." });
  }

  const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "Username is already taken." });
  }

  const newUser = db.addUser({
    full_name: full_name.trim(),
    username: username.trim(),
    password,
    role: "CUSTOMER", // Public sign-up is strictly for customers
  });

  const payload = {
    user_id: newUser.user_id,
    username: newUser.username,
    full_name: newUser.full_name,
    role: newUser.role,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

  res.status(201).json({ token, user: payload });
});

// ==================== SHARED (ALL LOGGED-IN ROLES) ====================
app.get("/api/menu", authenticateToken, (req, res) => {
  res.json(db.menuItems);
});

// ==================== ROLE 1: CUSTOMER ====================
app.post("/api/orders", authenticateToken, requireRole("CUSTOMER", "STAFF"), (req, res) => {
  const { order_type, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: "Order must contain items." });

  const total_amount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const newOrder = db.addOrder({
    customer_id: req.user.role === "CUSTOMER" ? req.user.user_id : null,
    customer_name: req.user.full_name,
    staff_id: req.user.role === "STAFF" ? req.user.user_id : null,
    order_type: order_type || "DINE_IN",
    order_status: "PENDING",
    payment_status: "UNPAID",
    total_amount: Number(total_amount.toFixed(2)),
    created_at: new Date().toISOString(),
    items,
  });

  res.status(201).json(newOrder);
});

app.get("/api/orders/my", authenticateToken, requireRole("CUSTOMER"), (req, res) => {
  const myOrders = db.getOrders().filter((o) => o.customer_id === req.user.user_id);
  res.json(myOrders);
});

// ==================== ROLE 2: STAFF ====================
app.get("/api/orders", authenticateToken, requireRole("STAFF", "MANAGER"), (req, res) => {
  res.json(db.getOrders());
});

app.patch("/api/orders/:id/status", authenticateToken, requireRole("STAFF"), (req, res) => {
  const order = db.getOrders().find((o) => o.order_id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found." });

  if (req.body.order_status) order.order_status = req.body.order_status;
  if (req.body.payment_status) order.payment_status = req.body.payment_status;
  order.staff_id = req.user.user_id;

  res.json(order);
});

// ==================== ROLE 3: STORE MANAGER ====================
app.post("/api/menu", authenticateToken, requireRole("MANAGER"), (req, res) => {
  const { category, item_name, unit_price } = req.body;
  if (!item_name || !unit_price) return res.status(400).json({ error: "Missing menu item details." });

  const created = db.addMenuItem({
    category: category || "Signature Chicken",
    item_name,
    unit_price: Number(unit_price),
    is_available: true,
  });
  res.status(201).json(created);
});

app.get("/api/inventory", authenticateToken, requireRole("MANAGER", "STAFF"), (req, res) => {
  res.json(db.ingredients);
});

app.patch("/api/inventory/:id/restock", authenticateToken, requireRole("MANAGER"), (req, res) => {
  const ing = db.ingredients.find((i) => i.ingredient_id === Number(req.params.id));
  if (!ing) return res.status(404).json({ error: "Ingredient not found." });

  ing.current_stock += Number(req.body.amount || 20);
  res.json(ing);
});

app.get("/api/reports/sales", authenticateToken, requireRole("MANAGER"), (req, res) => {
  const allOrders = db.getOrders();
  const paidOrders = allOrders.filter((o) => o.payment_status === "PAID");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // Calculate Top-Selling Items
  const itemStats = {};
  allOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!itemStats[item.item_name]) {
        itemStats[item.item_name] = { item_name: item.item_name, units_sold: 0, revenue: 0 };
      }
      itemStats[item.item_name].units_sold += item.quantity;
      itemStats[item.item_name].revenue += item.unit_price * item.quantity;
    });
  });

  const topItems = Object.values(itemStats).sort((a, b) => b.units_sold - a.units_sold);

  res.json({
    total_orders: allOrders.length,
    active_orders: allOrders.filter((o) => o.order_status !== "COMPLETED").length,
    completed_orders: allOrders.filter((o) => o.order_status === "COMPLETED").length,
    dine_in_count: allOrders.filter((o) => o.order_type === "DINE_IN").length,
    takeaway_count: allOrders.filter((o) => o.order_type === "TAKEAWAY").length,
    unpaid_count: allOrders.filter((o) => o.payment_status !== "PAID").length,
    total_revenue: Number(totalRevenue.toFixed(2)),
    avg_order_value: Number(avgOrderValue.toFixed(2)),
    top_items: topItems,
    recent_orders: allOrders.slice(0, 6),
  });
});
// ==================== SUPPLY ALERTS (STAFF -> MANAGER) ====================
app.get("/api/alerts", authenticateToken, requireRole("STAFF", "MANAGER"), (req, res) => {
  res.json(db.getAlerts().filter((a) => !a.resolved));
});

app.post("/api/alerts", authenticateToken, requireRole("STAFF"), (req, res) => {
  const { ingredient_name, message } = req.body;
  if (!ingredient_name || !message) {
    return res.status(400).json({ error: "Ingredient and message are required." });
  }
  const alert = db.addAlert({
    ingredient_name,
    reported_by: req.user.full_name,
    message,
  });
  res.status(201).json(alert);
});

app.patch("/api/alerts/:id/resolve", authenticateToken, requireRole("MANAGER"), (req, res) => {
  const resolved = db.resolveAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: "Alert not found." });
  res.json(resolved);
});

// Toggle Menu Item Availability (Manager)
app.patch("/api/menu/:id/toggle", authenticateToken, requireRole("MANAGER"), (req, res) => {
  const item = db.menuItems.find((m) => m.item_id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Menu item not found." });
  item.is_available = !item.is_available;
  res.json(item);
});

app.listen(4000, () => console.log("Los Pollos Hermanos API running on http://localhost:4000"));