// ---- Icônes ----
const S = (d,w=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  manger:S('<path d="M8 3l3 18M16 3l-3 18"/>',2.2),
  activite:S('<path d="M3 6c6 1 12 1 18 0M5 10h14M7.5 6.5V21M16.5 6.5V21"/>',2.2),
  shopping:S('<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',2.2),
  hotel:S('<path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12h.01"/>',2.2),
  voiture:S('<path d="M4 16v-4l2.5-5h11l2.5 5v4zM7 16v3M17 16v3M4 12h16"/>',2.2),
  reel:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>',
  trier:S('<path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7M12 17h.01"/>',2.4),
  search:S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  home:S('<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  map:S('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  near:S('<path d="M3 11l18-8-8 18-2-8z"/>'),
  trip:S('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14 9.5h3M14 15.5h3"/>'),
  plus:S('<path d="M12 5v14M5 12h14"/>',2.4),
  expand:S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  loc:S('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  close:S('<path d="M6 6l12 12M18 6L6 18"/>',2.4),
  chev:S('<path d="M9 6l6 6-6 6"/>',2.4)
};
document.querySelectorAll('[data-i]').forEach(el=>el.innerHTML=I[el.dataset.i]);
['mqx','hqx','addClose'].forEach(id=>document.getElementById(id).innerHTML=I.close);

const CATS = [
  {id:'manger',label:'Manger'},{id:'activite',label:'Activités'},{id:'shopping',label:'Shopping'},
  {id:'hotel',label:'Hôtels'},{id:'voiture',label:'Location voiture'},{id:'reel',label:'Reels'},{id:'trier',label:'À trier'}
];
const CATNAME = Object.fromEntries(CATS.map(c=>[c.id,c.label]));
const SUBS = {ramen:'Ramen',sushi:'Sushi',cafe:'Café',dessert:'Dessert',viande:'Viande',washoku:'Washoku',yoshoku:'Yōshoku',vege:'Végé',autre:'Autre'};
const color = id => `var(--c-${id})`;
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark = () => document.documentElement.dataset.theme==='dark'||(document.documentElement.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
const placeName = p => p.name || 'Lieu sans nom';
const plural = (n,a,b) => n+' '+(n>1?b:a);

// ---- Données gardées sur ce téléphone ----
const store = {
  get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Impossible d’enregistrer sur ce téléphone')}}
};
const LOCAL_KEY='pvt-japon-ajouts', ST_KEY='pvt-japon-statuts', CK_KEY='pvt-japon-checklist', OPEN_KEY='pvt-japon-ouverts';
let PLACES=[], CHECK=null;
const ST = store.get(ST_KEY,{});     // id du lieu -> 'fait' | 'envie'
const DONE = store.get(CK_KEY,{});   // id de tâche -> true
const loadLocal = () => {const a=store.get(LOCAL_KEY,[]);return Array.isArray(a)?a.filter(p=>p&&isFinite(p.lat)&&isFinite(p.lng)):[]};
const saveLocal = () => store.set(LOCAL_KEY,PLACES.filter(p=>p.local).map(({_i,...p})=>p));
const status = p => ST[p.id]||'';
function setStatus(p,s){if(ST[p.id]===s)delete ST[p.id];else ST[p.id]=s;store.set(ST_KEY,ST);drawPlaces()}
const badge = p => status(p)==='fait'?'<span class="badge fait">Fait</span>':status(p)==='envie'?'<span class="badge envie">Envie</span>':'';

// ---- Filtres de la carte ----
let subOn=null, mapQuery='';
const on = Object.fromEntries(CATS.map(c=>[c.id,true]));
const subOk = p => p.cat!=='manger' || !subOn || (p.sub||[]).includes(subOn);
const hay = p => fold(placeName(p)+' '+(p.city||'')+' '+(p.note||'')+' '+CATNAME[p.cat]+' '+(p.sub||[]).map(s=>SUBS[s]).join(' '));
const visible = p => on[p.cat] && subOk(p) && (!mapQuery || hay(p).includes(mapQuery));

// ---- Navigation par onglets ----
let tab='home';
function go(t){
  tab=t;
  ['home','near','trip'].forEach(s=>$('s-'+s).hidden=s!==t);
  $('s-add').hidden=true;
  document.querySelectorAll('.tabbar button').forEach(b=>{if(b.dataset.tab===t)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(t==='map')map.resize();else closePopup();
  if(t==='home')renderHome();
  if(t==='near')renderNear(true);
  if(t==='trip')renderTrip();
}
$('tabbar').onclick=e=>{const b=e.target.closest('button');if(b){if(placing)endPlacing(true);go(b.dataset.tab)}};

// ---- Carte ----
mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/standard',center:[137.5,36.2],zoom:4.6,minZoom:3.5,
  language:'fr',attributionControl:false,pitchWithRotate:false,dragRotate:false,
  config:{basemap:{lightPreset:dark()?'night':'day',showPointOfInterestLabels:false,showTransitLabels:true}}});
map.touchZoomRotate.disableRotation();
map.addControl(new mapboxgl.AttributionControl({compact:true}),'bottom-left');
const geo = new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true});
map.addControl(geo,'bottom-right');
map.on('error',e=>{const m=String(e&&e.error&&(e.error.message||e.error.status)||'');if(/401|403|token/i.test(m))toast('La clé Mapbox est refusée')});
const pad = () => ({top:($('mtop').getBoundingClientRect().bottom||120)+10,bottom:30,left:30,right:70});

function placesFC(){return {type:'FeatureCollection',features:PLACES.filter(visible).map(p=>({type:'Feature',
  properties:{i:p._i,cat:p.cat,name:placeName(p),st:status(p)},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))}}
const FONT=['DIN Pro Medium','Arial Unicode MS Regular'];
let layersReady=false;
function drawPlaces(){const s=map.getSource('places');if(s)s.setData(placesFC());
  $('count').textContent=plural(PLACES.filter(visible).length,'lieu affiché','lieux affichés')}
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
  // Point : contour doré = envie, point pâle = déjà fait
  map.addLayer({id:'points',type:'circle',source:'places',filter:['!',['has','point_count']],paint:{'circle-color':match,
    'circle-radius':['interpolate',['linear'],['zoom'],8,6,15,9],
    'circle-opacity':['case',['==',['get','st'],'fait'],.4,1],
    'circle-stroke-width':['case',['==',['get','st'],'envie'],3.5,2],
    'circle-stroke-color':['case',['==',['get','st'],'envie'],css('--star')||'#d99a12','#fff']}});
  map.addLayer({id:'labels',type:'symbol',source:'places',filter:['!',['has','point_count']],minzoom:12.5,layout:{'text-field':['get','name'],'text-font':FONT,'text-size':12,
    'text-offset':[0,1.1],'text-anchor':'top','text-max-width':10,'text-optional':true},paint:{'text-color':'#16232b','text-halo-color':'#ffffff','text-halo-width':1.6}});
  labelPaint();
  map.on('click','clusters',e=>{if(placing)return;const f=e.features[0];
    map.getSource('places').getClusterExpansionZoom(f.properties.cluster_id,(err,z)=>{if(!err)map.easeTo({center:f.geometry.coordinates,zoom:Math.min(z+.3,16),padding:pad()})})});
  map.on('click','points',e=>{if(placing)return;const p=PLACES[e.features[0].properties.i];if(p)openPopup(p)});
  ['clusters','points'].forEach(l=>{map.on('mouseenter',l,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',l,()=>map.getCanvas().style.cursor='')});
  drawPlaces();
}

// ---- Bulle d'un lieu (au-dessus du point, plus de panneau en bas) ----
let popup=null;
function closePopup(){if(popup){const p=popup;popup=null;p.remove()}}
function googleLink(p){return p.cid?'https://maps.google.com/?cid='+encodeURIComponent(p.cid):'https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lng}
const metaOf = p => [(p.sub||[]).map(s=>SUBS[s]).filter(Boolean).join(', ')||CATNAME[p.cat],p.city].filter(Boolean).join(' · ');
function popHTML(p){
  const link=p.url&&/^https:\/\//.test(p.url)&&!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(p.url);
  return `<div class="pop"><h3><span class="dot" style="background:${color(p.cat)}"></span>${esc(placeName(p))}</h3><div class="meta">${esc(metaOf(p))}</div>
  ${p.note?`<p>${esc(p.note)}</p>`:''}
  <div class="acts"><a class="b pri" href="${esc(googleLink(p))}" target="_blank" rel="noopener">Y aller</a>
  <button class="b fait" type="button" data-s="fait" aria-pressed="${status(p)==='fait'}">Fait ✓</button>
  <button class="b envie" type="button" data-s="envie" aria-pressed="${status(p)==='envie'}">Envie ★</button>
  ${link?`<a class="b" href="${esc(p.url)}" target="_blank" rel="noopener">Lien</a>`:''}
  ${p.local?`<button class="b" type="button" data-del="1">Supprimer</button>`:''}</div></div>`}
function openPopup(p){
  closePopup();
  const pp=new mapboxgl.Popup({offset:14,maxWidth:'300px',focusAfterOpen:false}).setLngLat([p.lng,p.lat]).setHTML(popHTML(p)).addTo(map);
  popup=pp;pp.on('close',()=>{if(popup===pp)popup=null});
  const el=pp.getElement();
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.s){setStatus(p,b.dataset.s);el.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',status(p)===x.dataset.s));
      if(status(p))toast(status(p)==='fait'?'Marqué comme fait':'Ajouté à tes envies')}
    if(b.dataset.del){if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Confirmer';return}
      closePopup();PLACES=PLACES.filter(x=>x!==p);delete ST[p.id];store.set(ST_KEY,ST);reindex();saveLocal();refreshAll();toast('Lieu supprimé')}});
  // recentre en laissant la place à la bulle au-dessus du point
  const P=pad();map.easeTo({center:[p.lng,p.lat],padding:{...P,top:P.top+170},duration:450});
}
// Depuis une liste : on passe sur la carte et on ouvre la bulle
function showOnMap(p){
  if(!visible(p)){on[p.cat]=true;subOn=null;mapQuery='';$('mq').value='';$('mqx').hidden=true;drawPlaces();renderChips();renderSubs()}
  go('map');
  map.jumpTo({center:[p.lng,p.lat],zoom:Math.max(map.getZoom(),15.5)});
  openPopup(p);
}

// ---- Filtres (puces) ----
const count = id => PLACES.filter(p=>p.cat===id).length;
function renderChips(){$('chips').innerHTML=CATS.filter(c=>count(c.id)>0).map(c=>
  `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${on[c.id]}"><span class="dot" style="background:${color(c.id)}"></span>${c.label}<span class="n">${count(c.id)}</span></button>`).join('')}
function renderSubs(){const el=$('subchips'),ids=Object.keys(SUBS).filter(k=>PLACES.some(p=>p.cat==='manger'&&(p.sub||[]).includes(k)));
  el.hidden=!on.manger||!ids.length;
  if(subOn&&!ids.includes(subOn))subOn=null;
  el.innerHTML=`<button class="chip" type="button" data-sub="" aria-pressed="${!subOn}">Tout</button>`+ids.map(k=>`<button class="chip" type="button" data-sub="${k}" aria-pressed="${subOn===k}">${SUBS[k]}<span class="n">${PLACES.filter(p=>p.cat==='manger'&&(p.sub||[]).includes(k)).length}</span></button>`).join('')}
function refreshAll(){drawPlaces();renderChips();renderSubs();if(tab==='home')renderHome();if(tab==='near')renderNear();if(tab==='trip')renderTrip()}
$('chips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;on[b.dataset.cat]=!on[b.dataset.cat];closePopup();drawPlaces();renderChips();renderSubs()};
$('subchips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;subOn=b.dataset.sub||null;closePopup();drawPlaces();renderSubs()};

// Recherche sur la carte
let mt,ht;
$('mq').addEventListener('input',()=>{$('mqx').hidden=!$('mq').value;clearTimeout(mt);mt=setTimeout(()=>{mapQuery=fold($('mq').value.trim());closePopup();drawPlaces()},150)});
$('mq').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();clearTimeout(mt);mapQuery=fold($('mq').value.trim());drawPlaces();$('mq').blur();
  const r=PLACES.filter(visible);if(!r.length){toast('Aucun lieu ne correspond');return}
  if(r.length===1){showOnMap(r[0]);return}
  const b=new mapboxgl.LngLatBounds();r.forEach(p=>b.extend([p.lng,p.lat]));map.fitBounds(b,{padding:pad(),maxZoom:15,duration:900})});
$('mqx').onclick=()=>{$('mq').value='';$('mqx').hidden=true;mapQuery='';drawPlaces()};
$('fitAll').onclick=()=>{closePopup();map.flyTo({center:[137.5,36.2],zoom:4.6,duration:900})};
$('locBtn').onclick=()=>geo.trigger();

// ---- Accueil : tes villes ----
let homeQuery='';
const CITY_MIN=5;
function cityBar(list){const n=list.length;return '<div class="bar">'+CATS.map(c=>{const k=list.filter(p=>p.cat===c.id).length;return k?`<i style="width:${(100*k/n).toFixed(1)}%;background:${color(c.id)}"></i>`:''}).join('')+'</div>'}
function rowHTML(p,right=''){const meta=[(p.sub||[]).map(s=>SUBS[s]).filter(Boolean)[0]||CATNAME[p.cat],p.city].filter(Boolean).join(' · ');
  return `<button class="row" type="button" data-id="${esc(p.id)}"><span class="ic" style="background:${color(p.cat)}">${I[p.cat]||''}</span><span class="txt"><b>${esc(placeName(p))}${badge(p)}</b><span>${esc(meta)}</span></span>${right?`<em>${right}</em>`:''}</button>`}
function bindRows(root){root.querySelectorAll('.row[data-id]').forEach(el=>el.onclick=()=>{const p=PLACES.find(x=>String(x.id)===el.dataset.id);if(p)showOnMap(p)})}
let homeAreas={};
function renderHome(){
  const el=$('homeBody');
  if(homeQuery){
    const r=PLACES.filter(p=>hay(p).includes(homeQuery)).sort((a,b)=>placeName(a).localeCompare(placeName(b),'fr'));
    el.innerHTML=`<p class="note">${plural(r.length,'résultat','résultats')}</p>`+(r.length?`<div class="list">${r.slice(0,100).map(p=>rowHTML(p)).join('')}</div>`:'<div class="empty">Aucun lieu ne correspond. Essaie un autre mot.</div>')+(r.length>100?'<p class="note">Les 100 premiers sont affichés. Précise ta recherche pour voir les autres.</p>':'');
    bindRows(el);return}
  const by={};PLACES.forEach(p=>{const c=p.city||'';(by[c]=by[c]||[]).push(p)});
  const cities=Object.entries(by).filter(([c,l])=>c&&l.length>=CITY_MIN).sort((a,b)=>b[1].length-a[1].length);
  const rest=Object.entries(by).filter(([c,l])=>!c||l.length<CITY_MIN).flatMap(([,l])=>l);
  homeAreas=Object.fromEntries(cities);homeAreas['*']=rest;
  el.innerHTML=`<div class="tiles">${cities.map(([c,l],i)=>`<button class="tile${i===0?' big':''}" type="button" data-city="${esc(c)}"><b>${esc(c)}</b><span>${plural(l.length,'lieu','lieux')}</span>${cityBar(l)}</button>`).join('')}
    ${rest.length?`<button class="tile" type="button" data-city="*"><b>Ailleurs</b><span>${plural(rest.length,'lieu','lieux')}</span>${cityBar(rest)}</button>`:''}</div>
    <div class="legend">${CATS.filter(c=>count(c.id)).map(c=>`<span><i class="dot" style="background:${color(c.id)}"></i>${c.label}</span>`).join('')}</div>`;
  el.querySelectorAll('.tile').forEach(t=>t.onclick=()=>openArea(homeAreas[t.dataset.city]));
}
function openArea(list){if(!list||!list.length)return;go('map');closePopup();
  const b=new mapboxgl.LngLatBounds();list.forEach(p=>b.extend([p.lng,p.lat]));
  map.fitBounds(b,{padding:pad(),maxZoom:14,duration:0})}
$('hq').addEventListener('input',()=>{$('hqx').hidden=!$('hq').value;clearTimeout(ht);ht=setTimeout(()=>{homeQuery=fold($('hq').value.trim());renderHome()},150)});
$('hq').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('hq').blur()}});
$('hqx').onclick=()=>{$('hq').value='';$('hqx').hidden=true;homeQuery='';renderHome()};

// ---- Autour de moi ----
let me=null, meAt=0, nearCat='all', locating=false;
const SEGS=[['all','Tout'],['manger','Manger'],['activite','Activités'],['shopping','Shopping'],['envie','Mes envies']];
function km(a,b){const R=6371,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r;
  const h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const fmt = d => d<1?Math.max(10,Math.round(d*100)*10)+' m':d<10?d.toFixed(1).replace('.',',')+' km':Math.round(d)+' km';
function locate(){if(locating)return;if(!navigator.geolocation){nearMsg('Ton téléphone ne donne pas sa position.');return}
  locating=true;
  navigator.geolocation.getCurrentPosition(pos=>{locating=false;me={lat:pos.coords.latitude,lng:pos.coords.longitude};meAt=Date.now();if(tab==='near')renderNear()},
    err=>{locating=false;if(!me)nearMsg(err.code===1?'Autorise la localisation pour cette appli dans les réglages du téléphone, puis reviens ici.':'Position introuvable pour l’instant. Réessaie dans un moment.',true)},
    {enableHighAccuracy:true,timeout:15000,maximumAge:60000})}
function nearMsg(t,retry){$('nearBody').innerHTML=`<div class="empty">${esc(t)}${retry?'<br><br><button class="b" id="nearRetry" type="button">Réessayer</button>':''}</div>`;
  const r=$('nearRetry');if(r)r.onclick=()=>{nearMsg('Recherche de ta position…');locate()}}
function renderNear(fresh){
  $('nearSeg').innerHTML=SEGS.map(([k,l])=>`<button type="button" data-k="${k}" aria-pressed="${nearCat===k}">${l}</button>`).join('');
  if(!me||(fresh&&Date.now()-meAt>60000)){locate();if(!me){nearMsg('Recherche de ta position…');return}}
  const list=PLACES.filter(p=>nearCat==='all'||(nearCat==='envie'?status(p)==='envie':p.cat===nearCat)).map(p=>[p,km(me,p)]).sort((a,b)=>a[1]-b[1]).slice(0,40);
  $('nearSub').textContent=list.length&&list[0][1]>50?'Tu es encore loin de tes lieux. Voici les plus proches.':'Tes lieux, du plus proche au plus loin.';
  $('nearBody').innerHTML=list.length?`<div class="list">${list.map(([p,d])=>rowHTML(p,fmt(d))).join('')}</div>`:`<div class="empty">${nearCat==='envie'?'Pas encore d’envies. Sur la carte, touche un lieu puis « Envie ★ ».':'Aucun lieu dans cette catégorie.'}</div>`;
  bindRows($('nearBody'));
}
$('nearSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;nearCat=b.dataset.k;renderNear()};

// ---- Voyage : stats, envies, checklist ----
function ring(done,total){const r=15,c=2*Math.PI*r,f=total?done/total:0;
  return `<svg class="ring" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--chip)" stroke-width="4"/><circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--ok)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 19 19)"/><text x="19" y="22.5" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">${done}/${total}</text></svg>`}
const openSecs=new Set(store.get(OPEN_KEY,[]));
function renderTrip(){
  const el=$('tripBody');
  const envies=PLACES.filter(p=>status(p)==='envie'),faits=PLACES.filter(p=>status(p)==='fait');
  const items=CHECK?CHECK.sections.flatMap(s=>s.g.flatMap(g=>g.items)):[];
  const nDone=items.filter(i=>DONE[i.id]).length;
  const placeSec=(id,title,list,empty)=>`<details class="sec" data-sec="${id}"${openSecs.has(id)?' open':''}><summary><span class="t">${title}<small>${plural(list.length,'lieu','lieux')}</small></span><span class="chev">${I.chev}</span></summary><div class="in">${list.length?`<div class="list">${list.map(p=>rowHTML(p)).join('')}</div>`:`<p class="desc">${empty}</p>`}</div></details>`;
  el.innerHTML=`<div class="stats"><div><b>${PLACES.length}</b><span>lieux</span></div><div><b>${envies.length}</b><span>envies</span></div><div><b>${faits.length}</b><span>faits</span></div><div><b>${items.length?Math.round(100*nDone/items.length):0}%</b><span>checklist</span></div></div>
  <h2>Mes lieux</h2>
  ${placeSec('envies','Mes envies ★',envies,'Sur la carte, touche un lieu puis « Envie ★ » pour le retrouver ici.')}
  ${placeSec('faits','Déjà faits ✓',faits,'Quand tu as testé un lieu, touche « Fait ✓ » : il devient pâle sur la carte.')}
  <h2>Checklist PVT</h2>
  ${CHECK?CHECK.sections.map(s=>{const its=s.g.flatMap(g=>g.items),d=its.filter(i=>DONE[i.id]).length;
    return `<details class="sec" data-sec="${s.id}"${openSecs.has(s.id)?' open':''}><summary>${ring(d,its.length)}<span class="t">${esc(s.t)}<small>${d===its.length?'Tout est fait':plural(its.length-d,'chose à faire','choses à faire')}</small></span><span class="chev">${I.chev}</span></summary>
    <div class="in">${s.d?`<p class="desc">${esc(s.d)}</p>`:''}${s.g.map(g=>`${s.g.length>1||g.t!=='À faire'?`<div class="gt">${esc(g.t)}</div>`:''}${g.items.map(i=>`<label class="ck"><input type="checkbox" data-ck="${i.id}"${DONE[i.id]?' checked':''}><span>${esc(i.t)}</span></label>`).join('')}`).join('')}</div></details>`}).join('')
    :'<p class="note">La checklist n’a pas pu se charger. Vérifie ta connexion.</p>'}
  <p class="note">${CHECK?'D’après le '+esc(CHECK.source)+'. ':''}Tes cases cochées, envies et lieux faits sont gardés sur ce téléphone.</p>`;
  bindRows(el);
  el.querySelectorAll('details.sec').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)openSecs.add(d.dataset.sec);else openSecs.delete(d.dataset.sec);store.set(OPEN_KEY,[...openSecs])}));
  el.querySelectorAll('[data-ck]').forEach(c=>c.onchange=()=>{if(c.checked)DONE[c.dataset.ck]=true;else delete DONE[c.dataset.ck];store.set(CK_KEY,DONE);
    const y=$('s-trip').scrollTop;renderTrip();$('s-trip').scrollTop=y});
}

// ---- Ajout rapide ----
let draft=null, placing=false;
function parseLL(u){const m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)||u.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if(!m)return null;const ll=[+m[1],+m[2]];return Math.abs(ll[0])<=90&&Math.abs(ll[1])<=180?ll:null}
function guessName(u){const m=u.match(/\/maps\/place\/([^/@?]+)/);if(!m)return '';try{return decodeURIComponent(m[1].replace(/\+/g,' '))}catch(e){return ''}}
function posText(){const el=$('f-pos');el.classList.toggle('ok',!!draft.ll);
  el.textContent=draft.ll?'✓ Position trouvée : '+draft.ll.map(x=>x.toFixed(5)).join(', ')
    :/maps\.app\.goo\.gl|goo\.gl\/maps/.test(draft.url)?'Ce lien court ne contient pas la position. Touche « Placer sur la carte ».'
    :'Pas encore de position. Colle un lien Google Maps ou touche « Placer sur la carte ».'}
function renderCats(){$('f-cats').innerHTML=CATS.map(c=>`<button type="button" data-c="${c.id}" aria-pressed="${draft.cat===c.id}"><span class="dot" style="background:${color(c.id)}"></span>${c.label}</button>`).join('')}
function openAdd(){if(!draft){draft={cat:'manger',ll:null,url:'',name:'',note:''};$('f-url').value=$('f-name').value=$('f-note').value=''}
  renderCats();posText();closePopup();$('s-add').hidden=false;$('s-add').scrollTop=0}
function closeAdd(){draft=null;$('s-add').hidden=true}
function syncDraft(){draft.url=$('f-url').value.trim();draft.name=$('f-name').value;draft.note=$('f-note').value}
$('addBtn').onclick=openAdd;
$('addClose').onclick=closeAdd;
$('f-url').addEventListener('input',()=>{syncDraft();const ll=parseLL(draft.url);if(ll)draft.ll=ll;
  if(!$('f-name').value){const n=guessName(draft.url);if(n){$('f-name').value=n;draft.name=n}}
  if(/instagram\.com|tiktok\.com/.test(draft.url)){draft.cat='reel';renderCats()}
  posText()});
$('f-cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;draft.cat=b.dataset.c;renderCats()};
$('f-place').onclick=()=>{syncDraft();go('map');placing=true;document.body.classList.add('placing');
  $('placebar').hidden=$('cross').hidden=false;if(draft.ll)map.jumpTo({center:[draft.ll[1],draft.ll[0]],zoom:16})};
function endPlacing(silent){placing=false;document.body.classList.remove('placing');$('placebar').hidden=$('cross').hidden=true;if(!silent){$('s-add').hidden=false;posText()}}
$('plCancel').onclick=()=>endPlacing();
$('plOk').onclick=()=>{const c=map.getCenter();draft.ll=[c.lat,c.lng];endPlacing()};
$('f-save').onclick=()=>{syncDraft();if(!draft.ll){toast('Il manque la position du lieu');return}
  const p={id:'u'+Date.now(),cat:draft.cat,sub:[],name:draft.name.trim()||'Nouveau lieu',city:'',lat:draft.ll[0],lng:draft.ll[1],note:draft.note.trim(),url:draft.url,cid:'',src:'Ajouté depuis ce téléphone',local:true};
  PLACES.push(p);reindex();saveLocal();on[p.cat]=true;closeAdd();refreshAll();showOnMap(p);toast('Lieu ajouté')};

let tt;
function toast(t){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2600)}

// ---- Démarrage ----
function reindex(){PLACES.forEach((p,i)=>{p._i=i})}
async function getJSON(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return r.json()}
let lastLoad=0;
async function start(){
  const [pl,ck]=await Promise.allSettled([getJSON('data/places.json'),getJSON('data/checklist.json')]);
  if(pl.status==='fulfilled'){PLACES=pl.value.concat(loadLocal());lastLoad=Date.now()}else{PLACES=loadLocal();toast('Impossible de charger les lieux. Vérifie ta connexion.')}
  if(ck.status==='fulfilled')CHECK=ck.value;
  reindex();renderChips();renderSubs();go(tab);
  if(map.isStyleLoaded())setupLayers();else map.on('load',setupLayers);
}
// Recharge les lieux au retour dans l'appli (depuis l'écran d'accueil, il n'y a pas de bouton pour actualiser)
async function refreshData(){try{const pl=await getJSON('data/places.json');lastLoad=Date.now();
  const before=PLACES.filter(p=>!p.local).length;closePopup();PLACES=pl.concat(PLACES.filter(p=>p.local));reindex();refreshAll();
  const diff=pl.length-before;if(diff>0)toast(diff>1?diff+' nouveaux lieux':'1 nouveau lieu')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>60000)refreshData()});
start();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
