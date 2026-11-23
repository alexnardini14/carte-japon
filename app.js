const I = {
  manger:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3l3 18M16 3l-3 18"/></svg>',
  activite:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6c6 1 12 1 18 0M5 10h14M7.5 6.5V21M16.5 6.5V21"/></svg>',
  rando:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20l7-12 4 6 3-4 6 10z"/></svg>',
  hotel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12h.01"/></svg>',
  voiture:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 16v-4l2.5-5h11l2.5 5v4zM7 16v3M17 16v3M4 12h16"/></svg>',
  reco:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>',
  reel:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>',
  shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  trier:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
  admin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6zM9 12h7M9 16h5"/></svg>',
  route:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 19c4-1 3-7 7-7s3-6 7-7"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/><circle cx="19" cy="5" r="1.5" fill="currentColor"/></svg>'
};
const CATS = [
  {id:'route',label:'Itinéraire'},{id:'manger',label:'Manger'},{id:'activite',label:'Activités'},
  {id:'shopping',label:'Shopping'},{id:'rando',label:'Randos'},{id:'hotel',label:'Hôtels'},{id:'voiture',label:'Location voiture'},
  {id:'reco',label:'Recos Claude'},{id:'reel',label:'Reels'},{id:'admin',label:'Admin PVT'},{id:'trier',label:'À trier'}
];
const CATNAME = Object.fromEntries(CATS.map(c=>[c.id,c.label]));
const color = id => `var(--c-${id})`;
// ---- Données ----
const MONTHS = ['SEP','OCT','NOV','DÉC','JAN','FÉV','MAR','AVR','MAI'];
const SUBS={ramen:'Ramen',sushi:'Sushi',cafe:'Café',dessert:'Dessert',viande:'Viande',washoku:'Washoku',yoshoku:'Yōshoku',vege:'Végé',autre:'Autre'};
let STAGES=[],TRAILS=[],PLACES=[];
let subOn=null;
const subOk=p=>p.cat!=='manger'||!subOn||(p.sub||[]).includes(subOn);
const on = Object.fromEntries(CATS.map(c=>[c.id,true]));
const LOCAL_KEY='pvt-japon-ajouts';
function loadLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch(e){return []}}
function saveLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(PLACES.filter(p=>p.local).map(({m,...p})=>p)))}catch(e){}}
const dist=(a,b)=>Math.hypot((a[0]-b[0])*111000,(a[1]-b[1])*91000);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dark=()=>document.documentElement.dataset.theme==='dark'||(document.documentElement.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);

// ---- Carte ----
mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/standard',center:[137.5,36.2],zoom:4.6,minZoom:3.5,
  language:'fr',attributionControl:false,pitchWithRotate:false,dragRotate:false,
  config:{basemap:{lightPreset:dark()?'night':'day',showPointOfInterestLabels:false,showTransitLabels:true}}});
map.touchZoomRotate.disableRotation();
map.addControl(new mapboxgl.AttributionControl({compact:true}),'bottom-left');
map.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true}),'bottom-right');
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{try{map.setConfigProperty('basemap','lightPreset',dark()?'night':'day')}catch(e){}});
map.on('error',e=>{if(e&&e.error&&/401|403|token/i.test(String(e.error.message||e.error.status)))toast('Clé Mapbox refusée')});
const flyTo=(ll,z)=>map.flyTo({center:[ll[1],ll[0]],zoom:z,duration:900,essential:true});

const CAT_COLORS=()=>Object.fromEntries(CATS.map(c=>[c.id,css('--c-'+c.id)||'#888']));
function placesFC(){return {type:'FeatureCollection',features:PLACES.filter(p=>on[p.cat]&&subOk(p)).map(p=>({type:'Feature',id:p._i,properties:{i:p._i,cat:p.cat,name:p.name,ex:p.ex?1:0},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))}}
function arc(a,b){const pts=[],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1];const c=[mx-dy*.18,my+dx*.18];
  for(let t=0;t<=1.001;t+=.05){pts.push([(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1],(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0]])}return pts}
function routeFC(){let c=[];for(let i=0;i<STAGES.length-1;i++)c=c.concat(arc(STAGES[i].ll,STAGES[i+1].ll));return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:c}}}
function trailsFC(){return {type:'FeatureCollection',features:TRAILS.map((t,i)=>({type:'Feature',properties:{i},geometry:{type:'LineString',coordinates:t.pts.map(p=>[p[1],p[0]])}}))}}
const FONT=['DIN Pro Medium','Arial Unicode MS Regular'];
let stageMarkers=[];
function drawPlaces(){const s=map.getSource('places');if(s)s.setData(placesFC())}
function applyCat(id){const vis=on[id]?'visible':'none';
  if(id==='route'&&map.getLayer('route')){map.setLayoutProperty('route','visibility',vis);stageMarkers.forEach(m=>m.getElement().hidden=!on.route)}
  if(id==='rando'&&map.getLayer('trails')){map.setLayoutProperty('trails','visibility',vis);map.setLayoutProperty('trails-start','visibility',vis)}}
function setupLayers(){
  const col=CAT_COLORS(),match=['match',['get','cat'],...Object.entries(col).flat(),'#888'];
  map.addSource('route',{type:'geojson',data:routeFC()});
  map.addLayer({id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':col.route,'line-width':3,'line-dasharray':[0.2,2.2],'line-opacity':.9}});
  map.addSource('trails',{type:'geojson',data:trailsFC()});
  map.addLayer({id:'trails',type:'line',source:'trails',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':col.rando,'line-width':['interpolate',['linear'],['zoom'],6,3,13,6],'line-opacity':.95}});
  map.addSource('trailstart',{type:'geojson',data:{type:'FeatureCollection',features:TRAILS.map((t,i)=>({type:'Feature',properties:{i,name:t.name},geometry:{type:'Point',coordinates:[t.pts[0][1],t.pts[0][0]]}}))}});
  map.addLayer({id:'trails-start',type:'circle',source:'trailstart',paint:{'circle-radius':7,'circle-color':col.rando,'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
  map.addSource('places',{type:'geojson',data:placesFC(),cluster:true,clusterRadius:44,clusterMaxZoom:14,
    clusterProperties:Object.fromEntries(CATS.map(c=>['n_'+c.id,['+',['case',['==',['get','cat'],c.id],1,0]]]))});
  // couleur du cluster = catégorie dominante
  const dom=['case'];CATS.forEach(c=>{const others=CATS.filter(o=>o.id!==c.id).map(o=>['>=',['get','n_'+c.id],['get','n_'+o.id]]);dom.push(['all',...others],col[c.id])});dom.push('#555');
  map.addLayer({id:'clusters',type:'circle',source:'places',filter:['has','point_count'],paint:{'circle-color':dom,'circle-opacity':.92,
    'circle-radius':['step',['get','point_count'],16,10,20,50,24,150,29],'circle-stroke-width':2.5,'circle-stroke-color':'#fff'}});
  map.addLayer({id:'cluster-count',type:'symbol',source:'places',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':FONT,'text-size':13,'text-allow-overlap':true},paint:{'text-color':'#fff'}});
  map.addLayer({id:'points',type:'circle',source:'places',filter:['!',['has','point_count']],paint:{'circle-color':match,
    'circle-radius':['interpolate',['linear'],['zoom'],8,6,15,9],'circle-stroke-width':2,'circle-stroke-color':'#fff','circle-stroke-opacity':['case',['==',['get','ex'],1],.6,1]}});
  map.addLayer({id:'labels',type:'symbol',source:'places',filter:['!',['has','point_count']],minzoom:12.5,layout:{'text-field':['get','name'],'text-font':FONT,'text-size':12,
    'text-offset':[0,1.1],'text-anchor':'top','text-max-width':10,'text-optional':true},paint:{'text-color':dark()?'#e8eef0':'#16232b','text-halo-color':dark()?'#16232b':'#ffffff','text-halo-width':1.6}});
  map.addLayer({id:'selected',type:'circle',source:'places',filter:['==',['get','i'],-1],paint:{'circle-radius':14,'circle-color':'rgba(0,0,0,0)','circle-stroke-width':3,'circle-stroke-color':col.route}});
  STAGES.forEach(s=>{const el=document.createElement('button');el.className='stage-mk';el.innerHTML=`<span class="stage">${s.n}</span><span class="stage-label">${esc(s.city)}<span>${esc(s.from)}${s.to?' → '+esc(s.to):''}</span></span>`;
    el.setAttribute('aria-label','Étape '+s.n+' : '+s.city);el.onclick=e=>{e.stopPropagation();showStage(s)};
    stageMarkers.push(new mapboxgl.Marker({element:el,anchor:'bottom-right',offset:[-4,-4]}).setLngLat([s.ll[1],s.ll[0]]).addTo(map))});
  map.on('click','clusters',e=>{const f=e.features[0];map.getSource('places').getClusterExpansionZoom(f.properties.cluster_id,(err,z)=>{if(!err)map.easeTo({center:f.geometry.coordinates,zoom:z+.3})})});
  map.on('click','points',e=>{const p=PLACES[e.features[0].properties.i];if(p)showPlace(p,true)});
  map.on('click','trails',e=>showPlace(TRAILS[e.features[0].properties.i]));
  map.on('click','trails-start',e=>showPlace(TRAILS[e.features[0].properties.i]));
  ['clusters','points','trails','trails-start'].forEach(l=>{map.on('mouseenter',l,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',l,()=>map.getCanvas().style.cursor='')});
  map.on('zoom',()=>document.body.classList.toggle('zlow',map.getZoom()<6));document.body.classList.toggle('zlow',map.getZoom()<6);
}
function select(p){if(map.getLayer('selected'))map.setFilter('selected',['==',['get','i'],p&&p._i!=null?p._i:-1])}

// ---- Filtres ----
// Filtres
const count = id => id==='route'?STAGES.length:id==='rando'?TRAILS.length:PLACES.filter(p=>p.cat===id).length;
function renderChips(){document.getElementById('chips').innerHTML = CATS.filter(c=>count(c.id)>0).map(c=>
  `<button class="chip" data-cat="${c.id}" aria-pressed="${on[c.id]}"><span class="ic" style="background:${color(c.id)}">${I[c.id]}</span>${c.label}<span class="n">${count(c.id)}</span></button>`).join('')}
renderChips();
function renderSubs(){const el=document.getElementById('subchips');el.hidden=!on.manger;
  const ids=Object.keys(SUBS).filter(k=>PLACES.some(p=>(p.sub||[]).includes(k)));
  el.innerHTML=`<button class="chip" data-sub="" aria-pressed="${!subOn}">Tout</button>`+ids.map(k=>`<button class="chip" data-sub="${k}" aria-pressed="${subOn===k}">${SUBS[k]}<span class="n">${PLACES.filter(p=>(p.sub||[]).includes(k)).length}</span></button>`).join('')}
renderSubs();
document.getElementById('subchips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;subOn=b.dataset.sub||null;
  drawPlaces();renderSubs();if(tab==='list'){view=null;render()}});
document.getElementById('chips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const id=b.dataset.cat;
  on[id]=!on[id];applyCat(id);drawPlaces();b.setAttribute('aria-pressed',on[id]);renderSubs();if(tab==='list')render()});
document.getElementById('chips').addEventListener('dblclick',e=>{const b=e.target.closest('.chip');if(!b)return;
  CATS.forEach(c=>{on[c.id]=c.id===b.dataset.cat;applyCat(c.id)});drawPlaces();renderChips();renderSubs();render()});
// Panneau
const sheet=document.getElementById('sheet'),body=document.getElementById('body'),fabs=document.getElementById('fabs');
let tab='list',view=null;
function setSize(s){sheet.classList.remove('min','max');if(s)sheet.classList.add(s);placeFabs()}
function placeFabs(){requestAnimationFrame(()=>{const h=sheet.getBoundingClientRect().height,w=innerWidth>=760;fabs.style.bottom=(w?24:h+12)+'px';document.documentElement.style.setProperty('--sheet-h',(w?0:h)+'px')})}
sheet.addEventListener('transitionend',placeFabs);window.addEventListener('resize',placeFabs);
document.getElementById('grab').onclick=()=>setSize(sheet.classList.contains('min')?'':sheet.classList.contains('max')?'min':'max');
let y0=null;document.getElementById('grab').addEventListener('touchstart',e=>{y0=e.touches[0].clientY},{passive:true});
document.getElementById('grab').addEventListener('touchend',e=>{if(y0==null)return;const dy=e.changedTouches[0].clientY-y0;y0=null;
  if(dy<-30)setSize(sheet.classList.contains('min')?'':'max');else if(dy>30)setSize(sheet.classList.contains('max')?'':'min')});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{tab=t.dataset.tab;view=null;document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x===t));if(sheet.classList.contains('min'))setSize('');render()});

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
  if(view){body.innerHTML=view();return}
  if(tab==='trip'){
    const bars=MONTHS.map((m,i)=>{const s=STAGES.find(s=>s.m.includes(i));return `<div>${m}<b style="${s?'background:var(--c-route);opacity:'+(.45+s.n*.08):''}" title="${s?esc(s.city):''}"></b></div>`}).join('');
    body.innerHTML=`<p class="note"><span class="tag-ex">exemple</span> Itinéraire provisoire, à remplacer par le vrai.</p>
      <div class="months">${bars}</div>
      <ol class="timeline">${STAGES.map(s=>`<li class="step" tabindex="0" data-n="${s.n}"><div class="stage">${s.n}</div><div><h4>${esc(s.city)}</h4><div class="d">${esc(s.from)}${s.to?' → '+esc(s.to):''}</div><p>${esc(s.txt)}</p></div></li>`).join('')}</ol>`;
    body.querySelectorAll('.step').forEach(el=>el.onclick=()=>showStage(STAGES[el.dataset.n-1]));
  } else if(tab==='list'){
    const q=document.getElementById('q').value.trim().toLowerCase();
    const all=[...PLACES,...TRAILS].sort((a,b)=>(!!a.ex-!!b.ex)||String(a.city).localeCompare(b.city)).filter(p=>on[p.cat]&&subOk(p)&&(!q||(p.name+' '+p.city+' '+(p.note||'')).toLowerCase().includes(q)));
    body.innerHTML=(q?`<p class="note">${all.length} résultat(s) pour « ${esc(q)} »</p>`:`<p class="note">${all.length} lieux affichés · touche un filtre en haut pour masquer une catégorie</p>`)+
      (all.length?all.slice(0,300).map((p,i)=>`<div class="row" data-i="${i}"><div class="ic" style="background:${color(p.cat)}">${I[p.cat]}</div><div><b>${esc(p.name)}</b><span>${esc(p.city)} · ${CATNAME[p.cat]}</span></div><em>${p.ex?'exemple':p.local?'ajouté':''}</em></div>`).join(''):'<div class="empty">Rien ici. Essaie un autre mot.</div>')+(all.length>300?'<p class="note">Affine avec la recherche pour voir les autres.</p>':'');
    body.querySelectorAll('.row').forEach(el=>el.onclick=()=>showPlace(all[el.dataset.i]));
  } else {
    const sec=(t,items)=>`<h5>${t}</h5>`+items.map(([a,b],i)=>`<label class="check"><input type="checkbox" id="adm-${t.length}-${i}"><span>${a}${b?`<small>${b}</small>`:''}</span></label>`).join('');
    body.innerHTML=`<div class="adm">
      ${sec('Avant le départ',[['Demande de visa vacances-travail','À l’ambassade du Japon en France. Dossier : passeport, CV, lettre de motivation, programme de séjour, justificatif de ressources.'],['Assurance couvrant tout le séjour',''],['Permis de conduire international','Pour Hokkaido et Okinawa.'],['Billet d’avion','']])}
      ${sec('Dès l’arrivée',[['Carte de séjour (zairyu card)','Remise à l’aéroport (Narita, Haneda, Kansai…).'],['Déclarer l’adresse en mairie','Sous 14 jours après avoir trouvé un logement.'],['Assurance santé nationale + pension','Au même guichet de la mairie.'],['Carte SIM / téléphone',''],['Compte bancaire','Plus simple une fois l’adresse enregistrée.']])}
      ${sec('Avant de partir',[['Déclarer le départ en mairie',''],['Fermer banque, téléphone, logement','']])}
      <p class="note" style="margin-top:12px">Les lieux admin (mairie, immigration, banque) sont aussi sur la carte en turquoise.</p></div>`;
  }
}
function showStage(s){tab='trip';flyTo(s.ll,8);select(null);view=()=>`<button class="back" id="bk">← Itinéraire</button>
  <div class="detail"><div class="hd"><div class="stage" style="width:40px;height:40px;font-size:17px">${s.n}</div><div><h3>${esc(s.city)}</h3><div class="meta">${esc(s.from)}${s.to?' → '+esc(s.to):''}</div></div></div>
  <p>${esc(s.txt)}</p><div class="pills">${PLACES.filter(p=>dist(p.ll,s.ll)<40000).slice(0,30).map(p=>`<span class="pill">${esc(p.name)}</span>`).join('')||'<span class="pill">Aucun lieu autour pour l’instant</span>'}</div></div>`;
  if(sheet.classList.contains('min'))setSize('');render();bindBack()}
function showPlace(p,fromMap){if(!fromMap||map.getZoom()<13)flyTo(p.ll,Math.max(map.getZoom(),p.cat==='rando'?11:15));select(p);
  const g=p.cid?'https://maps.google.com/?cid='+encodeURIComponent(p.cid):'https://www.google.com/maps/search/?api=1&query='+p.ll[0]+','+p.ll[1];
  view=()=>`<button class="back" id="bk">← Retour</button><div class="detail">
    <div class="hd"><div class="ic" style="background:${color(p.cat)}">${I[p.cat]}</div><div><h3>${esc(p.name)} ${p.ex?'<span class="tag-ex">exemple</span>':''}</h3><div class="meta">${esc(p.city)} · ${CATNAME[p.cat]}${p.booked?' · '+esc(p.booked):''}</div></div></div>
    ${p.note?`<p>${esc(p.note)}</p>`:''}${p.src?`<p class="note">Source : ${esc(p.src)}</p>`:''}
    <div class="pills">${(p.tags||[]).map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>
    <div class="actions"><a class="btn primary" href="${g}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>
    ${p.local?`<button class="btn" id="del" type="button">Supprimer</button>`:''}${p.url&&/^https:\/\//.test(p.url)?`<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${I.reel.replace('<svg','<svg width="14" height="14"')} Voir le Reel</a>`:''}</div></div>`;
  if(sheet.classList.contains('min'))setSize('');render();bindBack();const d=document.getElementById('del');if(d)d.onclick=()=>{PLACES=PLACES.filter(x=>x!==p);reindex();saveLocal();drawPlaces();renderChips();view=null;select(null);render();toast('Supprimé')}}
function bindBack(){const b=document.getElementById('bk');if(b)b.onclick=()=>{view=null;select(null);render()}}
// Recherche
document.getElementById('q').addEventListener('input',()=>{if(tab!=='list'){tab='list';document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x.dataset.tab==='list'))}view=null;render()});
document.getElementById('fitAll').onclick=()=>map.flyTo({center:[137.5,36.2],zoom:4.6,duration:900});
let draft=null;
function parseLL(u){let m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)||u.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);return m?[+m[1],+m[2]]:null}
document.getElementById('addBtn').onclick=()=>{draft={cat:'manger',ll:null};view=addView;if(!sheet.classList.contains('max'))setSize('max');render();bindAdd()};
function addView(){return `<button class="back" id="bk">← Annuler</button>
  <div class="form"><h3 style="margin:0;font:700 18px var(--f-display)">Ajouter un lieu</h3>
  <label>Lien Google Maps, Instagram ou TikTok<input id="f-url" type="url" placeholder="Colle un lien ici" value="${esc(draft.url||'')}"></label>
  <div><div class="hint" style="margin-bottom:6px;font-weight:600">Catégorie</div><div class="cats" id="f-cats">${CATS.filter(c=>c.id!=='route'&&c.id!=='rando').map(c=>`<button type="button" data-c="${c.id}" aria-pressed="${draft.cat===c.id}">${c.label}</button>`).join('')}</div></div>
  <label>Nom<input id="f-name" type="text" placeholder="Ex. Ramen Fuunji" value="${esc(draft.name||'')}"></label>
  <label>Note<textarea id="f-note" placeholder="Pourquoi tu veux y aller, horaires, prix…">${esc(draft.note||'')}</textarea></label>
  <p class="hint" id="f-pos">${draft.ll?'Position : '+draft.ll.map(x=>x.toFixed(4)).join(', '):'Pas de position. Colle un lien Google Maps complet, ou touche la carte.'}</p>
  <div class="actions" style="margin-top:0"><button class="btn" id="f-place" type="button">Placer sur la carte</button><button class="btn primary" id="f-save" type="button">Ajouter</button></div>
  <p class="hint">Enregistré sur ce téléphone. Pour la synchro entre appareils, envoie-moi tes ajouts.</p></div>`}
function syncDraft(){draft.url=document.getElementById('f-url').value;draft.name=document.getElementById('f-name').value;draft.note=document.getElementById('f-note').value}
function bindAdd(){bindBack();
  document.getElementById('f-url').addEventListener('input',e=>{const ll=parseLL(e.target.value);if(ll){draft.ll=ll;document.getElementById('f-pos').textContent='Position trouvée dans le lien : '+ll.map(x=>x.toFixed(4)).join(', ');flyTo(ll,14)}
    if(/instagram|tiktok/.test(e.target.value)){draft.cat='reel';document.querySelectorAll('#f-cats button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c==='reel'))}});
  document.getElementById('f-cats').onclick=e=>{const b=e.target.closest('button');if(!b)return;draft.cat=b.dataset.c;document.querySelectorAll('#f-cats button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  document.getElementById('f-place').onclick=()=>{syncDraft();document.body.classList.add('placing');setSize('min');toast('Touche la carte pour placer le lieu')};
  document.getElementById('f-save').onclick=()=>{syncDraft();if(!draft.ll){toast('Ajoute une position d’abord');return}
    const p={cat:draft.cat,sub:[],name:draft.name||'Nouveau lieu',city:'',lat:draft.ll[0],lng:draft.ll[1],ll:draft.ll,note:draft.note,tags:[],url:draft.url,local:true,id:'u'+Date.now()};PLACES.push(p);reindex();saveLocal();drawPlaces();renderChips();
    if(!on[p.cat]){on[p.cat]=true;drawPlaces();renderChips()}draft=null;showPlace(p);toast('Ajouté')};
}
map.on('click',e=>{if(!document.body.classList.contains('placing'))return;document.body.classList.remove('placing');draft.ll=[e.lngLat.lat,e.lngLat.lng];setSize('max');view=addView;render();bindAdd()});
let tt;function toast(t){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2200)}

function reindex(){PLACES.forEach((p,i)=>{p._i=i;p.ll=[p.lat,p.lng]})}
async function start(){
  try{const [pl,tr]=await Promise.all([fetch('data/places.json',{cache:'no-cache'}).then(r=>r.json()),fetch('data/trip.json',{cache:'no-cache'}).then(r=>r.json())]);
    PLACES=pl.concat(loadLocal());STAGES=tr.stages;TRAILS=tr.trails.map(t=>({...t,cat:'rando',ll:t.pts[0],ex:true,tags:[t.km]}));}
  catch(e){toast('Impossible de charger les lieux');}
  reindex();renderChips();renderSubs();render();placeFabs();
  const go=()=>{setupLayers();CATS.forEach(c=>applyCat(c.id))};map.loaded()?go():map.on('load',go);
}
start();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

// Mise à jour automatique quand on revient sur l'appli (écran d'accueil = pas de bouton actualiser)
let lastLoad=Date.now();
async function refreshData(){try{const pl=await fetch('data/places.json',{cache:'no-cache'}).then(r=>r.json());lastLoad=Date.now();
  const before=PLACES.filter(p=>!p.local).length;PLACES=pl.concat(PLACES.filter(p=>p.local));reindex();drawPlaces();renderChips();renderSubs();if(!view)render();
  const diff=pl.length-before;if(diff>0)toast(diff+' nouveau'+(diff>1?'x':'')+' lieu'+(diff>1?'x':''))}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>60000)refreshData()});
