// =====================================================
// CONFIGURAÇÃO DO MAPA
// =====================================================

const map = L.map('map', {
    zoomControl: true
}).setView([-11.2, -61.3], 8);

// =====================================================
// BASEMAP
// =====================================================

L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution:
            '&copy; OpenStreetMap Contributors'
    }
).addTo(map);

// =====================================================
// VARIÁVEIS GLOBAIS
// =====================================================

let camadaTI = null;
let camadaUso = null;
let camadaRestauracao = null;

let geoRestauracao = null;

// =====================================================
// STATUS
// =====================================================

function atualizarStatus(texto) {
    document.getElementById("status").innerHTML = texto;
}

// =====================================================
// FETCH COM TRATAMENTO
// =====================================================

async function carregarGeoJSON(url) {

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error(
            `Erro ${resposta.status} ao carregar ${url}`
        );
    }

    return await resposta.json();
}

// =====================================================
// ESTILOS
// =====================================================

function estiloTI() {
    return {
        color: "#000000",
        weight: 3,
        fillOpacity: 0
    };
}

function estiloUso() {
    return {
        color: "#f57c00",
        weight: 1,
        fillColor: "#ffb74d",
        fillOpacity: 0.35
    };
}

function estiloRestauracao() {
    return {
        color: "#1b5e20",
        weight: 2,
        fillColor: "#4caf50",
        fillOpacity: 0.8
    };
}

// =====================================================
// POPUP RESTAURAÇÃO
// =====================================================

function popupRestauracao(feature, layer) {

    const p = feature.properties;

    const html = `
        <div>
            <div class="popup-title">
                ${p.Nome_Ocupacao ?? 'Sem nome'}
            </div>

            <hr>

            <b>ID:</b> ${p.ID}<br>
            <b>Uso:</b> ${p.Uso_atual ?? '-'}<br>
            <b>Tipo:</b> ${p.Tipo_de_us ?? '-'}<br>
            <b>Área:</b> ${Number(p.HA).toFixed(2)} ha<br>
            <b>Degradação:</b> ${p.Fator_degrad ?? '-'}
        </div>
    `;

    layer.bindPopup(html);
}

// =====================================================
// FILTRO
// =====================================================

function renderizarRestauracao(idFiltro) {

    if (!geoRestauracao) return;

    if (camadaRestauracao) {
        map.removeLayer(camadaRestauracao);
    }

    camadaRestauracao = L.geoJSON(
        geoRestauracao,
        {
            style: estiloRestauracao,

            filter: function(feature) {

                if (idFiltro === 0)
                    return true;

                return Number(feature.properties.ID)
                    === Number(idFiltro);
            },

            onEachFeature: popupRestauracao
        }
    );

    camadaRestauracao.addTo(map);

    if (camadaRestauracao.getLayers().length > 0) {
        map.fitBounds(
            camadaRestauracao.getBounds(),
            {
                padding: [30, 30]
            }
        );
    }
}

// =====================================================
// BOTÕES
// =====================================================

function filtrarMapa(id) {
    renderizarRestauracao(id);
}

window.filtrarMapa = filtrarMapa;

// =====================================================
// CARREGAMENTO
// =====================================================

async function iniciar() {

    try {

        atualizarStatus("Carregando GeoJSON...");

        const [
            limiteTI,
            usoOcupacao,
            restauracao
        ] = await Promise.all([
            carregarGeoJSON(
                "data/limite_ti.geojson"
            ),
            carregarGeoJSON(
                "data/uso_ocupacao.geojson"
            ),
            carregarGeoJSON(
                "data/areas_restauracao.geojson"
            )
        ]);

        camadaTI = L.geoJSON(
            limiteTI,
            {
                style: estiloTI
            }
        ).addTo(map);

        camadaUso = L.geoJSON(
            usoOcupacao,
            {
                style: estiloUso
            }
        ).addTo(map);

        geoRestauracao = restauracao;

        renderizarRestauracao(0);

        atualizarStatus(
            "Dados carregados com sucesso."
        );

    }
    catch (erro) {

        console.error(erro);

        atualizarStatus(
            "Erro ao carregar os dados. Verifique F12."
        );

        alert(
            "Falha ao carregar GeoJSON.\n\nVeja o Console (F12)."
        );
    }
}

// =====================================================

iniciar();