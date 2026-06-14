// 1. Inicializa o Mapa centrado em Rondônia
const map = L.map('map').setView([-11.0, -62.0], 7);

// 2. Adiciona o mapa base (imagem de satélite ou ruas do Google/OSM)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Variáveis para guardar nossas camadas
let camadaRestauracao;
let camadaUsoOcupacao;
let camadaLimiteTI;
let dadosRestauracaoGeoJSON; // Guarda os dados brutos para podermos filtrar depois

// 3. Função para carregar os arquivos GeoJSON da pasta 'data'
async function carregarDados() {
    try {
        // ---- CARREGA LIMITE DA TI ----
        const respLimite = await fetch('data/limite_ti.geojson');
        const dadosLimite = await respLimite.json();
        camadaLimiteTI = L.geoJSON(dadosLimite, {
            style: { color: 'black', weight: 3, fillOpacity: 0 }
        }).addTo(map);
        // Ajusta o zoom do mapa para caber a TI
        map.fitBounds(camadaLimiteTI.getBounds());

        // ---- CARREGA USO E OCUPAÇÃO ----
        const respUso = await fetch('data/uso_ocupacao.geojson');
        const dadosUso = await respUso.json();
        camadaUsoOcupacao = L.geoJSON(dadosUso, {
            style: { color: 'orange', weight: 1, fillOpacity: 0.3 }
        }).addTo(map);

        // ---- CARREGA ÁREAS DE RESTAURAÇÃO ----
        const respRestauracao = await fetch('data/areas_restauracao.geojson');
        dadosRestauracaoGeoJSON = await respRestauracao.json();
        
        // Renderiza a restauração pela primeira vez (Mostrar Todas)
        renderizarRestauracao(0);

    } catch (erro) {
        console.error("Erro ao carregar os dados. Você está rodando um servidor local?", erro);
        alert("Erro ao carregar mapa. Veja o console (F12).");
    }
}

// 4. Função para desenhar as áreas de restauração com base no filtro
function renderizarRestauracao(idFiltro) {
    // Se a camada já existir no mapa, remove para desenhar a nova
    if (camadaRestauracao) {
        map.removeLayer(camadaRestauracao);
    }

    camadaRestauracao = L.geoJSON(dadosRestauracaoGeoJSON, {
        // Estilo visual da camada
        style: { color: 'green', weight: 2, fillOpacity: 0.7, fillColor: '#81c784' },
        
        // Filtro: decide se o polígono entra ou não
        filter: function(feature) {
            if (idFiltro === 0) return true; // 0 = Mostrar todas
            return feature.properties.ID === idFiltro; // Só mostra se o ID bater com o botão clicado
        },
        
        // Rótulo (Popup) criado ao clicar no polígono
        onEachFeature: function(feature, layer) {
            // Garante que não vai dar erro se HA estiver vazio
            let hectares = feature.properties.HA ? parseFloat(feature.properties.HA).toFixed(2) : "N/D";
            let ocupacao = feature.properties.Nome_Ocupacao || "Não identificado";
            
            // Monta o texto em HTML
            let textoPopup = `<strong>Ocupação:</strong> ${ocupacao}<br><strong>Área:</strong> ${hectares} ha`;
            layer.bindPopup(textoPopup);
        }
    }).addTo(map);
}

// 5. Função que é chamada quando o usuário clica nos botões do HTML
function filtrarMapa(idFiltro) {
    renderizarRestauracao(idFiltro);
}

// Inicia o carregamento quando a página abre
carregarDados();