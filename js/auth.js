import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    });
}

const registroForm = document.getElementById('registroForm');
if (registroForm) {
    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmar = document.getElementById('regConfirm').value;

        if (password !== confirmar) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
                alert("Cuenta creada.");
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    });
}
