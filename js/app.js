import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- CONSTANTES ---
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed";
const BASE_URL = "https://api.rawg.io/api/games";

// --- ESTADO ---
let currentPlatform = "all";      // "all" o ID numérico
let currentPage = 1;
let isLoading = false;
let hasMore = true;

// --- 1. SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0];
        if(document.getElementById('navUsername')) document.getElementById('navUsername').innerText = username;
        if(document.getElementById('displayUser')) document.getElementById('displayUser').innerText = username;
        if(document.getElementById('displayEmail')) document.getElementById('displayEmail').innerText = user.email;
    } else {
        window.location.href = "index.html";
    }
});

const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if(btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => { signOut(auth); });
}

// --- 2. NAVEGACIÓN PRINCIPAL (secciones fijas) ---
const navItems = document.querySelectorAll('.nav-item:not(.platform-btn)'); // excluimos los botones de plataforma
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        
        const seccionObjetivo = document.getElementById(target);
        if(seccionObjetivo) seccionObjetivo.classList.remove('d-none');

        // Si es "tendencias" y tiene data-platform, cargamos
        if (target === 'tendencias') {
            const platform = item.getAttribute('data-platform') || 'all';
            cargarJuegos(platform, 1, true);
        }
        if (target === 'amigos') inicializarChat();
    });
});

// --- 3. BOTONES DE PLATAFORMA ---
const platformBtns = document.querySelectorAll('.platform-btn');
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Quitamos activo de todos los nav-items y ponemos activo en este
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const platformId = btn.getAttribute('data-platform');
        // Mostramos la sección de tendencias (que usaremos como contenedor)
        sections.forEach(sec => sec.classList.add('d-none'));
        const seccionTendencias = document.getElementById('tendencias');
        seccionTendencias.classList.remove('d-none');

        // Cargamos juegos de esa plataforma
        cargarJuegos(platformId, 1, true);
    });
});

// --- 4. CARGA DE JUEGOS (con paginación) ---
async function cargarJuegos(platform, page = 1, reset = false) {
    const contenedor = document.getElementById('contenedor-juegos');
    const titulo = document.getElementById('tituloPlataforma');
    const subtitulo = document.getElementById('subtituloPlataforma');
    const btnCargarMas = document.getElementById('btnCargarMas');

    if (!contenedor) return;

    // Evitar múltiples llamadas simultáneas
    if (isLoading) return;
    isLoading = true;

    // Si reseteamos, limpiamos y reiniciamos la página
    if (reset) {
        currentPage = 1;
        hasMore = true;
        contenedor.innerHTML = '<p style="color: #666;">Cargando juegos...</p>';
        btnCargarMas.style.display = 'none';
    }

    // Construir URL
    let url = `${BASE_URL}?key=${RAWG_API_KEY}&page_size=20&page=${page}`;
    if (platform !== 'all') {
        url += `&platforms=${platform}`;
    }

    // Nombre de la plataforma para el título
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
    titulo.textContent = `Juegos de ${nombrePlataforma}`;
    subtitulo.textContent = `Los títulos más populares en ${nombrePlataforma}`;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (!datos.results || datos.results.length === 0) {
            contenedor.innerHTML = '<p>No se encontraron juegos para esta plataforma.</p>';
            btnCargarMas.style.display = 'none';
            hasMore = false;
            isLoading = false;
            return;
        }

        // Si es reset, reemplazamos el contenido
        if (reset) {
            contenedor.innerHTML = '';
        }

        // Renderizar cada juego
        datos.results.forEach(juego => {
            const plataformasTexto = juego.platforms.map(p => p.platform.name).slice(0, 3).join(', ');
            const generos = juego.genres ? juego.genres.map(g => g.name).slice(0, 2).join(', ') : '';

            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <img src="${juego.background_image || 'https://via.placeholder.com/300x200?text=Sin+imagen'}" alt="${juego.name}">
                <h4>${juego.name}</h4>
                <p class="platforms">🎮 ${plataformasTexto}${juego.platforms.length > 3 ? ' ...' : ''}</p>
                <p style="color: #666; font-size: 0.8rem; margin-bottom: 10px;">⭐ ${juego.rating} / 5</p>
                <p style="color: #888; font-size: 0.75rem; margin-bottom: 8px;">${generos}</p>
                <button class="btn-juego" onclick="alert('Más info de ${juego.name}')">Ver detalles</button>
            `;
            contenedor.appendChild(card);
        });

        // Control de paginación
        hasMore = datos.next !== null;
        if (hasMore) {
            btnCargarMas.style.display = 'block';
        } else {
            btnCargarMas.style.display = 'none';
        }

        currentPage = page; // actualizamos la página actual

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<p style="color: red; font-weight: bold;">Error al cargar juegos. Verifica tu conexión o la API Key.</p>';
    } finally {
        isLoading = false;
    }
}

// --- 5. BOTÓN "CARGAR MÁS" ---
document.getElementById('btnCargarMas')?.addEventListener('click', () => {
    if (!isLoading && hasMore) {
        const nextPage = currentPage + 1;
        // Necesitamos saber la plataforma actual, la obtenemos del botón activo o de una variable
        const activePlatformBtn = document.querySelector('.platform-btn.active');
        let platform = 'all';
        if (activePlatformBtn) {
            platform = activePlatformBtn.getAttribute('data-platform');
        } else {
            // Si no hay botón activo, tal vez se activó "Todas las plataformas"
            const allBtn = document.querySelector('.nav-item[data-target="tendencias"][data-platform="all"]');
            if (allBtn && allBtn.classList.contains('active')) {
                platform = 'all';
            }
        }
        cargarJuegos(platform, nextPage, false);
    }
});

// --- 6. CHAT (sin cambios) ---
let chatIniciado = false;

function inicializarChat() {
    if(chatIniciado) return;
    chatIniciado = true;

    const cajaMensajes = document.getElementById('caja-mensajes');
    if(!cajaMensajes) return;

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

const btnEnviarMensaje = document.getElementById('btnEnviarMensaje');
if(btnEnviarMensaje) {
    btnEnviarMensaje.addEventListener('click', async () => {
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
}
