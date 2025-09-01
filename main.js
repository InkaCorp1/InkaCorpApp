document.addEventListener('DOMContentLoaded', () => {
    // Limpiar parámetros URL al cargar la página
    if (window.location.search || window.location.hash) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mainNav = document.getElementById('main-nav');
    const headerActions = document.getElementById('header-actions');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            headerActions.classList.toggle('active');
        });
    }
});
