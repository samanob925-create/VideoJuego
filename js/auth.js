// Importamos las funciones de autenticación de Firebase
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

// --- 1. LÓGICA DE INICIO DE SESIÓN ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Evita que la página recargue
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Firebase valida las credenciales
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Sesión iniciada con:", userCredential.user.email);
                // Si todo está bien, mandamos al usuario al dashboard
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert("Error al iniciar sesión: Verifica que tu correo y contraseña sean correctos.");
                console.error(error.message);
            });
    });
}

// --- 2. LÓGICA DE REGISTRO DE USUARIO ---
const registroForm = document.getElementById('registroForm');

if (registroForm) {
    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmar = document.getElementById('regConfirm').value;

        // Validación de contraseñas
        if (password !== confirmar) {
            alert("Las contraseñas no coinciden. Inténtalo de nuevo.");
            return;
        }

        // Firebase crea la cuenta en la nube
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("¡Cuenta creada exitosamente! Iniciando sesión...");
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                // Firebase detecta automáticamente si el correo ya existe o si la clave es muy corta
                if(error.code === 'auth/email-already-in-use') {
                    alert("Ese correo ya está registrado.");
                } else if(error.code === 'auth/weak-password') {
                    alert("La contraseña debe tener al menos 6 caracteres.");
                } else {
                    alert("Error al registrar: " + error.message);
                }
            });
    });
}