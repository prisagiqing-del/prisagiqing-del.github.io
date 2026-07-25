        (() => {
            const REQUIRED_STAGES = ['settings', 'events', 'auth'];
            const MIN_VISIBLE_MS = 900;
            const MAX_VISIBLE_MS = 7000;
            const FADE_MS = 600;
            const startedAt = Date.now();
            const readyStages = new Set();
            let closing = false;
            let closed = false;

            document.documentElement.classList.add('tk-app-loading');

            const getOverlay = () => document.getElementById('loading-overlay');
            const allRequiredReady = () => REQUIRED_STAGES.every(stage => readyStages.has(stage));

            const closeOverlay = (force = false) => {
                if (closed || closing) return;
                if (!force && !allRequiredReady()) return;

                const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
                closing = true;
                window.setTimeout(() => {
                    const overlay = getOverlay();
                    if (!overlay) {
                        document.documentElement.classList.remove('tk-app-loading');
                        closed = true;
                        closing = false;
                        return;
                    }
                    overlay.classList.add('is-hiding');
                    overlay.setAttribute('aria-hidden', 'true');
                    window.setTimeout(() => {
                        overlay.style.display = 'none';
                        document.documentElement.classList.remove('tk-app-loading');
                        closed = true;
                        closing = false;
                        window.dispatchEvent(new CustomEvent('tiketkaka:app-visible'));
                    }, FADE_MS);
                }, remaining);
            };

            window.TiketKakaSplash = {
                markReady(stage) {
                    if (stage) readyStages.add(String(stage));
                    closeOverlay(false);
                },
                forceClose() {
                    closeOverlay(true);
                },
                isReady(stage) {
                    return readyStages.has(String(stage));
                },
                getState() {
                    return { readyStages: Array.from(readyStages), closing, closed };
                }
            };

            // Safety net: a network or Firebase error must never trap the user on the splash screen.
            window.setTimeout(() => closeOverlay(true), MAX_VISIBLE_MS);
        })();
