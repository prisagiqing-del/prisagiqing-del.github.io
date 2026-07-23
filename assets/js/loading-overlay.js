
        const hideLoadingOverlay = () => {
            const loader = document.getElementById('loading-overlay');
            if (loader) {
                loader.style.display = 'none';
            }
        };
        setTimeout(hideLoadingOverlay, 3000);
        document.addEventListener('DOMContentLoaded', hideLoadingOverlay);
        setTimeout(hideLoadingOverlay, 5000);
    