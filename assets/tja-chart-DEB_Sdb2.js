import{f as z,i as F,j as G,a as m,b as J}from"./internal-Bo7lkBEc.js";const O=[];{const e=window.__htmlScriptTs;e!==void 0&&O.push({label:"HTML script executing (earliest JS)",ts:e})}function U(e,t){const s=performance.now();O.push({label:e,ts:s,detail:t})}function $(){return O}const v={record:U,getEvents:$};window.__startupLog={events:O};const H=e=>z(e.children);function W(e){const t=performance.getEntriesByName(e,"resource");if(t.length===0)return"unknown (no perf entry)";const s=t[t.length-1];return s.transferSize===0?s.workerStart>0?"service worker cache (SW intercepted, no transfer)":"local cache (disk/memory, no transfer)":s.workerStart>0?`network via SW (${s.transferSize}B transferred)`:`network (${s.transferSize}B transferred)`}class V{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return v.record("ESE index: returning memory cache"),this.treeCache;v.record("ESE index: fetch start",this.indexUrl);try{const t=await fetch(this.indexUrl),s=W(new URL(this.indexUrl,location.href).href);if(!t.ok){if(t.status===404)return v.record("ESE index: not found (404), returning empty list"),console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${t.status} ${t.statusText}`)}let n;const a=await t.json();return Array.isArray(a)?n=a:typeof a=="object"&&a!==null&&"files"in a&&Array.isArray(a.files)?n=a.files:n=[],this.treeCache=n,v.record("ESE index: loaded",`${n.length} entries, source: ${s}`),n}catch(t){throw v.record("ESE index: fetch error",String(t)),console.error("Error fetching ESE index:",t),new Error("Failed to load song list.")}}async getFileContent(t){try{const n=`ese/${t.split("/").map(i=>encodeURIComponent(i).replace(/%2B/g,"+")).join("/")}`,a=await fetch(n);if(!a.ok)throw new Error(`Failed to fetch file: ${a.status} ${a.statusText}`);return await a.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const P=`//TJADB Project
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
`,{JUDGEABLE_NOTES:K,parseTJA:Y}=F;class Z{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(t,s){this.disconnect();const n=`http://${t}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=a=>{try{const i=JSON.parse(a.data);this.onMessageCallback&&this.onMessageCallback(i)}catch(i){a.data&&a.data.trim()!==""&&console.error("Failed to parse event data",i,a.data)}},this.eventSource.onerror=a=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(a){console.error("Connection error:",a),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let t=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,t=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,t=!0),t}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(t,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=t||P,a=s||"oni";if(this.onMessageCallback){const r={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:a}]};this.onMessageCallback(r)}const i=Y(n),l=i[a]||Object.values(i)[0];if(!l){console.error("Simulation failed: Could not parse chart");return}const c=[],d={};for(const r of l.bars)for(const o of r)K.includes(o)&&(d[o]===void 0&&(d[o]=0),c.push({type:o,ordinal:d[o]}),d[o]++);let h=0;this.simulateInterval=window.setInterval(()=>{if(h>=c.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const r=c[h];h++;const o=Math.random();let f="perfect";o<.9?f="perfect":o<.99?f="good":f="poor";const b=Math.floor(Math.random()*100)-50,L={type:"judgement",judgement:f,msDelta:b,noteChar:r.type,noteOrdinalByChar:r.ordinal};this.onMessageCallback&&this.onMessageCallback(L)},100+Math.random()*200)}onMessage(t){this.onMessageCallback=t}onStatusChange(t){this.onStatusChangeCallback=t}}var p=(e=>(e[e.None=0]="None",e[e.Clear=1]="Clear",e[e.FullCombo=2]="FullCombo",e[e.Perfect=3]="Perfect",e))(p||{}),u=(e=>(e[e.None=0]="None",e[e.White=1]="White",e[e.Bronze=2]="Bronze",e[e.Silver=3]="Silver",e[e.Gold=4]="Gold",e[e.Pink=5]="Pink",e[e.Purple=6]="Purple",e[e.Rainbow=7]="Rainbow",e))(u||{});function ye(e){return e.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}const q={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function Ce(e){if(!e||!e.entries)return{totalSongs:0,byDifficulty:{}};const t={};for(const s of e.entries){const n=q[s.difficulty]||`Level ${s.difficulty}`;t[n]=(t[n]||0)+1}return{totalSongs:e.entries.length,byDifficulty:t}}function we(e){const{title:t,...s}=e;return{...s,songId:e.songId.toString()}}function be(e,t){const s=[],n=[];return e.entries.forEach((a,i)=>{const l=a.songId.toString();if(a.songId!==0&&t[l]){const{title:c,...d}=a;s.push({...d,songId:l})}else n.push({entry:a,originalIndex:i})}),{matched:s,unmatched:n}}async function Se(e){const t=[];let s=0;for(const n of e.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const a=Number.parseInt(n.songId,10);if(Number.isNaN(a)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}t.push([a,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,e.updatedAt])}return{data:t,exportedCount:t.length,skippedCount:s}}var g=(e=>(e.None="none",e.Crown="crown",e.DnCategory="dnCategory",e))(g||{}),I=(e=>(e.None="none",e.ScoreRank="scoreRank",e))(I||{}),k=(e=>(e.None="none",e.Counts="counts",e))(k||{});let C=null,w=null;async function j(){if(C)return C;try{const e=await fetch("./data/song_mapping.json");return e.ok?(C=await e.json(),C||{}):(console.error("Failed to load song mapping:",e.status),{})}catch(e){return console.error("Error loading song mapping:",e),{}}}async function X(){if(w)return w;const e=await j(),t=new Map;for(const[s,n]of Object.entries(e))n.esePath&&t.set(n.esePath,s);return w=t,t}function Ee(e){switch(e){case p.Perfect:return"status-perfect";case p.FullCombo:return"status-fullcombo";case p.Clear:return"status-played";default:return""}}function _e(e){switch(e){case u.White:case u.Bronze:case u.Silver:return"粋";case u.Gold:case u.Pink:case u.Purple:return"雅";case u.Rainbow:return"極";default:return""}}function Oe(e){switch(e){case u.White:return"scorerank-white";case u.Bronze:return"scorerank-bronze";case u.Silver:return"scorerank-silver";case u.Gold:return"scorerank-gold";case u.Pink:return"scorerank-pink";case u.Purple:return"scorerank-purple";case u.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function Le(e){return e.good===0&&e.bad===0&&e.great>0?"dn-cyan":e.bad===0&&e.good<10?"dn-green":e.crown>=p.FullCombo?"dn-gold":e.crown>=p.Clear?"dn-grey":"dn-white"}function Q(e){if(!e||e.length===0)return null;const t=e.filter(a=>a.crown>=p.Clear),s=t.length>0?t:e;let n=s[0];for(let a=1;a<s.length;a++){const i=s[a];(i.difficulty>n.difficulty||i.difficulty===n.difficulty&&(i.crown>n.crown||i.crown===n.crown&&i.score>n.score))&&(n=i)}return n}function ee(e){const t=new Map;for(const s of e.entries)if(s.songId){const n=t.get(s.songId)||[];n.push(s),t.set(s.songId,n)}return t}async function xe(){const e=await j();return await X(),e}function Te(){return C}function Fe(e,t,s,n){if(!t?.entries?.length||!w||!s)return null;const a=w.get(e);if(!a)return null;let i=s.get(a);return!i||i.length===0||n!=null&&(i=i.filter(l=>l.difficulty===n),i.length===0)?null:Q(i)}function Ie(e){return e?.entries?.length?ee(e):null}var te=(e=>(e.Auto="auto",e.En="en",e.Ja="ja",e.Zh="zh",e.Ko="ko",e))(te||{});const D="tja_analyzer_profile",_="tja_analyzer_playdata",ne=2,x={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListStripMode:g.Crown,chartListLeadingMode:I.None,chartListTrailingMode:k.None,preferredChartLanguage:"auto"};function B(){try{const e=localStorage.getItem(D),t=localStorage.getItem(_);let s=null;if(t)try{const n=JSON.parse(t);n.version===ne?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(e){const n=JSON.parse(e);if(n.chartListDisplayMode&&!n.chartListStripMode){const a=n.chartListDisplayMode;a==="none"?n.chartListStripMode=g.None:a==="crown"?n.chartListStripMode=g.Crown:a==="crownWithScoreRank"?(n.chartListStripMode=g.Crown,n.chartListLeadingMode=I.ScoreRank):a==="dnStyle"?n.chartListStripMode=g.DnCategory:a==="dnStyleWithCounts"&&(n.chartListStripMode=g.DnCategory,n.chartListTrailingMode=k.Counts),delete n.chartListDisplayMode}return{...x,...n,playdata:s}}return{...x,playdata:s}}catch(e){console.error("Failed to load user profile",e)}return{...x}}function ke(e){const t=B(),{playdata:s,...n}={...t,...e};try{localStorage.setItem(D,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(_):localStorage.setItem(_,JSON.stringify(s)))}catch(a){console.error("Failed to save user profile",a)}}function Re(){try{localStorage.removeItem(_)}catch(e){console.error("Failed to clear playdata",e)}}const{JudgementMap:se,LocationMap:A}=F,ae={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new A,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoAnnotateMode:"partial",annotationToolType:"hand",autoZoom:!1,hideUnreachableBranches:!0},loadedTJAContent:P,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new A,eseClient:new V,eseTree:null,judgementClient:new Z,judgements:new se,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:B().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1,isHorizontalLayout:!1},{annotationHand:ie,annotationToggleSeparator:re,annotationWithHand:oe,calculateAutoZoomBeats:le,createLayout:ce,generateAutoAnnotations:de,getChartElementAt:M,getNotePosition:ue,HandType:T,INSETS:y,JUDGEABLE_NOTES:he,JudgementMap:S,LocationMap:N,PALETTE:E,renderChart:fe,renderLayout:ge}=F;function pe(){const e=document.createElement("div");e.style.padding="env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",e.style.position="absolute",e.style.visibility="hidden",document.body.appendChild(e);const t=getComputedStyle(e),s={top:parseFloat(t.paddingTop)||0,right:parseFloat(t.paddingRight)||0,bottom:parseFloat(t.paddingBottom)||0,left:parseFloat(t.paddingLeft)||0};return document.body.removeChild(e),s}class me extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new S;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;get layout(){return this._layout}_renderedJudgements=new S;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(t=>{for(const s of t)s.type==="attributes"&&s.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const t=G(H,{children:[m("style",{children:`
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
                transition: background-color var(--anim-duration-normal) ease;
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
        `}),m("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:m("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),m("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),m("canvas",{ref:s=>{s&&(this.canvas=s,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&J(this.shadowRoot,t)}exitFullscreen(){const t=document;(t.fullscreenElement||t.webkitFullscreenElement||t.mozFullScreenElement||t.msFullscreenElement)&&(t.exitFullscreen?t.exitFullscreen().catch(()=>{}):t.webkitExitFullscreen?t.webkitExitFullscreen():t.mozCancelFullScreen?t.mozCancelFullScreen():t.msExitFullscreen&&t.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(t){if(Object.hasOwn(this,t)){const s=this[t];delete this[t],this[t]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(t){this._chart!==t&&(this._chartChanged=!0),this._chart=t,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(t){this._viewOptions=t,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(t){this._judgements=t,this.scheduleRender()}get judgements(){return this._judgements}set texts(t){this._texts=t,this._pendingFullRender=!0,this.scheduleRender()}showMessage(t,s="info"){this._message={text:t,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(t,s){return!this._chart||!this._viewOptions?null:ue(this._chart,this.canvas,this._viewOptions,t,s,this._layout||void 0)}get isFullscreen(){const t=document;return!!(t.fullscreenElement||t.webkitFullscreenElement||t.mozFullScreenElement||t.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}updateThemeColor(t){const s=document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),n=document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');s&&s.setAttribute("content",t?"#fafafa":"#f0f0f0"),n&&n.setAttribute("content",t?"#1e1e1e":"#1a1a1a")}applyAutoZoom(t,s=y){if(!t.autoZoom)return;const n=this.clientWidth,a=new Map;if(this._chart?.barParams)for(const l of this._chart.barParams){const c=l.measureRatio*4;a.set(c,(a.get(c)||0)+1)}a.size===0&&a.set(4,1);const i=le(n,a,s);t.beatsPerLine!==i&&(t.beatsPerLine=i,ae.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;this.updateThemeColor(this.isFullscreen);const t=this.clientWidth||800,s=document.body.classList.contains("horizontal-layout");let n={top:20,bottom:20,left:20,right:20};if(s&&(n.left=35),this.isFullscreen){const h=pe();n={top:Math.max(y.top,h.top+10),bottom:Math.max(y.bottom,h.bottom+10),left:Math.max(y.left,h.left+10),right:Math.max(y.right,h.right+10)}}if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this.messageContainer.style.paddingTop=`${n.top}px`,this.messageContainer.style.paddingBottom=`${n.bottom}px`,this.messageContainer.style.paddingLeft=`${n.left}px`,this.messageContainer.style.paddingRight=`${n.right}px`,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=E.ui.warning.background,this.messageContainer.style.color=E.ui.warning.text):(this.messageContainer.style.backgroundColor=E.ui.streamWaiting.background,this.messageContainer.style.color=E.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const a=this.canvas.getContext("2d");if(!a)return;if(!this._chart||!this._viewOptions){this.canvas.width=t,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${t}px`,a.clearRect(0,0,this.canvas.width,this.canvas.height);return}const i={...this._viewOptions,showAttribution:this.isFullscreen};this.applyAutoZoom(i,n);const l=this._pendingFullRender||!this._layout,c=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};l&&(this._layout=ce(this._chart,this.canvas,i,this._judgements,void 0,c,n),this._pendingFullRender=!1);let d;if(!l&&this._layout){const h=[];for(const[r,o]of this._judgements){const f=this._renderedJudgements.get(r);(!f||f.judgement!==o.judgement||f.delta!==o.delta)&&h.push(r)}for(const r of this._renderedJudgements.keys())this._judgements.has(r)||h.push(r);if(h.length>0){d=new Set;const r=this._layout.noteOrdinalToGrid,o=this._layout.barFrames;for(const f of h){const b=r.get(f);if(b)for(const L of b){const R=o[L.virtualBarIdx];R&&d.add(R.y)}}}else return}this._layout&&(ge(a,this._layout,this._chart,this._judgements,i,c,d),d?this._renderedJudgements=new S(this._judgements):this._renderedJudgements=new S(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(t){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=t.clientX-s.left,a=t.clientY-s.top,i=M(n,a,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:a,hit:i,originalEvent:t},bubbles:!0,composed:!0})),this.canvas.style.cursor=i?"pointer":"default"}handleClick(t){if(this._message||!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=t.clientX-s.left,a=t.clientY-s.top,i=M(n,a,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&i&&he.includes(i.type)){const l={barIndex:i.originalBarIndex,charIndex:i.charIndex},c=new N(this._viewOptions.annotations),d=c.get(l);if((this._viewOptions.annotationToolType||"hand")==="separator"){const r=re(d);r?c.set(l,r):c.delete(l)}else{const r=ie(d);let o;r?r===T.L?o=T.R:o=void 0:o=T.L;const f=oe(d,o);f?c.set(l,f):c.delete(l)}this.dispatchEvent(new CustomEvent("annotations-change",{detail:c,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:a,hit:i,originalEvent:t},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const t=this._viewOptions?.annotations||new N,s=de(this._chart,t,this._viewOptions?.handAlternationThreshold,this._viewOptions?.handResetThreshold,this._viewOptions?.autoAnnotateMode);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(t){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const s={...this._viewOptions,showAttribution:!0,...t},n=document.createElement("canvas"),a=1024;return n.width=a,fe(this._chart,n,this._judgements,s,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",me);export{p as C,H as F,g as P,u as S,me as T,ae as a,te as b,I as c,k as d,Re as e,we as f,Se as g,Ce as h,v as i,P as j,Le as k,B as l,Te as m,ye as n,Ie as o,xe as p,Fe as q,Ee as r,ke as s,Oe as t,_e as u,be as v};
