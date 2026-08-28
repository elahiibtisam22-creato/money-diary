import React, { useState, useMemo, useEffect } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Trash2, Wallet } from "lucide-react";

// ---------- Design tokens ----------
// A hand-kept "money diary": accounts as stitched envelopes fanned across the top,
// entries as diary lines with a dotted margin rule.
// Paper #EEE6D6 · Ink #2B2620 · Deposit #3F6659 · Withdraw #A6432C · Transfer #4A5899
// Display: Newsreader italic · Labels: Special Elite (typewriter) · Numbers: IBM Plex Mono

const ACCOUNT_COLORS = ["#3F6659", "#A6432C", "#4A5899", "#8C6239", "#6B4E71", "#2E6B7E"];
const CATS = ["Food", "Rent", "Transport", "Salary", "Shopping", "Utilities", "Health", "Other"];

const seedAccounts = [
  { id: "a1", name: "Cash", start: 0, color: ACCOUNT_COLORS[0] },
  { id: "a2", name: "Bank", start: 0, color: ACCOUNT_COLORS[1] },
  { id: "a3", name: "Wallet App", start: 0, color: ACCOUNT_COLORS[2] },
];

const seedTx = [];

const money = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

function accountDelta(tx, accountId) {
  if (tx.kind === "deposit" && tx.accountId === accountId) return tx.amount;
  if (tx.kind === "withdraw" && tx.accountId === accountId) return -tx.amount;
  if (tx.kind === "transfer") {
    if (tx.fromId === accountId) return -tx.amount;
    if (tx.toId === accountId) return tx.amount;
  }
  return 0;
}

const STORAGE_KEY = "money-diary-v1";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function App() {
  const saved = loadSaved();
  const [accounts, setAccounts] = useState(saved?.accounts || seedAccounts);
  const [tx, setTx] = useState(saved?.tx || seedTx);
  const [activeAccount, setActiveAccount] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [form, setForm] = useState({
    kind: "withdraw", accountId: seedAccounts[0].id, fromId: seedAccounts[0].id, toId: seedAccounts[1]?.id || "",
    amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), note: "",
  });
  const [accForm, setAccForm] = useState({ name: "", start: "" });

  const balances = useMemo(() => {
    const b = {};
    accounts.forEach((a) => (b[a.id] = a.start));
    tx.forEach((t) => {
      accounts.forEach((a) => {
        b[a.id] += accountDelta(t, a.id);
      });
    });
    return b;
  }, [accounts, tx]);

  const netWorth = useMemo(() => Object.values(balances).reduce((s, v) => s + v, 0), [balances]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, tx }));
    } catch {
      // storage unavailable — app still works, just won't persist
    }
  }, [accounts, tx]);

  const visibleTx = useMemo(() => {
    const list = tx.filter((t) =>
      activeAccount === "all"
        ? true
        : t.accountId === activeAccount || t.fromId === activeAccount || t.toId === activeAccount
    );
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tx, activeAccount]);

  function accName(id) {
    return accounts.find((a) => a.id === id)?.name || "—";
  }

  function addTx() {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    if (form.kind === "transfer" && form.fromId === form.toId) return;
    setTx((prev) => [...prev, { id: Date.now(), ...form, amount: amt }]);
    setForm({ ...form, amount: "", note: "" });
    setShowForm(false);
  }

  function removeTx(id) {
    setTx((prev) => prev.filter((t) => t.id !== id));
  }

  function addAccount() {
    if (!accForm.name.trim()) return;
    const color = ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length];
    setAccounts((prev) => [
      ...prev,
      { id: "a" + Date.now(), name: accForm.name.trim(), start: Number(accForm.start) || 0, color },
    ]);
    setAccForm({ name: "", start: "" });
    setShowAccountForm(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EEE6D6", fontFamily: "'Newsreader', serif", color: "#2B2620" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,500&family=Special+Elite&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .type { font-family: 'Special Elite', monospace; }
        .num { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .diary-line { border-bottom: 1px dashed #C9BC9C; }
        input, select { font-family: 'Newsreader', serif; }
        ::-webkit-scrollbar { height: 6px; }
      `}</style>

      {/* Header */}
      <header style={{ padding: "26px 20px 10px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="type" style={{ fontSize: 11, letterSpacing: "0.12em", color: "#7A6F55", textTransform: "uppercase" }}>
          Money Diary
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          <h1 style={{ fontStyle: "italic", fontWeight: 500, fontSize: 32, margin: 0 }}>What's in the pockets today</h1>
          <div style={{ textAlign: "right" }}>
            <div className="type" style={{ fontSize: 10, color: "#7A6F55", textTransform: "uppercase" }}>Net worth</div>
            <div className="num" style={{ fontSize: 26, fontWeight: 600 }}>₹{money(netWorth)}</div>
          </div>
        </div>
      </header>

      {/* Envelope fan of accounts */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px 4px" }}>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10 }}>
          <button
            onClick={() => setActiveAccount("all")}
            style={{
              flex: "0 0 auto", width: 132, height: 92, borderRadius: "4px 4px 10px 10px", cursor: "pointer",
              border: `2px solid ${activeAccount === "all" ? "#2B2620" : "#C9BC9C"}`,
              background: "#F6F1E4", display: "flex", flexDirection: "column", justifyContent: "flex-end",
              padding: "10px 12px", textAlign: "left",
            }}
          >
            <Wallet size={16} color="#2B2620" style={{ marginBottom: 4 }} />
            <div className="type" style={{ fontSize: 10, color: "#7A6F55" }}>ALL ACCOUNTS</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>₹{money(netWorth)}</div>
          </button>

          {accounts.map((a) => (
            <button
              key={a.id}
< truncated lines 161-205 >
            {activeAccount === "all" ? "All entries" : accName(activeAccount) + " — entries"}
          </div>
          <button
            onClick={() => {
              setForm((f) => ({ ...f, accountId: activeAccount !== "all" ? activeAccount : accounts[0]?.id, fromId: accounts[0]?.id, toId: accounts[1]?.id || accounts[0]?.id }));
              setShowForm(true);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20,
              border: "none", background: "#2B2620", color: "#EEE6D6", fontSize: 13, cursor: "pointer",
            }}
          >
            <Plus size={14} /> New entry
          </button>
        </div>

        {/* Diary-style entry list */}
        <div style={{ position: "relative", paddingLeft: 18 }}>
          <div style={{ position: "absolute", left: 6, top: 4, bottom: 4, borderLeft: "1px dotted #B8AA85" }} />
          {visibleTx.length === 0 ? (
            <div style={{ color: "#9C9070", padding: "30px 0", fontSize: 14, fontStyle: "italic" }}>No entries yet — the page is blank.</div>
          ) : (
            visibleTx.map((t) => {
              const isTransfer = t.kind === "transfer";
              const isDeposit = t.kind === "deposit";
              const color = isTransfer ? "#4A5899" : isDeposit ? "#3F6659" : "#A6432C";
              const Icon = isTransfer ? ArrowRightLeft : isDeposit ? ArrowDownLeft : ArrowUpRight;
              return (
                <div key={t.id} className="diary-line" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px" }}>
                  <Icon size={15} color={color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.note || t.category}
                    </div>
                    <div className="type" style={{ fontSize: 10, color: "#8A7F63" }}>
                      {isTransfer ? `${accName(t.fromId)} → ${accName(t.toId)}` : accName(t.accountId)} · {t.category} · {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 14.5, fontWeight: 600, color, whiteSpace: "nowrap" }}>
                    {isDeposit ? "+" : "−"}₹{money(t.amount)}
                  </div>
                  <button onClick={() => removeTx(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#C9BC9C" }} aria-label="Delete entry">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* New transaction sheet */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#2B2620aa", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F6F1E4", width: "100%", maxWidth: 460, borderRadius: "14px 14px 0 0", padding: "20px 22px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontStyle: "italic", fontWeight: 500, fontSize: 20, margin: 0 }}>New entry</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { key: "deposit", label: "Deposit", color: "#3F6659" },
                { key: "withdraw", label: "Withdraw", color: "#A6432C" },
                { key: "transfer", label: "Transfer", color: "#4A5899" },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setForm({ ...form, kind: o.key })}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: 600,
                    border: `1px solid ${form.kind === o.key ? o.color : "#C9BC9C"}`,
                    background: form.kind === o.key ? o.color + "1f" : "#fff", color: form.kind === o.key ? o.color : "#7A6F55",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <label style={lbl}>Amount</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600 }} autoFocus />

            {form.kind === "transfer" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <div>
                  <label style={lbl}>From account</label>
                  <select value={form.fromId} onChange={(e) => setForm({ ...form, fromId: e.target.value })} style={inputStyle}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>To account</label>
                  <select value={form.toId} onChange={(e) => setForm({ ...form, toId: e.target.value })} style={inputStyle}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Account</label>
                <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} style={inputStyle}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — ₹{money(balances[a.id])}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <label style={lbl}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  {CATS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={lbl}>Note</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What was this for?" style={inputStyle} />
            </div>

            <button onClick={addTx} style={{ width: "100%", marginTop: 18, padding: "12px 0", borderRadius: 24, border: "none", background: "#2B2620", color: "#EEE6D6", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Save entry
            </button>
          </div>
        </div>
      )}

      {/* New account sheet */}
      {showAccountForm && (
        <div style={{ position: "fixed", inset: 0, background: "#2B2620aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowAccountForm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F6F1E4", width: "100%", maxWidth: 360, borderRadius: 14, padding: "20px 22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontStyle: "italic", fontWeight: 500, fontSize: 19, margin: 0 }}>New account</h2>
              <button onClick={() => setShowAccountForm(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <label style={lbl}>Name</label>
            <input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} placeholder="e.g. Savings" style={inputStyle} autoFocus />
            <label style={{ ...lbl, marginTop: 12 }}>Starting balance</label>
            <input type="number" value={accForm.start} onChange={(e) => setAccForm({ ...accForm, start: e.target.value })} placeholder="0" className="num" style={inputStyle} />
            <button onClick={addAccount} style={{ width: "100%", marginTop: 16, padding: "11px 0", borderRadius: 24, border: "none", background: "#2B2620", color: "#EEE6D6", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Create account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid #C9BC9C",
  background: "#fff", fontSize: 14, boxSizing: "border-box", color: "#2B2620",
};
const lbl = { fontFamily: "'Special Elite', monospace", 
