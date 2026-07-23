
        window.onerror = function(msg, url, line, col, error) {
            console.error('JS Error:', msg, url, line, col, error);
            return true;
        };
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled promise rejection:', event.reason);
            if (event.preventDefault) {
                event.preventDefault();
            }
        });
    