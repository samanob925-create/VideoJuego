import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ===== CONSTANTES =====
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed";
const BASE_URL = "https://api.rawg.io/api/games";

// ===== ESTADO GLOBAL =====
let currentPlatform = "all";       // "all" o ID numérico
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let allGames = [];                // para búsqueda local

// ===== ELEMENTOS DOM =====
const contenedor = document.getElementById('contenedor-juegos');
const tituloSeccion = document.getElementById('tituloSeccion');
const subtituloSeccion = document.getElementById('subtituloSeccion');
const btnCargarMas = document.getElementById('btnCargarMas');
const searchInput = document.getElementById('searchInput');
const btnBuscar = document.getElementById('btnBuscar');

// ===== 1. SESIÓN =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0];
        document.getElementById('navUsername').innerText = username;
        document.getElementById('displayUserShort').innerText = username;
        document.getElementById('displayUser').innerText = username;
        document.getElementById('displayEmail').innerText = user.email;
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth);
});

// ===== 2. NAVEGACIÓN PRINCIPAL =====
const navItems = document.querySelectorAll('.nav-item:not(.platform-btn)');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Desactivar todos los nav items
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        const seccion = document.getElementById(target);
        if (seccion) seccion.classList.remove('d-none');

        // Si es "inicio", cargar juegos según la plataforma activa (o "all")
        if (target === 'inicio') {
            // Obtener la plataforma del botón activo (puede ser un platform-btn)
            const activePlatformBtn = document.querySelector('.platform-btn.active');
            const platform = activePlatformBtn ? activePlatformBtn.getAttribute('data-platform') : 'all';
            cargarJuegos(platform, 1, true);
        }

        // Si es "amigos", inicializar chat
        if (target === 'amigos') inicializarChat();
    });
});

// ===== 3. BOTONES DE PLATAFORMA =====
const platformBtns = document.querySelectorAll('.platform-btn');
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const platform = btn.getAttribute('data-platform');
        // Mostrar la sección de inicio y ocultar las demás
        sections.forEach(sec => sec.classList.add('d-none'));
        document.getElementById('inicio').classList.remove('d-none');

        // Cargar juegos de esa plataforma
        cargarJuegos(platform, 1, true);
    });
});

// ===== 4. CARGA DE JUEGOS =====
async function cargarJuegos(platform, page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        hasMore = true;
        allGames = [];
        contenedor.innerHTML = '<p class="loading-text">Cargando juegos...</p>';
        btnCargarMas.style.display = 'none';
    }

    // Construir URL
    let url = `${BASE_URL}?key=${RAWG_API_KEY}&page_size=24&page=${page}`;
    if (platform !== 'all') {
        url += `&platforms=${platform}`;
    }

    // Actualizar título
    const platformNames = {
        '1': 'PC',
        '2': 'PlayStation',
        '3': 'Xbox',
        '4': 'Nintendo',
        '6': 'iOS',
        '7': 'Android',
        'all': 'Todas las plataformas'
    };
    const nombrePlataforma = platformNames[platform] || `Plataforma ${platform}`;
    tituloSeccion.textContent = `Juegos de ${nombrePlataforma}`;
    subtituloSeccion.textContent = `Los títulos más populares en ${nombrePlataforma}`;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (!datos.results || datos.results.length === 0) {
            contenedor.innerHTML = '<p style="color: #888;">No se encontraron juegos para esta plataforma.</p>';
            btnCargarMas.style.display = 'none';
            hasMore = false;
            isLoading = false;
            return;
        }

        if (reset) {
            contenedor.innerHTML = '';
        }

        // Guardar todos los juegos para búsqueda
        if (reset) {
            allGames = datos.results;
        } else {
            allGames = allGames.concat(datos.results);
        }

        // Renderizar
        renderGames(allGames);

        // Paginación
        hasMore = datos.next !== null;
        btnCargarMas.style.display = hasMore ? 'block' : 'none';
        currentPage = page;

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<p style="color: #e74c3c;">Error al cargar juegos. Verifica tu conexión o la API Key.</p>';
    } finally {
        isLoading = false;
    }
}

// ===== 5. RENDERIZAR JUEGOS =====
function renderGames(games) {
    if (!contenedor) return;
    contenedor.innerHTML = '';
    games.forEach(juego => {
        const plataformasTexto = juego.platforms.map(p => p.platform.name).slice(0, 3).join(', ');
        const generos = juego.genres ? juego.genres.map(g => g.name).slice(0, 2).join(', ') : '';

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${juego.background_image || 'https://via.placeholder.com/300x160?text=Sin+imagen'}" alt="${juego.name}">
            <div class="game-card-content">
                <h4>${juego.name}</h4>
                <p class="platforms">🎮 ${plataformasTexto}${juego.platforms.length > 3 ? ' ...' : ''}</p>
                <p class="rating">⭐ ${juego.rating} / 5</p>
                <p class="genres">${generos}</p>
                <button class="btn-juego" onclick="alert('Más información sobre ${juego.name}')">Ver detalles</button>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// ===== 6. BÚSQUEDA LOCAL =====
function buscarJuegos(termino) {
    if (!termino.trim()) {
        renderGames(allGames);
        return;
    }
    const filtrados = allGames.filter(juego =>
        juego.name.toLowerCase().includes(termino.toLowerCase())
    );
    renderGames(filtrados);
    // Ocultar botón "Cargar más" durante la búsqueda
    btnCargarMas.style.display = 'none';
}

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        buscarJuegos(searchInput.value);
    }
});

btnBuscar.addEventListener('click', () => {
    buscarJuegos(searchInput.value);
});

// ===== 7. BOTÓN "CARGAR MÁS" =====
btnCargarMas.addEventListener('click', () => {
    if (!isLoading && hasMore) {
        const nextPage = currentPage + 1;
        // Determinar plataforma activa
        const activePlatformBtn = document.querySelector('.platform-btn.active');
        let platform = 'all';
        if (activePlatformBtn) {
            platform = activePlatformBtn.getAttribute('data-platform');
        } else {
            // Si no hay botón activo, usar "all"
            platform = 'all';
        }
        cargarJuegos(platform, nextPage, false);
    }
});

// ===== 8. INICIALIZAR CARGA POR DEFECTO =====
// Al cargar la página, si la sección "inicio" está visible, cargamos "all"
// Como "inicio" está visible por defecto, lo hacemos.
document.addEventListener('DOMContentLoaded', () => {
    // Asegurar que el botón "Todas las plataformas" esté activo
    const allBtn = document.querySelector('.nav-item[data-target="inicio"]');
    if (allBtn) allBtn.classList.add('active');
    cargarJuegos('all', 1, true);
});

// ===== 9. CHAT (sin cambios) =====
let chatIniciado = false;

function inicializarChat() {
    if (chatIniciado) return;
    chatIniciado = true;

    const cajaMensajes = document.getElementById('caja-mensajes');
    if (!cajaMensajes) return;

    const q = query(collection(db, "chat_global"), orderBy("timestamp", "asc"));

    onSnapshot(q, (snapshot) => {
        cajaMensajes.innerHTML = '';
        snapshot.forEach((doc) => {
            const msj = doc.data();
            const esMio = msj.usuario === auth.currentUser.email;
            const claseBurbuja = esMio ? 'msg-bubble msg-mine' : 'msg-bubble';
            const autor = msj.usuario.split('@')[0];
            cajaMensajes.innerHTML += `
                <div class="${claseBurbuja}">
                    <span class="msg-author">${autor}</span>
                    <span>${msj.texto}</span>
                </div>
            `;
        });
        cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
    });
}

function filtrarPalabras(texto) {
    const groserias = ['mierda', 'carajo', 'idiota', 'estupido'];
    let textoFiltrado = texto;
    groserias.forEach(palabra => {
        const regex = new RegExp(palabra, 'gi');
        textoFiltrado = textoFiltrado.replace(regex, '***');
    });
    return textoFiltrado;
}

document.getElementById('btnEnviarMensaje').addEventListener('click', async () => {
    const input = document.getElementById('inputMensaje');
    const texto = input.value.trim();
    if (!texto || !auth.currentUser) return;

    const textoSeguro = filtrarPalabras(texto);
    input.value = '';
    try {
        await addDoc(collection(db, "chat_global"), {
            texto: textoSeguro,
            usuario: auth.currentUser.email,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error(error);
    }
});
