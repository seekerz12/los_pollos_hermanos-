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
  // #new
  const [itemNotes, setItemNotes] = useState({});
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

  // #new
  const addToCart = (item) => {
    const specialInstructions = itemNotes[item.item_id]?.trim() || "Standard";
    setCart((currentCart) => [...currentCart, { ...item, quantity: 1, special_instructions: specialInstructions }]);
    setItemNotes((currentNotes) => ({ ...currentNotes, [item.item_id]: "" }));
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

        <div className="menu-grid">
          {filteredMenu.map((item) => (
            <div key={item.item_id} className="menu-card">
              <div className="menu-thumb">
                <span className="menu-cat-tag">{item.category}</span>
                {getFoodEmoji(item.category)}
              </div>
              <div className="menu-body">
                <div className="menu-name">{item.item_name}</div>
                {/* #new */}
                <label className="menu-note-label" htmlFor={`item-note-${item.item_id}`}>
                  Item note (optional)
                </label>
                <input
                  id={`item-note-${item.item_id}`}
                  className="input-field menu-item-note"
                  placeholder="e.g. Extra dip, no ice"
                  maxLength={200}
                  value={itemNotes[item.item_id] || ""}
                  onChange={(e) =>
                    setItemNotes((currentNotes) => ({ ...currentNotes, [item.item_id]: e.target.value }))
                  }
                />
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
  // #new
  const [processingOrder, setProcessingOrder] = useState(null);
  const [processingError, setProcessingError] = useState("");
  const [processingSubmitting, setProcessingSubmitting] = useState(false);
  // #new
  const [openOrderMenu, setOpenOrderMenu] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [orderActionError, setOrderActionError] = useState("");
  // #new
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

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

  // #new
  const updateOrder = async (id, body) => {
    setProcessingSubmitting(true);
    setProcessingError("");
    setOrderActionError("");
    try {
      const response = await fetch(`${API_URL}/orders/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update order status.");
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.order_id === data.order_id ? data : order))
      );
      setProcessingOrder((currentOrder) =>
        currentOrder?.order_id === data.order_id ? data : currentOrder
      );
    } catch (error) {
      const message = error.message || "Could not connect to the backend.";
      setProcessingError(message);
      setOrderActionError(message);
    } finally {
      setProcessingSubmitting(false);
    }
  };

  // #new
  const toggleOrderItems = (orderId) => {
    setExpandedOrderIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(orderId)) nextIds.delete(orderId);
      else nextIds.add(orderId);
      return nextIds;
    });
  };

  // #new
  const deleteOrder = async (order) => {
    setOpenOrderMenu(null);
    if (order.payment_status !== "UNPAID" || order.order_status === "COMPLETED") {
      setOrderActionError("Only unpaid, incomplete orders can be deleted.");
      return;
    }
    if (!window.confirm(`Delete ${order.order_number}? This cannot be undone.`)) return;

    setDeletingOrderId(order.order_id);
    setOrderActionError("");
    try {
      const response = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: "DELETE",
        headers,
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Delete order returned a non-JSON response (${response.status}). Restart the backend and try again.`);
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete order.");

      setOrders((currentOrders) => currentOrders.filter((item) => item.order_id !== data.order_id));
      if (processingOrder?.order_id === data.order_id) setProcessingOrder(null);
    } catch (error) {
      setOrderActionError(error.message || "Could not connect to the backend.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  // #new
  const openPayment = (order) => {
    setPaymentOrder(order);
    setPaymentMethod("CASH");
    setAmountReceived("");
    setPaymentError("");
    setReceiptOrder(null);
  };

  const closePayment = () => {
    if (paymentSubmitting) return;
    setPaymentOrder(null);
    setReceiptOrder(null);
    setPaymentError("");
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!paymentOrder) return;

    const received = Number(amountReceived);
    const totalCents = Math.round(paymentOrder.total_amount * 100);
    const receivedCents = Math.round(received * 100);
    if (!Number.isFinite(received) || received < 0 || Math.abs(received * 100 - receivedCents) > 0.000001) {
      setPaymentError("Enter a valid amount to the nearest cent.");
      return;
    }
    if (paymentMethod === "CARD" && receivedCents !== totalCents) {
      setPaymentError("Card payment must match the order total.");
      return;
    }
    if (paymentMethod === "CASH" && receivedCents < totalCents) {
      setPaymentError("Amount received is less than the order total.");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError("");
    try {
      const response = await fetch(`${API_URL}/orders/${paymentOrder.order_id}/payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({ payment_method: paymentMethod, amount_received: received }),
      });
      // #new
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Payment API returned a non-JSON response (${response.status}). Restart the backend and try again.`);
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record payment.");

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.order_id === data.order_id ? data : order))
      );
      setReceiptOrder(data);
    } catch (error) {
      setPaymentError(error.message || "Could not connect to the backend.");
    } finally {
      setPaymentSubmitting(false);
    }
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

      {orderActionError && <p className="payment-error" role="alert">{orderActionError}</p>}

      <div className="kds-grid">
        {orders.map((o) => (
          <div key={o.order_id} className="ticket-card">
            <div>
              <div className={`ticket-header ${o.order_status}`}>
                <span>{o.order_number} • {o.order_type}</span>
                <span>{o.order_status}</span>
                {/* #new */}
                <div className="order-menu-container">
                  <button
                    type="button"
                    className="order-menu-toggle"
                    aria-label={`Options for ${o.order_number}`}
                    aria-haspopup="menu"
                    aria-expanded={openOrderMenu === o.order_id}
                    aria-controls={`order-menu-${o.order_id}`}
                    onClick={() =>
                      setOpenOrderMenu((currentId) => (currentId === o.order_id ? null : o.order_id))
                    }
                  >
                    ⋯
                  </button>
                  {openOrderMenu === o.order_id && (
                    <div className="order-menu" id={`order-menu-${o.order_id}`} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenOrderMenu(null);
                          setProcessingOrder(o);
                          setProcessingError("");
                        }}
                      >
                        Open for details
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="delete-order-action"
                        disabled={deletingOrderId === o.order_id || o.payment_status !== "UNPAID" || o.order_status === "COMPLETED"}
                        title="Only unpaid, incomplete orders can be deleted"
                        onClick={() => deleteOrder(o)}
                      >
                        {deletingOrderId === o.order_id ? "Deleting..." : "Delete order"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="ticket-body">
                {/* #new */}
                <div className="ticket-meta">
                  <div className="ticket-meta-row">
                    <span>Customer: <strong>{o.customer_name}</strong></span>
                    <span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span>
                  </div>
                  <div className="ticket-time">
                    Order time: {o.created_at ? new Date(o.created_at).toLocaleString() : "Unavailable"}
                  </div>
                </div>
                {o.items
                  .slice(0, expandedOrderIds.has(o.order_id) ? o.items.length : 2)
                  .map((i, idx) => (
                  <div key={idx} className="ticket-item">
                    <div><strong>{i.quantity}x {i.item_name}</strong></div>
                    <div className="ticket-note">📝 {i.special_instructions || "Standard"}</div>
                  </div>
                ))}
                {/* #new */}
                {o.items.length > 2 && (
                  <button
                    type="button"
                    className="view-more-items"
                    aria-expanded={expandedOrderIds.has(o.order_id)}
                    onClick={() => toggleOrderItems(o.order_id)}
                  >
                    {expandedOrderIds.has(o.order_id) ? "View less" : "View more"}
                    <svg
                      className={`view-more-chevron ${expandedOrderIds.has(o.order_id) ? "expanded" : ""}`}
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                    >
                      <path d="m4 6 4 4 4-4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* #new */}
            <div className="ticket-actions">
              <div className="ticket-status-actions">
                <button
                  type="button"
                  className={`btn-sm blue status-button ${o.order_status === "PREPARING" ? "active" : ""}`}
                  aria-pressed={o.order_status === "PREPARING"}
                  disabled={processingSubmitting}
                  onClick={() => updateOrder(o.order_id, { order_status: "PREPARING" })}
                >
                  🔥 Preparing
                </button>
                <button
                  type="button"
                  className={`btn-sm green status-button ${o.order_status === "READY" ? "active" : ""}`}
                  aria-pressed={o.order_status === "READY"}
                  disabled={processingSubmitting}
                  onClick={() => updateOrder(o.order_id, { order_status: "READY" })}
                >
                  ✅ Ready
                </button>
                <button
                  type="button"
                  className={`btn-sm gray status-button ${o.order_status === "COMPLETED" ? "active" : ""}`}
                  aria-pressed={o.order_status === "COMPLETED"}
                  disabled={processingSubmitting}
                  onClick={() => updateOrder(o.order_id, { order_status: "COMPLETED" })}
                >
                  🤝 Handoff
                </button>
              </div>
              {o.payment_status !== "PAID" ? (
                <button
                  type="button"
                  className="btn-sm pay-button ticket-payment-button"
                  onClick={() => openPayment(o)}
                >
                  Pay: ${o.total_amount.toFixed(2)}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-sm ticket-payment-button"
                  onClick={() => {
                    setPaymentOrder(o);
                    setReceiptOrder(o);
                    setPaymentError("");
                  }}
                >
                  🧾 View receipt
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* #new */}
      {processingOrder && (
        <div className="payment-overlay">
          <section className="payment-dialog order-processing-dialog" role="dialog" aria-modal="true" aria-labelledby="processing-title">
            <button
              type="button"
              className="payment-close"
              onClick={() => setProcessingOrder(null)}
              disabled={processingSubmitting}
              aria-label="Close order details"
            >
              ×
            </button>
            <h2 id="processing-title">{processingOrder.order_number} · {processingOrder.order_type}</h2>
            <div className="order-detail-meta">
              <p><strong>Customer:</strong> {processingOrder.customer_name}</p>
              <p><strong>Order time:</strong> {processingOrder.created_at ? new Date(processingOrder.created_at).toLocaleString() : "Unavailable"}</p>
              <p><strong>Status:</strong> {processingOrder.order_status}</p>
            </div>
            <h3>Items</h3>
            {processingOrder.items.map((item, index) => (
              <div className="order-detail-item" key={`${item.item_id || item.item_name}-${index}`}>
                <div>
                  <strong>{item.quantity} × {item.item_name}</strong>
                  <div className="ticket-note">📝 {item.special_instructions || "Standard"}</div>
                </div>
                <strong>${(item.quantity * item.unit_price).toFixed(2)}</strong>
              </div>
            ))}
            <div className="receipt-total order-detail-total">
              <span>Order total</span>
              <strong>${processingOrder.total_amount.toFixed(2)}</strong>
            </div>
            {processingError && <p className="payment-error" role="alert">{processingError}</p>}
            {/* #new */}
            <div className="payment-actions">
              <button
                type="button"
                className={`btn-sm blue status-button ${processingOrder.order_status === "PREPARING" ? "active" : ""}`}
                aria-pressed={processingOrder.order_status === "PREPARING"}
                disabled={processingSubmitting}
                onClick={() => updateOrder(processingOrder.order_id, { order_status: "PREPARING" })}
              >
                🔥 Preparing
              </button>
              <button
                type="button"
                className={`btn-sm green status-button ${processingOrder.order_status === "READY" ? "active" : ""}`}
                aria-pressed={processingOrder.order_status === "READY"}
                disabled={processingSubmitting}
                onClick={() => updateOrder(processingOrder.order_id, { order_status: "READY" })}
              >
                ✅ Ready
              </button>
              <button
                type="button"
                className={`btn-sm gray status-button ${processingOrder.order_status === "COMPLETED" ? "active" : ""}`}
                aria-pressed={processingOrder.order_status === "COMPLETED"}
                disabled={processingSubmitting}
                onClick={() => updateOrder(processingOrder.order_id, { order_status: "COMPLETED" })}
              >
                🤝 Handoff
              </button>
            </div>
          </section>
        </div>
      )}

      {/* #new */}
      {paymentOrder && (
        <div className="payment-overlay">
          <section className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <button
              type="button"
              className="payment-close no-print"
              onClick={closePayment}
              disabled={paymentSubmitting}
              aria-label="Close payment"
            >
              ×
            </button>

            {receiptOrder ? (
              <>
                <p id="payment-title" className="payment-confirmation" role="status">Payment confirmed</p>
                <div className="receipt-print-area">
                  <h2>Los Pollos Hermanos</h2>
                  <p className="receipt-subtitle">Customer receipt</p>
                  <hr />
                  <p><strong>Order:</strong> {receiptOrder.order_number}</p>
                  <p><strong>Type:</strong> {receiptOrder.order_type}</p>
                  <p><strong>Date:</strong> {receiptOrder.paid_at ? new Date(receiptOrder.paid_at).toLocaleString() : "—"}</p>
                  <p><strong>Staff:</strong> {receiptOrder.paid_by || "—"}</p>
                  <hr />
                  {receiptOrder.items.map((item, index) => (
                    <div className="receipt-item" key={`${item.item_id || item.item_name}-${index}`}>
                      <span>{item.quantity} × {item.item_name}</span>
                      <strong>${(item.quantity * item.unit_price).toFixed(2)}</strong>
                    </div>
                  ))}
                  <hr />
                  <div className="receipt-total">
                    <span>Total</span>
                    <strong>${receiptOrder.total_amount.toFixed(2)}</strong>
                  </div>
                  <p><strong>Payment:</strong> {receiptOrder.payment_method || "Not recorded"}</p>
                  <p><strong>Amount received:</strong> ${(receiptOrder.amount_received ?? receiptOrder.total_amount).toFixed(2)}</p>
                  <p><strong>Change:</strong> ${(receiptOrder.change_due ?? 0).toFixed(2)}</p>
                  <p className="receipt-thanks">Thank you. Come again!</p>
                </div>
                <div className="payment-actions no-print">
                  <button type="button" className="btn-sm" onClick={closePayment}>Close</button>
                  <button type="button" className="btn-primary" onClick={() => window.print()}>
                    Print receipt
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="payment-title">Review order and collect payment</h2>
                <p className="payment-order-number">{paymentOrder.order_number} · {paymentOrder.order_type}</p>
                <div className="payment-order-summary">
                  {paymentOrder.items.map((item, index) => (
                    <div className="receipt-item" key={`${item.item_id || item.item_name}-${index}`}>
                      <span>{item.quantity} × {item.item_name}</span>
                      <strong>${(item.quantity * item.unit_price).toFixed(2)}</strong>
                    </div>
                  ))}
                  <div className="receipt-total">
                    <span>Order total</span>
                    <strong>${paymentOrder.total_amount.toFixed(2)}</strong>
                  </div>
                </div>
                <form onSubmit={submitPayment} className="payment-form">
                  <fieldset>
                    <legend>Payment method</legend>
                    <label className="payment-method-option">
                      <input
                        type="radio"
                        name="payment-method"
                        value="CASH"
                        checked={paymentMethod === "CASH"}
                        onChange={() => {
                          setPaymentMethod("CASH");
                          setAmountReceived("");
                          setPaymentError("");
                        }}
                      />
                      Cash
                    </label>
                    <label className="payment-method-option">
                      <input
                        type="radio"
                        name="payment-method"
                        value="CARD"
                        checked={paymentMethod === "CARD"}
                        onChange={() => {
                          setPaymentMethod("CARD");
                          setAmountReceived(paymentOrder.total_amount.toFixed(2));
                          setPaymentError("");
                        }}
                      />
                      Card
                    </label>
                  </fieldset>
                  <label className="payment-amount-label" htmlFor="amount-received">
                    {paymentMethod === "CARD" ? "Amount charged" : "Amount received"} ($)
                  </label>
                  <input
                    id="amount-received"
                    className="input-field"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    readOnly={paymentMethod === "CARD"}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                  />
                  {paymentMethod === "CASH" && Number(amountReceived) >= paymentOrder.total_amount && (
                    <p className="payment-change-preview">
                      Change due: ${(Number(amountReceived) - paymentOrder.total_amount).toFixed(2)}
                    </p>
                  )}
                  {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}
                  <div className="payment-actions">
                    <button type="button" className="btn-sm" onClick={closePayment} disabled={paymentSubmitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={paymentSubmitting}>
                      {paymentSubmitting ? "Recording..." : "Confirm payment"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
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