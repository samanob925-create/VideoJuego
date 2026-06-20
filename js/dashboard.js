import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Protección de ruta
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('displayEmail').textContent = user.email;
        // Puedes extraer el nombre del email antes del @ para mostrar algo
        const userName = user.email.split('@')[0];
        document.getElementById('navUsername').textContent = userName;
        document.getElementById('displayUser').textContent = userName;
    } else {
        window.location.href = "index.html"; // Echar al usuario si no está logueado
    }
});

// Cerrar sesión
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).catch(err => console.error(err));
});

// Navegación estilo SPA
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        sections.forEach(sec => {
            if(sec.id === target) {
                sec.classList.remove('hidden');
            } else {
                sec.classList.add('hidden');
            }
        });
    });
});