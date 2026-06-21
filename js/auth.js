import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Login
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

// Registro
const registroForm = document.getElementById('registroForm');
if (registroForm) {
    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmar = document.getElementById('regConfirm').value;
        const nombre = document.getElementById('regNombre').value.trim();

        if (password !== confirmar) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return setDoc(doc(db, "usuarios", user.uid), {
                    nombre: nombre || email.split('@')[0],
                    email: email,
                    fechaRegistro: new Date().toISOString()
                });
            })
            .then(() => {
                alert("Cuenta creada.");
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    });
}
