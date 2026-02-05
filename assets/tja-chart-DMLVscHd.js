import{f as he,t as ue,N as de,e as ae,J as U,L as z,j as fe,a as D,b as ge,g as me,I as se,h as pe,P as W,i as ve,r as Ce,k as re,l as be,m as Ee}from"./renderer-QIF23EvA.js";const we=l=>he(l.children);function K(l){return{bpm:l,scroll:1,measureRatio:1,gogoTime:!1,currentBarBuffer:"",currentBarBpmChanges:[],currentBarScrollChanges:[],currentBarGogoChanges:[]}}function Se(l){const e=l.split(/\r?\n/),t={},n={};let i=null,a=!1;const c={};for(let s of e)if(s=s.trim(),!!s){if(s.startsWith("COURSE:"))i=s.substring(7).trim(),t[i.toLowerCase()]=[],n[i.toLowerCase()]={},a=!1;else if(s.startsWith("#START"))a=!0;else if(s.startsWith("#END"))a=!1,i=null;else if(a&&i){const u=s.indexOf("//");u!==-1&&(s=s.substring(0,u).trim()),s&&t[i.toLowerCase()].push(s)}else if(!a){const u=s.split(":");if(u.length>=2){const o=u[0].trim().toUpperCase(),d=u.slice(1).join(":").trim();i?n[i.toLowerCase()][o]=d:c[o]=d}}}const h={};for(const s in t)if(Object.hasOwn(t,s)){const u=t[s],o={...c,...n[s]},d=o.TITLEJA||o.TITLE||"",y=o.SUBTITLEJA||o.SUBTITLE||"",w=parseFloat(o.BPM)||120,H=parseInt(o.LEVEL,10)||0,le=o.COURSE||s;let Y=[];const q=o.BALLOON;q&&(Y=q.split(/[,]+/).map(f=>parseInt(f.trim(),10)).filter(f=>!Number.isNaN(f)));const L=[],R=[],T=[],k=[],F=[],N=[],M=K(w),j=K(w),G=K(w),g=(f,v,C,r,I,ce=!1)=>{let Q=r.bpm,ee=r.scroll,J=r.gogoTime,te=!0;for(const B of f){if(B.startsWith("#")){const E=B.toUpperCase();if(E.startsWith("#BPMCHANGE")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(r.bpm=p,r.currentBarBpmChanges.push({index:r.currentBarBuffer.length,bpm:p}))}}else if(E.startsWith("#BPM:")){const m=parseFloat(B.substring(5));Number.isNaN(m)||(r.bpm=m,r.currentBarBpmChanges.push({index:r.currentBarBuffer.length,bpm:m}))}else if(E.startsWith("#SCROLL")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(r.scroll=p,r.currentBarScrollChanges.push({index:r.currentBarBuffer.length,scroll:p}))}}else if(E.startsWith("#MEASURE")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=m[1].split("/");if(p.length===2){const ne=parseFloat(p[0]),Z=parseFloat(p[1]);!Number.isNaN(ne)&&!Number.isNaN(Z)&&Z!==0&&(r.measureRatio=ne/Z)}}}else E.startsWith("#GOGOSTART")?(r.gogoTime=!0,r.currentBarGogoChanges.push({index:r.currentBarBuffer.length,isGogo:!0}),r.currentBarBuffer.length===0&&(J=!0)):E.startsWith("#GOGOEND")&&(r.gogoTime=!1,r.currentBarGogoChanges.push({index:r.currentBarBuffer.length,isGogo:!1}),r.currentBarBuffer.length===0&&(J=!1));continue}let P=B;for(;;){const E=P.indexOf(",");if(E===-1){r.currentBarBuffer+=P;break}else{const m=P.substring(0,E);r.currentBarBuffer+=m;const p=r.currentBarBuffer.trim();p.length===0?v.push([]):v.push(p.split("").map(ue)),C.push({bpm:Q,scroll:ee,measureRatio:r.measureRatio,gogoTime:J,isBranched:I,isBranchStart:I&&ce&&te,bpmChanges:r.currentBarBpmChanges.length>0?[...r.currentBarBpmChanges]:void 0,scrollChanges:r.currentBarScrollChanges.length>0?[...r.currentBarScrollChanges]:void 0,gogoChanges:r.currentBarGogoChanges.length>0?[...r.currentBarGogoChanges]:void 0}),te=!1,Q=r.bpm,ee=r.scroll,J=r.gogoTime,r.currentBarBpmChanges=[],r.currentBarScrollChanges=[],r.currentBarGogoChanges=[],r.currentBarBuffer="",P=P.substring(E+1)}}}};let b=[],A=[],S=[],_=[],O=!1,x="n",X=!1;for(const f of u){const v=f.toUpperCase().trim();if(v.startsWith("#BRANCHSTART")){if(X=!0,b.length>0&&(g(b,L,R,M,!1),g(b,T,k,j,!1),g(b,F,N,G,!1),b=[]),O){const C=A,r=S.length>0?S:C,I=_.length>0?_:r;g(C,L,R,M,!0,!0),g(r,T,k,j,!0,!0),g(I,F,N,G,!0,!0)}O=!0,x="n",A=[],S=[],_=[]}else if(v.startsWith("#BRANCHEND")){const C=A,r=S.length>0?S:C,I=_.length>0?_:r;g(C,L,R,M,!0,!0),g(r,T,k,j,!0,!0),g(I,F,N,G,!0,!0),O=!1,A=[],S=[],_=[]}else O&&v==="#N"?x="n":O&&v==="#E"?x="e":O&&v==="#M"?x="m":O?x==="n"?A.push(f):x==="e"?S.push(f):x==="m"&&_.push(f):b.push(f)}if(O){const f=A,v=S.length>0?S:f,C=_.length>0?_:v;g(f,L,R,M,!0,!0),g(v,T,k,j,!0,!0),g(C,F,N,G,!0,!0)}else b.length>0&&(g(b,L,R,M,!1),g(b,T,k,j,!1),g(b,F,N,G,!1));const $=(f,v,C)=>({bars:f,barParams:v,loop:_e(f),balloonCounts:Y,headers:o,title:d,subtitle:y,bpm:w,level:H,course:le,branchType:C}),V=$(L,R,"normal");X&&(V.branches={normal:V,expert:$(T,k,"expert"),master:$(F,N,"master")}),h[s]=V}return h}function _e(l){let e=-1;for(let n=0;n<l.length;n++)if(!ie(l[n])){e=n;break}if(e===-1)return;const t=l.length-e;for(let n=1;n<=t/2;n++){const i=l.slice(e,e+n);let a=0,c=e;for(;c+n<=l.length;){let h=!0;for(let s=0;s<n;s++)if(!ye(l[c+s],i[s])){h=!1;break}if(h)a++,c+=n;else break}if(a>=2){let h=!0;for(let s=c;s<l.length;s++)if(!ie(l[s])){h=!1;break}if(h)return{startBarIndex:e,period:n,iterations:a}}}}function ie(l){return l.length===0?!0:l.every(e=>e===de.None)}function ye(l,e){if(l.length!==e.length)return!1;for(let t=0;t<l.length;t++)if(l[t]!==e[t])return!1;return!0}class Oe{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let t;const n=await e.json();return Array.isArray(n)?t=n:typeof n=="object"&&n!==null&&"files"in n&&Array.isArray(n.files)?t=n.files:t=[],this.treeCache=t,t}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const n=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,i=await fetch(n);if(!i.ok)throw new Error(`Failed to fetch file: ${i.status} ${i.statusText}`);return await i.text()}catch(t){throw console.error("Error fetching file content:",t),new Error("Failed to load song content.")}}}const oe=`//TJADB Project
TITLE:Kakashi-Hime: Princess Scarecrow
TITLEJA:案山子姫 -Princess Scarecrow-
SUBTITLE:--Harunaba feat. Chihiro Ishiguro
SUBTITLEJA:はるなば feat. 石黒千尋
BPM:125
WAVE:Kakashi Hime Princess Scarecrow.ogg
OFFSET:-1.475
DEMOSTART:55.217

COURSE:Edit
LEVEL:10
BALLOON:
SCOREINIT:1010
SCOREDIFF:0

#START
220000000000200000200000000000200000200000200000,
220000000000200000200000000000200000200000200000,
500000000000000000000000000000000000000000000008,
#MEASURE 2/4
0,

#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 0.75
300010012010,
201122112211,
212010300011,
112103,
001121121120, //9

300010012010,
201122112211,
212010300011,
212113,

001120111120,
112000101010,
100010003000000000
#SCROLL 1
111100,
1020201020102222, //17

10201120,
11210120,
10201120,
1111201111201040,

01201120,
11210120,
2110211021102110,
2110100010001111, //25

11210121,
100000100000200000500000000008000000200000000000,
1010201022221020,
1010222210201020,

10201120,
11210120,
10201120,
1111201111201040,

01201120,
11210120,
2110211021102110,
2110211021111111, //37

10010010,
01030300,
1110001110001110,
0011103000300000,

1110201110201110,
2011102030003000,
1110111020201110,
2011101110111110, //45

10211212,
11212122,
1111102011111020,
21121120,

10220120,
202120202120,
3022203022203022,
2030222030222220, //53

#GOGOSTART
1010202220201010,
2022202010102220,
1110201110202030,
0010201020102210,

1010202220201010,
2022202010102220,
1110201110102030,
0022202022202020, //61

11211211,
2010102010222020,
11211211,
2010102010222020,

1110201000102010,
1110201110102010,
1022201022201020,
0010200011222220, //69

1010202220201010,
2022202010102220,
1110201110202030,
0010201020102210,

1010202220201010,
2022202010102220,
1110201110102030,
0022202022202020, //77

11211211,
2010102010222020,
1122201122201010,
22202222,
#GOGOEND

333
#SCROLL 0.9
033,
30
#SCROLL 0.82
3330, //83

#SCROLL 0.75
111110,
201110202000,
100022102011,
111012101110,

102120101211,
111210212210,
101022021021,
021012101111, //91

222220201211,
210211212210,
122121022121,
201212221012,
122212111010,
100000001000100010001000200200200200200200200000, //97

#SCROLL 1
3000201010102011,
1010201010221020,
10211121,
1010200010102022,

10330303,
01211122,
11212112,
1111201111202222, //105

1000201010102011,
1010201010221020,
10211121,
1010200010102022,

10330303,
01211122,
1110201011102010,
1111201111202000, //113

#GOGOSTART
1110201110201111,
1020111120002000,
1111201111201111,
1121111121112000,

33233233,
23323333,
#GOGOEND
#BARLINEOFF
0,

#BPMCHANGE 125
002222000000000000000000,
#BARLINEON
0,
0, //123
#END


COURSE:Oni
LEVEL:8
BALLOON:23,6
SCOREINIT:1580
SCOREDIFF:0

#START
3,
3,
7,
#MEASURE 2/4
8,

#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 0.75
100020112010,
201110201021,
101020300022,
211103,
000040040040, //9

100020112010,
201110201021,
101020300022,
211113,

000040001040,
040111,
114000,
#SCROLL 1
12212122, //17

10201120,
11210120,
11201121,
01401404,

00201120,
11210120,
10201125,
000000000000000000000000000000000000000008000000, //25

00300120,
1010200011102000,
11214012,
11401404,

00201120,
11210120,
10201121,
01401404,

00201120,
11210120,
10201125,
000000000000000000000008000000000000000000000000, //37

10021202,
12020220,
10121201,
21020220,

10211212,
21011020,
10221121,
12010120, //45

1000111000101000,
2000222000202000,
10102210,
21212120,

30221220,
322122,
3002003002003002,
0030020030000000, //53

#GOGOSTART
11120211,
12021120,
10130303,
04404040,

11120211,
12021120,
10130303,
04402020, //61

1110201000102010,
02102120,
1110201000102010,
02102120,

500000000000000000000000000008000000000000000000,
1111,
21012102,
0010200011101000, //69

11120211,
12021120,
10130303,
04404040,

11120211,
12021120,
10130303,
04402220, //77

10121101,
02102120,
20121010,
21212120,
#GOGOEND

500000000000000000000000000000000008000000000000,
#SCROLL 0.75
0, //83

112230,
001110002000,
100000111010,
202030000011,

102210,
001110000021,
200000121000,
200011111011, //91

112232,
201110020020,
302020111000,
102220002011,
102011111020,
201110000000, //97

#SCROLL 1
10210221,
02101122,
1110201000202010,
10201112,

10140303,
01010220,
12101210,
1000111000222000, //105

10210221,
02101122,
1110201000201010,
20101122,

10230404,
01010220,
12101210,
1110202000400000, //113

#GOGOSTART
1110201010201010,
02112120,
1110201010201010,
02112120,

33033033,
03303333,
#GOGOEND
#BARLINEOFF
0,

#BARLINEON
#BPMCHANGE 125
78,
0,
0, //123
#END
`;class xe{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,t){this.disconnect();const n=`http://${e}:${t}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=i=>{try{const a=JSON.parse(i.data);this.onMessageCallback&&this.onMessageCallback(a)}catch(a){i.data&&i.data.trim()!==""&&console.error("Failed to parse event data",a,i.data)}},this.eventSource.onerror=i=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(i){console.error("Connection error:",i),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,t){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=e||oe,i=t||"oni";if(this.onMessageCallback){const o={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:i}]};this.onMessageCallback(o)}const a=Se(n),c=a[i]||Object.values(a)[0];if(!c){console.error("Simulation failed: Could not parse chart");return}const h=[],s={};for(const o of c.bars)for(const d of o)ae.includes(d)&&(s[d]===void 0&&(s[d]=0),h.push({type:d,ordinal:s[d]}),s[d]++);let u=0;this.simulateInterval=window.setInterval(()=>{if(u>=h.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const o=h[u];u++;const d=Math.random();let y="perfect";d<.9?y="perfect":d<.99?y="good":y="poor";const w=Math.floor(Math.random()*100)-50,H={type:"judgement",judgement:y,msDelta:w,noteChar:o.type,noteOrdinalByChar:o.ordinal};this.onMessageCallback&&this.onMessageCallback(H)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}const Be={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new z,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1},loadedTJAContent:oe,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,annotations:new z,eseClient:new Oe,eseTree:null,judgementClient:new xe,judgements:new U,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:!1,isNeutralinoConnected:!1,swRegistrationError:null};class Le extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new U;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new U;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=fe(we,{children:[D("style",{children:`
            :host {
                display: block;
                width: 100%;
                overflow: hidden;
                box-sizing: border-box;
            }
            :host(:fullscreen), :host(.pseudo-fullscreen) {
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                background-color: var(--canvas-container-bg, #fafafa);
                padding-top: env(safe-area-inset-top);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                padding-bottom: max(20px, env(safe-area-inset-bottom));
                transition: padding var(--anim-duration-normal) ease, background-color var(--anim-duration-normal) ease;
            }
            :host(.pseudo-fullscreen) {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                height: 100dvh;
                z-index: 9999;
                animation: fullscreenEnter var(--anim-duration-normal) ease;
            }
            @keyframes fullscreenEnter {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
            #exit-fullscreen-btn {
                position: fixed;
                top: max(20px, env(safe-area-inset-top) + 10px);
                right: max(20px, env(safe-area-inset-right) + 10px);
                z-index: 10000;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                cursor: pointer;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 8px;
                transition: opacity var(--anim-duration-normal) ease;
                animation: fadeIn var(--anim-duration-normal) ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            :host(:fullscreen) #exit-fullscreen-btn,
            :host(.pseudo-fullscreen) #exit-fullscreen-btn {
                display: flex;
            }
            #exit-fullscreen-btn img {
                width: 100%;
                height: 100%;
                filter: brightness(0) invert(1);
            }
            canvas {
                display: block;
                width: 100%;
            }
            .canvas-fade-in {
                animation: canvasFadeIn var(--anim-duration-normal) ease-out;
            }
            @keyframes canvasFadeIn {
                from { transform: scale(0.995); }
                to { transform: scale(1); }
            }
            #message-container {
                width: 100%;
                height: 400px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                font-size: 24px;
                font-family: sans-serif;
                box-sizing: border-box;
            }
            .hidden {
                display: none !important;
            }
        `}),D("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:D("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),D("div",{id:"message-container",className:"hidden",ref:t=>{this.messageContainer=t}}),D("canvas",{ref:t=>{t&&(this.canvas=t,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&ge(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const t=this[e];delete this[e],this[e]=t}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,t="info"){this._message={text:e,type:t},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,t){return!this._chart||!this._viewOptions?null:me(this._chart,this.canvas,this._viewOptions,e,t,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e){if(!e.autoZoom)return;const t=this.clientWidth-(se.left+se.right),n=new Map;if(this._chart?.barParams)for(const a of this._chart.barParams){const c=a.measureRatio*4;n.set(c,(n.get(c)||0)+1)}n.size===0&&n.set(4,1);const i=pe(t,n);e.beatsPerLine!==i&&(e.beatsPerLine=i,Be.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=W.ui.warning.background,this.messageContainer.style.color=W.ui.warning.text):(this.messageContainer.style.backgroundColor=W.ui.streamWaiting.background,this.messageContainer.style.color=W.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const t=this.canvas.getContext("2d");if(!t)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,t.clearRect(0,0,this.canvas.width,this.canvas.height);return}const n={...this._viewOptions,showAttribution:this.isFullscreen};this.applyAutoZoom(n);const i=this._pendingFullRender||!this._layout,a=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};i&&(this._layout=ve(this._chart,this.canvas,n,this._judgements,void 0,a),this._pendingFullRender=!1);let c;if(!i&&this._layout){const h=[];for(const[s,u]of this._judgements){const o=this._renderedJudgements.get(s);(!o||o.judgement!==u.judgement||o.delta!==u.delta)&&h.push(s)}for(const s of this._renderedJudgements.keys())this._judgements.has(s)||h.push(s);if(h.length>0){c=new Set;const s=this._layout.noteOrdinalToGrid,u=this._layout.barFrames;for(const o of h){const d=s.get(o);if(d)for(const y of d){const w=u[y.virtualBarIdx];w&&c.add(w.y)}}}else return}this._layout&&(Ce(t,this._layout,this._chart,this._judgements,n,a,c),c?this._renderedJudgements=new U(this._judgements):this._renderedJudgements=new U(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),n=e.clientX-t.left,i=e.clientY-t.top,a=re(n,i,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:i,hit:a,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=a?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),n=e.clientX-t.left,i=e.clientY-t.top,a=re(n,i,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&a&&ae.includes(a.type)){const c={barIndex:a.originalBarIndex,charIndex:a.charIndex},h=new z(this._viewOptions.annotations),s=h.get(c);s?s==="L"?h.set(c,"R"):h.delete(c):h.set(c,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:h,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:i,hit:a,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new z,t=be(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:t,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const t={...this._viewOptions,showAttribution:!0,...e},n=document.createElement("canvas"),i=1024;return n.width=i,Ee(this._chart,n,this._judgements,t,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",Le);export{Le as T,Be as a,oe as e,Se as p};
