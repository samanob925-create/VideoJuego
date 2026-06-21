import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// --- 2. NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        
        const seccionObjetivo = document.getElementById(target);
        if(seccionObjetivo) seccionObjetivo.classList.remove('d-none');

        if (target === 'amigos') inicializarChat();
        if (target === 'tendencias') cargarJuegosMultiplataforma();
    });
});

// --- 3. API DE RAWG (MULTIPLATAFORMA) ---
let juegosCargados = false;
const RAWG_API_KEY = "6a50394d2ecd49c48854049867f7f0ed"; // <--- NO OLVIDES PONER TU LLAVE

async function cargarJuegosMultiplataforma() {
    if (juegosCargados) return; 
    
    const contenedor = document.getElementById('contenedor-juegos');
    if(!contenedor) return;

    contenedor.innerHTML = '<p style="color: #666;">Conectando con RAWG API...</p>';

    try {
        // Pedimos juegos populares, la API trae sus plataformas automáticamente
        const respuesta = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=12`);
        const datos = await respuesta.json();

        contenedor.innerHTML = ''; 
        datos.results.forEach(juego => {
            // Extraemos los nombres de las plataformas en las que está el juego (Ej: "PC, Xbox One, PlayStation 5")
            const plataformasTexto = juego.platforms.map(p => p.platform.name).slice(0, 3).join(', ');

            contenedor.innerHTML += `
                <div class="game-card">
                    <img src="${juego.background_image}" alt="${juego.name}">
                    <h4>${juego.name}</h4>
                    <p class="platforms">🎮 ${plataformasTexto}...</p>
                    <p style="color: #666; font-size: 0.8rem; margin-bottom: 10px;">⭐ Rating: ${juego.rating}</p>
                    <button class="btn-juego">Ver Especificaciones</button>
                </div>
            `;
        });
        juegosCargados = true;
    } catch (error) {
        contenedor.innerHTML = '<p style="color: red; font-weight: bold;">Error al cargar. Revisa tu API KEY.</p>';
    }
}

// --- 4. CHAT GLOBAL ---
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
