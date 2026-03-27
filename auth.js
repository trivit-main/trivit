import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDebBs-95p35770rYjszyP2sFekOxAr4cg",
    authDomain: "trivit-e1ebf.firebaseapp.com",
    projectId: "trivit-e1ebf",
    storageBucket: "trivit-e1ebf.firebasestorage.app",
    messagingSenderId: "242460293693",
    appId: "1:242460293693:web:2ed69c127992e871500854"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const requiresAuth = document.body?.dataset.requireAuth === 'true';
const isLoginPage = document.body?.dataset.authPage === 'login';

function redirectToLogin() {
    if (window.location.pathname.endsWith('/login.html')) {
        return;
    }

    window.location.href = '/login.html';
}

function redirectToHome() {
    window.location.href = '/';
}

function redirectToLoginIfNeeded() {
    if (!requiresAuth) {
        return;
    }

    if (!auth.currentUser) {
        redirectToLogin();
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Utente loggato:', user.email);

        if (isLoginPage) {
            redirectToHome();
        }

        return;
    }

    console.log('Non loggato');
    redirectToLoginIfNeeded();

    if (isLoginPage) {
        document.dispatchEvent(new CustomEvent('trivit:request-auth-panel-open'));
    }
});

function initializeAuth() {
    const form = document.querySelector('#auth-login-form');
    const emailInput = document.querySelector('#auth-email');
    const passwordInput = document.querySelector('#auth-password');
    const submitButton = document.querySelector('.auth-submit');
    const feedback = document.querySelector('.auth-feedback');

    if (!form || !emailInput || !passwordInput || !submitButton || !feedback) {
        return;
    }

    function setFeedback(message, state = '') {
        feedback.textContent = message;
        if (state) {
            feedback.dataset.state = state;
        } else {
            delete feedback.dataset.state;
        }
    }

    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? 'Accesso...' : 'Accedi';
    }

    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Email o password non corretti.';
            case 'auth/invalid-email':
                return 'Inserisci un indirizzo email valido.';
            case 'auth/too-many-requests':
                return 'Troppi tentativi. Riprova tra qualche minuto.';
            case 'auth/network-request-failed':
                return 'Connessione non disponibile. Controlla la rete e riprova.';
            default:
                return 'Accesso non riuscito. Verifica i dati inseriti e riprova.';
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            setFeedback('Compila email e password per continuare.', 'error');
            return;
        }

        setLoadingState(true);
        setFeedback('Verifica credenziali in corso...', 'pending');

        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const accountLabel = credential.user.email || 'account Trivit';
            setFeedback(`Accesso effettuato: ${accountLabel}.`, 'success');
            form.reset();
            window.setTimeout(() => {
                document.dispatchEvent(new CustomEvent('trivit:auth-login-success', {
                    detail: { email: credential.user.email || '' }
                }));
            }, 450);
        } catch (error) {
            setFeedback(getErrorMessage(error.code), 'error');
        } finally {
            setLoadingState(false);
        }
    });

    document.addEventListener('trivit:auth-panel-open', () => {
        setFeedback('');
        requestAnimationFrame(() => {
            emailInput.focus();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth, { once: true });
} else {
    initializeAuth();
}
