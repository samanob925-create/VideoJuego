// Importaciones de Firebase
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. SEGURIDAD Y SESIÓN
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Mostrar datos del usuario en la interfaz
        const nombreUsuario = user.email.split('@')[0];
        document.getElementById('userNameDisplay').innerText = nombreUsuario;
        document.getElementById('userEmailDisplay').innerText = user.email;
    } else {
        // Redirigir al login si no hay sesión activa
        window.location.href = "index.html";
    }
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth).catch((error) => console.error("Error al cerrar sesión:", error));
});

// ==========================================
// 2. NAVEGACIÓN SPA (Single Page Application)
// ==========================================
const navBotones = document.querySelectorAll('.nav-btn');
const secciones = document.querySelectorAll('.vista-seccion');

navBotones.forEach(boton => {
    boton.addEventListener('click', () => {
        // Cambiar botón activo
        navBotones.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        // Mostrar sección correspondiente
        const target = boton.getAttribute('data-target');
        secciones.forEach(sec => sec.classList.add('d-none'));
        document.getElementById(target).classList.remove('d-none');

        // Cargar funciones específicas si entra a una sección
        if (target === 'vista-tendencias') cargarJuegos();
        if (target === 'vista-chat') inicializarChat();
    });
});

// ==========================================
// 3. API DE VIDEOJUEGOS (RAWG)
// ==========================================
let juegosCargados = false;
async function cargarJuegos() {
    if (juegosCargados) return; // Para no llamar a la API cada vez que cambias de pestaña
    
    const contenedor = document.getElementById('contenedor-juegos');
    // Para ver juegos reales, necesitas sacar tu API key gratuita en rawg.io
    // Por ahora usamos datos estáticos para que veas que funciona la estructura
    const juegosDemo = [
        { nombre: "Elden Ring", imagen: "https://media.rawg.io/media/games/5ec/5ecac5cb026ec26a56efcc546364e348.jpg" },
        { nombre: "Red Dead Redemption 2", imagen: "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg" },
        { nombre: "Persona 5 Royal", imagen: "https://media.rawg.io/media/games/b2a/b2a1bc2ccbf1a56673ebf115594b29bb.jpg" }
    ];

    contenedor.innerHTML = '';
    juegosDemo.forEach(juego => {
        contenedor.innerHTML += `
            <div class="col-md-4 mb-4">
                <div class="card shadow-sm game-card">
                    <img src="${juego.imagen}" class="card-img-top" alt="${juego.nombre}">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${juego.nombre}</h5>
                        <button class="btn btn-sm btn-outline-primary w-100 mt-2">Ver Especificaciones</button>
                    </div>
                </div>
            </div>
        `;
    });
    juegosCargados = true;
}

// ==========================================
// 4. CHAT EN TIEMPO REAL CON FILTRO
// ==========================================
let chatIniciado = false;

function inicializarChat() {
    if(chatIniciado) return;
    chatIniciado = true;

    const cajaMensajes = document.getElementById('caja-mensajes');
    const q = query(collection(db, "chat_global"), orderBy("timestamp", "asc"));

    // Escuchar mensajes de Firebase
    onSnapshot(q, (snapshot) => {
        cajaMensajes.innerHTML = '';
        snapshot.forEach((doc) => {
            const msj = doc.data();
            const esMio = msj.usuario === auth.currentUser.email;
            
            cajaMensajes.innerHTML += `
                <div class="mb-3 text-${esMio ? 'end' : 'start'}">
                    <span class="badge bg-${esMio ? 'primary' : 'secondary'} p-2 shadow-sm text-wrap text-start" style="max-width: 70%; font-size: 0.95rem;">
                        <small class="d-block text-white-50 mb-1">${msj.usuario.split('@')[0]}</small>
                        ${msj.texto}
                    </span>
                </div>
            `;
        });
        cajaMensajes.scrollTop = cajaMensajes.scrollHeight; // Auto-scroll hacia abajo
    });
}

// Filtro de toxicidad
function filtrarPalabras(texto) {
    const groserias = ['mierda', 'carajo', 'idiota', 'estupido']; // Añade las que necesites
    let textoFiltrado = texto;
    groserias.forEach(palabra => {
        const regex = new RegExp(palabra, 'gi');
        textoFiltrado = textoFiltrado.replace(regex, '***');
    });
    return textoFiltrado;
}

// Enviar mensaje
document.getElementById('btnEnviarMensaje').addEventListener('click', async () => {
    const input = document.getElementById('inputMensaje');
    const texto = input.value.trim();
    
    if (!texto || !auth.currentUser) return;

    const textoSeguro = filtrarPalabras(texto);
    input.value = ''; // Limpiar campo

    try {
        await addDoc(collection(db, "chat_global"), {
            texto: textoSeguro,
            usuario: auth.currentUser.email,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error enviando mensaje:", error);
    }
});