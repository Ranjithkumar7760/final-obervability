import React, { useState, useEffect } from "react";

const AUTH_URL = "http://127.0.0.1:5000";

const PRODUCTS = [
  {
    id: 1,
    name: "Laptop",
    price: 999,
    img: "💻",
    desc: "High performance laptop",
  },
  { id: 2, name: "Phone", price: 699, img: "📱", desc: "Latest smartphone" },
  {
    id: 3,
    name: "Headphones",
    price: 199,
    img: "🎧",
    desc: "Noise cancelling",
  },
  { id: 4, name: "Watch", price: 249, img: "⌚", desc: "Smart watch" },
  { id: 5, name: "Tablet", price: 399, img: "📟", desc: "10 inch display" },
  { id: 6, name: "Camera", price: 549, img: "📷", desc: "DSLR camera" },
];

const s = {
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 20,
    fontFamily: "Segoe UI, Arial",
  },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  input: {
    padding: "10px 12px",
    margin: 5,
    width: 220,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  btn: {
    padding: "10px 24px",
    margin: 5,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnDanger: { background: "#dc2626", color: "#fff" },
  btnSuccess: { background: "#16a34a", color: "#fff" },
  btnSmall: { padding: "6px 14px", fontSize: 13 },
  nav: {
    background: "#1e293b",
    color: "#fff",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    marginBottom: 24,
  },
  navLink: {
    padding: "16px 20px",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 15,
    color: "#cbd5e1",
    borderBottom: "3px solid transparent",
  },
  navActive: { color: "#60a5fa", borderBottom: "3px solid #3b82f6" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 20,
  },
  productCard: {
    border: "1px solid #e0e0e0",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    borderBottom: "2px solid #e0e0e0",
    padding: 12,
    textAlign: "left",
    color: "#666",
    fontWeight: 600,
  },
  td: { borderBottom: "1px solid #f0f0f0", padding: 12 },
  cartItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottom: "1px solid #f0f0f0",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    display: "inline-block",
    marginRight: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  badge: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  chainBox: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    fontSize: 13,
  },
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(localStorage.getItem("user") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("home");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [serviceStatus, setServiceStatus] = useState({});

  useEffect(() => {
    if (token) checkServices();
  }, [token]);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    if (type !== "error")
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  // ── Login ──────────────────────────────────────────
  const login = async () => {
    try {
      const r = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (d.token) {
        setToken(d.token);
        setUser(username);
        localStorage.setItem("token", d.token);
        localStorage.setItem("user", username);
        showMsg("Login successful!");
      } else {
        showMsg(d.error || "Login failed", "error");
      }
    } catch (e) {
      showMsg("Cannot connect to Auth Service", "error");
    }
  };

  const logout = () => {
    setToken("");
    setUser("");
    setCart([]);
    setLastResult(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setPage("home");
  };

  // ── Cart ───────────────────────────────────────────
  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === p.id);
      if (ex)
        return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...p, qty: 1 }];
    });
    showMsg(`${p.name} added to cart!`);
  };
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((c) => c.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // ── Place Order — touches ALL 5 services in one request ──
  const placeOrder = async () => {
    if (cart.length === 0) return showMsg("Cart is empty!", "error");
    setLoading(true);
    setLastResult(null);
    try {
      // Single call to Auth Service — chain runs: Auth→Order→Payment→Notification→User
      const r = await fetch(`${AUTH_URL}/place-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // JWT token from localStorage
        },
        body: JSON.stringify({
          items: cart.map((c) => c.name),
          total: cartTotal,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setLastResult(d);
        setCart([]);
        setPage("result");
        showMsg("Order complete! All 5 services traced.");
      } else {
        showMsg(d.error || "Order failed", "error");
      }
    } catch (e) {
      showMsg("Error: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Service health checks ──────────────────────────
  const checkServices = async () => {
    const ports = {
      auth: 5000,
      order: 5001,
      payment: 5002,
      notification: 5003,
      user: 5004,
    };
    const ss = {};
    for (const [name, port] of Object.entries(ports)) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`);
        ss[name] = r.ok ? "up" : "down";
      } catch {
        ss[name] = "down";
      }
    }
    setServiceStatus(ss);
  };

  // ── Login Screen ───────────────────────────────────
  if (!token)
    return (
      <div style={{ ...s.container, maxWidth: 440, marginTop: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🛒</div>
          <h1 style={{ margin: 0 }}>E-Store</h1>
          <p style={{ color: "#666" }}>Distributed Tracing Demo</p>
        </div>
        <div style={s.card}>
          <h2 style={{ marginTop: 0 }}>Sign In</h2>
          <input
            style={{ ...s.input, width: "90%" }}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br />
          <input
            style={{ ...s.input, width: "90%" }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <br />
          <button
            style={{
              ...s.btn,
              ...s.btnPrimary,
              width: "96%",
              margin: "10px 0",
            }}
            onClick={login}
          >
            Sign In
          </button>
          {message.text && (
            <p
              style={{
                color: message.type === "error" ? "#dc2626" : "#16a34a",
                fontSize: 14,
              }}
            >
              {message.text}
            </p>
          )}
        </div>
        <div style={{ ...s.card, fontSize: 13, color: "#666" }}>
          <strong>Trace Chain:</strong> Auth → Order → Payment → Notification →
          User
        </div>
      </div>
    );

  const NavLink = ({ name, label }) => (
    <span
      style={{ ...s.navLink, ...(page === name ? s.navActive : {}) }}
      onClick={() => setPage(name)}
    >
      {label}
    </span>
  );

  return (
    <div style={s.container}>
      {/* Navbar */}
      <div style={s.nav}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 20, marginRight: 8 }}>🛒</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              marginRight: 24,
              color: "#fff",
            }}
          >
            E-Store
          </span>
          <NavLink name="home" label="Products" />
          <NavLink
            name="cart"
            label={`Cart${cartCount ? ` (${cartCount})` : ""}`}
          />
          <NavLink name="services" label="Services" />
          {lastResult && <NavLink name="result" label="Last Order" />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#94a3b8" }}>👤 {user}</span>
          <button
            style={{ ...s.btn, ...s.btnDanger, ...s.btnSmall, margin: 0 }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 500,
            background: message.type === "error" ? "#fee2e2" : "#dcfce7",
            color: message.type === "error" ? "#991b1b" : "#166534",
          }}
        >
          {message.text}
          <span
            style={{ float: "right", cursor: "pointer" }}
            onClick={() => setMessage({ text: "", type: "" })}
          >
            ✕
          </span>
        </div>
      )}

      {/* Products */}
      {page === "home" && (
        <>
          <h2 style={s.pageTitle}>Products</h2>
          <div style={s.grid}>
            {PRODUCTS.map((p) => (
              <div key={p.id} style={s.productCard}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>{p.img}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#2563eb",
                    marginBottom: 4,
                  }}
                >
                  €{p.price}
                </div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                  {p.desc}
                </div>
                <button
                  style={{
                    ...s.btn,
                    ...s.btnPrimary,
                    ...s.btnSmall,
                    width: "80%",
                  }}
                  onClick={() => addToCart(p)}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cart */}
      {page === "cart" && (
        <>
          <h2 style={s.pageTitle}>Cart ({cartCount} items)</h2>
          <div style={s.card}>
            {cart.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: 20 }}>
                Cart is empty. Add some products!
              </p>
            ) : (
              <>
                {cart.map((c) => (
                  <div key={c.id} style={s.cartItem}>
                    <div>
                      <span style={{ fontSize: 20, marginRight: 8 }}>
                        {c.img}
                      </span>
                      <strong>{c.name}</strong> × {c.qty}
                    </div>
                    <div>
                      <strong>€{c.price * c.qty}</strong>
                      <button
                        style={{
                          ...s.btn,
                          ...s.btnDanger,
                          ...s.btnSmall,
                          marginLeft: 12,
                        }}
                        onClick={() => removeFromCart(c.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0 0",
                  }}
                >
                  <strong style={{ fontSize: 18 }}>Total: €{cartTotal}</strong>
                  <button
                    style={{ ...s.btn, ...s.btnSuccess }}
                    onClick={placeOrder}
                    disabled={loading}
                  >
                    {loading ? "⏳ Processing..." : "🚀 Place Order"}
                  </button>
                </div>
                {loading && (
                  <div
                    style={{ marginTop: 12, fontSize: 13, color: "#2563eb" }}
                  >
                    Tracing: Auth → Order → Payment → Notification → User...
                  </div>
                )}
              </>
            )}
          </div>
          <div
            style={{
              ...s.card,
              fontSize: 13,
              color: "#555",
              background: "#eff6ff",
            }}
          >
            Clicking "Place Order" sends a single HTTP request to the Auth
            Service along with the JWT token stored in the browser. The Auth
            Service first validates the token — if valid, it forwards the
            request to the Order Service, which creates the order and passes it
            to the Payment Service. The Payment Service processes the charge and
            forwards to the Notification Service, which sends a confirmation and
            finally calls the User Service to update the order history. This means
            one button click triggers all 5 services in sequence, producing a
            single distributed trace in Jaeger where all 5 spans are linked
            under the same TraceID.
          </div>
        </>
      )}

      {/* Last Order Result */}
      {page === "result" && lastResult && (
        <>
          <h2 style={s.pageTitle}>✅ Order Result</h2>
          <div style={s.card}>
            <table style={s.table}>
              <tbody>
                {Object.entries(lastResult).map(([k, v]) => (
                  <tr key={k}>
                    <td
                      style={{
                        ...s.td,
                        fontWeight: 600,
                        color: "#666",
                        width: 180,
                      }}
                    >
                      {k}
                    </td>
                    <td style={s.td}>
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Service Status */}
      {page === "services" && (
        <>
          <h2 style={s.pageTitle}>Service Status</h2>
          <div style={s.card}>
            {[
              {
                name: "auth",
                port: 5000,
                role: "Validates JWT token",
              },
              { name: "order", port: 5001, role: "Creates order record" },
              { name: "payment", port: 5002, role: "Processes payment" },
              { name: "notification", port: 5003, role: "Sends confirmation" },
              {
                name: "user",
                port: 5004,
                role: "Updates order history",
              },
            ].map((svc) => (
              <div
                key={svc.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 14,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <span
                  style={{
                    ...s.statusDot,
                    background:
                      serviceStatus[svc.name] === "up" ? "#16a34a" : "#dc2626",
                  }}
                />
                <strong style={{ width: 180 }}>{svc.name}-service</strong>
                <span style={{ color: "#666", fontSize: 13, flex: 1 }}>
                  {svc.role}
                </span>
                <span style={{ fontSize: 12, color: "#999", marginRight: 16 }}>
                  {svc.port}
                </span>
                <span
                  style={{
                    color:
                      serviceStatus[svc.name] === "up" ? "#16a34a" : "#dc2626",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {serviceStatus[svc.name] === "up" ? "● Running" : "● Down"}
                </span>
              </div>
            ))}
            <button
              style={{
                ...s.btn,
                ...s.btnPrimary,
                ...s.btnSmall,
                marginTop: 12,
              }}
              onClick={checkServices}
            >
              Refresh Status
            </button>
          </div>
        </>
      )}
    </div>
  );
}
