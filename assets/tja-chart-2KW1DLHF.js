import{f as X,i as R,j as Q,a as w,b as ee}from"./internal-BWQiYRLH.js";const te=t=>X(t.children);class ne{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let s;const n=await e.json();return Array.isArray(n)?s=n:typeof n=="object"&&n!==null&&"files"in n&&Array.isArray(n.files)?s=n.files:s=[],this.treeCache=s,s}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const n=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,r=await fetch(n);if(!r.ok)throw new Error(`Failed to fetch file: ${r.status} ${r.statusText}`);return await r.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const U=`//TJADB Project
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
`,{JUDGEABLE_NOTES:se,parseTJA:re}=R;class ie{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,s){this.disconnect();const n=`http://${e}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=r=>{try{const i=JSON.parse(r.data);this.onMessageCallback&&this.onMessageCallback(i)}catch(i){r.data&&r.data.trim()!==""&&console.error("Failed to parse event data",i,r.data)}},this.eventSource.onerror=r=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(r){console.error("Connection error:",r),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=e||U,r=s||"oni";if(this.onMessageCallback){const u={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:r}]};this.onMessageCallback(u)}const i=re(n),l=i[r]||Object.values(i)[0];if(!l){console.error("Simulation failed: Could not parse chart");return}const a=[],o={};for(const u of l.bars)for(const c of u)se.includes(c)&&(o[c]===void 0&&(o[c]=0),a.push({type:c,ordinal:o[c]}),o[c]++);let m=0;this.simulateInterval=window.setInterval(()=>{if(m>=a.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const u=a[m];m++;const c=Math.random();let f="perfect";c<.9?f="perfect":c<.99?f="good":f="poor";const p=Math.floor(Math.random()*100)-50,y={type:"judgement",judgement:f,msDelta:p,noteChar:u.type,noteOrdinalByChar:u.ordinal};this.onMessageCallback&&this.onMessageCallback(y)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}var b=(t=>(t[t.None=0]="None",t[t.Clear=1]="Clear",t[t.FullCombo=2]="FullCombo",t[t.Perfect=3]="Perfect",t))(b||{}),h=(t=>(t[t.None=0]="None",t[t.White=1]="White",t[t.Bronze=2]="Bronze",t[t.Silver=3]="Silver",t[t.Gold=4]="Gold",t[t.Pink=5]="Pink",t[t.Purple=6]="Purple",t[t.Rainbow=7]="Rainbow",t))(h||{});const P={difficulty_easy_color:1,difficulty_normal_color:2,difficulty_hard_color:3,difficulty_extreme_color:4,difficulty_hidden_color:5},D={crown_clear:1,crown_full:2,crown_preDonderfull:2,crown_donderfull:3},j={scoreRank_white:1,scoreRank_bronze:2,scoreRank_silver:3,scoreRank_gold:4,scoreRank_pink:5,scoreRank_purple:6,scoreRank_rainbow:7};function ae(t){return t.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}function Ee(t){const s=new DOMParser().parseFromString(t,"text/html");let n="";const r=Array.from(s.querySelectorAll("p"));for(const a of r){const o=a.textContent?.trim()||"";if(o.includes("最終更新：")){n=o.replace("最終更新：","").trim();break}}const i=[],l=Array.from(s.querySelectorAll("div.filter_selector"));for(const a of l)try{const o=a.querySelector(".table_song_name a"),m=o?.textContent?.trim();if(!m)continue;let u=0,c=0;if(o){const g=o.getAttribute("href");if(g){const d=g.match(/\/song\/(\d+)-(\d+)\//);d&&(u=parseInt(d[1],10),c=parseInt(d[2],10))}}if(c===0){const g=a.querySelector(".table_difficulty");if(g){const d=g.className.split(" ");for(const S of d)if(P[S]!==void 0){c=P[S];break}}}let f=0;const p=a.querySelector(".table_crown img");if(p){const g=p.getAttribute("src")||"";for(const d in D)if(g.includes(d)){f=D[d];break}}let y=0;const C=a.querySelector(".table_scorerank img");if(C){const g=C.getAttribute("src")||"";for(const d in j)if(g.includes(d)){y=j[d];break}}let T=0;const N=a.querySelector(".table_totalscore");if(N){const g=N.textContent?.trim().replace(/[,点]/g,"")||"",d=Number.parseInt(g,10);Number.isNaN(d)||(T=d)}const _=g=>{const d=a.querySelector(`.${g}`);if(d){const S=d.textContent?.trim().replace(/,/g,"")||"",M=Number.parseInt(S,10);if(!Number.isNaN(M))return M}return 0},Y=_("table_good"),q=_("table_ok"),K=_("table_bad"),V=_("table_combo"),Z=_("table_roll");i.push({title:ae(m),difficulty:c,score:T,great:Y,good:q,bad:K,combo:V,drumroll:Z,songId:u,crown:f,scoreRank:y})}catch(o){console.error("Error parsing row:",o)}return{entries:i,updatedAt:n,source:"fumen-database"}}const oe={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function Se(t){if(!t||!t.entries)return{totalSongs:0,byDifficulty:{}};const e={};for(const s of t.entries){const n=oe[s.difficulty]||`Level ${s.difficulty}`;e[n]=(e[n]||0)+1}return{totalSongs:t.entries.length,byDifficulty:e}}function Oe(t,e){const s=[],n=[];return t.entries.forEach((r,i)=>{const l=r.songId.toString();if(r.songId!==0&&e[l]){const{title:a,...o}=r;s.push({...o,songId:l})}else n.push({entry:r,originalIndex:i})}),{matched:s,unmatched:n}}async function Le(t){const e=[];let s=0;for(const n of t.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const r=Number.parseInt(n.songId,10);if(Number.isNaN(r)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}e.push([r,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,t.updatedAt])}return{data:e,exportedCount:e.length,skippedCount:s}}var v=(t=>(t.None="none",t.Crown="crown",t.DnCategory="dnCategory",t))(v||{}),F=(t=>(t.None="none",t.ScoreRank="scoreRank",t))(F||{}),A=(t=>(t.None="none",t.Counts="counts",t))(A||{});let O=null,E=null;async function W(){if(O)return O;try{const t=await fetch("./data/song_mapping.json");return t.ok?(O=await t.json(),O||{}):(console.error("Failed to load song mapping:",t.status),{})}catch(t){return console.error("Error loading song mapping:",t),{}}}async function le(){if(E)return E;const t=await W(),e=new Map;for(const[s,n]of Object.entries(t))n.esePath&&e.set(n.esePath,s);return E=e,e}function Ie(t){switch(t){case b.Perfect:return"status-perfect";case b.FullCombo:return"status-fullcombo";case b.Clear:return"status-played";default:return""}}function ke(t){switch(t){case h.White:case h.Bronze:case h.Silver:return"粋";case h.Gold:case h.Pink:case h.Purple:return"雅";case h.Rainbow:return"極";default:return""}}function xe(t){switch(t){case h.White:return"scorerank-white";case h.Bronze:return"scorerank-bronze";case h.Silver:return"scorerank-silver";case h.Gold:return"scorerank-gold";case h.Pink:return"scorerank-pink";case h.Purple:return"scorerank-purple";case h.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function Re(t){return t.good===0&&t.bad===0&&t.great>0?"dn-cyan":t.bad===0&&t.good<10?"dn-green":t.crown>=b.FullCombo?"dn-gold":t.crown>=b.Clear?"dn-grey":"dn-white"}function ce(t){if(!t||t.length===0)return null;const e=t.filter(r=>r.crown>=b.Clear),s=e.length>0?e:t;let n=s[0];for(let r=1;r<s.length;r++){const i=s[r];(i.difficulty>n.difficulty||i.difficulty===n.difficulty&&(i.crown>n.crown||i.crown===n.crown&&i.score>n.score))&&(n=i)}return n}function ue(t){const e=new Map;for(const s of t.entries)if(s.songId){const n=e.get(s.songId)||[];n.push(s),e.set(s.songId,n)}return e}async function Fe(){const t=await W();return await le(),t}function Ae(t,e,s,n){if(!e?.entries?.length||!E||!s)return null;const r=E.get(t);if(!r)return null;let i=s.get(r);return!i||i.length===0||n!=null&&(i=i.filter(l=>l.difficulty===n),i.length===0)?null:ce(i)}function Te(t){return t?.entries?.length?ue(t):null}const $="tja_analyzer_profile",k="tja_analyzer_playdata",de=2,x={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListStripMode:v.Crown,chartListLeadingMode:F.None,chartListTrailingMode:A.None};function H(){try{const t=localStorage.getItem($),e=localStorage.getItem(k);let s=null;if(e)try{const n=JSON.parse(e);n.version===de?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(t){const n=JSON.parse(t);if(n.chartListDisplayMode&&!n.chartListStripMode){const r=n.chartListDisplayMode;r==="none"?n.chartListStripMode=v.None:r==="crown"?n.chartListStripMode=v.Crown:r==="crownWithScoreRank"?(n.chartListStripMode=v.Crown,n.chartListLeadingMode=F.ScoreRank):r==="dnStyle"?n.chartListStripMode=v.DnCategory:r==="dnStyleWithCounts"&&(n.chartListStripMode=v.DnCategory,n.chartListTrailingMode=A.Counts),delete n.chartListDisplayMode}return{...x,...n,playdata:s}}return{...x,playdata:s}}catch(t){console.error("Failed to load user profile",t)}return{...x}}function Ne(t){const e=H(),{playdata:s,...n}={...e,...t};try{localStorage.setItem($,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(s)))}catch(r){console.error("Failed to save user profile",r)}}function Me(){try{localStorage.removeItem(k)}catch(t){console.error("Failed to clear playdata",t)}}const{JudgementMap:he,LocationMap:G}=R,fe={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new G,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1,hideUnreachableBranches:!0},loadedTJAContent:U,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new G,eseClient:new ne,eseTree:null,judgementClient:new ie,judgements:new he,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:H().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1},{calculateAutoZoomBeats:ge,createLayout:me,generateAutoAnnotations:pe,getChartElementAt:B,getNotePosition:ve,INSETS:z,JUDGEABLE_NOTES:be,JudgementMap:L,LocationMap:J,PALETTE:I,renderChart:ye,renderLayout:Ce}=R;class _e extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new L;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new L;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const s of e)s.type==="attributes"&&s.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=Q(te,{children:[w("style",{children:`
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
        `}),w("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:w("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),w("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),w("canvas",{ref:s=>{s&&(this.canvas=s,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&ee(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const s=this[e];delete this[e],this[e]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,s="info"){this._message={text:e,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,s){return!this._chart||!this._viewOptions?null:ve(this._chart,this.canvas,this._viewOptions,e,s,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e,s=z){if(!e.autoZoom)return;const n=this.clientWidth,r=new Map;if(this._chart?.barParams)for(const l of this._chart.barParams){const a=l.measureRatio*4;r.set(a,(r.get(a)||0)+1)}r.size===0&&r.set(4,1);const i=ge(n,r,s);e.beatsPerLine!==i&&(e.beatsPerLine=i,fe.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=I.ui.warning.background,this.messageContainer.style.color=I.ui.warning.text):(this.messageContainer.style.backgroundColor=I.ui.streamWaiting.background,this.messageContainer.style.color=I.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const s=this.canvas.getContext("2d");if(!s)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,s.clearRect(0,0,this.canvas.width,this.canvas.height);return}const n={...this._viewOptions,showAttribution:this.isFullscreen},r=document.body.classList.contains("horizontal-layout");let i={top:20,bottom:20,left:20,right:20};r&&(i.left=35),this.isFullscreen&&(i={...z}),this.applyAutoZoom(n,i);const l=this._pendingFullRender||!this._layout,a=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};l&&(this._layout=me(this._chart,this.canvas,n,this._judgements,void 0,a,i),this._pendingFullRender=!1);let o;if(!l&&this._layout){const m=[];for(const[u,c]of this._judgements){const f=this._renderedJudgements.get(u);(!f||f.judgement!==c.judgement||f.delta!==c.delta)&&m.push(u)}for(const u of this._renderedJudgements.keys())this._judgements.has(u)||m.push(u);if(m.length>0){o=new Set;const u=this._layout.noteOrdinalToGrid,c=this._layout.barFrames;for(const f of m){const p=u.get(f);if(p)for(const y of p){const C=c[y.virtualBarIdx];C&&o.add(C.y)}}}else return}this._layout&&(Ce(s,this._layout,this._chart,this._judgements,n,a,o),o?this._renderedJudgements=new L(this._judgements):this._renderedJudgements=new L(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,i=B(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:r,hit:i,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=i?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,i=B(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&i&&be.includes(i.type)){const l={barIndex:i.originalBarIndex,charIndex:i.charIndex},a=new J(this._viewOptions.annotations),o=a.get(l);o?o==="L"?a.set(l,"R"):a.delete(l):a.set(l,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:a,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:r,hit:i,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new J,s=pe(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const s={...this._viewOptions,showAttribution:!0,...e},n=document.createElement("canvas"),r=1024;return n.width=r,ye(this._chart,n,this._judgements,s,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",_e);export{b as C,v as P,_e as T,F as a,A as b,fe as c,Me as d,Le as e,U as f,Se as g,Re as h,Fe as i,Te as j,Ae as k,H as l,Ie as m,xe as n,ke as o,Ee as p,Ne as s,Oe as v};
