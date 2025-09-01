document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.main-nav a[data-view]');
    const serviceCards = document.querySelectorAll('.service-card[data-view-target]');
    const logoHomeLink = document.getElementById('logo-home-link');

    const views = {
        dashboard: document.getElementById('dashboard-view'),
        solicitudes: document.getElementById('solicitudes-view'),
    };

    // --- SUPABASE DATA FETCHING ---
    // The supabase client is now globally available as window.db from auth.js
    // Solicitudes functionality has been moved to solicitudes.js module

    // --- VIEW SWITCHING LOGIC ---
    function switchView(viewName) {
        // Hide all views
        for (const key in views) {
            if (views[key]) {
                views[key].classList.add('hidden');
            }
        }
        // Deactivate all nav links
        navLinks.forEach(link => link.classList.remove('active'));

        // Show the selected view and activate the link
        const targetView = views[viewName];
        const targetLink = document.querySelector(`.main-nav a[data-view="${viewName}"]`);

        if (targetView) {
            targetView.classList.remove('hidden');
            if (targetLink) {
                targetLink.classList.add('active');
            }
        } else {
            // Default to dashboard if view not found
            views.dashboard.classList.remove('hidden');
            document.querySelector('.main-nav a[data-view="dashboard"]').classList.add('active');
        }

        // Load module data if switching to specific views
        if (viewName === 'solicitudes' && window.solicitudesModule) {
            // Add a small delay to ensure auth state is stable
            setTimeout(() => {
                window.solicitudesModule.loadModule();
            }, 100);
        }
    }

    // --- EVENT LISTENERS ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.getAttribute('data-view');
            switchView(viewName);
        });
    });

    serviceCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const viewName = e.currentTarget.getAttribute('data-view-target');
            if (viewName) {
                switchView(viewName);
            }
        });
    });
    
    if(logoHomeLink) {
        logoHomeLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('dashboard');
        });
    }

    // Set initial view to dashboard, the auth script will handle showing the app wrapper
    switchView('dashboard');
});