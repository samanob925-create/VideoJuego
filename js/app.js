import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, 
    getDocs, doc, getDoc, setDoc, deleteDoc, where, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ===== CONSTANTES =====
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed";
const BASE_URL = "https://api.rawg.io/api/games";
const NEWS_API_KEY = "pub_12345abcde"; // Cambia por tu clave de NewsData.io

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

// ============================================
// 1. SESIÓN Y SINCRONIZACIÓN CON FIRESTORE
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                await setDoc(userDocRef, {
                    nombre: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    fechaRegistro: new Date().toISOString()
                });
                console.log("Usuario sincronizado a Firestore:", user.email);
            }
        } catch (error) {
            console.error("Error al sincronizar usuario:", error);
        }

        const username = user.email.split('@')[0];
        const navUsername = document.getElementById('navUsername');
        if (navUsername) navUsername.innerText = username;
        const shortUser = document.getElementById('displayUserShort');
        if (shortUser) shortUser.innerText = username;
        const displayUser = document.getElementById('displayUser');
        if (displayUser) displayUser.innerText = username;
        const displayEmail = document.getElementById('displayEmail');
        if (displayEmail) displayEmail.innerText = user.email;

        cargarUsuarios();
        cargarSolicitudesPendientes();
        cargarAmigos();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth);
});

// ============================================
// 2. NAVEGACIÓN
// ============================================
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
                cargarSolicitudesPendientes();
                cargarAmigos();
                break;
            case 'noticias':
                cargarNoticias();
                break;
            default: break;
        }
    });
});

// ============================================
// 3. BOTONES DE PLATAFORMA
// ============================================
const platformBtns = document.querySelectorAll('.platform-btn');
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const platform = btn.getAttribute('data-platform');
        currentPlatform = platform;

        sections.forEach(sec => sec.classList.add('d-none'));
        const inicio = document.getElementById('inicio');
        if (inicio) inicio.classList.remove('d-none');

        cargarJuegos(platform, 1, true);
    });
});

// ============================================
// 4. CARGAR JUEGOS (API RAWG)
// ============================================
async function cargarJuegos(platform, page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        hasMore = true;
        allGames = [];
        if (contenedor) contenedor.innerHTML = '<p class="loading-text">Cargando juegos...</p>';
        if (btnCargarMas) btnCargarMas.style.display = 'none';
    }

    let url = `${BASE_URL}?key=${RAWG_API_KEY}&page_size=24&page=${page}`;
    if (platform !== 'all') {
        url += `&parent_platforms=${platform}`;
    }

    const platformNames = {
        '1': 'PC', '2': 'PlayStation', '3': 'Xbox', '4': 'Nintendo',
        '6': 'iOS', '7': 'Android', 'all': 'Todas las plataformas'
    };
    if (tituloSeccion) tituloSeccion.textContent = `Juegos de ${platformNames[platform] || 'Plataforma'}`;
    if (subtituloSeccion) subtituloSeccion.textContent = 'Los titulos mas populares';

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();

        if (!datos.results || datos.results.length === 0) {
            if (contenedor) contenedor.innerHTML = '<p style="color:#888;">No se encontraron juegos para esta plataforma.</p>';
            if (btnCargarMas) btnCargarMas.style.display = 'none';
            hasMore = false;
            isLoading = false;
            return;
        }

        if (reset) allGames = datos.results;
        else allGames = allGames.concat(datos.results);

        renderGames(allGames, contenedor);
        hasMore = datos.next !== null;
        if (btnCargarMas) btnCargarMas.style.display = hasMore ? 'block' : 'none';
        currentPage = page;
    } catch (error) {
        console.error('Error cargando juegos:', error);
        if (contenedor) contenedor.innerHTML = `<p style="color:#e74c3c;">Error: ${error.message}</p>`;
        if (btnCargarMas) btnCargarMas.style.display = 'none';
    } finally {
        isLoading = false;
    }
}

// ============================================
// 5. RENDERIZAR JUEGOS
// ============================================
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
                <p class="platforms"><i class="fas fa-gamepad" style="margin-right:4px;"></i> ${plataformasTexto}${juego.platforms.length > 3 ? ' ...' : ''}</p>
                <p class="rating"><i class="fas fa-star" style="color:#f1c40f;"></i> ${juego.rating} / 5</p>
                <p class="genres">${generos}</p>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn-juego" onclick="verDetalle(${juego.id})"><i class="fas fa-info-circle"></i> Ver detalles</button>
                    <button class="btn-fav" data-id="${juego.id}" data-nombre="${juego.name}" data-imagen="${juego.background_image || ''}"><i class="fas fa-heart"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

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

// ============================================
// 6. BÚSQUEDA
// ============================================
function buscarJuegos(termino) {
    if (!termino.trim()) {
        renderGames(allGames, contenedor);
        if (btnCargarMas) btnCargarMas.style.display = hasMore ? 'block' : 'none';
        return;
    }
    const filtrados = allGames.filter(juego =>
        juego.name.toLowerCase().includes(termino.toLowerCase())
    );
    renderGames(filtrados, contenedor);
    if (btnCargarMas) btnCargarMas.style.display = 'none';
}
if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') buscarJuegos(searchInput.value);
    });
}
if (btnBuscar) {
    btnBuscar.addEventListener('click', () => buscarJuegos(searchInput.value));
}

// ============================================
// 7. BOTÓN CARGAR MÁS
// ============================================
if (btnCargarMas) {
    btnCargarMas.addEventListener('click', () => {
        if (!isLoading && hasMore) cargarJuegos(currentPlatform, currentPage + 1, false);
    });
}

// ============================================
// 8. MEJORES Y MENOS POPULARES
// ============================================
let mejoresPage = 1, mejoresHasMore = true;
const contenedorMejores = document.getElementById('contenedor-mejores');
const btnCargarMasMejores = document.getElementById('btnCargarMasMejores');

async function cargarMejores(page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;
    if (reset) {
        mejoresPage = 1;
        mejoresHasMore = true;
        if (contenedorMejores) contenedorMejores.innerHTML = '<p class="loading-text">Cargando...</p>';
        if (btnCargarMasMejores) btnCargarMasMejores.style.display = 'none';
    }
    const url = `${BASE_URL}?key=${RAWG_API_KEY}&ordering=-rating&page_size=24&page=${page}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();
        if (!datos.results || datos.results.length === 0) {
            if (contenedorMejores) contenedorMejores.innerHTML = '<p>No hay juegos.</p>';
            if (btnCargarMasMejores) btnCargarMasMejores.style.display = 'none';
            mejoresHasMore = false;
            isLoading = false;
            return;
        }
        renderGames(datos.results, contenedorMejores);
        mejoresHasMore = datos.next !== null;
        if (btnCargarMasMejores) btnCargarMasMejores.style.display = mejoresHasMore ? 'block' : 'none';
        mejoresPage = page;
    } catch (error) {
        if (contenedorMejores) contenedorMejores.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    } finally { isLoading = false; }
}
if (btnCargarMasMejores) {
    btnCargarMasMejores.addEventListener('click', () => {
        if (!isLoading && mejoresHasMore) cargarMejores(mejoresPage + 1, false);
    });
}

let menosPage = 1, menosHasMore = true;
const contenedorMenos = document.getElementById('contenedor-menos');
const btnCargarMasMenos = document.getElementById('btnCargarMasMenos');

async function cargarMenos(page = 1, reset = false) {
    if (isLoading) return;
    isLoading = true;
    if (reset) {
        menosPage = 1;
        menosHasMore = true;
        if (contenedorMenos) contenedorMenos.innerHTML = '<p class="loading-text">Cargando...</p>';
        if (btnCargarMasMenos) btnCargarMasMenos.style.display = 'none';
    }
    const url = `${BASE_URL}?key=${RAWG_API_KEY}&ordering=rating&page_size=24&page=${page}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();
        if (!datos.results || datos.results.length === 0) {
            if (contenedorMenos) contenedorMenos.innerHTML = '<p>No hay juegos.</p>';
            if (btnCargarMasMenos) btnCargarMasMenos.style.display = 'none';
            menosHasMore = false;
            isLoading = false;
            return;
        }
        renderGames(datos.results, contenedorMenos);
        menosHasMore = datos.next !== null;
        if (btnCargarMasMenos) btnCargarMasMenos.style.display = menosHasMore ? 'block' : 'none';
        menosPage = page;
    } catch (error) {
        if (contenedorMenos) contenedorMenos.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    } finally { isLoading = false; }
}
if (btnCargarMasMenos) {
    btnCargarMasMenos.addEventListener('click', () => {
        if (!isLoading && menosHasMore) cargarMenos(menosPage + 1, false);
    });
}

// ============================================
// 9. FAVORITOS
// ============================================
async function esFavorito(juegoId) {
    if (!currentUser) return false;
    try {
        const q = query(collection(db, "favoritos"), where("uid", "==", currentUser.uid), where("juegoId", "==", juegoId));
        const snap = await getDocs(q);
        return !snap.empty;
    } catch (error) {
        console.error('Error verificando favorito:', error);
        return false;
    }
}

async function toggleFavorito(juegoId, nombre, imagen) {
    if (!currentUser) return;
    try {
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
        if (seccionFav && !seccionFav.classList.contains('d-none')) cargarFavoritos();
    } catch (error) {
        console.error('Error al cambiar favorito:', error);
        alert('Error al guardar favorito. Verifica permisos de Firestore.');
    }
}

async function cargarFavoritos() {
    const contenedor = document.getElementById('contenedor-favoritos');
    if (!contenedor) return;
    if (!currentUser) {
        contenedor.innerHTML = '<p>Inicia sesion para ver favoritos.</p>';
        return;
    }
    contenedor.innerHTML = '<p class="loading-text">Cargando favoritos...</p>';
    try {
        const q = query(collection(db, "favoritos"), where("uid", "==", currentUser.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
            contenedor.innerHTML = '<p style="color:#888;">No tienes favoritos aun. Agrega juegos desde las listas.</p>';
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
                    <button class="btn-juego" onclick="verDetalle(${juego.id})"><i class="fas fa-info-circle"></i> Ver detalles</button>
                    <button class="btn-fav" style="color:#e74c3c;" onclick="toggleFavorito('${juego.id}', '${juego.name}', '${juego.background_image}')"><i class="fas fa-heart"></i> Quitar</button>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar favoritos: ${error.message}</p>`;
    }
}

// ============================================
// 10. DETALLE CON TRADUCCIÓN Y FORMATO MEJORADO
// ============================================
window.verDetalle = async function(juegoId) {
    try {
        // Referencias a los elementos del DOM
        const nombreEl = document.getElementById('detalleNombre');
        const imagenEl = document.getElementById('detalleImagen');
        const fechaEl = document.getElementById('detalleFecha');
        const ratingEl = document.getElementById('detalleRating');
        const plataformasEl = document.getElementById('detallePlataformas');
        const desarrolladorEl = document.getElementById('detalleDesarrollador');
        const generosEl = document.getElementById('detalleGeneros');
        const descripcionEl = document.getElementById('detalleDescripcion');

        // Mostrar estado de carga
        if (nombreEl) nombreEl.textContent = 'Cargando...';
        if (imagenEl) imagenEl.src = '';
        if (fechaEl) fechaEl.textContent = '---';
        if (ratingEl) ratingEl.textContent = '---';
        if (plataformasEl) plataformasEl.textContent = '---';
        if (desarrolladorEl) desarrolladorEl.textContent = '---';
        if (generosEl) generosEl.textContent = '---';
        if (descripcionEl) descripcionEl.textContent = 'Cargando descripción...';

        modal.classList.remove('d-none');

        // Obtener datos del juego
        const url = `https://api.rawg.io/api/games/${juegoId}?key=${RAWG_API_KEY}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const juego = await resp.json();

        // Limpiar y formatear descripción
        let descripcion = juego.description_raw || 'Sin descripción disponible.';
        // Eliminar texto repetido
        const palabras = descripcion.split(' ');
        if (palabras.length > 10) {
            const primerasPalabras = palabras.slice(0, 10).join(' ');
            if (descripcion.includes(primerasPalabras + ' ' + primerasPalabras)) {
                descripcion = palabras.slice(0, palabras.length / 2).join(' ');
            }
        }
        if (descripcion.length > 500) {
            descripcion = descripcion.substring(0, 500) + '...';
        }

        // Traducir al español
        let descripcionTraducida = descripcion;
        try {
            const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(descripcion)}`;
            const translateResp = await fetch(translateUrl);
            if (translateResp.ok) {
                const translateData = await translateResp.json();
                if (translateData && translateData[0]) {
                    descripcionTraducida = translateData[0].map(item => item[0]).join('');
                }
            }
        } catch (translateError) {
            console.warn('Error al traducir, usando texto original:', translateError);
        }

        // Asignar valores
        if (nombreEl) nombreEl.textContent = juego.name || 'Nombre desconocido';
        if (imagenEl) imagenEl.src = juego.background_image || 'https://via.placeholder.com/600x300?text=Sin+imagen';
        if (fechaEl) fechaEl.textContent = juego.released || 'Desconocido';
        if (ratingEl) ratingEl.textContent = `${juego.rating || 'N/A'} / 5 (${juego.ratings_count || 0} votos)`;
        if (plataformasEl) plataformasEl.textContent = juego.platforms ? juego.platforms.map(p => p.platform.name).join(', ') : 'No especificado';
        if (desarrolladorEl) desarrolladorEl.textContent = juego.developers ? juego.developers.map(d => d.name).join(', ') : 'Desconocido';
        if (generosEl) generosEl.textContent = juego.genres ? juego.genres.map(g => g.name).join(', ') : 'No especificado';
        if (descripcionEl) descripcionEl.textContent = descripcionTraducida;

    } catch (error) {
        console.error('Error al cargar detalles:', error);
        alert('Error al cargar detalles: ' + error.message);
        modal.classList.add('d-none');
    }
};

if (modalClose) {
    modalClose.addEventListener('click', () => modal.classList.add('d-none'));
}
if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('d-none'); });
}

// ============================================
// 11. NOTICIAS
// ============================================
async function cargarNoticias() {
    const contenedor = document.getElementById('contenedor-noticias');
    if (!contenedor) return;
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
                    <p>${noticia.description || 'Sin descripcion.'}</p>
                    <a href="${noticia.link}" target="_blank">Leer mas</a>
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

// ============================================
// 12. SISTEMA DE AMISTADES
// ============================================

// 12a. Cargar usuarios registrados
async function cargarUsuarios() {
    const contenedor = document.getElementById('listaUsuarios');
    if (!contenedor) return;

    try {
        const snap = await getDocs(collection(db, "usuarios"));
        const usuarios = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (doc.id !== currentUser?.uid) {
                usuarios.push({
                    uid: doc.id,
                    nombre: data.nombre || data.email?.split('@')[0] || 'Usuario',
                    email: data.email || ''
                });
            }
        });

        if (usuarios.length === 0) {
            contenedor.innerHTML = '<p style="color:#888;">No hay otros usuarios registrados.</p>';
            return;
        }

        contenedor.innerHTML = '';
        usuarios.forEach(user => {
            const card = document.createElement('div');
            card.className = 'friend-card';
            const initial = user.nombre.charAt(0).toUpperCase();
            const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
            const colorIndex = Math.floor(Math.random() * colors.length);
            card.innerHTML = `
                <div class="friend-info">
                    <div class="friend-avatar" style="background: ${colors[colorIndex]};">${initial}</div>
                    <div>
                        <h4>${user.nombre}</h4>
                        <span style="font-size:0.8rem; color:#666;">${user.email}</span>
                    </div>
                </div>
                <button class="btn-add-friend" data-uid="${user.uid}" data-nombre="${user.nombre}">
                    <i class="fas fa-user-plus"></i> Agregar
                </button>
            `;
            contenedor.appendChild(card);
        });

        contenedor.querySelectorAll('.btn-add-friend').forEach(btn => {
            btn.addEventListener('click', async () => {
                const destinatarioUid = btn.dataset.uid;
                const destinatarioNombre = btn.dataset.nombre;
                await enviarSolicitudAmistad(destinatarioUid, destinatarioNombre);
            });
        });

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar usuarios: ${error.message}</p>`;
    }
}

// 12b. Enviar solicitud de amistad
async function enviarSolicitudAmistad(destinatarioUid, destinatarioNombre) {
    if (!currentUser) return;
    if (destinatarioUid === currentUser.uid) {
        alert('No puedes enviarte solicitud a ti mismo.');
        return;
    }

    try {
        const q1 = query(
            collection(db, "solicitudes"),
            where("remitenteUid", "==", currentUser.uid),
            where("destinatarioUid", "==", destinatarioUid)
        );
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
            const estado = snap1.docs[0].data().estado;
            if (estado === 'pendiente') {
                alert('Ya enviaste una solicitud a ' + destinatarioNombre + '. Espera que la acepte.');
                return;
            } else if (estado === 'aceptada') {
                alert('Ya son amigos.');
                return;
            }
        }

        const q2 = query(
            collection(db, "solicitudes"),
            where("remitenteUid", "==", destinatarioUid),
            where("destinatarioUid", "==", currentUser.uid),
            where("estado", "==", "pendiente")
        );
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
            alert(destinatarioNombre + ' ya te envio una solicitud. Ve a "Solicitudes pendientes" para aceptarla.');
            return;
        }

        await addDoc(collection(db, "solicitudes"), {
            remitenteUid: currentUser.uid,
            remitenteNombre: currentUser.email.split('@')[0],
            destinatarioUid: destinatarioUid,
            destinatarioNombre: destinatarioNombre,
            estado: 'pendiente',
            timestamp: serverTimestamp()
        });

        alert('Solicitud de amistad enviada a ' + destinatarioNombre);
        cargarSolicitudesPendientes();
    } catch (error) {
        console.error('Error al enviar solicitud:', error);
        alert('Error al enviar solicitud: ' + error.message);
    }
}

// 12c. Cargar solicitudes pendientes
async function cargarSolicitudesPendientes() {
    const contenedor = document.getElementById('solicitudesPendientes');
    if (!contenedor) return;
    if (!currentUser) {
        contenedor.innerHTML = '<p>Inicia sesion para ver solicitudes.</p>';
        return;
    }

    try {
        const q = query(
            collection(db, "solicitudes"),
            where("destinatarioUid", "==", currentUser.uid),
            where("estado", "==", "pendiente")
        );
        const snap = await getDocs(q);
        if (snap.empty) {
            contenedor.innerHTML = '<p style="color:#888;">No tienes solicitudes pendientes.</p>';
            return;
        }

        contenedor.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const solicitudId = doc.id;
            const card = document.createElement('div');
            card.className = 'friend-card';
            card.innerHTML = `
                <div class="friend-info">
                    <div class="friend-avatar" style="background: #f39c12;">${data.remitenteNombre.charAt(0).toUpperCase()}</div>
                    <div>
                        <h4>${data.remitenteNombre}</h4>
                        <span style="font-size:0.8rem; color:#666;">Te ha enviado una solicitud</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-add-friend" style="background: #2ecc71;" onclick="aceptarSolicitud('${solicitudId}')"><i class="fas fa-check"></i> Aceptar</button>
                    <button class="btn-add-friend" style="background: #e74c3c;" onclick="rechazarSolicitud('${solicitudId}')"><i class="fas fa-times"></i> Rechazar</button>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar solicitudes: ${error.message}</p>`;
    }
}

// 12d. Aceptar solicitud
window.aceptarSolicitud = async function(solicitudId) {
    try {
        const docRef = doc(db, "solicitudes", solicitudId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            alert('La solicitud ya no existe.');
            return;
        }
        const data = docSnap.data();
        if (data.destinatarioUid !== currentUser.uid) {
            alert('No tienes permiso para aceptar esta solicitud.');
            return;
        }

        await updateDoc(docRef, { estado: 'aceptada' });

        await addDoc(collection(db, "amigos"), {
            uid: currentUser.uid,
            amigoUid: data.remitenteUid,
            amigoNombre: data.remitenteNombre,
            fecha: serverTimestamp()
        });
        await addDoc(collection(db, "amigos"), {
            uid: data.remitenteUid,
            amigoUid: currentUser.uid,
            amigoNombre: currentUser.email.split('@')[0],
            fecha: serverTimestamp()
        });

        alert('Solicitud aceptada. Ahora son amigos.');
        cargarSolicitudesPendientes();
        cargarAmigos();
    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        alert('Error al aceptar solicitud: ' + error.message);
    }
};

// 12e. Rechazar solicitud
window.rechazarSolicitud = async function(solicitudId) {
    try {
        const docRef = doc(db, "solicitudes", solicitudId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            alert('La solicitud ya no existe.');
            return;
        }
        const data = docSnap.data();
        if (data.destinatarioUid !== currentUser.uid) {
            alert('No tienes permiso para rechazar esta solicitud.');
            return;
        }
        await updateDoc(docRef, { estado: 'rechazada' });
        alert('Solicitud rechazada.');
        cargarSolicitudesPendientes();
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        alert('Error al rechazar solicitud: ' + error.message);
    }
};

// 12f. Cargar lista de amigos
async function cargarAmigos() {
    const contenedor = document.getElementById('listaAmigos');
    if (!contenedor) return;
    if (!currentUser) {
        contenedor.innerHTML = '<p>Inicia sesion para ver tus amigos.</p>';
        return;
    }

    try {
        const q = query(
            collection(db, "amigos"),
            where("uid", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
            contenedor.innerHTML = '<p style="color:#888;">Aun no tienes amigos. Envia solicitudes a otros usuarios.</p>';
            return;
        }

        contenedor.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'friend-card';
            const initial = data.amigoNombre.charAt(0).toUpperCase();
            card.innerHTML = `
                <div class="friend-info">
                    <div class="friend-avatar" style="background: #2ecc71;">${initial}</div>
                    <div>
                        <h4>${data.amigoNombre}</h4>
                        <span style="font-size:0.8rem; color:#666;">Amigo</span>
                    </div>
                </div>
                <button class="btn-add-friend" style="background: #95a5a6;" disabled><i class="fas fa-check-circle"></i> Amigo</button>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar amigos:', error);
        contenedor.innerHTML = `<p style="color:red;">Error al cargar amigos: ${error.message}</p>`;
    }
}

// ============================================
// 13. CHAT
// ============================================
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

const btnEnviar = document.getElementById('btnEnviarMensaje');
if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
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
            console.error('Error al enviar mensaje:', error);
            alert('Error al enviar mensaje. Verifica permisos de Firestore.');
        }
    });
}

// ============================================
// 14. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const allBtn = document.querySelector('.nav-item[data-target="inicio"]');
    if (allBtn) allBtn.classList.add('active');
    cargarJuegos('all', 1, true);
});
