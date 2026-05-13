import { useState, useEffect, useCallback } from "react";

/* ─── Storage helper ─── */
const DB = {
  async get(k) {
    try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch {} }
};

/* ─── Utilities ─── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const today = () => new Date().toISOString().split("T")[0];
const fmt = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ─── Theme ─── */
const mkTheme = dark => ({
  bg: dark ? "#0b0f1a" : "#f0f4ff",
  surface: dark ? "#141824" : "#ffffff",
  surface2: dark ? "#1c2333" : "#f3f6ff",
  surface3: dark ? "#232b3e" : "#eaedff",
  text: dark ? "#e8eeff" : "#111827",
  sub: dark ? "#7986ab" : "#6b7280",
  border: dark ? "#1e2a40" : "#dde3f8",
  primary: "#5865f2",
  primaryDark: "#4752c4",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  gradPrimary: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
  gradGreen: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  gradRed: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  gradOrange: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
});

/* ─── Attendance / Fee helpers ─── */
const attended = s => (s.attendance || []).filter(a => a.present).length;
const todayRec = s => (s.attendance || []).find(a => a.date === today());
const isTodayPresent = s => todayRec(s)?.present;
const feeCalc = s => {
  const days = attended(s);
  const cycles = Math.floor(days / 20);
  const due = cycles * (s.monthlyFee || 0);
  const paid = (s.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
  const balance = due - paid;
  return { cycles, due, paid, balance, days };
};

/* ═══════════════════════════════════════════
   SMALL SHARED COMPONENTS
═══════════════════════════════════════════ */

function Toast({ toast }) {
  const colors = { ok: "#10b981", err: "#ef4444", info: "#5865f2" };
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: colors[toast.type] || colors.ok, color: "#fff",
      padding: "10px 22px", borderRadius: 40, fontWeight: 700, fontSize: 14,
      zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      animation: "slideDown 0.3s ease"
    }}>
      {toast.msg}
    </div>
  );
}

function Pill({ label, active, T, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      background: active ? T.primary : T.surface2,
      color: active ? "#fff" : T.sub,
      border: `1.5px solid ${active ? T.primary : T.border}`,
      borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700,
      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, position: "relative"
    }}>
      {label}
      {badge > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>{badge}</span>}
    </button>
  );
}

function StatCard({ icon, label, value, color, T, onClick, sub }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: 18, padding: "16px", flex: 1, minWidth: 0,
      border: `1.5px solid ${T.border}`, cursor: onClick ? "pointer" : "default",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", transition: "transform 0.15s",
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 20, color, marginTop: 6, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Avatar({ name, size = 44, T }) {
  const colors = ["#5865f2", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: color + "28", border: `2px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 800, color, flexShrink: 0
    }}>{name[0].toUpperCase()}</div>
  );
}

function StudentCard({ s, T, onClick, compact }) {
  const { balance, days } = feeCalc(s);
  const feeOk = balance <= 0;
  const rec = todayRec(s);
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: 16, padding: compact ? "12px 14px" : "14px 16px",
      marginBottom: 8, border: `1.5px solid ${T.border}`, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      transition: "all 0.15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary + "66"; e.currentTarget.style.transform = "translateX(2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateX(0)"; }}
    >
      <Avatar name={s.name} T={T} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.name}</div>
        <div style={{ fontSize: 12, color: T.sub }}>{s.class} • {s.subject}</div>
        {!compact && <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{days} days attended • {INR(s.monthlyFee)}/mo</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          background: feeOk ? T.green + "22" : T.red + "22",
          color: feeOk ? T.green : T.red,
          borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 700, marginBottom: 4
        }}>
          {feeOk ? "✓ Clear" : `${INR(balance)} due`}
        </div>
        {rec && <div style={{ fontSize: 10, color: rec.present ? T.green : T.red, fontWeight: 600 }}>
          {rec.present ? "● Present" : "● Absent"}
        </div>}
      </div>
    </div>
  );
}

function Modal({ onClose, T, title, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: "22px 22px 0 0", padding: "24px 20px 32px", width: "100%", maxWidth: 430, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button onClick={onClose} style={{ background: T.surface2, border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: T.sub, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, T }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, color: T.sub, marginBottom: 5, display: "block", fontWeight: 600, letterSpacing: 0.3 }}>{label}</label>}
      <input
        type={type} placeholder={placeholder || label} value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={{
          background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 11,
          padding: "11px 14px", color: T.text, fontSize: 14, width: "100%",
          outline: "none", boxSizing: "border-box", transition: "border-color 0.2s"
        }}
        onFocus={e => e.target.style.borderColor = T.primary}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function Btn({ children, onClick, gradient, color, T, full, outline, small, disabled }) {
  const bg = gradient || (outline ? "transparent" : (color || T.primary));
  return (
    <button onClick={!disabled ? onClick : undefined} style={{
      background: gradient || (outline ? "transparent" : bg),
      color: outline ? (color || T.primary) : "#fff",
      border: outline ? `2px solid ${color || T.primary}` : "none",
      borderRadius: small ? 10 : 13, padding: small ? "8px 14px" : "13px 20px",
      fontWeight: 700, fontSize: small ? 13 : 15, cursor: disabled ? "not-allowed" : "pointer",
      width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1,
      transition: "all 0.15s", whiteSpace: "nowrap"
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = "0.88")}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = "1")}
    >{children}</button>
  );
}

/* ═══════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════ */
function LoginScreen({ T, onLogin }) {
  const [tab, setTab] = useState("login");
  const [f, setF] = useState({ name: "", email: "", pass: "" });
  const [err, setErr] = useState("");

  const upd = k => v => setF(p => ({ ...p, [k]: v }));

  const handle = async () => {
    setErr("");
    if (tab === "signup") {
      if (!f.name || !f.email || !f.pass) return setErr("All fields are required");
      await DB.set("tr_user", { name: f.name, email: f.email, pass: f.pass });
      onLogin({ name: f.name, email: f.email });
    } else {
      const u = await DB.get("tr_user");
      if (!u || u.email !== f.email || u.pass !== f.pass) return setErr("Invalid email or password");
      onLogin(u);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0b0f1a 0%, #1a1040 50%, #0b0f1a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #5865f240 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed30 0%, transparent 70%)" }} />

      <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>📚</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>Tuition Register</div>
        <div style={{ fontSize: 14, color: "#7986ab", marginTop: 6 }}>Smart class management for tutors</div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 }}>
        {/* Tab selector */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 13, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{
              flex: 1, padding: "9px", border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              background: tab === t ? T.primary : "transparent",
              color: tab === t ? "#fff" : "#7986ab", transition: "all 0.2s"
            }}>{t === "login" ? "Login" : "Sign Up"}</button>
          ))}
        </div>

        {tab === "signup" && (
          <div style={{ marginBottom: 14 }}>
            <input placeholder="Your Name" value={f.name} onChange={e => upd("name")(e.target.value)}
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#e8eeff", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" }} />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <input type="email" placeholder="Email" value={f.email} onChange={e => upd("email")(e.target.value)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#e8eeff", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input type="password" placeholder="Password" value={f.pass} onChange={e => upd("pass")(e.target.value)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#e8eeff", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center", marginBottom: 14, fontWeight: 600 }}>{err}</div>}
        <button onClick={handle} style={{
          width: "100%", background: T.gradPrimary, color: "#fff",
          border: "none", borderRadius: 13, padding: "14px", fontWeight: 800, fontSize: 16, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(88,101,242,0.4)"
        }}>
          {tab === "login" ? "Login →" : "Create Account →"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#5a6480" }}>
          Demo: Sign up with any credentials
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STUDENT FORM MODAL
═══════════════════════════════════════════ */
function StudentForm({ T, editData, onSave, onClose }) {
  const [f, setF] = useState(editData || {
    name: "", phone: "", parentName: "", class: "", subject: "",
    monthlyFee: "", joiningDate: today(), address: "", notes: ""
  });
  const upd = k => v => setF(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");

  const save = () => {
    if (!f.name.trim()) return setErr("Student name is required");
    onSave({ ...f, monthlyFee: Number(f.monthlyFee) || 0 });
  };

  return (
    <Modal T={T} title={editData ? "✏️ Edit Student" : "➕ Add Student"} onClose={onClose}>
      {err && <div style={{ background: T.red + "22", color: T.red, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{err}</div>}
      <Input label="Full Name *" value={f.name} onChange={upd("name")} T={T} placeholder="Subrata Das" />
      <Input label="Phone Number" type="tel" value={f.phone} onChange={upd("phone")} T={T} placeholder="98765XXXXX" />
      <Input label="Parent Name" value={f.parentName} onChange={upd("parentName")} T={T} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Class/Standard" value={f.class} onChange={upd("class")} T={T} placeholder="Class 10" />
        <Input label="Subject" value={f.subject} onChange={upd("subject")} T={T} placeholder="Math" />
      </div>
      <Input label="Monthly Fee (₹)" type="number" value={f.monthlyFee} onChange={upd("monthlyFee")} T={T} placeholder="1500" />
      <Input label="Joining Date" type="date" value={f.joiningDate} onChange={upd("joiningDate")} T={T} />
      <Input label="Address (optional)" value={f.address} onChange={upd("address")} T={T} />
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: T.sub, marginBottom: 5, display: "block", fontWeight: 600, letterSpacing: 0.3 }}>Notes</label>
        <textarea value={f.notes || ""} onChange={e => upd("notes")(e.target.value)}
          placeholder="Any special notes..."
          style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 11, padding: "11px 14px", color: T.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", minHeight: 70, resize: "vertical" }} />
      </div>
      <Btn full gradient={T.gradPrimary} onClick={save} T={T}>
        {editData ? "Save Changes ✓" : "Add Student ✓"}
      </Btn>
    </Modal>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════ */
function Dashboard({ T, students, setScreen, setSelectedId, user }) {
  const todayPresent = students.filter(s => isTodayPresent(s)).length;
  const feesDue = students.filter(s => feeCalc(s).balance > 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthEarnings = students.reduce((sum, s) =>
    sum + (s.payments || []).filter(p => p.date.startsWith(thisMonth)).reduce((a, p) => a + p.amount, 0), 0);
  const totalPending = feesDue.reduce((sum, s) => sum + feeCalc(s).balance, 0);
  const unmarked = students.filter(s => !todayRec(s));
  const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div style={{ padding: 16 }}>
      {/* Hero card */}
      <div style={{ background: T.gradPrimary, borderRadius: 22, padding: 20, marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{dateStr}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 4 }}>Hello, {user?.name || "Tutor"} 👋</div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <div><div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{todayPresent}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Present Today</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{students.length}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Total Students</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 800, color: feesDue.length > 0 ? "#fca5a5" : "#86efac" }}>{feesDue.length}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Fee Due</div></div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard T={T} icon="💰" label="This Month" value={INR(monthEarnings)} color={T.green} />
        <StatCard T={T} icon="⚠️" label="Pending" value={INR(totalPending)} color={T.red} onClick={() => setScreen("students")} />
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setScreen("register")} style={{ flex: 1, background: T.gradPrimary, color: "#fff", border: "none", borderRadius: 15, padding: "14px 10px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 20px rgba(88,101,242,0.3)" }}>
          📝 Mark Attendance
        </button>
        <button onClick={() => setScreen("students")} style={{ flex: 1, background: T.gradGreen, color: "#fff", border: "none", borderRadius: 15, padding: "14px 10px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 20px rgba(16,185,129,0.3)" }}>
          ➕ Add Student
        </button>
      </div>

      {/* Attendance alert */}
      {unmarked.length > 0 && (
        <div style={{ background: T.orange + "18", border: `1.5px solid ${T.orange}44`, borderRadius: 16, padding
