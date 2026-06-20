import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- 1. SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0];
        document.getElementById('navUsername').innerText = username;
        document.getElementById('displayUser').innerText = username;
        document.getElementById('displayEmail').innerText = user.email;
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth);
});

// --- 2. NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Quitar activo a todos y ponérselo al clickeado
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        // Ocultar todas las secciones
        const target = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.add('d-none'));
        
        // Mostrar la que seleccionaste
        document.getElementById(target).classList.remove('d-none');

        // Si entras al chat, inicializarlo
        if (target === 'amigos') inicializarChat();
    });
});

// --- 3. CHAT EN TIEMPO REAL ---
let chatIniciado = false;

function inicializarChat() {
    if(chatIniciado) return;
    chatIniciado = true;

    const cajaMensajes = document.getElementById('caja-mensajes');
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
        console.error("Error enviando mensaje:", error);
    }
});
