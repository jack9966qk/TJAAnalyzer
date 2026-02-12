import{f as Oe,t as Ie,N as xe,e as Ce,J as Y,L as ee,j as Ne,a as q,b as Le,g as Re,I as de,h as Te,P as X,i as ke,r as Be,k as fe,l as Fe,m as Ae}from"./renderer-BNN-Vw3U.js";const Pe=t=>Oe(t.children);function oe(t){return{bpm:t,scroll:1,measureRatio:1,gogoTime:!1,currentBarBuffer:"",currentBarBpmChanges:[],currentBarScrollChanges:[],currentBarGogoChanges:[]}}function Me(t){const e=t.split(/\r?\n/),s={},n={};let r=null,o=!1;const u={};for(let a of e)if(a=a.trim(),!!a){if(a.startsWith("COURSE:"))r=a.substring(7).trim(),s[r.toLowerCase()]=[],n[r.toLowerCase()]={},o=!1;else if(a.startsWith("#START"))o=!0;else if(a.startsWith("#END"))o=!1,r=null;else if(o&&r){const f=a.indexOf("//");f!==-1&&(a=a.substring(0,f).trim()),a&&s[r.toLowerCase()].push(a)}else if(!o){const f=a.split(":");if(f.length>=2){const c=f[0].trim().toUpperCase(),h=f.slice(1).join(":").trim();r?n[r.toLowerCase()][c]=h:u[c]=h}}}const l={};for(const a in s)if(Object.hasOwn(s,a)){const f=s[a],c={...u,...n[a]},h=c.TITLEJA||c.TITLE||"",v=c.SUBTITLEJA||c.SUBTITLE||"",E=parseFloat(c.BPM)||120,T=parseInt(c.LEVEL,10)||0,G=c.COURSE||a;let J=[];const H=c.BALLOON;H&&(J=H.split(/[,]+/).map(p=>parseInt(p.trim(),10)).filter(p=>!Number.isNaN(p)));const S=[],k=[],B=[],F=[],A=[],P=[],g=oe(E),d=oe(E),I=oe(E),m=(p,w,_,i,j,V=!1,Se)=>{let ce=i.bpm,ue=i.scroll,Z=i.gogoTime,re=!0;for(const W of p){if(W.startsWith("#")){const N=W.toUpperCase();if(N.startsWith("#BPMCHANGE")){const b=W.split(/[:\s]+/);if(b.length>=2){const y=parseFloat(b[1]);Number.isNaN(y)||(i.bpm=y,i.currentBarBpmChanges.push({index:i.currentBarBuffer.length,bpm:y}))}}else if(N.startsWith("#BPM:")){const b=parseFloat(W.substring(5));Number.isNaN(b)||(i.bpm=b,i.currentBarBpmChanges.push({index:i.currentBarBuffer.length,bpm:b}))}else if(N.startsWith("#SCROLL")){const b=W.split(/[:\s]+/);if(b.length>=2){const y=parseFloat(b[1]);Number.isNaN(y)||(i.scroll=y,i.currentBarScrollChanges.push({index:i.currentBarBuffer.length,scroll:y}))}}else if(N.startsWith("#MEASURE")){const b=W.split(/[:\s]+/);if(b.length>=2){const y=b[1].split("/");if(y.length===2){const he=parseFloat(y[0]),ae=parseFloat(y[1]);!Number.isNaN(he)&&!Number.isNaN(ae)&&ae!==0&&(i.measureRatio=he/ae)}}}else N.startsWith("#GOGOSTART")?(i.gogoTime=!0,i.currentBarGogoChanges.push({index:i.currentBarBuffer.length,isGogo:!0}),i.currentBarBuffer.length===0&&(Z=!0)):N.startsWith("#GOGOEND")&&(i.gogoTime=!1,i.currentBarGogoChanges.push({index:i.currentBarBuffer.length,isGogo:!1}),i.currentBarBuffer.length===0&&(Z=!1));continue}let $=W;for(;;){const N=$.indexOf(",");if(N===-1){i.currentBarBuffer+=$;break}else{const b=$.substring(0,N);i.currentBarBuffer+=b;const y=i.currentBarBuffer.trim();y.length===0?w.push([]):w.push(y.split("").map(Ie)),_.push({bpm:ce,scroll:ue,measureRatio:i.measureRatio,gogoTime:Z,isBranched:j,isBranchStart:j&&V&&re,branchStartParams:j&&V&&re?Se:void 0,bpmChanges:i.currentBarBpmChanges.length>0?[...i.currentBarBpmChanges]:void 0,scrollChanges:i.currentBarScrollChanges.length>0?[...i.currentBarScrollChanges]:void 0,gogoChanges:i.currentBarGogoChanges.length>0?[...i.currentBarGogoChanges]:void 0}),re=!1,ce=i.bpm,ue=i.scroll,Z=i.gogoTime,i.currentBarBpmChanges=[],i.currentBarScrollChanges=[],i.currentBarGogoChanges=[],i.currentBarBuffer="",$=$.substring(N+1)}}}};let x=[],U=[],L=[],R=[],M=!1,D="n",le=!1,O;for(const p of f){const w=p.toUpperCase().trim();if(w.startsWith("#BRANCHSTART")){le=!0;const _=p.split(/[, \s]+/);if(_.length>=4?O={type:_[1].toLowerCase(),p1:parseFloat(_[2]),p2:parseFloat(_[3])}:O=void 0,x.length>0&&(m(x,S,k,g,!1),m(x,B,F,d,!1),m(x,A,P,I,!1),x=[]),M){const i=U,j=L.length>0?L:i,V=R.length>0?R:j;m(i,S,k,g,!0,!0,O),m(j,B,F,d,!0,!0,O),m(V,A,P,I,!0,!0,O)}M=!0,D="n",U=[],L=[],R=[]}else if(w.startsWith("#BRANCHEND")){const _=U,i=L.length>0?L:_,j=R.length>0?R:i;m(_,S,k,g,!0,!0,O),m(i,B,F,d,!0,!0,O),m(j,A,P,I,!0,!0,O),M=!1,U=[],L=[],R=[]}else M&&w==="#N"?D="n":M&&w==="#E"?D="e":M&&w==="#M"?D="m":M?D==="n"?U.push(p):D==="e"?L.push(p):D==="m"&&R.push(p):x.push(p)}if(M){const p=U,w=L.length>0?L:p,_=R.length>0?R:w;m(p,S,k,g,!0,!0,O),m(w,B,F,d,!0,!0,O),m(_,A,P,I,!0,!0,O)}else x.length>0&&(m(x,S,k,g,!1),m(x,B,F,d,!1),m(x,A,P,I,!1));const ne=(p,w,_)=>({bars:p,barParams:w,loop:je(p),balloonCounts:J,headers:c,title:h,subtitle:v,bpm:E,level:T,course:G,branchType:_}),se=ne(S,k,"normal");le&&(se.branches={normal:se,expert:ne(B,F,"expert"),master:ne(A,P,"master")}),l[a]=se}return l}function je(t){let e=-1;for(let n=0;n<t.length;n++)if(!ge(t[n])){e=n;break}if(e===-1)return;const s=t.length-e;for(let n=1;n<=s/2;n++){const r=t.slice(e,e+n);let o=0,u=e;for(;u+n<=t.length;){let l=!0;for(let a=0;a<n;a++)if(!Ge(t[u+a],r[a])){l=!1;break}if(l)o++,u+=n;else break}if(o>=2){let l=!0;for(let a=u;a<t.length;a++)if(!ge(t[a])){l=!1;break}if(l)return{startBarIndex:e,period:n,iterations:o}}}}function ge(t){return t.length===0?!0:t.every(e=>e===xe.None)}function Ge(t,e){if(t.length!==e.length)return!1;for(let s=0;s<t.length;s++)if(t[s]!==e[s])return!1;return!0}class De{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let s;const n=await e.json();return Array.isArray(n)?s=n:typeof n=="object"&&n!==null&&"files"in n&&Array.isArray(n.files)?s=n.files:s=[],this.treeCache=s,s}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const n=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,r=await fetch(n);if(!r.ok)throw new Error(`Failed to fetch file: ${r.status} ${r.statusText}`);return await r.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const be=`//TJADB Project
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
`;class We{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,s){this.disconnect();const n=`http://${e}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=r=>{try{const o=JSON.parse(r.data);this.onMessageCallback&&this.onMessageCallback(o)}catch(o){r.data&&r.data.trim()!==""&&console.error("Failed to parse event data",o,r.data)}},this.eventSource.onerror=r=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(r){console.error("Connection error:",r),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=e||be,r=s||"oni";if(this.onMessageCallback){const c={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:r}]};this.onMessageCallback(c)}const o=Me(n),u=o[r]||Object.values(o)[0];if(!u){console.error("Simulation failed: Could not parse chart");return}const l=[],a={};for(const c of u.bars)for(const h of c)Ce.includes(h)&&(a[h]===void 0&&(a[h]=0),l.push({type:h,ordinal:a[h]}),a[h]++);let f=0;this.simulateInterval=window.setInterval(()=>{if(f>=l.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const c=l[f];f++;const h=Math.random();let v="perfect";h<.9?v="perfect":h<.99?v="good":v="poor";const E=Math.floor(Math.random()*100)-50,T={type:"judgement",judgement:v,msDelta:E,noteChar:c.type,noteOrdinalByChar:c.ordinal};this.onMessageCallback&&this.onMessageCallback(T)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}var z=(t=>(t[t.None=0]="None",t[t.Clear=1]="Clear",t[t.FullCombo=2]="FullCombo",t[t.Perfect=3]="Perfect",t))(z||{}),C=(t=>(t[t.None=0]="None",t[t.White=1]="White",t[t.Bronze=2]="Bronze",t[t.Silver=3]="Silver",t[t.Gold=4]="Gold",t[t.Pink=5]="Pink",t[t.Purple=6]="Purple",t[t.Rainbow=7]="Rainbow",t))(C||{});const me={difficulty_easy_color:1,difficulty_normal_color:2,difficulty_hard_color:3,difficulty_extreme_color:4,difficulty_hidden_color:5},pe={crown_clear:1,crown_full:2,crown_preDonderfull:2,crown_donderfull:3},ve={scoreRank_white:1,scoreRank_bronze:2,scoreRank_silver:3,scoreRank_gold:4,scoreRank_pink:5,scoreRank_purple:6,scoreRank_rainbow:7};function ze(t){return t.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}function Ze(t){const s=new DOMParser().parseFromString(t,"text/html");let n="";const r=Array.from(s.querySelectorAll("p"));for(const l of r){const a=l.textContent?.trim()||"";if(a.includes("最終更新：")){n=a.replace("最終更新：","").trim();break}}const o=[],u=Array.from(s.querySelectorAll("div.filter_selector"));for(const l of u)try{const a=l.querySelector(".table_song_name a"),f=a?.textContent?.trim();if(!f)continue;let c=0,h=0;if(a){const g=a.getAttribute("href");if(g){const d=g.match(/\/song\/(\d+)-(\d+)\//);d&&(c=parseInt(d[1],10),h=parseInt(d[2],10))}}if(h===0){const g=l.querySelector(".table_difficulty");if(g){const d=g.className.split(" ");for(const I of d)if(me[I]!==void 0){h=me[I];break}}}let v=0;const E=l.querySelector(".table_crown img");if(E){const g=E.getAttribute("src")||"";for(const d in pe)if(g.includes(d)){v=pe[d];break}}let T=0;const G=l.querySelector(".table_scorerank img");if(G){const g=G.getAttribute("src")||"";for(const d in ve)if(g.includes(d)){T=ve[d];break}}let J=0;const H=l.querySelector(".table_totalscore");if(H){const g=H.textContent?.trim().replace(/[,点]/g,"")||"",d=Number.parseInt(g,10);Number.isNaN(d)||(J=d)}const S=g=>{const d=l.querySelector(`.${g}`);if(d){const I=d.textContent?.trim().replace(/,/g,"")||"",m=Number.parseInt(I,10);if(!Number.isNaN(m))return m}return 0},k=S("table_good"),B=S("table_ok"),F=S("table_bad"),A=S("table_combo"),P=S("table_roll");o.push({title:ze(f),difficulty:h,score:J,great:k,good:B,bad:F,combo:A,drumroll:P,songId:c,crown:v,scoreRank:T})}catch(a){console.error("Error parsing row:",a)}return{entries:o,updatedAt:n,source:"fumen-database"}}const Ue={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function Xe(t){if(!t||!t.entries)return{totalSongs:0,byDifficulty:{}};const e={};for(const s of t.entries){const n=Ue[s.difficulty]||`Level ${s.difficulty}`;e[n]=(e[n]||0)+1}return{totalSongs:t.entries.length,byDifficulty:e}}function Qe(t,e){const s=[],n=[];return t.entries.forEach((r,o)=>{const u=r.songId.toString();if(r.songId!==0&&e[u]){const{title:l,...a}=r;s.push({...a,songId:u})}else n.push({entry:r,originalIndex:o})}),{matched:s,unmatched:n}}async function et(t){const e=[];let s=0;for(const n of t.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const r=Number.parseInt(n.songId,10);if(Number.isNaN(r)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}e.push([r,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,t.updatedAt])}return{data:e,exportedCount:e.length,skippedCount:s}}var ye=(t=>(t.None="none",t.Crown="crown",t.CrownWithScoreRank="crownWithScoreRank",t.DnStyle="dnStyle",t.DnStyleWithCounts="dnStyleWithCounts",t))(ye||{});let Q=null,K=null;async function we(){if(Q)return Q;try{const t=await fetch("./data/song_mapping.json");return t.ok?(Q=await t.json(),Q||{}):(console.error("Failed to load song mapping:",t.status),{})}catch(t){return console.error("Error loading song mapping:",t),{}}}async function Je(){if(K)return K;const t=await we(),e=new Map;for(const[s,n]of Object.entries(t))n.esePath&&e.set(n.esePath,s);return K=e,e}function tt(t){switch(t){case z.Perfect:return"status-perfect";case z.FullCombo:return"status-fullcombo";case z.Clear:return"status-played";default:return""}}function nt(t){switch(t){case C.White:case C.Bronze:case C.Silver:return"粋";case C.Gold:case C.Pink:case C.Purple:return"雅";case C.Rainbow:return"極";default:return""}}function st(t){switch(t){case C.White:return"scorerank-white";case C.Bronze:return"scorerank-bronze";case C.Silver:return"scorerank-silver";case C.Gold:return"scorerank-gold";case C.Pink:return"scorerank-pink";case C.Purple:return"scorerank-purple";case C.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function rt(t){return t.good===0&&t.bad===0&&t.great>0?"dn-cyan":t.bad===0&&t.good<10?"dn-green":t.crown>=z.FullCombo?"dn-gold":t.crown>=z.Clear?"dn-grey":"dn-white"}function He(t){if(!t||t.length===0)return null;const e=t.filter(r=>r.crown>=z.Clear),s=e.length>0?e:t;let n=s[0];for(let r=1;r<s.length;r++){const o=s[r];(o.difficulty>n.difficulty||o.difficulty===n.difficulty&&(o.crown>n.crown||o.crown===n.crown&&o.score>n.score))&&(n=o)}return n}function $e(t){const e=new Map;for(const s of t.entries)if(s.songId){const n=e.get(s.songId)||[];n.push(s),e.set(s.songId,n)}return e}async function at(){const t=await we();return await Je(),t}function ot(t,e,s){if(!e?.entries?.length||!K||!s)return null;const n=K.get(t);if(!n)return null;const r=s.get(n);return!r||r.length===0?null:He(r)}function it(t){return t?.entries?.length?$e(t):null}const _e="tja_analyzer_profile",te="tja_analyzer_playdata",qe=2,ie={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListDisplayMode:ye.Crown};function Ee(){try{const t=localStorage.getItem(_e),e=localStorage.getItem(te);let s=null;if(e)try{const n=JSON.parse(e);n.version===qe?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(t){const n=JSON.parse(t);return{...ie,...n,playdata:s}}return{...ie,playdata:s}}catch(t){console.error("Failed to load user profile",t)}return{...ie}}function lt(t){const e=Ee(),{playdata:s,...n}={...e,...t};try{localStorage.setItem(_e,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(te):localStorage.setItem(te,JSON.stringify(s)))}catch(r){console.error("Failed to save user profile",r)}}function ct(){try{localStorage.removeItem(te)}catch(t){console.error("Failed to clear playdata",t)}}const Ye={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new ee,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1},loadedTJAContent:be,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new ee,eseClient:new De,eseTree:null,judgementClient:new We,judgements:new Y,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:Ee().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1};class Ke extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new Y;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new Y;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const s of e)s.type==="attributes"&&s.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=Ne(Pe,{children:[q("style",{children:`
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
        `}),q("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:q("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),q("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),q("canvas",{ref:s=>{s&&(this.canvas=s,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&Le(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const s=this[e];delete this[e],this[e]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,s="info"){this._message={text:e,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,s){return!this._chart||!this._viewOptions?null:Re(this._chart,this.canvas,this._viewOptions,e,s,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e,s=de){if(!e.autoZoom)return;const n=this.clientWidth,r=new Map;if(this._chart?.barParams)for(const u of this._chart.barParams){const l=u.measureRatio*4;r.set(l,(r.get(l)||0)+1)}r.size===0&&r.set(4,1);const o=Te(n,r,s);e.beatsPerLine!==o&&(e.beatsPerLine=o,Ye.viewOptions.beatsPerLine=o,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=X.ui.warning.background,this.messageContainer.style.color=X.ui.warning.text):(this.messageContainer.style.backgroundColor=X.ui.streamWaiting.background,this.messageContainer.style.color=X.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const s=this.canvas.getContext("2d");if(!s)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,s.clearRect(0,0,this.canvas.width,this.canvas.height);return}const n={...this._viewOptions,showAttribution:this.isFullscreen},r=document.body.classList.contains("horizontal-layout");let o={top:20,bottom:20,left:20,right:20};r&&(o.left=35),this.isFullscreen&&(o={...de}),this.applyAutoZoom(n,o);const u=this._pendingFullRender||!this._layout,l=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};u&&(this._layout=ke(this._chart,this.canvas,n,this._judgements,void 0,l,o),this._pendingFullRender=!1);let a;if(!u&&this._layout){const f=[];for(const[c,h]of this._judgements){const v=this._renderedJudgements.get(c);(!v||v.judgement!==h.judgement||v.delta!==h.delta)&&f.push(c)}for(const c of this._renderedJudgements.keys())this._judgements.has(c)||f.push(c);if(f.length>0){a=new Set;const c=this._layout.noteOrdinalToGrid,h=this._layout.barFrames;for(const v of f){const E=c.get(v);if(E)for(const T of E){const G=h[T.virtualBarIdx];G&&a.add(G.y)}}}else return}this._layout&&(Be(s,this._layout,this._chart,this._judgements,n,l,a),a?this._renderedJudgements=new Y(this._judgements):this._renderedJudgements=new Y(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,o=fe(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:r,hit:o,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=o?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,o=fe(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&o&&Ce.includes(o.type)){const u={barIndex:o.originalBarIndex,charIndex:o.charIndex},l=new ee(this._viewOptions.annotations),a=l.get(u);a?a==="L"?l.set(u,"R"):l.delete(u):l.set(u,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:l,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:r,hit:o,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new ee,s=Fe(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const s={...this._viewOptions,showAttribution:!0,...e},n=document.createElement("canvas"),r=1024;return n.width=r,Ae(this._chart,n,this._judgements,s,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",Ke);export{z as C,ye as P,Ke as T,Ye as a,et as b,ct as c,Me as d,be as e,at as f,Xe as g,it as h,ot as i,rt as j,tt as k,Ee as l,st as m,nt as n,Ze as p,lt as s,Qe as v};
