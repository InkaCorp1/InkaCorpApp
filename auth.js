// Initialize Supabase client and attach to window
const supabaseUrl = 'https://lpsupabase.luispinta.com/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.bZRDLg2HoJKCXPp_B6BD5s-qcZM6-NrKO8qtxBtFGTk';

// Make sure the Supabase library is loaded before creating the client
if (!window.supabase) {
    alert('Error crítico: La librería de Supabase no se pudo cargar.');
} else {
    // Create a single, global Supabase client instance
    window.db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

// Get elements after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const appWrapper = document.getElementById('app-wrapper');
    const logoutButton = document.getElementById('logout-button');
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const loginButton = loginForm.querySelector('button');
            const email = event.target.email.value;
            const password = event.target.password.value;

            loginMessage.classList.add('hidden');
            loginButton.classList.add('loading');
            
            try {
                const { error } = await window.db.auth.signInWithPassword({ email, password });
                if (error) {
                    loginMessage.textContent = `Error: ${error.message}`;
                    loginMessage.classList.remove('hidden');
                }
                // onAuthStateChange will handle the UI switch on success
            } catch (e) {
                loginMessage.textContent = `Error inesperado: ${e.message}`;
                loginMessage.classList.remove('hidden');
            } finally {
                loginButton.classList.remove('loading');
            }
        });
    }

    // Handle logout button click
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            logoutButton.classList.add('loading');
            await window.db.auth.signOut();
            // The onAuthStateChange listener will handle hiding the button, 
            // so we don't strictly need to remove the loading class,
            // but it's good practice in case the transition fails.
            logoutButton.classList.remove('loading');
        });
    }

    // Listen for authentication state changes for seamless UI transition
    if (window.db) {
        window.db.auth.onAuthStateChange((_event, session) => {
            if (session) {
                // User is signed in, show the app wrapper
                loginContainer.classList.add('is-hidden');
                appWrapper.classList.remove('is-hidden');
            } else {
                // User is signed out, show the login container
                loginContainer.classList.remove('is-hidden');
                appWrapper.classList.add('is-hidden');
            }
        });
    }
});
