import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ============================================
// 1. LOGIN
// ============================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            alert('Por favor, marca la casilla "No soy un robot".');
            return;
        }

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (error) {
            alert('Error al iniciar sesión: ' + error.message);
            grecaptcha.reset(); // Reinicia el captcha
        }
    });
}

// ============================================
// 2. REGISTRO
// ============================================
const registroForm = document.getElementById('registroForm');
if (registroForm) {
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            alert('Por favor, marca la casilla "No soy un robot".');
            return;
        }

        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmar = document.getElementById('regConfirm').value;
        const nombre = document.getElementById('regNombre').value.trim();

        if (password !== confirmar) {
            alert('Las contraseñas no coinciden.');
            grecaptcha.reset();
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Guardar usuario en Firestore
            await setDoc(doc(db, "usuarios", user.uid), {
                nombre: nombre || email.split('@')[0],
                email: email,
                fechaRegistro: new Date().toISOString()
            });

            alert('Cuenta creada exitosamente.');
            window.location.href = "dashboard.html";
        } catch (error) {
            alert('Error al registrarse: ' + error.message);
            grecaptcha.reset();
        }
    });
}

// ============================================
// 3. RECUPERACIÓN DE CONTRASEÑA
// ============================================
const btnForgot = document.getElementById('btnForgotPassword');
const modalRecuperar = document.getElementById('modalRecuperar');
const closeModal = document.getElementById('closeModalRecuperar');
const resetForm = document.getElementById('resetForm');
const resetMessage = document.getElementById('resetMessage');

// Abrir modal
if (btnForgot) {
    btnForgot.addEventListener('click', (e) => {
        e.preventDefault();
        modalRecuperar.classList.remove('d-none');
        resetMessage.textContent = '';
    });
}

// Cerrar modal
if (closeModal) {
    closeModal.addEventListener('click', () => {
        modalRecuperar.classList.add('d-none');
    });
}
window.addEventListener('click', (e) => {
    if (e.target === modalRecuperar) {
        modalRecuperar.classList.add('d-none');
    }
});

// Enviar correo de recuperación
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value.trim();
        if (!email) {
            resetMessage.style.color = '#dc3545';
            resetMessage.textContent = 'Ingresa un correo electrónico válido.';
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            resetMessage.style.color = '#28a745';
            resetMessage.textContent = '✅ Se ha enviado un enlace de recuperación a tu correo.';
            document.getElementById('resetEmail').value = '';
            setTimeout(() => {
                modalRecuperar.classList.add('d-none');
            }, 3000);
        } catch (error) {
            resetMessage.style.color = '#dc3545';
            resetMessage.textContent = '❌ Error: ' + error.message;
        }
    });
}
