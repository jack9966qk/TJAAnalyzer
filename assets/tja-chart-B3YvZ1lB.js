import{f as pe,t as ve,N as Ce,e as ue,J as z,L as Y,j as be,a as J,b as Ee,g as Se,I as le,h as ye,P as $,i as we,r as _e,k as ce,l as Oe,m as Le}from"./renderer-BNN-Vw3U.js";const xe=o=>pe(o.children);function ee(o){return{bpm:o,scroll:1,measureRatio:1,gogoTime:!1,currentBarBuffer:"",currentBarBpmChanges:[],currentBarScrollChanges:[],currentBarGogoChanges:[]}}function Re(o){const e=o.split(/\r?\n/),t={},s={};let n=null,i=!1;const h={};for(let a of e)if(a=a.trim(),!!a){if(a.startsWith("COURSE:"))n=a.substring(7).trim(),t[n.toLowerCase()]=[],s[n.toLowerCase()]={},i=!1;else if(a.startsWith("#START"))i=!0;else if(a.startsWith("#END"))i=!1,n=null;else if(i&&n){const f=a.indexOf("//");f!==-1&&(a=a.substring(0,f).trim()),a&&t[n.toLowerCase()].push(a)}else if(!i){const f=a.split(":");if(f.length>=2){const l=f[0].trim().toUpperCase(),u=f.slice(1).join(":").trim();n?s[n.toLowerCase()][l]=u:h[l]=u}}}const c={};for(const a in t)if(Object.hasOwn(t,a)){const f=t[a],l={...h,...s[a]},u=l.TITLEJA||l.TITLE||"",b=l.SUBTITLEJA||l.SUBTITLE||"",w=parseFloat(l.BPM)||120,P=parseInt(l.LEVEL,10)||0,W=l.COURSE||a;let se=[];const ne=l.BALLOON;ne&&(se=ne.split(/[,]+/).map(d=>parseInt(d.trim(),10)).filter(d=>!Number.isNaN(d)));const T=[],F=[],N=[],A=[],k=[],I=[],j=ee(w),G=ee(w),D=ee(w),g=(d,v,C,r,x,H=!1,me)=>{let ae=r.bpm,ie=r.scroll,V=r.gogoTime,X=!0;for(const B of d){if(B.startsWith("#")){const y=B.toUpperCase();if(y.startsWith("#BPMCHANGE")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(r.bpm=p,r.currentBarBpmChanges.push({index:r.currentBarBuffer.length,bpm:p}))}}else if(y.startsWith("#BPM:")){const m=parseFloat(B.substring(5));Number.isNaN(m)||(r.bpm=m,r.currentBarBpmChanges.push({index:r.currentBarBuffer.length,bpm:m}))}else if(y.startsWith("#SCROLL")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(r.scroll=p,r.currentBarScrollChanges.push({index:r.currentBarBuffer.length,scroll:p}))}}else if(y.startsWith("#MEASURE")){const m=B.split(/[:\s]+/);if(m.length>=2){const p=m[1].split("/");if(p.length===2){const oe=parseFloat(p[0]),Q=parseFloat(p[1]);!Number.isNaN(oe)&&!Number.isNaN(Q)&&Q!==0&&(r.measureRatio=oe/Q)}}}else y.startsWith("#GOGOSTART")?(r.gogoTime=!0,r.currentBarGogoChanges.push({index:r.currentBarBuffer.length,isGogo:!0}),r.currentBarBuffer.length===0&&(V=!0)):y.startsWith("#GOGOEND")&&(r.gogoTime=!1,r.currentBarGogoChanges.push({index:r.currentBarBuffer.length,isGogo:!1}),r.currentBarBuffer.length===0&&(V=!1));continue}let U=B;for(;;){const y=U.indexOf(",");if(y===-1){r.currentBarBuffer+=U;break}else{const m=U.substring(0,y);r.currentBarBuffer+=m;const p=r.currentBarBuffer.trim();p.length===0?v.push([]):v.push(p.split("").map(ve)),C.push({bpm:ae,scroll:ie,measureRatio:r.measureRatio,gogoTime:V,isBranched:x,isBranchStart:x&&H&&X,branchStartParams:x&&H&&X?me:void 0,bpmChanges:r.currentBarBpmChanges.length>0?[...r.currentBarBpmChanges]:void 0,scrollChanges:r.currentBarScrollChanges.length>0?[...r.currentBarScrollChanges]:void 0,gogoChanges:r.currentBarGogoChanges.length>0?[...r.currentBarGogoChanges]:void 0}),X=!1,ae=r.bpm,ie=r.scroll,V=r.gogoTime,r.currentBarBpmChanges=[],r.currentBarScrollChanges=[],r.currentBarGogoChanges=[],r.currentBarBuffer="",U=U.substring(y+1)}}}};let S=[],M=[],_=[],O=[],L=!1,R="n",re=!1,E;for(const d of f){const v=d.toUpperCase().trim();if(v.startsWith("#BRANCHSTART")){re=!0;const C=d.split(/[, \s]+/);if(C.length>=4?E={type:C[1].toLowerCase(),p1:parseFloat(C[2]),p2:parseFloat(C[3])}:E=void 0,S.length>0&&(g(S,T,F,j,!1),g(S,N,A,G,!1),g(S,k,I,D,!1),S=[]),L){const r=M,x=_.length>0?_:r,H=O.length>0?O:x;g(r,T,F,j,!0,!0,E),g(x,N,A,G,!0,!0,E),g(H,k,I,D,!0,!0,E)}L=!0,R="n",M=[],_=[],O=[]}else if(v.startsWith("#BRANCHEND")){const C=M,r=_.length>0?_:C,x=O.length>0?O:r;g(C,T,F,j,!0,!0,E),g(r,N,A,G,!0,!0,E),g(x,k,I,D,!0,!0,E),L=!1,M=[],_=[],O=[]}else L&&v==="#N"?R="n":L&&v==="#E"?R="e":L&&v==="#M"?R="m":L?R==="n"?M.push(d):R==="e"?_.push(d):R==="m"&&O.push(d):S.push(d)}if(L){const d=M,v=_.length>0?_:d,C=O.length>0?O:v;g(d,T,F,j,!0,!0,E),g(v,N,A,G,!0,!0,E),g(C,k,I,D,!0,!0,E)}else S.length>0&&(g(S,T,F,j,!1),g(S,N,A,G,!1),g(S,k,I,D,!1));const Z=(d,v,C)=>({bars:d,barParams:v,loop:Be(d),balloonCounts:se,headers:l,title:u,subtitle:b,bpm:w,level:P,course:W,branchType:C}),q=Z(T,F,"normal");re&&(q.branches={normal:q,expert:Z(N,A,"expert"),master:Z(k,I,"master")}),c[a]=q}return c}function Be(o){let e=-1;for(let s=0;s<o.length;s++)if(!he(o[s])){e=s;break}if(e===-1)return;const t=o.length-e;for(let s=1;s<=t/2;s++){const n=o.slice(e,e+s);let i=0,h=e;for(;h+s<=o.length;){let c=!0;for(let a=0;a<s;a++)if(!Te(o[h+a],n[a])){c=!1;break}if(c)i++,h+=s;else break}if(i>=2){let c=!0;for(let a=h;a<o.length;a++)if(!he(o[a])){c=!1;break}if(c)return{startBarIndex:e,period:s,iterations:i}}}}function he(o){return o.length===0?!0:o.every(e=>e===Ce.None)}function Te(o,e){if(o.length!==e.length)return!1;for(let t=0;t<o.length;t++)if(o[t]!==e[t])return!1;return!0}class Fe{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let t;const s=await e.json();return Array.isArray(s)?t=s:typeof s=="object"&&s!==null&&"files"in s&&Array.isArray(s.files)?t=s.files:t=[],this.treeCache=t,t}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const s=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,n=await fetch(s);if(!n.ok)throw new Error(`Failed to fetch file: ${n.status} ${n.statusText}`);return await n.text()}catch(t){throw console.error("Error fetching file content:",t),new Error("Failed to load song content.")}}}const de=`//TJADB Project
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
`;class Ne{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,t){this.disconnect();const s=`http://${e}:${t}/`;console.log(`Connecting to ${s}...`);try{this.eventSource=new EventSource(s),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=n=>{try{const i=JSON.parse(n.data);this.onMessageCallback&&this.onMessageCallback(i)}catch(i){n.data&&n.data.trim()!==""&&console.error("Failed to parse event data",i,n.data)}},this.eventSource.onerror=n=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(n){console.error("Connection error:",n),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,t){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const s=e||de,n=t||"oni";if(this.onMessageCallback){const l={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:s,difficulty:n}]};this.onMessageCallback(l)}const i=Re(s),h=i[n]||Object.values(i)[0];if(!h){console.error("Simulation failed: Could not parse chart");return}const c=[],a={};for(const l of h.bars)for(const u of l)ue.includes(u)&&(a[u]===void 0&&(a[u]=0),c.push({type:u,ordinal:a[u]}),a[u]++);let f=0;this.simulateInterval=window.setInterval(()=>{if(f>=c.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const l=c[f];f++;const u=Math.random();let b="perfect";u<.9?b="perfect":u<.99?b="good":b="poor";const w=Math.floor(Math.random()*100)-50,P={type:"judgement",judgement:b,msDelta:w,noteChar:l.type,noteOrdinalByChar:l.ordinal};this.onMessageCallback&&this.onMessageCallback(P)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}const fe="tja_analyzer_profile",K="tja_analyzer_playdata",Ae=2,te={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1};function ge(){try{const o=localStorage.getItem(fe),e=localStorage.getItem(K);let t=null;if(e)try{const s=JSON.parse(e);s.version===Ae?t=s:console.warn("Playdata version mismatch, discarding old data.")}catch(s){console.error("Failed to parse playdata",s)}if(o){const s=JSON.parse(o);return{...te,...s,playdata:t}}return{...te,playdata:t}}catch(o){console.error("Failed to load user profile",o)}return{...te}}function Pe(o){const e=ge(),{playdata:t,...s}={...e,...o};try{localStorage.setItem(fe,JSON.stringify(s)),t!==void 0&&(t===null?localStorage.removeItem(K):localStorage.setItem(K,JSON.stringify(t)))}catch(n){console.error("Failed to save user profile",n)}}function je(){try{localStorage.removeItem(K)}catch(o){console.error("Failed to clear playdata",o)}}const ke={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new Y,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1},loadedTJAContent:de,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new Y,eseClient:new Fe,eseTree:null,judgementClient:new Ne,judgements:new z,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:ge().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1};class Ie extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new z;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new z;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=be(xe,{children:[J("style",{children:`
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
        `}),J("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:J("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),J("div",{id:"message-container",className:"hidden",ref:t=>{this.messageContainer=t}}),J("canvas",{ref:t=>{t&&(this.canvas=t,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&Ee(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const t=this[e];delete this[e],this[e]=t}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,t="info"){this._message={text:e,type:t},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,t){return!this._chart||!this._viewOptions?null:Se(this._chart,this.canvas,this._viewOptions,e,t,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e,t=le){if(!e.autoZoom)return;const s=this.clientWidth,n=new Map;if(this._chart?.barParams)for(const h of this._chart.barParams){const c=h.measureRatio*4;n.set(c,(n.get(c)||0)+1)}n.size===0&&n.set(4,1);const i=ye(s,n,t);e.beatsPerLine!==i&&(e.beatsPerLine=i,ke.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=$.ui.warning.background,this.messageContainer.style.color=$.ui.warning.text):(this.messageContainer.style.backgroundColor=$.ui.streamWaiting.background,this.messageContainer.style.color=$.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const t=this.canvas.getContext("2d");if(!t)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,t.clearRect(0,0,this.canvas.width,this.canvas.height);return}const s={...this._viewOptions,showAttribution:this.isFullscreen},n=document.body.classList.contains("horizontal-layout");let i={top:20,bottom:20,left:20,right:20};n&&(i.left=35),this.isFullscreen&&(i={...le}),this.applyAutoZoom(s,i);const h=this._pendingFullRender||!this._layout,c=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};h&&(this._layout=we(this._chart,this.canvas,s,this._judgements,void 0,c,i),this._pendingFullRender=!1);let a;if(!h&&this._layout){const f=[];for(const[l,u]of this._judgements){const b=this._renderedJudgements.get(l);(!b||b.judgement!==u.judgement||b.delta!==u.delta)&&f.push(l)}for(const l of this._renderedJudgements.keys())this._judgements.has(l)||f.push(l);if(f.length>0){a=new Set;const l=this._layout.noteOrdinalToGrid,u=this._layout.barFrames;for(const b of f){const w=l.get(b);if(w)for(const P of w){const W=u[P.virtualBarIdx];W&&a.add(W.y)}}}else return}this._layout&&(_e(t,this._layout,this._chart,this._judgements,s,c,a),a?this._renderedJudgements=new z(this._judgements):this._renderedJudgements=new z(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),s=e.clientX-t.left,n=e.clientY-t.top,i=ce(s,n,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:s,y:n,hit:i,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=i?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),s=e.clientX-t.left,n=e.clientY-t.top,i=ce(s,n,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&i&&ue.includes(i.type)){const h={barIndex:i.originalBarIndex,charIndex:i.charIndex},c=new Y(this._viewOptions.annotations),a=c.get(h);a?a==="L"?c.set(h,"R"):c.delete(h):c.set(h,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:c,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:s,y:n,hit:i,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new Y,t=Oe(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:t,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const t={...this._viewOptions,showAttribution:!0,...e},s=document.createElement("canvas"),n=1024;return s.width=n,Le(this._chart,s,this._judgements,t,this._texts,1),s.toDataURL("image/png")}}customElements.define("tja-chart",Ie);export{Ie as T,ke as a,je as c,de as e,ge as l,Re as p,Pe as s};
