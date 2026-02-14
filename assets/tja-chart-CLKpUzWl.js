import{f as Ne,B as H,t as Ie,N as Be,e as ye,J as K,L as ne,j as Te,a as Y,b as Le,g as Re,I as ge,h as ke,P as ee,i as Fe,r as Ae,k as me,l as Pe,m as Me}from"./renderer-BGvvbZhm.js";const je=t=>Ne(t.children);function le(t){return{bpm:t,scroll:1,measureRatio:1,gogoTime:!1,currentBarBuffer:"",currentBarBpmChanges:[],currentBarScrollChanges:[],currentBarGogoChanges:[],currentBarNextSongChanges:[]}}function Ge(t){if(!t)return{normal:!0,expert:!0,master:!0};const{type:e,p1:s,p2:n}=t,a=["p","d","pp","jb"].includes(e)?100:1/0,h=0,l=a>=n,o=s<n&&s<=a;return{normal:Math.min(s,n)>h,expert:o,master:l}}function De(t){const e=t.split(/\r?\n/),s={},n={};let r=null,a=!1;const h={};for(let o of e)if(o=o.trim(),!!o){if(o.startsWith("COURSE:"))r=o.substring(7).trim(),s[r.toLowerCase()]=[],n[r.toLowerCase()]={},a=!1;else if(o.startsWith("#START"))a=!0;else if(o.startsWith("#END"))a=!1,r=null;else if(a&&r){const g=o.indexOf("//");g!==-1&&(o=o.substring(0,g).trim()),o&&s[r.toLowerCase()].push(o)}else if(!a){const g=o.split(":");if(g.length>=2){const u=g[0].trim().toUpperCase(),d=g.slice(1).join(":").trim();r?n[r.toLowerCase()][u]=d:h[u]=d}}}const l={};for(const o in s)if(Object.hasOwn(s,o)){const g=s[o],u={...h,...n[o]},d=u.TITLEJA||u.TITLE||"",b=u.SUBTITLEJA||u.SUBTITLE||"",S=parseFloat(u.BPM)||120,k=parseInt(u.LEVEL,10)||0,D=u.COURSE||o;let $=[];const V=u.BALLOON;V&&($=V.split(/[,]+/).map(C=>parseInt(C.trim(),10)).filter(C=>!Number.isNaN(C)));const E=[],F=[],A=[],P=[],M=[],j=[],m=le(S),f=le(S),N=le(S),p=(C,w,_,i,L,X=!1,he)=>{let de=i.bpm,fe=i.scroll,Q=i.gogoTime,oe=!0;const Oe=L?Ge(he):void 0;for(const R of C){if(R.startsWith("#")||R.trim().toUpperCase().startsWith("EXAM")){const O=R.toUpperCase();if(O.startsWith("#BPMCHANGE")){const v=R.split(/[:\s]+/);if(v.length>=2){const c=parseFloat(v[1]);Number.isNaN(c)||(i.bpm=c,i.currentBarBpmChanges.push({index:i.currentBarBuffer.length,bpm:c}))}}else if(O.startsWith("#BPM:")){const v=parseFloat(R.substring(5));Number.isNaN(v)||(i.bpm=v,i.currentBarBpmChanges.push({index:i.currentBarBuffer.length,bpm:v}))}else if(O.startsWith("#SCROLL")){const v=R.split(/[:\s]+/);if(v.length>=2){const c=parseFloat(v[1]);Number.isNaN(c)||(i.scroll=c,i.currentBarScrollChanges.push({index:i.currentBarBuffer.length,scroll:c}))}}else if(O.startsWith("#MEASURE")){const v=R.split(/[:\s]+/);if(v.length>=2){const c=v[1].split("/");if(c.length===2){const z=parseFloat(c[0]),ie=parseFloat(c[1]);!Number.isNaN(z)&&!Number.isNaN(ie)&&ie!==0&&(i.measureRatio=z/ie)}}}else if(O.startsWith("#GOGOSTART"))i.gogoTime=!0,i.currentBarGogoChanges.push({index:i.currentBarBuffer.length,isGogo:!0}),i.currentBarBuffer.length===0&&(Q=!0);else if(O.startsWith("#GOGOEND"))i.gogoTime=!1,i.currentBarGogoChanges.push({index:i.currentBarBuffer.length,isGogo:!1}),i.currentBarBuffer.length===0&&(Q=!1);else if(O.startsWith("#NEXTSONG")){const v=R.substring(9).trim(),c=Ue(v);if(c.length>=6){const z={title:c[0],subtitle:c[1],genre:c[2],wave:c[3],scoreInit:parseInt(c[4],10)||0,scoreDiff:parseInt(c[5],10)||0};c.length>6&&c[6]&&(z.level=parseFloat(c[6])),c.length>7&&c[7]&&(z.course=c[7]),c.length>8&&c[8]&&(z.hideTitle=c[8].toLowerCase()==="true"),i.currentBarNextSongChanges.push({index:i.currentBarBuffer.length,nextSong:z})}}continue}let q=R;for(;;){const O=q.indexOf(",");if(O===-1){i.currentBarBuffer+=q;break}else{const v=q.substring(0,O);i.currentBarBuffer+=v;const c=i.currentBarBuffer.trim();c.length===0?w.push([]):w.push(c.split("").map(Ie)),_.push({bpm:de,scroll:fe,measureRatio:i.measureRatio,gogoTime:Q,isBranched:L,isBranchStart:L&&X&&oe,branchStartParams:L&&X&&oe?he:void 0,reachableBranches:Oe,bpmChanges:i.currentBarBpmChanges.length>0?[...i.currentBarBpmChanges]:void 0,scrollChanges:i.currentBarScrollChanges.length>0?[...i.currentBarScrollChanges]:void 0,gogoChanges:i.currentBarGogoChanges.length>0?[...i.currentBarGogoChanges]:void 0,nextSongChanges:i.currentBarNextSongChanges.length>0?[...i.currentBarNextSongChanges]:void 0}),oe=!1,de=i.bpm,fe=i.scroll,Q=i.gogoTime,i.currentBarBpmChanges=[],i.currentBarScrollChanges=[],i.currentBarGogoChanges=[],i.currentBarNextSongChanges=[],i.currentBarBuffer="",q=q.substring(O+1)}}}};let I=[],J=[],B=[],T=[],G=!1,W="n",ue=!1,x;for(const C of g){const w=C.toUpperCase().trim();if(w.startsWith("#BRANCHSTART")){if(ue=!0,I.length>0&&(p(I,E,F,m,!1),p(I,A,P,f,!1),p(I,M,j,N,!1),I=[]),G){const i=J,L=B.length>0?B:i,X=T.length>0?T:L;p(i,E,F,m,!0,!0,x),p(L,A,P,f,!0,!0,x),p(X,M,j,N,!0,!0,x)}const _=C.split(/[, \s]+/);_.length>=4?x={type:_[1].toLowerCase(),p1:parseFloat(_[2]),p2:parseFloat(_[3])}:x=void 0,G=!0,W="n",J=[],B=[],T=[]}else if(w.startsWith("#BRANCHEND")){const _=J,i=B.length>0?B:_,L=T.length>0?T:i;p(_,E,F,m,!0,!0,x),p(i,A,P,f,!0,!0,x),p(L,M,j,N,!0,!0,x),G=!1,J=[],B=[],T=[]}else G&&w==="#N"?W="n":G&&w==="#E"?W="e":G&&w==="#M"?W="m":G?W==="n"?J.push(C):W==="e"?B.push(C):W==="m"&&T.push(C):I.push(C)}if(G){const C=J,w=B.length>0?B:C,_=T.length>0?T:w;p(C,E,F,m,!0,!0,x),p(w,A,P,f,!0,!0,x),p(_,M,j,N,!0,!0,x)}else I.length>0&&(p(I,E,F,m,!1),p(I,A,P,f,!1),p(I,M,j,N,!1));const re=(C,w,_)=>({bars:C,barParams:w,loop:We(C),balloonCounts:$,headers:u,title:d,subtitle:b,bpm:S,level:k,course:D,branchType:_}),ae=re(E,F,H.Normal);ue&&(ae.branches={[H.Normal]:ae,[H.Expert]:re(A,P,H.Expert),[H.Master]:re(M,j,H.Master)}),l[o]=ae}return l}function We(t){let e=-1;for(let n=0;n<t.length;n++)if(!pe(t[n])){e=n;break}if(e===-1)return;const s=t.length-e;for(let n=1;n<=s/2;n++){const r=t.slice(e,e+n);let a=0,h=e;for(;h+n<=t.length;){let l=!0;for(let o=0;o<n;o++)if(!ze(t[h+o],r[o])){l=!1;break}if(l)a++,h+=n;else break}if(a>=2){let l=!0;for(let o=h;o<t.length;o++)if(!pe(t[o])){l=!1;break}if(l)return{startBarIndex:e,period:n,iterations:a}}}}function pe(t){return t.length===0?!0:t.every(e=>e===Be.None)}function ze(t,e){if(t.length!==e.length)return!1;for(let s=0;s<t.length;s++)if(t[s]!==e[s])return!1;return!0}function Ue(t){const e=[];let s="",n=!1;for(let r=0;r<t.length;r++){const a=t[r];n?(s+=a,n=!1):a==="\\"?n=!0:a===","?(e.push(s.trim()),s=""):s+=a}return e.push(s.trim()),e}class Je{indexUrl="ese_index.json";treeCache=null;async getTjaFiles(){if(this.treeCache)return this.treeCache;try{const e=await fetch(this.indexUrl);if(!e.ok){if(e.status===404)return console.warn("ese_index.json not found. Returning empty list."),[];throw new Error(`Failed to fetch ESE index: ${e.status} ${e.statusText}`)}let s;const n=await e.json();return Array.isArray(n)?s=n:typeof n=="object"&&n!==null&&"files"in n&&Array.isArray(n.files)?s=n.files:s=[],this.treeCache=s,s}catch(e){throw console.error("Error fetching ESE index:",e),new Error("Failed to load song list.")}}async getFileContent(e){try{const n=`ese/${e.split("/").map(encodeURIComponent).join("/")}`,r=await fetch(n);if(!r.ok)throw new Error(`Failed to fetch file: ${r.status} ${r.statusText}`);return await r.text()}catch(s){throw console.error("Error fetching file content:",s),new Error("Failed to load song content.")}}}const we=`//TJADB Project
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
`;class He{eventSource=null;simulateInterval=null;onMessageCallback=null;onStatusChangeCallback=null;connect(e,s){this.disconnect();const n=`http://${e}:${s}/`;console.log(`Connecting to ${n}...`);try{this.eventSource=new EventSource(n),this.eventSource.onopen=()=>{console.log("Connected to judgement source."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected")},this.eventSource.onmessage=r=>{try{const a=JSON.parse(r.data);this.onMessageCallback&&this.onMessageCallback(a)}catch(a){r.data&&r.data.trim()!==""&&console.error("Failed to parse event data",a,r.data)}},this.eventSource.onerror=r=>{console.error("EventSource error."),this.eventSource?.readyState===EventSource.CLOSED?this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected"):this.onStatusChangeCallback&&this.onStatusChangeCallback("Error/Reconnecting")}}catch(r){console.error("Connection error:",r),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connection Failed")}}cleanup(){let e=!1;return this.eventSource&&(this.eventSource.close(),this.eventSource=null,e=!0),this.simulateInterval&&(clearInterval(this.simulateInterval),this.simulateInterval=null,e=!0),e}disconnect(){this.cleanup()&&this.onStatusChangeCallback&&this.onStatusChangeCallback("Disconnected")}startSimulation(e,s){this.cleanup(),console.log("Starting simulation..."),this.onStatusChangeCallback&&this.onStatusChangeCallback("Connected");const n=e||we,r=s||"oni";if(this.onMessageCallback){const u={type:"gameplay_start",tjaSummaries:[{player:1,tjaContent:n,difficulty:r}]};this.onMessageCallback(u)}const a=De(n),h=a[r]||Object.values(a)[0];if(!h){console.error("Simulation failed: Could not parse chart");return}const l=[],o={};for(const u of h.bars)for(const d of u)ye.includes(d)&&(o[d]===void 0&&(o[d]=0),l.push({type:d,ordinal:o[d]}),o[d]++);let g=0;this.simulateInterval=window.setInterval(()=>{if(g>=l.length){this.simulateInterval&&clearInterval(this.simulateInterval);return}const u=l[g];g++;const d=Math.random();let b="perfect";d<.9?b="perfect":d<.99?b="good":b="poor";const S=Math.floor(Math.random()*100)-50,k={type:"judgement",judgement:b,msDelta:S,noteChar:u.type,noteOrdinalByChar:u.ordinal};this.onMessageCallback&&this.onMessageCallback(k)},100+Math.random()*200)}onMessage(e){this.onMessageCallback=e}onStatusChange(e){this.onStatusChangeCallback=e}}var U=(t=>(t[t.None=0]="None",t[t.Clear=1]="Clear",t[t.FullCombo=2]="FullCombo",t[t.Perfect=3]="Perfect",t))(U||{}),y=(t=>(t[t.None=0]="None",t[t.White=1]="White",t[t.Bronze=2]="Bronze",t[t.Silver=3]="Silver",t[t.Gold=4]="Gold",t[t.Pink=5]="Pink",t[t.Purple=6]="Purple",t[t.Rainbow=7]="Rainbow",t))(y||{});const Ce={difficulty_easy_color:1,difficulty_normal_color:2,difficulty_hard_color:3,difficulty_extreme_color:4,difficulty_hidden_color:5},ve={crown_clear:1,crown_full:2,crown_preDonderfull:2,crown_donderfull:3},be={scoreRank_white:1,scoreRank_bronze:2,scoreRank_silver:3,scoreRank_gold:4,scoreRank_pink:5,scoreRank_purple:6,scoreRank_rainbow:7};function $e(t){return t.replace(/\u2010/g,"-").replace(/\uff01/g,"!")}function tt(t){const s=new DOMParser().parseFromString(t,"text/html");let n="";const r=Array.from(s.querySelectorAll("p"));for(const l of r){const o=l.textContent?.trim()||"";if(o.includes("最終更新：")){n=o.replace("最終更新：","").trim();break}}const a=[],h=Array.from(s.querySelectorAll("div.filter_selector"));for(const l of h)try{const o=l.querySelector(".table_song_name a"),g=o?.textContent?.trim();if(!g)continue;let u=0,d=0;if(o){const m=o.getAttribute("href");if(m){const f=m.match(/\/song\/(\d+)-(\d+)\//);f&&(u=parseInt(f[1],10),d=parseInt(f[2],10))}}if(d===0){const m=l.querySelector(".table_difficulty");if(m){const f=m.className.split(" ");for(const N of f)if(Ce[N]!==void 0){d=Ce[N];break}}}let b=0;const S=l.querySelector(".table_crown img");if(S){const m=S.getAttribute("src")||"";for(const f in ve)if(m.includes(f)){b=ve[f];break}}let k=0;const D=l.querySelector(".table_scorerank img");if(D){const m=D.getAttribute("src")||"";for(const f in be)if(m.includes(f)){k=be[f];break}}let $=0;const V=l.querySelector(".table_totalscore");if(V){const m=V.textContent?.trim().replace(/[,点]/g,"")||"",f=Number.parseInt(m,10);Number.isNaN(f)||($=f)}const E=m=>{const f=l.querySelector(`.${m}`);if(f){const N=f.textContent?.trim().replace(/,/g,"")||"",p=Number.parseInt(N,10);if(!Number.isNaN(p))return p}return 0},F=E("table_good"),A=E("table_ok"),P=E("table_bad"),M=E("table_combo"),j=E("table_roll");a.push({title:$e(g),difficulty:d,score:$,great:F,good:A,bad:P,combo:M,drumroll:j,songId:u,crown:b,scoreRank:k})}catch(o){console.error("Error parsing row:",o)}return{entries:a,updatedAt:n,source:"fumen-database"}}const Ve={1:"ui.difficulty.easy",2:"ui.difficulty.normal",3:"ui.difficulty.hard",4:"ui.difficulty.oni",5:"ui.difficulty.edit"};function nt(t){if(!t||!t.entries)return{totalSongs:0,byDifficulty:{}};const e={};for(const s of t.entries){const n=Ve[s.difficulty]||`Level ${s.difficulty}`;e[n]=(e[n]||0)+1}return{totalSongs:t.entries.length,byDifficulty:e}}function st(t,e){const s=[],n=[];return t.entries.forEach((r,a)=>{const h=r.songId.toString();if(r.songId!==0&&e[h]){const{title:l,...o}=r;s.push({...o,songId:h})}else n.push({entry:r,originalIndex:a})}),{matched:s,unmatched:n}}async function rt(t){const e=[];let s=0;for(const n of t.entries){if(!n.songId){console.warn("Song ID not found for an entry"),s++;continue}const r=Number.parseInt(n.songId,10);if(Number.isNaN(r)){console.warn(`Invalid song ID (not an integer): "${n.songId}"`),s++;continue}e.push([r,n.difficulty,n.score,0,n.great,n.good,n.bad,n.drumroll,n.combo,0,0,0,0,t.updatedAt])}return{data:e,exportedCount:e.length,skippedCount:s}}var _e=(t=>(t.None="none",t.Crown="crown",t.CrownWithScoreRank="crownWithScoreRank",t.DnStyle="dnStyle",t.DnStyleWithCounts="dnStyleWithCounts",t))(_e||{});let te=null,Z=null;async function Se(){if(te)return te;try{const t=await fetch("./data/song_mapping.json");return t.ok?(te=await t.json(),te||{}):(console.error("Failed to load song mapping:",t.status),{})}catch(t){return console.error("Error loading song mapping:",t),{}}}async function qe(){if(Z)return Z;const t=await Se(),e=new Map;for(const[s,n]of Object.entries(t))n.esePath&&e.set(n.esePath,s);return Z=e,e}function at(t){switch(t){case U.Perfect:return"status-perfect";case U.FullCombo:return"status-fullcombo";case U.Clear:return"status-played";default:return""}}function ot(t){switch(t){case y.White:case y.Bronze:case y.Silver:return"粋";case y.Gold:case y.Pink:case y.Purple:return"雅";case y.Rainbow:return"極";default:return""}}function it(t){switch(t){case y.White:return"scorerank-white";case y.Bronze:return"scorerank-bronze";case y.Silver:return"scorerank-silver";case y.Gold:return"scorerank-gold";case y.Pink:return"scorerank-pink";case y.Purple:return"scorerank-purple";case y.Rainbow:return"scorerank-rainbow";default:return"scorerank-none"}}function lt(t){return t.good===0&&t.bad===0&&t.great>0?"dn-cyan":t.bad===0&&t.good<10?"dn-green":t.crown>=U.FullCombo?"dn-gold":t.crown>=U.Clear?"dn-grey":"dn-white"}function Ye(t){if(!t||t.length===0)return null;const e=t.filter(r=>r.crown>=U.Clear),s=e.length>0?e:t;let n=s[0];for(let r=1;r<s.length;r++){const a=s[r];(a.difficulty>n.difficulty||a.difficulty===n.difficulty&&(a.crown>n.crown||a.crown===n.crown&&a.score>n.score))&&(n=a)}return n}function Ke(t){const e=new Map;for(const s of t.entries)if(s.songId){const n=e.get(s.songId)||[];n.push(s),e.set(s.songId,n)}return e}async function ct(){const t=await Se();return await qe(),t}function ut(t,e,s){if(!e?.entries?.length||!Z||!s)return null;const n=Z.get(t);if(!n)return null;const r=s.get(n);return!r||r.length===0?null:Ye(r)}function ht(t){return t?.entries?.length?Ke(t):null}const Ee="tja_analyzer_profile",se="tja_analyzer_playdata",Ze=2,ce={isTesterMode:!1,playdata:null,defaultViewOptions:null,autoAnnotateOnLoad:!1,showFullPathInChartList:!1,chartListDisplayMode:_e.Crown};function xe(){try{const t=localStorage.getItem(Ee),e=localStorage.getItem(se);let s=null;if(e)try{const n=JSON.parse(e);n.version===Ze?s=n:console.warn("Playdata version mismatch, discarding old data.")}catch(n){console.error("Failed to parse playdata",n)}if(t){const n=JSON.parse(t);return{...ce,...n,playdata:s}}return{...ce,playdata:s}}catch(t){console.error("Failed to load user profile",t)}return{...ce}}function dt(t){const e=xe(),{playdata:s,...n}={...e,...t};try{localStorage.setItem(Ee,JSON.stringify(n)),s!==void 0&&(s===null?localStorage.removeItem(se):localStorage.setItem(se,JSON.stringify(s)))}catch(r){console.error("Failed to save user profile",r)}}function ft(){try{localStorage.removeItem(se)}catch(t){console.error("Failed to clear playdata",t)}}const Xe={parsedTJACharts:null,currentChart:null,viewOptions:{viewMode:"original",coloringMode:"categorical",visibility:{perfect:!0,good:!0,poor:!0},collapsedLoop:!1,selectedLoopIteration:void 0,beatsPerLine:16,selection:null,annotations:new ne,showTextInAnnotationMode:!1,alwaysShowAnnotations:!1,autoZoom:!1,hideUnreachableBranches:!0},loadedTJAContent:we,activeDataSourceMode:"list",isSimulating:!1,isStreamConnected:!1,hasReceivedGameStart:!1,selectedNoteHitInfo:null,selectedBranchHitInfo:null,annotations:new ne,eseClient:new Je,eseTree:null,judgementClient:new He,judgements:new K,currentEsePath:null,currentStatusKey:"status.initializing",currentStatusParams:void 0,isTesterMode:xe().isTesterMode,isNeutralinoConnected:!1,swRegistrationError:null,displayOnlySelected:!1};class Qe extends HTMLElement{canvas;messageContainer;_chart=null;_viewOptions=null;_judgements=new K;_texts;_message=null;resizeObserver;mutationObserver;_renderTask=null;_pendingFullRender=!0;_chartChanged=!1;_layout=null;_renderedJudgements=new K;constructor(){super(),this.attachShadow({mode:"open"}),this.resizeObserver=new ResizeObserver(()=>{this._pendingFullRender=!0,this.scheduleRender()}),this.mutationObserver=new MutationObserver(e=>{for(const s of e)s.type==="attributes"&&s.attributeName==="class"&&(this._pendingFullRender=!0,this.scheduleRender())})}connectedCallback(){this.renderDOM(),this.upgradeProperty("chart"),this.upgradeProperty("viewOptions"),this.upgradeProperty("judgements"),this.upgradeProperty("texts"),this.resizeObserver.observe(this),this.mutationObserver.observe(this,{attributes:!0}),document.addEventListener("fullscreenchange",this.handleFullscreenChange),document.addEventListener("webkitfullscreenchange",this.handleFullscreenChange),this.scheduleRender()}handleFullscreenChange=()=>{this._pendingFullRender=!0,this.scheduleRender()};renderDOM(){const e=Te(je,{children:[Y("style",{children:`
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
        `}),Y("button",{type:"button",id:"exit-fullscreen-btn",onclick:this.exitFullscreen.bind(this),children:Y("img",{src:"assets/heroicons/optimized/24/outline/arrows-pointing-in.svg",alt:"Exit Fullscreen"})}),Y("div",{id:"message-container",className:"hidden",ref:s=>{this.messageContainer=s}}),Y("canvas",{ref:s=>{s&&(this.canvas=s,this.canvas.onmousemove=this.handleMouseMove.bind(this),this.canvas.onclick=this.handleClick.bind(this))}})]});this.shadowRoot&&Le(this.shadowRoot,e)}exitFullscreen(){const e=document;(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)&&(e.exitFullscreen?e.exitFullscreen().catch(()=>{}):e.webkitExitFullscreen?e.webkitExitFullscreen():e.mozCancelFullScreen?e.mozCancelFullScreen():e.msExitFullscreen&&e.msExitFullscreen()),this.classList.remove("pseudo-fullscreen")}upgradeProperty(e){if(Object.hasOwn(this,e)){const s=this[e];delete this[e],this[e]=s}}disconnectedCallback(){this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),document.removeEventListener("fullscreenchange",this.handleFullscreenChange),document.removeEventListener("webkitfullscreenchange",this.handleFullscreenChange),this._renderTask!==null&&(cancelAnimationFrame(this._renderTask),this._renderTask=null),this.canvas&&(this.canvas.onmousemove=null,this.canvas.onclick=null)}scheduleRender(){this._renderTask===null&&(this._renderTask=requestAnimationFrame(()=>this.render()))}set chart(e){this._chart!==e&&(this._chartChanged=!0),this._chart=e,this._pendingFullRender=!0,this.scheduleRender()}get chart(){return this._chart}set viewOptions(e){this._viewOptions=e,this._pendingFullRender=!0,this.scheduleRender()}get viewOptions(){return this._viewOptions}set judgements(e){this._judgements=e,this.scheduleRender()}get judgements(){return this._judgements}set texts(e){this._texts=e,this._pendingFullRender=!0,this.scheduleRender()}showMessage(e,s="info"){this._message={text:e,type:s},this._pendingFullRender=!0,this.scheduleRender()}clearMessage(){this._message=null,this._pendingFullRender=!0,this.scheduleRender()}getNoteCoordinates(e,s){return!this._chart||!this._viewOptions?null:Re(this._chart,this.canvas,this._viewOptions,e,s,this._layout||void 0)}get isFullscreen(){const e=document;return!!(e.fullscreenElement||e.webkitFullscreenElement||e.mozFullScreenElement||e.msFullscreenElement)||this.classList.contains("pseudo-fullscreen")}applyAutoZoom(e,s=ge){if(!e.autoZoom)return;const n=this.clientWidth,r=new Map;if(this._chart?.barParams)for(const h of this._chart.barParams){const l=h.measureRatio*4;r.set(l,(r.get(l)||0)+1)}r.size===0&&r.set(4,1);const a=ke(n,r,s);e.beatsPerLine!==a&&(e.beatsPerLine=a,Xe.viewOptions.beatsPerLine=a,this._layout=null,this._pendingFullRender=!0,document.dispatchEvent(new Event("view-options-update")))}render(){if(this._renderTask=null,!this.isConnected||!this.canvas)return;const e=this.clientWidth||800;if(this._message){this.canvas.classList.add("hidden"),this.messageContainer.classList.remove("hidden"),this.messageContainer.textContent=this._message.text,this._message.type==="warning"?(this.messageContainer.style.backgroundColor=ee.ui.warning.background,this.messageContainer.style.color=ee.ui.warning.text):(this.messageContainer.style.backgroundColor=ee.ui.streamWaiting.background,this.messageContainer.style.color=ee.ui.streamWaiting.text);return}this.messageContainer.classList.add("hidden"),this.canvas.classList.remove("hidden"),this._chartChanged&&(this.canvas.classList.remove("canvas-fade-in"),this.canvas.offsetWidth,this.canvas.classList.add("canvas-fade-in"),this._chartChanged=!1);const s=this.canvas.getContext("2d");if(!s)return;if(!this._chart||!this._viewOptions){this.canvas.width=e,this.canvas.height=0,this.canvas.style.height="0px",this.canvas.style.width=`${e}px`,s.clearRect(0,0,this.canvas.width,this.canvas.height);return}const n={...this._viewOptions,showAttribution:this.isFullscreen},r=document.body.classList.contains("horizontal-layout");let a={top:20,bottom:20,left:20,right:20};r&&(a.left=35),this.isFullscreen&&(a={...ge}),this.applyAutoZoom(n,a);const h=this._pendingFullRender||!this._layout,l=this._texts||{loopPattern:"Loop x{n}",judgement:{perfect:"良",good:"可",poor:"不可"}};h&&(this._layout=Fe(this._chart,this.canvas,n,this._judgements,void 0,l,a),this._pendingFullRender=!1);let o;if(!h&&this._layout){const g=[];for(const[u,d]of this._judgements){const b=this._renderedJudgements.get(u);(!b||b.judgement!==d.judgement||b.delta!==d.delta)&&g.push(u)}for(const u of this._renderedJudgements.keys())this._judgements.has(u)||g.push(u);if(g.length>0){o=new Set;const u=this._layout.noteOrdinalToGrid,d=this._layout.barFrames;for(const b of g){const S=u.get(b);if(S)for(const k of S){const D=d[k.virtualBarIdx];D&&o.add(D.y)}}}else return}this._layout&&(Ae(s,this._layout,this._chart,this._judgements,n,l,o),o?this._renderedJudgements=new K(this._judgements):this._renderedJudgements=new K(this._judgements))}refresh(){this._pendingFullRender=!0,this.scheduleRender()}handleMouseMove(e){if(this._message){this.canvas.style.cursor="default";return}if(!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,a=me(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);this.dispatchEvent(new CustomEvent("chart-hover",{detail:{x:n,y:r,hit:a,originalEvent:e},bubbles:!0,composed:!0})),this.canvas.style.cursor=a?"pointer":"default"}handleClick(e){if(this._message||!this._chart||!this._viewOptions)return;const s=this.canvas.getBoundingClientRect(),n=e.clientX-s.left,r=e.clientY-s.top,a=me(n,r,this._chart,this.canvas,this._judgements,this._viewOptions,this._layout||void 0);if(this._viewOptions.isAnnotationMode&&a&&ye.includes(a.type)){const h={barIndex:a.originalBarIndex,charIndex:a.charIndex},l=new ne(this._viewOptions.annotations),o=l.get(h);o?o==="L"?l.set(h,"R"):l.delete(h):l.set(h,"L"),this.dispatchEvent(new CustomEvent("annotations-change",{detail:l,bubbles:!0,composed:!0}))}this.dispatchEvent(new CustomEvent("chart-click",{detail:{x:n,y:r,hit:a,originalEvent:e},bubbles:!0,composed:!0}))}autoAnnotate(){if(!this._chart)return;const e=this._viewOptions?.annotations||new ne,s=Pe(this._chart,e);this.dispatchEvent(new CustomEvent("annotations-change",{detail:s,bubbles:!0,composed:!0}))}exportImage(e){if(!this._chart||!this._viewOptions)throw new Error("Chart not loaded");const s={...this._viewOptions,showAttribution:!0,...e},n=document.createElement("canvas"),r=1024;return n.width=r,Me(this._chart,n,this._judgements,s,this._texts,1),n.toDataURL("image/png")}}customElements.define("tja-chart",Qe);export{U as C,_e as P,Qe as T,Xe as a,rt as b,ft as c,De as d,we as e,ct as f,nt as g,ht as h,ut as i,lt as j,at as k,xe as l,it as m,ot as n,tt as p,dt as s,st as v};
