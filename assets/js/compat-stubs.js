
(function(){
    try {
        const log = (...a) => { try { console.log('[Btix-Compat]', ...a); } catch(e){} };
        window.__btixCompatLoaded = true;
        if (typeof window.populateTicketSponsors !== 'function') {
            window.populateTicketSponsors = function() {};
        }
        if (typeof window.populateTicketSponsorsWithRetry !== 'function') {
            window.populateTicketSponsorsWithRetry = async function() { return false; };
        }
        if (typeof window.renderAdminPayments !== 'function') {
            window.renderAdminPayments = function() {};
        }
        if (typeof window.renderAdminDeposits !== 'function') {
            window.renderAdminDeposits = function() {};
        }
        log('Compat layer ready');
    } catch (e) {
        console.warn('Compat layer init failed', e);
    }
})();
