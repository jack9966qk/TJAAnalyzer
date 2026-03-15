import{f as j,j as D,a as p,b as z}from"./applyDiff-yht6bz5G.js";import{i as L}from"./api-EL247OCx.js";const _=[];{const t=window.__htmlScriptTs;t!==void 0&&_.push({label:"HTML script executing (earliest JS)",ts:t})}function B(t,e){const s=performance.now();_.push({label:t,ts:s,detail:e})}function H(){return _}const v={record:B,getEvents:H};window.__startupLog={events:_};const G=t=>j(t.children);function V(t){const e=performance.getEntriesByName(t,"resource");if(e.length===0)return"unknown (no perf entry)";const s=e[e.length-1];return s.transferSize===0?s.workerStart>0?"service worker cache (SW intercepted, no transfer)":"local cache (disk/memory, no transfer)":s.workerStart>0?`network via SW (${s.transferSize}B transferred)`:`network (${s.transferSize}B transferred)`}class J{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return v.record("ESE index: returning memory cache"),this.treeCache;v.record("ESE index: fetch start",this.indexUrl);try{const e=await fetch(this.indexUrl),s=V(new URL(this.indexUrl,location.href).href);if(!e.ok){if(e.status===404)return v.record("ESE index: not found (404), returning empty list"),console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let n;const r=await e.json();return Array.isArray(r)?n=r:typeof r=="object"&&r!==null&&"files"in r&&Array.isArray(r.files)?n=r.files:n=[],this.treeCache=n,v.record("ESE index: loaded",`${n.length} entries, source: ${s}`),n}catch(e){throw v.record("ESE index: fetch error",String(e)),console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const n=`ese/${e.split("/").map(a=>encodeURIComponent(a).replace(/%2B/g,"+")).join("/")}`,r=await fetch(n);if(!r.ok)throw new Error(`Failed to fetch file: ${r.status} ${r.statusText}`);return await r.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const I=`//TJADB Project
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
`,{JUDGEABLE_NOTES:U,parseTJA:$}=L;class W{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,s){this.disconnect();const n=`http://${e}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=r=>{try{const a=JSON.parse(r.data);this.onMessageCallback&&this.onMessageCallback(a)}catch(a){r.data&&r.data.trim()!==""&&console.error("Failed to parse event data",a,r.data)}},this.eventSource.onerror=r=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(r){console.error("Connection error:",r),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=e||I,r=s||"oni";if(this.onMessageCallback){const u={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:r}]};this.onMessageCallback(u)}const a=$(n),i=a[r]||Object.values(a)[0];if(!i){console.error("Simulation failed: Could not parse chart");return}const l=[],d={};for(const u of i.bars)for(const o of u)U.includes(o)&&(d[o]===void 0&&(d[o]=0),l.push({type:o,ordinal:d[o]}),d[o]++);let h=0;this.simulateInterval=window.setInterval(()=>{if(h>=l.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const u=l[h];h++;const o=Math.random();let m="perfect";o<.9?m="perfect":o<.99?m="good":m="poor";const N=Math.floor(Math.random()*100)-50,P={type:"judgement",judgement:m,msDelta:N,noteChar:u.type,noteOrdinalByChar:u.ordinal};this.onMessageCallback&&this.onMessageCallback(P)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}var g=(t=>(t[t.None=0]="None",t[t.Clear=1]="Clear",t[t.FullCombo=2]="FullCombo",t[t.Perfect=3]="Perfect",t))(g||{}),c=(t=>(t[t.None=0]="None",t[t.White=1]="White",t[t.Bronze=2]="Bronze",t[t.Silver=3]="Silver",t[t.Gold=4]="Gold",t[t.Pink=5]="Pink",t[t.Purple=6]="Purple",t[t.Rainbow=7]="Rainbow",t))(c||{});function ue(t){return t.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}const Y={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function fe(t){if(!t||!t.entries)return{totalSongs:0,byDifficulty:{}};const e={};for(const s of t.entries){const n=Y[s.difficulty]||`Level ${s.difficulty}`;e[n]=(e[n]||0)+1}return{totalSongs:t.entries.length,byDifficulty:e}}function ge(t){const{title:e,...s}=t;return{...s,songId:t.songId.toString()}}function pe(t,e){const s=[],n=[];return t.entries.forEach((r,a)=>{const i=r.songId.toString();if(r.songId!==0&&e[i]){const{title:l,...d}=r;s.push({...d,songId:i})}else n.push({entry:r,originalIndex:a})}),{matched:s,unmatched:n}}async function me(t){const e=[];let s=0;for(const n of t.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const r=Number.parseInt(n.songId,10);if(Number.isNaN(r)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}e.push([r,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,t.updatedAt])}return{data:e,exportedCount:e.length,skippedCount:s}}var f=(t=>(t.None="none",t.Crown="crown",t.DnCategory="dnCategory",t))(f||{}),x=(t=>(t.None="none",t.ScoreRank="scoreRank",t))(x||{}),k=(t=>(t.None="none",t.Counts="counts",t))(k||{});let C=null,b=null;async function R(){if(C)return C;try{const t=await fetch("./data/song_mapping.json");return t.ok?(C=await t.json(),C||{}):(console.error("Failed to load song mapping:",t.status),{})}catch(t){return console.error("Error loading song mapping:",t),{}}}async function K(){if(b)return b;const t=await R(),e=new Map;for(const[s,n]of Object.entries(t))n.esePath&&e.set(n.esePath,s);return b=e,e}function ve(t){switch(t){case g.Perfect:return"status-perfect";case g.FullCombo:return"status-fullcombo";case g.Clear:return"status-played";default:return""}}function ye(t){switch(t){case c.White:case c.Bronze:case c.Silver:return"粋";case c.Gold:case c.Pink:case c.Purple:return"雅";case c.Rainbow:return"極";default:return""}}function Ce(t){switch(t){case c.White:return"scorerank-white";case c.Bronze:return"scorerank-bronze";case c.Silver:return"scorerank-silver";case c.Gold:return"scorerank-gold";case c.Pink:return"scorerank-pink";case c.Purple:return"scorerank-purple";case c.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function be(t){return t.good===0&&t.bad===0&&t.great>0?"dn-cyan":t.bad===0&&t.good<10?"dn-green":t.crown>=g.FullCombo?"dn-gold":t.crown>=g.Clear?"dn-grey":"dn-white"}function Z(t){if(!t||t.length===0)return null;const e=t.filter(r=>r.crown>=g.Clear),s=e.length>0?e:t;let n=s[0];for(let r=1;r<s.length;r++){const a=s[r];(a.difficulty>n.difficulty||a.difficulty===n.difficulty&&(a.crown>n.crown||a.crown===n.crown&&a.score>n.score))&&(n=a)}return n}function q(t){const e=new Map;for(const s of t.entries)if(s.songId){const n=e.get(s.songId)||[];n.push(s),e.set(s.songId,n)}return e}async function Se(){const t=await R();return await K(),t}function we(){return C}function _e(t,e,s,n){if(!e?.entries?.length||!b||!s)return null;const r=b.get(t);if(!r)return null;let a=s.get(r);return!a||a.length===0||n!=null&&(a=a.filter(i=>i.difficulty===n),a.length===0)?null:Z(a)}function Ee(t){return t?.entries?.length?q(t):null}var Q=(t=>(t.Auto="auto",t.En="en",t.Ja="ja",t.Zh="zh",t.Ko="ko",t))(Q||{});const A="tja_analyzer_profile",w="tja_analyzer_playdata",X=2,E={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListStripMode:f.Crown,chartListLeadingMode:x.None,chartListTrailingMode:k.None,preferredChartLanguage:"auto"};function M(){try{const t=localStorage.getItem(A),e=localStorage.getItem(w);let s=null;if(e)try{const n=JSON.parse(e);n.version===X?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(t){const n=JSON.parse(t);if(n.chartListDisplayMode&&!n.chartListStripMode){const r=n.chartListDisplayMode;r==="none"?n.chartListStripMode=f.None:r==="crown"?n.chartListStripMode=f.Crown:r==="crownWithScoreRank"?(n.chartListStripMode=f.Crown,n.chartListLeadingMode=x.ScoreRank):r==="dnStyle"?n.chartListStripMode=f.DnCategory:r==="dnStyleWithCounts"&&(n.chartListStripMode=f.DnCategory,n.chartListTrailingMode=k.Counts),delete n.chartListDisplayMode}return{...E,...n,playdata:s}}return{...E,playdata:s}}catch(t){console.error("Failed to load user profile",t)}return{...E}}function Oe(t){const e=M(),{playdata:s,...n}={...e,...t};try{localStorage.setItem(A,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(w):localStorage.setItem(w,JSON.stringify(s)))}catch(r){console.error("Failed to save user profile",r)}}function Le(){try{localStorage.removeItem(w)}catch(t){console.error("Failed to clear playdata",t)}}const{JudgementMap:ee,NoteLocationMap:F}=L,te={parsedTJACharts:null,currentChart:null,renderOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new F,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoAnnotateMode:"partial",annotationToolType:"hand",autoZoom:!1,hideUnreachableBranches:!0},loadedTJAContent:I,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new F,eseClient:new J,eseTree:null,judgementClient:new W,judgements:new ee,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:M().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1,isHorizontalLayout:!1},{calculateAutoZoomBeats:ne,createChartView:se,createCycleHandHandler:re,createToggleSeparatorHandler:ae,generateAutoAnnotations:ie,getNotePosition:oe,INSETS:y,JudgementMap:O,NoteLocationMap:T,PALETTE:S}=L;function le(){const t=document.createElement("div");t.style.padding="env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",t.style.position="absolute",t.style.visibility="hidden",document.body.appendChild(t);const e=getComputedStyle(t),s={top:parseFloat(e.paddingTop)||0,right:parseFloat(e.paddingRight)||0,bottom:parseFloat(e.paddingBottom)||0,left:parseFloat(e.paddingLeft)||0};return document.body.removeChild(t),s}class ce extends HTMLElement{canvas;messageContainer;_chart=null;_renderOptions=null;_judgements=new O;_texts;_insetsOverride=null;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_chartView=null;_clickCleanup=null;_hoverCleanup=null;_hoverStyleEnabled=!1;_cycleHandHandler;_toggleSeparatorHandler;get layout(){return this._chartView?.layout??null}get hoveredNote(){return this._chartView?.hoveredNote??null}_renderedJudgements=new O;constructor(){super(),this.attachShadow({mode:"open"});const e=()=>this._renderOptions?.annotations||new T,s=n=>{this.dispatchEvent(new CustomEvent("annotations-change",{detail:n,bubbles:!0,composed:!0}))};this._cycleHandHandler=re(e,s),this._toggleSeparatorHandler=ae(e,s),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(n=>{for(const r of n)r.type==="attributes"&&r.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("renderOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=D(G,{children:[p("style",{children:`
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
            #safe-area-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: calc(env(safe-area-inset-top) + 30px);
                background: linear-gradient(to bottom,
                    rgba(0,0,0,0.8),
                    rgba(0,0,0,0.75) 10%,
                    rgba(0,0,0,0.65) 20%,
                    rgba(0,0,0,0.5) 35%,
                    rgba(0,0,0,0.3) 50%,
                    rgba(0,0,0,0.15) 65%,
                    rgba(0,0,0,0.05) 80%,
                    transparent
                );
                pointer-events: none;
                z-index: 9999;
            }
            :host(:fullscreen) #safe-area-overlay,
            :host(.pseudo-fullscreen) #safe-area-overlay {
                display: block;
            }
            .hidden {
                display: none !important;
            }
        `}),p("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:p("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),p("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),p("canvas",{ref:s=>{s&&(this.canvas=s)}}),p("div",{id:"safe-area-overlay"})]});this.shadowRoot&&z(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const s=this[e];delete this[e],this[e]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.cleanupInteractions()}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}cleanupInteractions(){this._hoverCleanup?.(),this._hoverCleanup=null,this._clickCleanup?.(),this._clickCleanup=null}set chart(e){this._chart!==e&&(this._chartChanged=!0,this.cleanupInteractions(),this._chartView=null),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set renderOptions(e){this._renderOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get renderOptions(){return this._renderOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}set hoverStyleEnabled(e){this._hoverStyleEnabled!==e&&(this._hoverStyleEnabled=e,e&&this._chartView&&!this._hoverCleanup?this._hoverCleanup=this._chartView.onNoteHovered(s=>this.handleNoteHovered(s)):!e&&this._hoverCleanup&&(this._hoverCleanup(),this._hoverCleanup=null))}get hoverStyleEnabled(){return this._hoverStyleEnabled}set insetsOverride(e){this._insetsOverride=e,this._pendingFullRender=!0,this.scheduleRender()}get insetsOverride(){return this._insetsOverride}showMessage(e,s="info"){this._message={text:e,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,s){return!this._chart||!this._renderOptions?null:oe(this._chart,this.canvas,this._renderOptions,e,s,this._chartView?.layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}updateThemeColor(e){const s=document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),n=document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');s&&s.setAttribute("content",e?"#fafafa":"#f0f0f0"),n&&n.setAttribute("content",e?"#1e1e1e":"#1a1a1a")}applyAutoZoom(e,s=y){if(!e.autoZoom)return;const n=this.clientWidth,r=new Map;if(this._chart?.barParams)for(const i of this._chart.barParams){const l=i.measureRatio*4;r.set(l,(r.get(l)||0)+1)}r.size===0&&r.set(4,1);const a=ne(n,r,s);e.beatsPerLine!==a&&(e.beatsPerLine=a,te.renderOptions.beatsPerLine=a,this._chartView?.invalidateLayout(),this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}calculateDirtyRowY(e){const s=[];for(const[i,l]of this._judgements){const d=this._renderedJudgements.get(i);(!d||d.judgement!==l.judgement||d.delta!==l.delta)&&s.push(i)}for(const i of this._renderedJudgements.keys())this._judgements.has(i)||s.push(i);const n=new Set;if(s.length===0)return n;const r=e.noteOrdinalToGrid,a=e.barFrames;for(const i of s){const l=r.get(i);if(l)for(const d of l){const h=a[d.virtualBarIdx];h&&n.add(h.y)}}return n}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;this.updateThemeColor(this.isFullscreen);const e=this.clientWidth||800,s=document.body.classList.contains("horizontal-layout");let n;if(this._insetsOverride)n=this._insetsOverride;else if(n={top:20,bottom:20,left:20,right:20},s&&(n.left=35),this.isFullscreen){const o=le();n={top:Math.max(y.top,o.top+10),bottom:Math.max(y.bottom,o.bottom+10),left:Math.max(y.left,o.left+10),right:Math.max(y.right,o.right+10)},this.shadowRoot?.getElementById("safe-area-overlay")?.classList.toggle("hidden",o.top===0)}if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this.messageContainer.style.paddingTop=`${n.top}px`,this.messageContainer.style.paddingBottom=`${n.bottom}px`,this.messageContainer.style.paddingLeft=`${n.left}px`,this.messageContainer.style.paddingRight=`${n.right}px`,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=S.ui.warning.background,this.messageContainer.style.color=S.ui.warning.text):(this.messageContainer.style.backgroundColor=S.ui.streamWaiting.background,this.messageContainer.style.color=S.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const r=this.canvas.getContext("2d");if(!r)return;if(!this._chart||!this._renderOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,r.clearRect(0,0,this.canvas.width,this.canvas.height);return}const a={...this._renderOptions,showAttribution:this._renderOptions.showAttribution||this.isFullscreen};this._chartView||(this._chartView=se(this._chart,this.canvas),this._clickCleanup=this._chartView.onNoteClicked(o=>this.handleNoteClicked(o)),this._hoverStyleEnabled&&(this._hoverCleanup=this._chartView.onNoteHovered(o=>this.handleNoteHovered(o)))),this.applyAutoZoom(a,n);const i=this._chartView.layout,l=this._pendingFullRender||!i,d=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};l&&this._chartView.invalidateLayout();const h=l||!i?void 0:this.calculateDirtyRowY(i);if(h!==void 0&&h.size===0)return;const u={renderOptions:a,judgements:this._judgements,texts:d,insets:n};this._chartView.render(u,h),this._pendingFullRender=!1,this._renderedJudgements=new O(this._judgements)}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleNoteHovered({x:e,y:s,hit:n,originalEvent:r}){if(this._message){this.canvas.style.cursor="default";return}this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:e,y:s,hit:n,originalEvent:r},bubbles:!0,composed:!0})),this.canvas.style.cursor=n?"pointer":"default"}handleNoteClicked({x:e,y:s,hit:n,originalEvent:r}){this._message||this._renderOptions&&(this._renderOptions.isAnnotationMode&&((this._renderOptions.annotationToolType||"hand")==="separator"?this._toggleSeparatorHandler:this._cycleHandHandler)({x:e,y:s,hit:n,originalEvent:r}),this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:e,y:s,hit:n,originalEvent:r},bubbles:!0,composed:!0})))}autoAnnotate(){if(!this._chart)return;const e=this._renderOptions?.annotations||new T,s=ie(this._chart,e,this._renderOptions?.handAlternationThreshold,this._renderOptions?.handResetThreshold,this._renderOptions?.autoAnnotateMode);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(e,s){if(!this._chartView||!this._renderOptions)throw new Error("Chart not loaded");const n={...this._renderOptions,showAttribution:!0,...e};return this._chartView.exportImage({renderOptions:n,judgements:this._judgements,texts:this._texts},s)}}customElements.define("tja-chart",ce);export{g as C,G as F,f as P,c as S,ce as T,te as a,Q as b,x as c,k as d,Le as e,ge as f,me as g,fe as h,v as i,I as j,be as k,M as l,we as m,ue as n,Ee as o,Se as p,_e as q,ve as r,Oe as s,Ce as t,ye as u,pe as v};
