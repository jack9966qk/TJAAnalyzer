import{f as de,t as fe,N as ge,e as ce,J as W,L as Z,j as me,a as J,b as pe,g as ve,I as ie,h as Ce,P as V,i as be,r as Ee,k as oe,l as we,m as Se}from"./renderer-BNN-Vw3U.js";const _e=l=>de(l.children);function Q(l){return{bpm:l,scroll:1,measureRatio:1,gogoTime:!1,currentBarBuffer:"",currentBarBpmChanges:[],currentBarScrollChanges:[],currentBarGogoChanges:[]}}function ye(l){const e=l.split(/\r?\n/),t={},s={};let r=null,i=!1;const h={};for(let a of e)if(a=a.trim(),!!a){if(a.startsWith("COURSE:"))r=a.substring(7).trim(),t[r.toLowerCase()]=[],s[r.toLowerCase()]={},i=!1;else if(a.startsWith("#START"))i=!0;else if(a.startsWith("#END"))i=!1,r=null;else if(i&&r){const f=a.indexOf("//");f!==-1&&(a=a.substring(0,f).trim()),a&&t[r.toLowerCase()].push(a)}else if(!i){const f=a.split(":");if(f.length>=2){const o=f[0].trim().toUpperCase(),u=f.slice(1).join(":").trim();r?s[r.toLowerCase()][o]=u:h[o]=u}}}const c={};for(const a in t)if(Object.hasOwn(t,a)){const f=t[a],o={...h,...s[a]},u=o.TITLEJA||o.TITLE||"",b=o.SUBTITLEJA||o.SUBTITLE||"",_=parseFloat(o.BPM)||120,j=parseInt(o.LEVEL,10)||0,z=o.COURSE||a;let ee=[];const te=o.BALLOON;te&&(ee=te.split(/[,]+/).map(d=>parseInt(d.trim(),10)).filter(d=>!Number.isNaN(d)));const T=[],F=[],k=[],N=[],A=[],I=[],G=Q(_),P=Q(_),D=Q(_),g=(d,v,C,n,B,H=!1,ue)=>{let ne=n.bpm,re=n.scroll,$=n.gogoTime,q=!0;for(const R of d){if(R.startsWith("#")){const S=R.toUpperCase();if(S.startsWith("#BPMCHANGE")){const m=R.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(n.bpm=p,n.currentBarBpmChanges.push({index:n.currentBarBuffer.length,bpm:p}))}}else if(S.startsWith("#BPM:")){const m=parseFloat(R.substring(5));Number.isNaN(m)||(n.bpm=m,n.currentBarBpmChanges.push({index:n.currentBarBuffer.length,bpm:m}))}else if(S.startsWith("#SCROLL")){const m=R.split(/[:\s]+/);if(m.length>=2){const p=parseFloat(m[1]);Number.isNaN(p)||(n.scroll=p,n.currentBarScrollChanges.push({index:n.currentBarBuffer.length,scroll:p}))}}else if(S.startsWith("#MEASURE")){const m=R.split(/[:\s]+/);if(m.length>=2){const p=m[1].split("/");if(p.length===2){const ae=parseFloat(p[0]),X=parseFloat(p[1]);!Number.isNaN(ae)&&!Number.isNaN(X)&&X!==0&&(n.measureRatio=ae/X)}}}else S.startsWith("#GOGOSTART")?(n.gogoTime=!0,n.currentBarGogoChanges.push({index:n.currentBarBuffer.length,isGogo:!0}),n.currentBarBuffer.length===0&&($=!0)):S.startsWith("#GOGOEND")&&(n.gogoTime=!1,n.currentBarGogoChanges.push({index:n.currentBarBuffer.length,isGogo:!1}),n.currentBarBuffer.length===0&&($=!1));continue}let U=R;for(;;){const S=U.indexOf(",");if(S===-1){n.currentBarBuffer+=U;break}else{const m=U.substring(0,S);n.currentBarBuffer+=m;const p=n.currentBarBuffer.trim();p.length===0?v.push([]):v.push(p.split("").map(fe)),C.push({bpm:ne,scroll:re,measureRatio:n.measureRatio,gogoTime:$,isBranched:B,isBranchStart:B&&H&&q,branchStartParams:B&&H&&q?ue:void 0,bpmChanges:n.currentBarBpmChanges.length>0?[...n.currentBarBpmChanges]:void 0,scrollChanges:n.currentBarScrollChanges.length>0?[...n.currentBarScrollChanges]:void 0,gogoChanges:n.currentBarGogoChanges.length>0?[...n.currentBarGogoChanges]:void 0}),q=!1,ne=n.bpm,re=n.scroll,$=n.gogoTime,n.currentBarBpmChanges=[],n.currentBarScrollChanges=[],n.currentBarGogoChanges=[],n.currentBarBuffer="",U=U.substring(S+1)}}}};let w=[],M=[],y=[],O=[],x=!1,L="n",se=!1,E;for(const d of f){const v=d.toUpperCase().trim();if(v.startsWith("#BRANCHSTART")){se=!0;const C=d.split(/[, \s]+/);if(C.length>=4?E={type:C[1].toLowerCase(),p1:parseFloat(C[2]),p2:parseFloat(C[3])}:E=void 0,w.length>0&&(g(w,T,F,G,!1),g(w,k,N,P,!1),g(w,A,I,D,!1),w=[]),x){const n=M,B=y.length>0?y:n,H=O.length>0?O:B;g(n,T,F,G,!0,!0,E),g(B,k,N,P,!0,!0,E),g(H,A,I,D,!0,!0,E)}x=!0,L="n",M=[],y=[],O=[]}else if(v.startsWith("#BRANCHEND")){const C=M,n=y.length>0?y:C,B=O.length>0?O:n;g(C,T,F,G,!0,!0,E),g(n,k,N,P,!0,!0,E),g(B,A,I,D,!0,!0,E),x=!1,M=[],y=[],O=[]}else x&&v==="#N"?L="n":x&&v==="#E"?L="e":x&&v==="#M"?L="m":x?L==="n"?M.push(d):L==="e"?y.push(d):L==="m"&&O.push(d):w.push(d)}if(x){const d=M,v=y.length>0?y:d,C=O.length>0?O:v;g(d,T,F,G,!0,!0,E),g(v,k,N,P,!0,!0,E),g(C,A,I,D,!0,!0,E)}else w.length>0&&(g(w,T,F,G,!1),g(w,k,N,P,!1),g(w,A,I,D,!1));const K=(d,v,C)=>({bars:d,barParams:v,loop:Oe(d),balloonCounts:ee,headers:o,title:u,subtitle:b,bpm:_,level:j,course:z,branchType:C}),Y=K(T,F,"normal");se&&(Y.branches={normal:Y,expert:K(k,N,"expert"),master:K(A,I,"master")}),c[a]=Y}return c}function Oe(l){let e=-1;for(let s=0;s<l.length;s++)if(!le(l[s])){e=s;break}if(e===-1)return;const t=l.length-e;for(let s=1;s<=t/2;s++){const r=l.slice(e,e+s);let i=0,h=e;for(;h+s<=l.length;){let c=!0;for(let a=0;a<s;a++)if(!xe(l[h+a],r[a])){c=!1;break}if(c)i++,h+=s;else break}if(i>=2){let c=!0;for(let a=h;a<l.length;a++)if(!le(l[a])){c=!1;break}if(c)return{startBarIndex:e,period:s,iterations:i}}}}function le(l){return l.length===0?!0:l.every(e=>e===ge.None)}function xe(l,e){if(l.length!==e.length)return!1;for(let t=0;t<l.length;t++)if(l[t]!==e[t])return!1;return!0}class Be{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let t;const s=await e.json();return Array.isArray(s)?t=s:typeof s=="object"&&s!==null&&"files"in s&&Array.isArray(s.files)?t=s.files:t=[],this.treeCache=t,t}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const s=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,r=await fetch(s);if(!r.ok)throw new Error(`Failed to fetch file: ${r.status} ${r.statusText}`);return await r.text()}catch(t){throw console.error("Error fetching file content:",t),new Error("Failed to load song content.")}}}const he=`//TJADB Project
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
`;class Le{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,t){this.disconnect();const s=`http://${e}:${t}/`;console.log(`Connecting to ${s}...`);try{this.eventSource=new EventSource(s),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=r=>{try{const i=JSON.parse(r.data);this.onMessageCallback&&this.onMessageCallback(i)}catch(i){r.data&&r.data.trim()!==""&&console.error("Failed to parse event data",i,r.data)}},this.eventSource.onerror=r=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(r){console.error("Connection error:",r),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,t){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const s=e||he,r=t||"oni";if(this.onMessageCallback){const o={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:s,difficulty:r}]};this.onMessageCallback(o)}const i=ye(s),h=i[r]||Object.values(i)[0];if(!h){console.error("Simulation failed: Could not parse chart");return}const c=[],a={};for(const o of h.bars)for(const u of o)ce.includes(u)&&(a[u]===void 0&&(a[u]=0),c.push({type:u,ordinal:a[u]}),a[u]++);let f=0;this.simulateInterval=window.setInterval(()=>{if(f>=c.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const o=c[f];f++;const u=Math.random();let b="perfect";u<.9?b="perfect":u<.99?b="good":b="poor";const _=Math.floor(Math.random()*100)-50,j={type:"judgement",judgement:b,msDelta:_,noteChar:o.type,noteOrdinalByChar:o.ordinal};this.onMessageCallback&&this.onMessageCallback(j)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}const Re={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new Z,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1},loadedTJAContent:he,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new Z,eseClient:new Be,eseTree:null,judgementClient:new Le,judgements:new W,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:!1,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1};class Te extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new W;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new W;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const t of e)t.type==="attributes"&&t.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=me(_e,{children:[J("style",{children:`
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
        `}),J("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:J("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),J("div",{id:"message-container",className:"hidden",ref:t=>{this.messageContainer=t}}),J("canvas",{ref:t=>{t&&(this.canvas=t,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&pe(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const t=this[e];delete this[e],this[e]=t}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,t="info"){this._message={text:e,type:t},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,t){return!this._chart||!this._viewOptions?null:ve(this._chart,this.canvas,this._viewOptions,e,t,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e,t=ie){if(!e.autoZoom)return;const s=this.clientWidth,r=new Map;if(this._chart?.barParams)for(const h of this._chart.barParams){const c=h.measureRatio*4;r.set(c,(r.get(c)||0)+1)}r.size===0&&r.set(4,1);const i=Ce(s,r,t);e.beatsPerLine!==i&&(e.beatsPerLine=i,Re.viewOptions.beatsPerLine=i,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=V.ui.warning.background,this.messageContainer.style.color=V.ui.warning.text):(this.messageContainer.style.backgroundColor=V.ui.streamWaiting.background,this.messageContainer.style.color=V.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const t=this.canvas.getContext("2d");if(!t)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,t.clearRect(0,0,this.canvas.width,this.canvas.height);return}const s={...this._viewOptions,showAttribution:this.isFullscreen},r=document.body.classList.contains("horizontal-layout");let i={top:20,bottom:20,left:20,right:20};r&&(i.left=35),this.isFullscreen&&(i={...ie}),this.applyAutoZoom(s,i);const h=this._pendingFullRender||!this._layout,c=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};h&&(this._layout=be(this._chart,this.canvas,s,this._judgements,void 0,c,i),this._pendingFullRender=!1);let a;if(!h&&this._layout){const f=[];for(const[o,u]of this._judgements){const b=this._renderedJudgements.get(o);(!b||b.judgement!==u.judgement||b.delta!==u.delta)&&f.push(o)}for(const o of this._renderedJudgements.keys())this._judgements.has(o)||f.push(o);if(f.length>0){a=new Set;const o=this._layout.noteOrdinalToGrid,u=this._layout.barFrames;for(const b of f){const _=o.get(b);if(_)for(const j of _){const z=u[j.virtualBarIdx];z&&a.add(z.y)}}}else return}this._layout&&(Ee(t,this._layout,this._chart,this._judgements,s,c,a),a?this._renderedJudgements=new W(this._judgements):this._renderedJudgements=new W(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),s=e.clientX-t.left,r=e.clientY-t.top,i=oe(s,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:s,y:r,hit:i,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=i?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const t=this.canvas.getBoundingClientRect(),s=e.clientX-t.left,r=e.clientY-t.top,i=oe(s,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&i&&ce.includes(i.type)){const h={barIndex:i.originalBarIndex,charIndex:i.charIndex},c=new Z(this._viewOptions.annotations),a=c.get(h);a?a==="L"?c.set(h,"R"):c.delete(h):c.set(h,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:c,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:s,y:r,hit:i,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new Z,t=we(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:t,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const t={...this._viewOptions,showAttribution:!0,...e},s=document.createElement("canvas"),r=1024;return s.width=r,Se(this._chart,s,this._judgements,t,this._texts,1),s.toDataURL("image/png")}}customElements.define("tja-chart",Te);export{Te as T,Re as a,he as e,ye as p};
