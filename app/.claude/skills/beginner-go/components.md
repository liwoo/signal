# Reusable Components Reference

Copy these verbatim into any new Go concept animation. Do not redesign them.

---

## Fonts

```js
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Share+Tech+Mono&family=DM+Sans:wght@400;500;600;700&display=swap');`;
```

## CSS Keyframes

```js
const KEYFRAMES = `
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes popIn     { from{transform:translate(-50%,-50%) scale(0.2);opacity:0} to{transform:translate(-50%,-50%) scale(1);opacity:1} }
  @keyframes popIn2    { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes slideRight{ 0%{left:-20%} 100%{left:110%} }
  @keyframes slideLeft { 0%{left:110%} 100%{left:-20%} }
  @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes blinkRed  { 0%,49%{opacity:1;box-shadow:0 0 10px #ef444466} 50%,100%{opacity:0.25;box-shadow:none} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.25} }
`;
```

---

## SHLine — Syntax highlighter

Highlights a single line of Go code inline.

```jsx
function SHLine({ line }) {
  const kw = ["package","import","func","var","const","return"];
  const tokens = line.split(/(\b(?:package|import|func|var|const|return)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|[{}()"])/g);
  return (
    <span>
      {tokens.map((t,i) => {
        if (kw.includes(t))    return <span key={i} style={{color:"#c084fc"}}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{color:"#86efac"}}>{t}</span>;
        if (t==="fmt")         return <span key={i} style={{color:"#60a5fa"}}>{t}</span>;
        if (t==="Println")     return <span key={i} style={{color:"#fbbf24"}}>{t}</span>;
        if (t===":=")          return <span key={i} style={{color:"#f472b6"}}>{t}</span>;
        return <span key={i} style={{color:"#e2e8f0"}}>{t}</span>;
      })}
    </span>
  );
}
```

To extend for new keywords (e.g. `go`, `chan`, `select`, `range`):
- Add the keyword to the `kw` array
- Add a colour entry: `if (t==="go") return <span style={{color:"#34d399"}}>{t}</span>`

---

## CodePanel — Full code block

```jsx
// CODE_LINES format:
// { code: "string", label: "plain english", color: "#hex", scene: "scene_id" }

function CodePanel({ highlightLines=[], annotate={} }) {
  return (
    <div style={{background:"#0d0d1a",borderRadius:10,padding:14,
      fontFamily:T.mono,fontSize:12,border:"1px solid #1e1e3a",overflowX:"auto"}}>
      {YOUR_CODE_STRING.split("\n").map((line,i) => {
        const hl = highlightLines.includes(i);
        const note = annotate[i];
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{
              display:"flex",gap:8,alignItems:"center",flex:1,
              background:hl?"#00d4aa11":"transparent",
              borderLeft:hl?"3px solid #00d4aa":"3px solid transparent",
              padding:"1px 8px",borderRadius:3
            }}>
              <span style={{color:"#2a2a4a",minWidth:14,fontSize:10,userSelect:"none"}}>{i+1}</span>
              <SHLine line={line}/>
            </div>
            {note && (
              <span style={{fontSize:10,color:note.color,background:note.color+"18",
                border:`1px solid ${note.color}33`,borderRadius:20,
                padding:"1px 7px",whiteSpace:"nowrap",fontFamily:T.ui}}>
                ← {note.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Worker — Animated worker chip

```jsx
function Worker({ w }) {
  const aC = {
    read:"#f59e0b", create:"#3b82f6", post:"#00d4aa",
    collect:"#00d4aa", open:"#f472b8", wait:"#94a3b8", done:"#00d4aa"
  }[w.action] || "#475569";

  return (
    <div style={{
      position:"absolute",
      left:`${w.x}%`, top:`${w.y}%`,
      transform:"translate(-50%,-50%)",
      display:"flex", flexDirection:"column", alignItems:"center", gap:1,
      transition:"left 0.8s cubic-bezier(.4,0,.2,1), top 0.8s cubic-bezier(.4,0,.2,1)",
      zIndex:10,
    }}>
      <div style={{
        fontSize:20, lineHeight:1,
        filter: w.action==="done" ? `drop-shadow(0 0 5px #00d4aa)` : "none"
      }}>
        {w.emoji}
      </div>
      {w.label && (
        <div style={{
          fontSize:8, color:aC, fontFamily:T.ui, fontWeight:700,
          whiteSpace:"nowrap", background:aC+"22",
          border:`1px solid ${aC}44`, borderRadius:8,
          padding:"1px 5px", maxWidth:84, textAlign:"center"
        }}>
          {w.label}
        </div>
      )}
    </div>
  );
}
```

**Worker object shape:**
```js
{ id:"alice", emoji:"👩‍💻", label:"creating envelope", x:26, y:52, action:"create" }
```

---

## EnvChip — Envelope chip (auto-sizes func vs variable)

```jsx
function EnvChip({ env }) {
  const cols = { func:"#f472b8", string:"#3b82f6", int:"#ef4444", float64:"#f59e0b", bool:"#22c55e" };
  const c = cols[env.type] || "#888";
  const isFunc = env.type === "func";
  const w = isFunc ? 78 : 50;

  return (
    <div style={{
      position:"absolute",
      left:`${env.x}%`, top:`${env.y}%`,
      transform:"translate(-50%,-50%)",
      transition:"left 0.6s ease, top 0.6s ease",
      animation: env.isNew
        ? "popIn 0.4s cubic-bezier(.34,1.56,.64,1) both"
        : "fadeIn 0.3s ease-out both",
      zIndex: isFunc ? 9 : 8,
    }}>
      <div style={{
        width:w,
        background: isFunc ? "#2a0f22" : (env.type==="string"?"#0f1e33":"#1e0a0a"),
        border:`${isFunc?2:1.5}px solid ${c}`,
        borderRadius:3,
        boxShadow:`0 ${isFunc?4:2}px ${isFunc?14:8}px ${c}${isFunc?"66":"44"}`,
        overflow:"hidden",
      }}>
        {/* Flap */}
        <div style={{
          height: isFunc?20:12,
          background: env.open ? c+"55" : c+"22",
          borderBottom:`1px solid ${c}33`,
          position:"relative", overflow:"hidden",
        }}>
          <div style={{
            position:"absolute", top:0, left:"50%",
            transform:"translateX(-50%)",
            width:0, height:0,
            borderLeft:`${w/2}px solid transparent`,
            borderRight:`${w/2}px solid transparent`,
            borderTop:`${isFunc?20:12}px solid ${c}${env.open?"00":"33"}`,
          }}/>
          {env.open && (
            <div style={{fontSize:isFunc?8:7,color:c,fontFamily:T.ui,
              textAlign:"center",paddingTop:isFunc?4:1,fontWeight:700}}>
              OPEN
            </div>
          )}
        </div>
        {/* Type badge */}
        <div style={{background:c,padding:isFunc?"2px 6px":"1px 4px"}}>
          <span style={{fontSize:isFunc?9:7,color:"#fff",fontWeight:700,fontFamily:T.ui}}>
            {env.type}
          </span>
        </div>
        {/* Body */}
        <div style={{padding:isFunc?"4px 6px 6px":"2px 4px 4px",background:"#080c14"}}>
          <div style={{fontSize:isFunc?8:7,color:c+"99",fontFamily:T.ui,
            textTransform:"uppercase",letterSpacing:0.3}}>
            name:
          </div>
          <div style={{fontFamily:T.hw,fontSize:isFunc?16:12,
            color:"#e2e8f0",fontWeight:700,lineHeight:1}}>
            {env.label}
          </div>
          {env.open && env.value && (
            <div style={{marginTop:3,background:c+"22",borderRadius:2,
              padding:isFunc?"2px 5px":"1px 3px",
              display:"flex",alignItems:"center",gap:2}}>
              <span style={{fontSize:isFunc?10:8}}>🔤</span>
              <span style={{fontFamily:T.hw,fontSize:isFunc?14:11,color:c,fontWeight:700}}>
                {env.value}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Envelope object shape:**
```js
{
  id:     "name",          // unique key
  x:      44,              // % position left
  y:      60,              // % position top
  type:   "string",        // "func" | "string" | "int" | "float64" | "bool"
  label:  "name",          // handwritten label text
  open:   false,           // flap open?
  value:  '"Alice"',       // sticker content (shown when open:true)
  isNew:  true,            // triggers popIn animation
}
```

---

## Complete Button

Always present from scene 1. Always blinks red. Only green on final scene.

```jsx
{/* In OfficeRoom, always render this — no conditional */}
<div style={{
  position:"absolute", left:"12%", top:"67%",
  width:34, height:34, borderRadius:"50%",
  background: sc.completeBtn==="pressed"
    ? `radial-gradient(circle,#00d4aa,#008866)`
    : `radial-gradient(circle,#7f1d1d,#3a0808)`,
  border:`2px solid ${sc.completeBtn==="pressed"?"#00d4aa":"#991b1b"}`,
  boxShadow: sc.completeBtn==="pressed"
    ? "0 0 18px #00d4aa, 0 0 6px #00d4aa"
    : "0 0 6px #99000066",
  display:"flex", alignItems:"center", justifyContent:"center",
  transition:"background 0.5s, border-color 0.5s, box-shadow 0.5s",
  zIndex:12,
  animation: sc.completeBtn==="pressed"
    ? "popIn2 0.4s ease-out"
    : "blinkRed 1s step-end infinite",
}}>
  <span style={{fontSize:sc.completeBtn==="pressed"?15:13}}>
    {sc.completeBtn==="pressed" ? "✅" : "🔴"}
  </span>
</div>
<div style={{
  position:"absolute", left:"6%", top:"80%",
  fontSize:7, fontFamily:T.ui, fontWeight:700,
  textTransform:"uppercase", letterSpacing:0.3,
  textAlign:"center", width:"20%", lineHeight:1.3,
  color: sc.completeBtn==="pressed" ? "#00d4aa" : "#7f1d1d",
  transition:"color 0.5s",
}}>
  {sc.completeBtn==="pressed" ? "done!" : "locked"}
</div>
```

---

## Postal Slot (Dividing Wall)

The wall sits at `wallX = 54%`. The slot window is centred in it.

```jsx
{/* Envelope travels horizontally through slot */}
{postalActive && (
  <div style={{
    position:"absolute",
    width:"70%", height:10,
    background:"#fdf8ee", border:"1px solid #c9b99a", borderRadius:2,
    display:"flex", alignItems:"center", justifyContent:"center",
    animation: toFmt ? "slideRight 0.6s ease-in-out infinite"
                     : "slideLeft 0.6s ease-in-out infinite",
  }}>
    <span style={{fontSize:6, color:"#5c3d2e"}}>✉</span>
  </div>
)}

{/* Direction arrow below slot */}
{postalActive && (
  <div style={{
    position:"absolute",
    top:`${slotY + slotH + 2}%`,
    left:0, right:0, textAlign:"center",
    fontSize:10, color:"#00d4aa",
    animation:"fadeIn 0.2s", lineHeight:1,
  }}>
    {toFmt ? "→" : "←"}
  </div>
)}
```

---

## Display Panel

```jsx
<div style={{
  position:"absolute", bottom:0, left:"5%", right:0, height:"14%",
  background:"#020d04",
  borderTop:`1px solid ${sc.displayResult ? "#1a5c2a" : "#0d1a10"}`,
  display:"flex", alignItems:"center", padding:"0 10px", gap:8,
  transition:"all 0.5s",
}}>
  <span style={{fontSize:7,color:"#1a3d20",fontFamily:T.ui,
    textTransform:"uppercase",letterSpacing:0.8,flexShrink:0,
    borderRight:"1px solid #0d2a10",paddingRight:6}}>
    display panel
  </span>
  <div style={{flex:1,display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
    {sc.display.map((l,i) => (
      <span key={i} style={{
        fontFamily:T.mono,
        fontSize: l === sc.resultValue ? 13 : 8,
        color:    l === sc.resultValue ? "#00ff88" : "#1a5c2a",
        fontWeight: l === sc.resultValue ? 700 : 400,
        textShadow: l === sc.resultValue ? "0 0 12px #00ff88" : "none",
        animation: i===sc.display.length-1 ? "fadeIn 0.4s ease-out" : "none",
        whiteSpace:"nowrap",
      }}>
        {l}
      </span>
    ))}
    <span style={{fontFamily:T.mono,fontSize:9,color:"#1a3d20",
      animation:"blink 1s step-end infinite"}}>█</span>
  </div>
</div>
```

---

## Auto-play hook

```js
useEffect(() => {
  if (!playing) return;
  if (scene >= SCENES.length - 1) { setPlaying(false); return; }
  const t = setTimeout(() => setScene(s => s + 1), 3000);
  return () => clearTimeout(t);
}, [playing, scene]);
```
