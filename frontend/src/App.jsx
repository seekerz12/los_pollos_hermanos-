import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:4000/api";

const getFoodEmoji = (category) => {
  if (category === "Signature Chicken") return "🍗";
  if (category === "Combo Meals") return "🍱";
  if (category === "Sides") return "🍟";
  if (category === "Beverages") return "🥤";
  return "🍔";
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("lph_token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("lph_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem("lph_token", newToken);
    localStorage.setItem("lph_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("lph_token");
    localStorage.removeItem("lph_user");
    setToken("");
    setUser(null);
  };

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">🐔</div>
          <div>
            <div className="brand-title">Los Pollos Hermanos</div>
            <div className="brand-sub">The Finest Ingredients • Albuquerque, NM</div>
          </div>
        </div>
        <div className="nav-right">
          <span className="role-pill">
            {user.full_name} • {user.role}
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        {user.role === "CUSTOMER" && <CustomerDashboard token={token} />}
        {user.role === "STAFF" && <StaffDashboard token={token} />}
        {user.role === "MANAGER" && <ManagerDashboard token={token} />}
      </main>
    </div>
  );
}

/* ==================== LOGIN / CUSTOMER SIGN-UP PAGE ==================== */
function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const endpoint = isRegister ? "/auth/register" : "/auth/login";
    const body = isRegister
      ? { full_name: fullName, username, password }
      : { username, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Authentication failed");
      onLogin(data.token, data.user);
    } catch {
      setError("Cannot connect to backend. Make sure server.js is running on port 4000.");
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setFullName("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-crest">🐔</div>
        <h1>Los Pollos Hermanos</h1>
        <p className="login-tagline">
          {isRegister ? "Create a Customer Account" : '"Where something delicious is always cooking."'}
        </p>

        <form onSubmit={submit} className="login-form">
          {isRegister && (
            <input
              className="input-field"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            className="input-field"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="btn-primary">
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button type="button" className="link-btn" onClick={toggleMode}>
                Sign In
              </button>
            </>
          ) : (
            <>
              New customer?{" "}
              <button type="button" className="link-btn" onClick={toggleMode}>
                Create New Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== ROLE 1: CUSTOMER KIOSK ==================== */
function CustomerDashboard({ token }) {
  const [menu, setMenu] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("DINE_IN");
  const [note, setNote] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = async () => {
    const [mRes, oRes] = await Promise.all([
      fetch(`${API_URL}/menu`, { headers }),
      fetch(`${API_URL}/orders/my`, { headers }),
    ]);
    setMenu(await mRes.json());
    setMyOrders(await oRes.json());
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = ["All", ...new Set(menu.map((m) => m.category))];
  const filteredMenu = selectedCat === "All" ? menu : menu.filter((m) => m.category === selectedCat);

  const addToCart = (item) => {
    setCart([...cart, { ...item, quantity: 1, special_instructions: note.trim() || "Standard" }]);
    setNote("");
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_type: orderType, items: cart }),
    });
    setCart([]);
    loadData();
  };

  return (
    <div className="kiosk-layout">
      <div>
        <h2 className="section-title">🍗 Self-Service Menu</h2>

        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-tab ${selectedCat === cat ? "active" : ""}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          className="input-field"
          placeholder="Add a customization before clicking '+ Add' (e.g., Extra Franch dip, No ice)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: 18, background: "#fff" }}
        />

        <div className="menu-grid">
          {filteredMenu.map((item) => (
            <div key={item.item_id} className="menu-card">
              <div className="menu-thumb">
                <span className="menu-cat-tag">{item.category}</span>
                {getFoodEmoji(item.category)}
              </div>
              <div className="menu-body">
                <div className="menu-name">{item.item_name}</div>
                <div className="menu-footer">
                  <span className="price-tag">${item.unit_price.toFixed(2)}</span>
                  <button onClick={() => addToCart(item)} className="btn-yellow">
                    + Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="tray-card">
          <h2 className="section-title">🛍️ Your Order Tray ({cart.length})</h2>

          <div className="order-type-toggle">
            <button
              className={`type-btn ${orderType === "DINE_IN" ? "active" : ""}`}
              onClick={() => setOrderType("DINE_IN")}
            >
              🍽️ Dine-In
            </button>
            <button
              className={`type-btn ${orderType === "TAKEAWAY" ? "active" : ""}`}
              onClick={() => setOrderType("TAKEAWAY")}
            >
              🥡 Takeaway
            </button>
          </div>

          {cart.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", padding: "18px 0" }}>
              Your tray is empty. Pick some crispy chicken!
            </p>
          ) : (
            cart.map((c, idx) => (
              <div key={idx} className="cart-item">
                <div>
                  <strong>{c.item_name}</strong>
                  <div className="cart-note">Note: {c.special_instructions}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>${c.unit_price.toFixed(2)}</strong>
                  <button
                    onClick={() => removeFromCart(idx)}
                    style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="cart-total">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>

          <button onClick={placeOrder} disabled={cart.length === 0} className="btn-primary" style={{ width: "100%" }}>
            Place Order Now
          </button>
        </div>

        <div className="panel-card">
          <h2 className="section-title">⏱️ Live Order Tracker</h2>
          {myOrders.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>No active orders yet.</p>
          ) : (
            myOrders.map((o) => (
              <div key={o.order_id} className="cart-item">
                <div>
                  <strong>{o.order_number}</strong> • <small>{o.order_type}</small>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Total: ${o.total_amount.toFixed(2)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className={`badge badge-${o.order_status}`}>{o.order_status}</span>
                  <span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== ROLE 2: STAFF KDS & SUPPLY ALERT ==================== */
function StaffDashboard({ token }) {
  const [orders, setOrders] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIng, setSelectedIng] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = async () => {
    const [oRes, iRes] = await Promise.all([
      fetch(`${API_URL}/orders`, { headers }),
      fetch(`${API_URL}/inventory`, { headers }),
    ]);
    setOrders(await oRes.json());
    const invData = await iRes.json();
    setIngredients(invData);
    if (invData.length > 0 && !selectedIng) setSelectedIng(invData[0].ingredient_name);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateOrder = async (id, body) => {
    await fetch(`${API_URL}/orders/${id}/status`, { method: "PATCH", headers, body: JSON.stringify(body) });
    loadData();
  };

  const sendSupplyAlert = async (e) => {
    e.preventDefault();
    if (!selectedIng || !alertMsg.trim()) return;
    await fetch(`${API_URL}/alerts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ingredient_name: selectedIng, message: alertMsg.trim() }),
    });
    setAlertMsg("");
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3000);
  };

  return (
    <div>
      {/* Staff Supply Shortage Reporter */}
      <div className="panel-card" style={{ borderLeft: "6px solid #dc2626" }}>
        <h2 className="section-title" style={{ color: "#b91c1c" }}>
          ⚠️ Report Low Supply / Out of Stock to Manager
        </h2>
        <form onSubmit={sendSupplyAlert} className="manager-form" style={{ gridTemplateColumns: "1.2fr 2fr auto" }}>
          <select className="input-field" value={selectedIng} onChange={(e) => setSelectedIng(e.target.value)}>
            {ingredients.map((ing) => (
              <option key={ing.ingredient_id} value={ing.ingredient_name}>
                {ing.ingredient_name} ({ing.current_stock} {ing.unit} left)
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Reason (e.g., Out of batter mix, cannot make buckets!)"
            value={alertMsg}
            onChange={(e) => setAlertMsg(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Notify Manager
          </button>
        </form>
        {alertSent && (
          <div style={{ marginTop: 10, color: "#15803d", fontWeight: 700, fontSize: 13 }}>
            ✅ Alert sent to Store Manager!
          </div>
        )}
      </div>

      {/* Existing KDS Queue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🔥 Kitchen Display & Order Queue</h2>
        <button onClick={loadData} className="btn-yellow">↻ Refresh Queue</button>
      </div>

      <div className="kds-grid">
        {orders.map((o) => (
          <div key={o.order_id} className="ticket-card">
            <div>
              <div className={`ticket-header ${o.order_status}`}>
                <span>{o.order_number} • {o.order_type}</span>
                <span>{o.order_status}</span>
              </div>
              <div className="ticket-body">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span>Customer: <strong>{o.customer_name}</strong></span>
                  <span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span>
                </div>
                {o.items.map((i, idx) => (
                  <div key={idx} className="ticket-item">
                    <div><strong>{i.quantity}x {i.item_name}</strong></div>
                    <div className="ticket-note">📝 {i.special_instructions}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ticket-actions">
              <button className="btn-sm blue" onClick={() => updateOrder(o.order_id, { order_status: "PREPARING" })}>
                🔥 Preparing
              </button>
              <button className="btn-sm green" onClick={() => updateOrder(o.order_id, { order_status: "READY" })}>
                ✅ Ready
              </button>
              <button className="btn-sm" onClick={() => updateOrder(o.order_id, { order_status: "COMPLETED" })}>
                🤝 Handoff
              </button>
              {o.payment_status !== "PAID" && (
                <button
                  className="btn-sm green"
                  style={{ marginLeft: "auto" }}
                  onClick={() => updateOrder(o.order_id, { payment_status: "PAID" })}
                >
                  💵 Collect ${o.total_amount.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== ROLE 3: INFORMATIONAL MANAGER DASHBOARD ==================== */
function ManagerDashboard({ token }) {
  const [inventory, setInventory] = useState([]);
  const [menu, setMenu] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sales, setSales] = useState({
    total_orders: 0,
    active_orders: 0,
    completed_orders: 0,
    dine_in_count: 0,
    takeaway_count: 0,
    unpaid_count: 0,
    total_revenue: 0,
    avg_order_value: 0,
    top_items: [],
    recent_orders: [],
  });

  const [category, setCategory] = useState("Signature Chicken");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadData = async () => {
    const [invRes, salesRes, alertRes, menuRes] = await Promise.all([
      fetch(`${API_URL}/inventory`, { headers }),
      fetch(`${API_URL}/reports/sales`, { headers }),
      fetch(`${API_URL}/alerts`, { headers }),
      fetch(`${API_URL}/menu`, { headers }),
    ]);
    setInventory(await invRes.json());
    setSales(await salesRes.json());
    setAlerts(await alertRes.json());
    setMenu(await menuRes.json());
  };

  useEffect(() => {
    loadData();
  }, []);

  const restock = async (id) => {
    await fetch(`${API_URL}/inventory/${id}/restock`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ amount: 25 }),
    });
    loadData();
  };

  const resolveAlert = async (id) => {
    await fetch(`${API_URL}/alerts/${id}/resolve`, { method: "PATCH", headers });
    loadData();
  };

  const toggleMenuItem = async (id) => {
    await fetch(`${API_URL}/menu/${id}/toggle`, { method: "PATCH", headers });
    loadData();
  };

  const addMenu = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/menu`, {
      method: "POST",
      headers,
      body: JSON.stringify({ category, item_name: itemName, unit_price: Number(price) }),
    });
    setItemName("");
    setPrice("");
    loadData();
  };

  const lowStockCount = inventory.filter((i) => i.current_stock <= i.reorder_level).length;

  return (
    <div>
      {/* URGENT STAFF NOTIFICATIONS BANNER */}
      {alerts.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-header">
            <span>🔔 Urgent Kitchen Notifications ({alerts.length})</span>
            <button onClick={loadData} className="btn-sm">↻ Refresh</button>
          </div>
          {alerts.map((a) => (
            <div key={a.alert_id} className="alert-item">
              <div>
                <strong>{a.ingredient_name}</strong> — {a.message}
                <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>
                  Reported by {a.reported_by}
                </div>
              </div>
              <button onClick={() => resolveAlert(a.alert_id)} className="btn-sm green">
                ✓ Mark Resolved
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EXECUTIVE KPI CARDS */}
      <h2 className="section-title">📊 Executive Sales & Operations Overview</h2>
      <div className="kpi-grid">
        <div className="kpi-card yellow">
          <div className="kpi-label">Paid Revenue</div>
          <div className="kpi-value">${sales.total_revenue.toFixed(2)}</div>
          <div className="kpi-sub">Avg Order: ${sales.avg_order_value.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{sales.total_orders}</div>
          <div className="kpi-sub">
            {sales.dine_in_count} Dine-In • {sales.takeaway_count} Takeaway
          </div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Kitchen Queue</div>
          <div className="kpi-value">{sales.active_orders} Active</div>
          <div className="kpi-sub">
            {sales.completed_orders} Completed • {sales.unpaid_count} Unpaid
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: lowStockCount > 0 ? "#dc2626" : "#16a34a" }}>
          <div className="kpi-label">Supply Health</div>
          <div className="kpi-value">{lowStockCount} Low</div>
          <div className="kpi-sub">{alerts.length} Active Staff Alerts</div>
        </div>
      </div>

      {/* TWO-COLUMN ANALYTICS: TOP SELLERS & RECENT ORDERS */}
      <div className="analytics-grid">
        <div className="panel-card">
          <h2 className="section-title">🏆 Top-Selling Menu Items</h2>
          {sales.top_items.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>No sales data yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sales.top_items.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.item_name}</strong></td>
                    <td>{item.units_sold}</td>
                    <td style={{ color: "#15803d", fontWeight: 700 }}>${item.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel-card">
          <h2 className="section-title">🧾 Recent Transactions</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.recent_orders.map((o) => (
                <tr key={o.order_id}>
                  <td><strong>{o.order_number}</strong></td>
                  <td>{o.customer_name}</td>
                  <td><span className={`badge badge-${o.order_status}`}>{o.order_status}</span></td>
                  <td><strong>${o.total_amount.toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVENTORY & SUPPLIERS */}
      <div className="panel-card">
        <h2 className="section-title">📦 Kitchen Inventory & Suppliers</h2>
        {inventory.map((ing) => {
          const isLow = ing.current_stock <= ing.reorder_level;
          const pct = Math.min(100, (ing.current_stock / (ing.reorder_level * 3)) * 100);
          return (
            <div key={ing.ingredient_id} className="inv-row">
              <div>
                <strong>{ing.ingredient_name}</strong>
                {isLow && <span className="low-alert">LOW STOCK</span>}
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Supplier: {ing.supplier} • Reorder Level: {ing.reorder_level} {ing.unit}
                </div>
                <div className="stock-bar-bg">
                  <div className={`stock-bar-fill ${isLow ? "low" : ""}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <strong>{ing.current_stock} {ing.unit}</strong>
                <button onClick={() => restock(ing.ingredient_id)} className="btn-yellow">
                  + Restock 25 {ing.unit}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MENU MANAGEMENT */}
      <div className="panel-card">
        <h2 className="section-title">🍗 Menu Management</h2>
        <form onSubmit={addMenu} className="manager-form" style={{ marginBottom: 20 }}>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Signature Chicken">Signature Chicken</option>
            <option value="Combo Meals">Combo Meals</option>
            <option value="Sides">Sides</option>
            <option value="Beverages">Beverages</option>
          </select>
          <input
            className="input-field"
            placeholder="Item name (e.g., Spicy Pollos Wings)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="number"
            step="0.01"
            placeholder="Price ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Add Item</button>
        </form>

        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {menu.map((m) => (
              <tr key={m.item_id}>
                <td><strong>{m.item_name}</strong></td>
                <td>{m.category}</td>
                <td>${m.unit_price.toFixed(2)}</td>
                <td>
                  <span className={`badge ${m.is_available ? "badge-READY" : "badge-UNPAID"}`}>
                    {m.is_available ? "Available" : "Out of Stock"}
                  </span>
                </td>
                <td>
                  <button onClick={() => toggleMenuItem(m.item_id)} className="btn-sm">
                    {m.is_available ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}