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
            let mensaje = '';
            switch (error.code) {
                case 'auth/user-not-found':
                    mensaje = 'No existe una cuenta con este correo electronico.';
                    break;
                case 'auth/wrong-password':
                    mensaje = 'Contrasena incorrecta. Intenta de nuevo.';
                    break;
                case 'auth/invalid-email':
                    mensaje = 'El correo electronico no es valido.';
                    break;
                default:
                    mensaje = 'Error al iniciar sesion: ' + error.message;
            }
            alert(mensaje);
            grecaptcha.reset();
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
            alert('Las contrasenas no coinciden.');
            grecaptcha.reset();
            return;
        }

        if (password.length < 6) {
            alert('La contrasena debe tener al menos 6 caracteres.');
            grecaptcha.reset();
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "usuarios", user.uid), {
                nombre: nombre || email.split('@')[0],
                email: email,
                fechaRegistro: new Date().toISOString()
            });

            alert('Cuenta creada exitosamente. Seras redirigido al dashboard.');
            window.location.href = "dashboard.html";
        } catch (error) {
            let mensaje = '';
            let sugerencia = '';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    mensaje = 'Este correo electronico ya esta registrado.';
                    sugerencia = 'Si ya tienes cuenta, ve a "Iniciar sesion". Si olvidaste tu contrasena, usa la opcion "Olvidaste tu contrasena?" en la pagina de login.';
                    break;
                case 'auth/invalid-email':
                    mensaje = 'El correo electronico no es valido.';
                    break;
                case 'auth/weak-password':
                    mensaje = 'La contrasena debe tener al menos 6 caracteres.';
                    break;
                default:
                    mensaje = 'Error al registrarse: ' + error.message;
            }

            alert(mensaje + (sugerencia ? '\n\n' + sugerencia : ''));
            grecaptcha.reset();
        }
    });
}

// ============================================
// 3. RECUPERACION DE CONTRASENA
// ============================================
const btnForgot = document.getElementById('btnForgotPassword');
const modalRecuperar = document.getElementById('modalRecuperar');
const closeModal = document.getElementById('closeModalRecuperar');
const resetForm = document.getElementById('resetForm');
const resetMessage = document.getElementById('resetMessage');

if (btnForgot) {
    btnForgot.addEventListener('click', (e) => {
        e.preventDefault();
        modalRecuperar.classList.remove('d-none');
        resetMessage.textContent = '';
        resetMessage.style.color = 'inherit';
    });
}

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

if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value.trim();
        if (!email) {
            resetMessage.style.color = '#dc3545';
            resetMessage.textContent = 'Ingresa un correo electronico valido.';
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            resetMessage.style.color = '#28a745';
            resetMessage.textContent = 'Se ha enviado un enlace de recuperacion a tu correo. Revisa tu bandeja de entrada (y spam).';
            document.getElementById('resetEmail').value = '';
            setTimeout(() => {
                modalRecuperar.classList.add('d-none');
            }, 4000);
        } catch (error) {
            let mensaje = '';
            if (error.code === 'auth/user-not-found') {
                mensaje = 'No existe una cuenta con ese correo electronico.';
            } else {
                mensaje = 'Error: ' + error.message;
            }
            resetMessage.style.color = '#dc3545';
            resetMessage.textContent = mensaje;
        }
    });
}
