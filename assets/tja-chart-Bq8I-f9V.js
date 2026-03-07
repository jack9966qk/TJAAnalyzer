import{f as D,i as L,j as B,a as m,b as G}from"./internal-B2DH3iSI.js";const z=e=>D(e.children);class J{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const t=await fetch(this.indexUrl);if(!t.ok){if(t.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${t.status} ${t.statusText}`)}let s;const n=await t.json();return Array.isArray(n)?s=n:typeof n=="object"&&n!==null&&"files"in n&&Array.isArray(n.files)?s=n.files:s=[],this.treeCache=s,s}catch(t){throw console.error("Error fetching ESE index:",t),new Error("Failed to load song list.")}}async getFileContent(t){try{const n=`ese/${t.split("/").map(i=>encodeURIComponent(i).replace(/%2B/g,"+")).join("/")}`,a=await fetch(n);if(!a.ok)throw new Error(`Failed to fetch file: ${a.status} ${a.statusText}`);return await a.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const M=`//TJADB Project
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
`,{JUDGEABLE_NOTES:U,parseTJA:H}=L;class ${eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(t,s){this.disconnect();const n=`http://${t}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=a=>{try{const i=JSON.parse(a.data);this.onMessageCallback&&this.onMessageCallback(i)}catch(i){a.data&&a.data.trim()!==""&&console.error("Failed to parse event data",i,a.data)}},this.eventSource.onerror=a=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(a){console.error("Connection error:",a),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let t=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,t=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,t=!0),t}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(t,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=t||M,a=s||"oni";if(this.onMessageCallback){const o={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:a}]};this.onMessageCallback(o)}const i=H(n),l=i[a]||Object.values(i)[0];if(!l){console.error("Simulation failed: Could not parse chart");return}const c=[],u={};for(const o of l.bars)for(const r of o)U.includes(r)&&(u[r]===void 0&&(u[r]=0),c.push({type:r,ordinal:u[r]}),u[r]++);let f=0;this.simulateInterval=window.setInterval(()=>{if(f>=c.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const o=c[f];f++;const r=Math.random();let h="perfect";r<.9?h="perfect":r<.99?h="good":h="poor";const y=Math.floor(Math.random()*100)-50,_={type:"judgement",judgement:h,msDelta:y,noteChar:o.type,noteOrdinalByChar:o.ordinal};this.onMessageCallback&&this.onMessageCallback(_)},100+Math.random()*200)}onMessage(t){this.onMessageCallback=t}onStatusChange(t){this.onStatusChangeCallback=t}}var p=(e=>(e[e.None=0]="None",e[e.Clear=1]="Clear",e[e.FullCombo=2]="FullCombo",e[e.Perfect=3]="Perfect",e))(p||{}),d=(e=>(e[e.None=0]="None",e[e.White=1]="White",e[e.Bronze=2]="Bronze",e[e.Silver=3]="Silver",e[e.Gold=4]="Gold",e[e.Pink=5]="Pink",e[e.Purple=6]="Purple",e[e.Rainbow=7]="Rainbow",e))(d||{});function he(e){return e.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}const W={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function fe(e){if(!e||!e.entries)return{totalSongs:0,byDifficulty:{}};const t={};for(const s of e.entries){const n=W[s.difficulty]||`Level ${s.difficulty}`;t[n]=(t[n]||0)+1}return{totalSongs:e.entries.length,byDifficulty:t}}function ge(e,t){const s=[],n=[];return e.entries.forEach((a,i)=>{const l=a.songId.toString();if(a.songId!==0&&t[l]){const{title:c,...u}=a;s.push({...u,songId:l})}else n.push({entry:a,originalIndex:i})}),{matched:s,unmatched:n}}async function pe(e){const t=[];let s=0;for(const n of e.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const a=Number.parseInt(n.songId,10);if(Number.isNaN(a)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}t.push([a,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,e.updatedAt])}return{data:t,exportedCount:t.length,skippedCount:s}}var g=(e=>(e.None="none",e.Crown="crown",e.DnCategory="dnCategory",e))(g||{}),T=(e=>(e.None="none",e.ScoreRank="scoreRank",e))(T||{}),x=(e=>(e.None="none",e.Counts="counts",e))(x||{});let v=null,C=null;async function N(){if(v)return v;try{const e=await fetch("./data/song_mapping.json");return e.ok?(v=await e.json(),v||{}):(console.error("Failed to load song mapping:",e.status),{})}catch(e){return console.error("Error loading song mapping:",e),{}}}async function V(){if(C)return C;const e=await N(),t=new Map;for(const[s,n]of Object.entries(e))n.esePath&&t.set(n.esePath,s);return C=t,t}function me(e){switch(e){case p.Perfect:return"status-perfect";case p.FullCombo:return"status-fullcombo";case p.Clear:return"status-played";default:return""}}function ve(e){switch(e){case d.White:case d.Bronze:case d.Silver:return"粋";case d.Gold:case d.Pink:case d.Purple:return"雅";case d.Rainbow:return"極";default:return""}}function Ce(e){switch(e){case d.White:return"scorerank-white";case d.Bronze:return"scorerank-bronze";case d.Silver:return"scorerank-silver";case d.Gold:return"scorerank-gold";case d.Pink:return"scorerank-pink";case d.Purple:return"scorerank-purple";case d.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function ye(e){return e.good===0&&e.bad===0&&e.great>0?"dn-cyan":e.bad===0&&e.good<10?"dn-green":e.crown>=p.FullCombo?"dn-gold":e.crown>=p.Clear?"dn-grey":"dn-white"}function K(e){if(!e||e.length===0)return null;const t=e.filter(a=>a.crown>=p.Clear),s=t.length>0?t:e;let n=s[0];for(let a=1;a<s.length;a++){const i=s[a];(i.difficulty>n.difficulty||i.difficulty===n.difficulty&&(i.crown>n.crown||i.crown===n.crown&&i.score>n.score))&&(n=i)}return n}function Y(e){const t=new Map;for(const s of e.entries)if(s.songId){const n=t.get(s.songId)||[];n.push(s),t.set(s.songId,n)}return t}async function we(){const e=await N();return await V(),e}function be(){return v}function Ee(e,t,s,n){if(!t?.entries?.length||!C||!s)return null;const a=C.get(e);if(!a)return null;let i=s.get(a);return!i||i.length===0||n!=null&&(i=i.filter(l=>l.difficulty===n),i.length===0)?null:K(i)}function _e(e){return e?.entries?.length?Y(e):null}var Z=(e=>(e.Auto="auto",e.En="en",e.Ja="ja",e.Zh="zh",e.Ko="ko",e))(Z||{});const P="tja_analyzer_profile",E="tja_analyzer_playdata",q=2,S={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListStripMode:g.Crown,chartListLeadingMode:T.None,chartListTrailingMode:x.None,preferredChartLanguage:"auto"};function j(){try{const e=localStorage.getItem(P),t=localStorage.getItem(E);let s=null;if(t)try{const n=JSON.parse(t);n.version===q?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(e){const n=JSON.parse(e);if(n.chartListDisplayMode&&!n.chartListStripMode){const a=n.chartListDisplayMode;a==="none"?n.chartListStripMode=g.None:a==="crown"?n.chartListStripMode=g.Crown:a==="crownWithScoreRank"?(n.chartListStripMode=g.Crown,n.chartListLeadingMode=T.ScoreRank):a==="dnStyle"?n.chartListStripMode=g.DnCategory:a==="dnStyleWithCounts"&&(n.chartListStripMode=g.DnCategory,n.chartListTrailingMode=x.Counts),delete n.chartListDisplayMode}return{...S,...n,playdata:s}}return{...S,playdata:s}}catch(e){console.error("Failed to load user profile",e)}return{...S}}function Se(e){const t=j(),{playdata:s,...n}={...t,...e};try{localStorage.setItem(P,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(E):localStorage.setItem(E,JSON.stringify(s)))}catch(a){console.error("Failed to save user profile",a)}}function Oe(){try{localStorage.removeItem(E)}catch(e){console.error("Failed to clear playdata",e)}}const{JudgementMap:X,LocationMap:I}=L,Q={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new I,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoAnnotateMode:"partial",annotationToolType:"hand",autoZoom:!1,hideUnreachableBranches:!0},loadedTJAContent:M,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new I,eseClient:new J,eseTree:null,judgementClient:new $,judgements:new X,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:j().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1,isHorizontalLayout:!1},{annotationHand:ee,annotationToggleSeparator:te,annotationWithHand:ne,calculateAutoZoomBeats:se,createLayout:ae,generateAutoAnnotations:ie,getChartElementAt:R,getNotePosition:oe,HandType:O,INSETS:k,JUDGEABLE_NOTES:re,JudgementMap:w,LocationMap:A,PALETTE:b,renderChart:le,renderLayout:ce}=L;class ue extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new w;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new w;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(t=>{for(const s of t)s.type==="attributes"&&s.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const t=B(z,{children:[m("style",{children:`
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
        `}),m("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:m("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),m("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),m("canvas",{ref:s=>{s&&(this.canvas=s,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&G(this.shadowRoot,t)}exitFullscreen(){const t=document;(t.fullscreenElement||t.webkitFullscreenElement||t.mozFullScreenElement||t.msFullscreenElement)&&(t.exitFullscreen?t.exitFullscreen().catch(()=>{}):t.webkitExitFullscreen?t.webkitExitFullscreen():t.mozCancelFullScreen?t.mozCancelFullScreen():t.msExitFullscreen&&t.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(t){if(Object.hasOwn(this,t)){const s=this[t];delete this[t],this[t]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(t){this._chart!==t&&(this._chartChanged=!0),this._chart=t,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(t){this._viewOptions=t,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(t){this._judgements=t,this.scheduleRender()}get judgements(){return this._judgements}set texts(t){this._texts=t,this._pendingFullRender=!0,this.scheduleRender()}showMessage(t,s="info"){this._message={text:t,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(t,s){return!this._chart||!this._viewOptions?null:oe(this._chart,this.canvas,this._viewOptions,t,s,this._layout||void 0)}get isFullscreen(){const t=document;return!!(t.fullscreenElement||t.webkitFullscreenElement||t.mozFullScreenElement||t.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(t,s=k){if(!t.autoZoom)return;const n=this.clientWidth,a=new Map;if(this._chart?.barParams)for(const l of this._chart.barParams){const c=l.measureRatio*4;a.set(c,(a.get(c)||0)+1)}a.size===0&&a.set(4,1);const i=se(n,a,s);t.beatsPerLine!==i&&(t.beatsPerLine=i,Q.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const t=this.clientWidth||800,s=document.body.classList.contains("horizontal-layout");let n={top:20,bottom:20,left:20,right:20};if(s&&(n.left=35),this.isFullscreen&&(n={...k}),this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this.messageContainer.style.paddingTop=`${n.top}px`,this.messageContainer.style.paddingBottom=`${n.bottom}px`,this.messageContainer.style.paddingLeft=`${n.left}px`,this.messageContainer.style.paddingRight=`${n.right}px`,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=b.ui.warning.background,this.messageContainer.style.color=b.ui.warning.text):(this.messageContainer.style.backgroundColor=b.ui.streamWaiting.background,this.messageContainer.style.color=b.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const a=this.canvas.getContext("2d");if(!a)return;if(!this._chart||!this._viewOptions){this.canvas.width=t,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${t}px`,a.clearRect(0,0,this.canvas.width,this.canvas.height);return}const i={...this._viewOptions,showAttribution:this.isFullscreen};this.applyAutoZoom(i,n);const l=this._pendingFullRender||!this._layout,c=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};l&&(this._layout=ae(this._chart,this.canvas,i,this._judgements,void 0,c,n),this._pendingFullRender=!1);let u;if(!l&&this._layout){const f=[];for(const[o,r]of this._judgements){const h=this._renderedJudgements.get(o);(!h||h.judgement!==r.judgement||h.delta!==r.delta)&&f.push(o)}for(const o of this._renderedJudgements.keys())this._judgements.has(o)||f.push(o);if(f.length>0){u=new Set;const o=this._layout.noteOrdinalToGrid,r=this._layout.barFrames;for(const h of f){const y=o.get(h);if(y)for(const _ of y){const F=r[_.virtualBarIdx];F&&u.add(F.y)}}}else return}this._layout&&(ce(a,this._layout,this._chart,this._judgements,i,c,u),u?this._renderedJudgements=new w(this._judgements):this._renderedJudgements=new w(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(t){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=t.clientX-s.left,a=t.clientY-s.top,i=R(n,a,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:a,hit:i,originalEvent:t},bubbles:!0,composed:!0})),this.canvas.style.cursor=i?"pointer":"default"}handleClick(t){if(this._message||!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=t.clientX-s.left,a=t.clientY-s.top,i=R(n,a,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&i&&re.includes(i.type)){const l={barIndex:i.originalBarIndex,charIndex:i.charIndex},c=new A(this._viewOptions.annotations),u=c.get(l);if((this._viewOptions.annotationToolType||"hand")==="separator"){const o=te(u);o?c.set(l,o):c.delete(l)}else{const o=ee(u);let r;o?o===O.L?r=O.R:r=void 0:r=O.L;const h=ne(u,r);h?c.set(l,h):c.delete(l)}this.dispatchEvent(new CustomEvent("annotations-change",{detail:c,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:a,hit:i,originalEvent:t},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const t=this._viewOptions?.annotations||new A,s=ie(this._chart,t,this._viewOptions?.handAlternationThreshold,this._viewOptions?.handResetThreshold,this._viewOptions?.autoAnnotateMode);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(t){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const s={...this._viewOptions,showAttribution:!0,...t},n=document.createElement("canvas"),a=1024;return n.width=a,le(this._chart,n,this._judgements,s,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",ue);export{p as C,g as P,d as S,ue as T,Q as a,Z as b,T as c,x as d,Oe as e,pe as f,fe as g,M as h,ye as i,be as j,_e as k,j as l,Ee as m,he as n,me as o,we as p,Ce as q,ve as r,Se as s,ge as v};
