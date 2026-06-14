const CFG = {

ink:'#243342',

metareila:'#ff0051',

ecopore:'#008bfb'

};

let limiteLayer;
let usoLayer;
let restauracaoLayer;

let usoData;
let restauracaoData;

//================================================

const map = L.map('map',{

zoomControl:true

}).setView([-11,-61.5],8);

//================================================

const satelite = L.tileLayer(

'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',

{
subdomains:'0123',
maxZoom:20
}

).addTo(map);

//================================================

async function fetchGeoJSON(url){

const r = await fetch(url);

if(!r.ok){

throw new Error(url);

}

return await r.json();

}

//================================================

function estiloUso(feature){

const tipo =
String(
feature.properties.Tipo_de_us || ''
).toLowerCase();

let cor = '#cccccc';

if(tipo.includes('past'))
cor='#f3c300';

if(tipo.includes('banana'))
cor='#00c853';

if(tipo.includes('capoeira'))
cor='#7cb342';

if(tipo.includes('agua'))
cor='#2196f3';

return{

color:cor,
weight:1,

fillColor:cor,
fillOpacity:.40

};

}

//================================================

function estiloRestauracao(feature){

const id =
Number(feature.properties.ID);

let cor = CFG.metareila;

if(id===2)
cor = CFG.ecopore;

return{

color:cor,

weight:2,

fillColor:cor,

fillOpacity:.80

};

}

//================================================

function popupRestauracao(feature,layer){

const p = feature.properties;

layer.bindPopup(`

<b>${p.Nome_Ocupacao}</b>

<hr>

Área: ${Number(p.HA).toFixed(2)} ha

<br>

Uso atual:
${p.Uso_atual}

<br>

Tipo:
${p.Tipo_de_us}

`);

}

//================================================

function atualizarEstatisticas(idFiltro){

let feats =
restauracaoData.features;

if(idFiltro!==0){

feats = feats.filter(

f => Number(f.properties.ID)
=== idFiltro

);

}

const n =
feats.length;

const total =
feats.reduce(

(a,b)=>a+Number(b.properties.HA),

0

);

const media =
n ? total/n : 0;

document.getElementById(
'n-poligonos'
).innerHTML=n;

document.getElementById(
'area-total'
).innerHTML=
total.toFixed(2)+' ha';

document.getElementById(
'area-media'
).innerHTML=
media.toFixed(2)+' ha';

}

//================================================

function renderRestauracao(idFiltro){

if(restauracaoLayer){

map.removeLayer(
restauracaoLayer
);

}

restauracaoLayer =
L.geoJSON(

restauracaoData,

{

style:estiloRestauracao,

filter:f=>{

if(idFiltro===0)
return true;

return Number(
f.properties.ID
)===idFiltro;

},

onEachFeature:
popupRestauracao

}

).addTo(map);

if(
restauracaoLayer.getLayers()
.length
){

map.fitBounds(

restauracaoLayer.getBounds(),

{
padding:[30,30]
}

);

}

atualizarEstatisticas(
idFiltro
);

}

//================================================

async function init(){

try{

const [

limite,
uso,
rest

] = await Promise.all([

fetchGeoJSON(
'data/limite_ti.geojson'
),

fetchGeoJSON(
'data/uso_ocupacao.geojson'
),

fetchGeoJSON(
'data/areas_restauracao.geojson'
)

]);

usoData = uso;

restauracaoData = rest;

//--------------------------------

limiteLayer =
L.geoJSON(

limite,

{

style:{

color:'#ffffff',

weight:2,

fillOpacity:0

}

}

).addTo(map);

//--------------------------------

usoLayer =
L.geoJSON(

usoData,

{

style:estiloUso

}

).addTo(map);

//--------------------------------

renderRestauracao(0);

//--------------------------------

document
.getElementById(
'area-select'
)
.addEventListener(
'change',
e=>{

renderRestauracao(
Number(
e.target.value
)
);

}
);

//--------------------------------

document
.querySelectorAll(
'input[data-layer]'
)
.forEach(cb=>{

cb.addEventListener(
'change',
e=>{

const nome =
e.target.dataset.layer;

const ativo =
e.target.checked;

const camada =
nome==='uso'
? usoLayer
: restauracaoLayer;

if(ativo){

camada.addTo(map);

}else{

map.removeLayer(
camada
);

}

});

});

}
catch(err){

console.error(err);

alert(
'Erro ao carregar GeoJSON. Veja o Console.'
);

}

}

init();