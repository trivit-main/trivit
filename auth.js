import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

function broadcastAuthState(user) {
    document.dispatchEvent(new CustomEvent('trivit:auth-state-change', {
        detail: {
            isAuthenticated: Boolean(user),
            email: user?.email || ''
        }
    }));
}

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
    broadcastAuthState(user);

    if (user) {
        console.log('Logged in user:', user.email);

        if (isLoginPage) {
            redirectToHome();
        }

        return;
    }

    console.log('User not logged in');
    redirectToLoginIfNeeded();

    if (isLoginPage) {
        document.dispatchEvent(new CustomEvent('trivit:request-auth-panel-open'));
    }
});

document.addEventListener('trivit:auth-logout-request', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout failed:', error);
        document.dispatchEvent(new CustomEvent('trivit:auth-logout-error', {
            detail: {
                message: 'Logout failed. Please try again.'
            }
        }));
    }
});

function initializeAuth() {
    const form = document.querySelector('#auth-login-form');
    const emailInput = document.querySelector('#auth-email');
    const passwordInput = document.querySelector('#auth-password');
    const submitButton = document.querySelector('.auth-submit');
    const modeToggle = document.querySelector('.auth-mode-toggle');
    const feedback = document.querySelector('.auth-feedback');

    if (!form || !emailInput || !passwordInput || !submitButton || !modeToggle || !feedback) {
        return;
    }

    const modeConfig = {
        login: {
            submit: 'LOG IN',
            loading: 'Logging in...',
            success: 'Login successful'
        },
        register: {
            submit: 'SIGN UP',
            loading: 'Signing up...',
            success: 'Registration completed'
        }
    };

    function getCurrentMode() {
        return form.dataset.authMode === 'register' ? 'register' : 'login';
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
        const currentMode = getCurrentMode();
        submitButton.disabled = isLoading;
        modeToggle.disabled = isLoading;
        submitButton.textContent = isLoading ? modeConfig[currentMode].loading : modeConfig[currentMode].submit;
    }

    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Wrong email or password. Please try again.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/weak-password':
                return 'The password must be at least 6 characters long.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again in a few minutes.';
            case 'auth/network-request-failed':
                return 'Network connection unavailable. Please check your internet connection and try again.';
            default:
                return 'Login failed. Please verify your credentials and try again.';
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const currentMode = getCurrentMode();

        if (!email || !password) {
            setFeedback('Please fill in both email and password.', 'error');
            return;
        }

        setLoadingState(true);
        setFeedback(
            currentMode === 'register' ? 'Creating account...' : 'Verifying credentials...',
            'pending'
        );

        try {
            const credential = currentMode === 'register'
                ? await createUserWithEmailAndPassword(auth, email, password)
                : await signInWithEmailAndPassword(auth, email, password);
            const accountLabel = credential.user.email || 'Trivit account';
            setFeedback(`${modeConfig[currentMode].success}: ${accountLabel}.`, 'success');
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

    document.addEventListener('trivit:auth-mode-change', () => {
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
