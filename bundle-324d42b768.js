window.requestIdleCallback||(window.requestIdleCallback=(e=>{const t=performance.now(),n=e.bind(null,{didTimeout:!1,timeRemaining:()=>Math.max(0,50-(performance.now()-t))});return window.setTimeout(n,1)}),window.cancelIdleCallback=(e=>window.clearTimeout(e))),navigator.sendBeacon||(navigator.sendBeacon=function(e,t){return new Promise((n,o)=>{const i=new XMLHttpRequest;i.open("POST",e,!0),i.onerror=o,i.onload=n,i.send(t)})});const arrowKeys=["Left","Right","Up","Down"];function arrowFromEvent(e){return e.key?e.key.startsWith("Arrow")?e.key:-1===arrowKeys.indexOf(e.key)?null:"Arrow"+e.key:null}function isKeyboardClick(e){return!(e instanceof MouseEvent)||(0===e.screenX&&0===e.detail||0===e.webkitForce)}let dummy;function copyText(e){dummy||((dummy=document.createElement("input")).style.position="fixed",dummy.style.opacity=0,document.body.appendChild(dummy)),dummy.value=e;try{dummy.hidden=!1,dummy.focus(),dummy.selectionStart=0,dummy.selectionEnd=dummy.value.length,document.execCommand("copy")}catch(e){return!1}finally{dummy.hidden=!0}return!0}const all=Array.from(input.querySelectorAll("button")),handler=e=>{const t=e.detail.trim(),n=Boolean(t);all.forEach(e=>e.disabled=!n)};typer.addEventListener("value",handler),handler({detail:typer.value}),function(e,t){let n;const o=e.textContent;let i=!1;function r(){i&&(document.activeElement===e&&t.focus(),i=!1)}t.addEventListener("keydown",t=>{i||"Enter"!==t.key||t.repeat||(e.click(),e.focus(),i=!0,t.preventDefault())}),document.body.addEventListener("keyup",e=>{"Enter"===e.key&&r()}),e.addEventListener("click",s=>{s.preventDefault(),i||s.repeat||((()=>{const i=t.dataset.copy.trim().replace(/\s+/," ");if(!copyText(i))return console.warn("could not copy",i),!0;console.info("copied",i),ga("send","event","text","copy"),e.textContent=e.dataset.copied,e.classList.add("copied"),window.clearTimeout(n),n=window.setTimeout(t=>{e.textContent=o,e.classList.remove("copied"),r()},500)})(),isKeyboardClick(s)&&e.focus())})}(copy,typer);const letterSpacing=1024,fontSize=12,hider=document.createElement("div");hider.style.overflow="hidden",hider.style.width="0px",hider.style.position="absolute";const m=document.createElement("div");hider.appendChild(m),m.style.display="inline-block",m.style.whiteSpace="nowrap",m.style.fontSize=`${fontSize}px`,m.style.background="red",navigator.platform.startsWith("Win")?m.style.fontFamily="'Segoe UI Emoji', 'Segoe UI Symbol', 'Courier New', monospace":m.style.fontFamily="'Lato', 'Helvetica Neue', 'Helvetica', sans-serif",document.body.appendChild(hider),m.textContent="\u{ffffd}";const invalidBoxWidth=m.getBoundingClientRect().width;function isSingleEmoji(e){m.textContent=e;const t=m.getBoundingClientRect().width;return 1===Math.round(t/(letterSpacing+fontSize))&&t-letterSpacing!==invalidBoxWidth}function cacheFor(e,t=4e3){let n={},o=0;return i=>{let r=n[i];return void 0===r&&(n[i]=r=e(i),++o>t&&(n={},o=0)),r}}m.style.letterSpacing=`${letterSpacing}px`;const measureText=function(){const e=document.createElement("canvas").getContext("2d");return navigator.platform.startsWith("Win")?e.font='1px "Segoe UI Emoji", "Segoe UI Symbol", "Courier New", monospace':e.font="1px monospace",cacheFor(t=>e.measureText(t).width)}(),fixedWidthEmoji=Boolean(/Mac|Android|iP(hone|od|ad)/.exec(navigator.platform)),isSingle=function(){const e=-1!==window.location.search.indexOf("debug"),t=measureText("\u{1f602}");return fixedWidthEmoji?e?(console.info("fixed emoji width is",t,"for \u{1f602}"),e=>{const n=measureText(e)===t;return n||console.debug("isSingle can't render",e,"width",measureText(e),t),n}):e=>measureText(e)===t:cacheFor(isSingleEmoji)}(),isExpectedLength=function(){const e=e=>8203===e.charCodeAt(0);if(fixedWidthEmoji){const t=measureText("\u{1f602}");return n=>{if(e(n))return!0;const o=splitEmoji(jsdecode(n)),i=o.reduce((e,t)=>e+=isFlagPoint(t[0].point)?1:0,0),r=o.length-Math.ceil(i/2),s=measureText(n)/t;return Math.floor(s)===s&&s<=r}}return t=>{if(e(t))return!0;const n=splitEmoji(jsdecode(t)),o=n.length;for(let e=0;e<o;++e){const t=n[e];if(isFlagPoint(t[0].point))continue;const o=[];t.forEach(({point:e,suffix:t,attach:n},i)=>{i&&!n&&o.push(8205),o.push(e),t&&o.push(t)});const i=String.fromCodePoint(...o);if(!isSingle(i))return!1}return!0}}(),basicDiversity=measureText("\u{1f468}\u{1f3fb}")===measureText("\u{1f468}");function isPointGender(e){return 9792===e||9794===e}function isPersonGender(e){return 128104===e||128105===e}function isFamilyMember(e){return 128118===e||128102===e||128103===e}function isVariationSelector(e){return e>=65024&&e<=65039||e>=917760&&e<=917999}function isDiversitySelector(e){return e>=127995&&e<=127999}function isFlagPoint(e){return e>=127462&&e<=127487}function unlikelyModifierBase(e){return e<9757||isPointGender(e)||isVariationSelector(e)||isDiversitySelector(e)||isFlagPoint(e)}function jsdecode(e){const t=e.length,n=[];for(let o=0;o<t;){const i=e.charCodeAt(o++)||0;if(i<55296||i>56319||o===t);else{const t=e.charCodeAt(o)||0;if(56320==(64512&t)){++o,n.push(65536+(1023&t)+((1023&i)<<10));continue}}n.push(i)}return n}const genderFlip=function(){const e=[129334,127877,0,128131,128378,0,128112,129333,0,128103,128102,129490,128117,128116,129491,128109,128108,0,128120,129332,0],t=new Map;for(let n=0;n<e.length;n+=3){const o={points:{f:e[n],m:e[n+1],n:e[n+2]}};for(let i=0;i<3;++i){const r=e[n+i];if(r){if(t.has(r))throw new Error("duplicate in gender list: "+r);t.set(r,o)}}}return e=>{const n=t.get(e)||null;return n&&void 0===n.single&&(n.single=isSingle(String.fromCodePoint(n.points.f))&&isSingle(String.fromCodePoint(n.points.m)),n.neutral=n.points.n&&isSingle(String.fromCodePoint(n.points.n))),n}}();function splitEmoji(e){if(!e.length)return[];let t=[{point:e[0],suffix:0,attach:!1}];const n=[t];for(let o=1;o<e.length;++o){const i=e[o];if(isFlagPoint(t[t.length-1].point));else{if(isDiversitySelector(i)||isVariationSelector(i)){t[t.length-1].suffix=i;continue}if(8419===i){t.push({point:i,suffix:0,attach:!0});continue}if(8205===i){const n=e[++o];n&&t.push({point:n,suffix:0,attach:!1});continue}}t=[{point:i,suffix:0,attach:!1}],n.push(t)}return n}function modify(e,t){const n={tone:!1,gender:{single:!1,double:!1,neutral:!1}};if(!e)return n;const o=splitEmoji(jsdecode(e)),i=t?[]:null;if(o.some((e,t)=>{const o=e[0].point;let r=0,s=!1;e.forEach(e=>{const t=e.point;if(isPointGender(t))n.gender.single=!0,n.gender.neutral=!0;else if(isPersonGender(t))n.gender.single=!0,++r>=2&&(n.gender.double=!0);else if(isFamilyMember(t)&&r)s=!0;else{const e=genderFlip(t);e&&(n.gender.single|=e.single,n.gender.neutral|=e.neutral)}});const a=r?isPersonGender(o)&&1===r&&!s:void 0;if(a&&(n.tone=basicDiversity),i&&(i[t]=a),(n.tone||!basicDiversity)&&n.gender.neutral)return!i&&n.gender.single&&n.gender.double;if(!1===a||unlikelyModifierBase(o))return;const c=String.fromCodePoint(o);basicDiversity&&!n.tone&&isSingle(c+"\u{1f3fb}")&&(n.tone=!0),!n.gender.neutral&&isSingle(c+"\u200d\u2640\ufe0f",c)&&(n.gender.neutral=!0,n.gender.single=!0)}),!t)return n;const r=function(){const e=t.gender||"";let n,o;return(t,i,r)=>{void 0===n||t!==n?(n=t,o=0):++o;const s=e?e[o%e.length]:"",a=i||0;if(isPersonGender(a))return s?"m"===s?128104:128105:a;if(!a||isPointGender(a))return s?"m"===s?9794:9792:0;if(r){const e=genderFlip(a);if(e){if(!s&&e.neutral)return e.points.n;if(s&&e.single)return"m"===s?e.points.m:e.points.f}}return--o,a}}(),s=o.map((e,n)=>{const o=[],s=i[n],a=e[0].point;if(void 0!==t.gender){const t=void 0===s;if(e.forEach(e=>e.point=r(o,e.point,t)),void 0===s&&1===e.length&&!isPointGender(a)){const t=r(o),n=String.fromCodePoint(a);t&&isSingle(n+"\u200d\u2640\ufe0f",n)&&e.push({suffix:65039,point:t})}}return void 0!==t.tone&&e.forEach((e,n)=>{isDiversitySelector(e.suffix)?e.suffix=t.tone:0===n&&basicDiversity&&!1!==s&&(s||isSingle(String.fromCodePoint(a)+"\u{1f3fb}"))&&(e.suffix=t.tone)}),e.forEach(e=>{e.point&&(o.length&&o.push(8205),o.push(e.point),e.suffix&&o.push(e.suffix))}),o}).reduce((e,t)=>e.concat(t),[]);return n.out=String.fromCodePoint(...s),n}function letterAt(e,t){const n=e.charCodeAt(t);return 65039!==e.charCodeAt(t+1)&&(n<5e3&&n>32)}function match(e,t){let n=t,o=t;if(""===e.substr(t).trim()||!letterAt(e,t)){for(;o>0&&!(e.charCodeAt(o-1)>32);--o);o<n&&(n=o)}for(;n>0&&letterAt(e,n-1);--n);for(;o<e.length&&letterAt(e,o);++o);return n>o&&(n=o),{from:n,to:o}}function datasetSafeDelete(e,...t){const n=e.dataset;t.forEach(e=>{e in n&&delete n[e]})}const upgraded=new WeakMap;function cursorPosition(e){const t=upgraded.get(e);if(void 0!==t)return t()}function upgrade(e){if(upgraded.has(e))return!1;const t={from:e.selectionStart,to:e.selectionEnd},n=document.createElement("div");n.className="overflow-helper",e.parentNode.insertBefore(n,e);const o=document.createElement("div");o.className="underline",n.appendChild(o);let i=null;const r=document.createElement("div");r.className="autocomplete sizer",n.appendChild(r);const s=function(){const e=document.createElement("div");e.className="sizer",n.appendChild(e);const t=document.createElement("div");return t.className="nonce",n=>(e.textContent=n,e.appendChild(t),t.offsetLeft)}();upgraded.set(e,()=>{const t=~~((e.selectionStart+e.selectionEnd)/2);return s(e.value.substr(0,t))-e.scrollLeft}),"complete"!==document.readyState&&(o.classList.add("loading"),window.addEventListener("load",e=>{a(),o.classList.remove("loading")}));const a=()=>{if(t.from>=t.to)return o.hidden=!0,!1;const{from:n,to:i}=t,a=s(e.value.substr(0,n)),c=s(e.value.substr(n,i-n));c<0&&!document.getElementById("less")&&console.warn("invalid sizer width",c,"for text",sizer.textContent),o.hidden=c<=0,o.style.left=a+"px",o.style.width=c+"px",o.style.transform=`translateX(${-e.scrollLeft}px)`,r.style.transform=`translateX(${-e.scrollLeft+a+c}px)`},c=(n,i)=>(t.from=n,t.to=Math.max(n,i),n>=i?(datasetSafeDelete(e,"prefix","word","focus"),o.hidden=!0,!1):(e.dataset.focus=e.value.substr(n,i-n),a(),!0)),l=e.value.length,d={start:l,end:l,value:void 0};let u={};const f=(n,s)=>{n.has("select-all")?e.setSelectionRange(0,e.value.length):n.has("select-end")?e.setSelectionRange(e.value.length,e.value.length):n.has("focus")&&e.setSelectionRange(d.start,d.end);const a=(t=>{if(!1!==t&&e.selectionStart===d.start&&e.selectionEnd===d.end&&e.value===d.value)return!0;if([d.start,d.end]=[e.selectionStart,e.selectionEnd],d.value!==e.value&&(e.dispatchEvent(new CustomEvent("value",{detail:e.value})),d.value=e.value),d.start!==d.end)return datasetSafeDelete(e,"prefix","word"),c(d.start,d.end),o.classList.add("range"),e.classList.add("range"),!1;o.classList.remove("range"),e.classList.remove("range");const{from:n,to:i}=match(e.value,d.start);return!(n>=i&&t||(c(n,i)&&(e.dataset.focus=e.dataset.prefix=e.value.substr(n,i-n).toLowerCase(),datasetSafeDelete(e,"word")),1))})(s);if((()=>{const n=e.dataset.prefix||"";if(null===i||0===n.length||i.name.substr(0,n.length)!==n||0!==e.value.substr(t.to).trim().length)return r.textContent="",!1;const o=i.name.substr(n.length)+i.emoji;return r.textContent=o,!0})()||(i=null),e.selectionStart!==e.selectionEnd?e.dataset.copy=e.value.substr(e.selectionStart,e.selectionEnd-e.selectionStart):e.dataset.copy=null!==i?e.value.substr(0,t.from)+e.value.substr(t.to)+i.emoji:e.value,a)return;const l={text:e.dataset.focus?e.dataset.prefix||e.dataset.word||null:"",prefix:"prefix"in e.dataset,focus:e.dataset.focus,selection:e.selectionStart!==e.selectionEnd};l.text===u.text&&l.prefix===u.prefix&&l.focus===u.focus&&l.selection===u.selection||(u=l,e.dispatchEvent(new CustomEvent("query",{detail:l})))};let m,p=!1;function h(n=!1){if(e.selectionEnd<t.to)return!1;const o=e.dataset.prefix||"";if(0===o.length||!i||!i.name.startsWith(o))return!1;const r=e.value.substr(t.to),s=r.substr(0,e.selectionStart-t.to);if(0!==s.trim().length)return!1;if(n&&!s.length)return!1;if(0!==r.trim().length&&i.name!==o)return!1;ga("send","event","options","typing");const a={choice:i.emoji,word:i.name};return typer.dispatchEvent(new CustomEvent("emoji",{detail:a})),!0}!function(){let t,n=new Set;const o=e=>{t||(m=void 0,n.clear(),t=window.requestAnimationFrame(()=>{t=null,f(n,m)})),e&&n.add(e.type)};"change keydown keypress focus click mousedown select input select-all select-end".split(/\s+/).forEach(t=>e.addEventListener(t,o)),o(),e.addEventListener("suggest",e=>{i=e.detail,p&&h(),o()}),e.addEventListener("mousemove",e=>{e.which&&o()}),document.addEventListener("selectionchange",t=>{document.activeElement===e&&o()})}(),e.addEventListener("keydown",e=>{switch(p=!1,e.key){case"Escape":m=!1;break;case"ArrowDown":case"Down":case"ArrowUp":case"Up":return void e.preventDefault();case" ":const t=h();e.shiftKey&&e.preventDefault(),t||(p=!0)}}),e.addEventListener("keyup",e=>{229!==e.keyCode&&e.keyCode||h(!0)}),function(){let t;const n=()=>{t||(t=window.requestAnimationFrame(()=>{t=null,a()}))};window.addEventListener("resize",n),e.addEventListener("wheel",n,{passive:!0})}();const g=n=>{const o=e.scrollLeft,{from:i,to:r}=t,s=e.value.substr(i,r-i);let[a,l]=[typer.selectionStart,typer.selectionEnd];const u=typer.selectionDirection,f=n(s);if(null==f)return!1;const p=document.activeElement;typer.focus(),typer.selectionStart=i,typer.selectionEnd=r;const h=typer.value.substr(0,i)+f+typer.value.substr(r);document.execCommand("insertText",!1,f)&&typer.value===h||(typer.value=typer.value.substr(0,i)+f+typer.value.substr(r)),typer.dispatchEvent(new CustomEvent("change"));const g=e=>(e>=r?e=e-(r-i)+f.length:e>i&&(e=i+f.length),e);return[d.start,d.end]=[g(a),g(l)],typer.setSelectionRange(d.start,d.end,u),p&&p.focus(),m=!0,e.scrollLeft=o,c(i,i+f.length),!0};e.addEventListener("modifier",e=>{const t={[e.detail.type]:e.detail.code};g(e=>modify(e,t).out)}),e.addEventListener("emoji",t=>{const n=t.detail.choice;g(()=>n)&&(e.dataset.word=t.detail.word||"",datasetSafeDelete(e,"prefix"))})}function build(e,t=3,n=10){const o={},i={};return e.forEach(e=>{const r=e[0];i[r]=e.slice(1);const s=r.substr(0,t);for(let t=1;t<=s.length;++t){const e=s.substr(0,t);let i=o[e];i||(i=o[e]=[]),i.length<n&&i.push(r)}}),function(e,n){const r=(e=e.toLowerCase()).substr(t);let s=o[e.substr(0,t)]||[];return r&&(s=s.filter(e=>e.substr(t).startsWith(r))),n||(s=s.filter(t=>t===e)),(s=s.map(e=>[e,...i[e]])).length?s:[]}}function idle(){return new Promise(e=>window.requestIdleCallback(e))}function rAF(e){return void 0!==e?new Promise(t=>{window.setTimeout(()=>window.requestAnimationFrame(t),e)}):new Promise(e=>window.requestAnimationFrame(e))}function microtask(){return Promise.resolve()}function delay(e=0){return new Promise(t=>window.setTimeout(t,e))}upgrade(typer);const debouceMap=new Map;function debounce(e,t=0){let n=debouceMap.get(e);if(!n){n={c:e};const t=new Promise(e=>n.r=e);n.p=t.then(()=>(debouceMap.delete(e),n.c())),debouceMap.set(e,n)}return window.clearTimeout(n.t),n.t=window.setTimeout(n.r,Math.max(0,t)),n.p}function removeDuplicates(e){const t=new Set;return e.filter((e,n)=>{if(0!==n){if(t.has(e))return!1;t.add(e)}return!0})}function merge(e,t){const n={};e.forEach((e,t)=>n[e[0]]=t),t.forEach(t=>{const o=n[t[0]];if(void 0===o)return n[t[0]]=e.length,void e.push(t);const i=e[o],r=t.slice(1);e[o]=removeDuplicates(i.concat(r))})}const api="https://emojibuff.appspot.com/api",recentLimit=8,selectionDelay=5e3;function loaderFor(e,t=24,n=(()=>{})){let o;const i=window.localStorage[e];if(i){let n;try{n=JSON.parse(i)}catch(t){console.debug("couldn't parse localStorage",e,t),n=null}if(n&&n.results&&(o=Promise.resolve(n.results),n.created>=+new Date-36e5*t))return()=>o}const r=new Promise((t,n)=>{const o=new XMLHttpRequest;o.open("GET",`${api}/${e}`),o.onerror=n,o.responseType="json",o.onload=(()=>t(o.response)),o.send()}).then(e=>"string"==typeof e?JSON.parse(e):e).then(t=>(o=r,t.created=+new Date,window.localStorage[e]=JSON.stringify(t),t.results));return o?()=>o:(n(!0),r.then(()=>n(!1)),()=>r)}const getPrefixGen=function(){const e=loaderFor("popular",24,e=>{window.loader.hidden=!e});return()=>e().then(e=>build(e))}(),getTrendingEmoji=function(){const e=loaderFor("hot",1);return()=>e().then(e=>{let t=[];return e.forEach(e=>{t=t.concat(e.slice(1))}),t})}();function request(e,t,n=!1){if(!e){if(n&&""===e){const e=recent();return e.unshift("^recent"),getTrendingEmoji().then(t=>(t.unshift("^trending"),[e,t]))}return Promise.resolve([])}const o=getPrefixGen().then(n=>n(e,t));if(!n)return o;let i=`${api}/q?q=${window.encodeURIComponent(e)}`;t||(i+="&exact");const r=window.fetch(i).then(e=>e.json()).then(e=>e.results);return Promise.all([o,r]).then(e=>{const[t,n]=e;return merge(t,n),t})}const select=function(){let e={};const t=()=>{const t=JSON.stringify(e);return e={},navigator.sendBeacon(api+"/sel",t)};return function(n,o){if("^"===n[0])return;const i=recent(),r=i.indexOf(o);return-1!==r&&i.splice(r,1),i.unshift(o),i.splice(8),window.localStorage.recent=i.join(","),e[n]=o,debounce(t,5e3)}}();function submit(e,t){const n=new FormData;return n.append("name",e),n.append("emoji",t),window.fetch(api+"/name",{method:"POST",mode:"cors",body:n})}function recent(){return(window.localStorage.recent||"").split(",").filter(e=>e)}const allowedWorkTime=4,maximumTaskFrame=100;class Worker{constructor(e){this.fn_=e,this.queue_=[],this.waiting_=null,this.runner_().catch(e=>{throw console.info("worker runner failed",e),e})}async runner_(){for(await new Promise(e=>this.waiting_=e),this.waiting_=null,await idle();;){if(this.chunk_())return this.runner_();await rAF()}}chunk_(){const e=window.performance.now();let t=0;for(;this.queue_.length;){const n=this.queue_.shift();if(n.resolve(this.fn_(n.arg)),++t==maximumTaskFrame||window.performance.now()-e>allowedWorkTime)break}return!this.queue_.length}task(e){return new Promise(t=>{this.queue_.push({resolve:t,arg:e}),this.waiting_&&this.waiting_()})}}const dummyString="a",prefix="-ok_",ls=window.localStorage,known=new Map;function runner(e){const t=isExpectedLength(e);return known.set(e,t),t&&(ls[prefix+e]=dummyString),t}const worker=new Worker(runner);function immediate(e){const t=known.get(e);return void 0!==t?t:ls[prefix+e]===dummyString||void 0}async function valid(e){const t=immediate(e);return void 0!==t?t:worker.task(e)}async function findValidMatch(e,t){let n=!1;for(let o=0;o<e.length;++o){const i=e[o];for(let e=1;e<i.length;++e){const o=i[e];let r=immediate(o);if(void 0===r&&(n||(t(null),n=!0),r=await worker.task(o)),r)return t({name:i[0],emoji:o})}}n||t(null)}class ButtonManager{constructor(e){this.holder_=e,this.options_=new Map,this.buttons_=new Map,this.buttonTarget_=new WeakMap,this.buttonPool_=[],window.requestIdleCallback(()=>{for(let e=0;e<10;++e)this.buttonPool_.push(document.createElement("button"))});const t=document.createElement("div");this.holder_.appendChild(t),this.setModifier=(()=>{const e=ButtonManager.optionType_("modifier","gender"),n=ButtonManager.optionType_("modifier","tone");t.appendChild(e),t.appendChild(n);const o=(e,t=null)=>{const n=document.createElement("button");return n.textContent=e,n.dataset.value=t,n},i=[o("\u26ac",""),o("\u2640","f"),o("\u2640\u2642","fm"),o("\u2642","m"),o("\u2642\u2640","mf")],r=[o("\u2014","")];for(let t=127995;t<=127999;++t)r.push(o(String.fromCodePoint(t),t));const s=(e,t,n)=>{e?n.appendChild(t):t.remove()};return function(o){const a=t.contains(document.activeElement)?document.activeElement:null;i.forEach(t=>{const n=t.dataset.value.length,i=!n&&o.gender.neutral||1===n&&o.gender.single||2===n&&o.gender.double;s(i,t,e)}),r.forEach(e=>s(o.tone,e,n)),t.insertBefore(e,e.nextSibling),t.insertBefore(n,n.nextSibling),a&&a.focus()}})()}static optionType_(e,t){const n=document.createElement("div");return n.className="options "+e,n.dataset[e]=t,n.dataset.name=t,n}optionForName_(e){const t=this.options_.get(e);if(t)return t;const n=document.createElement("div");return n.className="options",n.setAttribute("data-option",e),"^"===e[0]&&(n.classList.add("special"),e=e.substr(1)),n.setAttribute("data-name",e),n}addEmojiTo_(e,t){let n=this.buttons_.get(t);if(n){const t=this.buttonTarget_.get(n);if(null===t)return n;if(void 0===t)return e.appendChild(n),n}else(n=0!==this.buttonPool_.length?this.buttonPool_.pop():document.createElement("button")).textContent=t,this.buttons_.set(t,n),valid(t).then(e=>{if(!e)return this.buttonTarget_.set(n,null);const t=this.buttonTarget_.get(n);t.parentNode.replaceChild(n,t),this.buttonTarget_.delete(n)});const o=document.createTextNode("");return this.buttonTarget_.set(n,o),e.appendChild(o),n}update(e){const t=new Map,n=new Map,o=this.holder_.contains(document.activeElement)?document.activeElement:null;e.forEach(e=>{const o=e[0],i=this.optionForName_(o);t.set(o,i),this.options_.delete(o),this.holder_.appendChild(i);for(let t=0;t<i.children.length;++t){const e=i.children[t],o=e.textContent;n.has(o)?(e.remove(),this.buttonPool_.push(e),--t):n.set(o,e)}for(let t,r=1;t=e[r];++r)n.has(t)||n.set(t,this.addEmojiTo_(i,t))}),this.options_.forEach(e=>{for(let t=0;t<e.children.length;++t)this.buttonPool_.push(e.children[t]);e.remove()}),this.options_=t,this.buttons_=n,o&&(document.body.contains(o)?o.focus():typer.focus())}}let spaceFrame=0;chooser.addEventListener("keyup",e=>{" "===e.key&&"button"===e.target.localName&&(spaceFrame=window.setTimeout(()=>spaceFrame=0,0))});let previousChooserLeft=void 0,duringNavigate=!1;function navigateChooserButtonVertical(e){const t={dist:1/0,button:null},n=document.activeElement.getBoundingClientRect(),o=void 0!==previousChooserLeft?previousChooserLeft:n.left;let i=void 0;for(let r=0;r<e.length;++r){const s=e[r],a=s.getBoundingClientRect();if(n.top===a.top)continue;if(void 0===i)i=a.top;else if(a.top!==i)break;const c=Math.abs(a.left-o);c<t.dist&&([t.dist,t.button]=[c,s])}if(!t.button)return!1;duringNavigate=!0;try{t.button.focus()}finally{duringNavigate=!1}return!0}chooser.addEventListener("focus",e=>{duringNavigate||(previousChooserLeft=document.activeElement.getBoundingClientRect().left)},!0),chooser.addEventListener("click",e=>{previousChooserLeft=void 0;const t=isKeyboardClick(e);let n=void 0;const o=e.target;if("button"!==o.localName);else if(o.parentNode.dataset.modifier){if(e.shiftKey)return;const t="value"in o.dataset?+o.dataset.value||o.dataset.value:null,i={type:o.parentNode.dataset.modifier,code:t};typer.dispatchEvent(new CustomEvent("modifier",{detail:i})),n="modifier"}else if(o.parentNode.dataset.option){if(e.shiftKey){copyText(o.textContent)&&ga("send","event","options","copy");const e=document.scrollingElement.scrollTop;return t?o.focus():typer.focus(),void(document.scrollingElement.scrollTop=e)}const i=0!==spaceFrame||e.metaKey||e.ctrlKey?o.parentNode.dataset.option:null,r={choice:o.textContent,word:i};typer.dispatchEvent(new CustomEvent("emoji",{detail:r})),select(o.parentNode.dataset.option,r.choice),n="emoji"}n&&(ga("send","event","options","click",n),t||typer.focus())}),typer.addEventListener("keydown",e=>{if("ArrowDown"===e.key||"Down"===e.key){const e=typer.getBoundingClientRect();previousChooserLeft=e.left+cursorPosition(typer),navigateChooserButtonVertical(chooser.querySelectorAll("button"))&&ga("send","event","options","keyboardnav")}else if("ArrowRight"===e.key||"Right"===e.key){const e=typer.value.length;if(typer.selectionEnd===e&&typer.selectionStart===e){const e=chooser.querySelector("button");e&&e.focus()}}}),chooser.addEventListener("keydown",e=>{const t=arrowFromEvent(e);if(!t)return;if(!chooser.contains(document.activeElement))return;const n=Array.from(chooser.querySelectorAll("button")),o=n.indexOf(document.activeElement);if(-1===o)return;let i,r;if("ArrowLeft"===t?i=-1:"ArrowRight"===t&&(i=1),i){const e=o+i;e>=0&&e<n.length?n[e].focus():e<0&&(typer.focus(),typer.dispatchEvent(new CustomEvent("select-end")))}else{if("ArrowUp"===t)(r=n.slice(0,o)).reverse();else{if("ArrowDown"!==t)return;r=n.slice(o)}if(navigateChooserButtonVertical(r)||"ArrowUp"===t&&typer.focus(),"ArrowDown"===t){const t=document.activeElement.getBoundingClientRect(),n=t.top+t.height;window.innerHeight-n>64&&e.preventDefault()}}}),function(){const e=new ButtonManager(chooser);let t={},n=performance.now(),o=[],i=0;function r(e){const t=++i;if(!e)return void typer.dispatchEvent(new CustomEvent("suggest",{detail:null}));let n=null;const r=o.slice().filter(t=>e.length>1&&t[0]===e?(n=t,!1):t[0].startsWith(e));n&&r.unshift(n);findValidMatch(r,e=>{t===i&&typer.dispatchEvent(new CustomEvent("suggest",{detail:e}))})}typer.addEventListener("query",i=>{const s=i.detail,a=performance.now(),c=modify(!i.detail.prefix&&i.detail.focus||"");e.setModifier(c),t.text!==s.text&&r(s.text);const l=t.text&&s.text&&0!==t.text.length&&t.text.startsWith(s.text.substr(0,t.text.length))||!1;let d=!1;t.text&&t.prefix===s.prefix?a-n>2e3&&(d=!0):d=!0,t=s,n=a;const u=async(n=0,i=!1)=>{if(n&&(await rAF(n),t!==s))return-1;const a=await request(s.text,s.prefix,i);return t!==s?-1:(o=a,r(s.text),e.update(a))};u(d?0:250,l).then(e=>{if(e<0)return-2;if(!s.text){const e=window.innerHeight<=400?0:750;return u(e,!0)}const t=Math.max(1e3,100*Math.pow(e,.75));return u(t,!0)}).catch(e=>{console.error("error doing request",e)})})}(),function(e,t){const n=t.querySelector("form"),o=n.querySelector("input"),i=n.querySelector("button");let r="",s=null;e.addEventListener("query",e=>{const n=e.detail,i=null===n.text&&void 0!==n.focus&&n.selection;if(r=n.focus,!i)return s||(o.value="",t.hidden=!0),!1;t.hidden=!1});const a=e=>{i.disabled=!o.value};"input change".split(/\s+/).forEach(e=>o.addEventListener(e,a)),n.addEventListener("submit",e=>{if(e.preventDefault(),s)return!1;n.classList.add("pending"),o.disabled=!0,i.disabled=!0;(s=submit(o.value,r).then(e=>{if(!e.ok)throw new Error(e.status);return i.classList.add("success"),!1}).catch(e=>(i.classList.add("failure"),console.warn("failed to submit emoji",e),!0)).then(e=>{n.classList.remove("pending"),o.disabled=!1,o.value="",o.dispatchEvent(new CustomEvent("change")),s=null,r||(t.hidden=!0)})).then(()=>delay(2e3)).then(()=>{i.className=""})})}(typer,advanced);const value=e=>{const t=e.detail.trim();document.body.classList.toggle("has-value",Boolean(t))};function isExtentNode(e){return e instanceof Element&&e.classList.contains("extent")}typer.addEventListener("value",value),value({detail:typer.value}),document.body.addEventListener("keydown",e=>{switch(e.key){case"Escape":if(document.activeElement!==typer){typer.focus();break}if(typer.selectionStart!==typer.selectionEnd){"backward"===typer.selectionDirection?typer.selectionStart=typer.selectionEnd:typer.selectionEnd=typer.selectionStart;break}const t=typer.value.length;typer.setSelectionRange(t,t)}}),document.addEventListener("selectionchange",e=>{const t=window.getSelection(),{anchorNode:n,focusNode:o}=t;n!==o&&isExtentNode(n)&&isExtentNode(o)&&(t.removeAllRanges(),typer.focus(),typer.dispatchEvent(new CustomEvent("select-all")))},!0),document.addEventListener("focusin",e=>{microtask().then(()=>{document.activeElement===document.body&&typer.focus()})});const resize=e=>{const t=window.innerHeight;document.body.style.minHeight=`${t}px`};window.addEventListener("resize",resize),window.addEventListener("load",resize),resize(),document.body.addEventListener("click",e=>{const t=e.target&&e.target.closest("a[href]");t&&ga("send","event","outbound","click",t.href)}),!window.localStorage["dismiss-install-windows"]&&"undefined"==typeof Windows&&navigator.platform.startsWith("Win")&&document.body.classList.add("has-install-windows");const dismissWindows=document.getElementById("dismiss-windows");dismissWindows.addEventListener("click",e=>{ga("send","event","install","dismiss-windows"),window.localStorage["dismiss-install-windows"]=!0,document.body.classList.remove("has-install-windows")});let deferredPrompt=null;function cleanupPrompt(){document.body.classList.remove("has-install-pwa"),deferredPrompt=null}window.addEventListener("beforeinstallprompt",e=>(ga("send","event","install","available"),document.body.classList.add("has-install-pwa"),document.body.classList.remove("has-install-windows"),deferredPrompt=e,e.preventDefault(),!1)),window.addEventListener("appinstalled",e=>{ga("send","event","install","installed"),cleanupPrompt()});const installEl=document.getElementById("install");installEl.addEventListener("click",e=>{deferredPrompt&&(deferredPrompt.prompt(),deferredPrompt.userChoice&&deferredPrompt.userChoice.then(e=>{ga("send","event","install",e)}).catch(e=>{console.warn("beforeinstallprompt prompt",e)}).then(cleanupPrompt))});const adverts=document.getElementById("adverts");function refresh(){const e=adverts.querySelector(".active"),t=e&&e.nextElementSibling||adverts.firstElementChild;t?(e&&e.classList.remove("active"),t.classList.add("active"),enqueue()):console.warn("no adverts to choose from")}let timeout;function enqueue(){window.clearTimeout(timeout),timeout=window.setTimeout(()=>{window.requestAnimationFrame(refresh)},1e4)}if(enqueue(),navigator.serviceWorker){navigator.serviceWorker.register("./sw.js").catch(e=>{console.warn("failed to register SW",e)});const e=Boolean(navigator.serviceWorker.controller);navigator.serviceWorker.addEventListener("controllerchange",()=>{e&&(console.debug("got SW controllerchange, reload"),window.location.reload())})}let prevOnLine=!0;function notifyStatus(){"onLine"in navigator&&prevOnLine!==navigator.onLine&&(ga("send","event","network",navigator.onLine?"online":"offline"),prevOnLine=navigator.onLine)}notifyStatus(),window.addEventListener("online",()=>debounce(notifyStatus)),window.addEventListener("offline",()=>debounce(notifyStatus));const placeholders=["Type words, receive emoji \u{1f44d}","Use your keyboard to search \u{1f50e}","Find emoji that your heart desires \u2764\ufe0f\u2328\ufe0f","Keyboard. Emoji. Forever \u{1f60d}","Keyboard emoji since 2016 \u{1f4dc}","Just tap a key to search \u{1f446}","Type, tap enter to copy, profit \u{1f4b8}","Emoji for every occasion, just type \u{1f521}"],choice=Math.floor(Math.random()*placeholders.length);typer.placeholder=placeholders[choice],window.onerror=((e,t,n,o,i)=>{console.info("got err",String(e));try{ga("send","event","error",`${t},${n}:${o}`,String(e),{nonInteraction:!0})}catch(e){}});

//# sourceMappingURL=bundle-324d42b768.js.map
