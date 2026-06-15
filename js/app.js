/* ==========================================================
   GEOPORTAL RESTAURAÇÃO
   TI SETE DE SETEMBRO
========================================================== */

const CFG = {

    metareila : '#ff0051',
    ecopore   : '#008bfb',

    classesUso : {

        'Bananal'               : '#00c853',
        'Cacau'                 : '#6d4c41',
        'Cafezal'               : '#8d6e63',
        'Capoeira'              : '#7cb342',
        'Castanhais'            : '#33691e',
        'Consórcio de lavouras' : '#ff9800',
        'Outras culturas'       : '#ffb300',
        'Pastagem'              : '#f3c300',
        'Roça tradicional'      : '#ef6c00'

    }

};

/* ==========================================================
   VARIÁVEIS GLOBAIS
========================================================== */

let map;

let limiteLayer;
let usoLayer;
let restauracaoLayer;

let usoData;
let restauracaoData;
let limiteData;

/* ==========================================================
   MAPA
========================================================== */

function criarMapa(){

    map = L.map('map', {

        zoomControl:true

    });

    map.setView([-11.0,-61.4],8);

    L.tileLayer(

        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',

        {

            subdomains:['0','1','2','3'],
            maxZoom:20

        }

    ).addTo(map);

}

/* ==========================================================
   FETCH
========================================================== */

async function fetchGeoJSON(url){

    const r = await fetch(url);

    if(!r.ok){

        throw new Error(
            `Erro carregando ${url}`
        );

    }

    return await r.json();

}

/* ==========================================================
   CORES DE USO
========================================================== */

function getCorUso(tipo){

    return CFG.classesUso[tipo]
        || '#9e9e9e';

}

/* ==========================================================
   ESTILOS
========================================================== */

function estiloUso(feature){

    const cor =
        getCorUso(
            feature.properties.Tipo_de_us
        );

    return {

        color:cor,

        weight:1,

        fillColor:cor,

        fillOpacity:0.45

    };

}

function estiloRestauracao(feature){

    const id =
        Number(feature.properties.ID);

    let cor =
        CFG.metareila;

    if(id === 2){

        cor =
            CFG.ecopore;

    }

    return {

        color:cor,

        weight:2,

        fillColor:cor,

        fillOpacity:0.35

    };

}

function estiloLimite(){

    return {

        color:'#ffffff',

        weight:3,

        fillOpacity:0

    };

}

/* ==========================================================
   POPUPS
========================================================== */

function popupRestauracao(feature, layer){

    const p =
        feature.properties;

    layer.bindPopup(`

        <div class="popup-content">

            <h3>
                ${p.Nome_Ocupacao || 'Sem nome'}
            </h3>

            <hr>

            <b>Área:</b>
            ${Number(p.HA || 0).toFixed(2)} ha

            <br>

            <b>Uso atual:</b>
            ${p.Uso_atual || '-'}

            <br>

            <b>Tipo:</b>
            ${p.Tipo_de_us || '-'}
              
        </div>

    `);

    layer.bindTooltip(

        p.Nome_Ocupacao || '',

        {

            permanent:true,

            direction:'center',

            className:'label-restauracao'

        }

    );

}

/* ==========================================================
   ESTATÍSTICAS
========================================================== */

function atualizarEstatisticas(idFiltro){

    let feats =
        restauracaoData.features;

    if(idFiltro !== 0){

        feats =
            feats.filter(

                f => Number(
                    f.properties.ID
                ) === idFiltro

            );

    }

    const n =
        feats.length;

    const areaTotal =
        feats.reduce(

            (acc,f) =>

                acc +
                Number(
                    f.properties.HA || 0
                ),

            0

        );

    const areaMedia =
        n > 0
            ? areaTotal / n
            : 0;

    document.getElementById(
        'n-poligonos'
    ).innerHTML = n;

    document.getElementById(
        'area-total'
    ).innerHTML =
        areaTotal.toFixed(2) +
        ' ha';

    document.getElementById(
        'area-media'
    ).innerHTML =
        areaMedia.toFixed(2) +
        ' ha';

}

/* ==========================================================
   LEGENDA
========================================================== */

function gerarLegendaHTML(){

    let html = '';

    html += `

        <div class="legend-item">

            <span
                class="legend-color"
                style="background:${CFG.metareila}">
            </span>

            Metareila

        </div>

    `;

    html += `

        <div class="legend-item">

            <span
                class="legend-color"
                style="background:${CFG.ecopore}">
            </span>

            Ecoporé

        </div>

    `;

    html += '<hr>';

    Object.entries(
        CFG.classesUso
    ).forEach(([classe,cor])=>{

        html += `

            <div class="legend-item">

                <span
                    class="legend-color"
                    style="background:${cor}">
                </span>

                ${classe}

            </div>

        `;

    });

    document.getElementById(
        'legend-container'
    ).innerHTML = html;

}

/* ==========================================================
   RESTAURAÇÃO
========================================================== */

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

                style:
                    estiloRestauracao,

                filter:f => {

                    if(idFiltro===0){

                        return true;

                    }

                    return Number(
                        f.properties.ID
                    ) === idFiltro;

                },

                onEachFeature:
                    popupRestauracao

            }

        );

    restauracaoLayer.addTo(map);

    if(
        restauracaoLayer
        .getLayers()
        .length
    ){

        map.fitBounds(

            restauracaoLayer
            .getBounds(),

            {

                padding:[40,40]

            }

        );

    }

    atualizarEstatisticas(
        idFiltro
    );

}

/* ==========================================================
   CAMADAS
========================================================== */

function configurarCamadas(){

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

                let camada;

                if(nome==='uso'){

                    camada = usoLayer;

                }
                else if(
                    nome==='restauracao'
                ){

                    camada =
                        restauracaoLayer;

                }
                else{

                    camada =
                        limiteLayer;

                }

                if(ativo){

                    camada.addTo(map);

                }else{

                    map.removeLayer(
                        camada
                    );

                }

            }
        );

    });

}

/* ==========================================================
   FILTRO
========================================================== */

function configurarFiltro(){

    document
    .getElementById(
        'area-select'
    )
    .addEventListener(

        'change',

        e=>{

            const id =
                Number(
                    e.target.value
                );

            renderRestauracao(id);

        }

    );

}

/* ==========================================================
   INIT
========================================================== */

async function init(){

    try{

        criarMapa();

        const dados =
            await Promise.all([

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

        limiteData =
            dados[0];

        usoData =
            dados[1];

        restauracaoData =
            dados[2];

        limiteLayer =
            L.geoJSON(

                limiteData,

                {

                    style:
                        estiloLimite

                }

            ).addTo(map);

        usoLayer =
            L.geoJSON(

                usoData,

                {

                    style:
                        estiloUso

                }

            ).addTo(map);

        renderRestauracao(0);

        configurarFiltro();

        configurarCamadas();

        gerarLegendaHTML();

    }
    catch(err){

        console.error(err);

        alert(
            'Erro ao carregar os dados do Geoportal.'
        );

    }

}

init();