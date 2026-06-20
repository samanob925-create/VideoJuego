import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

const registerForm = document.getElementById('registerForm');
if(registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        if(password !== confirm) {
            alert("Las contraseñas no coinciden");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert("Registro exitoso. Iniciando sesión...");
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert("Error al registrar: " + error.message);
            });
    });
}