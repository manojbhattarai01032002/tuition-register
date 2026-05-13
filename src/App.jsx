import { useState, useEffect } from "react";

const DB = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const today = () => new Date().toISOString().split("T")[0];
const fmt = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mkT = dark => ({
  bg: dark ? "#0b0f1a" : "#f0f4ff", surface: dark ? "#141824" : "#ffffff",
  surface2: dark ? "#1c2333" : "#f3f6ff", text: dark ? "#e8eeff" : "#111827",
  sub: dark ? "#7986ab" : "#6b7280", border: dark ? "#1e2a40" : "#dde3f8",
  primary: "#5865f2", green: "#10b981", red: "#ef4444", orange: "#f59e0b",
  blue: "#3b82f6", purple: "#8b5cf6",
  gP: "linear-gradient(135deg,#5865f2,#7c3aed)",
  gG: "linear-gradient(135deg,#10b981,#059669)",
});
const attended = s => (s.attendance || []).filter(a => a.present).length;
const todayRec = s => (s.attendance || []).find(a => a.date === today());
const feeCalc = s => {
  const days = attended(s);
  const cycles = Math.floor(days / 20);
  const due = cycles * (s.monthlyFee || 0);
  const paid = (s.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
  return { cycles, due, paid, balance: due - paid, days };
};

function Avatar({ name, size = 44, T }) {
  const cs = ["#5865f2","#10b981","#f59e0b","#ef4444","#8b5cf6","#3b82f6"];
  const c = cs[name.charCodeAt(0) % cs.length];
  return <div style={{ width:size,height:size,borderRadius:size/2,background:c+"28",border:`2px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.42,fontWeight:800,color:c,flexShrink:0 }}>{name[0].toUpperCase()}</div>;
}
function Toast({ t }) {
  const c = { ok:"#10b981", err:"#ef4444" };
  return <div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:c[t.type]||c.ok,color:"#fff",padding:"10px 22px",borderRadius:40,fontWeight:700,fontSize:14,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 8px 30px rgba(0,0,0,.35)" }}>{t.msg}</div>;
}
function Modal({ onClose, T, title, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.surface,borderRadius:"22px 22px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:430,maxHeight:"88vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontWeight:800,fontSize:18 }}>{title}</div>
          <button onClick={onClose} style={{ background:T.surface2,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:T.sub,fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Inp({ label, type="text", value, onChange, placeholder, T }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ fontSize:12,color:T.sub,marginBottom:5,display:"block",fontWeight:600 }}>{label}</label>}
      <input type={type} placeholder={placeholder||label} value={value||""} onChange={e=>onChange(e.target.value)}
        style={{ background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box" }}
        onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border} />
    </div>
  );
}
function StudentCard({ s, T, onClick }) {
  const { balance } = feeCalc(s); const ok = balance<=0; const rec = todayRec(s);
  return (
    <div onClick={onClick} style={{ background:T.surface,borderRadius:16,padding:"14px 16px",marginBottom:8,border:`1.5px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.primary+"66"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border}}>
      <Avatar name={s.name} T={T} />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>{s.name}</div>
        <div style={{ fontSize:12,color:T.sub }}>{s.class} · {s.subject}</div>
        <div style={{ fontSize:11,color:T.sub,marginTop:2 }}>{attended(s)} days · {INR(s.monthlyFee)}/mo</div>
      </div>
      <div style={{ textAlign:"right",flexShrink:0 }}>
        <div style={{ background:ok?T.green+"22":T.red+"22",color:ok?T.green:T.red,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700,marginBottom:4 }}>
          {ok?"✓ Clear":`${INR(balance)} due`}
        </div>
        {rec && <div style={{ fontSize:10,color:rec.present?T.green:T.red,fontWeight:600 }}>{rec.present?"● Present":"● Absent"}</div>}
      </div>
    </div>
  );
}
function LoginScreen({ T, onLogin }) {
  const [tab,setTab] = useState("login");
  const [f,setF] = useState({name:"",email:"",pass:""});
  const [err,setErr] = useState("");
  const handle = () => {
    setErr("");
    if(tab==="signup"){ if(!f.name||!f.email||!f.pass) return setErr("All fields required"); DB.set("tr_user",{name:f.name,email:f.email,pass:f.pass}); onLogin({name:f.name,email:f.email}); }
    else { const u=DB.get("tr_user"); if(!u||u.email!==f.email||u.pass!==f.pass) return setErr("Invalid credentials"); onLogin(u); }
  };
  const si = { background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:12,padding:"12px 16px",color:"#e8eeff",fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",marginBottom:14 };
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0b0f1a 0%,#1a1040 50%,#0b0f1a 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ textAlign:"center",marginBottom:32 }}>
        <div style={{ fontSize:60,marginBottom:8 }}>📚</div>
        <div style={{ fontSize:28,fontWeight:800,color:"#fff",letterSpacing:-1 }}>Tuition Register</div>
        <div style={{ fontSize:14,color:"#7986ab",marginTop:6 }}>Smart class management</div>
      </div>
      <div style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:24,width:"100%",maxWidth:360 }}>
        <div style={{ display:"flex",background:"rgba(255,255,255,.06)",borderRadius:13,padding:4,marginBottom:24 }}>
          {["login","signup"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setErr("")}} style={{ flex:1,padding:"9px",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",background:tab===t?T.primary:"transparent",color:tab===t?"#fff":"#7986ab" }}>{t==="login"?"Login":"Sign Up"}</button>
          ))}
        </div>
        {tab==="signup" && <input placeholder="Your Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={si} />}
        <input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={si} />
        <input type="password" placeholder="Password" value={f.pass} onChange={e=>setF({...f,pass:e.target.value})} style={{...si,marginBottom:20}} />
        {err && <div style={{ color:"#ef4444",fontSize:13,textAlign:"center",marginBottom:14,fontWeight:600 }}>{err}</div>}
        <button onClick={handle} style={{ width:"100%",background:T.gP,color:"#fff",border:"none",borderRadius:13,padding:"14px",fontWeight:800,fontSize:16,cursor:"pointer" }}>
          {tab==="login"?"Login →":"Create Account →"}
        </button>
      </div>
    </div>
  );
}
function StudentForm({ T, editData, onSave, onClose }) {
  const [f,setF] = useState(editData||{name:"",phone:"",parentName:"",class:"",subject:"",monthlyFee:"",joiningDate:today(),address:"",notes:""});
  const [err,setErr] = useState("");
  const upd = k => v => setF(p=>({...p,[k]:v}));
  return (
    <Modal T={T} title={editData?"✏️ Edit Student":"➕ Add Student"} onClose={onClose}>
      {err && <div style={{ background:T.red+"22",color:T.red,padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,marginBottom:14 }}>{err}</div>}
      <Inp label="Full Name *" value={f.name} onChange={upd("name")} T={T} placeholder="Subrata Das" />
      <Inp label="Phone" type="tel" value={f.phone} onChange={upd("phone")} T={T} />
      <Inp label="Parent Name" value={f.parentName} onChange={upd("parentName")} T={T} />
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        <Inp label="Class" value={f.class} onChange={upd("class")} T={T} placeholder="Class 10" />
        <Inp label="Subject" value={f.subject} onChange={upd("subject")} T={T} placeholder="Math" />
      </div>
      <Inp label="Monthly Fee (₹)" type="number" value={f.monthlyFee} onChange={upd("monthlyFee")} T={T} placeholder="1500" />
      <Inp label="Joining Date" type="date" value={f.joiningDate} onChange={upd("joiningDate")} T={T} />
      <Inp label="Address" value={f.address} onChange={upd("address")} T={T} />
      <div style={{ marginBottom:20 }}>
        <label style={{ fontSize:12,color:T.sub,marginBottom:5,display:"block",fontWeight:600 }}>Notes</label>
        <textarea value={f.notes||""} onChange={e=>upd("notes")(e.target.value)} style={{ background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",minHeight:70,resize:"vertical" }} />
      </div>
      <button onClick={()=>{ if(!f.name.trim()) return setErr("Name required"); onSave({...f,monthlyFee:Number(f.monthlyFee)||0}); }} style={{ width:"100%",background:T.gP,color:"#fff",border:"none",borderRadius:13,padding:"14px",fontWeight:800,fontSize:15,cursor:"pointer" }}>
        {editData?"Save Changes ✓":"Add Student ✓"}
      </button>
    </Modal>
  );
}
function Dashboard({ T, students, setScreen, setSelectedId, user }) {
  const todayP=students.filter(s=>todayRec(s)?.present).length;
  const feesDue=students.filter(s=>feeCalc(s).balance>0);
  const tm=new Date().toISOString().slice(0,7);
  const mE=students.reduce((sum,s)=>sum+(s.payments||[]).filter(p=>p.date.startsWith(tm)).reduce((a,p)=>a+p.amount,0),0);
  const tP=feesDue.reduce((sum,s)=>sum+feeCalc(s).balance,0);
  const unmarked=students.filter(s=>!todayRec(s));
  const dateStr=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long"});
  return (
    <div style={{ padding:16 }}>
      <div style={{ background:T.gP,borderRadius:22,padding:20,marginBottom:16,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,.08)" }} />
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:600 }}>{dateStr}</div>
          <div style={{ fontSize:22,fontWeight:800,color:"#fff",marginTop:4,marginBottom:16 }}>Hello, {user?.name||"Tutor"} 👋</div>
          <div style={{ display:"flex",gap:24 }}>
            <div><div style={{ fontSize:28,fontWeight:800,color:"#fff" }}>{todayP}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.7)" }}>Present Today</div></div>
            <div><div style={{ fontSize:28,fontWeight:800,color:"#fff" }}>{students.length}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.7)" }}>Students</div></div>
            <div><div style={{ fontSize:28,fontWeight:800,color:feesDue.length>0?"#fca5a5":"#86efac" }}>{feesDue.length}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.7)" }}>Fee Due</div></div>
          </div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
        {[{icon:"💰",label:"This Month",val:INR(mE),c:T.green},{icon:"⚠️",label:"Pending",val:INR(tP),c:T.red}].map((s,i)=>(
          <div key={i} style={{ background:T.surface,borderRadius:18,padding:16,border:`1.5px solid ${T.border}` }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div style={{ fontWeight:800,fontSize:20,color:s.c,marginTop:6,letterSpacing:-.5 }}>{s.val}</div>
            <div style={{ fontSize:11,color:T.sub,fontWeight:600,marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",gap:10,marginBottom:16 }}>
        <button onClick={()=>setScreen("register")} style={{ flex:1,background:T.gP,color:"#fff",border:"none",borderRadius:15,padding:"14px 10px",fontWeight:700,fontSize:14,cursor:"pointer" }}>📝 Mark Attendance</button>
        <button onClick={()=>setScreen("students")} style={{ flex:1,background:T.gG,color:"#fff",border:"none",borderRadius:15,padding:"14px 10px",fontWeight:700,fontSize:14,cursor:"pointer" }}>➕ Add Student</button>
      </div>
      {unmarked.length>0 && (
        <div style={{ background:T.orange+"18",border:`1.5px solid ${T.orange}44`,borderRadius:16,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div><div style={{ fontWeight:700,color:T.orange,fontSize:14 }}>⚡ {unmarked.length} unmarked today</div><div style={{ fontSize:12,color:T.sub,marginTop:2 }}>Mark attendance quickly</div></div>
          <button onClick={()=>setScreen("register")} style={{ background:T.orange,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontWeight:700,fontSize:12,cursor:"pointer" }}>Mark →</button>
        </div>
      )}
      {feesDue.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:14,marginBottom:10,color:T.red }}>⚠️ Fee Due ({feesDue.length})</div>
          {feesDue.slice(0,4).map(s=>(
            <div key={s.id} onClick={()=>{setSelectedId(s.id);setScreen("detail")}} style={{ background:T.surface,borderRadius:13,padding:"11px 14px",marginBottom:6,border:`1.5px solid ${T.red}30`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}><Avatar name={s.name} size={36} T={T} /><div><div style={{ fontWeight:600,fontSize:13 }}>{s.name}</div><div style={{ fontSize:11,color:T.sub }}>{attended(s)} days</div></div></div>
              <div style={{ color:T.red,fontWeight:800,fontSize:14 }}>{INR(feeCalc(s).balance)}</div>
            </div>
          ))}
        </div>
      )}
      {students.length>0 && <div><div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>👥 All Students</div>{students.map(s=><StudentCard key={s.id} s={s} T={T} onClick={()=>{setSelectedId(s.id);setScreen("detail")}} />)}</div>}
      {students.length===0 && (
        <div style={{ textAlign:"center",padding:"40px 20px",color:T.sub }}>
          <div style={{ fontSize:52,marginBottom:12 }}>📚</div>
          <div style={{ fontWeight:800,fontSize:18,color:T.text,marginBottom:8 }}>No students yet</div>
          <button onClick={()=>setScreen("students")} style={{ background:T.gP,color:"#fff",border:"none",borderRadius:13,padding:"13px 28px",fontWeight:700,fontSize:15,cursor:"pointer" }}>Add First Student →</button>
        </div>
      )}
    </div>
  );
}
function StudentsScreen({ T, students, setStudents, setScreen, setSelectedId, toast_ }) {
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [showForm,setShowForm]=useState(false);
  const [editData,setEditData]=useState(null);
  const filtered=students.filter(s=>{ const q=search.toLowerCase(); const ms=!q||s.name.toLowerCase().includes(q)||(s.class||"").toLowerCase().includes(q); const {balance}=feeCalc(s); const mf=filter==="all"||(filter==="due"&&balance>0)||(filter==="clear"&&balance<=0); return ms&&mf; });
  const save=f=>{ if(editData){setStudents(p=>p.map(s=>s.id===editData.id?{...s,...f}:s));toast_("✅ Updated!");}else{setStudents(p=>[...p,{...f,id:uid(),attendance:[],payments:[]}]);toast_("✅ Added!");} setShowForm(false);setEditData(null); };
  const del=(id,name)=>{ if(!confirm(`Delete ${name}?`)) return; setStudents(p=>p.filter(s=>s.id!==id));toast_("🗑️ Removed","err"); };
  const fdC=students.filter(s=>feeCalc(s).balance>0).length;
  return (
    <div style={{ padding:16 }}>
      <div style={{ background:T.surface,borderRadius:13,padding:"2px 14px",border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
        <span style={{ color:T.sub }}>🔍</span>
        <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1,background:"transparent",border:"none",padding:"11px 0",color:T.text,fontSize:14,outline:"none" }} />
        {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:T.sub,cursor:"pointer" }}>✕</button>}
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4 }}>
        {[["all","All",0],["due","Fee Due",fdC],["clear","Fee Clear",0]].map(([k,l,b])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ background:filter===k?T.primary:T.surface2,color:filter===k?"#fff":T.sub,border:`1.5px solid ${filter===k?T.primary:T.border}`,borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",position:"relative" }}>
            {l}{b>0&&<span style={{ position:"absolute",top:-6,right:-6,background:"#ef4444",color:"#fff",borderRadius:10,fontSize:9,fontWeight:800,padding:"1px 5px" }}>{b}</span>}
          </button>
        ))}
      </div>
      <button onClick={()=>{setEditData(null);setShowForm(true)}} style={{ width:"100%",background:T.gP,color:"#fff",border:"none",borderRadius:15,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:16 }}>➕ Add New Student</button>
      {filtered.map(s=>(
        <div key={s.id} style={{ position:"relative" }}>
          <StudentCard s={s} T={T} onClick={()=>{setSelectedId(s.id);setScreen("detail")}} />
          <div style={{ position:"absolute",bottom:18,right:14,display:"flex",gap:5 }}>
            <button onClick={e=>{e.stopPropagation();setEditData(s);setShowForm(true)}} style={{ background:T.blue+"22",color:T.blue,border:"none",borderRadius:7,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer" }}>Edit</button>
            <button onClick={e=>{e.stopPropagation();del(s.id,s.name)}} style={{ background:T.red+"22",color:T.red,border:"none",borderRadius:7,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer" }}>Del</button>
          </div>
        </div>
      ))}
      {showForm&&<StudentForm T={T} editData={editData} onSave={save} onClose={()=>{setShowForm(false);setEditData(null)}} />}
    </div>
  );
}
function DailyRegister({ T, students, markAtt }) {
  const dateStr=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const pC=students.filter(s=>todayRec(s)?.present).length;
  const aC=students.filter(s=>todayRec(s)&&!todayRec(s).present).length;
  const uC=students.filter(s=>!todayRec(s)).length;
  return (
    <div style={{ padding:16 }}>
      <div style={{ background:T.gP,borderRadius:20,padding:20,marginBottom:16,color:"#fff" }}>
        <div style={{ fontSize:13,opacity:.8,fontWeight:600 }}>📋 Daily Register</div>
        <div style={{ fontSize:15,fontWeight:700,marginTop:4,marginBottom:16 }}>{dateStr}</div>
        <div style={{ display:"flex",gap:24 }}>
          <div><div style={{ fontWeight:800,fontSize:26 }}>{pC}</div><div style={{ fontSize:11,opacity:.8 }}>Present</div></div>
          <div><div style={{ fontWeight:800,fontSize:26 }}>{aC}</div><div style={{ fontSize:11,opacity:.8 }}>Absent</div></div>
          <div><div style={{ fontWeight:800,fontSize:26,color:uC>0?"#fcd34d":"#86efac" }}>{uC}</div><div style={{ fontSize:11,opacity:.8 }}>Unmarked</div></div>
        </div>
      </div>
      {students.length===0&&<div style={{ textAlign:"center",padding:40,color:T.sub }}><div style={{ fontSize:40 }}>👨‍🎓</div><div style={{ marginTop:8,fontWeight:600 }}>No students yet</div></div>}
      {students.map(s=>{ const rec=todayRec(s);const isP=rec?.present;const isA=rec&&!rec.present;
        return (
          <div key={s.id} style={{ background:T.surface,borderRadius:16,padding:"14px 16px",marginBottom:8,border:`1.5px solid ${isP?T.green+"44":isA?T.red+"30":T.border}`,display:"flex",alignItems:"center",gap:12 }}>
            <Avatar name={s.name} T={T} size={42} />
            <div style={{ flex:1 }}><div style={{ fontWeight:700,fontSize:14 }}>{s.name}</div><div style={{ fontSize:12,color:T.sub }}>{s.class} · {attended(s)} days</div></div>
            <div style={{ display:"flex",gap:8,flexShrink:0 }}>
              <button onClick={()=>markAtt(s.id,true)} style={{ background:isP?T.green:T.green+"20",color:isP?"#fff":T.green,border:`1.5px solid ${isP?T.green:T.green+"44"}`,borderRadius:11,padding:"9px 14px",fontWeight:800,fontSize:14,cursor:"pointer" }}>✓ P</button>
              <button onClick={()=>markAtt(s.id,false)} style={{ background:isA?T.red:T.red+"20",color:isA?"#fff":T.red,border:`1.5px solid ${isA?T.red:T.red+"44"}`,borderRadius:11,padding:"9px 14px",fontWeight:800,fontSize:14,cursor:"pointer" }}>✗ A</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function StudentDetail({ T, student, markAtt, addPayment }) {
  const [tab,setTab]=useState("overview");
  const [payAmt,setPayAmt]=useState("");
  const [payNote,setPayNote]=useState("");
  const [showPay,setShowPay]=useState(false);
  const days=attended(student);const {cycles,due,paid,balance}=feeCalc(student);
  const rec=todayRec(student);const ok=balance<=0;
  const cal=Array.from({length:35},(_,i)=>{ const d=new Date();d.setDate(d.getDate()-(34-i));const ds=d.toISOString().split("T")[0];const r=(student.attendance||[]).find(a=>a.date===ds);return {date:ds,day:d.getDate(),status:r?(r.present?"P":"A"):null}; });
  const wm=`नमस्ते ${student.parentName||student.name} जी,\n\n${student.name} के ${days} class attend हुए। ${INR(balance)} fee pending है।\n\nधन्यवाद 🙏`;
  return (
    <div style={{ padding:16 }}>
      <div style={{ background:T.gP,borderRadius:22,padding:20,marginBottom:16,color:"#fff",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.08)" }} />
        <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16,position:"relative" }}>
          <div style={{ width:56,height:56,borderRadius:28,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800 }}>{student.name[0].toUpperCase()}</div>
          <div><div style={{ fontWeight:800,fontSize:20 }}>{student.name}</div><div style={{ fontSize:13,opacity:.85 }}>{student.class} · {student.subject}</div>{student.phone&&<div style={{ fontSize:12,opacity:.75 }}>📱 {student.phone}</div>}</div>
        </div>
        <div style={{ display:"flex",gap:20,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.15)",position:"relative" }}>
          <div><div style={{ fontSize:24,fontWeight:800 }}>{days}</div><div style={{ fontSize:11,opacity:.75 }}>Days</div></div>
          <div><div style={{ fontSize:24,fontWeight:800 }}>{INR(student.monthlyFee)}</div><div style={{ fontSize:11,opacity:.75 }}>Per Month</div></div>
          <div><div style={{ fontSize:24,fontWeight:800,color:ok?"#86efac":"#fca5a5" }}>{INR(balance)}</div><div style={{ fontSize:11,opacity:.75 }}>Balance</div></div>
        </div>
      </div>
      <div style={{ background:T.surface,borderRadius:16,padding:14,marginBottom:12,border:`1.5px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div><div style={{ fontWeight:700,fontSize:14 }}>Today's Attendance</div><div style={{ fontSize:13,color:rec?(rec.present?T.green:T.red):T.sub,fontWeight:600,marginTop:2 }}>{rec?(rec.present?"✅ Present":"❌ Absent"):"⏳ Not marked"}</div></div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>markAtt(student.id,true)} style={{ background:rec?.present?T.green:T.green+"22",color:rec?.present?"#fff":T.green,border:"none",borderRadius:10,padding:"9px 14px",fontWeight:800,cursor:"pointer" }}>✓ P</button>
          <button onClick={()=>markAtt(student.id,false)} style={{ background:(rec&&!rec.present)?T.red:T.red+"22",color:(rec&&!rec.present)?"#fff":T.red,border:"none",borderRadius:10,padding:"9px 14px",fontWeight:800,cursor:"pointer" }}>✗ A</button>
        </div>
      </div>
      <div style={{ background:ok?T.green+"12":T.red+"12",border:`1.5px solid ${ok?T.green+"44":T.red+"44"}`,borderRadius:16,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontWeight:700,color:ok?T.green:T.red,fontSize:14 }}>{ok?"✅ Fees All Clear":"⚠️ Fees Due"}</div>
          <div style={{ fontSize:12,color:T.sub,marginTop:3 }}>{cycles} cycles × {INR(student.monthlyFee)} = {INR(due)}</div>
          <div style={{ fontSize:12,color:T.sub }}>Paid: {INR(paid)} · Balance: {INR(balance)}</div>
        </div>
        <button onClick={()=>setShowPay(true)} style={{ background:T.gG,color:"#fff",border:"none",borderRadius:12,padding:"10px 14px",fontWeight:700,cursor:"pointer",fontSize:13 }}>+ Pay</button>
      </div>
      <div style={{ display:"flex",background:T.surface2,borderRadius:13,padding:4,marginBottom:16 }}>
        {[["overview","📊"],["attend","📅"],["fees","💰"],["info","ℹ️"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1,padding:"8px 2px",border:"none",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer",background:tab===k?T.primary:"transparent",color:tab===k?"#fff":T.sub }}>{l} {k.charAt(0).toUpperCase()+k.slice(1)}</button>
        ))}
      </div>
      {tab==="overview"&&(
        <div>
          <div style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}`,marginBottom:12 }}>
            <div style={{ fontWeight:700,marginBottom:12,fontSize:14 }}>📅 Last 35 Days</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
              {cal.map((d,i)=><div key={i} title={d.date} style={{ width:30,height:30,borderRadius:7,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",background:d.status==="P"?T.green+"30":d.status==="A"?T.red+"30":T.surface2,color:d.status==="P"?T.green:d.status==="A"?T.red:T.sub }}>{d.status||d.day}</div>)}
            </div>
          </div>
          <div style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}`,marginBottom:12 }}>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:8 }}>Next Fee Cycle</div>
            <div style={{ fontSize:13,color:T.sub,marginBottom:10 }}>{days%20}/20 days for next {INR(student.monthlyFee)}</div>
            <div style={{ background:T.surface2,borderRadius:8,height:8,overflow:"hidden" }}><div style={{ background:T.gP,width:`${((days%20)/20)*100}%`,height:"100%",borderRadius:8 }} /></div>
          </div>
          {!ok&&student.phone&&<a href={`https://wa.me/${student.phone.replace(/\D/g,"")}?text=${encodeURIComponent(wm)}`} target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#25D366",color:"#fff",border:"none",borderRadius:14,padding:14,fontWeight:700,fontSize:14,textDecoration:"none" }}>💬 WhatsApp Fee Reminder</a>}
        </div>
      )}
      {tab==="attend"&&(
        <div style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}` }}>
          <div style={{ fontWeight:700,marginBottom:12,fontSize:14 }}>Attendance History</div>
          {(student.attendance||[]).length===0&&<div style={{ color:T.sub }}>No records yet</div>}
          {[...(student.attendance||[])].sort((a,b)=>b.date.localeCompare(a.date)).map((a,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:13,color:T.sub }}>{fmt(a.date)}</span>
              <span style={{ fontWeight:700,color:a.present?T.green:T.red,fontSize:13 }}>{a.present?"✅ Present":"❌ Absent"}</span>
            </div>
          ))}
        </div>
      )}
      {tab==="fees"&&(
        <div>
          <button onClick={()=>setShowPay(true)} style={{ width:"100%",background:T.gG,color:"#fff",border:"none",borderRadius:14,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:12 }}>+ Record Payment</button>
          <div style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}` }}>
            <div style={{ fontWeight:700,marginBottom:12,fontSize:14 }}>Payment History</div>
            {(student.payments||[]).length===0&&<div style={{ color:T.sub }}>No payments yet</div>}
            {[...(student.payments||[])].sort((a,b)=>b.date.localeCompare(a.date)).map((p,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}` }}>
                <div><div style={{ fontWeight:700,fontSize:15 }}>{INR(p.amount)}</div><div style={{ fontSize:12,color:T.sub }}>{p.note||"Payment"} · {fmt(p.date)}</div></div>
                <div style={{ background:T.green+"22",color:T.green,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700 }}>✓ Paid</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==="info"&&(
        <div style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}` }}>
          {[["👤","Name",student.name],["📱","Phone",student.phone||"—"],["👨‍👩‍👦","Parent",student.parentName||"—"],["🏫","Class",student.class||"—"],["📚","Subject",student.subject||"—"],["💰","Fee",INR(student.monthlyFee)],["📅","Joined",fmt(student.joiningDate)]].map(([ic,lb,vl])=>(
            <div key={lb} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`,gap:12 }}>
              <span style={{ fontSize:13,color:T.sub,flexShrink:0 }}>{ic} {lb}</span>
              <span style={{ fontSize:13,fontWeight:600,textAlign:"right" }}>{vl}</span>
            </div>
          ))}
        </div>
      )}
      {showPay&&(
        <Modal T={T} title="💰 Record Payment" onClose={()=>{setShowPay(false);setPayAmt("");setPayNote("")}}>
          <div style={{ background:ok?T.green+"15":T.red+"15",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:ok?T.green:T.red,fontWeight:600 }}>{ok?"✅ No pending balance":`⚠️ ${INR(balance)} pending`}</div>
          <Inp label="Amount (₹)" type="number" value={payAmt} onChange={setPayAmt} placeholder={String(student.monthlyFee||0)} T={T} />
          <Inp label="Note" value={payNote} onChange={setPayNote} placeholder="March fee" T={T} />
          <div style={{ display:"flex",gap:10,marginTop:4 }}>
            <button onClick={()=>{setShowPay(false);setPayAmt("");setPayNote("")}} style={{ flex:1,background:T.surface2,color:T.text,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"13px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
            <button onClick={()=>{ if(!payAmt) return; addPayment(student.id,Number(payAmt),payNote); setShowPay(false);setPayAmt("");setPayNote(""); }} style={{ flex:2,background:T.gG,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer" }}>Save ✓</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Reports({ T, students }) {
  const tm=new Date().toISOString().slice(0,7);
  const tE=students.reduce((s,st)=>s+(st.payments||[]).reduce((a,p)=>a+p.amount,0),0);
  const mE=students.reduce((s,st)=>s+(st.payments||[]).filter(p=>p.date.startsWith(tm)).reduce((a,p)=>a+p.amount,0),0);
  const tD=students.reduce((s,st)=>s+Math.max(0,feeCalc(st).balance),0);
  return (
    <div style={{ padding:16 }}>
      <div style={{ fontWeight:800,fontSize:18,marginBottom:16 }}>📊 Reports</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
        {[{i:"💰",l:"This Month",v:INR(mE),c:T.green},{i:"⚠️",l:"Pending",v:INR(tD),c:T.red},{i:"✅",l:"Total Earned",v:INR(tE),c:T.blue},{i:"👥",l:"Students",v:students.length,c:T.purple}].map((s,i)=>(
          <div key={i} style={{ background:T.surface,borderRadius:16,padding:16,border:`1.5px solid ${T.border}` }}>
            <div style={{ fontSize:24 }}>{s.i}</div>
            <div style={{ fontWeight:800,fontSize:18,color:s.c,marginTop:6 }}>{s.v}</div>
            <div style={{ fontSize:11,color:T.sub,fontWeight:600,marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>Student-wise Summary</div>
      {students.map(s=>{ const {due,paid,balance}=feeCalc(s);const d=attended(s);
        return (
          <div key={s.id} style={{ background:T.surface,borderRadius:14,padding:14,marginBottom:8,border:`1.5px solid ${T.border}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}><Avatar name={s.name} size={34} T={T} /><div><div style={{ fontWeight:700,fontSize:14 }}>{s.name}</div><div style={{ fontSize:11,color:T.sub }}>{s.class}</div></div></div>
              <div style={{ color:balance>0?T.red:T.green,fontWeight:800,fontSize:14 }}>{balance>0?`Due ${INR(balance)}`:"✓ Clear"}</div>
            </div>
            <div style={{ display:"flex",gap:16,fontSize:12,color:T.sub,marginBottom:8 }}><span>📅 {d} days</span><span>💰 {INR(paid)}</span><span>Total {INR(due)}</span></div>
            {due>0&&<div style={{ background:T.surface2,borderRadius:6,height:5,overflow:"hidden" }}><div style={{ background:paid>=due?T.gG:T.gP,width:`${clamp((paid/due)*100,0,100)}%`,height:"100%",borderRadius:6 }} /></div>}
          </div>
        );
      })}
    </div>
  );
}
function BottomNav({ screen, setScreen, T, fdC }) {
  const tabs=[{k:"dashboard",i:"🏠",l:"Home"},{k:"students",i:"👥",l:"Students",b:fdC},{k:"register",i:"📋",l:"Register"},{k:"reports",i:"📊",l:"Reports"}];
  return (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.surface,borderTop:`1.5px solid ${T.border}`,display:"flex",zIndex:200 }}>
      {tabs.map(t=>(
        <button key={t.k} onClick={()=>setScreen(t.k)} style={{ flex:1,padding:"10px 0 12px",border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",color:screen===t.k?T.primary:T.sub,position:"relative" }}>
          <span style={{ fontSize:22 }}>{t.i}</span>
          {t.b>0&&<span style={{ position:"absolute",top:8,left:"calc(50% + 6px)",background:T.red,color:"#fff",borderRadius:10,fontSize:9,fontWeight:800,padding:"1px 5px" }}>{t.b}</span>}
          <span style={{ fontSize:10,fontWeight:screen===t.k?700:500 }}>{t.l}</span>
          {screen===t.k&&<div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:32,height:3,background:T.primary,borderRadius:3 }} />}
        </button>
      ))}
    </div>
  );
}
export default function App() {
  const [screen,setScreen]=useState("login");
  const [dark,setDark]=useState(true);
  const [students,setStudents]=useState(()=>DB.get("tr_students")||[]);
  const [user,setUser]=useState(()=>DB.get("tr_session"));
  const [selectedId,setSelectedId]=useState(null);
  const [toast,setToast]=useState(null);
  const T=mkT(dark);
  useEffect(()=>{ const link=document.createElement("link");link.rel="stylesheet";link.href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";document.head.appendChild(link); const style=document.createElement("style");style.textContent="*{font-family:'Plus Jakarta Sans',-apple-system,sans-serif!important}";document.head.appendChild(style); if(user) setScreen("dashboard"); },[]);
  useEffect(()=>DB.set("tr_students",students),[students]);
  useEffect(()=>{ if(user) DB.set("tr_session",user); },[user]);
  const toast_=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};
  const markAtt=(id,present)=>{ setStudents(prev=>prev.map(s=>{ if(s.id!==id) return s; const att=[...(s.attendance||[])]; const i=att.findIndex(a=>a.date===today()); if(i>=0) att[i]={date:today(),present}; else att.push({date:today(),present}); return {...s,attendance:att}; })); toast_(present?"✅ Present!":"❌ Absent"); };
  const addPayment=(id,amount,note)=>{ setStudents(prev=>prev.map(s=>s.id!==id?s:{...s,payments:[...(s.payments||[]),{id:uid(),date:today(),amount,note}]})); toast_("💰 Payment saved!"); };
  const sel=students.find(s=>s.id===selectedId);
  const fdC=students.filter(s=>feeCalc(s).balance>0).length;
  if(screen==="login") return <LoginScreen T={T} onLogin={u=>{setUser(u);setScreen("dashboard");toast_("Welcome! 👋");}} />;
  return (
    <div style={{ background:T.bg,minHeight:"100vh",color:T.text,maxWidth:430,margin:"0 auto",position:"relative" }}>
      {toast&&<Toast t={toast} />}
      <div style={{ background:T.surface,padding:"14px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1.5px solid ${T.border}`,position:"sticky",top:0,zIndex:100 }}>
        <div><div style={{ fontWeight:800,fontSize:17,color:T.primary }}>📚 Tuition Register</div>{screen==="detail"&&sel&&<div style={{ fontSize:11,color:T.sub,marginTop:1 }}>{sel.name}</div>}</div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>setDark(!dark)} style={{ background:T.surface2,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"7px 11px",cursor:"pointer",fontSize:16 }}>{dark?"☀️":"🌙"}</button>
          {screen==="detail"&&<button onClick={()=>setScreen("students")} style={{ background:T.surface2,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"7px 11px",cursor:"pointer",fontSize:13,color:T.sub,fontWeight:600 }}>← Back</button>}
        </div>
      </div>
      <div style={{ paddingBottom:88 }}>
        {screen==="dashboard"&&<Dashboard T={T} students={students} setScreen={setScreen} setSelectedId={setSelectedId} user={user} />}
        {screen==="students"&&<StudentsScreen T={T} students={students} setStudents={setStudents} setScreen={setScreen} setSelectedId={setSelectedId} toast_={toast_} />}
        {screen==="register"&&<DailyRegister T={T} students={students} markAtt={markAtt} />}
        {screen==="detail"&&sel&&<StudentDetail T={T} student={sel} markAtt={markAtt} addPayment={addPayment} />}
        {screen==="reports"&&<Reports T={T} students={students} />}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} T={T} fdC={fdC} />
    </div>
  );
}
