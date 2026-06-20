// Importaciones de Firebase (Asegúrate de que la ruta de firebase-config.js sea correcta)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


onAuthStateChanged(auth, (user) => {
    if (user) {
        // Mostrar datos del usuario en la interfaz
        const username = user.email.split('@')[0];
        
        // Verificamos que los elementos existan antes de cambiarles el texto
        if(document.getElementById('navUsername')) document.getElementById('navUsername').innerText = username;
        if(document.getElementById('displayUser')) document.getElementById('displayUser').innerText = username;
        if(document.getElementById('displayEmail')) document.getElementById('displayEmail').innerText = user.email;
    } else {
        // Redirigir al login si no hay sesión activa
        window.location.href = "index.html";
    }
});

// Cerrar sesión
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if(btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error("Error al cerrar sesión:", error));
    });
}

const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Cambiar botón activo
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        // Ocultar todas las secciones
        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        
        // Mostrar la que seleccionaste
        const seccionObjetivo = document.getElementById(target);
        if(seccionObjetivo) seccionObjetivo.classList.remove('d-none');

        // Disparadores de funciones específicas al entrar a una pestaña
        if (target === 'amigos') inicializarChat();
        if (target === 'tendencias') cargarJuegos();
    });
});

let juegosCargados = false;
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed";

async function cargarJuegos() {
    if (juegosCargados) return; // Evita hacer la petición cada vez que cambias de pestaña
    
    const seccionTendencias = document.getElementById('tendencias');
    if(!seccionTendencias) return;
    
    // Buscamos la cuadrícula de juegos dentro de la sección de tendencias
    const contenedor = seccionTendencias.querySelector('.game-grid');
    if(!contenedor) return;

    contenedor.innerHTML = '<p style="color: #666; font-weight: bold;">Conectando con la base de datos de RAWG...</p>';

    try {
        const respuesta = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=8`);
        const datos = await respuesta.json();

        contenedor.innerHTML = ''; // Limpiamos el mensaje de carga
        datos.results.forEach(juego => {
            contenedor.innerHTML += `
                <div class="game-card">
                    <img src="${juego.background_image}" alt="${juego.name}">
                    <p>${juego.name}</p>
                    <p style="color: #666; font-size: 0.8rem; margin-top: -5px;">⭐ ${juego.rating}</p>
                    <button style="width: 100%; padding: 8px; margin-top: 5px; background: #000; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Ver Detalles</button>
                </div>
            `;
        });
        juegosCargados = true;
    } catch (error) {
        contenedor.innerHTML = '<p style="color: red; font-weight: bold;">Error al cargar los juegos. Verifica tu API Key.</p>';
        console.error("Error cargando RAWG:", error);
    }
}


let chatIniciado = false;

function inicializarChat() {
    if(chatIniciado) return;
    chatIniciado = true;

    const cajaMensajes = document.getElementById('caja-mensajes');
    if(!cajaMensajes) return;

    const q = query(collection(db, "chat_global"), orderBy("timestamp", "asc"));

    // Escuchar mensajes de Firebase
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
        cajaMensajes.scrollTop = cajaMensajes.scrollHeight; // Auto-scroll hacia abajo
    });
}

// Filtro de toxicidad (puedes agregar las palabras que necesites)
function filtrarPalabras(texto) {
    const groserias = ['mierda', 'carajo', 'idiota', 'estupido'];
    let textoFiltrado = texto;
    groserias.forEach(palabra => {
        const regex = new RegExp(palabra, 'gi');
        textoFiltrado = textoFiltrado.replace(regex, '***');
    });
    return textoFiltrado;
}

// Enviar mensaje
const btnEnviarMensaje = document.getElementById('btnEnviarMensaje');
if(btnEnviarMensaje) {
    btnEnviarMensaje.addEventListener('click', async () => {
        const input = document.getElementById('inputMensaje');
        const texto = input.value.trim();
        
        if (!texto || !auth.currentUser) return;

        const textoSeguro = filtrarPalabras(texto);
        input.value = ''; // Limpiar campo después de enviar

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
}
