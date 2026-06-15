/* ==========================================================
   GEOPORTAL RESTAURAÇÃO
   TI SETE DE SETEMBRO
   APP.JS REFATORADO
   PARTE 1/2
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

let limiteData;
let usoData;
let restauracaoData;
let aldeiasData;

let limiteLayer;
let usoLayer;
let restauracaoLayer;
let aldeiasLayer;

/* ==========================================================
   MAPA
========================================================== */

function criarMapa(){

    map = L.map('map', {

        zoomControl : true

    });

    map.setView(
        [-11.0, -61.4],
        8
    );

    L.tileLayer(

        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',

        {

            subdomains : ['0','1','2','3'],
            maxZoom : 20

        }

    ).addTo(map);

}

/* ==========================================================
   CARREGAMENTO
========================================================== */

async function fetchGeoJSON(url){

    const response =
        await fetch(url);

    if(!response.ok){

        throw new Error(
            `Erro carregando ${url}`
        );

    }

    return await response.json();

}

async function carregarDados(){

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
            ),

            fetchGeoJSON(
                'data/aldeias.geojson'
            )

        ]);

    limiteData       = dados[0];
    usoData          = dados[1];
    restauracaoData  = dados[2];
    aldeiasData      = dados[3];

}

/* ==========================================================
   CORES
========================================================== */

function getCorUso(tipo){

    return (
        CFG.classesUso[tipo]
        || '#9e9e9e'
    );

}

/* ==========================================================
   ESTILOS
========================================================== */

function estiloLimite(){

    return {

        color : '#ffffff',
        weight : 3,
        opacity : 1,
        fillOpacity : 0

    };

}

function estiloUso(feature){

    const cor = getCorUso(

        feature.properties.Tipo_de_us

    );

    return {

        color : cor,
        weight : 1,

        fillColor : cor,
        fillOpacity : 0.45

    };

}

function estiloRestauracao(feature){

    const id =
        Number(
            feature.properties.ID
        );

    let cor =
        CFG.metareila;

    if(id === 2){

        cor =
            CFG.ecopore;

    }

    return {

        color : cor,
        weight : 2,

        fillColor : cor,
        fillOpacity : 0.30

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
            ${Number(
                p.HA || 0
            ).toFixed(2)} ha

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

            permanent : true,

            direction : 'center',

            className :
                'label-restauracao'

        }

    );

}

function popupAldeia(feature, layer){

    const nome =

        feature.properties.Name ||
        'Aldeia';

    layer.bindPopup(`

        <div class="popup-content">

            <h3>${nome}</h3>

        </div>

    `);

    layer.bindTooltip(

        nome,

        {

            permanent : true,

            direction : 'top',

            offset : [0,-10],

            className :
                'label-aldeia'

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

    const nPoligonos =
        feats.length;

    const areaTotal =
        feats.reduce(

            (acc, f) =>

                acc +
                Number(
                    f.properties.HA || 0
                ),

            0

        );

    const areaMedia =

        nPoligonos > 0

        ? areaTotal / nPoligonos

        : 0;

    document.getElementById(
        'n-poligonos'
    ).innerHTML = nPoligonos;

    document.getElementById(
        'area-total'
    ).innerHTML =
        areaTotal.toFixed(2) + ' ha';

    document.getElementById(
        'area-media'
    ).innerHTML =
        areaMedia.toFixed(2) + ' ha';

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

    html += `
        <div class="legend-item">
            <span
                class="legend-color aldeia">
            </span>
            Aldeias
        </div>
    `;

    html += '<hr>';

    Object.entries(
        CFG.classesUso
    ).forEach(([classe,cor]) => {

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
   CAMADAS
========================================================== */

function criarLimite(){

    limiteLayer =
        L.geoJSON(

            limiteData,

            {

                style:
                    estiloLimite

            }

        );

    limiteLayer.addTo(map);

}

function criarUso(){

    usoLayer =
        L.geoJSON(

            usoData,

            {

                style:
                    estiloUso

            }

        );

    usoLayer.addTo(map);

}

function criarRestauracao(idFiltro = 0){

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

                filter:
                function(feature){

                    if(idFiltro === 0){

                        return true;

                    }

                    return (

                        Number(
                            feature.properties.ID
                        ) === idFiltro

                    );

                },

                onEachFeature:
                    popupRestauracao

            }

        );

    restauracaoLayer.addTo(map);

    atualizarEstatisticas(
        idFiltro
    );

}

function criarAldeias(){

    aldeiasLayer =
        L.geoJSON(

            aldeiasData,

            {

                pointToLayer:
                function(feature, latlng){

                    return L.circleMarker(

                        latlng,

                        {

                            radius : 5,

                            color : '#243342',

                            weight : 2,

                            fillColor : '#ffffff',

                            fillOpacity : 1

                        }

                    );

                },

                onEachFeature:
                    popupAldeia

            }

        );

    aldeiasLayer.addTo(map);

}

/* ==========================================================
   ENQUADRAMENTO
========================================================== */

function zoomInicial(){

    const grupo = L.featureGroup([

        limiteLayer,
        restauracaoLayer

    ]);

    if(
        grupo.getLayers().length
    ){

        map.fitBounds(

            grupo.getBounds(),

            {

                padding:[40,40]

            }

        );

    }

}

/* ==========================================================
   FILTRO
========================================================== */

function configurarFiltro(){

    const seletor =

        document.getElementById(
            'area-select'
        );

    if(!seletor){

        return;

    }

    seletor.addEventListener(

        'change',

        function(e){

            const idFiltro =

                Number(
                    e.target.value
                );

            criarRestauracao(
                idFiltro
            );

        }

    );

}

/* ==========================================================
   CONTROLE DE CAMADAS
========================================================== */

function configurarCamadas(){

    const controles =

        document.querySelectorAll(
            'input[data-layer]'
        );

    controles.forEach(

        function(checkbox){

            checkbox.addEventListener(

                'change',

                function(e){

                    const nome =

                        e.target.dataset.layer;

                    const ativo =

                        e.target.checked;

                    let layer = null;

                    if(nome === 'uso'){

                        layer =
                            usoLayer;

                    }
                    else if(
                        nome === 'restauracao'
                    ){

                        layer =
                            restauracaoLayer;

                    }
                    else if(
                        nome === 'aldeias'
                    ){

                        layer =
                            aldeiasLayer;

                    }
                    else if(
                        nome === 'limite'
                    ){

                        layer =
                            limiteLayer;

                    }

                    if(!layer){

                        return;

                    }

                    if(ativo){

                        layer.addTo(map);

                    }
                    else{

                        map.removeLayer(
                            layer
                        );

                    }

                }

            );

        }

    );

}

/* ==========================================================
   PAINEL MOBILE
========================================================== */

function configurarPainel(){

    const botao =

        document.getElementById(
            'panel-toggle'
        );

    const painel =

        document.getElementById(
            'panel'
        );

    if(
        !botao ||
        !painel
    ){

        return;

    }

    botao.addEventListener(

        'click',

        function(){

            painel.classList.toggle(
                'hidden'
            );

        }

    );

}

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

async function init(){

    try{

        criarMapa();

        await carregarDados();

        criarLimite();

        criarUso();

        criarRestauracao();

        criarAldeias();

        zoomInicial();

        configurarFiltro();

        configurarCamadas();

        configurarPainel();

        gerarLegendaHTML();

        console.log(
            'Geoportal carregado com sucesso.'
        );

    }
    catch(err){

        console.error(err);

        alert(
            'Erro ao carregar o Geoportal.'
        );

    }

}

document.addEventListener(

    'DOMContentLoaded',

    init

);