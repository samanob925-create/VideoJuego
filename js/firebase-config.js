import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// REEMPLAZA ESTO con las credenciales de tu consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAqvkwTtaMIj5WB0MKjG_GLC08ZMnd4f2w",
    authDomain: "juegos-d6e42.firebaseapp.com",
    projectId: "juegos-d6e42",
    storageBucket: "juegos-d6e42.firebasestorage.app",
    messagingSenderId: "567008950107",
    appId: "1:567008950107:web:8b85582936732b839ccc7e"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);