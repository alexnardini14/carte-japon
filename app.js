// ---- Icônes et catégories ----
const I = {
  manger:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3l3 18M16 3l-3 18"/></svg>',
  activite:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6c6 1 12 1 18 0M5 10h14M7.5 6.5V21M16.5 6.5V21"/></svg>',
  shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  hotel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12h.01"/></svg>',
  voiture:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 16v-4l2.5-5h11l2.5 5v4zM7 16v3M17 16v3M4 12h16"/></svg>',
  reel:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>',
  trier:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>'
};
const CATS = [
  {id:'manger',label:'Manger'},{id:'activite',label:'Activités'},{id:'shopping',label:'Shopping'},
  {id:'hotel',label:'Hôtels'},{id:'voiture',label:'Location voiture'},{id:'reel',label:'Reels'},{id:'trier',label:'À trier'}
];
const CATNAME = Object.fromEntries(CATS.map(c=>[c.id,c.label]));
const SUBS = {ramen:'Ramen',sushi:'Sushi',cafe:'Café',dessert:'Dessert',viande:'Viande',washoku:'Washoku',yoshoku:'Yōshoku',vege:'Végé',autre:'Autre'};
const color = id => `var(--c-${id})`;
const $ = id => document.getElementById(id);

// ---- État ----
let PLACES = [];
let subOn = null, query = '';
const on = Object.fromEntries(CATS.map(c=>[c.id,true]));
let tab = 'list', view = null, draft = null;

const LOCAL_KEY = 'pvt-japon-ajouts';
function loadLocal(){try{const a=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');return Array.isArray(a)?a.filter(p=>p&&isFinite(p.lat)&&isFinite(p.lng)):[]}catch(e){return []}}
function saveLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(PLACES.filter(p=>p.local).map(({_i,ll,...p})=>p)))}catch(e){toast('Impossible d’enregistrer sur ce téléphone')}}

const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark = () => document.documentElement.dataset.theme==='dark'||(document.documentElement.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
const placeName = p => p.name || 'Lieu sans nom';
const metaLine = p => [p.city, CATNAME[p.cat]].filter(Boolean).join(' · ');

const subOk = p => p.cat!=='manger' || !subOn || (p.sub||[]).includes(subOn);
const matches = p => !query || fold(placeName(p)+' '+p.city+' '+(p.note||'')+' '+(p.sub||[]).map(s=>SUBS[s]).join(' ')).includes(query);
const visible = p => on[p.cat] && subOk(p) && matches(p);

// ---- Carte ----
mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/standard',center:[137.5,36.2],zoom:4.6,minZoom:3.5,
  language:'fr',attributionControl:false,pitchWithRotate:false,dragRotate:false,
  config:{basemap:{lightPreset:dark()?'night':'day',showPointOfInterestLabels:false,showTransitLabels:true}}});
map.touchZoomRotate.disableRotation();
map.addControl(new mapboxgl.AttributionControl({compact:true}),'bottom-left');
map.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true}),'bottom-right');
map.on('error',e=>{const m=String(e&&e.error&&(e.error.message||e.error.status)||'');if(/401|403|token/i.test(m))toast('La clé Mapbox est refusée')});

// Garde le point visible au-dessus du panneau du bas et sous la barre du haut
function padding(){const wide=innerWidth>=760,top=document.querySelector('.top').getBoundingClientRect().bottom;
  return wide?{top,bottom:40,left:40,right:440}:{top,bottom:sheet.getBoundingClientRect().height+20,left:30,right:30}}
const flyTo = (ll,z) => map.flyTo({center:[ll[1],ll[0]],zoom:z,padding:padding(),duration:900,essential:true});

function placesFC(){return {type:'FeatureCollection',features:PLACES.filter(visible).map(p=>({type:'Feature',properties:{i:p._i,cat:p.cat,name:placeName(p)},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))}}
const FONT = ['DIN Pro Medium','Arial Unicode MS Regular'];
let layersReady = false;
function drawPlaces(){const s=map.getSource('places');if(s)s.setData(placesFC())}
function labelPaint(){if(!map.getLayer('labels'))return;
  map.setPaintProperty('labels','text-color',dark()?'#e8eef0':'#16232b');map.setPaintProperty('labels','text-halo-color',dark()?'#16232b':'#ffffff')}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{try{map.setConfigProperty('basemap','lightPreset',dark()?'night':'day')}catch(e){}labelPaint()});

function setupLayers(){
  if(layersReady)return;layersReady=true;
  const col=Object.fromEntries(CATS.map(c=>[c.id,css('--c-'+c.id)||'#888'])),match=['match',['get','cat'],...Object.entries(col).flat(),'#888'];
  map.addSource('places',{type:'geojson',data:placesFC(),cluster:true,clusterRadius:44,clusterMaxZoom:14,
    clusterProperties:Object.fromEntries(CATS.map(c=>['n_'+c.id,['+',['case',['==',['get','cat'],c.id],1,0]]]))});
  // Couleur d'une bulle = catégorie la plus présente dedans
  const dom=['case'];CATS.forEach(c=>{dom.push(['all',...CATS.filter(o=>o.id!==c.id).map(o=>['>=',['get','n_'+c.id],['get','n_'+o.id]])],col[c.id])});dom.push('#555');
  map.addLayer({id:'clusters',type:'circle',source:'places',filter:['has','point_count'],paint:{'circle-color':dom,'circle-opacity':.92,
    'circle-radius':['step',['get','point_count'],16,10,20,50,24,150,29],'circle-stroke-width':2.5,'circle-stroke-color':'#fff'}});
  map.addLayer({id:'cluster-count',type:'symbol',source:'places',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':FONT,'text-size':13,'text-allow-overlap':true},paint:{'text-color':'#fff'}});
  map.addLayer({id:'points',type:'circle',source:'places',filter:['!',['has','point_count']],paint:{'circle-color':match,
    'circle-radius':['interpolate',['linear'],['zoom'],8,6,15,9],'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
  map.addLayer({id:'labels',type:'symbol',source:'places',filter:['!',['has','point_count']],minzoom:12.5,layout:{'text-field':['get','name'],'text-font':FONT,'text-size':12,
    'text-offset':[0,1.1],'text-anchor':'top','text-max-width':10,'text-optional':true},paint:{'text-color':'#16232b','text-halo-color':'#ffffff','text-halo-width':1.6}});
  map.addLayer({id:'selected',type:'circle',source:'places',filter:['==',['get','i'],-1],paint:{'circle-radius':14,'circle-color':'rgba(0,0,0,0)','circle-stroke-width':3,'circle-stroke-color':css('--accent')||'#c8402a'}});
  labelPaint();
  map.on('click','clusters',e=>{if(placing())return;const f=e.features[0];
    map.getSource('places').getClusterExpansionZoom(f.properties.cluster_id,(err,z)=>{if(!err)map.easeTo({center:f.geometry.coordinates,zoom:Math.min(z+.3,16),padding:padding()})})});
  map.on('click','points',e=>{if(placing())return;const p=PLACES[e.features[0].properties.i];if(p)showPlace(p,true)});
  ['clusters','points'].forEach(l=>{map.on('mouseenter',l,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',l,()=>map.getCanvas().style.cursor='')});
}
function select(p){if(map.getLayer('selected'))map.setFilter('selected',['==',['get','i'],p&&p._i!=null?p._i:-1])}

// ---- Filtres ----
const count = id => PLACES.filter(p=>p.cat===id).length;
function renderChips(){$('chips').innerHTML = CATS.filter(c=>count(c.id)>0).map(c=>
  `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${on[c.id]}"><span class="ic" style="background:${color(c.id)}">${I[c.id]}</span>${c.label}<span class="n">${count(c.id)}</span></button>`).join('')}
function renderSubs(){const el=$('subchips'),ids=Object.keys(SUBS).filter(k=>PLACES.some(p=>p.cat==='manger'&&(p.sub||[]).includes(k)));
  el.hidden=!on.manger||!ids.length;
  if(subOn&&!ids.includes(subOn))subOn=null;
  el.innerHTML=`<button class="chip" type="button" data-sub="" aria-pressed="${!subOn}">Tout</button>`+ids.map(k=>`<button class="chip" type="button" data-sub="${k}" aria-pressed="${subOn===k}">${SUBS[k]}<span class="n">${PLACES.filter(p=>p.cat==='manger'&&(p.sub||[]).includes(k)).length}</span></button>`).join('')}
function refreshAll(){drawPlaces();renderChips();renderSubs();if(!view)render()}
$('subchips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;subOn=b.dataset.sub||null;view=null;select(null);refreshAll()});
$('chips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const id=b.dataset.cat;on[id]=!on[id];refreshAll()});

// ---- Panneau du bas ----
const sheet=$('sheet'),body=$('body'),fabs=$('fabs');
function setSize(s){sheet.classList.remove('min','max');if(s)sheet.classList.add(s);placeFabs()}
function placeFabs(){requestAnimationFrame(()=>{const h=sheet.getBoundingClientRect().height,wide=innerWidth>=760;
  fabs.style.bottom=(wide?24:h+12)+'px';document.documentElement.style.setProperty('--sheet-h',(wide?0:h)+'px')})}
sheet.addEventListener('transitionend',placeFabs);addEventListener('resize',placeFabs);
$('grab').onclick=()=>setSize(sheet.classList.contains('min')?'':sheet.classList.contains('max')?'min':'max');
let y0=null;
$('grab').addEventListener('touchstart',e=>{y0=e.touches[0].clientY},{passive:true});
$('grab').addEventListener('touchend',e=>{if(y0==null)return;const dy=e.changedTouches[0].clientY-y0;y0=null;
  if(Math.abs(dy)<30)return;e.preventDefault();
  if(dy<0)setSize(sheet.classList.contains('min')?'':'max');else setSize(sheet.classList.contains('max')?'':'min')});
function openSheet(){if(sheet.classList.contains('min'))setSize('')}

const LIMIT=300;
function render(){
  if(view){body.innerHTML=view.html();view.bind&&view.bind();body.scrollTop=0;return}
  const key=p=>fold(placeName(p)).replace(/^[^a-z0-9\u3040-\u9fff]+/,'');
  const all=PLACES.filter(visible).sort((a,b)=>String(a.city||'~').localeCompare(String(b.city||'~'))||key(a).localeCompare(key(b)));
  const locals=PLACES.filter(p=>p.local).length;
  const head=query?`${all.length} résultat${all.length>1?'s':''} pour « ${esc($('q').value.trim())} »`:`${all.length} lieu${all.length>1?'x':''} affiché${all.length>1?'s':''}. Touche une catégorie en haut pour la masquer.`;
  body.innerHTML=`<p class="note">${head}</p>`+
    (all.length?all.slice(0,LIMIT).map((p,i)=>`<button class="row" type="button" data-i="${i}"><span class="ic" style="background:${color(p.cat)}">${I[p.cat]||''}</span><span class="txt"><b>${esc(placeName(p))}</b><span>${esc(metaLine(p))}</span></span><em>${p.local?'ajouté':''}</em></button>`).join('')
      :`<div class="empty">${query?'Aucun lieu ne correspond. Essaie un autre mot.':'Aucune catégorie affichée. Touche une catégorie en haut.'}</div>`)+
    (all.length>LIMIT?`<p class="note">Les ${LIMIT} premiers sont affichés. Cherche un nom ou une ville pour trouver les autres.</p>`:'')+
    (locals?`<div class="actions"><button class="btn" id="exp" type="button">Copier mes ${locals} ajout${locals>1?'s':''}</button></div><p class="hint">Colle-les à Claude pour qu’ils apparaissent sur tous tes appareils.</p>`:'');
  body.querySelectorAll('.row').forEach(el=>el.onclick=()=>showPlace(all[+el.dataset.i]));
  const ex=$('exp');if(ex)ex.onclick=copyLocals;
}
function backToList(){view=null;select(null);render()}

function googleLink(p){return p.cid?'https://maps.google.com/?cid='+encodeURIComponent(p.cid):'https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lng}
function showPlace(p,fromMap){
  if(!fromMap||map.getZoom()<13)flyTo(p.ll,Math.max(map.getZoom(),15));else map.easeTo({center:[p.lng,p.lat],padding:padding(),duration:500});
  select(p);
  view={html:()=>`<button class="back" id="bk" type="button">← Retour à la liste</button><div class="detail">
    <div class="hd"><div class="ic" style="background:${color(p.cat)}">${I[p.cat]||''}</div><div><h3>${esc(placeName(p))}</h3><div class="meta">${esc(metaLine(p))}</div></div></div>
    ${p.note?`<p>${esc(p.note)}</p>`:''}
    <div class="pills">${(p.sub||[]).map(s=>`<span class="pill">${esc(SUBS[s]||s)}</span>`).join('')}</div>
    ${p.src?`<p class="note">Source : ${esc(p.src)}</p>`:''}
    <div class="actions"><a class="btn primary" href="${esc(googleLink(p))}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>
    ${p.url&&/^https:\/\//.test(p.url)&&!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(p.url)?`<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Voir le lien</a>`:''}
    ${p.local?`<button class="btn" id="del" type="button">Supprimer</button>`:''}</div></div>`,
    bind:()=>{$('bk').onclick=backToList;const d=$('del');if(d)d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Confirmer la suppression';return}
      PLACES=PLACES.filter(x=>x!==p);reindex();saveLocal();view=null;select(null);refreshAll();toast('Lieu supprimé')}}};
  openSheet();render();
}

// ---- Recherche ----
let qt;
$('q').addEventListener('input',()=>{clearTimeout(qt);qt=setTimeout(()=>{query=fold($('q').value.trim());view=null;select(null);openSheet();refreshAll()},150)});
$('q').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();$('q').blur();
  const r=PLACES.filter(visible);if(!r.length)return;
  if(r.length===1){showPlace(r[0]);return}
  const b=new mapboxgl.LngLatBounds();r.forEach(p=>b.extend([p.lng,p.lat]));map.fitBounds(b,{padding:padding(),maxZoom:15,duration:900})});
$('fitAll').onclick=()=>map.flyTo({center:[137.5,36.2],zoom:4.6,duration:900});

// ---- Ajout rapide (enregistré sur ce téléphone) ----
function parseLL(u){const m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)||u.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if(!m)return null;const ll=[+m[1],+m[2]];return Math.abs(ll[0])<=90&&Math.abs(ll[1])<=180?ll:null}
function guessName(u){const m=u.match(/\/maps\/place\/([^/@?]+)/);if(!m)return '';try{return decodeURIComponent(m[1].replace(/\+/g,' '))}catch(e){return ''}}
const placing = () => document.body.classList.contains('placing');
$('addBtn').onclick=()=>{draft={cat:'manger',ll:null,url:'',name:'',note:''};showAdd()};
function posText(){if(draft.ll)return 'Position : '+draft.ll.map(x=>x.toFixed(5)).join(', ');
  if(/maps\.app\.goo\.gl|goo\.gl\/maps/.test(draft.url))return 'Ce lien court ne contient pas la position. Touche « Placer sur la carte ».';
  return 'Pas encore de position. Colle un lien Google Maps ou touche « Placer sur la carte ».'}
function showAdd(){
  view={html:()=>`<button class="back" id="bk" type="button">← Annuler</button>
  <div class="form"><h3 class="form-title">Ajouter un lieu</h3>
  <label for="f-url">Lien Google Maps, Instagram ou TikTok<input id="f-url" type="url" inputmode="url" autocomplete="off" placeholder="Colle un lien ici" value="${esc(draft.url)}"></label>
  <div><div class="hint label">Catégorie</div><div class="cats" id="f-cats">${CATS.map(c=>`<button type="button" data-c="${c.id}" aria-pressed="${draft.cat===c.id}">${c.label}</button>`).join('')}</div></div>
  <label for="f-name">Nom<input id="f-name" type="text" autocomplete="off" placeholder="Ex. Ramen Fuunji" value="${esc(draft.name)}"></label>
  <label for="f-note">Note<textarea id="f-note" placeholder="Pourquoi tu veux y aller, horaires, prix…">${esc(draft.note)}</textarea></label>
  <p class="hint" id="f-pos">${esc(posText())}</p>
  <div class="actions"><button class="btn" id="f-place" type="button">Placer sur la carte</button><button class="btn primary" id="f-save" type="button">Ajouter</button></div>
  <p class="hint">Le lieu est enregistré sur ce téléphone uniquement.</p></div>`,
  bind:()=>{
    $('bk').onclick=()=>{draft=null;document.body.classList.remove('placing');backToList()};
    $('f-url').addEventListener('input',e=>{draft.url=e.target.value.trim();const ll=parseLL(draft.url);if(ll){draft.ll=ll;flyTo(ll,15)}
      if(!$('f-name').value){const n=guessName(draft.url);if(n){$('f-name').value=n;draft.name=n}}
      if(/instagram\.com|tiktok\.com/.test(draft.url)){draft.cat='reel';$('f-cats').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c==='reel'))}
      $('f-pos').textContent=posText()});
    $('f-cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;draft.cat=b.dataset.c;$('f-cats').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
    $('f-place').onclick=()=>{syncDraft();document.body.classList.add('placing');setSize('min');toast('Touche la carte à l’endroit du lieu')};
    $('f-save').onclick=()=>{syncDraft();if(!draft.ll){toast('Il manque la position du lieu');return}
      const p={id:'u'+Date.now(),cat:draft.cat,sub:[],name:draft.name.trim()||'Nouveau lieu',city:'',lat:draft.ll[0],lng:draft.ll[1],note:draft.note.trim(),url:draft.url,cid:'',src:'Ajouté depuis ce téléphone',local:true};
      PLACES.push(p);reindex();saveLocal();on[p.cat]=true;if(query){query='';$('q').value=''}draft=null;refreshAll();showPlace(p);toast('Lieu ajouté')};
  }};
  setSize('max');render();
}
function syncDraft(){if(!draft||!$('f-url'))return;draft.url=$('f-url').value.trim();draft.name=$('f-name').value;draft.note=$('f-note').value}
map.on('click',e=>{if(!placing()||!draft)return;document.body.classList.remove('placing');draft.ll=[e.lngLat.lat,e.lngLat.lng];showAdd()});

async function copyLocals(){const txt=PLACES.filter(p=>p.local).map(p=>`${placeName(p)} (${CATNAME[p.cat]}) ${p.lat.toFixed(5)},${p.lng.toFixed(5)}${p.url?' '+p.url:''}${p.note?' : '+p.note:''}`).join('\n');
  try{await navigator.clipboard.writeText(txt);toast('Copié, colle-le à Claude')}catch(e){toast('La copie n’a pas marché')}}

let tt;
function toast(t){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2600)}

// ---- Démarrage ----
function reindex(){PLACES.forEach((p,i)=>{p._i=i;p.ll=[p.lat,p.lng]})}
async function fetchPlaces(){const r=await fetch('data/places.json',{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return r.json()}
let lastLoad=0;
async function start(){
  try{PLACES=(await fetchPlaces()).concat(loadLocal());lastLoad=Date.now()}
  catch(e){PLACES=loadLocal();toast('Impossible de charger les lieux. Vérifie ta connexion.')}
  reindex();renderChips();renderSubs();render();placeFabs();
  if(map.isStyleLoaded())setupLayers();else map.on('load',setupLayers);
}
// Recharge les lieux au retour dans l'appli (depuis l'écran d'accueil, il n'y a pas de bouton pour actualiser)
async function refreshData(){try{const pl=await fetchPlaces();lastLoad=Date.now();
  const before=PLACES.filter(p=>!p.local).length;PLACES=pl.concat(PLACES.filter(p=>p.local));reindex();refreshAll();
  const diff=pl.length-before;if(diff>0)toast(diff>1?diff+' nouveaux lieux':'1 nouveau lieu')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>60000)refreshData()});
start();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
