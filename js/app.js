import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, 
    getDocs, doc, getDoc, setDoc, deleteDoc, where 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ===== CONSTANTES =====
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed";
const BASE_URL = "https://api.rawg.io/api/games";
const NEWS_API_KEY = "pub_12345abcde"; // ¡Cambia por tu clave de NewsData.io!

// ===== ESTADO =====
let currentPlatform = "all";
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let allGames = [];
let currentUser = null;

// ===== DOM =====
const contenedor = document.getElementById('contenedor-juegos');
const tituloSeccion = document.getElementById('tituloSeccion');
const subtituloSeccion = document.getElementById('subtituloSeccion');
const btnCargarMas = document.getElementById('btnCargarMas');
const searchInput = document.getElementById('searchInput');
const btnBuscar = document.getElementById('btnBuscar');
const modal = document.getElementById('modalDetalle');
const modalClose = document.querySelector('.modal-close');

// ===== SESIÓN =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const username = user.email.split('@')[0];
        document.getElementById('navUsername').innerText = username;
        document.getElementById('displayUserShort').innerText = username;
        document.getElementById('displayUser').innerText = username;
        document.getElementById('displayEmail').innerText = user.email;
        cargarUsuarios();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth);
});

// ===== NAVEGACIÓN =====
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        const seccion = document.getElementById(target);
        if (seccion) seccion.classList.remove('d-none');

        switch(target) {
            case 'inicio':
                const platform = item.getAttribute('data-platform') || currentPlatform;
                cargarJuegos(platform, 1, true);
                break;
            case 'mejores':
                cargarMejores(1, true);
                break;
            case 'menos':
                cargarMenos(1, true);
                break;
            case 'favoritos':
                cargarFavoritos();
                break;
            case 'amigos':
                inicializarChat();
                cargarUsuarios();
                break;
            case 'noticias':
                cargarNoticias();
                break;
            default: break;
        }
    });
});

// ===== BOTONES DE PLATAFORMA =====
const platformBtns = document.querySelectorAll('.platform-btn');
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const platform = btn.getAttribute('data-platform');
        currentPlatform = platform;

        sections.forEach(sec => sec.classList.add('d-none'));
        document.getElementById('inicio').classList.remove('d-none');

        cargarJuegos(platform, 1, true);
    });
});

// ===== CARGA DE JUEGOS (con parent_platforms) =====
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

    let url = `${BASE_URL}?key=${RAWG_API_KEY}&page_size=24&page=${page}`;
    if (platform !== 'all') {
        url += `&parent_platforms=${platform}`;
    }

    const platformNames = {
        '1': 'PC', '2': 'PlayStation', '3': 'Xbox', '4': 'Nintendo',
        '6': 'iOS', '7': 'Android', 'all': 'Todas las plataformas'
    };
    tituloSeccion.textContent = `Juegos de ${platformNames[platform] || 'Plataforma'}`;
    subtituloSeccion.textContent = `Los títulos más populares`;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();

        if (!datos.results || datos.results.length === 0) {
            contenedor.innerHTML = '<p style="color:#888;">No se encontraron juegos para esta plataforma.</p>';
            btnCargarMas.style.display = 'none';
            hasMore = false;
            isLoading = false;
            return;
        }

        if (reset) allGames = datos.results;
        else allGames = allGames.concat(datos.results);

        renderGames(allGames, contenedor);
        hasMore = datos.next !== null;
        btnCargarMas.style.display = hasMore ? 'block' : 'none';
        currentPage = page;
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color:#e74c3c;">Error: ${error.message}</p>`;
        btnCargarMas.style.display = 'none';
    } finally {
        isLoading = false;
    }
}

// ===== RENDERIZAR JUEGOS =====
function renderGames(games, container) {
    if (!container) return;
    if (!games || games.length === 0) {
        container.innerHTML = '<p style="color:#888;">No hay juegos para mostrar.</p>';
        return;
    }
    container.innerHTML = '';
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
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn-juego" onclick="verDetalle(${juego.id})">Ver detalles</button>
                    <button class="btn-fav" data-id="${juego.id}" data-nombre="${juego.name}" data-imagen="${juego.background_image || ''}">❤️</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Actualizar estado de favoritos
    container.querySelectorAll('.btn-fav').forEach(async (btn) => {
        const id = btn.dataset.id;
        const esFav = await esFavorito(id);
        btn.style.color = esFav ? '#e74c3c' : 'inherit';
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleFavorito(id, btn.dataset.nombre, btn.dataset.imagen);
            const esFav2 = await esFavorito(id);
            btn.style.color = esFav2 ? '#e74c3c' : 'inherit';
        });
    });
}

// ===== BÚSQUEDA =====
function buscarJuegos(termino) {
    if (!termino.trim()) {
        renderGames(allGames, contenedor);
        btnCargarMas.style.display = hasMore ? 'block' : 'none';
        return;
    }
    const filtrados = allGames.filter(juego =>
        juego.name.toLowerCase().includes(termino.toLowerCase())
    );
    renderGames(filtrados, contenedor);
    btnCargarMas.style.display = 'none';
}
searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') buscarJuegos(searchInput.value); });
btnBuscar.addEventListener('click', () => buscarJuegos(searchInput.value));

btnCargarMas.addEventListener('click', () => {
    if (!isLoading && hasMore) cargarJuegos(currentPlatform, currentPage + 1, false);
});

// ===== MEJORES =====
let mejoresPage = 1, mejoresHasMore = true;
const contenedorMejores = document.getElementById('contenedor-mejores');
const btnCargarMasMejores = document.getElementById('btnCargarMasMejores');

async function cargarMejores(page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;
    if (reset) {
        mejoresPage = 1;
        mejoresHasMore = true;
        contenedorMejores.innerHTML = '<p class="loading-text">Cargando...</p>';
        btnCargarMasMejores.style.display = 'none';
    }
    const url = `${BASE_URL}?key=${RAWG_API_KEY}&ordering=-rating&page_size=24&page=${page}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();
        if (!datos.results || datos.results.length === 0) {
            contenedorMejores.innerHTML = '<p>No hay juegos.</p>';
            btnCargarMasMejores.style.display = 'none';
            mejoresHasMore = false;
            isLoading = false;
            return;
        }
        renderGames(datos.results, contenedorMejores);
        mejoresHasMore = datos.next !== null;
        btnCargarMasMejores.style.display = mejoresHasMore ? 'block' : 'none';
        mejoresPage = page;
    } catch (error) {
        contenedorMejores.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    } finally { isLoading = false; }
}
btnCargarMasMejores.addEventListener('click', () => {
    if (!isLoading && mejoresHasMore) cargarMejores(mejoresPage + 1, false);
});

// ===== MENOS POPULARES =====
let menosPage = 1, menosHasMore = true;
const contenedorMenos = document.getElementById('contenedor-menos');
const btnCargarMasMenos = document.getElementById('btnCargarMasMenos');

async function cargarMenos(page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;
    if (reset) {
        menosPage = 1;
        menosHasMore = true;
        contenedorMenos.innerHTML = '<p class="loading-text">Cargando...</p>';
        btnCargarMasMenos.style.display = 'none';
    }
    const url = `${BASE_URL}?key=${RAWG_API_KEY}&ordering=rating&page_size=24&page=${page}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();
        if (!datos.results || datos.results.length === 0) {
            contenedorMenos.innerHTML = '<p>No hay juegos.</p>';
            btnCargarMasMenos.style.display = 'none';
            menosHasMore = false;
            isLoading = false;
            return;
        }
        renderGames(datos.results, contenedorMenos);
        menosHasMore = datos.next !== null;
        btnCargarMasMenos.style.display = menosHasMore ? 'block' : 'none';
        menosPage = page;
    } catch (error) {
        contenedorMenos.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    } finally { isLoading = false; }
}
btnCargarMasMenos.addEventListener('click', () => {
    if (!isLoading && menosHasMore) cargarMenos(menosPage + 1, false);
});

// ===== FAVORITOS =====
async function esFavorito(juegoId) {
    if (!currentUser) return false;
    const q = query(collection(db, "favoritos"), where("uid", "==", currentUser.uid), where("juegoId", "==", juegoId));
    const snap = await getDocs(q);
    return !snap.empty;
}

async function toggleFavorito(juegoId, nombre, imagen) {
    if (!currentUser) return;
    const q = query(collection(db, "favoritos"), where("uid", "==", currentUser.uid), where("juegoId", "==", juegoId));
    const snap = await getDocs(q);
    if (snap.empty) {
        await addDoc(collection(db, "favoritos"), {
            uid: currentUser.uid,
            juegoId: juegoId,
            nombre: nombre,
            imagen: imagen,
            fecha: serverTimestamp()
        });
    } else {
        snap.forEach(async (doc) => await deleteDoc(doc.ref));
    }
    const seccionFav = document.getElementById('favoritos');
    if (!seccionFav.classList.contains('d-none')) cargarFavoritos();
}

async function cargarFavoritos() {
    const contenedor = document.getElementById('contenedor-favoritos');
    if (!currentUser) {
        contenedor.innerHTML = '<p>Inicia sesión para ver favoritos.</p>';
        return;
    }
    contenedor.innerHTML = '<p class="loading-text">Cargando favoritos...</p>';
    try {
        const q = query(collection(db, "favoritos"), where("uid", "==", currentUser.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
            contenedor.innerHTML = '<p style="color:#888;">No tienes favoritos aún. Agrega juegos desde las listas.</p>';
            return;
        }
        const favoritos = [];
        snap.forEach(doc => {
            const data = doc.data();
            favoritos.push({ id: data.juegoId, name: data.nombre, background_image: data.imagen });
        });
        contenedor.innerHTML = '';
        favoritos.forEach(juego => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <img src="${juego.background_image || 'https://via.placeholder.com/300x160?text=Sin+imagen'}" alt="${juego.name}">
                <div class="game-card-content">
                    <h4>${juego.name}</h4>
                    <button class="btn-juego" onclick="verDetalle(${juego.id})">Ver detalles</button>
                    <button class="btn-fav" style="color:#e74c3c;" onclick="toggleFavorito('${juego.id}', '${juego.name}', '${juego.background_image}')">❤️ Quitar</button>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar favoritos.</p>`;
    }
}

// ===== DETALLE (Modal) =====
window.verDetalle = async function(juegoId) {
    try {
        const url = `https://api.rawg.io/api/games/${juegoId}?key=${RAWG_API_KEY}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const juego = await resp.json();

        document.getElementById('detalleNombre').textContent = juego.name;
        document.getElementById('detalleImagen').src = juego.background_image || 'https://via.placeholder.com/600x300?text=Sin+imagen';
        document.getElementById('detalleDescripcion').textContent = juego.description_raw || 'Sin descripción disponible.';
        document.getElementById('detalleFecha').textContent = `Lanzamiento: ${juego.released || 'Desconocido'}`;
        document.getElementById('detalleRating').textContent = `Rating: ${juego.rating} / 5 (${juego.ratings_count} votos)`;
        document.getElementById('detallePlataformas').textContent = `Plataformas: ${juego.platforms.map(p => p.platform.name).join(', ')}`;
        document.getElementById('detalleDesarrollador').textContent = `Desarrollador: ${juego.developers ? juego.developers.map(d => d.name).join(', ') : 'Desconocido'}`;
        document.getElementById('detalleGeneros').textContent = `Géneros: ${juego.genres ? juego.genres.map(g => g.name).join(', ') : 'No especificado'}`;

        modal.classList.remove('d-none');
    } catch (error) {
        alert('Error al cargar detalles: ' + error.message);
    }
};

modalClose.addEventListener('click', () => modal.classList.add('d-none'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('d-none'); });

// ===== NOTICIAS =====
async function cargarNoticias() {
    const contenedor = document.getElementById('contenedor-noticias');
    contenedor.innerHTML = '<p class="loading-text">Cargando noticias...</p>';
    try {
        const url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=videojuegos&language=es&size=10`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.results || data.results.length === 0) {
            contenedor.innerHTML = '<p>No se encontraron noticias.</p>';
            return;
        }
        contenedor.innerHTML = '';
        data.results.forEach(noticia => {
            const card = document.createElement('div');
            card.className = 'noticia-card';
            card.innerHTML = `
                <img src="${noticia.image_url || 'https://via.placeholder.com/150x100?text=Noticia'}" alt="${noticia.title}">
                <div>
                    <h3>${noticia.title}</h3>
                    <p>${noticia.description || 'Sin descripción.'}</p>
                    <a href="${noticia.link}" target="_blank">Leer más</a>
                    <span style="font-size:0.8rem; color:#999; margin-left:10px;">${noticia.pubDate ? new Date(noticia.pubDate).toLocaleDateString() : ''}</span>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar noticias: ${error.message}</p>`;
    }
}

// ===== AMIGOS =====
async function cargarUsuarios() {
    const contenedor = document.getElementById('listaUsuarios');
    if (!contenedor) return;
    try {
        const snap = await getDocs(collection(db, "usuarios"));
        const usuarios = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (doc.id !== currentUser?.uid) {
                usuarios.push({ uid: doc.id, nombre: data.nombre, email: data.email });
            }
        });
        if (usuarios.length === 0) {
            contenedor.innerHTML = '<p>No hay otros usuarios registrados.</p>';
            return;
        }
        contenedor.innerHTML = '';
        usuarios.forEach(user => {
            const card = document.createElement('div');
            card.className = 'friend-card';
            card.innerHTML = `
                <div class="friend-info">
                    <div class="friend-avatar" style="background: #3498db;">${user.nombre.charAt(0).toUpperCase()}</div>
                    <div>
                        <h4>${user.nombre}</h4>
                        <span style="font-size:0.8rem; color:#666;">${user.email}</span>
                    </div>
                </div>
                <button class="btn-add-friend" onclick="alert('Solicitud enviada a ${user.nombre}')">+ Agregar</button>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = '<p>Error al cargar usuarios.</p>';
    }
}

// ===== CHAT =====
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

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    const allBtn = document.querySelector('.nav-item[data-target="inicio"]');
    if (allBtn) allBtn.classList.add('active');
    cargarJuegos('all', 1, true);
});
