/* ==========================================================
   GEOPORTAL RESTAURAÇÃO
   TI SETE DE SETEMBRO

   PARTE 1
========================================================== */

/* ==========================================================
   CONFIGURAÇÕES
========================================================== */

const CFG = {

    metareila:'#ff0051',

    ecopore:'#008bfb',

    classesUso:{

        'Bananal':'#00c853',

        'Cacau':'#6d4c41',

        'Cafezal':'#8d6e63',

        'Capoeira':'#7cb342',

        'Castanhais':'#33691e',

        'Consórcio de lavouras':'#ff9800',

        'Outras culturas':'#ffb300',

        'Pastagem':'#f3c300',

        'Roça tradicional':'#ef6c00'

    }

};

/* ==========================================================
   VARIÁVEIS GLOBAIS
========================================================== */

let map;

let limiteLayer;

let usoLayer;

let restauracaoLayer;

let drawLayer;

let limiteData;

let usoData;

let restauracaoData;

let featureEmEdicao = null;

/* ==========================================================
   MAPA
========================================================== */

function criarMapa(){

    map = L.map(
        'map',
        {
            zoomControl:true
        }
    );

    map.setView(
        [-11.0,-61.40],
        8
    );

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

    const resposta =
        await fetch(url);

    if(!resposta.ok){

        throw new Error(
            `Erro carregando ${url}`
        );

    }

    return await resposta.json();

}

/* ==========================================================
   CORES USO
========================================================== */

function getCorUso(tipo){

    if(!tipo){

        return '#9e9e9e';

    }

    return CFG.classesUso[tipo]
        || '#9e9e9e';

}

/* ==========================================================
   ESTILO USO
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

/* ==========================================================
   ESTILO RESTAURAÇÃO
========================================================== */

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

        color:cor,

        weight:2,

        fillColor:cor,

        fillOpacity:0.30

    };

}

/* ==========================================================
   ESTILO LIMITE TI
========================================================== */

function estiloLimite(){

    return {

        color:'#ffffff',

        weight:3,

        fillOpacity:0

    };

}

/* ==========================================================
   STATUS
========================================================== */

function obterStatus(feature){

    const status =
        feature.properties.Validacao;

    if(!status){

        return 'Pendente';

    }

    return status;

}

function classeStatus(status){

    if(status === 'Validada'){

        return 'validada';

    }

    if(status === 'Nao_Validada'){

        return 'nao-validada';

    }

    return 'pendente';

}

/* ==========================================================
   POPUP
========================================================== */

function popupRestauracao(
    feature,
    layer
){

    const p =
        feature.properties;

    const status =
        obterStatus(feature);

    layer.bindTooltip(

        p.Nome_Ocupacao || '',

        {

            permanent:true,

            direction:'center',

            className:'label-restauracao'

        }

    );

    layer.bindPopup(

        `
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

            <br><br>

            <span class="status ${classeStatus(status)}">

                ${status}

            </span>

            <br><br>

            <button
                class="popup-btn popup-validar"
                onclick="validarArea(${L.stamp(layer)})">

                ✓ Validar

            </button>

            <button
                class="popup-btn popup-rejeitar"
                onclick="rejeitarArea(${L.stamp(layer)})">

                ✗ Não validar

            </button>

        </div>
        `
    );

}

/* ==========================================================
   VALIDAÇÃO
========================================================== */

window.validarArea = function(layerId){

    restauracaoLayer.eachLayer(layer=>{

        if(L.stamp(layer) === layerId){

            layer.feature.properties.Validacao =
                'Validada';

        }

    });

    reconstruirRestauracao();

};

window.rejeitarArea = function(layerId){

    restauracaoLayer.eachLayer(layer=>{

        if(L.stamp(layer) === layerId){

            layer.feature.properties.Validacao =
                'Nao_Validada';

        }

    });

    reconstruirRestauracao();

};

/* ==========================================================
   LEGENDA
========================================================== */

function gerarLegenda(){

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
   LEAFLET DRAW
========================================================== */

function criarCamadaDesenho(){

    drawLayer =
        new L.FeatureGroup();

    map.addLayer(
        drawLayer
    );

}
/* ==========================================================
   FILTRO ATUAL
========================================================== */

let filtroAtual = 0;

/* ==========================================================
   ESTATÍSTICAS
========================================================== */

function atualizarEstatisticas(){

    let feats =
        restauracaoData.features;

    if(filtroAtual !== 0){

        feats =
            feats.filter(

                f => Number(
                    f.properties.ID
                ) === filtroAtual

            );

    }

    const nPoligonos =
        feats.length;

    const areaTotal =
        feats.reduce(

            (acc,f)=>

                acc +
                Number(
                    f.properties.HA || 0
                ),

            0

        );

    const areaValidada =
        feats
        .filter(

            f =>

            f.properties.Validacao ===
            'Validada'

        )
        .reduce(

            (acc,f)=>

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
    ).innerHTML =
        nPoligonos;

    document.getElementById(
        'area-total'
    ).innerHTML =
        areaTotal.toFixed(2) +
        ' ha';

    document.getElementById(
        'area-validada'
    ).innerHTML =
        areaValidada.toFixed(2) +
        ' ha';

    document.getElementById(
        'area-media'
    ).innerHTML =
        areaMedia.toFixed(2) +
        ' ha';

}

/* ==========================================================
   RESTAURAÇÃO
========================================================== */

function renderRestauracao(){

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

                filter:feature=>{

                    if(
                        filtroAtual === 0
                    ){

                        return true;

                    }

                    return Number(
                        feature.properties.ID
                    ) === filtroAtual;

                },

                onEachFeature:
                    popupRestauracao

            }

        );

    restauracaoLayer.addTo(map);

    atualizarEstatisticas();

}

/* ==========================================================
   RECONSTRUIR CAMADA
========================================================== */

function reconstruirRestauracao(){

    renderRestauracao();

}

/* ==========================================================
   FILTRO
========================================================== */

function configurarFiltro(){

    const select =
        document.getElementById(
            'area-select'
        );

    select.addEventListener(

        'change',

        e=>{

            filtroAtual =
                Number(
                    e.target.value
                );

            renderRestauracao();

        }

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

                let layer;

                if(nome==='uso'){

                    layer =
                        usoLayer;

                }
                else if(
                    nome==='restauracao'
                ){

                    layer =
                        restauracaoLayer;

                }
                else{

                    layer =
                        limiteLayer;

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

    });

}

/* ==========================================================
   LIMITES
========================================================== */

function carregarLimite(){

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

/* ==========================================================
   USO E OCUPAÇÃO
========================================================== */

function carregarUso(){

    usoLayer =
        L.geoJSON(

            usoData,

            {

                style:
                    estiloUso,

                onEachFeature:
                    function(feature,layer){

                        const p =
                            feature.properties;

                        layer.bindPopup(

                            `
                            <b>
                            ${p.Nome || '-'}
                            </b>

                            <hr>

                            Tipo:

                            ${p.Tipo_de_us || '-'}

                            <br>

                            Área:

                            ${Number(
                                p.Area_ha || 0
                            ).toFixed(2)} ha
                            `
                        );

                    }

            }

        );

    usoLayer.addTo(map);

}

/* ==========================================================
   AJUSTE INICIAL
========================================================== */

function ajustarMapaInicial(){

    if(
        limiteLayer &&
        limiteLayer.getBounds()
    ){

        map.fitBounds(

            limiteLayer.getBounds(),

            {

                padding:[30,30]

            }

        );

    }

}

/* ==========================================================
   CARREGAMENTO
========================================================== */

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
            )

        ]);

    limiteData =
        dados[0];

    usoData =
        dados[1];

    restauracaoData =
        dados[2];

    restauracaoData.features.forEach(f=>{

        if(
            !f.properties.Validacao
        ){

            f.properties.Validacao =
                'Pendente';

        }

    });

    carregarLimite();

    carregarUso();

    renderRestauracao();

    ajustarMapaInicial();

}
/* ==========================================================
   MODAL
========================================================== */

function abrirModalNovaArea(){

    document
    .getElementById('modal-nova-area')
    .classList
    .remove('hidden');

}

function fecharModalNovaArea(){

    document
    .getElementById('modal-nova-area')
    .classList
    .add('hidden');

}

/* ==========================================================
   DESENHO
========================================================== */

function configurarDraw(){

    const drawControl =
        new L.Control.Draw({

            draw:{

                polygon:true,

                rectangle:false,

                circle:false,

                circlemarker:false,

                marker:false,

                polyline:false

            },

            edit:{

                featureGroup:
                    drawLayer

            }

        });

    map.addControl(
        drawControl
    );

    map.on(

        L.Draw.Event.CREATED,

        function(event){

            featureEmEdicao =
                event.layer;

            abrirModalNovaArea();

        }

    );

}

/* ==========================================================
   ÁREA EM HECTARES
========================================================== */

function calcularAreaHa(layer){

    const geojson =
        layer.toGeoJSON();

    const areaM2 =
        turf.area(
            geojson
        );

    return areaM2 / 10000;

}

/* ==========================================================
   NOVA FEATURE
========================================================== */

function salvarNovaArea(){

    if(!featureEmEdicao){

        return;

    }

    const nome =
        document
        .getElementById('novo-nome')
        .value
        .trim();

    const usoAtual =
        document
        .getElementById('novo-uso')
        .value;

    const tipoUso =
        document
        .getElementById('novo-tipo')
        .value;

    if(!nome){

        alert(
            'Informe o nome.'
        );

        return;
    }

    const areaHa =
        calcularAreaHa(
            featureEmEdicao
        );

    const novoId =
        restauracaoData.features
        .length + 1;

    const novaFeature =
        featureEmEdicao.toGeoJSON();

    novaFeature.properties = {

        ID:novoId,

        Nome_Ocupacao:nome,

        Uso_atual:usoAtual,

        Tipo_de_us:tipoUso,

        HA:areaHa,

        Area_ha:areaHa,

        Validacao:'Pendente'

    };

    restauracaoData.features.push(
        novaFeature
    );

    featureEmEdicao = null;

    fecharModalNovaArea();

    reconstruirRestauracao();

    atualizarEstatisticas();

    alert(
        'Área adicionada com sucesso.'
    );

}

/* ==========================================================
   EXPORTAR GEOJSON
========================================================== */

function exportarGeoJSON(){

    const texto =
        JSON.stringify(

            restauracaoData,

            null,

            2

        );

    const blob =
        new Blob(

            [texto],

            {
                type:'application/json'
            }

        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement('a');

    a.href = url;

    a.download =
        'areas_restauracao_atualizado.geojson';

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}

/* ==========================================================
   BOTÕES
========================================================== */

function configurarFerramentas(){

    const btnNovaArea =
        document.getElementById(
            'btn-nova-area'
        );

    const btnExportar =
        document.getElementById(
            'btn-exportar'
        );

    const btnSalvar =
        document.getElementById(
            'salvar-area'
        );

    const btnCancelar =
        document.getElementById(
            'cancelar-area'
        );

    btnNovaArea.addEventListener(

        'click',

        ()=>{

            alert(

                'Desenhe um polígono no mapa.'

            );

        }

    );

    btnExportar.addEventListener(

        'click',

        exportarGeoJSON

    );

    btnSalvar.addEventListener(

        'click',

        salvarNovaArea

    );

    btnCancelar.addEventListener(

        'click',

        ()=>{

            featureEmEdicao = null;

            fecharModalNovaArea();

        }

    );

}

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

async function init(){

    try{

        criarMapa();

        criarCamadaDesenho();

        gerarLegenda();

        await carregarDados();

        configurarFiltro();

        configurarCamadas();

        configurarDraw();

        configurarFerramentas();

        console.log(
            'Geoportal carregado.'
        );

    }
    catch(error){

        console.error(error);

        alert(

            'Erro ao carregar dados.'

        );

    }

}

/* ==========================================================
   START
========================================================== */

init();