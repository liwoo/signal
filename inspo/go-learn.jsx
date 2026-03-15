import { useState, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Share+Tech+Mono&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const T = {
  hw:"'Caveat', cursive", mono:"'Share Tech Mono', monospace", ui:"'DM Sans', sans-serif",
  paper:"#fdf8ee", paperAlt:"#fffdf5", line:"#e2d9c4", lineAlt:"#ecdfc7",
  ink:"#2c1810", inkMid:"#5c3d2e", inkLight:"#8b6b52", inkFade:"#c5b49a",
  red:"#c0392b", steel:"#0f1623", steelMid:"#1a2236", steelLt:"#2d3f5c",
  green:"#00d4aa", amber:"#f59e0b", blue:"#3b82f6", pink:"#f472b8", purple:"#c084fc",
};

// ─── Syntax highlight ─────────────────────────────────────────────────────────
function SHLine({ line }) {
  const kw = ["package","import","func","var","const","return"];
  const tokens = line.split(/(\b(?:package|import|func|var|const|return)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|[{}()"])/g);
  return (
    <span>
      {tokens.map((t,i)=>{
        if(kw.includes(t))    return <span key={i} style={{color:"#c084fc"}}>{t}</span>;
        if(t.startsWith('"')) return <span key={i} style={{color:"#86efac"}}>{t}</span>;
        if(t==="fmt")         return <span key={i} style={{color:"#60a5fa"}}>{t}</span>;
        if(t==="Println")     return <span key={i} style={{color:"#fbbf24"}}>{t}</span>;
        if(t===":=")          return <span key={i} style={{color:"#f472b6"}}>{t}</span>;
        return <span key={i} style={{color:"#e2e8f0"}}>{t}</span>;
      })}
    </span>
  );
}

const CARD_CODE = `package main\n\nimport "fmt"\n\nfunc main() {\n    name := "Alice"\n    fmt.Println(name)\n}`;

function CodePanel({ highlightLines=[], annotate={} }) {
  return (
    <div style={{background:"#0d0d1a",borderRadius:10,padding:14,fontFamily:T.mono,fontSize:12,border:"1px solid #1e1e3a",overflowX:"auto"}}>
      {CARD_CODE.split("\n").map((line,i)=>{
        const hl=highlightLines.includes(i); const note=annotate[i];
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flex:1,background:hl?"#00d4aa11":"transparent",borderLeft:hl?"3px solid #00d4aa":"3px solid transparent",padding:"1px 8px",borderRadius:3}}>
              <span style={{color:"#2a2a4a",minWidth:14,fontSize:10,userSelect:"none"}}>{i+1}</span>
              <SHLine line={line}/>
            </div>
            {note&&<span style={{fontSize:10,color:note.color,background:note.color+"18",border:`1px solid ${note.color}33`,borderRadius:20,padding:"1px 7px",whiteSpace:"nowrap",fontFamily:T.ui}}>← {note.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── PART 1: Analog Card ──────────────────────────────────────────────────────
const CARD_PARTS = [
  {id:"card",    label:"The Package",            sub:"package",          color:"#d97706",lines:[0],   desc:"The whole card is the package — a named container that holds everything. Every .go file starts by declaring which package it belongs to."},
  {id:"pname",   label:"Package Name Field",     sub:"package main",     color:"#c084fc",lines:[0],   desc:"The label you fill in on the card. 'main' is the special name Go looks for to know where to start your programme."},
  {id:"attach",  label:"Required Attachments",   sub:'import "fmt"',     color:"#3b82f6",lines:[2],   desc:"A checklist of items that must be collected before the package can run. 'import' tells Go which toolboxes to fetch. Here: 'fmt' — Go's built-in printer toolkit."},
  {id:"envelope",label:"The Envelope / Function",sub:"func main() { }",  color:"#f472b8",lines:[4,5,6,7],desc:"Inside the package sits an envelope — a function. Go opens the one called 'main' first. The word 'func' declares an envelope in Go."},
  {id:"req",     label:"Required Info (front)",  sub:"(params)",         color:"#34d399",lines:[4],   desc:"On the front of the envelope: what must be provided before it can be opened. main() needs nothing upfront — brackets stay empty: (). Other envelopes list their requirements here."},
  {id:"exp",     label:"Expected Info (back)",   sub:"return type",      color:"#fb923c",lines:[4],   desc:"On the back: what will be sent back once the work is done. main() returns nothing. Other envelopes can return numbers, strings, and more."},
  {id:"body",    label:"Envelope Contents",      sub:"{ instructions }", color:"#00d4aa",lines:[5,6], desc:"The instructions inside the envelope — wrapped in { }. A worker reads them top to bottom and carries each one out."},
  {id:"smenv",   label:"Small Envelope / Variable",sub:"variable",       color:"#3b82f6",lines:[5],   desc:"Variables are small named envelopes. Each one holds a sticker — a piece of data. Colour-coded: blue for word stickers (strings), red for number stickers (ints)."},
  {id:"sticker", label:"Sticker / Data Value",   sub:"value",            color:"#86efac",lines:[5],   desc:"Stickers are the actual data inside a small envelope. A word sticker holds text like \"Alice\". They can be passed around between workers via the postal system."},
];

function AnalogCard() {
  const [active,setActive]=useState(null);
  const [flipped,setFlipped]=useState(false);
  const part=active?CARD_PARTS.find(p=>p.id===active):null;
  const tog=(id,e)=>{if(e)e.stopPropagation();setActive(p=>p===id?null:id);};
  const isA=id=>active===id;
  const col=id=>CARD_PARTS.find(p=>p.id===id)?.color||"#888";
  const ring=id=>isA(id)?`0 0 0 2px ${col(id)}, 0 0 12px ${col(id)}44`:"none";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        {/* LEFT: Paper card */}
        <div style={{flex:"1 1 220px"}}>
          <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontFamily:T.ui}}>✦ The Programme Package</div>
          <div onClick={e=>tog("card",e)} style={{background:T.paper,backgroundImage:"repeating-linear-gradient(transparent,transparent 23px,#e2d9c4 23px,#e2d9c4 24px)",borderRadius:4,border:`2px solid ${isA("card")?"#d97706":"#c9b99a"}`,boxShadow:isA("card")?ring("card"):"2px 4px 14px #00000044",padding:"0 0 12px",cursor:"pointer",transition:"box-shadow 0.2s,border-color 0.2s",position:"relative"}}>
            <div style={{height:26,background:T.red,borderRadius:"2px 2px 0 0",display:"flex",alignItems:"center",padding:"0 10px",marginBottom:12}}>
              <span style={{color:"#fff",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",fontFamily:T.ui}}>GO PROGRAMME PACKAGE</span>
              <span style={{color:"#ffaaaa",fontSize:9,marginLeft:"auto",fontFamily:T.ui}}>rev 1.0</span>
            </div>
            <div style={{padding:"0 12px"}}>
              {/* Package name */}
              <div onClick={e=>tog("pname",e)} style={{marginBottom:10,cursor:"pointer",boxShadow:ring("pname"),borderRadius:3,padding:"2px 4px",transition:"box-shadow 0.2s"}}>
                <div style={{fontSize:9,color:T.inkLight,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui}}>Package Name:</div>
                <div style={{borderBottom:`1.5px solid ${T.inkLight}`,paddingBottom:1,marginTop:1}}>
                  <span style={{fontFamily:T.hw,fontSize:19,color:T.ink,fontWeight:700}}>main</span>
                </div>
              </div>
              {/* Required Attachments */}
              <div onClick={e=>tog("attach",e)} style={{marginBottom:12,cursor:"pointer",background:isA("attach")?"#dbeafe44":"transparent",boxShadow:ring("attach"),borderRadius:3,padding:"4px 5px",border:`1px dashed ${isA("attach")?"#3b82f6":T.line}`,transition:"all 0.2s"}}>
                <div style={{fontSize:9,color:T.inkLight,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui,marginBottom:3}}>📎 Required Attachments:</div>
                <div style={{display:"flex",alignItems:"center",gap:5,paddingLeft:3}}>
                  <span style={{color:T.inkMid,fontSize:11}}>☑</span>
                  <span style={{fontFamily:T.hw,fontSize:16,color:T.ink}}>fmt <span style={{fontSize:12,color:T.inkLight}}>(formatter / printer)</span></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,paddingLeft:3}}>
                  <span style={{color:"#ccc",fontSize:11}}>☐</span>
                  <span style={{fontFamily:T.hw,fontSize:14,color:T.inkFade,fontStyle:"italic"}}>add more…</span>
                </div>
              </div>
              {/* Envelope */}
              <div onClick={e=>tog("envelope",e)} style={{background:"#fff9e6",border:`1.5px solid ${isA("envelope")?col("envelope"):"#d4b896"}`,boxShadow:ring("envelope"),borderRadius:4,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}>
                <div style={{width:"100%",height:30,background:"#f0e4c8",borderBottom:"1px solid #d4b896",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"120px solid transparent",borderRight:"120px solid transparent",borderTop:"30px solid #e2d2b0"}}/>
                  <div style={{position:"absolute",top:5,left:"50%",transform:"translateX(-50%)",fontSize:9,color:T.inkMid,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui,whiteSpace:"nowrap"}}>✉ ENVELOPE: main</div>
                </div>
                <div style={{display:"flex",borderBottom:`1px solid ${T.lineAlt}`}}>
                  {["FRONT","BACK"].map((side,si)=>(
                    <button key={side} onClick={e=>{e.stopPropagation();setFlipped(si===1);}} style={{flex:1,padding:"3px 0",border:"none",cursor:"pointer",background:((si===0&&!flipped)||(si===1&&flipped))?"#ffefc4":"#f0e4c8",fontSize:9,fontWeight:700,color:T.inkMid,letterSpacing:0.5,fontFamily:T.ui,borderRight:si===0?`1px solid ${T.lineAlt}`:"none"}}>{side}</button>
                  ))}
                </div>
                {!flipped?(
                  <div style={{padding:"8px 9px",backgroundImage:`repeating-linear-gradient(transparent,transparent 19px,${T.lineAlt} 19px,${T.lineAlt} 20px)`}}>
                    <div onClick={e=>tog("req",e)} style={{marginBottom:6,cursor:"pointer",background:isA("req")?"#d1fae533":"transparent",boxShadow:ring("req"),borderRadius:3,padding:"3px 4px",transition:"all 0.2s"}}>
                      <div style={{fontSize:9,color:T.inkLight,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui}}>Required Information:</div>
                      <div style={{borderBottom:`1px solid ${T.line}`,minHeight:20,paddingBottom:1,marginTop:1}}>
                        <span style={{fontFamily:T.hw,fontSize:15,color:"#bbb",fontStyle:"italic"}}>— none —</span>
                        <span style={{fontFamily:T.mono,fontSize:9,color:"#34d399",marginLeft:8}}>→ ()</span>
                      </div>
                    </div>
                    <div onClick={e=>tog("body",e)} style={{cursor:"pointer",background:isA("body")?"#ccfbf122":"transparent",boxShadow:ring("body"),borderRadius:3,padding:"3px 4px",transition:"all 0.2s"}}>
                      <div style={{fontSize:9,color:T.inkLight,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui,marginBottom:2}}>Instructions:</div>
                      <div style={{fontFamily:T.hw,fontSize:15,color:T.ink,lineHeight:1.7}}>
                        <span onClick={e=>tog("smenv",e)} style={{cursor:"pointer",boxShadow:ring("smenv"),borderRadius:2,padding:"0 2px",background:isA("smenv")?"#1e3a5f55":"transparent",transition:"all 0.2s"}}>Create blue envelope: <b>name</b></span>
                        <br/>
                        <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
                          Put sticker&nbsp;
                          <span onClick={e=>tog("sticker",e)} style={{cursor:"pointer",background:isA("sticker")?"#1e3a5f":"#1e2d1e",border:`1px solid ${isA("sticker")?"#86efac":"#2d5a2d"}`,borderRadius:3,padding:"0 6px",fontFamily:T.hw,fontSize:14,color:"#86efac",fontWeight:700,boxShadow:ring("sticker"),transition:"all 0.2s"}}>🔤 "Alice"</span>
                          &nbsp;inside
                        </span>
                        <br/>Post to fmt.Println
                      </div>
                    </div>
                  </div>
                ):(
                  <div style={{padding:"8px 9px",backgroundImage:`repeating-linear-gradient(transparent,transparent 19px,${T.lineAlt} 19px,${T.lineAlt} 20px)`}}>
                    <div onClick={e=>tog("exp",e)} style={{cursor:"pointer",background:isA("exp")?"#ffedd533":"transparent",boxShadow:ring("exp"),borderRadius:3,padding:"3px 4px",transition:"all 0.2s"}}>
                      <div style={{fontSize:9,color:T.inkLight,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui}}>Expected Information:</div>
                      <div style={{borderBottom:`1px solid ${T.line}`,minHeight:20,paddingBottom:1,marginTop:1}}>
                        <span style={{fontFamily:T.hw,fontSize:15,color:"#bbb",fontStyle:"italic"}}>— none —</span>
                        <span style={{fontFamily:T.mono,fontSize:9,color:"#fb923c",marginLeft:8}}>→ no return</span>
                      </div>
                      <div style={{fontFamily:T.hw,fontSize:13,color:T.inkFade,fontStyle:"italic",marginTop:3}}>other envelopes can return data here…</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{position:"absolute",bottom:0,right:0,width:0,height:0,borderStyle:"solid",borderWidth:"0 0 16px 16px",borderColor:`transparent transparent #c9b99a transparent`}}/>
          </div>
          <div style={{fontSize:10,color:"#334155",textAlign:"center",marginTop:6,fontFamily:T.ui}}>👆 Tap any section · flip envelope front/back</div>
        </div>
        {/* RIGHT: Code */}
        <div style={{flex:"1 1 210px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",marginBottom:2,fontFamily:T.ui}}>💻 Go Code</div>
          <CodePanel highlightLines={part?part.lines:[]} annotate={part?Object.fromEntries(part.lines.map(l=>[l,{label:part.label,color:part.color}])):{}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:2}}>
            {CARD_PARTS.map(p=>(
              <div key={p.id} onClick={()=>setActive(a=>a===p.id?null:p.id)} style={{cursor:"pointer",border:`1.5px solid ${active===p.id?p.color:p.color+"44"}`,borderRadius:20,padding:"2px 9px",background:active===p.id?p.color+"22":"transparent",color:active===p.id?p.color:p.color+"88",fontSize:10,fontWeight:700,transition:"all 0.2s",fontFamily:T.ui}}>{p.sub}</div>
            ))}
          </div>
        </div>
      </div>
      {/* Explanation */}
      <div style={{minHeight:58,background:part?part.color+"0d":"#0a0a1a",border:`1px solid ${part?part.color+"44":"#1e1e3a"}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:"#cbd5e1",lineHeight:1.7,transition:"all 0.3s",fontFamily:T.ui}}>
        {part?(<><span style={{color:part.color,fontWeight:700}}>{part.label}</span><span style={{color:"#475569"}}> → </span><code style={{color:part.color,fontSize:11,background:part.color+"18",padding:"1px 6px",borderRadius:4}}>{part.sub}</code><br/><br/>{part.desc}</>):(<span style={{color:"#334155"}}>👆 Tap any section of the card or a code pill to see the connection</span>)}
      </div>
    </div>
  );
}

// ─── PART 2: Office animation ─────────────────────────────────────────────────
// Layout: left wall (5%) | MAIN dept (5–52%) | dividing wall (52–57%) | FMT dept (57–100%)
// Postal slot is a horizontal window in the dividing wall at ~45% height

const PA = { // positions in % x,y within the office
  // MAIN side
  DOOR:      {x:11, y:28},
  SHELF:     {x:17, y:22},
  MAIN_DESK: {x:26, y:52},
  WALL_SLOT: {x:48, y:47},  // near dividing wall to post
  // FMT side
  FMT_DESK:  {x:74, y:47},
  FMT_SLOT:  {x:62, y:47},  // near dividing wall to receive
};

// postalDir: null | "to_fmt" | "to_main"
// completeBtn: "hidden" | "locked" | "ready" | "pressed"
const SCENES = [
  {
    id:"idle",
    narr:"The Go appliance is switched on but idle.\n\nInside is a two-room office — divided by a wall.\n\nLeft room: the MAIN department. Alice works here.\nRight room: the FMT department. Bob works here.\n\nIn the dividing wall is a postal slot — workers pass envelopes through it to communicate.\n\nAt the bottom: the display panel (the terminal).",
    workers:[{id:"alice",emoji:"👩‍💻",label:"",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:""},{id:"bob",emoji:"👨‍💻",label:"",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:""}],
    pkg:false,fmtBox:false,envs:[],
    postalDir:null,postalLabel:"",
    display:[],displayResult:false,
    completeBtn:"locked",highlight:[],
  },
  {
    id:"package_in",
    narr:"The programme package slides in through the slot on the left wall.\n\nAlice walks over and picks it up. She reads the label:\n\n📋 PACKAGE NAME: main\n\nShe knows — this is the entry package. Time to start.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"reading label",x:PA.DOOR.x,y:PA.DOOR.y,action:"read"},{id:"bob",emoji:"👨‍💻",label:"",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:""}],
    pkg:true,fmtBox:false,envs:[],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[0],
  },
  {
    id:"check_attach",
    narr:"Alice unfolds the Required Attachments checklist from the package.\n\nShe sees: ☑ fmt\n\nShe walks to the attachments shelf and picks up the fmt address label — she'll need it later when writing an envelope to the FMT department.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"collecting fmt label",x:PA.SHELF.x,y:PA.SHELF.y,action:"collect"},{id:"bob",emoji:"👨‍💻",label:"",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:""}],
    pkg:true,fmtBox:true,envs:[],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[2],
  },
  {
    id:"open_main",
    narr:"Alice brings the main envelope to the worktable and opens it.\n\nShe checks the front first:\nRequired Information — none.\n\nGood. She can open it immediately.\n\nShe reads the first instruction inside.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"opening envelope",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:"open"},{id:"bob",emoji:"👨‍💻",label:"",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:""}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true}],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[4],
  },
  {
    id:"create_name",
    narr:"First instruction:\n\n\"Create a small blue envelope. Name it: name. Type: string (word sticker). Tuck the sticker 'Alice' inside.\"\n\nAlice grabs a blue envelope, writes the label, slides in the sticker, sets it on the table.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"creating envelope",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:"create"},{id:"bob",emoji:"👨‍💻",label:"",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:""}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true},{id:"name",x:44,y:60,type:"string",label:"name",open:false,value:'"Alice"',isNew:true}],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[5],
  },
  {
    id:"post_println",
    narr:"Second instruction:\n\n\"Write a Println envelope addressed to fmt.Println. Attach the name envelope to the front as Required Information. Post it.\"\n\nAlice seals the envelope, walks to the postal slot in the dividing wall, and drops it through.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"posting to fmt →",x:PA.WALL_SLOT.x,y:PA.WALL_SLOT.y,action:"post"},{id:"bob",emoji:"👨‍💻",label:"incoming...",x:PA.FMT_SLOT.x,y:PA.FMT_SLOT.y,action:"wait"}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true}],
    postalDir:"to_fmt",postalLabel:"TO: fmt.Println  |  REQ: name envelope",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[6],
  },
  {
    id:"alice_waiting",
    narr:"Alice has posted the envelope and now must wait.\n\nShe walks back to her desk. The main envelope instructions are all sent — but she cannot mark the work complete until she hears back from the FMT department.\n\nThe red button on her desk is locked. 🔴",
    workers:[{id:"alice",emoji:"👩‍💻",label:"⏳ waiting...",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:"wait"},{id:"bob",emoji:"👨‍💻",label:"processing...",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:"read"}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true},{id:"name",x:76,y:44,type:"string",label:"name",open:true,value:'"Alice"'}],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go"],displayResult:false,
    completeBtn:"locked",highlight:[6],
  },
  {
    id:"fmt_sends",
    narr:"Bob opens the Println envelope in the FMT department.\n\nHe finds the Required Information on the front: the name envelope. He opens it — the sticker reads: 'Alice'.\n\nHe sends 'Alice' to the display panel, then posts a DONE reply back through the wall slot.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"⏳ waiting...",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:"wait"},{id:"bob",emoji:"👨‍💻",label:"sending reply →",x:PA.FMT_SLOT.x,y:PA.FMT_SLOT.y,action:"post"}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true},{id:"name",x:70,y:55,type:"string",label:"name",open:true,value:'"Alice"'}],
    postalDir:"to_main",postalLabel:"REPLY: done ✓",
    display:["$ go run main.go","Alice"],displayResult:true,
    completeBtn:"locked",highlight:[6],
  },
  {
    id:"complete",
    narr:"The DONE reply arrives at Alice's desk.\n\nAll instructions in the main envelope have been processed. The postal system has confirmed everything is finished.\n\nAlice's button turns green. She presses it. ✅\n\nProgramme complete.",
    workers:[{id:"alice",emoji:"👩‍💻",label:"✅ complete!",x:PA.MAIN_DESK.x,y:PA.MAIN_DESK.y,action:"done"},{id:"bob",emoji:"👨‍💻",label:"done ✓",x:PA.FMT_DESK.x,y:PA.FMT_DESK.y,action:"done"}],
    pkg:true,fmtBox:true,envs:[{id:"main",x:32,y:46,type:"func",label:"main",open:true}],
    postalDir:null,postalLabel:"",
    display:["$ go run main.go","Alice"],displayResult:true,
    completeBtn:"pressed",highlight:[],
  },
];

// ── Worker chip ──
function Worker({w}) {
  const aC = {read:T.amber,create:T.blue,post:T.green,collect:T.green,open:T.pink,wait:"#94a3b8",done:T.green}[w.action]||"#475569";
  return (
    <div style={{position:"absolute",left:`${w.x}%`,top:`${w.y}%`,transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:1,transition:"left 0.8s cubic-bezier(.4,0,.2,1),top 0.8s cubic-bezier(.4,0,.2,1)",zIndex:10}}>
      <div style={{fontSize:20,lineHeight:1,filter:w.action==="done"?`drop-shadow(0 0 5px ${T.green})`:"none"}}>{w.emoji}</div>
      {w.label&&<div style={{fontSize:8,color:aC,fontFamily:T.ui,fontWeight:700,whiteSpace:"nowrap",background:aC+"22",border:`1px solid ${aC}44`,borderRadius:8,padding:"1px 5px",maxWidth:84,textAlign:"center"}}>{w.label}</div>}
    </div>
  );
}

// ── Envelope chip ──
function EnvChip({env}) {
  const cols={func:T.pink,string:T.blue};
  const c=cols[env.type]||"#888";
  const isFunc = env.type==="func";
  const w = isFunc ? 78 : 50;
  return (
    <div style={{position:"absolute",left:`${env.x}%`,top:`${env.y}%`,transform:"translate(-50%,-50%)",transition:"left 0.6s ease,top 0.6s ease",animation:env.isNew?"popIn 0.4s cubic-bezier(.34,1.56,.64,1) both":"fadeIn 0.3s ease-out both",zIndex:isFunc?9:8}}>
      <div style={{width:w,background:isFunc?"#2a0f22":"#0f1e33",border:`${isFunc?2:1.5}px solid ${c}`,borderRadius:3,boxShadow:`0 ${isFunc?4:2}px ${isFunc?14:8}px ${c}${isFunc?"66":"44"}`,overflow:"hidden"}}>
        {/* Flap */}
        <div style={{height:isFunc?20:12,background:env.open?c+"55":c+"22",borderBottom:`1px solid ${c}33`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:`${w/2}px solid transparent`,borderRight:`${w/2}px solid transparent`,borderTop:`${isFunc?20:12}px solid ${c}${env.open?"00":"33"}`}}/>
          {env.open&&<div style={{fontSize:isFunc?8:7,color:c,fontFamily:T.ui,textAlign:"center",paddingTop:isFunc?4:1,fontWeight:700}}>OPEN</div>}
        </div>
        {/* Type badge */}
        <div style={{background:c,padding:isFunc?"2px 6px":"1px 4px"}}><span style={{fontSize:isFunc?9:7,color:"#fff",fontWeight:700,fontFamily:T.ui}}>{env.type}</span></div>
        {/* Body */}
        <div style={{padding:isFunc?"4px 6px 6px":"2px 4px 4px",background:"#080c14"}}>
          <div style={{fontSize:isFunc?8:7,color:c+"99",fontFamily:T.ui,textTransform:"uppercase",letterSpacing:0.3}}>name:</div>
          <div style={{fontFamily:T.hw,fontSize:isFunc?16:12,color:"#e2e8f0",fontWeight:700,lineHeight:1}}>{env.label}</div>
          {env.open&&env.value&&<div style={{marginTop:3,background:c+"22",borderRadius:2,padding:isFunc?"2px 5px":"1px 3px",display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:isFunc?10:8}}>🔤</span><span style={{fontFamily:T.hw,fontSize:isFunc?14:11,color:c,fontWeight:700}}>{env.value}</span></div>}
        </div>
      </div>
    </div>
  );
}

// ── Office Room ──
function OfficeRoom({sc}) {
  const wallX = 54; // dividing wall left edge %
  const wallW = 5;  // dividing wall width %
  const slotY = 38; // postal slot top % within wall
  const slotH = 14; // postal slot height %

  const postalActive = sc.postalDir !== null;
  const toFmt  = sc.postalDir === "to_fmt";
  const toMain = sc.postalDir === "to_main";

  return (
    <div style={{position:"relative",width:"100%",paddingBottom:"65%",background:"linear-gradient(180deg,#0b1220 0%,#090e1a 100%)",border:`1px solid ${T.steelLt}`,borderRadius:10,overflow:"hidden",boxShadow:"inset 0 2px 20px #00000077"}}>

      {/* ── Ceiling light strips ── */}
      <div style={{position:"absolute",top:0,left:"5%",width:`${wallX-6}%`,height:3,background:`linear-gradient(90deg,transparent,${T.amber}33,transparent)`,boxShadow:`0 2px 12px ${T.amber}22`}}/>
      <div style={{position:"absolute",top:0,left:`${wallX+wallW+1}%`,right:"1%",height:3,background:`linear-gradient(90deg,transparent,${T.blue}33,transparent)`,boxShadow:`0 2px 12px ${T.blue}22`}}/>

      {/* ── Left outer wall (package slot) ── */}
      <div style={{position:"absolute",top:0,left:0,bottom:0,width:"5%",background:"#0c1420",borderRight:`1px solid ${T.steelLt}44`}}>
        <div style={{position:"absolute",top:"10%",left:"8%",right:"8%",height:"25%",background:sc.pkg?"#0d1e0d":"#0a0f14",border:`1px solid ${sc.pkg?T.green+"66":T.steelLt}`,borderRadius:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,transition:"all 0.5s",boxShadow:sc.pkg?`0 0 8px ${T.green}33`:"none"}}>
          {sc.pkg?(
            <div style={{width:"72%",background:T.paper,border:"1px solid #c9b99a",borderRadius:2,padding:"2px",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:"100%",height:5,background:T.red,borderRadius:"1px 1px 0 0",marginBottom:1}}/>
              <span style={{fontFamily:T.hw,fontSize:7,color:T.ink,fontWeight:700}}>main</span>
            </div>
          ):(
            <span style={{fontSize:7,color:"#1a2d40",fontFamily:T.ui,writingMode:"vertical-rl",transform:"rotate(180deg)",letterSpacing:1}}>slot</span>
          )}
        </div>
        <div style={{position:"absolute",bottom:"16%",left:0,right:0,fontSize:6,color:"#1a2d40",fontFamily:T.ui,textAlign:"center",textTransform:"uppercase",letterSpacing:0.3,lineHeight:1.4}}>pkg<br/>in</div>
      </div>

      {/* ── MAIN dept floor ── */}
      <div style={{position:"absolute",bottom:"14%",left:"5%",width:`${wallX-6}%`,height:2,background:T.steelLt+"66",borderRadius:1}}/>

      {/* ── MAIN dept label ── */}
      <div style={{position:"absolute",top:"3%",left:"7%",fontSize:8,color:"#1a3d30",fontFamily:T.ui,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>MAIN dept.</div>

      {/* fmt shelf badge (MAIN side) */}
      {sc.fmtBox&&<div style={{position:"absolute",top:"10%",left:"7%",background:"#0f1e33",border:`1px solid ${T.blue}66`,borderRadius:3,padding:"2px 6px",fontSize:8,color:T.blue,fontWeight:700,fontFamily:T.ui,animation:"fadeIn 0.4s ease-out"}}>📦 fmt ✓</div>}

      {/* MAIN worktable surface */}
      <div style={{position:"absolute",left:"14%",width:`${wallX-22}%`,top:"58%",height:3,background:T.steelLt,borderRadius:2,boxShadow:"0 2px 6px #00000055"}}/>
      <div style={{position:"absolute",left:"18%",width:`${wallX-26}%`,top:"44%",height:"14%",background:"linear-gradient(180deg,#121c2e,#0e1522)",border:`1px solid ${T.steelLt}44`,borderRadius:"3px 3px 0 0",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:7,color:"#1a2d40",fontFamily:T.ui,textTransform:"uppercase",letterSpacing:0.5}}>worktable</span>
      </div>

      {/* ── COMPLETE button on Alice's desk — always visible, blinks red until pressed ── */}
      <div style={{
        position:"absolute",left:"12%",top:"67%",
        width:34,height:34,borderRadius:"50%",
        background: sc.completeBtn==="pressed"
          ? `radial-gradient(circle,${T.green},#008866)`
          : `radial-gradient(circle,#7f1d1d,#3a0808)`,
        border:`2px solid ${sc.completeBtn==="pressed"?T.green:"#991b1b"}`,
        boxShadow: sc.completeBtn==="pressed"
          ? `0 0 18px ${T.green},0 0 6px ${T.green}`
          : "0 0 6px #99000066",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"background 0.5s,border-color 0.5s,box-shadow 0.5s",
        zIndex:12,
        animation: sc.completeBtn==="pressed" ? "popIn2 0.4s ease-out" : "blinkRed 1s step-end infinite",
      }}>
        <span style={{fontSize:sc.completeBtn==="pressed"?15:13}}>
          {sc.completeBtn==="pressed"?"✅":"🔴"}
        </span>
      </div>
      <div style={{position:"absolute",left:"6%",top:"80%",fontSize:7,color:sc.completeBtn==="pressed"?T.green:"#7f1d1d",fontFamily:T.ui,fontWeight:700,textTransform:"uppercase",letterSpacing:0.3,textAlign:"center",width:"20%",lineHeight:1.3,transition:"color 0.5s"}}>
        {sc.completeBtn==="pressed"?"done!":"locked"}
      </div>

      {/* ── Dividing WALL ── */}
      <div style={{position:"absolute",top:0,bottom:0,left:`${wallX}%`,width:`${wallW}%`,background:"linear-gradient(180deg,#0c1520,#0a1018)",borderLeft:`1px solid ${T.steelLt}`,borderRight:`1px solid ${T.steelLt}`}}>
        {/* Wall label */}
        <div style={{position:"absolute",top:"4%",left:0,right:0,textAlign:"center",fontSize:6,color:"#1a2d40",fontFamily:T.ui,textTransform:"uppercase",letterSpacing:0.5,lineHeight:1.4}}>DIV<br/>WALL</div>

        {/* Postal slot window */}
        <div style={{
          position:"absolute",top:`${slotY}%`,left:"10%",right:"10%",height:`${slotH}%`,
          background: postalActive ? "#0d2a18" : "#080d14",
          border:`1px solid ${postalActive?T.green+"99":T.steelLt}`,
          borderRadius:3,
          boxShadow: postalActive ? `0 0 10px ${T.green}44` : "none",
          overflow:"hidden",
          transition:"all 0.3s",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        }}>
          {/* Envelope travelling through */}
          {postalActive&&(
            <div style={{
              position:"absolute",
              width:"70%",height:10,
              background:T.paper,border:"1px solid #c9b99a",borderRadius:2,
              display:"flex",alignItems:"center",justifyContent:"center",
              animation: toFmt ? "slideRight 0.6s ease-in-out infinite" : "slideLeft 0.6s ease-in-out infinite",
            }}>
              <span style={{fontSize:6,color:T.inkMid}}>✉</span>
            </div>
          )}
          {!postalActive&&<span style={{fontSize:8,color:"#1a2d40"}}>📪</span>}
        </div>

        {/* Direction arrow */}
        {postalActive&&(
          <div style={{position:"absolute",top:`${slotY+slotH+2}%`,left:0,right:0,textAlign:"center",fontSize:10,color:T.green,animation:"fadeIn 0.2s",lineHeight:1}}>
            {toFmt?"→":"←"}
          </div>
        )}

        {/* Postal label floating */}
        {postalActive&&sc.postalLabel&&(
          <div style={{position:"absolute",top:`${slotY-18}%`,left:`${-180}%`,width:220,background:"#0d2a18",border:`1px solid ${T.green}55`,borderRadius:3,padding:"2px 6px",fontSize:7,color:T.green,fontFamily:T.mono,animation:"fadeIn 0.3s ease-out",lineHeight:1.4,whiteSpace:"nowrap",zIndex:20}}>
            {sc.postalLabel}
          </div>
        )}
      </div>

      {/* ── FMT dept ── */}
      <div style={{position:"absolute",bottom:"14%",left:`${wallX+wallW}%`,right:0,height:2,background:T.steelLt+"66",borderRadius:1}}/>
      <div style={{position:"absolute",top:"3%",left:`${wallX+wallW+2}%`,fontSize:8,color:"#1a2d40",fontFamily:T.ui,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>FMT dept.</div>

      {/* FMT worktable */}
      <div style={{position:"absolute",left:`${wallX+wallW+4}%`,right:"4%",top:"58%",height:3,background:T.steelLt,borderRadius:2,boxShadow:"0 2px 6px #00000055"}}/>
      <div style={{position:"absolute",left:`${wallX+wallW+8}%`,right:"8%",top:"44%",height:"14%",background:"linear-gradient(180deg,#0e1c2e,#0a1320)",border:`1px solid ${T.blue}33`,borderRadius:"3px 3px 0 0",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:7,color:"#1a2d40",fontFamily:T.ui,textTransform:"uppercase",letterSpacing:0.5}}>fmt table</span>
      </div>

      {/* ── Display panel (full width bottom) ── */}
      <div style={{
        position:"absolute",bottom:0,left:"5%",right:0,height:"14%",
        background:"#020d04",
        borderTop:`1px solid ${sc.displayResult?"#1a5c2a":"#0d1a10"}`,
        display:"flex",alignItems:"center",padding:"0 10px",gap:8,
        transition:"all 0.5s",
        boxShadow:sc.displayResult?"inset 0 0 20px #00d4aa0a":"none",
      }}>
        <span style={{fontSize:7,color:"#1a3d20",fontFamily:T.ui,textTransform:"uppercase",letterSpacing:0.8,flexShrink:0,borderRight:"1px solid #0d2a10",paddingRight:6}}>display panel</span>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
          {sc.display.map((l,i)=>(
            <span key={i} style={{fontFamily:T.mono,fontSize:l==="Alice"?13:8,color:l==="Alice"?"#00ff88":"#1a5c2a",fontWeight:l==="Alice"?700:400,textShadow:l==="Alice"?"0 0 12px #00ff88":"none",animation:i===sc.display.length-1?"fadeIn 0.4s ease-out":"none",whiteSpace:"nowrap"}}>{l}{l!=="Alice"&&<span style={{color:"#0d2a10",marginLeft:3}}>|</span>}</span>
          ))}
          <span style={{fontFamily:T.mono,fontSize:9,color:"#1a3d20",animation:"blink 1s step-end infinite"}}>█</span>
        </div>
      </div>

      {/* ── Envelopes ── */}
      {sc.envs.map(e=><EnvChip key={e.id} env={e}/>)}

      {/* ── Workers ── */}
      {sc.workers.map(w=><Worker key={w.id} w={w}/>)}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GoLearnApp() {
  const [tab,setTab]         = useState(0);
  const [scene,setScene]     = useState(0);
  const [playing,setPlaying] = useState(false);
  const sc = SCENES[scene];

  useEffect(()=>{
    if(!playing) return;
    if(scene>=SCENES.length-1){setPlaying(false);return;}
    const t = setTimeout(()=>setScene(s=>s+1), 3000);
    return ()=>clearTimeout(t);
  },[playing,scene]);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#07071a 0%,#0d0d2b 100%)",fontFamily:T.ui,color:"#e2e8f0",display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 14px 48px"}}>
      <style>{FONTS}{`
        @keyframes fadeIn    {from{opacity:0}to{opacity:1}}
        @keyframes popIn     {from{transform:translate(-50%,-50%) scale(0.2);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
        @keyframes popIn2    {from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes slideRight{0%{left:-20%}100%{left:110%}}
        @keyframes slideLeft {0%{left:110%}100%{left:-20%}}
        @keyframes blink     {0%,100%{opacity:1}50%{opacity:0}}
        @keyframes blinkRed  {0%,49%{opacity:1;box-shadow:0 0 10px #ef444466}50%,100%{opacity:0.25;box-shadow:none}}
        @keyframes pulse     {0%,100%{opacity:1}50%{opacity:0.25}}
      `}</style>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{display:"inline-block",background:"linear-gradient(135deg,#00d4aa22,#60a5fa22)",border:"1px solid #00d4aa44",borderRadius:30,padding:"5px 18px",fontSize:11,color:T.green,letterSpacing:2,fontWeight:700,marginBottom:10}}>LEARN GO</div>
        <h1 style={{fontSize:"clamp(20px,4vw,30px)",fontWeight:800,background:"linear-gradient(90deg,#00d4aa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0,lineHeight:1.2}}>The Go Appliance</h1>
        <p style={{color:"#64748b",fontSize:13,marginTop:5}}>Understand the analogy — then watch the office run</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,background:"#10102a",border:"1px solid #1e1e3a",borderRadius:30,overflow:"hidden"}}>
        {["📋  The Package Card","🏭  Inside the Appliance"].map((label,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{padding:"9px 20px",border:"none",cursor:"pointer",background:tab===i?"linear-gradient(90deg,#00d4aa22,#60a5fa22)":"transparent",color:tab===i?T.green:"#475569",fontWeight:tab===i?700:400,fontSize:13,fontFamily:T.ui,borderRight:i===0?"1px solid #1e1e3a":"none",transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      <div style={{width:"100%",maxWidth:820}}>

        {/* TAB 0: Card */}
        {tab===0&&(
          <div style={{background:"#10102a",border:"1px solid #1e1e3a",borderRadius:16,padding:"18px 20px"}}>
            <div style={{fontSize:11,color:"#475569",marginBottom:14,fontFamily:T.ui}}>Tap any section of the card or the code pills to see how each part maps to Go syntax.</div>
            <AnalogCard/>
          </div>
        )}

        {/* TAB 1: Office */}
        {tab===1&&(
          <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-start"}}>
            {/* Left: office room */}
            <div style={{flex:"0 0 360px",minWidth:280,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",fontFamily:T.ui}}>🏭 Inside the Appliance</div>
              <OfficeRoom sc={sc}/>
              {/* Legend */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[{dot:T.amber,label:"Package slot"},{dot:T.green,label:"Postal slot (wall)"},{dot:T.blue,label:"fmt dept."},{dot:"#00ff88",label:"Display panel"},{dot:T.red,label:"Complete btn (locked)"},{dot:T.green,label:"Complete btn (ready)"}].map(l=>(
                  <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:l.dot,boxShadow:`0 0 4px ${l.dot}`}}/>
                    <span style={{fontSize:9,color:"#475569",fontFamily:T.ui}}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: narration */}
            <div style={{flex:"1 1 260px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:"#10102a",border:"1px solid #1e1e3a",borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #1e1e3a",background:"linear-gradient(90deg,#0d0d20,#10102a)",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 7px ${T.green}`}}/>
                  <div>
                    <div style={{fontSize:10,color:T.green,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Scene {scene+1} of {SCENES.length}</div>
                    <div style={{fontSize:14,fontWeight:700,marginTop:1}}>{sc.id.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</div>
                  </div>
                </div>
                <div style={{padding:"12px 16px",fontSize:12,lineHeight:1.85,color:"#cbd5e1",whiteSpace:"pre-line",borderLeft:"3px solid #f59e0b",background:"#0d0d20",minHeight:110}}>
                  {sc.narr}
                </div>
              </div>

              {/* Related code */}
              {sc.highlight.length>0&&(
                <div style={{background:"#10102a",border:"1px solid #1e1e3a",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",marginBottom:8,fontFamily:T.ui}}>Related code</div>
                  <CodePanel highlightLines={sc.highlight}/>
                </div>
              )}

              {/* Scene dots */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {SCENES.map((_,i)=>(
                  <button key={i} onClick={()=>{setScene(i);setPlaying(false);}} style={{width:26,height:26,borderRadius:"50%",background:i===scene?T.green:i<scene?T.green+"33":"#1a1a2e",border:i===scene?`2px solid ${T.green}`:"2px solid #1e1e3a",color:i===scene?"#0a0a1a":i<scene?T.green:"#555",fontSize:9,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>{i+1}</button>
                ))}
              </div>

              {/* Controls */}
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button onClick={()=>setScene(Math.max(0,scene-1))} disabled={scene===0} style={{padding:"8px 16px",borderRadius:20,background:scene===0?"#1a1a2e":"#1e1e3a",border:"1px solid #333",color:scene===0?"#444":"#e2e8f0",cursor:scene===0?"not-allowed":"pointer",fontWeight:600,fontSize:12}}>← Back</button>
                <button onClick={()=>{setScene(0);setPlaying(true);}} style={{padding:"8px 16px",borderRadius:20,background:"linear-gradient(90deg,#c084fc,#f472b8)",border:"none",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12}}>▶ Auto-play</button>
                <button onClick={()=>setPlaying(false)} disabled={!playing} style={{padding:"8px 12px",borderRadius:20,background:playing?"#1e1e3a":"#1a1a2e",border:"1px solid #333",color:playing?"#e2e8f0":"#444",cursor:playing?"pointer":"not-allowed",fontWeight:600,fontSize:12}}>⏸</button>
                <button onClick={()=>setScene(Math.min(SCENES.length-1,scene+1))} disabled={scene===SCENES.length-1} style={{padding:"8px 16px",borderRadius:20,background:scene===SCENES.length-1?"#1a1a2e":"linear-gradient(90deg,#00d4aa,#0ea5e9)",border:"none",color:scene===SCENES.length-1?"#444":"#0a0a1a",cursor:scene===SCENES.length-1?"not-allowed":"pointer",fontWeight:700,fontSize:12}}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analogy map */}
      <div style={{marginTop:32,width:"100%",maxWidth:820}}>
        <div style={{fontSize:10,color:"#334155",textAlign:"center",marginBottom:10,letterSpacing:1,textTransform:"uppercase"}}>Analogy Map</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center"}}>
          {[
            {a:"Package card",      c:"package main",   col:"#c084fc"},
            {a:"Req. Attachments",  c:"import",         col:"#3b82f6"},
            {a:"Envelope",          c:"func",           col:"#f472b8"},
            {a:"Front (req. info)", c:"(params)",       col:"#34d399"},
            {a:"Back (exp. info)",  c:"return type",    col:"#fb923c"},
            {a:"Envelope body",     c:"{ }",            col:"#00d4aa"},
            {a:"Small envelope",    c:"variable",       col:"#3b82f6"},
            {a:"Sticker",           c:"value",          col:"#86efac"},
            {a:"Postal slot",       c:"func call",      col:"#34d399"},
            {a:"Dept. wall",        c:"scope boundary", col:T.steelLt},
            {a:"Display panel",     c:"terminal output",col:"#00ff88"},
            {a:"Complete button",   c:"return / end",   col:"#22c55e"},
          ].map(item=>(
            <div key={item.c} style={{background:"#10102a",border:`1px solid ${item.col}33`,borderRadius:8,padding:"5px 9px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:88}}>
              <span style={{fontSize:10,color:"#475569"}}>{item.a}</span>
              <span style={{fontSize:11,fontFamily:T.mono,color:item.col,fontWeight:700}}>{item.c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
