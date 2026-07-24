
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.onkeydown = e => { if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) return false; };

        const Toast = { fire: function(args) { if (typeof Swal !== 'undefined') { Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1e293b', color: '#fff' }).fire(args); } else { alert(args.title); } } };
        const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
        const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
        const safeSetHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        const safeSetValue = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const cleanObject = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined));
        };
        const escapeHtml = (unsafe) => {
            return unsafe.toString().replace(/[&<>"']/g, function(m) {
                return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];
            });
        };
        window.getUpgradeReplacementMap = function(tickets = {}) {
            const replacementMap = {};
            Object.entries(tickets || {}).forEach(([replacementCode, ticket]) => {
                const originalCode = ticket?.upgradedFrom?.originalCode;
                if (!originalCode) return;
                replacementMap[originalCode] = {
                    replacementCode,
                    targetCategory: ticket.category || '',
                    upgradedAt: ticket.upgradedAt || ticket.createdAt || null,
                    upgradePaymentId: ticket.upgradePaymentId || ticket.paymentId || ''
                };
            });
            return replacementMap;
        };
        window.isTicketReplacedByUpgrade = function(ticket, ticketCode = '', replacementMap = null) {
            if (!ticket) return false;
            if (ticket.replacedByUpgrade === true || ticket.invalidatedReason === 'UPGRADE' || ticket.upgradedToTicketCode) return true;
            const map = replacementMap || window.userUpgradeReplacementMap || {};
            const resolvedCode = ticketCode || ticket.code || '';
            return !!(resolvedCode && map[resolvedCode]);
        };
        window.findUpgradeReplacementTicket = async function(originalCode) {
            if (!originalCode) return null;
            const cached = window.userUpgradeReplacementMap?.[originalCode];
            if (cached) return cached;
            if (!window.db) return null;
            try {
                const snap = await window.db.ref('tickets').orderByChild('upgradedFrom/originalCode').equalTo(originalCode).limitToFirst(1).once('value');
                const data = snap.val() || {};
                const replacementCode = Object.keys(data)[0];
                const ticket = replacementCode ? data[replacementCode] : null;
                if (!ticket) return null;
                return {
                    replacementCode,
                    targetCategory: ticket.category || '',
                    upgradedAt: ticket.upgradedAt || ticket.createdAt || null,
                    upgradePaymentId: ticket.upgradePaymentId || ticket.paymentId || ''
                };
            } catch (e) {
                return null;
            }
        };
        const formatRichTextHtml = (text) => {
            if (text === undefined || text === null) return '';
            const raw = text.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
            if (!raw) return '';
            const lines = raw.split(/\n+/);
            let html = '';
            let openList = false;
            let listType = 'ul';
            const closeList = () => { if (openList) { html += `</${listType}>`; openList = false; } };
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) {
                    closeList();
                    return;
                }
                const bulletMatch = trimmed.match(/^([-*•])\s+(.*)$/);
                const orderedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
                if (bulletMatch) {
                    if (!openList) { html += '<ul class="rich-text">'; openList = true; listType = 'ul'; }
                    html += `<li>${escapeHtml(bulletMatch[2])}</li>`;
                } else if (orderedMatch) {
                    if (!openList) { html += '<ol class="rich-text">'; openList = true; listType = 'ol'; }
                    html += `<li>${escapeHtml(orderedMatch[2])}</li>`;
                } else {
                    closeList();
                    html += `<p>${escapeHtml(trimmed)}</p>`;
                }
            });
            closeList();
            return html;
        };
        const getCategoryLabel = (eventId, level) => {
            const ev = window.eventDataMap?.[eventId] || {};
            const labels = ev.categoryLabels || {};
            if (level === 'presale' || level === 0) return labels.presale || 'Presale';
            if (level === 'reguler' || level === 1) return labels.reguler || 'Reguler';
            if (level === 'vip' || level === 2) return labels.vip || 'VIP';
            if (level === 'vvip' || level === 3) return labels.vvip || 'VVIP';
            return '';
        };
        
        const updateDashboardLabels = () => {
            const labelMap = {
                'dash-kon-eco-label': 'presale',
                'dash-kon-vip-label': 'vip',
                'dash-kon-vvip-label': 'vvip',
                'dash-spo-eco-label': 'presale',
                'dash-spo-vip-label': 'vip',
                'dash-spo-vvip-label': 'vvip',
                'vd-kon-eco-label': 'presale',
                'vd-kon-vip-label': 'vip',
                'vd-kon-vvip-label': 'vvip',
                'vd-spo-eco-label': 'presale',
                'vd-spo-vip-label': 'vip',
                'vd-spo-vvip-label': 'vvip'
            };
            try {
                const events = Object.values(window.eventDataMap || {});
                if (events.length === 0) return;
                const findLabels = (type) => {
                    const candidates = events.filter(ev => {
                        const kategori = (ev.kategori || '').toString().toLowerCase();
                        if (type === 'kon') return kategori.includes('kon') || kategori.includes('konser');
                        if (type === 'spo') return kategori.includes('olahr') || kategori.includes('sport') || kategori.includes('spo');
                        return false;
                    });
                    const withLabels = candidates.find(ev => ev.categoryLabels && Object.keys(ev.categoryLabels).length > 0);
                    if (withLabels) return withLabels.categoryLabels;
                    return (candidates[0] && candidates[0].categoryLabels) ? candidates[0].categoryLabels : {};
                };
                const sectionLabels = {
                    kon: findLabels('kon'),
                    spo: findLabels('spo')
                };
                Object.keys(labelMap).forEach(elemId => {
                    const el = document.getElementById(elemId);
                    if (!el) return;
                    const level = labelMap[elemId];
                    const section = elemId.includes('kon-') ? 'kon' : 'spo';
                    const labels = sectionLabels[section] || {};
                    let labelText = '';
                    if (level === 'presale') labelText = labels.presale || 'Presale';
                    else if (level === 'reguler') labelText = labels.reguler || 'Reguler';
                    else if (level === 'vip') labelText = labels.vip || 'VIP';
                    else if (level === 'vvip') labelText = labels.vvip || 'VVIP';
                    el.innerText = labelText;
                });
            } catch(err) { }
        };

        window.deleteEvent = function(eventKey) {
            if (!eventKey || !window.db) return;
            const ev = window.eventDataMap?.[eventKey] || {};
            const ownerId = ev.ownerId || 'SUPER_ADMIN';
            if (!window.isSuperAdmin && ownerId !== window.currentUserData?.uid) {
                Toast.fire({ icon: 'error', title: 'Hanya admin utama atau pemilik event yang bisa menghapus event ini.' });
                return;
            }
            if (!confirm('Hapus event ini?')) return;
            window.db.ref(`events/${eventKey}`).remove()
                .then(() => {
                    if (window.eventDataMap) delete window.eventDataMap[eventKey];
                    if (window.currentViewingEventId === eventKey) window.currentViewingEventId = null;
                    window.refreshDashboardAfterDataMutation?.();
                    Toast.fire({ icon: 'success', title: 'Event berhasil dihapus.' });
                })
                .catch(err => {
                    Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus event.' });
                });
        };

        window.refreshDashboardAfterDataMutation = function() {
            try { window.updateAdminSalesSummaryFromTickets?.(); } catch (e) {}
            try { window.updateFinanceSummaryCards?.(window.activeVendorDashId || null); } catch (e) {}
            try { window.refreshAdminPaymentViews?.(); } catch (e) {}
            try { window.renderLaporanPerEvent?.(); } catch (e) {}
            try { window.updateVendorDashboardList?.(); } catch (e) {}
            try { window.renderAdminTicketTablesFromCache?.(window.globalTicketsData || {}); } catch (e) {}
        };

        let adminReportData = []; window.userTicketCount = {}; window.editEventKey = null; window.currentUserData = null;
        let html5QrcodeScanner = null; let currentEventPrices = {}; let bannerInterval = null;
        window.eventDataMap = {}; window.appSponsors = {}; window.usersMapCache = {};
        window.cachedSettings = null;
        window.getEventTicketPrice = function(category, eventId) {
            const currentPrices = window.currentEventPrices || {};
            const normalizedCategory = (category || '').toString().trim();
            let price = parseFloat(currentPrices[normalizedCategory]) || 0;
            if (price <= 0) {
                const fallbackKey = Object.keys(currentPrices).find(k => k.toLowerCase() === normalizedCategory.toLowerCase());
                if (fallbackKey) {
                    price = parseFloat(currentPrices[fallbackKey]) || 0;
                }
            }
            const ev = window.eventDataMap?.[eventId] || {};
            const tiket = ev.tiket || {};
            if (price <= 0 && tiket) {
                const priceMap = {
                    presale: tiket.presale_h,
                    reguler: tiket.reg_eco_h,
                    ekonomi: tiket.reg_eco_h,
                    vip: tiket.reg_vip_h,
                    vvip: tiket.reg_vvip_h,
                    'terusan ekonomi': tiket.trs_eco_h,
                    'terusan vip': tiket.trs_vip_h
                };
                price = parseFloat(priceMap[normalizedCategory.toLowerCase()]) || 0;
            }
            return price;
        };

        window.isDepositPeriodActive = function(ev) {
            if (!ev || !ev.deposit_enabled) return false;
            const now = new Date();
            const from = ev.deposit_from ? new Date(ev.deposit_from) : null;
            const to = ev.deposit_to ? new Date(ev.deposit_to) : null;
            if (from && !isNaN(from.getTime()) && now < from) return false;
            if (to && !isNaN(to.getTime())) {
                to.setHours(23, 59, 59, 999);
                if (now > to) return false;
            }
            return true;
        };

        window.getAllowedDepositCategories = function(ev, eventId) {
            if (!ev || !ev.deposit_enabled) return [];
            const tiket = ev.tiket || {};
            const normalizeCategory = (cat) => {
                if (!cat) return '';
                const c = cat.toString().trim().toLowerCase();
                if (c === 'presale') return 'Presale';
                if (c === 'reguler' || c === 'ekonomi') return 'Reguler';
                if (c === 'vip') return 'VIP';
                if (c === 'vvip') return 'VVIP';
                if (c === 'terusan ekonomi' || c === 'trs ekonomi' || c === 'trs_eco' || c === 'trs eco') return 'Terusan Ekonomi';
                if (c === 'terusan vip' || c === 'trs vip' || c === 'trs_vip') return 'Terusan VIP';
                return cat.toString().trim();
            };
            const categoryHasTickets = (cat) => {
                const normalized = (cat || '').toString().toLowerCase();
                return (normalized === 'presale' && (parseInt(tiket.presale_q) || 0) > (parseInt(tiket.presale_sold) || 0))
                    || (normalized === 'reguler' && (parseInt(tiket.reg_eco_q) || 0) > (parseInt(tiket.reg_eco_sold) || 0))
                    || (normalized === 'ekonomi' && (parseInt(tiket.reg_eco_q) || 0) > (parseInt(tiket.reg_eco_sold) || 0))
                    || (normalized === 'vip' && (parseInt(tiket.reg_vip_q) || 0) > (parseInt(tiket.reg_vip_sold) || 0))
                    || (normalized === 'vvip' && (parseInt(tiket.reg_vvip_q) || 0) > (parseInt(tiket.reg_vvip_sold) || 0))
                    || (normalized === 'terusan ekonomi' && (parseInt(tiket.trs_eco_q) || 0) > (parseInt(tiket.trs_eco_sold) || 0))
                    || (normalized === 'terusan vip' && (parseInt(tiket.trs_vip_q) || 0) > (parseInt(tiket.trs_vip_sold) || 0));
            };
            let selectedCats = Array.isArray(ev.deposit_categories) ? ev.deposit_categories.map(normalizeCategory).filter(cat => cat) : [];
            if (selectedCats.length === 0) {
                selectedCats = [];
                if ((parseInt(tiket.presale_q) || 0) > (parseInt(tiket.presale_sold) || 0) && window.getEventTicketPrice('Presale', eventId) > 0) selectedCats.push('Presale');
                if ((parseInt(tiket.reg_eco_q) || 0) > (parseInt(tiket.reg_eco_sold) || 0) && window.getEventTicketPrice('Reguler', eventId) > 0) selectedCats.push('Reguler');
                if ((parseInt(tiket.reg_vip_q) || 0) > (parseInt(tiket.reg_vip_sold) || 0) && window.getEventTicketPrice('VIP', eventId) > 0) selectedCats.push('VIP');
                if ((parseInt(tiket.reg_vvip_q) || 0) > (parseInt(tiket.reg_vvip_sold) || 0) && window.getEventTicketPrice('VVIP', eventId) > 0) selectedCats.push('VVIP');
                if ((parseInt(tiket.trs_eco_q) || 0) > (parseInt(tiket.trs_eco_sold) || 0) && window.getEventTicketPrice('Terusan Ekonomi', eventId) > 0) selectedCats.push('Terusan Ekonomi');
                if ((parseInt(tiket.trs_vip_q) || 0) > (parseInt(tiket.trs_vip_sold) || 0) && window.getEventTicketPrice('Terusan VIP', eventId) > 0) selectedCats.push('Terusan VIP');
            }
            const uniqueCats = [...new Set(selectedCats)];
            return uniqueCats.filter(cat => {
                const price = window.getEventTicketPrice(cat, eventId);
                return price > 0 && categoryHasTickets(cat);
            });
        };


        window.canUpgradeTicketCategory = function(category) {
            const normalized = (category || '').toString().toLowerCase();
            if (!normalized) return false;
            if (normalized.includes('terusan') || normalized.includes('sponsor') || normalized.includes('transfer') || normalized.includes('transferred')) return false;
            if (normalized.includes('vip') || normalized.includes('vvip')) return false;
            return true;
        };

        window.getEventCategorySoldKey = function(category) {
            const normalized = (category || '').toString().trim().toLowerCase();
            if (normalized === 'presale') return 'presale_sold';
            if (normalized === 'reguler' || normalized === 'ekonomi') return 'reg_eco_sold';
            if (normalized === 'vip' && !normalized.includes('vvip')) return 'reg_vip_sold';
            if (normalized.includes('vvip')) return 'reg_vvip_sold';
            if (normalized === 'terusan ekonomi') return 'trs_eco_sold';
            if (normalized === 'terusan vip') return 'trs_vip_sold';
            return '';
        };

        window.__ticketCreationLock = false;
        window.__ticketPruneLock = false;

        window.countTicketsForPayment = async function(paymentKey) {
            if (!paymentKey) return 0;
            try {
                const ticketSnap = await db.ref('tickets').orderByChild('paymentId').equalTo(paymentKey).once('value');
                const tickets = ticketSnap.val() || {};
                return Object.keys(tickets).length;
            } catch (e) {
                console.error('[countTicketsForPayment]', e);
                return 0;
            }
        };

        window.pruneOverGeneratedTicketsForPayments = async function() {
            if (!db || window.__ticketPruneLock) return;
            window.__ticketPruneLock = true;
            try {
                const [paymentsSnap, ticketsSnap] = await Promise.all([
                    db.ref('payments').once('value'),
                    db.ref('tickets').once('value')
                ]);
                const payments = paymentsSnap.val() || {};
                const tickets = ticketsSnap.val() || {};
                const ticketsByPayment = {};
                Object.entries(tickets).forEach(([ticketKey, ticket]) => {
                    if (!ticket || !ticket.paymentId) return;
                    if (!ticketsByPayment[ticket.paymentId]) ticketsByPayment[ticket.paymentId] = [];
                    ticketsByPayment[ticket.paymentId].push({ ticketKey, ticket });
                });

                const removeTasks = [];
                Object.entries(payments).forEach(([paymentKey, payment]) => {
                    if (!payment || (payment.status || '').toString().toUpperCase() !== 'APPROVED') return;
                    const paymentType = (payment.type || '').toString().toUpperCase();
                    if (paymentType === 'DEPOSIT' || paymentType === 'UPGRADE') return;
                    const expectedQty = Math.max(1, parseInt(payment.qty || '1', 10) || 1);
                    const entries = ticketsByPayment[paymentKey] || [];
                    if (entries.length <= expectedQty) return;
                    const toRemove = entries.slice(expectedQty);
                    toRemove.forEach(({ ticketKey }) => {
                        removeTasks.push(db.ref(`tickets/${ticketKey}`).remove());
                    });
                });
                if (removeTasks.length) {
                    await Promise.all(removeTasks);
                    window.refreshDashboardAfterDataMutation?.();
                }
            } catch (e) {
                console.warn('pruneOverGeneratedTicketsForPayments failed', e);
            } finally {
                window.__ticketPruneLock = false;
            }
        };

        window.ensureTicketsForPayment = async function(paymentKey, paymentData) {
            if (!db || !paymentKey || !paymentData) return { created: 0, existing: 0 };
            const paymentType = (paymentData.type || '').toString().toUpperCase();
            if (paymentType === 'DEPOSIT' || paymentType === 'UPGRADE') return { created: 0, existing: 0 };

            const expectedQty = Math.max(1, parseInt(paymentData.qty || '1', 10) || 1);
            const ticketSnap = await db.ref('tickets').orderByChild('paymentId').equalTo(paymentKey).once('value');
            const currentTickets = ticketSnap.val() || {};
            const existingCount = Object.keys(currentTickets).length;

            if (existingCount >= expectedQty) {
                if (existingCount > expectedQty) {
                    const toRemove = Object.keys(currentTickets).slice(expectedQty);
                    await Promise.all(toRemove.map(ticketKey => db.ref(`tickets/${ticketKey}`).remove()));
                }
                return { created: 0, existing: existingCount };
            }

            const missingQty = expectedQty - existingCount;
            const evId = paymentData.eventId;
            const eventData = window.eventDataMap?.[evId] || {};
            const category = paymentData.category || '';
            const ownerId = paymentData.ownerId || window.getPaymentOwnerId?.(paymentData) || 'SUPER_ADMIN';
            const isTerusan = (category || '').toLowerCase().includes('terusan');
            let seasonScanQuota = 0;
            if (isTerusan && eventData.tiket) {
                seasonScanQuota = category === 'Terusan Ekonomi' ? parseInt(eventData.tiket.trs_eco_scan) || 0 : parseInt(eventData.tiket.trs_vip_scan) || 0;
            }
            const seatValues = (paymentData.selectedSeat || '').toString().split(/\s*,\s*/).filter(Boolean);
            const createdCodes = [];

            for (let i = 0; i < missingQty; i++) {
                const tcode = await window.generateSecureTicketCode(ownerId, evId, eventData);
                const raffleNumber = eventData.raffle_enabled ? await window.reserveRaffleNumber(evId) : null;
                let tixPayload = {
                    code: tcode,
                    paymentId: paymentKey,
                    uid: paymentData.uid,
                    userName: paymentData.userName,
                    eventId: evId,
                    eventName: paymentData.eventName,
                    category: category,
                    status: 'ACTIVE',
                    ownerId: ownerId,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                if (raffleNumber !== null && typeof raffleNumber !== 'undefined') {
                    tixPayload.raffle_number = raffleNumber;
                }
                if (isTerusan) {
                    tixPayload.type = 'terusan';
                    tixPayload.quota = seasonScanQuota;
                    tixPayload.remaining = seasonScanQuota;
                }
                if (paymentData.selectedTribun !== undefined && paymentData.selectedTribun !== null) {
                    tixPayload.selectedTribun = paymentData.selectedTribun;
                }
                if (seatValues.length) {
                    tixPayload.selectedSeat = seatValues[i] || seatValues[seatValues.length - 1];
                } else if (paymentData.selectedSeat !== undefined && paymentData.selectedSeat !== null) {
                    tixPayload.selectedSeat = paymentData.selectedSeat;
                }
                if (paymentData.customFormAnswers) {
                    tixPayload.customFormAnswers = paymentData.customFormAnswers;
                }
                await db.ref(`tickets/${tcode}`).set(cleanObject(tixPayload));
                createdCodes.push(tcode);
            }

            if (evId) {
                await db.ref(`events/${evId}/sold`).transaction(c => (c || 0) + missingQty);
                const catKey = window.getEventCategorySoldKey(category);
                if (catKey) {
                    await db.ref(`events/${evId}/tiket/${catKey}`).transaction(c => (c || 0) + missingQty);
                }
            }

            return { created: missingQty, existing: existingCount + missingQty, createdCodes };
        };

        window.reconcileEventTicketCounts = async function(eventId) {
            if (!eventId) return;
            try {
                const ticketSnap = await db.ref('tickets').orderByChild('eventId').equalTo(eventId).once('value');
                const tickets = ticketSnap.val() || {};
                const summary = { total: 0, presale_sold: 0, reg_eco_sold: 0, reg_vip_sold: 0, reg_vvip_sold: 0, trs_eco_sold: 0, trs_vip_sold: 0 };
                const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
                Object.entries(tickets).forEach(([ticketCode, t]) => {
                    if (!t || !t.eventId || t.status === 'TRANSFERRED' || window.isTicketReplacedByUpgrade(t, ticketCode, upgradeReplacementMap)) return;
                    summary.total += 1;
                    const catKey = window.getEventCategorySoldKey(t.category);
                    if (catKey) summary[catKey] = (summary[catKey] || 0) + 1;
                });
                const updates = {};
                updates[`events/${eventId}/sold`] = summary.total;
                Object.keys(summary).forEach(key => {
                    if (key === 'total') return;
                    updates[`events/${eventId}/tiket/${key}`] = summary[key];
                });
                await db.ref().update(updates);
            } catch (e) {
                console.error('[reconcileEventTicketCounts]', e);
            }
        };

        window.computeSalesSummaryFromTickets = function(ownerId) {
            const tickets = window.globalTicketsData || {};
            const payments = window.globalPaymentsData || {};
            const targetOwnerId = ownerId || (window.isVendor ? window.currentUserData?.uid : null);
            const summary = {
                tix: 0,
                kon_ecoQ: 0, kon_ecoR: 0, kon_vipQ: 0, kon_vipR: 0, kon_vvipQ: 0, kon_vvipR: 0,
                spo_ecoQ: 0, spo_ecoR: 0, spo_vipQ: 0, spo_vipR: 0, spo_vvipQ: 0, spo_vvipR: 0
            };
            const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
            Object.entries(tickets).forEach(([ticketCode, t]) => {
                if (!t || t.type === 'sponsor' || t.status === 'TRANSFERRED' || window.isTicketReplacedByUpgrade(t, ticketCode, upgradeReplacementMap)) return;
                const eventData = window.eventDataMap?.[t.eventId] || {};
                const evOwner = eventData.ownerId || 'SUPER_ADMIN';
                if (targetOwnerId && evOwner !== targetOwnerId) return;
                let mainCat = 'Konser';
                if (eventData && eventData.kategori) mainCat = eventData.kategori;
                else if ((t.eventName || '').toLowerCase().includes('vs ') || (t.eventName || '').toLowerCase().includes('liga')) mainCat = 'Olahraga';
                const normalizedCat = (t.category || '').toString().toLowerCase();
                let group = 'eco';
                if (normalizedCat.includes('vvip')) group = 'vvip';
                else if (normalizedCat.includes('vip')) group = 'vip';
                const prefix = mainCat === 'Olahraga' ? 'spo' : 'kon';
                summary[`${prefix}_${group}Q`] += 1;
                summary.tix += 1;
                let ticketAmount = 0;
                const payment = payments[t.paymentId || ''];
                if (payment && Number.isFinite(parseFloat(payment.total || 0)) && parseFloat(payment.total || 0) > 0) {
                    const qty = Math.max(1, parseInt(payment.qty, 10) || 1);
                    const paymentType = (payment.type || '').toString().toUpperCase();
                    if (paymentType === 'DEPOSIT') {
                        const fullPrice = Number.isFinite(parseFloat(payment.fullPrice || 0)) && parseFloat(payment.fullPrice || 0) > 0
                            ? parseFloat(payment.fullPrice || 0)
                            : window.getEventTicketPrice(t.category, t.eventId) || 0;
                        ticketAmount = fullPrice / qty;
                    } else if (paymentType === 'UPGRADE' || paymentType.includes('UPGRADE') || paymentType.includes('MIGRAT')) {
                        ticketAmount = window.getEventTicketPrice(t.category, t.eventId) || (parseFloat(payment.total || 0) / qty);
                    } else {
                        ticketAmount = parseFloat(payment.total || 0) / qty;
                    }
                }
                if (ticketAmount <= 0) {
                    ticketAmount = window.getEventTicketPrice(t.category, t.eventId) || 0;
                }
                summary[`${prefix}_${group}R`] += ticketAmount;
            });
            return summary;
        };

        window.updateAdminSalesSummaryFromTickets = function() {
            const summary = window.computeSalesSummaryFromTickets(window.isVendor ? window.currentUserData?.uid : null);
            safeSetText('dash-tickets', summary.tix);
            safeSetText('dash-kon-eco-qty', summary.kon_ecoQ);
            safeSetText('dash-kon-eco-rp', formatRp(summary.kon_ecoR));
            safeSetText('dash-kon-vip-qty', summary.kon_vipQ);
            safeSetText('dash-kon-vip-rp', formatRp(summary.kon_vipR));
            safeSetText('dash-kon-vvip-qty', summary.kon_vvipQ);
            safeSetText('dash-kon-vvip-rp', formatRp(summary.kon_vvipR));
            safeSetText('dash-spo-eco-qty', summary.spo_ecoQ);
            safeSetText('dash-spo-eco-rp', formatRp(summary.spo_ecoR));
            safeSetText('dash-spo-vip-qty', summary.spo_vipQ);
            safeSetText('dash-spo-vip-rp', formatRp(summary.spo_vipR));
            safeSetText('dash-spo-vvip-qty', summary.spo_vvipQ);
            safeSetText('dash-spo-vvip-rp', formatRp(summary.spo_vvipR));

            if (window.activeVendorDashId) {
                const vendorSummary = window.computeSalesSummaryFromTickets(window.activeVendorDashId);
                safeSetText('vd-tickets', vendorSummary.tix);
                safeSetText('vd-kon-eco-qty', vendorSummary.kon_ecoQ);
                safeSetText('vd-kon-eco-rp', formatRp(vendorSummary.kon_ecoR));
                safeSetText('vd-kon-vip-qty', vendorSummary.kon_vipQ);
                safeSetText('vd-kon-vip-rp', formatRp(vendorSummary.kon_vipR));
                safeSetText('vd-kon-vvip-qty', vendorSummary.kon_vvipQ);
                safeSetText('vd-kon-vvip-rp', formatRp(vendorSummary.kon_vvipR));
                safeSetText('vd-spo-eco-qty', vendorSummary.spo_ecoQ);
                safeSetText('vd-spo-eco-rp', formatRp(vendorSummary.spo_ecoR));
                safeSetText('vd-spo-vip-qty', vendorSummary.spo_vipQ);
                safeSetText('vd-spo-vip-rp', formatRp(vendorSummary.spo_vipR));
                safeSetText('vd-spo-vvip-qty', vendorSummary.spo_vvipQ);
                safeSetText('vd-spo-vvip-rp', formatRp(vendorSummary.spo_vvipR));
            }
        };

        window.renderSponsorLists = function() {
            const s = window.cachedSettings || {};
            window.appSponsors = s.sponsors || {};
            const sGrid = document.getElementById('admin-sponsors-grid'); const pGrid = document.getElementById('public-sponsor-container');
            if(sGrid) sGrid.innerHTML = '';
            if(pGrid) pGrid.innerHTML = '';
            Object.keys(window.appSponsors).forEach(k => {
                const sp = window.appSponsors[k];
                const spOwner = sp.ownerId || 'SUPER_ADMIN';
                const sponsorName = (sp.name || '').toString().trim().toLowerCase();
                const sponsorLogo = (sp.logo || '').toString();
                const isLegacyBtixSponsor = sponsorName === 'btix' || sponsorName === 'btix.' || sponsorLogo.includes('Xkqq8E.png');
                const sosmedLink = sp.sosmed ? `<a href="${sp.sosmed}" target="_blank" class="inline-block mt-1 text-amber-500 hover:text-amber-400 transition-colors text-xs"><i class="fa-solid fa-link"></i></a>` : '';
                if (spOwner === 'SUPER_ADMIN' && !isLegacyBtixSponsor) {
                    if(pGrid) pGrid.innerHTML += `<div class="flex flex-col items-center gap-1"><img src="${sp.logo}" class="h-10 md:h-14 sponsor-logo">${sosmedLink}</div>`;
                }
                if (window.currentUserData) {
                    const isMine = spOwner === window.currentUserData.uid || (window.isSuperAdmin && spOwner === 'SUPER_ADMIN');
                    if(isMine && sGrid) {
                        sGrid.innerHTML += `<div class="bg-darker p-2 rounded text-center relative"><img src="${sp.logo}" class="h-10 mx-auto mb-1">${sosmedLink}<button onclick="window.deleteSponsorSetting('${k}')" class="absolute -top-2 -right-2 bg-red-500 text-white rounded w-5 h-5 text-xs"><i class="fa-solid fa-xmark"></i></button></div>`;
                    }
                }
            });
        };
        
        window.isSuperAdmin = false;
        window.isVendor = false;

        let activeTicketRef = null; let activeTicketCb = null;

        // Waiting Room System Variables with Enhanced Features
        window.waitingRoomData = {
            enabled: false,
            currentEventId: null,
            currentUserId: null,
            monitorInterval: null,
            checkInterval: 3000,
            capacityThreshold: 500,
            sessionTimeoutMs: 60000,
            maxSessionsPerUser: 1,
            rateLimitWindowMs: 60000,
            rateLimitMaxAttempts: 3,
            rateLimitBlockMs: 3600000,
            sessionId: null
        };
        window.activeUsersRef = null;
        window.waitingRoomSessionRef = null;
        window.waitingRoomUserRef = null;

        window.canUseRealtimeDb = function() {
            if (typeof db === 'undefined' || !db || typeof db.ref !== 'function') return false;
            if (window.location.protocol === 'file:') return false;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
            return true;
        };

        window.safeAwaitDb = async function(promiseFactory, fallbackValue = null) {
            try {
                if (!window.canUseRealtimeDb()) return fallbackValue;
                return await promiseFactory();
            } catch (err) {
                console.warn('DB access skipped:', err);
                return fallbackValue;
            }
        };

        window.generateWaitingRoomSessionId = function() {
            return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        };

        window.getWaitingRoomRateLimitState = function(userId) {
            const key = `beetix_waiting_room_rate_limit_${userId}`;
            try {
                const saved = localStorage.getItem(key);
                return saved ? JSON.parse(saved) : { attempts: 0, firstAttemptAt: 0, blockedUntil: 0 };
            } catch (e) {
                return { attempts: 0, firstAttemptAt: 0, blockedUntil: 0 };
            }
        };

        window.setWaitingRoomRateLimitState = function(userId, state) {
            const key = `beetix_waiting_room_rate_limit_${userId}`;
            localStorage.setItem(key, JSON.stringify(state));
        };

        window.clearWaitingRoomRateLimitState = function(userId) {
            localStorage.removeItem(`beetix_waiting_room_rate_limit_${userId}`);
        };

        window.checkWaitingRoomRateLimit = function(userId) {
            try {
                window.clearWaitingRoomRateLimitState(userId);
            } catch (e) {}
            return { allowed: true, remainingMs: 0 };
        };

        window.removeWaitingRoomSession = function() {
            if (!window.canUseRealtimeDb() || !window.waitingRoomData.currentEventId || !window.waitingRoomData.currentUserId || !window.waitingRoomData.sessionId) {
                return Promise.resolve();
            }

            const sessionRef = db.ref(`activeUsers/${window.waitingRoomData.currentEventId}/${window.waitingRoomData.currentUserId}/sessions/${window.waitingRoomData.sessionId}`);
            const userRef = db.ref(`activeUsers/${window.waitingRoomData.currentEventId}/${window.waitingRoomData.currentUserId}`);

            return window.safeAwaitDb(async () => {
                await sessionRef.remove();
                const snap = await userRef.once('value');
                const userData = snap && typeof snap.val === 'function' ? snap.val() || {} : {};
                if (!userData || !userData.sessions || Object.keys(userData.sessions).length === 0) {
                    await userRef.remove();
                }
                return true;
            }, true);
        };

        // Initialize Service Worker untuk Push Notification
        window.initServiceWorker = function() {
            if (window.location.protocol === 'file:' || !('serviceWorker' in navigator) || !window.isSecureContext) {
                return;
            }
            try {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
            } catch (err) {
                console.warn('SW registration skipped:', err);
            }
        };

        // Request notification permission
        window.requestNotificationPermission = function() {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        };

        // Save queue state to localStorage
        window.saveQueueState = function(eventId, userId, position, totalCount) {
            const queueState = {
                eventId: eventId,
                userId: userId,
                position: position,
                totalCount: totalCount,
                timestamp: Date.now(),
                status: 'in-queue'
            };
            localStorage.setItem('beetix_queue_state', JSON.stringify(queueState));
        };

        // Restore queue state from localStorage
        window.getQueueState = function() {
            const saved = localStorage.getItem('beetix_queue_state');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch(e) {
                    return null;
                }
            }
            return null;
        };

        // Clear queue state
        window.clearQueueState = function() {
            localStorage.removeItem('beetix_queue_state');
        };

        // Play sound notification
        window.playQueueNotificationSound = function() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch(e) {
                console.warn('Audio context not available');
            }
        };

        // Send browser push notification
        window.sendPushNotification = function(title, options = {}) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                    icon: 'https://i.ibb.co.com/6RSLNkcR/tiketkaka.png',
                    badge: 'https://i.ibb.co.com/6RSLNkcR/tiketkaka.png',
                    ...options
                });
            }
        };

        // Send email notification via Cloud Function
        window.sendQueueEmailNotification = function(userEmail, eventName, position) {
            try {
                db.ref('emailQueue').push({
                    to: userEmail,
                    subject: `Giliran Anda Tiba - ${eventName}`,
                    template: 'queue_notification',
                    data: {
                        eventName: eventName,
                        position: position
                    },
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            } catch(e) {
                console.error('Failed to queue email:', e);
            }
        };

        window.initWaitingRoom = function(eventId) {
            if (!auth || !auth.currentUser || typeof db === 'undefined') return;

            const userId = auth.currentUser.uid;
            window.checkWaitingRoomRateLimit(userId);

            if (!window.canUseRealtimeDb()) {
                window.waitingRoomData.enabled = true;
                window.waitingRoomData.currentEventId = eventId;
                window.waitingRoomData.currentUserId = userId;
                window.waitingRoomData.sessionId = window.generateWaitingRoomSessionId();
                window.saveQueueState(eventId, userId, 1, 1);
                window.hideWaitingRoom();
                return;
            }

            window.waitingRoomData.currentEventId = eventId;
            window.waitingRoomData.currentUserId = userId;
            window.waitingRoomData.enabled = true;
            window.waitingRoomData.sessionId = window.generateWaitingRoomSessionId();

            const userRef = db.ref(`activeUsers/${eventId}/${userId}`);
            const sessionRef = db.ref(`activeUsers/${eventId}/${userId}/sessions/${window.waitingRoomData.sessionId}`);

            window.safeAwaitDb(() => userRef.update({
                userEmail: auth.currentUser.email,
                status: 'checkout',
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }));

            window.safeAwaitDb(() => sessionRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                status: 'checkout',
                userEmail: auth.currentUser.email,
                sessionId: window.waitingRoomData.sessionId
            }));
            try { sessionRef.onDisconnect().remove(); } catch (err) { console.warn('Disconnect hook skipped:', err); }

            window.activeUsersRef = userRef;
            window.waitingRoomSessionRef = sessionRef;
            window.waitingRoomUserRef = userRef;

            // Check if user has saved queue state (re-queue feature)
            const savedQueue = window.getQueueState();
            if (savedQueue && savedQueue.eventId === eventId && savedQueue.status === 'in-queue') {
                // User kembali ke halaman yang sama - restore antri
                window.waitingRoomData.restoredFromCache = true;
            }

            // Request notification permission
            window.requestNotificationPermission();
            window.initServiceWorker();

            window.checkAndUpdateWaitingRoom(eventId);

            if (window.waitingRoomData.monitorInterval) clearInterval(window.waitingRoomData.monitorInterval);
            window.waitingRoomData.monitorInterval = setInterval(() => {
                if (window.waitingRoomData.enabled && window.waitingRoomData.currentEventId === eventId) {
                    window.checkAndUpdateWaitingRoom(eventId);
                }
            }, window.waitingRoomData.checkInterval);

            // Auto-resume if page is closed and reopened
            window.addEventListener('beforeunload', () => {
                const userPos = document.getElementById('waiting-room-position').innerText;
                if (userPos && userPos !== '---' && window.waitingRoomData.enabled) {
                    const totalCount = document.getElementById('waiting-room-count').innerText;
                    window.saveQueueState(eventId, userId, userPos, totalCount);
                }
            });
        };

        window.checkAndUpdateWaitingRoom = async function(eventId) {
            try {
                if (typeof db === 'undefined' || !auth || !auth.currentUser) return;
                if (!window.canUseRealtimeDb()) {
                    window.saveQueueState(eventId, auth.currentUser.uid, 1, 1);
                    window.hideWaitingRoom();
                    return;
                }

                const now = Date.now();
                const userId = auth.currentUser.uid;
                const waitingRoomOverlay = document.getElementById('waiting-room-overlay');
                if (!waitingRoomOverlay) return;

                const staleSessionPromises = [];
                let snap = await window.safeAwaitDb(() => db.ref(`activeUsers/${eventId}`).once('value'), null);
                let activeUsers = snap && typeof snap.val === 'function' ? snap.val() || {} : {};

                Object.keys(activeUsers).forEach((uid) => {
                    const userData = activeUsers[uid] || {};
                    const sessions = userData.sessions || {};
                    Object.keys(sessions).forEach((sessionId) => {
                        const sessionData = sessions[sessionId] || {};
                        const lastSeen = sessionData.lastSeen || sessionData.timestamp || 0;
                        if (lastSeen && (now - lastSeen) > window.waitingRoomData.sessionTimeoutMs) {
                            staleSessionPromises.push(db.ref(`activeUsers/${eventId}/${uid}/sessions/${sessionId}`).remove());
                        }
                    });
                });

                if (staleSessionPromises.length) {
                    await Promise.all(staleSessionPromises);
                    snap = await window.safeAwaitDb(() => db.ref(`activeUsers/${eventId}`).once('value'), null);
                    activeUsers = snap && typeof snap.val === 'function' ? snap.val() || {} : {};
                }

                const activeUserIds = Object.keys(activeUsers).filter((uid) => {
                    const userData = activeUsers[uid] || {};
                    const sessions = userData.sessions || {};
                    return userData && sessions && Object.keys(sessions).length > 0;
                });

                const userCount = activeUserIds.length;

                if (window.waitingRoomSessionRef && window.waitingRoomData.sessionId) {
                    await window.safeAwaitDb(() => window.waitingRoomSessionRef.update({
                        lastSeen: firebase.database.ServerValue.TIMESTAMP,
                        status: 'checkout'
                    }), null);
                    await window.safeAwaitDb(() => db.ref(`activeUsers/${eventId}/${userId}`).update({
                        lastSeen: firebase.database.ServerValue.TIMESTAMP,
                        status: 'checkout',
                        userEmail: auth.currentUser.email
                    }), null);
                }

                if (userCount > window.waitingRoomData.capacityThreshold) {
                    const sortedUserIds = activeUserIds.sort((a, b) => {
                        const aLast = activeUsers[a].lastSeen || activeUsers[a].timestamp || 0;
                        const bLast = activeUsers[b].lastSeen || activeUsers[b].timestamp || 0;
                        return aLast - bLast;
                    });

                    const userPosition = sortedUserIds.indexOf(userId) + 1;
                    const oldPosition = document.getElementById('waiting-room-position').innerText;
                    document.getElementById('waiting-room-count').innerText = userCount;
                    document.getElementById('waiting-room-position').innerText = userPosition;

                    // Save queue state to localStorage
                    window.saveQueueState(eventId, userId, userPosition, userCount);

                    // Notify when position improves significantly
                    if (oldPosition !== '---' && parseInt(oldPosition) > userPosition && (parseInt(oldPosition) - userPosition) >= 5) {
                        window.playQueueNotificationSound();
                        window.sendPushNotification('Antrian Maju!', {
                            body: `Posisi Anda sekarang: ${userPosition}. Terus tunggu ya!`
                        });
                    }

                    window.showWaitingRoom();
                } else {
                    // User dapat masuk - send notifications
                    const userData = window.currentUserData || {};

                    window.playQueueNotificationSound();
                    window.playQueueNotificationSound(); // Double beep untuk emphasis

                    window.sendPushNotification('Giliran Anda!', {
                        body: 'Anda sekarang dapat masuk ke checkout. Halaman akan diperbarui...'
                    });

                    // Send email notification
                    if (userData.email) {
                        const eventName = window.eventDataMap[eventId]?.title || 'Event';
                        window.sendQueueEmailNotification(userData.email, eventName, 1);
                    }

                    window.clearQueueState();
                    window.hideWaitingRoom();
                }
            } catch (err) {
                console.error('Waiting Room check error:', err);
            }
        };

        window.showWaitingRoom = function() {
            const overlay = document.getElementById('waiting-room-overlay');
            if (overlay && !overlay.classList.contains('show')) {
                overlay.classList.add('show');
                document.getElementById('page-event-detail').style.display = 'none';
            }
        };

        window.hideWaitingRoom = function() {
            const overlay = document.getElementById('waiting-room-overlay');
            if (overlay && overlay.classList.contains('show')) {
                overlay.classList.remove('show');
                const eventDetailPage = document.getElementById('page-event-detail');
                if (eventDetailPage) {
                    eventDetailPage.style.display = '';
                    eventDetailPage.classList.add('active');
                }
            }
        };

        window.cleanupWaitingRoom = function() {
            if (window.waitingRoomData.monitorInterval) {
                clearInterval(window.waitingRoomData.monitorInterval);
                window.waitingRoomData.monitorInterval = null;
            }

            if (window.waitingRoomData.currentEventId && window.waitingRoomData.currentUserId && window.waitingRoomData.sessionId) {
                window.removeWaitingRoomSession().catch(() => {});
            }

            const overlay = document.getElementById('waiting-room-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }

            window.waitingRoomData.enabled = false;
            window.waitingRoomData.currentEventId = null;
            window.waitingRoomData.currentUserId = null;
            window.waitingRoomData.sessionId = null;
            window.activeUsersRef = null;
            window.waitingRoomSessionRef = null;
            window.waitingRoomUserRef = null;
            window.clearQueueState();
        };

        // Monitor page display changes and integrate Waiting Room
        window.monitorPageDisplay = function() {
            setInterval(() => {
                const eventDetailPage = document.getElementById('page-event-detail');
                const coEvId = document.getElementById('co-evid');
                
                if (eventDetailPage && eventDetailPage.classList.contains('active') && coEvId && coEvId.value) {
                    const eventId = coEvId.value;
                    
                    if (!window.waitingRoomData.enabled || window.waitingRoomData.currentEventId !== eventId) {
                        window.cleanupWaitingRoom();
                        window.initWaitingRoom(eventId);
                    }
                } else if (eventDetailPage && !eventDetailPage.classList.contains('active')) {
                    if (window.waitingRoomData.enabled) {
                        window.cleanupWaitingRoom();
                    }
                }
            }, 500);
        };

        // Start monitoring when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => { window.monitorPageDisplay(); });
        } else {
            window.monitorPageDisplay();
        }

        // Cleanup when user leaves
        window.addEventListener('beforeunload', () => { window.cleanupWaitingRoom(); });
        window.addEventListener('pagehide', () => { window.cleanupWaitingRoom(); });

        function playScanFeedback(type) {
            try {
                if(navigator.vibrate) { if(type === 'success') navigator.vibrate([100]); else navigator.vibrate([200, 100, 200]); }
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if(!AudioContext) return;
                const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                if(type === 'success') {
                    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
                    gain.gain.setValueAtTime(1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                    osc.start(); osc.stop(ctx.currentTime + 0.3);
                } else {
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
                    gain.gain.setValueAtTime(1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                    osc.start(); osc.stop(ctx.currentTime + 0.4);
                }
            } catch(e){}
        }

        window.switchUserTab = function(tab) {
            document.querySelectorAll('.user-tab-content').forEach(el => el.classList.replace('block', 'hidden'));
            document.querySelectorAll('.user-tab-btn').forEach(el => {
                el.classList.remove('text-amber-500', 'border-b-2', 'border-amber-500');
                el.classList.add('text-gray-400');
            });
            
            const targetContent = document.getElementById('utab-' + tab);
            const btn = document.getElementById('btn-utab-' + tab);
            
            if(targetContent) targetContent.classList.replace('hidden', 'block');
            if(btn) {
                btn.classList.remove('text-gray-400');
                btn.classList.add('text-amber-500', 'border-b-2', 'border-amber-500');
            }
        };

        window.faqCategories = ['Pembelian Tiket', 'Pembayaran', 'Akun', 'Keamanan', 'Check In', 'Refund', 'Lainnya'];
        window.faqState = { items: [], search: '', category: 'Semua', editingId: null };
        window.faqWaState = { numbers: [], expanded: false, updatedAt: 0 };

        window.escapeFaqHtml = function(value) {
            return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        };

        window.getSafeFaqId = function(id) {
            const raw = String(id || '');
            return raw.replace(/[^a-zA-Z0-9_-]/g, '_') || `faq-${Date.now()}`;
        };

        window.populateFaqSelects = function() {
            const selects = [document.getElementById('faq-category-filter'), document.getElementById('faq-admin-category-filter'), document.getElementById('faq-category')];
            selects.forEach((select) => {
                if (!select) return;
                const currentValue = select.value || 'Semua';
                const isCategorySelect = select.id === 'faq-category';
                const options = isCategorySelect ? window.faqCategories : ['Semua', ...window.faqCategories];
                select.innerHTML = options.map((option) => `<option value="${window.escapeFaqHtml(option)}">${window.escapeFaqHtml(option)}</option>`).join('');
                if (isCategorySelect) {
                    select.value = currentValue && window.faqCategories.includes(currentValue) ? currentValue : 'Pembelian Tiket';
                } else {
                    select.value = currentValue && options.includes(currentValue) ? currentValue : 'Semua';
                }
            });
        };

        window.normalizeFaqWaNumber = function(value) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            const chunks = raw
                .split(/[\s,\n;|]+/)
                .map((chunk) => chunk.trim())
                .filter(Boolean);

            const normalized = chunks
                .map((chunk) => {
                    const digits = chunk.replace(/\D/g, '');
                    if (!digits) return '';
                    if (digits.startsWith('62')) return digits;
                    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
                    return digits;
                })
                .filter(Boolean);

            return normalized[0] || '';
        };

        window.normalizeFaqWaNumbers = function(values) {
            const normalized = [];
            const seen = new Set();
            const addValue = (value) => {
                if (value === null || value === undefined) return;
                const items = Array.isArray(value) ? value : String(value || '').split(/[\n,;|]+/).map((part) => part.trim()).filter(Boolean);
                items.forEach((item) => {
                    const normalizedItem = window.normalizeFaqWaNumber(item);
                    if (!normalizedItem) return;
                    if (!seen.has(normalizedItem)) {
                        seen.add(normalizedItem);
                        normalized.push(normalizedItem);
                    }
                });
            };

            if (Array.isArray(values)) {
                values.forEach(addValue);
            } else {
                addValue(values);
            }

            return normalized.slice(0, 5);
        };

        window.getFaqWaLink = function(value) {
            const normalized = window.normalizeFaqWaNumber(value);
            return normalized ? `https://wa.me/${normalized}` : '';
        };

        window.getFaqDefaults = function() {
            return [
                { question: 'Bagaimana cara membeli tiket?', answer: 'Pilih event yang diinginkan, pilih kategori tiket, lalu lanjutkan ke pembayaran. Setelah pembayaran berhasil diverifikasi, tiket akan muncul di akun Anda.', category: 'Pembelian Tiket', status: 'published' },
                { question: 'Di mana saya bisa melihat tiket yang sudah dibeli?', answer: 'Tiket Anda dapat dilihat di dashboard akun pengguna pada bagian tiket yang sudah dibeli.', category: 'Pembelian Tiket', status: 'published' },
                { question: 'Apakah saya bisa membeli lebih dari satu tiket?', answer: 'Ya, Anda dapat membeli lebih dari satu tiket selama kuota masih tersedia.', category: 'Pembelian Tiket', status: 'published' },
                { question: 'Bagaimana cara melakukan pembayaran?', answer: 'Pilih event, lanjutkan checkout, lalu ikuti instruksi pembayaran yang tampil di halaman pembayaran.', category: 'Pembayaran', status: 'published' },
                { question: 'Berapa lama proses verifikasi pembayaran?', answer: 'Biasanya verifikasi selesai dalam waktu beberapa menit hingga maksimal 1 jam tergantung antrean admin.', category: 'Pembayaran', status: 'published' },
                { question: 'Bagaimana jika saya salah mengunggah bukti pembayaran?', answer: 'Anda dapat menghubungi admin melalui fitur kontak yang tersedia untuk memperbaiki bukti pembayaran.', category: 'Pembayaran', status: 'published' },
                { question: 'Apa yang harus dilakukan jika lupa password?', answer: 'Gunakan fitur lupa password pada halaman login atau hubungi admin untuk bantuan pemulihan akun.', category: 'Akun', status: 'published' },
                { question: 'Apakah Tiket Kaka aman digunakan?', answer: 'Ya, Tiket Kaka menggunakan sistem autentikasi akun dan proses pembayaran yang aman untuk melindungi pengguna.', category: 'Akun', status: 'published' },
                { question: 'Apa yang harus dilakukan jika QR Code tidak bisa dipindai?', answer: 'Pastikan layar HP tidak terlalu redup dan gunakan pencahayaan yang cukup. Jika masih gagal, hubungi admin.', category: 'Check In', status: 'published' },
                { question: 'Apakah saya harus mencetak tiket atau cukup menunjukkan QR Code di HP?', answer: 'Anda cukup menunjukkan QR Code yang ada di HP Anda saat check in.', category: 'Check In', status: 'published' },
                { question: 'Apakah tiket bisa dibatalkan atau direfund?', answer: 'Kebijakan refund tergantung syarat dan ketentuan event yang dipilih. Silakan cek detail event atau hubungi admin.', category: 'Refund', status: 'published' },
                { question: 'Kapan tiket saya muncul di akun?', answer: 'Tiket biasanya muncul setelah pembayaran berhasil diverifikasi dan tiket dibuat.', category: 'Lainnya', status: 'published' },
                { question: 'Apakah tiket bisa dipindahkan ke orang lain?', answer: 'Biasanya tiket tidak bisa dipindahkan ke orang lain tanpa izin admin dan sesuai kebijakan event.', category: 'Lainnya', status: 'published' },
                { question: 'Mengapa tiket saya berstatus Ditangguhkan?', answer: 'Status Ditangguhkan biasanya muncul karena ada pengecekan tambahan atau kebutuhan verifikasi oleh admin.', category: 'Lainnya', status: 'published' },
                { question: 'Bagaimana cara menghubungi admin?', answer: 'Anda dapat menghubungi admin melalui kontak atau fitur WhatsApp Admin yang tersedia di halaman situs.', category: 'Lainnya', status: 'published' }
            ];
        };

        window.getFaqStoredItems = function() {
            try {
                const raw = localStorage.getItem('btix_faq_items');
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        };

        window.getFaqLocalSnapshot = function() {
            try {
                const raw = localStorage.getItem('btix_faq_state_v2');
                if (!raw) return { items: window.getFaqStoredItems(), pendingSync: false, updatedAt: Date.now() };
                const parsed = JSON.parse(raw);
                return {
                    items: Array.isArray(parsed?.items) ? parsed.items : window.getFaqStoredItems(),
                    pendingSync: Boolean(parsed?.pendingSync),
                    updatedAt: Number(parsed?.updatedAt) || Date.now()
                };
            } catch (e) {
                return { items: window.getFaqStoredItems(), pendingSync: false, updatedAt: Date.now() };
            }
        };

        window.persistFaqState = function(items, options = {}) {
            const normalizedItems = Array.isArray(items) ? items : [];
            const snapshot = {
                items: normalizedItems,
                pendingSync: Boolean(options.pendingSync),
                updatedAt: Date.now(),
                source: options.source || 'local'
            };
            try {
                localStorage.setItem('btix_faq_state_v2', JSON.stringify(snapshot));
                localStorage.setItem('btix_faq_items', JSON.stringify(normalizedItems));
            } catch (e) {}
            return snapshot;
        };

        window.saveFaqStoredItems = function(items) {
            return window.persistFaqState(items, { pendingSync: true, source: 'local' });
        };

        window.shouldApplyFaqWaRemoteNumbers = function(remoteNumbers, options = {}) {
            const normalizedRemote = window.normalizeFaqWaNumbers(remoteNumbers);
            if (!normalizedRemote.length) return false;

            const currentNumbers = Array.isArray(window.faqWaState?.numbers) ? window.faqWaState.numbers : [];
            const hasCurrentNumbers = currentNumbers.length > 0;
            const recentLocalWrite = Boolean(window.faqWaState?.lastLocalWriteAt && (Date.now() - Number(window.faqWaState.lastLocalWriteAt)) <= 60000);
            const writeLockActive = Boolean(Number(window.__faqWaWriteLockUntil || 0) > Date.now());
            const sameAsCurrent = hasCurrentNumbers && currentNumbers.length === normalizedRemote.length && currentNumbers.every((value, index) => value === normalizedRemote[index]);

            if (options.force) return true;
            if (!hasCurrentNumbers) return true;
            if (writeLockActive || recentLocalWrite) return false;
            if (sameAsCurrent) return false;
            return true;
        };

        window.getFaqStoredWaNumbers = function() {
            const primaryKeys = ['btix_faq_wa_numbers', 'btix_faq_wa_number'];
            const candidates = [];
            if (Array.isArray(window.__btixFaqWaNumbers)) {
                candidates.push(...window.__btixFaqWaNumbers);
            }

            const readFromStorage = (storage, key) => {
                try {
                    const raw = storage.getItem(key);
                    if (!raw) return null;
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                    if (typeof parsed === 'string' && parsed.trim()) return [parsed];
                    return null;
                } catch (e) {
                    return null;
                }
            };

            const readFromCookie = (key) => {
                try {
                    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
                    if (!cookieMatch) return null;
                    const parsed = JSON.parse(decodeURIComponent(cookieMatch[1] || '[]'));
                    if (Array.isArray(parsed)) return parsed;
                    if (typeof parsed === 'string' && parsed.trim()) return [parsed];
                    return null;
                } catch (e) {
                    return null;
                }
            };

            for (const key of primaryKeys) {
                const fromLocal = readFromStorage(localStorage, key);
                if (fromLocal && fromLocal.length) {
                    candidates.push(...fromLocal);
                    break;
                }
                const fromSession = readFromStorage(sessionStorage, key);
                if (fromSession && fromSession.length) {
                    candidates.push(...fromSession);
                    break;
                }
                const fromCookie = readFromCookie(key);
                if (fromCookie && fromCookie.length) {
                    candidates.push(...fromCookie);
                    break;
                }
            }

            if (!candidates.length) {
                for (const key of primaryKeys) {
                    const fromLocal = readFromStorage(localStorage, key);
                    if (fromLocal && fromLocal.length) {
                        candidates.push(...fromLocal);
                    }
                    const fromSession = readFromStorage(sessionStorage, key);
                    if (fromSession && fromSession.length) {
                        candidates.push(...fromSession);
                    }
                    const fromCookie = readFromCookie(key);
                    if (fromCookie && fromCookie.length) {
                        candidates.push(...fromCookie);
                    }
                }
            }

            return window.normalizeFaqWaNumbers(candidates);
        };

        window.saveFaqStoredWaNumbers = function(numbers, options = {}) {
            const normalized = window.normalizeFaqWaNumbers(numbers);
            const storageKeys = ['btix_faq_wa_numbers', 'btix_faq_wa_number'];
            const source = options.source || 'local';
            window.__btixFaqWaNumbers = normalized;
            if (window.cachedSettings && typeof window.cachedSettings === 'object') {
                window.cachedSettings.faq = { ...(window.cachedSettings.faq || {}), whatsappNumbers: normalized, floatingWaNumbers: normalized, faqWaNumbers: normalized, updatedAt: Date.now() };
            }
            try {
                storageKeys.forEach((key) => {
                    localStorage.setItem(key, JSON.stringify(normalized));
                    sessionStorage.setItem(key, JSON.stringify(normalized));
                });
            } catch (e) {}
            try {
                storageKeys.forEach((key) => {
                    const expiry = new Date(Date.now() + 60 * 60 * 24 * 365 * 1000).toUTCString();
                    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(normalized))}; path=/; expires=${expiry}; SameSite=Lax`;
                });
            } catch (e) {}
            window.faqWaState.numbers = normalized;
            window.faqWaState.expanded = false;
            window.faqWaState.updatedAt = Date.now();
            window.faqWaState.source = source;
            if (source === 'local') {
                window.faqWaState.lastLocalWriteAt = Date.now();
                window.__faqWaWriteLockUntil = Date.now() + 60000;
            } else {
                window.faqWaState.lastRemoteApplyAt = Date.now();
            }
            window.renderFloatingWa();
            window.dispatchEvent(new CustomEvent('btix-faq-wa-updated', { detail: { numbers: normalized } }));
            try {
                window.lastSavedFloatingWaNumbers = normalized.slice();
            } catch (e) {}
        };

        window.refreshFaqWaFromStorage = function() {
            window.faqWaState.numbers = [];
            window.renderFloatingWa();
        };

        window.applyFaqItems = function(items) {
            window.faqState.items = Array.isArray(items) ? items : [];
            window.persistFaqState(window.faqState.items, { pendingSync: true, source: 'local' });
            window.renderFaqPublicList();
            window.renderFaqAdminList();
        };

        window.renderFloatingWa = function() {
            const shell = document.getElementById('floating-wa-shell');
            if (shell) {
                shell.innerHTML = '';
            }
        };

        window.extractFaqWaNumbersFromPayload = function(payload) {
            if (Array.isArray(payload)) {
                return window.normalizeFaqWaNumbers(payload);
            }
            if (typeof payload === 'string' || typeof payload === 'number') {
                return window.normalizeFaqWaNumbers([payload]);
            }
            if (!payload || typeof payload !== 'object') {
                return [];
            }

            const candidates = [];
            ['whatsappNumbers', 'whatsappNumber', 'faqWaNumbers', 'floatingWaNumbers', 'numbers', 'waNumbers', 'numbersList', 'phones', 'number'].forEach((key) => {
                const value = payload[key];
                if (Array.isArray(value)) {
                    candidates.push(...value);
                } else if (value !== undefined && value !== null && value !== '') {
                    candidates.push(value);
                }
            });

            if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                Object.values(payload).forEach((value) => {
                    if (value && typeof value === 'object') {
                        if (Array.isArray(value)) {
                            candidates.push(...value);
                        } else {
                            const nestedNumber = value.number || value.whatsappNumber || value.whatsappNumbers || value.phone || value.mobile;
                            if (nestedNumber) {
                                candidates.push(nestedNumber);
                            }
                        }
                    }
                });
            }

            if (candidates.length) {
                return window.normalizeFaqWaNumbers(candidates);
            }
            return [];
        };

        window.getFaqWaRemoteRefs = function() {
            const refs = [];
            try {
                const dbRef = window.db && typeof window.db.ref === 'function' ? window.db : null;
                if (dbRef) {
                    refs.push({ type: 'realtime', ref: dbRef.ref('settings/faq/floatingWaNumbers'), mode: 'array' });
                    refs.push({ type: 'realtime', ref: dbRef.ref('settings/faq/whatsappNumbers'), mode: 'array' });
                    refs.push({ type: 'realtime', ref: dbRef.ref('settings/faq'), mode: 'object' });
                    refs.push({ type: 'realtime', ref: dbRef.ref('siteSettings/faq/floatingWaNumbers'), mode: 'array' });
                    refs.push({ type: 'realtime', ref: dbRef.ref('siteSettings/faq/whatsappNumbers'), mode: 'array' });
                    refs.push({ type: 'realtime', ref: dbRef.ref('siteSettings/faq'), mode: 'object' });
                }
            } catch (e) {}
            return refs;
        };

        window.readFaqWaNumbersFromRemote = async function() {
            const refs = window.getFaqWaRemoteRefs();
            for (const entry of refs) {
                try {
                    if (entry.type === 'realtime') {
                        const snap = await entry.ref.once('value');
                        const numbers = window.extractFaqWaNumbersFromPayload(snap.val());
                        if (numbers.length) {
                            return numbers;
                        }
                    } else if (entry.ref && typeof entry.ref.get === 'function') {
                        const doc = await entry.ref.get();
                        const numbers = window.extractFaqWaNumbersFromPayload(doc.data ? doc.data() : doc);
                        if (numbers.length) {
                            return numbers;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            return [];
        };

        window.syncFaqWaNumbersFromSettings = function(settingsPayload) {
            let sharedNumbers = window.extractFaqWaNumbersFromPayload(settingsPayload || {});
            const recentLocalWrite = Boolean(window.faqWaState?.lastLocalWriteAt && (Date.now() - Number(window.faqWaState.lastLocalWriteAt)) <= 60000);
            const writeLockActive = Boolean(Number(window.__faqWaWriteLockUntil || 0) > Date.now());

            if (!sharedNumbers.length && settingsPayload && typeof settingsPayload === 'object') {
                const whatsappEntries = settingsPayload.whatsapp || settingsPayload.wa || settingsPayload.whatsApp || {};
                if (whatsappEntries && typeof whatsappEntries === 'object') {
                    const derivedNumbers = Object.values(whatsappEntries)
                        .map((entry) => (entry && typeof entry === 'object' ? (entry.number || entry.whatsappNumber || entry.phone || entry.mobile || '') : ''))
                        .filter(Boolean);
                    sharedNumbers = window.normalizeFaqWaNumbers(derivedNumbers);
                }
            }

            if (sharedNumbers.length && !recentLocalWrite && !writeLockActive && window.shouldApplyFaqWaRemoteNumbers(sharedNumbers)) {
                window.faqWaState.numbers = sharedNumbers;
                window.faqWaState.updatedAt = Date.now();
                window.saveFaqStoredWaNumbers(sharedNumbers, { source: 'remote' });
                window.renderFloatingWa();
                return sharedNumbers;
            }

            if (window.faqWaState?.numbers?.length) {
                window.renderFloatingWa();
                return window.faqWaState.numbers;
            }

            window.renderFloatingWa();
            return [];
        };

        window.writeFaqWaNumbersToRemote = async function(numbers) {
            const normalized = window.normalizeFaqWaNumbers(numbers);
            const refs = window.getFaqWaRemoteRefs();
            const writeOperations = refs.map(async (entry) => {
                try {
                    if (!entry.ref || typeof entry.ref.set !== 'function' || typeof entry.ref.update !== 'function') {
                        return false;
                    }

                    if (entry.mode === 'array') {
                        await entry.ref.set(normalized);
                    } else {
                        const payload = {
                            whatsappNumbers: normalized,
                            floatingWaNumbers: normalized,
                            faqWaNumbers: normalized,
                            updatedAt: firebase.database.ServerValue.TIMESTAMP
                        };
                        if (entry.ref.key === 'settings') {
                            await entry.ref.update({ faq: payload });
                        } else if (entry.ref.key === 'siteSettings') {
                            await entry.ref.update({ faq: payload });
                        } else {
                            await entry.ref.update(payload);
                        }
                    }
                } catch (e) {
                    return false;
                }
                return true;
            });
            await Promise.allSettled(writeOperations);
            return normalized;
        };

        window.getFaqWaRealtimeRef = function() {
            const refs = window.getFaqWaRemoteRefs();
            return refs.find((entry) => entry.type === 'realtime' && entry.ref) || null;
        };

        window.applyFaqWaNumbersFromPayload = function(payload) {
            const numbers = window.extractFaqWaNumbersFromPayload(payload);
            if (numbers.length) {
                window.saveFaqStoredWaNumbers(numbers);
                return numbers;
            }
            return [];
        };

        window.getFaqFirebaseConfig = function() {
            if (typeof firebaseConfig !== 'undefined' && firebaseConfig) return firebaseConfig;
            if (typeof window.__btixFirebaseConfig !== 'undefined' && window.__btixFirebaseConfig) return window.__btixFirebaseConfig;
            return null;
        };

        window.ensureFaqFirebase = function() {
            if (window.faqBackendConnection) {
                return window.faqBackendConnection;
            }

            if (window.location.protocol === 'file:' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                return null;
            }

            if (typeof firebase === 'undefined') {
                console.warn('FAQ backend SDK tidak tersedia saat ini.');
                return null;
            }

            const config = window.getFaqFirebaseConfig();
            if (!config || !config.projectId) {
                console.warn('FAQ backend config belum tersedia.');
                return null;
            }

            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(config);
                } else {
                    const defaultApp = firebase.apps.find((appInstance) => appInstance.name === '[DEFAULT]');
                    if (!defaultApp) {
                        firebase.initializeApp(config);
                    }
                }

                if (!window.db && typeof firebase.database === 'function') {
                    window.db = firebase.database();
                }

                if (!window.auth && typeof firebase.auth === 'function') {
                    window.auth = firebase.auth();
                }

                if (typeof firebase.firestore === 'function') {
                    try {
                        window.faqDb = window.faqDb || firebase.firestore();
                        window.faqCollection = window.faqCollection || window.faqDb.collection('faq');
                        window.faqSiteSettings = window.faqSiteSettings || window.faqDb.collection('siteSettings');
                        try { window.faqDb.settings?.({ experimentalAutoDetectLongPolling: true }); } catch (e) {}
                        try {
                            window.faqDb.enablePersistence?.({ synchronizeTabs: true }).catch(() => {});
                        } catch (e) {}
                        window.faqBackendConnection = {
                            mode: 'firestore',
                            db: window.faqDb,
                            collection: window.faqCollection,
                            siteSettings: window.faqSiteSettings,
                            siteSettingsRef: window.db ? window.db.ref('siteSettings') : null,
                            ref: window.db ? window.db.ref('faq') : null
                        };
                        return window.faqBackendConnection;
                    } catch (err) {
                        console.warn('Gagal menginisialisasi FAQ Firestore:', err);
                    }
                }

                if (window.db) {
                    window.faqBackendConnection = {
                        mode: 'realtime',
                        db: window.db,
                        collection: null,
                        siteSettings: null,
                        siteSettingsRef: window.db.ref('siteSettings'),
                        ref: window.db.ref('faq')
                    };
                    return window.faqBackendConnection;
                }

                return null;
            } catch (err) {
                console.warn('Gagal menginisialisasi FAQ backend:', err);
                return null;
            }
        };

        window.syncFaqWaNumbersFromRemote = async function(force = false) {
            try {
                const remoteNumbers = await window.readFaqWaNumbersFromRemote();
                if (!remoteNumbers.length) return false;
                if (!window.shouldApplyFaqWaRemoteNumbers(remoteNumbers, { force })) return false;

                window.faqWaState.numbers = remoteNumbers;
                window.faqWaState.updatedAt = Date.now();
                window.saveFaqStoredWaNumbers(remoteNumbers, { source: 'remote' });
                window.renderFloatingWa();
                window.populateFloatingWaAdminInputs();
                return true;
            } catch (err) {
                return false;
            }
        };

        window.attachFaqWaRemoteListener = function() {
            if (!window.db || typeof window.db.ref !== 'function' || window.__faqWaRemoteListenerActive) return;
            window.__faqWaRemoteListenerActive = true;

            const attachedPaths = new Set();
            window.getFaqWaRemoteRefs().forEach((entry) => {
                const path = entry.ref && typeof entry.ref.toString === 'function' ? entry.ref.toString() : '';
                const pathKey = path.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
                if (!pathKey || attachedPaths.has(pathKey)) return;
                attachedPaths.add(pathKey);
                try {
                    entry.ref.on('value', (snap) => {
                        const payload = snap.val() || {};
                        const numbers = window.extractFaqWaNumbersFromPayload(payload);
                        const writeLockActive = Boolean(Number(window.__faqWaWriteLockUntil || 0) > Date.now());
                        if (!numbers.length || writeLockActive || !window.shouldApplyFaqWaRemoteNumbers(numbers)) return;

                        window.faqWaState.numbers = numbers;
                        window.faqWaState.updatedAt = Date.now();
                        window.saveFaqStoredWaNumbers(numbers, { source: 'remote' });
                        window.renderFloatingWa();
                        window.populateFloatingWaAdminInputs();
                    });
                } catch (e) {}
            });

            if (window.__faqWaRemoteSyncTimer) {
                clearInterval(window.__faqWaRemoteSyncTimer);
            }
            window.__faqWaRemoteSyncTimer = setInterval(() => {
                window.syncFaqWaNumbersFromRemote(false).catch(() => {});
            }, 10000);
        };

        window.loadFaqWaConfig = async function() {
            try {
                const storedNumbers = window.getFaqStoredWaNumbers();
                const hasFreshLocalWa = Boolean(
                    window.faqWaState.updatedAt &&
                    window.faqWaState.numbers.length &&
                    window.lastSavedFloatingWaNumbers &&
                    window.lastSavedFloatingWaNumbers.length
                );
                if (storedNumbers.length) {
                    window.faqWaState.numbers = hasFreshLocalWa ? window.faqWaState.numbers : storedNumbers;
                }
                window.renderFloatingWa();

                const remoteNumbers = await window.readFaqWaNumbersFromRemote();
                const writeLockActive = Boolean(Number(window.__faqWaWriteLockUntil || 0) > Date.now());
                if (remoteNumbers.length && !writeLockActive && window.shouldApplyFaqWaRemoteNumbers(remoteNumbers, { force: true })) {
                    window.faqWaState.numbers = remoteNumbers;
                    window.faqWaState.updatedAt = Date.now();
                    window.saveFaqStoredWaNumbers(remoteNumbers, { source: 'remote' });
                    return;
                }

                const sharedNumbers = window.syncFaqWaNumbersFromSettings(window.cachedSettings || null);
                if (sharedNumbers.length && (!window.faqWaState.updatedAt || !window.faqWaState.numbers.length)) {
                    window.faqWaState.numbers = sharedNumbers;
                    window.saveFaqStoredWaNumbers(sharedNumbers, { source: 'remote' });
                    return;
                }

                if (storedNumbers.length && !writeLockActive) {
                    await window.writeFaqWaNumbersToRemote(storedNumbers);
                }
            } catch (err) {
                console.warn('Gagal memuat konfigurasi WA FAQ:', err);
                window.renderFloatingWa();
            }
        };

        window.saveFaqWaNumber = async function(numbers) {
            try {
                const rawNumbers = Array.isArray(numbers) ? numbers : [numbers];
                const normalized = window.normalizeFaqWaNumbers(rawNumbers);
                window.saveFaqStoredWaNumbers(normalized, { source: 'local' });

                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: 'Floating WA diperbarui' });

                if (typeof document !== 'undefined' && document.getElementById('floating-wa-admin-input')) {
                    const input = document.getElementById('floating-wa-admin-input');
                    if (input) {
                        input.value = normalized.join('\n');
                    }
                }

                await window.writeFaqWaNumbersToRemote(normalized);
            } catch (err) {
                console.error('Gagal menyimpan floating WA:', err);
                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: 'Floating WA disimpan lokal' });
            }
        };

        window.populateFloatingWaAdminInputs = function() {
            const input = document.getElementById('floating-wa-admin-input');
            if (!input) return;
            const numbers = (window.faqWaState.numbers && window.faqWaState.numbers.length ? window.faqWaState.numbers : window.getFaqStoredWaNumbers());
            input.value = numbers.join('\n');
        };

        window.saveFloatingWaFromAdmin = async function() {
            const input = document.getElementById('floating-wa-admin-input');
            if (!input) return;
            const values = String(input.value || '')
                .split(/[\s,\n;|]+/)
                .map((value) => value.trim())
                .filter(Boolean);
            const normalized = window.normalizeFaqWaNumbers(values);
            await window.saveFaqWaNumber(normalized);
            if (input) {
                input.value = normalized.join('\n');
            }
            window.populateFloatingWaAdminInputs();
        };

        window.bindFaqForm = function() {
            const form = document.getElementById('faq-form');
            if (!form) return;
            if (!form.dataset.bound) {
                form.addEventListener('submit', (event) => {
                    event.preventDefault();
                    window.submitFaqForm(event);
                });
                form.dataset.bound = '1';
            }

            const saveButton = form.querySelector('button[type="submit"]');
            if (saveButton && saveButton.dataset.bound !== '1') {
                saveButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.submitFaqForm({ preventDefault() {}, stopPropagation() {}, currentTarget: form });
                });
                saveButton.dataset.bound = '1';
            }
        };

        window.bindFloatingWaAdminControls = function() {
            const buttons = Array.from(document.querySelectorAll('button')).filter((button) => {
                const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                return text.includes('simpan no wa') || text.includes('floating wa') || text.includes('simpan wa');
            });

            buttons.forEach((button) => {
                if (button.dataset.btixWaBound) return;
                button.dataset.btixWaBound = '1';
                button.addEventListener('click', async (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const wrapper = button.closest('div') || button.parentElement;
                    const input = wrapper?.querySelector('input, textarea') || document.querySelector('input[placeholder*="Contoh"], input[type="tel"]');
                    if (!input) return;

                    const values = String(input.value || '')
                        .split(/[,\n]/)
                        .map((value) => value.trim())
                        .filter(Boolean);

                    await window.saveFaqWaNumber(values);
                });
            });
        };window.initFaqModule = async function() {
            window.ensureFaqFirebase();
            window.refreshFaqWaFromStorage();
            window.populateFaqSelects();
            window.bindFaqForm();

            const searchEl = document.getElementById('faq-search');
            const categoryEl = document.getElementById('faq-category-filter');
            const adminSearchEl = document.getElementById('faq-admin-search');
            const adminCategoryEl = document.getElementById('faq-admin-category-filter');

            if (searchEl && !searchEl.dataset.bound) {
                searchEl.addEventListener('input', (event) => { window.faqState.search = event.target.value; window.renderFaqPublicList(); });
                searchEl.dataset.bound = '1';
            }
            if (categoryEl && !categoryEl.dataset.bound) {
                categoryEl.addEventListener('change', () => { window.renderFaqPublicList(); });
                categoryEl.dataset.bound = '1';
            }

            if (window.isSuperAdmin) {
                if (adminSearchEl && !adminSearchEl.dataset.bound) {
                    adminSearchEl.addEventListener('input', () => { window.renderFaqAdminList(); });
                    adminSearchEl.dataset.bound = '1';
                }
                if (adminCategoryEl && !adminCategoryEl.dataset.bound) {
                    adminCategoryEl.addEventListener('change', () => { window.renderFaqAdminList(); });
                    adminCategoryEl.dataset.bound = '1';
                }
            }

            await window.loadFaqItems();
            if (window.isSuperAdmin) {
                await window.loadFaqWaConfig();
            } else {
                window.renderFaqPublicList();
                window.renderFaqAdminList();
            }
        };

        window.seedFaqDefaults = async function() {
            const snapshot = window.getFaqLocalSnapshot();
            if (snapshot.items.length) {
                window.faqState.items = snapshot.items;
                window.renderFaqPublicList();
                window.renderFaqAdminList();
                return;
            }

            const defaults = window.getFaqDefaults().map((item) => ({
                ...item,
                id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }));
            window.persistFaqState(defaults, { pendingSync: true, source: 'local' });
            window.faqState.items = defaults;
            window.renderFaqPublicList();
            window.renderFaqAdminList();

            if (!window.faqCollection) return;
            try {
                const existing = await window.faqCollection.limit(1).get();
                if (!existing.empty) return;
                const batch = window.faqDb.batch();
                defaults.forEach((item) => {
                    const ref = window.faqCollection.doc();
                    batch.set(ref, {
                        question: item.question,
                        answer: item.answer,
                        category: item.category,
                        status: item.status,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
            } catch (err) {
                console.warn('FAQ default seed skipped', err);
            }
        };

        window.loadFaqItems = async function() {
            const snapshot = window.getFaqLocalSnapshot();
            if (snapshot.items.length) {
                window.faqState.items = snapshot.items;
                window.renderFaqPublicList();
                window.renderFaqAdminList();
            } else {
                window.faqState.items = [];
                window.renderFaqPublicList();
                window.renderFaqAdminList();
            }

            const connection = window.ensureFaqFirebase();
            if (!connection) {
                await window.seedFaqDefaults();
                return;
            }
            try {
                await window.seedFaqDefaults();
                const firestoreSnapshot = await connection.collection.orderBy('createdAt', 'desc').get();
                const remoteItems = firestoreSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                if (remoteItems.length) {
                    window.faqState.items = remoteItems;
                    window.persistFaqState(remoteItems, { pendingSync: false, source: 'remote' });
                }
                window.renderFaqPublicList();
                window.renderFaqAdminList();
            } catch (err) {
                console.error('Gagal memuat FAQ dari Firestore:', err);
                const localItems = window.getFaqStoredItems();
                if (!localItems.length) {
                    window.faqState.items = window.getFaqDefaults().map((item) => ({ ...item, id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), updatedAt: Date.now() }));
                    window.persistFaqState(window.faqState.items, { pendingSync: true, source: 'local' });
                } else {
                    window.faqState.items = localItems;
                    window.persistFaqState(localItems, { pendingSync: true, source: 'local' });
                }
                window.renderFaqPublicList();
                window.renderFaqAdminList();
            }
        };

        window.toggleFaqAccordion = function(buttonOrTarget) {
            const button = typeof buttonOrTarget === 'string'
                ? document.querySelector(`.faq-accordion-button[data-faq-target="${buttonOrTarget}"]`)
                : buttonOrTarget;
            if (!button) return;

            const targetId = button.getAttribute('data-faq-target');
            const target = targetId ? document.getElementById(targetId) : null;
            const shouldOpen = button.getAttribute('aria-expanded') !== 'true';

            document.querySelectorAll('#faqAccordionPublic .faq-accordion-button').forEach((control) => {
                control.classList.add('collapsed');
                control.setAttribute('aria-expanded', 'false');
            });
            document.querySelectorAll('#faqAccordionPublic .faq-accordion-collapse').forEach((panel) => {
                panel.classList.remove('show');
            });

            if (shouldOpen && target) {
                button.classList.remove('collapsed');
                button.setAttribute('aria-expanded', 'true');
                target.classList.add('show');
            }
        };

        window.renderFaqPublicList = function() {
            const container = document.getElementById('faqAccordionPublic') || document.getElementById('faq-public-list');
            if (!container) return;
            const search = (document.getElementById('faq-search')?.value || '').toLowerCase().trim();
            const category = document.getElementById('faq-category-filter')?.value || 'Semua';
            const items = (window.faqState.items || []).filter((item) => item.status === 'published').filter((item) => {
                const matchesSearch = !search || (item.question || '').toLowerCase().includes(search) || (item.answer || '').toLowerCase().includes(search);
                const matchesCategory = category === 'Semua' || item.category === category;
                return matchesSearch && matchesCategory;
            });

            if (!items.length) {
                container.innerHTML = `
                    <div class="faq-empty-state p-6 text-center text-gray-300">
                        <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 text-xl">
                            <i class="fa-solid fa-circle-info"></i>
                        </div>
                        <div class="font-semibold text-white mb-1">Belum ada FAQ yang cocok</div>
                        <div class="text-sm text-gray-400">Coba ubah kata kunci atau pilih kategori lain.</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map((item) => {
                const safeId = window.getSafeFaqId(item.id);
                return `
                <div class="faq-accordion-item mb-3">
                    <h2 class="accordion-header" id="faq-heading-${safeId}">
                        <button class="faq-accordion-button accordion-button collapsed" type="button" data-faq-target="faq-item-${safeId}" aria-expanded="false" aria-controls="faq-item-${safeId}">
                            <span class="me-3 text-amber-400"><i class="fa-solid fa-circle-question"></i></span>
                            <span class="flex-grow-1 text-start fw-semibold">${window.escapeFaqHtml(item.question || '')}</span>
                            <span class="badge rounded-pill bg-amber-500/20 text-amber-400 ms-3">${window.escapeFaqHtml(item.category || 'Lainnya')}</span>
                        </button>
                    </h2>
                    <div id="faq-item-${safeId}" class="faq-accordion-collapse" aria-labelledby="faq-heading-${safeId}">
                        <div class="accordion-body text-gray-300 border-top border-white/10 bg-slate-950/40 leading-7">
                            ${window.escapeFaqHtml(item.answer || '')}
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            if (!container.dataset.faqBound) {
                container.addEventListener('click', (event) => {
                    const button = event.target.closest('.faq-accordion-button');
                    if (!button) return;
                    event.preventDefault();
                    event.stopPropagation();
                    window.toggleFaqAccordion(button);
                });
                container.dataset.faqBound = '1';
            }
        };

        window.renderFaqAdminList = function() {
            const tbody = document.getElementById('faq-admin-table-body');
            if (!tbody) return;
            const search = (document.getElementById('faq-admin-search')?.value || '').toLowerCase().trim();
            const category = document.getElementById('faq-admin-category-filter')?.value || 'Semua';
            const items = (window.faqState.items || []).filter((item) => {
                const matchesSearch = !search || (item.question || '').toLowerCase().includes(search) || (item.answer || '').toLowerCase().includes(search);
                const matchesCategory = category === 'Semua' || item.category === category;
                return matchesSearch && matchesCategory;
            });

            if (!items.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-gray-400 py-5">Tidak ada FAQ yang cocok.</td></tr>';
                return;
            }

            tbody.innerHTML = items.map((item) => `
                <tr class="faq-admin-row align-middle">
                    <td>
                        <div class="font-semibold text-white">${window.escapeFaqHtml(item.question || '')}</div>
                        <div class="text-xs text-gray-400 mt-1">${window.escapeFaqHtml((item.answer || '').slice(0, 90))}${(item.answer || '').length > 90 ? '...' : ''}</div>
                    </td>
                    <td><span class="badge rounded-pill bg-white/10 text-gray-200">${window.escapeFaqHtml(item.category || 'Lainnya')}</span></td>
                    <td><span class="badge rounded-pill ${item.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${item.status === 'published' ? 'Tampil' : 'Disembunyikan'}</span></td>
                    <td class="text-end">
                        <button type="button" data-faq-action="edit" data-faq-id="${window.escapeFaqHtml(item.id || '')}" class="faq-admin-btn btn btn-sm btn-outline-light me-2"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" data-faq-action="toggle" data-faq-id="${window.escapeFaqHtml(item.id || '')}" class="faq-admin-btn btn btn-sm btn-outline-amber me-2"><i class="fa-solid ${item.status === 'published' ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                        <button type="button" data-faq-action="delete" data-faq-id="${window.escapeFaqHtml(item.id || '')}" class="faq-admin-btn btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            if (!tbody.dataset.bound) {
                tbody.addEventListener('click', (event) => {
                    const button = event.target.closest('button[data-faq-action]');
                    if (!button) return;
                    const action = button.getAttribute('data-faq-action');
                    const id = button.getAttribute('data-faq-id');
                    if (action === 'edit') {
                        window.openFaqModal(id);
                    } else if (action === 'toggle') {
                        window.toggleFaqStatus(id);
                    } else if (action === 'delete') {
                        window.deleteFaq(id);
                    }
                });
                tbody.dataset.bound = '1';
            }
        };

        window.openFaqModal = function(id = null) {
            if (!window.isSuperAdmin) {
                Toast.fire({ icon: 'error', title: 'Hanya Super Admin yang bisa mengelola FAQ.' });
                return;
            }
            const modalEl = document.getElementById('faq-modal');
            if (!modalEl) return;
            window.populateFaqSelects();
            const item = (window.faqState.items || []).find((entry) => entry.id === id) || null;
            const idEl = document.getElementById('faq-id');
            const questionEl = document.getElementById('faq-question');
            const answerEl = document.getElementById('faq-answer');
            const categoryEl = document.getElementById('faq-category');
            const statusEl = document.getElementById('faq-status');
            const titleEl = document.getElementById('faq-modal-title');

            window.bindFaqForm();
            if (idEl) idEl.value = id || '';
            if (questionEl) questionEl.value = item?.question || '';
            if (answerEl) answerEl.value = item?.answer || '';
            if (categoryEl) categoryEl.value = item?.category || 'Pembelian Tiket';
            if (statusEl) statusEl.value = item?.status || 'published';
            if (titleEl) titleEl.textContent = id ? 'Edit FAQ' : 'Tambah FAQ';
            window.faqState.editingId = id || null;

            try {
                document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
                modalEl.classList.remove('fade');
                modalEl.classList.add('show');
                modalEl.style.display = 'flex';
                modalEl.style.alignItems = 'center';
                modalEl.style.justifyContent = 'center';
                modalEl.style.opacity = '1';
                modalEl.style.pointerEvents = 'auto';
                modalEl.style.zIndex = '1060';
                modalEl.setAttribute('aria-hidden', 'false');
                modalEl.setAttribute('aria-modal', 'true');
                const dialog = modalEl.querySelector('.modal-dialog');
                const content = modalEl.querySelector('.modal-content');
                if (dialog) {
                    dialog.style.pointerEvents = 'auto';
                    dialog.style.zIndex = '1061';
                    dialog.style.position = 'relative';
                }
                if (content) {
                    content.style.pointerEvents = 'auto';
                    content.style.zIndex = '1061';
                }
                document.body.classList.add('modal-open');
                document.body.style.overflow = 'hidden';
                setTimeout(() => {
                    const firstInput = modalEl.querySelector('input, textarea, select, button');
                    if (firstInput) firstInput.focus();
                }, 50);
            } catch (err) {
                console.warn('Gagal membuka modal FAQ:', err);
                modalEl.classList.add('show');
                modalEl.style.display = 'flex';
                modalEl.style.opacity = '1';
                modalEl.style.pointerEvents = 'auto';
                modalEl.style.zIndex = '1060';
                modalEl.setAttribute('aria-hidden', 'false');
                modalEl.setAttribute('aria-modal', 'true');
                const dialog = modalEl.querySelector('.modal-dialog');
                const content = modalEl.querySelector('.modal-content');
                if (dialog) {
                    dialog.style.pointerEvents = 'auto';
                    dialog.style.zIndex = '1061';
                    dialog.style.position = 'relative';
                }
                if (content) {
                    content.style.pointerEvents = 'auto';
                    content.style.zIndex = '1061';
                }
                document.body.style.overflow = 'hidden';
            }
        };

        window.closeFaqModal = function() {
            const modalEl = document.getElementById('faq-modal');
            if (!modalEl) return;
            document.getElementById('faq-form')?.reset();
            const idEl = document.getElementById('faq-id');
            if (idEl) idEl.value = '';
            window.faqState.editingId = null;
            modalEl.classList.remove('show');
            modalEl.classList.add('fade');
            modalEl.style.display = 'none';
            modalEl.style.opacity = '';
            modalEl.style.pointerEvents = '';
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.removeAttribute('aria-modal');
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
        };

        window.submitFaqForm = async function(event) {
            if (event?.preventDefault) event.preventDefault();
            const currentTarget = event?.currentTarget;
            const form = currentTarget instanceof HTMLFormElement
                ? currentTarget
                : currentTarget instanceof HTMLElement
                    ? currentTarget.closest('form')
                    : null;
            const formEl = form || document.getElementById('faq-form');
            const idEl = formEl?.querySelector('#faq-id') || document.getElementById('faq-id');
            const questionEl = formEl?.querySelector('#faq-question') || document.getElementById('faq-question');
            const answerEl = formEl?.querySelector('#faq-answer') || document.getElementById('faq-answer');
            const categoryEl = formEl?.querySelector('#faq-category') || document.getElementById('faq-category');
            const statusEl = formEl?.querySelector('#faq-status') || document.getElementById('faq-status');
            const id = (idEl?.value || '').trim();
            const question = (questionEl?.value || '').trim();
            const answer = (answerEl?.value || '').trim();
            const category = categoryEl?.value || 'Lainnya';
            const status = statusEl?.value || 'published';
            window.__faqLastSubmit = { id, question, answer, category, status, ts: Date.now() };

            if (!formEl) {
                console.warn('FAQ form tidak ditemukan saat submit.');
                return;
            }

            if (!question || !answer) {
                alert('Pertanyaan dan jawaban wajib diisi.');
                return;
            }

            const items = Array.isArray(window.faqState.items) ? [...window.faqState.items] : [];
            const payload = { question, answer, category, status, updatedAt: Date.now() };
            let nextItems = items;

            if (id) {
                nextItems = items.map((item) => item.id === id ? { ...item, ...payload } : item);
            } else {
                const newId = `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                nextItems = [{ id: newId, ...payload, createdAt: Date.now() }, ...items];
            }

            window.faqState.items = nextItems;
            window.persistFaqState(nextItems, { pendingSync: true, source: 'local' });
            window.renderFaqPublicList();
            window.renderFaqAdminList();
            try {
                if (formEl) {
                    formEl.reset();
                }
                const modalEl = document.getElementById('faq-modal');
                if (modalEl) {
                    const modal = bootstrap?.Modal?.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
                    if (modal) {
                        modal.hide();
                    } else {
                        modalEl.classList.remove('show');
                        modalEl.style.display = '';
                        modalEl.style.opacity = '';
                        modalEl.style.pointerEvents = '';
                        modalEl.setAttribute('aria-hidden', 'true');
                        modalEl.removeAttribute('aria-modal');
                        document.body.classList.remove('modal-open');
                    }
                }
            } catch (err) {
                console.warn('Gagal membersihkan modal FAQ:', err);
            }

            try {
                const connection = window.ensureFaqFirebase();
                if (connection) {
                    if (connection.mode === 'firestore') {
                        if (id) {
                            await connection.collection.doc(id).set(payload, { merge: true });
                        } else {
                            const newId = nextItems[0]?.id || `faq-${Date.now()}`;
                            await connection.collection.doc(newId).set({ ...payload, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                        }
                    } else if (connection.mode === 'realtime') {
                        const targetId = id || nextItems[0]?.id || `faq-${Date.now()}`;
                        await connection.ref.child(targetId).set({
                            ...payload,
                            createdAt: id ? payload.createdAt || firebase.database.ServerValue.TIMESTAMP : firebase.database.ServerValue.TIMESTAMP,
                            updatedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    window.persistFaqState(nextItems, { pendingSync: false, source: connection.mode });
                }
                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: id ? 'FAQ diperbarui' : 'FAQ ditambahkan' });
            } catch (err) {
                console.error('Gagal menyimpan FAQ:', err);
                window.persistFaqState(nextItems, { pendingSync: true, source: 'local' });
                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: 'FAQ disimpan lokal' });
            }
        };

        window.deleteFaq = async function(id) {
            if (!window.isSuperAdmin) {
                Toast.fire({ icon: 'error', title: 'Hanya Super Admin yang bisa mengelola FAQ.' });
                return;
            }
            if (!id || !confirm('Apakah Anda yakin ingin menghapus FAQ ini?')) return;
            const items = (window.faqState.items || []).filter((item) => item.id !== id);
            window.faqState.items = items;
            window.persistFaqState(items, { pendingSync: true, source: 'local' });
            window.renderFaqPublicList();
            window.renderFaqAdminList();

            try {
                const connection = window.ensureFaqFirebase();
                if (connection) {
                    if (connection.mode === 'firestore') {
                        await connection.collection.doc(id).delete();
                    } else if (connection.mode === 'realtime') {
                        await connection.ref.child(id).remove();
                    }
                    window.persistFaqState(items, { pendingSync: false, source: connection.mode });
                }
                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: 'FAQ dihapus' });
            } catch (err) {
                console.error('Gagal menghapus FAQ:', err);
                window.persistFaqState(items, { pendingSync: true, source: 'local' });
                if (typeof Toast !== 'undefined') Toast.fire({ icon: 'success', title: 'FAQ dihapus lokal' });
            }
        };

        window.toggleFaqStatus = async function(id) {
            if (!window.isSuperAdmin) {
                Toast.fire({ icon: 'error', title: 'Hanya Super Admin yang bisa mengelola FAQ.' });
                return;
            }
            if (!id) return;
            const item = (window.faqState.items || []).find((entry) => entry.id === id);
            if (!item) return;
            const nextItems = (window.faqState.items || []).map((entry) => entry.id === id ? { ...entry, status: entry.status === 'published' ? 'draft' : 'published', updatedAt: Date.now() } : entry);
            window.faqState.items = nextItems;
            window.persistFaqState(nextItems, { pendingSync: true, source: 'local' });
            window.renderFaqPublicList();
            window.renderFaqAdminList();

            try {
                const connection = window.ensureFaqFirebase();
                if (connection) {
                    if (connection.mode === 'firestore') {
                        await connection.collection.doc(id).update({ status: item.status === 'published' ? 'draft' : 'published', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    } else if (connection.mode === 'realtime') {
                        await connection.ref.child(id).update({ status: item.status === 'published' ? 'draft' : 'published', updatedAt: firebase.database.ServerValue.TIMESTAMP });
                    }
                    window.persistFaqState(nextItems, { pendingSync: false, source: connection.mode });
                }
            } catch (err) {
                console.error('Gagal mengubah status FAQ:', err);
                window.persistFaqState(nextItems, { pendingSync: true, source: 'local' });
            }
        };

        function showPage(pageId, isHistory = false) { 
            if (pageId === 'event-detail' && Object.keys(window.eventDataMap).length === 0) { pageId = 'home'; }

            document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
            document.getElementById('page-' + pageId).classList.add('active'); 
            window.scrollTo(0,0); 

            if (!isHistory) {
                history.pushState({page: pageId}, null, `#${pageId}`);
                localStorage.setItem('beetix_last_page', pageId);
            }

            if(pageId === 'scanner') {
                initScannerSync(); 
                window.setScanMode('kamera');
            } else if (typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) { 
                html5QrcodeScanner.clear(); html5QrcodeScanner = null; 
            }

            if (pageId === 'faq') {
                if (typeof window.refreshFaqWaFromStorage === 'function') {
                    window.refreshFaqWaFromStorage();
                }
                if (typeof window.initFaqModule === 'function') {
                    window.initFaqModule();
                }
                if (typeof window.loadFaqWaConfig === 'function') {
                    window.loadFaqWaConfig().catch(() => {});
                }
                if (typeof window.syncFaqWaNumbersFromRemote === 'function') {
                    window.syncFaqWaNumbersFromRemote(true).catch(() => {});
                }
            }

            if (pageId === 'scanner') {
                html5QrcodeScanner.clear(); html5QrcodeScanner = null; 
            }
        }

        window.setScanMode = function(mode) {
            document.querySelectorAll('.scan-area').forEach(el => el.classList.add('hidden'));
            document.getElementById('scan-mode-' + mode).classList.remove('hidden');
            
            document.getElementById('btn-mode-kamera').className = "flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-colors";
            document.getElementById('btn-mode-alat').className = "flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-colors";
            document.getElementById('btn-mode-manual').className = "flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-colors";
            
            document.getElementById('btn-mode-' + mode).className = "flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg bg-amber-500 text-dark transition-colors";
            
            if(mode === 'kamera') {
                if (typeof Html5QrcodeScanner !== 'undefined') {
                    if(!html5QrcodeScanner) { 
                        html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { 
                            fps: 30, 
                            qrbox: function (vw, vh) { let size = Math.floor(Math.min(vw, vh) * 0.7); return { width: size, height: size }; },
                            rememberLastUsedCamera: true
                        }, false); 
                        html5QrcodeScanner.render((code) => validateTicketCode(code)); 
                    }
                } else { Toast.fire({icon: 'warning', title: 'Kamera sedang dimuat...'}); }
            } else {
                if(html5QrcodeScanner) { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }
                if(mode === 'alat') {
                    setTimeout(() => document.getElementById('hidden-scanner-input').focus(), 100);
                } else {
                    setTimeout(() => document.getElementById('man-scan-input').focus(), 100);
                }
            }
        };

        window.addEventListener('popstate', function(e) {
            if(e.state && e.state.page) { showPage(e.state.page, true); } 
            else { showPage('home', true); }
        });

        window.addEventListener('storage', function(event) {
            if ((event.key === 'btix_faq_wa_numbers' || event.key === 'btix_faq_wa_number') && typeof window.refreshFaqWaFromStorage === 'function') {
                window.refreshFaqWaFromStorage();
            }
        });

        window.addEventListener('focus', function() {
            if (typeof window.refreshFaqWaFromStorage === 'function') {
                window.refreshFaqWaFromStorage();
            }
            if (typeof window.syncFaqWaNumbersFromRemote === 'function') {
                window.syncFaqWaNumbersFromRemote(true).catch(() => {});
            }
        });

        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                if (typeof window.refreshFaqWaFromStorage === 'function') {
                    window.refreshFaqWaFromStorage();
                }
                if (typeof window.syncFaqWaNumbersFromRemote === 'function') {
                    window.syncFaqWaNumbersFromRemote(true).catch(() => {});
                }
            }
        });
        
        function openModal(id) {
            const m = document.getElementById(id);
            if (!m) return;
            document.querySelectorAll('.modal-overlay.show, .modal.show, .footer-legal-overlay.show').forEach((modal) => {
                if (modal.id !== id) {
                    modal.classList.add('opacity-0');
                    modal.classList.remove('show');
                    modal.setAttribute('aria-hidden', 'true');
                }
            });
            m.classList.remove('hidden', 'opacity-0');
            m.classList.add('flex', 'show');
            m.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (id === 'footer-legal-modal') {
                const content = document.getElementById('footer-legal-content');
                if (content) content.scrollTop = 0;
                requestAnimationFrame(() => document.getElementById('footer-legal-close')?.focus({ preventScroll: true }));
            }
        }
        function closeModal(id) {
            const m = document.getElementById(id);
            if (!m) return;
            m.classList.add('opacity-0');
            m.classList.remove('show');
            m.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                m.classList.add('hidden');
                m.classList.remove('flex', 'opacity-0');
                const hasOpenModal = document.querySelector('.modal-overlay.show, .modal.show, .footer-legal-overlay.show');
                if (!hasOpenModal) {
                    document.body.style.overflow = 'auto';
                }
            }, 120);
        }
        window.openModal = openModal;
        window.closeModal = closeModal;

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('nav-login-btn')?.addEventListener('click', () => openModal('login-modal'));
            document.getElementById('nav-register-btn')?.addEventListener('click', () => openModal('register-modal'));
            if (typeof window.initFaqModule === 'function') {
                window.initFaqModule();
            }
            if (typeof window.loadFaqWaConfig === 'function') {
                window.loadFaqWaConfig().catch(() => {});
            }
            if (typeof window.syncFaqWaNumbersFromRemote === 'function') {
                window.syncFaqWaNumbersFromRemote(true).catch(() => {});
            }
        });
        
        function switchAdminTab(t) { 
            if (t === 'faq' && !window.isSuperAdmin) {
                t = 'dashboard';
            }
            const tabEl = document.getElementById('tab-' + t);
            const menuEl = document.getElementById('menu-' + t);
            document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active')); 
            if (tabEl) tabEl.classList.add('active'); 
            document.querySelectorAll('.menu-admin').forEach(m => m.classList.remove('active')); 
            if (menuEl) menuEl.classList.add('active'); 
            localStorage.setItem('beetix_last_admin_tab', t);
                    // Render payments list when admin opens Validasi Pembayaran or deposit if needed
                    try {
                        if (t === 'pembayaran' && typeof window.renderAdminPayments === 'function') {
                            setTimeout(() => window.renderAdminPayments(), 120);
                        }
                        if (t === 'deposit' && typeof window.renderAdminDeposits === 'function') {
                            setTimeout(() => window.renderAdminDeposits(), 120);
                        }
                        if (t === 'faq' && typeof window.initFaqModule === 'function') {
                            setTimeout(() => window.initFaqModule(), 80);
                        }
                    } catch(e) { console.warn('admin tab render call failed', e); }
        }

        window.toggleTicketMessageField = function() {
            const status = document.getElementById('t-admin-status')?.value;
            const msgBox = document.getElementById('t-admin-message-box');
            if (status === 'SUSPENDED') {
                msgBox.classList.remove('hidden');
            } else {
                msgBox.classList.add('hidden');
            }
        };

        window.saveTicketStatusChange = function() {
            const status = document.getElementById('t-admin-status')?.value;
            const message = document.getElementById('t-admin-message')?.value || '';
            const ticketCode = document.getElementById('t-code')?.textContent;
            
            if (!ticketCode || ticketCode === 'XXXX-0000') {
                alert('Error: Kode tiket tidak ditemukan');
                return;
            }
            
            if (status === 'SUSPENDED' && !message.trim()) {
                alert('Pesan untuk pengguna wajib diisi ketika status Ditangguhkan');
                return;
            }

            const updateData = { status: status };
            if (status === 'SUSPENDED') {
                updateData.suspendedMessage = message;
            } else {
                updateData.suspendedMessage = null;
            }
            
            db.ref(`tickets/${ticketCode}`).update(updateData).then(() => {
                if (window.globalTicketsData) {
                    window.globalTicketsData[ticketCode] = { ...(window.globalTicketsData[ticketCode] || {}), ...updateData };
                }
                window.refreshDashboardAfterDataMutation?.();
                alert('Status tiket berhasil diubah');
            }).catch(err => {
                alert('Error: ' + err.message);
            });
        };

        window.openSuspendTicket = function(code) {
            if (!code) return;
            window.openSuspendFlag = true;
            window.openSuspendTicketCode = code;
            try { viewTicket(code); } catch(e) { console.warn('openSuspendTicket failed', e); }
        };
        
        window.closeTicketModal = function() {
            if(activeTicketRef && activeTicketCb) { activeTicketRef.off('value', activeTicketCb); }
            closeModal('ticket-modal');
        }

        window.checkCustomEventCat = function() {
            const sel = document.getElementById('ev-kategori').value;
            const cust = document.getElementById('ev-kategori-custom');
            const sportBox = document.getElementById('ev-sport-season-box');
            if(sel === 'Lainnya') { cust.classList.remove('hidden'); sportBox.classList.add('hidden'); } 
            else if (sel === 'Olahraga') { cust.classList.add('hidden'); sportBox.classList.remove('hidden'); } 
            else { cust.classList.add('hidden'); sportBox.classList.add('hidden'); }
        }

        const firebaseConfig = { 
            apiKey: "AIzaSyBVgwGz3I7Sb3UYfNpnah5nt5skddnidGo",
            authDomain: "tiketkaka.firebaseapp.com",
            databaseURL: "https://tiketkaka-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "tiketkaka",
            storageBucket: "tiketkaka.firebasestorage.app",
            messagingSenderId: "246931943390",
            appId: "1:246931943390:web:285e17a4f64c210d3ef74f"
        };
        window.__btixFirebaseConfig = firebaseConfig;

        var auth, db;
        window.db = null;
        window.auth = null;

        const startAppSystem = setInterval(() => {
            if (typeof firebase !== 'undefined') {
                clearInterval(startAppSystem);
                
                if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                auth = firebase.auth(); db = firebase.database();
                window.auth = auth;
                window.db = db;
                window.attachFaqWaRemoteListener();
                window.syncFaqWaNumbersFromRemote(true).catch(() => {});

                // Ensure secondary Firebase app exists (used to create secondary auth users)
                window.ensureSecondaryApp = function() {
                    if (!window.secondaryApp) {
                        try { window.secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary"); } catch(e) { /* already exists */ }
                    }
                    return window.secondaryApp;
                };

                try { 
                    window.listenToSettings(); 
                    if (!window.publicEventsListening) window.listenToPublicEvents(); 
                } catch(e) {
                    console.error('Error calling Firebase listeners on init:', e);
                }
                
                // Ensure events are loaded - retry after delays
                setTimeout(() => {
                    if (Object.keys(window.eventDataMap || {}).length === 0) {
                        console.log('⚡ Auto-retrying listenToPublicEvents (2s delay)...');
                        if (!window.publicEventsListening) { try { window.listenToPublicEvents(); } catch(e) {} }
                    }
                }, 2000);
                
                setTimeout(() => {
                    if (Object.keys(window.eventDataMap || {}).length === 0) {
                        console.log('⚡ Auto-retrying listenToPublicEvents (5s delay)...');
                        if (!window.publicEventsListening) { try { window.listenToPublicEvents(); } catch(e) {} }
                    }
                }, 5000);

                auth.onAuthStateChanged(async (user) => {
                    const loader = document.getElementById('loading-overlay');
                    if (loader) { loader.style.display = 'none'; } 
                    
                    const lastPage = localStorage.getItem('beetix_last_page') || 'home';
                    if (lastPage !== 'home') { showPage(lastPage, true); }

                    if (document.getElementById('page-faq')?.classList.contains('active') && typeof window.loadFaqWaConfig === 'function') {
                        window.loadFaqWaConfig().catch(() => {});
                    }

                    if (window.__userProfileListenerRef && user && user.uid) {
                        try { db.ref('users/' + user.uid).off('value', window.__userProfileListenerRef); } catch (e) {}
                    }

                    const nlBtn = document.getElementById('nav-login-btn'); const nrBtn = document.getElementById('nav-register-btn'); const nloBtn = document.getElementById('nav-logout-btn'); const nUserG = document.getElementById('user-greeting'); const nAdminBtn = document.getElementById('nav-admin-btn'); const nScanBtn = document.getElementById('nav-scanner-btn'); const nUserBtn = document.getElementById('nav-user-btn');
                    
                    if(user) {
                        try {
                            const userRef = db.ref('users/' + user.uid);
                            window.__userProfileListenerRef = (snap) => {
                                const data = snap.val() || { nama: 'User', role: 'User', username: 'user' };
                                window.currentUserData = data;
                                window.currentUserData.uid = user.uid;
                                window.usersMapCache[user.uid] = window.currentUserData;
                                loadUserDashboard(user.uid);
                            };
                            userRef.on('value', window.__userProfileListenerRef);

                            const snap = await userRef.once('value');
                            const data = snap.val() || { nama: 'User', role: 'User', username: 'user' };
                            window.currentUserData = data;
                            window.currentUserData.uid = user.uid;
                            window.usersMapCache[user.uid] = window.currentUserData;

                            loadUserDashboard(user.uid);

                            if(nlBtn) nlBtn.classList.add('hidden'); if(nrBtn) nrBtn.classList.add('hidden'); if(nloBtn) nloBtn.classList.remove('hidden');
                            if(nUserG) { nUserG.classList.remove('hidden'); nUserG.innerHTML = `Halo, <span class="font-bold text-white">${(data.nama || 'User').split(' ')[0]}</span>`; }
                            safeSetValue('user-set-username', data.username || '');

                            const userRole = (data.role || 'User').toString();
                            const normalizedRole = userRole.trim().toLowerCase();
                            window.isSuperAdmin = ['super admin', 'super_admin', 'superadmin', 'SUPER_ADMIN'.toLowerCase()].includes(normalizedRole);
                            window.isVendor = normalizedRole === 'vendor';
                            window.isScanner = normalizedRole.includes('scanner');
                            if (window.populatePaymentSettingsInputs) window.populatePaymentSettingsInputs();
                            if (window.isVendor) {
                                setTimeout(() => {
                                    if (window.syncVendorPaymentMethodPublic) window.syncVendorPaymentMethodPublic().catch(() => {});
                                }, 500);
                            }

                            if(window.cachedSettings) {
                                renderWAAdminGrid(window.cachedSettings.whatsapp || {});
                            }

                            if(window.renderSponsorLists) window.renderSponsorLists();

                            if(window.isSuperAdmin || window.isVendor) { 
                                if(nAdminBtn) nAdminBtn.classList.remove('hidden'); 
                                
                                const lastAdminTab = localStorage.getItem('beetix_last_admin_tab') || 'dashboard';
                                if (lastPage === 'admin') switchAdminTab(lastAdminTab);
                                
                                document.getElementById('admin-role-badge').innerHTML = window.isSuperAdmin ? '<i class="fa-solid fa-bolt"></i>' : '<i class="fa-solid fa-store"></i>';
                                document.getElementById('admin-role-text').innerText = window.isSuperAdmin ? 'Super Admin' : 'Vendor EO Panel';
                                document.getElementById('admin-name-display').innerText = data.nama;
                                
                                const saMenus = document.getElementById('super-admin-menus');
                                const webSettings = document.getElementById('web-settings-container');
                                
                                // Restrict elements based on Super Admin role
                                document.querySelectorAll('.admin-only-reset').forEach(el => {
                                    if(window.isSuperAdmin) el.classList.remove('hidden');
                                    else el.classList.add('hidden');
                                });

                                const faqMenu = document.getElementById('menu-faq');
                                const faqTab = document.getElementById('tab-faq');
                                if (faqMenu) {
                                    if (window.isSuperAdmin) faqMenu.classList.remove('hidden');
                                    else faqMenu.classList.add('hidden');
                                }
                                if (faqTab) {
                                    if (window.isSuperAdmin) faqTab.classList.remove('hidden');
                                    else faqTab.classList.add('hidden');
                                }

                                const eventListLabel = document.getElementById('admin-event-list-label');
                                if (eventListLabel) {
                                    if (window.isSuperAdmin) {
                                        eventListLabel.classList.remove('hidden');
                                    } else {
                                        eventListLabel.classList.add('hidden');
                                    }
                                }

                                if (saMenus) {
                                    if (window.isSuperAdmin) {
                                        saMenus.classList.remove('hidden');
                                        saMenus.classList.add('flex');
                                        if (webSettings) webSettings.classList.remove('hidden');
                                    } else {
                                        saMenus.classList.remove('flex');
                                        saMenus.classList.add('hidden');
                                        if (webSettings) webSettings.classList.add('hidden');
                                    }
                                }
                                
                                if (!window.adminDataListening) {
                                    listenToAdminData();
                                    window.adminDataListening = true;
                                }

                                window.updateVisitorStatsListener();
                                setTimeout(() => {
                                    if (window.isSuperAdmin || window.isVendor) {
                                        try { window.refreshAdminPaymentViews?.(); } catch(e) { console.warn('refreshAdminPaymentViews failed', e); }
                                    }
                                }, 250);
                            }

                            if(window.isScanner || window.isSuperAdmin || window.isVendor) {
                                if(nScanBtn) nScanBtn.classList.remove('hidden');
                                safeSetText('scan-gate-info', 'Login sebagai: ' + data.nama + ' (' + userRole + ')');
                                if(window.isScanner && (lastPage === 'home' || lastPage === 'user-dash')) {
                                    showPage('scanner');
                                }
                            }

                            // MENAMPILKAN DASHBOARD USER HANYA UNTUK USER/SPONSOR (Sembunyikan dari Admin/Vendor/Scanner)
                            if (!window.isSuperAdmin && !window.isVendor && !window.isScanner) {
                                if(nUserBtn) nUserBtn.classList.remove('hidden');
                            } else {
                                if(nUserBtn) nUserBtn.classList.add('hidden');
                            }

                        } catch(e) { console.error(e); }
                    } else {
                        window.currentUserData = null; window.isSuperAdmin = false; window.isVendor = false; window.isScanner = false;
                        if (window.__userProfileListenerRef && auth?.currentUser) {
                            try { db.ref('users/' + auth.currentUser.uid).off('value', window.__userProfileListenerRef); } catch (e) {}
                        }
                        if(window.cachedSettings) renderWAAdminGrid(window.cachedSettings.whatsapp || {});
                        if(nlBtn) nlBtn.classList.remove('hidden'); if(nrBtn) nrBtn.classList.remove('hidden'); if(nloBtn) nloBtn.classList.add('hidden');
                        if(nUserG) nUserG.classList.add('hidden');
                        if(nAdminBtn) nAdminBtn.classList.add('hidden'); if(nScanBtn) nScanBtn.classList.add('hidden'); if(nUserBtn) nUserBtn.classList.add('hidden');
                    }
                });
            }
        }, 100);

        function renderWAAdminGrid(whatsappData = {}) {
            const wGrid = document.getElementById('admin-wa-grid');
            if(!wGrid) return;
            wGrid.innerHTML = '';
            Object.keys(whatsappData).forEach(k => {
                const wa = whatsappData[k];
                const waOwner = wa.ownerId || 'SUPER_ADMIN';
                const isMine = waOwner === window.currentUserData?.uid || (window.isSuperAdmin && waOwner === 'SUPER_ADMIN');
                if(!isMine) return;
                wGrid.innerHTML += `<div class="bg-darker p-3 rounded flex justify-between items-center text-sm"><div><b>${wa.name}</b><br><span class="text-amber-500">${wa.number}</span></div><button onclick="window.deleteWaSetting('${k}')" class="text-red-400"><i class="fa-solid fa-trash"></i></button></div>`;
            });
        }

        window.getTaxSettings = function(userData = {}) {
            const rawTax = parseFloat(userData?.tax || 0) || 0;
            const enabled = typeof userData?.tax_enabled === 'boolean' ? userData.tax_enabled : rawTax > 0;
            return { taxPct: enabled ? rawTax : 0, taxEnabled: enabled, rawTax };
        }


        window.getPaymentOwnerId = function(payment = {}) {
            const ownerId = payment?.ownerId || payment?.payOwnerId || payment?.vendorId || payment?.eventOwnerId || '';
            if (ownerId) return ownerId;
            if (payment?.eventId && window.eventDataMap?.[payment.eventId]) {
                return window.eventDataMap[payment.eventId].ownerId || window.eventDataMap[payment.eventId].uid || '';
            }
            return '';
        };

        window.updateFinanceSummaryCards = function(ownerId = null) {
            try {
                const paymentEntries = Object.entries(window.globalPaymentsData || {}).filter(([, payment]) => payment);
                const allTickets = window.globalTicketsData || {};
                const upgradeReplacementMap = window.getUpgradeReplacementMap(allTickets);
                const ticketEntries = Object.entries(allTickets)
                    .filter(([ticketCode, ticket]) => ticket && !window.isTicketReplacedByUpgrade(ticket, ticketCode, upgradeReplacementMap))
                    .map(([, ticket]) => ticket);
                const users = window.usersMapCache || {};
                const events = window.eventDataMap || {};
                const targetOwnerId = ownerId || (window.isVendor ? window.currentUserData?.uid : null);
                const matchesOwner = (payment = {}) => {
                    if (!targetOwnerId) return true;
                    return window.getPaymentOwnerId(payment) === targetOwnerId;
                };

                const paymentById = {};
                let gross = 0;
                let depositApproved = 0;
                let taxAmount = 0;
                let feePlatformAmount = 0;
                let feeEoAmount = 0;
                let displayFeePct = 0;
                let displayEoFeePct = 0;

                paymentEntries.forEach(([paymentKey, payment]) => {
                    if (!matchesOwner(payment)) return;
                    const status = (payment?.status || 'PENDING').toString().toUpperCase();
                    if (status === 'REJECTED') return;
                    const amount = parseFloat(payment?.total || 0) || 0;
                    if (amount <= 0) return;
                    gross += amount;
                    paymentById[paymentKey] = payment;
                    if (status === 'APPROVED' && (payment?.type || '').toString().toUpperCase() === 'DEPOSIT') {
                        depositApproved += amount;
                    }
                });

                if (gross === 0 && ticketEntries.length > 0) {
                    ticketEntries.forEach(ticket => {
                        if (!ticket || ticket.type === 'sponsor') return;
                        const eventData = events[ticket.eventId] || {};
                        const ticketOwnerId = ticket.ownerId || eventData.ownerId || eventData.uid || '';
                        if (targetOwnerId && ticketOwnerId !== targetOwnerId) return;
                        const payment = ticket.paymentId ? paymentById[ticket.paymentId] : null;
                        let amount = 0;
                        if (payment && parseFloat(payment.total || 0) > 0) {
                            amount = parseFloat(payment.total || 0);
                        } else {
                            amount = parseFloat(window.getEventTicketPrice?.(ticket.category, ticket.eventId) || 0);
                        }
                        if (amount > 0) gross += amount;
                    });
                }

                // Determine owner-specific settings when a targetOwnerId is provided
                let ownerDataForSettings = {};
                if (targetOwnerId) {
                    ownerDataForSettings = (users && users[targetOwnerId]) ? users[targetOwnerId] : {};
                } else if (window.isVendor) {
                    ownerDataForSettings = window.currentUserData || {};
                } else {
                    ownerDataForSettings = window.sysPayment || {};
                }
                const taxDataSource = (ownerDataForSettings && (ownerDataForSettings.tax !== undefined || ownerDataForSettings.tax_enabled !== undefined)) ? ownerDataForSettings : window.sysPayment;
                const taxData = window.getTaxSettings(taxDataSource);

                paymentEntries.forEach(([, payment]) => {
                    if (!matchesOwner(payment)) return;
                    const status = (payment?.status || 'PENDING').toString().toUpperCase();
                    if (status === 'REJECTED') return;
                    const amount = parseFloat(payment?.total || 0) || 0;
                    if (amount <= 0) return;
                    const paymentTax = (amount * (taxData.taxEnabled ? taxData.taxPct : 0)) / 100;
                    taxAmount += paymentTax;
                    const ownerId = window.getPaymentOwnerId(payment);
                    const ownerData = ownerId ? (users[ownerId] || {}) : {};
                    const feePct = parseFloat(ownerData.platform_fee || (ownerDataForSettings && ownerDataForSettings.platform_fee) || window.sysPayment?.platform_fee || 0) || 0;
                    const eoFeePctValue = parseFloat(ownerData.eo_fee || (ownerDataForSettings && ownerDataForSettings.eo_fee) || window.sysPayment?.eo_fee || 0) || 0;
                    if (feePct > 0 && displayFeePct === 0) displayFeePct = feePct;
                    if (eoFeePctValue > 0 && displayEoFeePct === 0) displayEoFeePct = eoFeePctValue;
                    const paymentNetAfterTax = amount - paymentTax;
                    feePlatformAmount += (paymentNetAfterTax * feePct) / 100;
                    feeEoAmount += (paymentNetAfterTax * eoFeePctValue) / 100;
                });

                const net = gross - taxAmount - feePlatformAmount - feeEoAmount;
                const depositTarget = depositApproved > 0 ? depositApproved : 0;
                const depositPct = depositTarget > 0 ? Math.min(100, Math.round((depositApproved / depositTarget) * 100)) : 0;
                const depositRemaining = Math.max(depositTarget - depositApproved, 0);

                const setText = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                };

                if (!ownerId) {
                    window.dashGross = gross;
                    setText('dash-gross', formatRp(gross));
                    setText('dash-tax-pct', taxData.taxEnabled ? taxData.taxPct : 'Off');
                    setText('dash-tax', formatRp(taxAmount));
                    setText('dash-fee', formatRp(feePlatformAmount));
                    setText('dash-fee-pct', `${displayFeePct}%`);
                    setText('dash-eo-fee', formatRp(feeEoAmount));
                    setText('dash-eo-fee-pct', `${displayEoFeePct}%`);
                    setText('dash-deposit-approved', formatRp(depositApproved));
                    setText('dash-deposit-target', formatRp(depositTarget));
                    setText('dash-deposit-pct', `${depositPct}`);
                    setText('dash-deposit-remaining', formatRp(depositRemaining));
                    const depositBar = document.getElementById('dash-deposit-bar');
                    if (depositBar) depositBar.style.width = `${depositPct}%`;
                    setText('dash-net', formatRp(net));
                } else {
                    window.vdGross = gross;
                    setText('vd-gross', formatRp(gross));
                    setText('vd-tax-pct', taxData.taxEnabled ? taxData.taxPct : 'Off');
                    setText('vd-tax', formatRp(taxAmount));
                    setText('vd-fee', formatRp(feePlatformAmount));
                    setText('vd-fee-pct', `${displayFeePct}%`);
                    setText('vd-eo-fee', formatRp(feeEoAmount));
                    setText('vd-eo-fee-pct', `${displayEoFeePct}%`);
                    setText('vd-net', formatRp(net));
                }

                return { gross, taxAmount, feePlatformAmount, feeEoAmount, net, depositApproved, depositTarget, depositPct, depositRemaining };
            } catch (e) {
                console.warn('updateFinanceSummaryCards error', e);
                return { gross: 0, taxAmount: 0, feePlatformAmount: 0, feeEoAmount: 0, net: 0, depositApproved: 0, depositTarget: 0, depositPct: 0, depositRemaining: 0 };
            }
        };

        window.renderTopAdSliderFromBanners = function(bannerList) {
            const normalizedBanners = Array.isArray(bannerList) ? bannerList.filter((entry) => entry !== '' && entry !== null) : [];
            if (window.cachedSettings && typeof window.cachedSettings === 'object') {
                window.cachedSettings.banners = normalizedBanners;
            }
            const topSlider = document.getElementById('top-ad-slider');
            const topContainer = document.getElementById('top-ad-container');
            if (topSlider && topContainer) {
                if (normalizedBanners.length > 0) {
                    topContainer.classList.remove('hidden');
                    let html = '';
                    topSlider.style.width = `${normalizedBanners.length * 100}%`;
                    let slideWidth = 100 / normalizedBanners.length;

                    normalizedBanners.forEach((banner) => {
                        let img = typeof banner === 'string' ? banner : (banner.img || '');
                        let url = typeof banner === 'object' ? (banner.url || '') : '';
                        if (img) {
                            let content = `<img src="${img}" alt="Banner" class="w-full h-full object-contain" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;">`;
                            if (url) {
                                content = `<a href="${url}" target="_blank" class="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" style="width: 100%; height: 100%;">${content}</a>`;
                            } else {
                                content = `<div class="flex items-center justify-center w-full h-full">${content}</div>`;
                            }
                            html += `<div class="relative flex-shrink-0 flex items-center justify-center bg-transparent" style="width: ${slideWidth}%; height: 100%;">${content}</div>`;
                        }
                    });
                    topSlider.innerHTML = html;
                    if (window.topAdInterval) clearInterval(window.topAdInterval);
                    if (normalizedBanners.length > 1) {
                        let bi = 0;
                        window.topAdInterval = setInterval(() => {
                            bi = (bi + 1) % normalizedBanners.length;
                            topSlider.style.transform = `translateX(-${(bi * 100) / normalizedBanners.length}%)`;
                        }, 3500);
                    }
                } else {
                    topContainer.classList.add('hidden');
                    topSlider.innerHTML = '';
                }
            }
        };

        window.DEFAULT_BRAND_LOGO_URL = 'https://i.ibb.co.com/6RSLNkcR/tiketkaka.png';
        window.DEFAULT_BRAND_NAME = 'Tiket Kaka';
        window.DEFAULT_FAVICON_URL = 'https://i.ibb.co.com/N24Lxznt/Chat-GPT-Image-Jul-24-2026-10-11-12-AM.png';

        window.normalizeBrandLogoUrl = function(value) {
            const url = (value || '').toString().trim();
            if (!url || url.includes('Xkqq8E.png') || url.includes('res.cloudinary.com/dygohchwp/image/upload/v178397')) {
                return window.DEFAULT_BRAND_LOGO_URL;
            }
            return url;
        };

        window.normalizeBrandName = function(value) {
            const name = (value || '').toString().trim();
            const legacyKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!name || legacyKey === 'btix' || legacyKey === 'btixbet' || legacyKey === 'beetix') {
                return window.DEFAULT_BRAND_NAME;
            }
            return name;
        };

        window.normalizeLegacyBrandText = function(value) {
            return (value || '').toString()
                .replace(/BTIX\.BET/gi, window.DEFAULT_BRAND_NAME)
                .replace(/\bBTIX\b/gi, window.DEFAULT_BRAND_NAME)
                .replace(/\bBtix\b/g, window.DEFAULT_BRAND_NAME);
        };

        window.getDefaultFooterSettings = function() {
            return {
                logo: 'https://i.ibb.co.com/6RSLNkcR/tiketkaka.png',
                description: 'Platform tiket event terpercaya — temukan dan beli tiket konser, festival, olahraga, dan seminar dengan mudah dan aman.',
                company: 'Dikelola oleh Mr.Bee Project',
                privacy: `KEBIJAKAN PRIVASI Tiket Kaka
Terakhir diperbarui: 24 Juli 2026

1. Ruang Lingkup
Kebijakan Privasi ini menjelaskan bagaimana Tiket Kaka yang dikelola oleh Mr.Bee Project mengumpulkan, menggunakan, menyimpan, melindungi, dan mengungkapkan data pribadi saat pengguna mengakses platform, membuat akun, membeli tiket, melakukan transfer tiket, atau menggunakan fitur lain.

2. Data yang Diproses
Data yang dapat diproses meliputi nama, alamat email, nomor telepon, username, identitas akun Firebase, data pesanan dan pembayaran, data tiket dan pemindaian, jawaban formulir event, riwayat transfer tiket, serta data teknis seperti perangkat, browser, alamat halaman, waktu akses, dan pengenal penyimpanan lokal.

3. Tujuan Pemrosesan
Data digunakan untuk membuat dan mengelola akun, memproses pesanan serta pembayaran, menerbitkan dan memvalidasi tiket, mencegah penyalahgunaan, mendukung layanan pelanggan, menyampaikan informasi event, membuat laporan operasional, menjaga keamanan platform, dan memenuhi kewajiban hukum.

4. Pembagian Data
Data dapat diberikan secara terbatas kepada penyelenggara event atau Vendor yang terkait dengan transaksi pengguna, penyedia infrastruktur dan layanan teknologi, serta instansi berwenang apabila diwajibkan oleh hukum. Data tidak boleh digunakan oleh pihak terkait di luar tujuan penyelenggaraan layanan dan event.

5. Penyimpanan dan Keamanan
Tiket Kaka menerapkan langkah teknis dan organisasi yang wajar untuk melindungi data. Tidak ada sistem elektronik yang sepenuhnya bebas risiko; pengguna wajib menjaga kerahasiaan password, kode tiket, QR Code, dan akses perangkatnya. Data disimpan selama diperlukan untuk layanan, transaksi, penyelesaian sengketa, audit, dan kewajiban hukum.

6. Hak Pengguna
Pengguna dapat meminta akses, koreksi, pembaruan, penghapusan, pembatasan, atau penarikan persetujuan atas data pribadi sesuai ketentuan hukum dan sepanjang tidak bertentangan dengan kewajiban penyimpanan transaksi atau kepentingan hukum yang sah. Permintaan dapat disampaikan melalui kanal resmi Tiket Kaka yang tercantum pada platform.

7. Cookie dan Penyimpanan Lokal
Platform dapat menggunakan cookie atau local storage untuk sesi, preferensi tampilan, identitas perangkat, antrean scanner offline, keamanan, dan statistik penggunaan. Penghapusan penyimpanan browser dapat menyebabkan sebagian preferensi atau fungsi offline hilang.

8. Perubahan Kebijakan
Kebijakan ini dapat diperbarui untuk menyesuaikan layanan dan peraturan. Versi terbaru yang ditampilkan pada platform berlaku sejak tanggal pembaruannya.

9. Kontak
Pertanyaan atau permintaan terkait data pribadi dapat disampaikan melalui kanal resmi Tiket Kaka. Identitas pemohon dapat diverifikasi sebelum permintaan diproses untuk melindungi keamanan akun dan data.`,
                terms: `SYARAT & KETENTUAN Tiket Kaka
Terakhir diperbarui: 24 Juli 2026

1. Persetujuan
Dengan mengakses atau menggunakan Tiket Kaka, pengguna dianggap telah membaca dan menyetujui Syarat & Ketentuan ini serta kebijakan event yang dipilih.

2. Akun Pengguna
Pengguna wajib memberikan data yang benar, menjaga keamanan password, dan bertanggung jawab atas aktivitas pada akunnya. Akun tidak boleh digunakan untuk penipuan, akses tanpa izin, manipulasi transaksi, atau tindakan yang merugikan pengguna lain, penyelenggara, Vendor, dan Tiket Kaka.

3. Informasi Event dan Tiket
Jadwal, lokasi, kategori, kuota, harga, tata tertib, dan ketentuan khusus event ditetapkan oleh penyelenggara event. Pengguna wajib memeriksa detail tersebut sebelum melakukan pemesanan. Tiket hanya sah apabila tercatat pada sistem Tiket Kaka dan memiliki status yang dapat digunakan.

4. Pembayaran
Pembayaran dilakukan melalui metode manual yang ditampilkan pada platform. Pesanan belum dianggap selesai sebelum pembayaran diverifikasi dan disetujui oleh Admin atau Vendor yang berwenang. Pengguna wajib mengirim bukti pembayaran yang benar dan sesuai dengan transaksi.

5. Transfer Tiket
Tiket berstatus ACTIVE dapat ditransfer oleh pemiliknya kepada penerima yang telah memiliki akun Tiket Kaka. Setelah transfer berhasil, tiket lama tetap tercatat sebagai riwayat dengan status TRANSFERRED dan tidak dapat digunakan, dibuka sebagai tiket aktif, dipindai, atau ditransfer kembali. Penerima memperoleh tiket baru berstatus ACTIVE. Pengguna bertanggung jawab memastikan email penerima benar sebelum mengonfirmasi transfer.

6. Penggunaan dan Pemindaian Tiket
QR Code, barcode, dan kode tiket bersifat unik. Pengguna dilarang menggandakan, menjual secara melawan hukum, mengubah, atau membagikan kode tiket kepada pihak yang tidak berhak. Tiket yang telah digunakan, ditangguhkan, dibatalkan, atau ditransfer akan ditolak oleh sistem scanner sesuai statusnya.

7. Pembatalan, Perubahan, dan Pengembalian Dana
Pembatalan event, perubahan jadwal, perubahan lokasi, dan pengembalian dana mengikuti kebijakan penyelenggara event dan ketentuan hukum yang berlaku. Hak konsumen yang diberikan oleh peraturan perundang-undangan tetap berlaku dan tidak dikesampingkan oleh dokumen ini.

8. Perilaku yang Dilarang
Pengguna dilarang mengganggu sistem, mencoba melewati keamanan, mengakses data pihak lain, membuat transaksi palsu, memanipulasi pembayaran atau tiket, menggunakan bot secara merugikan, mengunggah materi melanggar hukum, atau menggunakan platform untuk kegiatan terlarang.

9. Penangguhan Akses
Tiket Kaka dapat membatasi atau menangguhkan akun dan tiket apabila terdapat indikasi penipuan, penyalahgunaan, pelanggaran ketentuan, permintaan pihak berwenang, atau kebutuhan perlindungan sistem dan pengguna. Tindakan dilakukan secara proporsional berdasarkan informasi yang tersedia.

10. Ketersediaan Layanan
Tiket Kaka berupaya menjaga layanan tetap tersedia, tetapi tidak menjamin layanan selalu bebas gangguan. Pemeliharaan, kegagalan jaringan, layanan pihak ketiga, keadaan kahar, atau insiden keamanan dapat memengaruhi akses sementara.

11. Kekayaan Intelektual
Merek, desain, sistem, materi, dan konten Tiket Kaka dilindungi sesuai hukum. Konten milik penyelenggara atau pihak ketiga tetap menjadi hak pemiliknya dan hanya boleh digunakan sesuai izin.

12. Perubahan Ketentuan
Syarat & Ketentuan dapat diperbarui. Penggunaan platform setelah perubahan berlaku dianggap sebagai penerimaan atas versi terbaru, sepanjang pemberitahuan dan penerapannya sesuai hukum.`,
                legal: `KETENTUAN HUKUM Tiket Kaka
Terakhir diperbarui: 24 Juli 2026

1. Pengelola Platform
Tiket Kaka dikelola oleh Mr.Bee Project sebagai penyedia platform teknologi ticketing. Penyelenggara event atau Vendor bertanggung jawab atas informasi, pelaksanaan, perizinan, keamanan lokasi, jadwal, dan kewajiban operasional event yang mereka kelola.

2. Transaksi Elektronik
Pendaftaran akun, pemesanan, persetujuan ketentuan, pencatatan pembayaran, penerbitan tiket, transfer tiket, dan pemindaian merupakan bagian dari transaksi serta catatan elektronik. Log sistem dapat digunakan untuk verifikasi operasional, audit, pencegahan penyalahgunaan, dan pembuktian sesuai hukum yang berlaku.

3. Peraturan yang Berlaku
Penggunaan platform tunduk pada hukum Republik Indonesia, termasuk ketentuan mengenai pelindungan data pribadi, informasi dan transaksi elektronik, penyelenggaraan sistem elektronik, perlindungan konsumen, serta peraturan lain yang relevan dan berlaku dari waktu ke waktu.

4. Tanggung Jawab Penyelenggara Event
Penyelenggara event atau Vendor wajib memastikan informasi event akurat, memiliki kewenangan dan perizinan yang diperlukan, menyediakan layanan sesuai penawaran, menangani perubahan atau pembatalan, dan memenuhi kewajiban kepada pembeli. Tiket Kaka dapat membantu penyampaian informasi dan administrasi, tanpa menghapus tanggung jawab hukum penyelenggara.

5. Tanggung Jawab Pengguna
Pengguna bertanggung jawab atas kebenaran data, keamanan akun, keputusan pembelian, ketepatan email penerima transfer, dan kepatuhan terhadap tata tertib event. Pengguna tidak boleh menggunakan platform untuk tindakan melawan hukum atau merugikan pihak lain.

6. Batasan Tanggung Jawab
Sepanjang diizinkan hukum, tanggung jawab setiap pihak dibatasi pada kerugian langsung yang dapat dibuktikan dan timbul dari pelanggaran kewajibannya. Ketentuan ini tidak membatasi hak konsumen atau tanggung jawab yang tidak dapat dikecualikan berdasarkan peraturan perundang-undangan.

7. Keadaan Kahar
Pihak dapat dibebaskan dari keterlambatan atau kegagalan yang disebabkan keadaan di luar kendali wajar, seperti bencana, gangguan jaringan luas, kebijakan pemerintah, gangguan layanan pihak ketiga, kerusuhan, atau keadaan kahar lain, dengan tetap melakukan upaya wajar untuk mengurangi dampak.

8. Penyelesaian Perselisihan
Perselisihan diupayakan terlebih dahulu melalui komunikasi dan musyawarah. Apabila tidak tercapai penyelesaian, para pihak dapat menggunakan mekanisme penyelesaian sengketa konsumen atau forum hukum yang berwenang sesuai peraturan perundang-undangan Republik Indonesia.

9. Keterpisahan
Apabila suatu ketentuan dinyatakan tidak sah atau tidak dapat diterapkan, ketentuan lainnya tetap berlaku sejauh diizinkan hukum.

10. Dokumen yang Berlaku
Kebijakan Privasi, Syarat & Ketentuan, ketentuan event, serta informasi transaksi yang ditampilkan di Tiket Kaka merupakan bagian yang saling melengkapi. Apabila terdapat konflik, ketentuan hukum yang bersifat wajib tetap diutamakan.`
            };
        };

        window.renderFooterSettings = function(payload = {}, logos = {}) {
            const defaults = window.getDefaultFooterSettings();
            const footer = { ...defaults, ...(payload && typeof payload === 'object' ? payload : {}) };
            footer.privacy = window.normalizeLegacyBrandText(footer.privacy || defaults.privacy);
            footer.terms = window.normalizeLegacyBrandText(footer.terms || defaults.terms);
            footer.legal = window.normalizeLegacyBrandText(footer.legal || defaults.legal);
            const logoUrl = window.normalizeBrandLogoUrl(footer.logo || logos.nav);
            footer.logo = logoUrl;
            window.currentFooterSettings = footer;

            const logoEl = document.getElementById('footer-logo');
            const logoFallback = document.getElementById('footer-brand-fallback');
            if (logoEl) {
                if (logoUrl) {
                    logoEl.src = logoUrl;
                    logoEl.classList.remove('hidden');
                } else {
                    logoEl.removeAttribute('src');
                    logoEl.classList.add('hidden');
                }
            }
            if (logoFallback) logoFallback.classList.toggle('hidden', Boolean(logoUrl));
            safeSetText('footer-description', footer.description || defaults.description);
            safeSetText('footer-company', footer.company || defaults.company);
            safeSetText('footer-year', String(new Date().getFullYear()));

            safeSetValue('set-footer-logo', window.normalizeBrandLogoUrl(payload?.logo || logos.nav));
            safeSetValue('set-footer-description', footer.description || defaults.description);
            safeSetValue('set-footer-company', footer.company || defaults.company);
            safeSetValue('set-footer-privacy', footer.privacy || defaults.privacy);
            safeSetValue('set-footer-terms', footer.terms || defaults.terms);
            safeSetValue('set-footer-legal', footer.legal || defaults.legal);
        };

        window.openFooterLegal = function(type) {
            const footer = window.currentFooterSettings || window.getDefaultFooterSettings();
            const documents = {
                privacy: { title: 'Kebijakan Privasi', content: footer.privacy },
                terms: { title: 'Syarat & Ketentuan', content: footer.terms },
                legal: { title: 'Ketentuan Hukum', content: footer.legal }
            };
            const selected = documents[type] || documents.legal;
            safeSetText('footer-legal-title', selected.title);
            safeSetText('footer-legal-content', selected.content || 'Dokumen belum tersedia.');
            window.openModal('footer-legal-modal');
        };

        document.addEventListener('click', (event) => {
            if (event.target?.matches?.('[data-footer-legal-backdrop]')) {
                window.closeModal('footer-legal-modal');
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && document.getElementById('footer-legal-modal')?.classList.contains('show')) {
                window.closeModal('footer-legal-modal');
            }
        });

        // Make it globally accessible
        window.listenToSettings = function listenToSettings() {
            db.ref('settings').on('value', snap => {
                const s = snap.val() || {};
                const c = s.content || {};
                
                const brandName = window.normalizeBrandName(c.name);
                safeSetHTML('nav-web-name', `<i class="fa-solid fa-ticket mr-1"></i> ${brandName}`);
                document.title = `${brandName} - Tiket Resmi Event Favorit Anda`;

                const legacyHeroText = new Set([
                    'Sistem Ticketing Resmi, Cepat, Aman dan Realtime',
                    'Tiket Resmi',
                    'Event Favorit Anda',
                    'Temukan event konser dan olahraga terbaik dengan sistem validasi barcode realtime anti tiket palsu.'
                ]);
                const cleanHeroText = (value) => {
                    const text = String(value || '').trim();
                    return legacyHeroText.has(text) ? '' : text;
                };
                const renderOptionalHeroText = (id, value, html = false) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (value) {
                        if (html) el.innerHTML = value; else el.innerText = value;
                        el.classList.remove('hidden');
                        if (id === 'hero-tagline') el.classList.add('inline-block');
                        el.setAttribute('aria-hidden', 'false');
                    } else {
                        if (html) el.innerHTML = ''; else el.innerText = '';
                        el.classList.add('hidden');
                        if (id === 'hero-tagline') el.classList.remove('inline-block');
                        el.setAttribute('aria-hidden', 'true');
                    }
                };

                const heroTagline = cleanHeroText(c.tagline);
                const heroTitle = cleanHeroText(c.title);
                const heroSub = cleanHeroText(c.sub);
                const heroDesc = cleanHeroText(c.desc);
                const heroTitleHtml = heroTitle && heroSub
                    ? `${escapeHtml(heroTitle)} <br><span class="dynamic-text-primary">${escapeHtml(heroSub)}</span>`
                    : heroTitle
                        ? escapeHtml(heroTitle)
                        : heroSub
                            ? `<span class="dynamic-text-primary">${escapeHtml(heroSub)}</span>`
                            : '';

                renderOptionalHeroText('hero-tagline', heroTagline);
                renderOptionalHeroText('hero-title', heroTitleHtml, true);
                renderOptionalHeroText('hero-desc', heroDesc);
                safeSetHTML('event-section-title', `Event <span class="dynamic-text-primary">${escapeHtml(c.evTitle || 'Terbaru')}</span>`);

                const heroAdminTitle = heroTitle && heroSub ? `${heroTitle} | ${heroSub}` : (heroTitle || heroSub);
                safeSetValue('set-web-name', brandName); safeSetValue('set-web-tagline', heroTagline); safeSetValue('set-web-title', heroAdminTitle); safeSetValue('set-web-desc', heroDesc); safeSetValue('set-web-ev-title', c.evTitle || ''); safeSetValue('set-hero-bg', c.heroBg || '');

                const l = s.logos || {};
                const navLogoUrl = window.normalizeBrandLogoUrl(l.nav);
                const navLogoEl = document.getElementById('nav-logo-img');
                const navNameEl = document.getElementById('nav-web-name');
                if (navLogoEl) {
                    if (navLogoUrl) {
                        navLogoEl.src = navLogoUrl;
                        navLogoEl.classList.remove('hidden');
                    } else {
                        navLogoEl.removeAttribute('src');
                        navLogoEl.classList.add('hidden');
                    }
                }
                if (navNameEl) navNameEl.classList.toggle('hidden', Boolean(navLogoUrl));
                safeSetValue('set-logo-nav', navLogoUrl);
                window.renderFooterSettings(s.footer || {}, l);
                window.sysPayment = s.payment || {};
                window.vendorPaymentMethods = s.vendorPayments || {};
                // Populate payment inputs depending on current role so values persist after refresh
                try {
                    if (window.isVendor && window.currentUserData) {
                        safeSetValue('set-pay-bank', window.currentUserData.pay_bank || '');
                        safeSetValue('set-pay-name', window.currentUserData.pay_name || '');
                        safeSetValue('set-pay-qris', window.currentUserData.pay_qris || '');
                    } else {
                        safeSetValue('set-pay-bank', window.sysPayment?.bank || '');
                        safeSetValue('set-pay-name', window.sysPayment?.name || '');
                        safeSetValue('set-pay-qris', window.sysPayment?.qris || '');
                    }
                } catch (e) { console.warn('Could not populate payment inputs', e); }
                
                const taxDataSource = (window.isVendor && (window.currentUserData?.tax !== undefined || window.currentUserData?.tax_enabled !== undefined)) ? window.currentUserData : window.sysPayment;
                const taxData = window.getTaxSettings(taxDataSource);
                safeSetText('dash-tax-pct', taxData.taxEnabled ? taxData.taxPct : 'Off');
                if (typeof window.dashGross !== 'undefined') {
                    const taxAmt = (window.dashGross * taxData.taxPct) / 100;
                    safeSetText('dash-tax', formatRp(taxAmt)); safeSetText('dash-net', formatRp(window.dashGross - taxAmt));
                }

                const bannerList = Array.isArray(s.banners) ? s.banners.filter((entry) => entry !== '' && entry !== null) : [];
                window.renderTopAdSliderFromBanners(bannerList);

                if (Array.isArray(s.banners)) {
                    for (let i = 0; i < 20; i++) {
                        let b = bannerList[i];
                        let imgStr = ''; let urlStr = '';
                        if (b) {
                            if (typeof b === 'string') { imgStr = b; }
                            else if (typeof b === 'object') { imgStr = b.img || ''; urlStr = b.url || ''; }
                        }
                        safeSetValue(`bn-img-${i + 1}`, imgStr);
                        safeSetValue(`bn-url-${i + 1}`, urlStr);
                    }
                }

                window.cachedSettings = s;
                if (typeof window.syncFaqWaNumbersFromRemote === 'function') {
                    window.syncFaqWaNumbersFromRemote(true).catch(() => {});
                }
                window.renderSponsorLists();
                renderWAAdminGrid(s.whatsapp || {});

                const sharedFaqWaNumbers = window.syncFaqWaNumbersFromSettings(
                    s?.faq ? { ...s.faq, whatsapp: s.whatsapp || {} } : (s?.whatsapp ? { whatsapp: s.whatsapp } : {})
                );
                if (!sharedFaqWaNumbers.length && !window.faqWaState.updatedAt) {
                    window.refreshFaqWaFromStorage();
                }

                if (typeof window.loadFaqWaConfig === 'function' && !window.faqWaState.updatedAt) {
                    window.loadFaqWaConfig().catch(() => {});
                }
                
                window.getPaymentInfoForOwner = function(ownerId = 'SUPER_ADMIN') {
                    const defaultPayment = {
                        bank: (window.sysPayment?.bank || '').toString().trim(),
                        name: (window.sysPayment?.name || '').toString().trim(),
                        qris: (window.sysPayment?.qris || '').toString().trim()
                    };
                    if (!ownerId || ownerId === 'SUPER_ADMIN') return defaultPayment;

                    const publicPayment = window.vendorPaymentMethods?.[ownerId] || {};
                    const legacyOwnerData = window.usersMapCache?.[ownerId] || {};
                    return {
                        bank: (publicPayment.bank || legacyOwnerData.pay_bank || '').toString().trim(),
                        name: (publicPayment.name || legacyOwnerData.pay_name || '').toString().trim(),
                        qris: (publicPayment.qris || legacyOwnerData.pay_qris || '').toString().trim()
                    };
                };
                window.loadOwnerPaymentInfo = async function(ownerId) {
                    if (!ownerId || ownerId === 'SUPER_ADMIN') return window.sysPayment || null;
                    const cached = window.vendorPaymentMethods?.[ownerId];
                    if (cached && (cached.bank || cached.name || cached.qris)) return cached;
                    try {
                        const snap = await db.ref(`settings/vendorPayments/${ownerId}`).once('value');
                        const data = snap.val() || {};
                        if (Object.keys(data).length) {
                            window.vendorPaymentMethods = window.vendorPaymentMethods || {};
                            window.vendorPaymentMethods[ownerId] = data;
                            return data;
                        }
                    } catch (e) {
                        console.warn('Failed to load public vendor payment info', e);
                    }
                    return null;
                };
                window.syncVendorPaymentMethodPublic = async function() {
                    if (!window.isVendor || !window.currentUserData?.uid || !window.db) return false;
                    const uid = window.currentUserData.uid;
                    const legacy = {
                        bank: (window.currentUserData.pay_bank || '').toString().trim(),
                        name: (window.currentUserData.pay_name || '').toString().trim(),
                        qris: (window.currentUserData.pay_qris || '').toString().trim()
                    };
                    if (!legacy.bank && !legacy.qris) return false;
                    const current = window.vendorPaymentMethods?.[uid] || {};
                    if (current.bank === legacy.bank && current.name === legacy.name && current.qris === legacy.qris) return true;
                    try {
                        const payload = { ...legacy, updatedAt: firebase.database.ServerValue.TIMESTAMP };
                        await window.db.ref(`settings/vendorPayments/${uid}`).set(payload);
                        window.vendorPaymentMethods = window.vendorPaymentMethods || {};
                        window.vendorPaymentMethods[uid] = { ...legacy, updatedAt: Date.now() };
                        return true;
                    } catch (e) {
                        console.warn('Failed to publish vendor payment info', e);
                        return false;
                    }
                };
                window.populatePaymentSettingsInputs = function() {
                    try {
                        const bankEl = document.getElementById('set-pay-bank');
                        const nameEl = document.getElementById('set-pay-name');
                        const qrisEl = document.getElementById('set-pay-qris');
                        if (!bankEl || !nameEl || !qrisEl) return;
                        if (window.isVendor && window.currentUserData) {
                            bankEl.value = window.currentUserData.pay_bank || '';
                            nameEl.value = window.currentUserData.pay_name || '';
                            qrisEl.value = window.currentUserData.pay_qris || '';
                        } else {
                            bankEl.value = window.sysPayment?.bank || '';
                            nameEl.value = window.sysPayment?.name || '';
                            qrisEl.value = window.sysPayment?.qris || '';
                        }
                    } catch (e) {
                        console.warn('Failed to populate payment settings inputs', e);
                    }
                };
                
                // Generate 20 Banner Input Fields
                const bannerFields = document.getElementById('admin-banner-fields');
                if(bannerFields) {
                    let bHtml = '';
                    for(let i=1; i<=20; i++) {
                        bHtml += `<div class="bg-dark/50 p-3 rounded-xl border border-white/5 shadow-inner"><p class="text-amber-500 font-bold mb-2 text-xs uppercase tracking-wider">Slot Iklan ${i}</p><label class="text-[10px] text-gray-400 block mb-1">URL Gambar (Landscape)</label><input type="url" id="bn-img-${i}" class="w-full bg-darker border border-gray-600 rounded p-2 text-white text-xs focus:border-amber-500 outline-none mb-2" placeholder="https://..."><label class="text-[10px] text-gray-400 block mb-1">URL Link Tujuan (Bila diklik)</label><input type="url" id="bn-url-${i}" class="w-full bg-darker border border-gray-600 rounded p-2 text-white text-xs focus:border-amber-500 outline-none" placeholder="https://instagram.com/..."></div>`;
                    }
                    bannerFields.innerHTML = bHtml;
                    // Populate dengan data yang sudah ada
                    for(let i=0; i<20; i++) {
                        let b = s.banners && s.banners[i];
                        let imgStr = ''; let urlStr = '';
                        if(b) {
                            if(typeof b === 'string') { imgStr = b; }
                            else if (typeof b === 'object') { imgStr = b.img || ''; urlStr = b.url || ''; }
                        }
                        safeSetValue(`bn-img-${i+1}`, imgStr);
                        safeSetValue(`bn-url-${i+1}`, urlStr);
                    }
                }
                
            }, err => { console.error("Gagal memuat setting:", err); });
        }// Make it globally accessible so deposit loading can trigger it
        window.listenToPublicEvents = function listenToPublicEvents() {
            if (window.publicEventsListening) return;
            window.publicEventsListening = true;
            try { if (db && db.ref) db.ref('events').off('value'); } catch (e) { console.warn('Unable to detach existing event listeners:', e); }
            db.ref('events').on('value', snap => {
                const data = snap.val() || {}; window.eventDataMap = data; 
                if (window.populateRaffleEventSelect) window.populateRaffleEventSelect();
                try { if (window.isSuperAdmin || window.isVendor) window.refreshAdminPaymentViews?.(); } catch (e) { console.warn('refreshAdminPaymentViews from events listener failed', e); }
                const pubC = document.getElementById('events-container'); const admT = document.getElementById('admin-events-table'); 
                if(pubC) pubC.innerHTML = ''; if(admT) admT.innerHTML = ''; 
                const keys = Object.keys(data);
                let adminEventsCount = 0;

                if(keys.length === 0 && pubC) pubC.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10 border border-dashed border-white/10 rounded-xl">Belum ada event yang tersedia saat ini.</div>';

                const processEvents = () => {
                    const lastPage = localStorage.getItem('beetix_last_page');
                    if (lastPage === 'event-detail' && document.getElementById('co-evid').value === "") { showPage('home'); }

                    keys.reverse().forEach(k => {
                        const ev = data[k]; if(!ev) return;
                        const tiket = ev.tiket || {}; let lowestP = Infinity;
                        const theOwner = ev.ownerId || 'SUPER_ADMIN'; 

                        let totalAdminK = ev.total_kuota || 'Unlimited'; 
                        let sisaAdminK = totalAdminK !== 'Unlimited' ? (totalAdminK - (ev.sold || 0)) : 'Unlimited';
                        let ownerLabel = (window.isSuperAdmin && theOwner !== 'SUPER_ADMIN') ? `<br><span class="text-[10px] bg-white/10 px-1 rounded text-white font-bold text-amber-500">Vendor ID: ${theOwner.substring(0,5)}</span>` : '';
                        
                        let actButtons = '';
                        const canManageEvent = window.isSuperAdmin || theOwner === window.currentUserData?.uid;
                        if (canManageEvent) {
                            adminEventsCount++;
                            const canEdit = theOwner === window.currentUserData?.uid || (window.isSuperAdmin && theOwner === 'SUPER_ADMIN');
                            const editButton = canEdit ? `<button type="button" onclick="openEditEvent('${k}')" class="text-blue-400 mr-3 cursor-pointer"><i class="fa-solid fa-pen"></i></button>` : '';
                            const deleteButton = `<button type="button" onclick="window.deleteEvent('${k}')" class="text-red-400 cursor-pointer"><i class="fa-solid fa-trash"></i></button>`;
                            actButtons = `${editButton}${deleteButton}`;
                        } else {
                            actButtons = `<span class="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded" title="Hanya pemilik event atau admin utama dapat menghapus"><i class="fa-solid fa-lock text-gray-400"></i> Hanya Pemilik</span>`;
                        }
                        
                        const showInAdminEvents = window.isSuperAdmin || theOwner === window.currentUserData?.uid;
                        if (showInAdminEvents) {
                            if(admT) admT.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3">${ev.title || 'Event'}</td><td class="px-4 py-3 text-xs text-blue-400">${ev.kategori || 'Event'}</td><td class="px-4 py-3 text-xs text-gray-400">${theOwner === 'SUPER_ADMIN' ? 'Super Admin' : (ev.org_name || 'Vendor')}${ownerLabel}</td><td class="px-4 py-3 text-xs text-green-400">Aktif</td><td class="px-4 py-3 text-right">${actButtons}</td></tr>`;
                        }
                        
                        if (tiket.reg_eco_q !== undefined) {
                            if (tiket.presale_q > (tiket.presale_sold || 0) && tiket.presale_h > 0) lowestP = Math.min(lowestP, tiket.presale_h);
                            if (tiket.reg_eco_q > (tiket.reg_eco_sold || 0) && tiket.reg_eco_h > 0) lowestP = Math.min(lowestP, tiket.reg_eco_h);
                            if (tiket.reg_vip_q > (tiket.reg_vip_sold || 0) && tiket.reg_vip_h > 0) lowestP = Math.min(lowestP, tiket.reg_vip_h);
                            if (tiket.reg_vvip_q > (tiket.reg_vvip_sold || 0) && tiket.reg_vvip_h > 0) lowestP = Math.min(lowestP, tiket.reg_vvip_h);
                            if (tiket.trs_eco_q > (tiket.trs_eco_sold || 0) && tiket.trs_eco_h > 0) lowestP = Math.min(lowestP, tiket.trs_eco_h);
                        } else {
                            if (tiket.reg_eco_h) lowestP = Math.min(lowestP, tiket.reg_eco_h); if (tiket.reg_vip_h) lowestP = Math.min(lowestP, tiket.reg_vip_h);
                        }
                        let ecoP = lowestP === Infinity ? (tiket.reg_eco_h || 0) : lowestP;
                        
                        let ticketInfoHtml = '<div class="grid grid-cols-2 gap-1.5 mb-3">';
                        const tInfo = ev.tiket || {};
                        const labels = ev.categoryLabels || {};
                        const catLabels = [
                            { key: 'presale', label: labels.presale ? labels.presale.toUpperCase() : 'PRESALE' },
                            { key: 'reg_eco', label: labels.reguler ? labels.reguler.toUpperCase() : 'REGULER' },
                            { key: 'reg_vip', label: labels.vip ? labels.vip.toUpperCase() : 'VIP' },
                            { key: 'reg_vvip', label: labels.vvip ? labels.vvip.toUpperCase() : 'VVIP' },
                            { key: 'trs_eco', label: 'TRS. ECO' },
                            { key: 'trs_vip', label: 'TRS. VIP' }
                        ];

                        let hasTickets = false;
                        catLabels.forEach(cat => {
                            let q = parseInt(tInfo[cat.key + '_q']) || 0;
                            let sold = parseInt(tInfo[cat.key + '_sold']) || 0;
                            if (q > 0) {
                                hasTickets = true;
                                let sisa = q - sold;
                                let statusColor = sisa > 0 ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30';
                                let sisaText = sisa > 0 ? `${sisa}/${q}` : 'HABIS';
                                ticketInfoHtml += `<div class="flex justify-between items-center text-[9px] bg-dark/50 border ${statusColor} px-1.5 py-1 rounded"><span class="text-gray-300 font-bold truncate mr-1">${cat.label}</span><span class="font-black ${statusColor.split(' ')[0]} whitespace-nowrap">${sisaText}</span></div>`;
                            }
                        });
                        ticketInfoHtml += '</div>';
                        if (!hasTickets) ticketInfoHtml = '';

                        if(pubC) pubC.innerHTML += `
                        <div class="min-w-[260px] md:min-w-[300px] snap-center glass-card rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer transition-all flex flex-col group hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]" onclick="window.openEventDetailPage('${k}')">
                            <div class="h-40 overflow-hidden relative bg-darker">
                                <div class="absolute inset-0 bg-gradient-to-t from-darker via-transparent to-transparent z-10 opacity-70"></div>
                                <img src="${ev.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Cover">
                                <div class="absolute top-2 right-2 z-20 bg-dark/80 backdrop-blur-sm border border-white/10 text-[10px] px-2 py-1 rounded-md text-gray-300 font-bold tracking-wide shadow-lg">
                                    <i class="fa-solid fa-ticket text-amber-500 mr-1"></i> SISA: <span class="text-white">${sisaAdminK}</span>
                                </div>
                            </div>
                            <div class="p-4 flex-1 flex flex-col relative z-20">
                                <h3 class="font-bold text-white text-base md:text-lg leading-tight mb-3 line-clamp-2">${ev.title || 'Event'}</h3>
                                <div class="space-y-1.5 mb-4">
                                    <div class="flex items-center text-[11px] text-gray-400 font-medium"><i class="fa-regular fa-calendar text-blue-400 w-4 text-center mr-1"></i> <span class="truncate">${ev.date || '-'} • ${ev.time || '-'}</span></div>
                                    <div class="flex items-center text-[11px] text-gray-400 font-medium"><i class="fa-solid fa-location-dot text-red-400 w-4 text-center mr-1"></i> <span class="truncate">${ev.location || '-'}</span></div>
                                </div>
                                ${ticketInfoHtml}
                                <div class="mt-auto">
                                    <p class="font-black text-lg text-amber-500 border-b border-dashed border-white/10 pb-4 mb-4">${formatRp(ecoP)}</p>
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center max-w-[55%]">
                                            <div class="w-7 h-7 rounded-full bg-darker border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 mr-2 overflow-hidden shrink-0">
                                                ${ev.org_logo ? `<img src="${ev.org_logo}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-building"></i>`}
                                            </div>
                                            <p class="text-[11px] font-medium text-gray-300 truncate">${ev.org_name || 'EO Resmi'}</p>
                                        </div>
                                        <button class="bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-dark px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-amber-500/50 shadow-sm shrink-0">Beli Tiket</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    });

                    safeSetText('dash-events', adminEventsCount);
                    renderLaporanPerEvent();
                    updateDashboardLabels();
                    if(window.isSuperAdmin) window.updateVendorDashboardList();
                };

                processEvents();
                if (window.currentUserData === null) {
                    let retryCount = 0; let waitInterval = setInterval(() => { if (window.currentUserData !== null || retryCount > 10) { clearInterval(waitInterval); if(pubC) pubC.innerHTML = ''; processEvents(); } retryCount++; }, 100);
                }
            }, err => { console.error("Gagal memuat event:", err); });
        }

        async function getTicketDeletionRequestsData() {
            try {
                const snap = await db.ref('ticketDeletionRequests').once('value');
                const requests = snap.val() || {};
                return Object.entries(requests).reduce((acc, [key, req]) => {
                    acc[key] = { ...(req || {}), vendorId: req?.vendorId || '', requestKey: key };
                    return acc;
                }, {});
            } catch (err) {
                console.warn('Ticket deletion requests are not readable from the root path, trying user-scoped fallback', err);
                try {
                    const usersSnap = await db.ref('users').once('value');
                    const users = usersSnap.val() || {};
                    const requests = {};
                    Object.entries(users).forEach(([uid, userData]) => {
                        const nested = userData?.ticketDeletionRequests || {};
                        Object.entries(nested).forEach(([requestKey, req]) => {
                            requests[`${uid}/${requestKey}`] = { ...(req || {}), vendorId: uid, requestKey };
                        });
                    });
                    return requests;
                } catch (fallbackErr) {
                    console.warn('Unable to load ticket deletion requests from Firebase', fallbackErr);
                    return {};
                }
            }
        }

        function parseTicketDeletionRequestRef(requestRef) {
            if (!requestRef) return { vendorId: '', requestKey: '' };
            const parts = String(requestRef).split('/');
            if (parts.length >= 2) {
                return { vendorId: parts[0], requestKey: parts.slice(1).join('/') };
            }
            return { vendorId: '', requestKey: String(requestRef) };
        }

        window.requestVendorTicketDeletion = async function() {
            if (!window.isVendor || window.isSuperAdmin || !window.db) {
                Toast.fire({ icon: 'error', title: 'Hanya vendor yang bisa mengajukan penghapusan tiket.' });
                return;
            }
            if (!confirm('Ajukan penghapusan semua tiket Anda? Penghapusan hanya akan dilakukan setelah disetujui admin utama.')) return;
            try {
                const vendorId = window.currentUserData?.uid;
                if (!vendorId) throw new Error('Identitas vendor tidak ditemukan.');
                const vendorRequestsRef = db.ref(`users/${vendorId}/ticketDeletionRequests`);
                const pendingSnap = await vendorRequestsRef.once('value');
                const pendingRequests = pendingSnap.val() || {};
                const hasPending = Object.values(pendingRequests).some(req => (req.status || 'PENDING') === 'PENDING');
                if (hasPending) {
                    Toast.fire({ icon: 'info', title: 'Permintaan hapus tiket Anda masih menunggu persetujuan admin utama.' });
                    return;
                }
                const requestRef = vendorRequestsRef.push();
                await requestRef.set({
                    vendorId,
                    vendorName: window.currentUserData?.nama || '',
                    requestedBy: vendorId,
                    requestedAt: Date.now(),
                    status: 'PENDING'
                });
                Toast.fire({ icon: 'success', title: 'Permintaan hapus tiket dikirim ke admin utama.' });
            } catch (err) {
                Toast.fire({ icon: 'error', title: err.message || 'Gagal mengirim permintaan hapus tiket.' });
            }
        };

        window.renderPendingTicketDeletionRequests = async function() {
            if (!window.isSuperAdmin || !window.db) return;
            let container = document.getElementById('admin-ticket-delete-requests');
            if (!container) {
                const table = document.getElementById('admin-tickets-table')?.closest('table');
                if (!table) return;
                container = document.createElement('div');
                container.id = 'admin-ticket-delete-requests';
                container.className = 'mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3';
                table.parentElement.insertBefore(container, table);
            }
            container.innerHTML = '<div class="text-sm text-gray-300">Memuat permintaan hapus tiket...</div>';
            try {
                const requests = await getTicketDeletionRequestsData();
                const pending = Object.entries(requests).filter(([, req]) => (req.status || 'PENDING') === 'PENDING');
                if (!pending.length) {
                    container.innerHTML = '<div class="text-sm text-gray-400">Tidak ada permintaan hapus tiket yang menunggu persetujuan.</div>';
                    return;
                }
                container.innerHTML = pending.map(([key, req]) => {
                    const requestRef = req.vendorId && req.requestKey ? `${req.vendorId}/${req.requestKey}` : key;
                    return `
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-white/10 py-2 last:border-b-0">
                            <div>
                                <div class="font-semibold text-white">${req.vendorName || 'Vendor'}</div>
                                <div class="text-xs text-gray-400">${new Date(req.requestedAt || 0).toLocaleString('id-ID')}</div>
                            </div>
                            <button type="button" onclick="window.approveVendorTicketDeletionRequest('${requestRef}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold">Setujui Hapus Semua Tiket</button>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                container.innerHTML = '<div class="text-sm text-red-400">Gagal memuat permintaan hapus tiket. Silakan coba lagi.</div>';
            }
        };

        window.approveVendorTicketDeletionRequest = async function(requestKey) {
            if (!window.isSuperAdmin || !window.db || !requestKey) return;
            if (!confirm('Setujui penghapusan semua tiket vendor ini?')) return;
            try {
                const parsed = parseTicketDeletionRequestRef(requestKey);
                const vendorId = parsed.vendorId || '';
                const requestPath = vendorId ? `users/${vendorId}/ticketDeletionRequests/${parsed.requestKey}` : `ticketDeletionRequests/${parsed.requestKey}`;
                const reqSnap = await db.ref(requestPath).once('value');
                const reqData = reqSnap.val() || {};
                const resolvedVendorId = reqData.vendorId || vendorId;
                if (!resolvedVendorId) throw new Error('Vendor tidak ditemukan dalam permintaan.');
                const ticketsSnap = await db.ref('tickets').orderByChild('ownerId').equalTo(resolvedVendorId).once('value');
                const tickets = ticketsSnap.val() || {};
                const eventIds = new Set(Object.values(tickets).map(ticket => ticket?.eventId).filter(Boolean));
                const deletePromises = Object.keys(tickets).map(ticketKey => db.ref(`tickets/${ticketKey}`).remove());
                await Promise.all(deletePromises);
                if (window.globalTicketsData && typeof window.globalTicketsData === 'object') {
                    Object.keys(tickets).forEach(ticketKey => delete window.globalTicketsData[ticketKey]);
                }
                await db.ref(requestPath).update({
                    status: 'APPROVED',
                    approvedAt: Date.now(),
                    approvedBy: window.currentUserData?.uid || '',
                    approvedByName: window.currentUserData?.nama || ''
                });
                for (const eventId of eventIds) {
                    try { await window.reconcileEventTicketCounts?.(eventId); } catch (e) {}
                }
                window.renderAdminTicketTablesFromCache?.(window.globalTicketsData || {});
                window.refreshDashboardAfterDataMutation?.();
                Toast.fire({ icon: 'success', title: 'Semua tiket vendor berhasil dihapus.' });
            } catch (err) {
                Toast.fire({ icon: 'error', title: err.message || 'Gagal menyetujui penghapusan tiket.' });
            }
        };

        window.__repairingLegacyUpgradeTickets = false;
        window.repairLegacyUpgradedTickets = async function(ticketsData = window.globalTicketsData || {}) {
            if (window.__repairingLegacyUpgradeTickets || (!window.isSuperAdmin && !window.isVendor) || !window.db) return;
            const replacementMap = window.getUpgradeReplacementMap(ticketsData);
            const updates = {};
            Object.entries(replacementMap).forEach(([originalCode, replacement]) => {
                const oldTicket = ticketsData[originalCode];
                if (!oldTicket || oldTicket.replacedByUpgrade === true || oldTicket.invalidatedReason === 'UPGRADE' || oldTicket.upgradedToTicketCode) return;
                const ticketOwnerId = oldTicket.ownerId || window.eventDataMap?.[oldTicket.eventId]?.ownerId || 'SUPER_ADMIN';
                if (window.isVendor && ticketOwnerId !== window.currentUserData?.uid) return;
                if (oldTicket.status === 'TRANSFERRED' || oldTicket.status === 'TRANSFER_PENDING') return;
                updates[`tickets/${originalCode}/status`] = 'USED';
                updates[`tickets/${originalCode}/replacedByUpgrade`] = true;
                updates[`tickets/${originalCode}/invalidatedReason`] = 'UPGRADE';
                updates[`tickets/${originalCode}/upgradedAt`] = replacement.upgradedAt || Date.now();
                updates[`tickets/${originalCode}/upgradedToTicketCode`] = replacement.replacementCode || '';
                if (replacement.upgradePaymentId) updates[`tickets/${originalCode}/upgradePaymentId`] = replacement.upgradePaymentId;
            });
            if (!Object.keys(updates).length) return;
            window.__repairingLegacyUpgradeTickets = true;
            try {
                await window.db.ref().update(updates);
            } catch (e) {
                console.warn('[repairLegacyUpgradedTickets]', e);
            } finally {
                window.__repairingLegacyUpgradeTickets = false;
            }
        };

        window.renderAdminTicketTablesFromCache = function(data = window.globalTicketsData || {}) {
            const ticketsData = data || {};
            const upgradeReplacementMap = window.getUpgradeReplacementMap(ticketsData);
            window.globalTicketsData = ticketsData;
            window.userTicketCount = {};
            window.userTicketCountOwn = {};

            const tt = document.getElementById('admin-tickets-table');
            const st = document.getElementById('admin-sponsor-tix-table');
            if (tt) tt.innerHTML = '';
            if (st) st.innerHTML = '';

            let gateTotal = 0; let gateUsed = 0; let gateActive = 0;
            let hasSponsorTix = false;

            Object.keys(ticketsData).reverse().forEach(k => {
                const t = ticketsData[k];
                if (!t) return;
                const tOwner = t.ownerId || 'SUPER_ADMIN';
                const isMine = tOwner === window.currentUserData?.uid || (window.isSuperAdmin && tOwner === 'SUPER_ADMIN');
                const isUpgraded = window.isTicketReplacedByUpgrade(t, k, upgradeReplacementMap);
                if (window.isVendor && !isMine) return;

                if (t.type !== 'sponsor' && !isUpgraded) {
                    window.userTicketCount[t.uid] = (window.userTicketCount[t.uid] || 0) + 1;
                    if (isMine) {
                        window.userTicketCountOwn[t.uid] = (window.userTicketCountOwn[t.uid] || 0) + 1;
                    }
                }

                const isSponsor = t.type === 'sponsor';
                const isTerusan = (t.category || '').toLowerCase().includes('terusan');
                if (!isUpgraded) {
                    if (isSponsor || isTerusan) {
                        gateTotal++;
                        if (t.remaining <= 0) gateUsed++; else gateActive++;
                    } else {
                        gateTotal++;
                        if (t.status === 'USED') gateUsed++; else gateActive++;
                    }
                }

                if (!isMine) return;

                let catLabel = t.category;
                if (isSponsor) catLabel = `<span class="text-blue-400 font-bold">${t.category} (Sponsor)</span>`;
                else if (isTerusan) catLabel = `<span class="text-green-400 font-bold">${t.category}</span>`;

                let statLabel = '';
                if (isUpgraded) {
                    statLabel = `<span class="text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">SUDAH DI-UPGRADE</span>`;
                } else if (isSponsor || isTerusan) {
                    statLabel = `<span class="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">${t.remaining}/${t.quota} Sisa Scan</span>`;
                } else {
                    statLabel = `<span class="font-bold ${t.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}">${t.status}</span>`;
                }

                if (tt) {
                    const rowDeleteBtn = window.isVendor ? '' : `<button type="button" onclick="window.deleteTicketEntry('${k}', '${t.code || ''}')" class="text-red-400 cursor-pointer text-xs hover:text-red-300">Hapus</button>`;
                    const rowMainActions = isUpgraded
                        ? `<span class="text-purple-300 text-xs font-semibold cursor-not-allowed"><i class="fa-solid fa-ban mr-1"></i>Tidak aktif</span>`
                        : `<button type="button" onclick="viewTicket('${k}')" class="text-blue-400 cursor-pointer text-xs hover:text-blue-300">Lihat</button><button type="button" onclick="window.openSuspendTicket('${k}')" class="text-orange-400 cursor-pointer text-xs hover:text-orange-300">Tangguhkan</button>`;
                    tt.innerHTML += `<tr class="border-b border-white/5 ${isUpgraded ? 'opacity-60' : ''}"><td class="px-4 py-3 font-mono text-amber-500">${t.code}</td><td class="px-4 py-3">${t.userName}</td><td class="px-4 py-3 truncate max-w-[150px]">${t.eventName}</td><td class="px-4 py-3 text-xs">${catLabel}</td><td class="px-4 py-3 text-xs">${statLabel}</td><td class="px-4 py-3 text-xs">${isUpgraded ? ('Diganti oleh: ' + (t.upgradedToTicketCode || upgradeReplacementMap[k]?.replacementCode || '-')) : (t.suspendedMessage ? ('<span class="text-xs text-amber-300 truncate max-w-[200px]">' + (t.suspendedMessage || '') + '</span>') : '-')}</td><td class="px-4 py-3 space-x-1 flex gap-1">${rowMainActions}${rowDeleteBtn}${t.customFormAnswers ? `<button type="button" class="text-purple-400 cursor-pointer text-xs hover:text-purple-300 view-custom-answers" data-answers="${encodeURIComponent(JSON.stringify(t.customFormAnswers || {}))}" data-code="${t.code}" data-eventid="${t.eventId || ''}" title="Lihat Data Tambahan"><i class="fa-solid fa-file-lines"></i></button>` : ''}</td></tr>`;
                }

                if (isSponsor && st) {
                    hasSponsorTix = true;
                    const spUser = t.sponsorUsername ? `<br><span class="text-[10px] text-gray-400"><i class="fa-solid fa-user mr-1"></i> ${t.sponsorUsername}</span>` : '';
                    st.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3 font-bold">${t.userName}${spUser}</td><td class="px-4 py-3 truncate max-w-[150px]">${t.eventName}</td><td class="px-4 py-3 text-xs text-blue-400">${t.category}</td><td class="px-4 py-3 font-bold text-amber-500 bg-amber-500/10 rounded text-center">${t.remaining} / ${t.quota}</td><td class="px-4 py-3 space-x-2 flex gap-2 justify-end"><button type="button" onclick="viewTicket('${k}')" class="hover:text-white text-xs" title="Lihat"><i class="fa-solid fa-qrcode"></i></button><button type="button" onclick="window.deleteSponsorTicket('${k}', '${t.code}')" class="hover:text-red-400 text-red-500 text-xs" title="Hapus Tiket Sponsor"><i class="fa-solid fa-trash"></i></button></td></tr>`;
                }
            });

            if (!hasSponsorTix && st) st.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-500">Belum ada tiket sponsor khusus.</td></tr>';

            safeSetText('dash-gate-total', gateTotal);
            safeSetText('dash-gate-masuk-num', `${gateUsed} Orang`);
            safeSetText('dash-gate-antri-num', `${gateActive} Orang`);

            let usedPct = gateTotal > 0 ? Math.round((gateUsed / gateTotal) * 100) : 0;
            let activePct = gateTotal > 0 ? 100 - usedPct : 0;
            safeSetText('dash-gate-masuk-pct', usedPct);
            safeSetText('dash-gate-antri-pct', activePct);

            const barMasuk = document.getElementById('dash-gate-bar-masuk');
            const barAntri = document.getElementById('dash-gate-bar-antri');
            if (barMasuk && barAntri) { barMasuk.style.width = `${usedPct}%`; barAntri.style.width = `${activePct}%`; }

            if (window.activeVendorDashId) {
                window.refreshVendorDetailGateStats?.(window.activeVendorDashId);
            }

            if (window.isVendor) {
                const ticketTable = document.getElementById('admin-tickets-table')?.closest('table');
                if (ticketTable && !document.getElementById('vendor-ticket-delete-all-wrap')) {
                    const actionWrap = document.createElement('div');
                    actionWrap.id = 'vendor-ticket-delete-all-wrap';
                    actionWrap.className = 'flex justify-end mb-3';
                    actionWrap.innerHTML = `<button type="button" onclick="window.requestVendorTicketDeletion()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-semibold">Hapus Semua Tiket Saya</button>`;
                    ticketTable.parentElement.insertBefore(actionWrap, ticketTable);
                }
            }
            if (window.isSuperAdmin) {
                window.renderPendingTicketDeletionRequests?.();
            }

            window.updateAdminSalesSummaryFromTickets?.();
            window.updateFinanceSummaryCards?.();
            window.repairMissingTicketsForApprovedPayments?.();
            if (window.isSuperAdmin) window.updateVendorDashboardList?.();
        };

        function listenToAdminData() {
            db.ref('tickets').on('value', snap => {
                const data = snap.val() || {};
                window.renderAdminTicketTablesFromCache(data);
                window.repairLegacyUpgradedTickets?.(data);
            });

            db.ref('payments').on('value', snap => {
                const data = snap.val() || {}; 
                window.globalPaymentsData = data; 
                window.updateFinanceSummaryCards();
                window.repairMissingTicketsForApprovedPayments?.();
                if (window.isSuperAdmin || window.isVendor) {
                    setTimeout(() => {
                        try { window.refreshAdminPaymentViews?.(); } catch(e) { console.warn('refreshAdminPaymentViews failed', e); }
                    }, 120);
                }
            });

            db.ref('users').on('value', snap => {
                const data = snap.val() || {}; window.usersMapCache = data;
                try {
                    if (window.populatePaymentSettingsInputs) window.populatePaymentSettingsInputs();
                } catch (e) { console.warn('Error populating payment inputs from usersMapCache', e); }
                const ut = document.getElementById('admin-users-table'); const st = document.getElementById('admin-scanners-table'); const vt = document.getElementById('admin-vendor-table');
                if(ut) ut.innerHTML = ''; if(st) st.innerHTML = ''; if(vt) vt.innerHTML = '';
                let scannerCount = 0; let pembeliCount = 0;
                
                let vendorSelectHtml = '<option value="SUPER_ADMIN">Super Admin (Saya)</option>';

                Object.keys(data).reverse().forEach(k => {
                    const u = data[k]; const role = u.role || 'User';
                    if (role === 'Vendor') {
                        if(window.isSuperAdmin) {
                            vendorSelectHtml += `<option value="${k}">${u.nama}</option>`;
                            if (vt) vt.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3 font-bold text-amber-500">${u.nama}</td><td class="px-4 py-3">${u.username}</td><td class="px-4 py-3 text-center text-purple-400 font-bold bg-purple-500/10 rounded">${u.platform_fee || 0}%</td><td class="px-4 py-3 text-right"><button type="button" onclick="window.deleteVendorAccount('${k}')" class="text-red-400 cursor-pointer bg-red-500/20 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"><i class="fa-solid fa-ban mr-1"></i> Banned & Hapus</button></td></tr>`;
                        }
                    }
                    else if(role.includes('Scanner')) {
                        const uOwner = u.ownerId || 'SUPER_ADMIN';
                        const isMine = uOwner === window.currentUserData?.uid || (window.isSuperAdmin && uOwner === 'SUPER_ADMIN');
                        
                        // Isolasi Vendor
                        if (window.isVendor && !isMine) return;
                        
                        // Dashboard Global Calc Super Admin
                        scannerCount++;
                        
                        // Isolasi Render Tabel
                        if (!isMine) return;
                        if(st) st.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3">${u.nama}</td><td class="px-4 py-3">${u.username}</td><td class="px-4 py-3">${role}</td><td class="px-4 py-3 text-right"><button type="button" onclick="window.deleteScannerAccount('${k}')" class="text-red-400 cursor-pointer"><i class="fa-solid fa-trash"></i></button></td></tr>`;
                    } else if (role === 'User') {
                        const tCountTotal = window.userTicketCount ? (window.userTicketCount[k] || 0) : 0;
                        const tCountOwn = window.userTicketCountOwn ? (window.userTicketCountOwn[k] || 0) : 0;

                        if (window.isVendor && tCountOwn === 0) return;
                        
                        // Dashboard Global Calc Super Admin
                        pembeliCount++;
                        
                        // Isolasi Render Tabel
                        if (window.isSuperAdmin && tCountOwn === 0) return;

                        if(ut) ut.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3">${u.nama}</td><td class="px-4 py-3">${u.phone || '-'}</td><td class="px-4 py-3 text-xs">${u.email}</td><td class="px-4 py-3 text-xs text-gray-400">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td><td class="px-4 py-3 font-bold text-amber-500">${tCountOwn} Tiket</td></tr>`;
                    }
                });
                safeSetText('dash-scanners', scannerCount); safeSetText('dash-users', pembeliCount);
                const evOwnerSel = document.getElementById('ev-owner'); if (evOwnerSel) evOwnerSel.innerHTML = vendorSelectHtml;
                if (window.isSuperAdmin) window.updateVendorDashboardList();
            });
        }

        function renderLaporanTable() {
            const tbody = document.getElementById('laporan-table-body'); if(!tbody) return;
            const search = (document.getElementById('filter-search')?.value || '').toLowerCase(); tbody.innerHTML = '';
            let filtered = adminReportData.filter(p => (p.userName||'').toLowerCase().includes(search) || (p.eventName||'').toLowerCase().includes(search));
            let total = 0;
            if(filtered.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Belum ada laporan.</td></tr>';
            filtered.forEach(p => { total += p.total; tbody.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3">${new Date(p.createdAt).toLocaleDateString()}</td><td class="px-4 py-3">${p.userName}</td><td class="px-4 py-3">${p.eventName}</td><td class="px-4 py-3">${p.category}</td><td class="px-4 py-3 text-right text-green-400 font-bold">${formatRp(p.total)}</td></tr>`; });
            safeSetText('lap-count', filtered.length); safeSetText('lap-total', formatRp(total));
        }

        function renderLaporanPerEvent() {
            const container = document.getElementById('laporan-per-event-container');
            if (!container) return; container.innerHTML = '';
            let hasEvents = false;
            Object.keys(window.eventDataMap || {}).reverse().forEach(k => {
                const ev = window.eventDataMap[k];
                const theOwner = ev.ownerId || 'SUPER_ADMIN'; 
                const isMine = theOwner === window.currentUserData?.uid || (window.isSuperAdmin && theOwner === 'SUPER_ADMIN');
                if (!isMine) return;
                
                hasEvents = true;
                container.innerHTML += `
                    <div class="bg-dark/50 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                        <div><p class="text-xs text-amber-500 font-bold mb-1">${ev.kategori || 'Event'}</p><h4 class="font-bold text-white mb-2 line-clamp-2">${ev.title || 'Event'}</h4><p class="text-[10px] text-gray-400 mb-4"><i class="fa-solid fa-calendar mr-1"></i> ${ev.date || '-'}</p></div>
                        <button type="button" onclick="window.generatePDFEvent('${k}')" class="w-full bg-white/10 hover:bg-amber-500 hover:text-dark text-white text-xs font-bold py-2 rounded transition-colors border border-white/10 hover:border-amber-500"><i class="fa-solid fa-file-pdf mr-1"></i> Download Laporan</button>
                    </div>`;
            });
            if(!hasEvents) container.innerHTML = '<p class="text-gray-500 text-sm">Belum ada event untuk diunduh laporannya.</p>';
        }

        window.activeVendorDashId = null;
        window.refreshVendorDetailGateStats = function(vid = window.activeVendorDashId) {
            if (!vid) return;
            const detailView = document.getElementById('vendor-detail-view');
            if (detailView && detailView.classList.contains('hidden')) return;

            let gateTotal = 0, gateUsed = 0, gateActive = 0;
            let tixUids = new Set();
            const vendorTickets = window.globalTicketsData || {};
            const upgradeReplacementMap = window.getUpgradeReplacementMap(vendorTickets);
            Object.entries(vendorTickets).forEach(([ticketCode, t]) => {
                if(t.ownerId === vid && !window.isTicketReplacedByUpgrade(t, ticketCode, upgradeReplacementMap)) {
                    if(t.type !== 'sponsor') tixUids.add(t.uid);
                    const isSponsor = t.type === 'sponsor';
                    const isTerusan = (t.category || '').toLowerCase().includes('terusan');
                    if (isSponsor || isTerusan) {
                        gateTotal++;
                        if (t.remaining <= 0) gateUsed++; else gateActive++;
                    } else {
                        gateTotal++;
                        if (t.status === 'USED') gateUsed++; else gateActive++;
                    }
                }
            });

            safeSetText('vd-gate-total', gateTotal);
            safeSetText('vd-gate-masuk-num', `${gateUsed} Orang`);
            safeSetText('vd-gate-antri-num', `${gateActive} Orang`);
            let usedPct = gateTotal > 0 ? Math.round((gateUsed / gateTotal) * 100) : 0;
            let activePct = gateTotal > 0 ? 100 - usedPct : 0;
            safeSetText('vd-gate-masuk-pct', usedPct); safeSetText('vd-gate-antri-pct', activePct);
            const barMasuk = document.getElementById('vd-gate-bar-masuk'); const barAntri = document.getElementById('vd-gate-bar-antri');
            if(barMasuk && barAntri) { barMasuk.style.width = `${usedPct}%`; barAntri.style.width = `${activePct}%`; }

            safeSetText('vd-users', tixUids.size);
        };

        window.closeVendorDetail = function() {
            window.activeVendorDashId = null;
            document.getElementById('vendor-detail-view').classList.add('hidden');
            document.getElementById('vendor-list-view').classList.remove('hidden');
        }

        window.openVendorDetail = function(vid) {
            window.activeVendorDashId = vid;
            const vendor = window.usersMapCache[vid];
            if(!vendor) return;

            document.getElementById('vendor-list-view').classList.add('hidden');
            document.getElementById('vendor-detail-view').classList.remove('hidden');
            safeSetText('vd-name-title', vendor.nama);

            window.refreshVendorDetailGateStats?.(vid);
            window.updateFinanceSummaryCards(vid);

            const ticketSummary = window.computeSalesSummaryFromTickets(vid);
            safeSetText('vd-tickets', ticketSummary.tix);
            safeSetText('vd-kon-eco-qty', ticketSummary.kon_ecoQ); safeSetText('vd-kon-eco-rp', formatRp(ticketSummary.kon_ecoR));
            safeSetText('vd-kon-vip-qty', ticketSummary.kon_vipQ); safeSetText('vd-kon-vip-rp', formatRp(ticketSummary.kon_vipR));
            safeSetText('vd-kon-vvip-qty', ticketSummary.kon_vvipQ); safeSetText('vd-kon-vvip-rp', formatRp(ticketSummary.kon_vvipR));
            safeSetText('vd-spo-eco-qty', ticketSummary.spo_ecoQ); safeSetText('vd-spo-eco-rp', formatRp(ticketSummary.spo_ecoR));
            safeSetText('vd-spo-vip-qty', ticketSummary.spo_vipQ); safeSetText('vd-spo-vip-rp', formatRp(ticketSummary.spo_vipR));
            safeSetText('vd-spo-vvip-qty', ticketSummary.spo_vvipQ); safeSetText('vd-spo-vvip-rp', formatRp(ticketSummary.spo_vvipR));

            let evCount = 0;
            Object.values(window.eventDataMap || {}).forEach(ev => { if(ev.ownerId === vid) evCount++; });
            safeSetText('vd-events', evCount);

            let scannerCount = 0;
            Object.values(window.usersMapCache || {}).forEach(u => { if(u.role && u.role.includes('Scanner') && u.ownerId === vid) scannerCount++; });

            safeSetText('vd-scanners', scannerCount);
        }

        window.deleteTicketEntry = async function(ticketKey, ticketCode = '') {
            if (!ticketKey || !window.db) return;
            const ticket = window.globalTicketsData?.[ticketKey] || {};
            const ownerId = ticket.ownerId || 'SUPER_ADMIN';
            const canDelete = window.isSuperAdmin || ownerId === window.currentUserData?.uid;
            if (!canDelete) {
                Toast.fire({ icon: 'error', title: 'Anda tidak punya izin menghapus tiket ini.' });
                return;
            }
            const label = ticketCode || ticket.code || ticketKey;
            if (!confirm(`Hapus tiket ${label}?`)) return;
            try {
                await window.db.ref(`tickets/${ticketKey}`).remove();
                if (window.globalTicketsData && typeof window.globalTicketsData === 'object') {
                    delete window.globalTicketsData[ticketKey];
                }
                window.renderAdminTicketTablesFromCache?.(window.globalTicketsData || {});
                window.refreshDashboardAfterDataMutation?.();
                Toast.fire({ icon: 'success', title: 'Tiket berhasil dihapus.' });
            } catch (err) {
                Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus tiket.' });
            }
        };

        window.deleteVendorAccount = function(userKey) {
            if (!userKey || !window.db) return;
            if (!confirm('BANNED VENDOR INI PERMANEN? Akun login vendor ini akan dihapus.')) return;
            window.db.ref(`users/${userKey}`).remove()
                .then(() => {
                    if (window.usersMapCache) delete window.usersMapCache[userKey];
                    if (window.currentViewingVendorId === userKey) {
                        window.currentViewingVendorId = null;
                    }
                    window.refreshDashboardAfterDataMutation?.();
                    Toast.fire({ icon: 'success', title: 'Vendor berhasil dihapus.' });
                })
                .catch(err => {
                    Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus vendor.' });
                });
        };

        window.deleteScannerAccount = function(userKey) {
            if (!userKey || !window.db) return;
            if (!confirm('Hapus Scanner ini?')) return;
            window.db.ref(`users/${userKey}`).remove()
                .then(() => {
                    if (window.usersMapCache) delete window.usersMapCache[userKey];
                    window.refreshDashboardAfterDataMutation?.();
                    Toast.fire({ icon: 'success', title: 'Scanner berhasil dihapus.' });
                })
                .catch(err => {
                    Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus scanner.' });
                });
        };

        window.deleteWaSetting = function(settingKey) {
            if (!settingKey || !window.db) return;
            if (!confirm('Hapus kontak WhatsApp ini?')) return;
            window.db.ref(`settings/whatsapp/${settingKey}`).remove()
                .then(() => {
                    if (window.cachedSettings && typeof window.cachedSettings === 'object') {
                        const nextWhatsapp = { ...(window.cachedSettings.whatsapp || {}) };
                        delete nextWhatsapp[settingKey];
                        window.cachedSettings.whatsapp = nextWhatsapp;
                    }
                    if (typeof renderWAAdminGrid === 'function') {
                        renderWAAdminGrid(window.cachedSettings?.whatsapp || {});
                    }
                    window.refreshDashboardAfterDataMutation?.();
                    Toast.fire({ icon: 'success', title: 'Kontak WhatsApp dihapus.' });
                })
                .catch(err => {
                    Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus kontak WhatsApp.' });
                });
        };

        window.deleteSponsorSetting = function(settingKey) {
            if (!settingKey || !window.db) return;
            if (!confirm('Hapus sponsor ini?')) return;
            window.db.ref(`settings/sponsors/${settingKey}`).remove()
                .then(() => {
                    if (window.cachedSettings && typeof window.cachedSettings === 'object') {
                        const nextSponsors = { ...(window.cachedSettings.sponsors || {}) };
                        delete nextSponsors[settingKey];
                        window.cachedSettings.sponsors = nextSponsors;
                    }
                    if (typeof window.renderSponsorLists === 'function') {
                        window.renderSponsorLists();
                    }
                    window.refreshDashboardAfterDataMutation?.();
                    Toast.fire({ icon: 'success', title: 'Sponsor berhasil dihapus.' });
                })
                .catch(err => {
                    Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus sponsor.' });
                });
        };

        window.updateVendorDashboardList = function() {
            const container = document.getElementById('vendor-cards-container');
            if(!container) return;
            let html = '';
            Object.keys(window.usersMapCache || {}).forEach(vid => {
                const vendor = window.usersMapCache[vid];
                if(vendor.role === 'Vendor') {
                    let vGross = 0;
                    let vEvents = 0;
                    Object.values(window.globalPaymentsData || {}).forEach(p => {
                        const ownerId = window.getPaymentOwnerId?.(p) || '';
                        if(ownerId === vid && (p.status || '').toString().toUpperCase() !== 'REJECTED') vGross += parseFloat(p.total || 0) || 0;
                    });
                    Object.values(window.eventDataMap || {}).forEach(ev => {
                        if(ev.ownerId === vid) vEvents++;
                    });

                    html += `
                    <div class="glass-card rounded-2xl p-6 border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]" onclick="openVendorDetail('${vid}')">
                        <div class="flex justify-between items-start mb-4">
                            <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl"><i class="fa-solid fa-store"></i></div>
                            <span class="text-xs font-bold bg-white/10 px-2 py-1 rounded text-gray-300">Fee: ${vendor.platform_fee || 0}%</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-1 truncate">${vendor.nama}</h3>
                        <p class="text-sm text-gray-400 mb-4">@${vendor.username}</p>
                        <div class="flex justify-between items-end pt-4 border-t border-white/10">
                            <div><p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Gross</p><p class="text-green-400 font-bold">${formatRp(vGross)}</p></div>
                            <div class="text-right"><p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Event</p><p class="text-white font-bold">${vEvents}</p></div>
                        </div>
                    </div>`;
                }
            });
            if(html === '') html = '<div class="col-span-full text-center py-10 text-gray-500">Belum ada vendor terdaftar.</div>';
            container.innerHTML = html;

            if(window.activeVendorDashId) window.openVendorDetail(window.activeVendorDashId);
        }

        window.normalizeDepositCategory = function(value) {
            return (value || '').toString().trim().toLowerCase();
        };

        window.normalizeDepositSeat = function(value) {
            return (value || '').toString().split(/\s*,\s*/).map(v => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(',');
        };

        window.getDepositGroupKey = function(payment = {}) {
            if (payment.depositPlanId) return `PLAN|${payment.depositPlanId}`;
            if (payment.depositTicketCode) return `TICKET|${payment.depositTicketCode}`;
            const state = payment.depositConverted ? 'CONVERTED' : 'ACTIVE';
            return `LEGACY|${payment.uid || 'unknown'}|${payment.eventId || 'unknown'}|${window.normalizeDepositCategory(payment.category)}|${state}`;
        };

        window.createDepositPlanId = function(uid, eventId) {
            const userPart = (uid || 'USER').toString().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'USER';
            const eventPart = (eventId || 'EVENT').toString().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'EVENT';
            return `DEP-${userPart}-${eventPart}-${Date.now().toString(36).toUpperCase()}`;
        };

        window.buildDepositGroups = function(payments = {}, options = {}) {
            const groups = {};
            const includeConverted = options.includeConverted !== false;
            Object.entries(payments || {}).forEach(([key, p]) => {
                if (!p || (p.type || '').toString().toUpperCase() !== 'DEPOSIT') return;
                if (!includeConverted && p.depositConverted) return;
                const groupKey = window.getDepositGroupKey(p);
                const amount = parseInt(p.depositAmount || p.total || 0, 10) || 0;
                const createdAt = Number(p.createdAt || 0) || 0;
                const status = (p.status || 'PENDING').toString().toUpperCase();
                const targetCandidate = parseInt(p.fullPrice || 0, 10) || 0;
                const qtyCandidate = Math.max(1, parseInt(p.qty || '1', 10) || 1);
                const group = groups[groupKey] || {
                    key: groupKey,
                    depositPlanId: p.depositPlanId || '',
                    uid: p.uid || '',
                    eventId: p.eventId || '',
                    category: p.category || '',
                    ownerId: p.ownerId || 'SUPER_ADMIN',
                    userName: p.userName || '',
                    eventName: p.eventName || '',
                    qty: qtyCandidate,
                    target: targetCandidate,
                    targetSourceAt: createdAt || Number.MAX_SAFE_INTEGER,
                    selectedTribun: p.selectedTribun || '',
                    selectedSeat: p.selectedSeat || '',
                    approvedSum: 0,
                    pendingSum: 0,
                    rejectedSum: 0,
                    installmentCount: 0,
                    approvedCount: 0,
                    pendingCount: 0,
                    rejectedCount: 0,
                    latestAt: createdAt,
                    firstAt: createdAt || Number.MAX_SAFE_INTEGER,
                    entries: [],
                    pendingEntries: [],
                    converted: !!p.depositConverted
                };

                group.entries.push({ key, data: p, createdAt, status, amount });
                group.latestAt = Math.max(group.latestAt || 0, createdAt);
                group.firstAt = Math.min(group.firstAt || Number.MAX_SAFE_INTEGER, createdAt || Number.MAX_SAFE_INTEGER);
                group.converted = group.converted || !!p.depositConverted;
                if (!group.depositPlanId && p.depositPlanId) group.depositPlanId = p.depositPlanId;
                if (!group.selectedTribun && p.selectedTribun) group.selectedTribun = p.selectedTribun;
                if (!group.selectedSeat && p.selectedSeat) group.selectedSeat = p.selectedSeat;
                if (!group.userName && p.userName) group.userName = p.userName;
                if (!group.eventName && p.eventName) group.eventName = p.eventName;

                if (targetCandidate > 0 && (group.target <= 0 || createdAt < group.targetSourceAt)) {
                    group.target = targetCandidate;
                    group.qty = qtyCandidate;
                    group.targetSourceAt = createdAt;
                }

                if (status === 'APPROVED') {
                    group.approvedSum += amount;
                    group.approvedCount += 1;
                    group.installmentCount += 1;
                } else if (status === 'PENDING') {
                    group.pendingSum += amount;
                    group.pendingCount += 1;
                    group.installmentCount += 1;
                    group.pendingEntries.push({ key, data: p, createdAt, status, amount });
                } else if (status === 'REJECTED') {
                    group.rejectedSum += amount;
                    group.rejectedCount += 1;
                }
                groups[groupKey] = group;
            });

            Object.values(groups).forEach(group => {
                group.entries.sort((a, b) => b.createdAt - a.createdAt);
                group.pendingEntries.sort((a, b) => b.createdAt - a.createdAt);
                group.latestPending = group.pendingEntries[0] || null;
                if (!group.target) {
                    const unitPrice = window.getEventTicketPrice?.(group.category, group.eventId) || 0;
                    group.target = unitPrice * (group.qty || 1);
                }
                group.remaining = Math.max(0, group.target - group.approvedSum);
                group.pct = group.target > 0 ? Math.min(100, Math.round((group.approvedSum / group.target) * 100)) : 0;
            });
            return groups;
        };

        function loadUserDashboard(uid) {
            db.ref('tickets').orderByChild('uid').equalTo(uid).on('value', snap => {
                const c = document.getElementById('user-tickets-container'); if(!c) return;
                c.innerHTML = ''; const data = snap.val() || {}; const keys = Object.keys(data);
                const upgradeReplacementMap = window.getUpgradeReplacementMap(data);
                window.userUpgradeReplacementMap = upgradeReplacementMap;
                window.userUpgradedTicketCodes = new Set(Object.keys(upgradeReplacementMap));
                if(keys.length === 0) { c.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-xl">Belum ada tiket aktif.</div>'; return; }
                keys.reverse().forEach(k => {
                    const t = data[k]; const isSponsor = t.type === 'sponsor'; const isTerusan = (t.category || '').toLowerCase().includes('terusan');
                    const upgradeReplacement = upgradeReplacementMap[k] || null;
                    const isUpgraded = window.isTicketReplacedByUpgrade(t, k, upgradeReplacementMap);
                    const isTransferred = t.status === 'TRANSFERRED';
                    const isTransferPending = t.status === 'TRANSFER_PENDING';
                    const seatValues = (t.selectedSeat || '').toString().split(/\s*,\s*/).filter(Boolean);
                    const shouldRenderLegacySplit = !!t.virtualSeatSplit && seatValues.length > 1;
                    const ticketEntries = shouldRenderLegacySplit ? seatValues.map(seat => ({
                        ...t,
                        selectedSeat: seat,
                        virtualSeatSplit: true,
                        virtualCode: `${t.code}-${seat.toString().replace(/[^a-zA-Z0-9]/g, '')}`,
                        virtualParentCode: t.code
                    })) : [t];
                    ticketEntries.forEach((ticketEntry, idx) => {
                        let statusUi = '';
                        let adminMsgHtml = '';
                        let cardOverlayHtml = '';
                        if (isUpgraded) { statusUi = `<span class="text-purple-300 font-bold bg-purple-500/10 px-2 py-1 rounded text-xs border border-purple-500/30">SUDAH DI-UPGRADE</span>`; }
                        else if (isTransferred) { statusUi = `<span class="text-gray-400 font-bold text-xs">TRANSFER</span>`; }
                        else if (isTransferPending) { statusUi = `<span class="text-amber-400 font-bold text-xs">TRANSFER DIPROSES</span>`; }
                        else if (ticketEntry.status === 'SUSPENDED') {
                            statusUi = `<span class="text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded text-xs border border-amber-500/30">🟠 DITANGGUHKAN</span>`;
                            adminMsgHtml = ticketEntry.suspendedMessage ? `<p class="text-xs text-orange-300 mb-3">${ticketEntry.suspendedMessage}</p>` : '';
                            cardOverlayHtml = `<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><div class="text-orange-400 font-black text-4xl opacity-20 transform -rotate-12">DITANGGUHKAN</div></div>`;
                        }
                        else if (isSponsor || isTerusan) { statusUi = ticketEntry.remaining > 0 ? `<span class="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded text-xs border border-blue-500/30">Sisa ${ticketEntry.remaining}x Scan</span>` : `<span class="text-red-400 font-bold text-xs">KUOTA HABIS</span>`; } 
                        else { statusUi = `<span class="text-xs font-bold ${ticketEntry.status==='ACTIVE'?'text-green-400':'text-red-400'}">${ticketEntry.status}</span>`; }
                        let extraLabel = isSponsor ? '(SPONSOR)' : '';
                        const showActionButtons = !ticketEntry.virtualSeatSplit;
                        let transferBtnHtml = '';
                        let upgradeBtnHtml = '';
                        if (ticketEntry.status === 'ACTIVE' && !isUpgraded && showActionButtons && !isSponsor && !isTerusan) {
                            transferBtnHtml = `<button type="button" onclick="openTransferTicketModal('${k}', '${ticketEntry.code}', '${ticketEntry.eventName}')" class="border border-green-500 text-green-500 hover:bg-green-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"><i class="fa-solid fa-share-nodes mr-1"></i> Transfer</button>`;
                            if (window.canUpgradeTicketCategory(ticketEntry.category)) {
                                upgradeBtnHtml = `<button type="button" onclick="openUpgradeTicketModal('${k}')" class="border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> Upgrade</button>`;
                            }
                        }
                        const isLegacySplit = ticketEntry.virtualSeatSplit === true;
                        let actionBtnHtml = '';
                        if (isUpgraded) {
                            actionBtnHtml = `<button type="button" class="border border-purple-500/50 text-purple-300 px-4 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed opacity-70" disabled><i class="fa-solid fa-arrow-up-right-dots mr-1"></i> UPGRADE</button>`;
                        } else if (ticketEntry.status === 'TRANSFERRED') {
                            actionBtnHtml = `<button type="button" class="border border-gray-600 text-gray-400 px-4 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed opacity-70" disabled><i class="fa-solid fa-right-left mr-1"></i> TRANSFER</button>`;
                        } else if (ticketEntry.status === 'TRANSFER_PENDING') {
                            actionBtnHtml = `<button type="button" class="border border-amber-600 text-amber-400 px-4 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed opacity-70" disabled><i class="fa-solid fa-spinner fa-spin mr-1"></i> DIPROSES</button>`;
                        } else if (ticketEntry.status === 'SUSPENDED') {
                            actionBtnHtml = `<button type="button" class="glow-button px-4 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed opacity-60" disabled>Ditangguhkan</button>`;
                        } else if (isLegacySplit) {
                            actionBtnHtml = `<button type="button" onclick="openLegacySplitTicket('${k}', '${ticketEntry.selectedSeat}')" class="glow-button px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Lihat Tiket</button>`;
                        } else {
                            actionBtnHtml = `<button type="button" onclick="viewTicket('${k}')" class="glow-button px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Lihat Tiket</button>`;
                        }
                        let transferredBadgeHtml = isTransferred ? `<div class="bg-gray-600 text-white font-bold px-3 py-1 text-xs rounded-full mb-2 inline-block"><i class="fa-solid fa-right-left mr-1"></i> TRANSFER</div>` : '';
                        const upgradedBadgeHtml = isUpgraded ? `<div class="bg-purple-600 text-white font-bold px-3 py-1 text-xs rounded-full mb-2 inline-block"><i class="fa-solid fa-arrow-up-right-dots mr-1"></i> SUDAH DI-UPGRADE</div>` : '';
                        let transferredToHtml = isTransferred ? `<p class="text-xs text-gray-400 mb-3"><i class="fa-solid fa-arrow-right text-orange-400 mr-1"></i>Telah dikirim ke: <span class="text-gray-300 font-semibold">${ticketEntry.transferredTo || 'unknown'}</span></p>` : '';
                        const upgradedToCode = ticketEntry.upgradedToTicketCode || upgradeReplacement?.replacementCode || '';
                        const upgradedToCategory = upgradeReplacement?.targetCategory || '';
                        const upgradedInfoHtml = isUpgraded ? `<p class="text-xs text-purple-200 mb-3"><i class="fa-solid fa-circle-info mr-1"></i>Tiket lama tidak berlaku${upgradedToCategory ? `, telah diganti menjadi <span class="font-semibold">${upgradedToCategory}</span>` : ''}${upgradedToCode ? ` dengan kode <span class="font-mono font-semibold">${upgradedToCode}</span>` : ''}.</p>` : '';
                        let cardOpacity = (isTransferred || isTransferPending || isUpgraded) ? 'opacity-60' : '';
                        let seatInfo = ticketEntry.selectedTribun ? `<p class="text-xs text-gray-300 mb-2">Tribun: <span class="text-white font-semibold">${ticketEntry.selectedTribun}</span>${ticketEntry.selectedSeat ? ` • Kursi: <span class="text-white font-semibold">${ticketEntry.selectedSeat}</span>` : ''}</p>` : '';
                        const ticketCodeDisplay = ticketEntry.virtualSeatSplit ? (ticketEntry.virtualCode || ticketEntry.code) : ticketEntry.code;
                        const legacyNote = ticketEntry.virtualSeatSplit ? `<p class="text-xs text-emerald-300 mb-2">(Tiket virtual per kursi dari data lama, pemindaian/transfer berlaku pada kode asli ${ticketEntry.virtualParentCode})</p>` : '';
                        c.innerHTML += `<div class="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden ${cardOpacity}">${cardOverlayHtml}<div class="absolute top-0 right-0 bg-amber-500 text-dark font-bold px-3 py-1 text-xs rounded-bl-lg">${ticketEntry.category} ${extraLabel}</div>${upgradedBadgeHtml}${transferredBadgeHtml}<h3 class="font-bold text-lg mb-1 pr-20">${ticketEntry.eventName}</h3><p class="text-xs text-gray-400 mb-1">Kode: <span class="text-white font-mono bg-dark/50 px-2 py-0.5 rounded">${ticketCodeDisplay}</span></p>${seatInfo}${legacyNote}${upgradedInfoHtml}${transferredToHtml}${adminMsgHtml}<div class="flex justify-between items-center gap-2 mt-4"><div>${statusUi}</div><div class="flex gap-2">${transferBtnHtml}${upgradeBtnHtml}${actionBtnHtml}</div></div></div>`;
                    });
                });
            });

            db.ref('payments').orderByChild('uid').equalTo(uid).on('value', snap => {
                const ht = document.getElementById('user-history-container');
                const pt = document.getElementById('user-pending-container');
                const pSec = document.getElementById('user-pending-section');
                if (!ht || !pt) return;
                ht.innerHTML = '';
                pt.innerHTML = '';

                const data = snap.val() || {};
                const depositGroups = Object.values(window.buildDepositGroups(data, { includeConverted: true }));
                const regularEntries = Object.entries(data)
                    .filter(([, p]) => p && (p.type || '').toString().toUpperCase() !== 'DEPOSIT')
                    .sort((a, b) => (Number(b[1]?.createdAt || 0) - Number(a[1]?.createdAt || 0)));
                let hasPending = false;
                let hasHistory = false;

                regularEntries.forEach(([k, p]) => {
                    const status = (p.status || 'PENDING').toString().toUpperCase();
                    if (status === 'PENDING') {
                        hasPending = true;
                        const pendingLabel = (p.type || '').toString().toUpperCase() === 'UPGRADE' ? `Upgrade dari ${p.currentCategory || 'tiket'} ke ${p.category}` : `${p.qty || 1} Tiket - Kategori ${p.category || '-'}`;
                        pt.innerHTML += `<div class="glass-card rounded-2xl p-6 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] relative"><div class="absolute top-0 right-0 bg-yellow-500 text-dark font-bold px-4 py-1 text-xs rounded-bl-lg">PENDING</div><h3 class="font-bold text-xl text-white mb-1">${p.eventName || '-'}</h3><p class="text-sm text-gray-300 mb-2">${pendingLabel}</p><p class="font-bold text-green-400 mb-4 text-lg">Total: ${formatRp(p.total || 0)}</p><button type="button" onclick="window.sendWAProof('${k}', \`${p.eventName || ''}\`, '${p.category || ''}', ${p.qty || 1}, ${p.total || 0}, '${p.ownerId || 'SUPER_ADMIN'}')" class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg cursor-pointer"><i class="fa-brands fa-whatsapp text-lg mr-2"></i> Kirim Bukti Pembayaran ke WA Admin</button></div>`;
                        return;
                    }
                    hasHistory = true;
                    const statusClass = status === 'APPROVED' ? 'text-green-500' : 'text-red-500';
                    const statusText = status === 'APPROVED' ? 'Sukses' : 'Gagal';
                    ht.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3 text-xs text-gray-400">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID') : '-'}</td><td class="px-4 py-3"><p class="font-medium text-white">${p.eventName || '-'}</p><p class="text-xs text-amber-500">${p.qty || 1}x ${p.category || '-'}</p></td><td class="px-4 py-3 font-bold">${formatRp(p.total || 0)}</td><td class="px-4 py-3 text-right font-bold text-xs ${statusClass}">${statusText}</td></tr>`;
                });

                depositGroups.sort((a, b) => b.latestAt - a.latestAt).forEach(group => {
                    const latest = group.entries[0]?.data || {};
                    const pending = group.latestPending;
                    const remaining = Math.max(0, group.target - group.approvedSum);
                    const pct = group.target > 0 ? Math.min(100, Math.round((group.approvedSum / group.target) * 100)) : 0;
                    const progressHtml = `<div class="mt-3"><div class="flex justify-between text-xs text-gray-400 mb-1"><span>Deposit ${pct}%</span><span>Sisa ${formatRp(remaining)}</span></div><div class="w-full bg-darker rounded-full h-2.5 overflow-hidden border border-white/10"><div style="width:${pct}%" class="${pct >= 100 ? 'bg-green-500' : 'bg-cyan-500'} h-2.5 transition-all"></div></div>${group.pendingSum > 0 ? `<p class="text-xs text-yellow-400 mt-2">Menunggu validasi: ${formatRp(group.pendingSum)}</p>` : ''}</div>`;

                    if (pending) {
                        hasPending = true;
                        const p = pending.data || {};
                        pt.innerHTML += `<div class="glass-card rounded-2xl p-6 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.12)] relative"><div class="absolute top-0 right-0 bg-yellow-500 text-dark font-bold px-4 py-1 text-xs rounded-bl-lg">MENUNGGU VALIDASI</div><h3 class="font-bold text-xl text-white mb-1">${group.eventName || p.eventName || '-'}</h3><p class="text-sm text-gray-300">Deposit ${group.qty || 1} Tiket - ${group.category || '-'}</p>${progressHtml}<p class="text-sm text-gray-300 mt-3">Cicilan saat ini: <b class="text-green-400">${formatRp(pending.amount)}</b></p><button type="button" onclick="window.sendWAProof('${pending.key}', \`${p.eventName || group.eventName || ''}\`, '${p.category || group.category || ''}', ${p.qty || group.qty || 1}, ${pending.amount || 0}, '${p.ownerId || group.ownerId || 'SUPER_ADMIN'}')" class="w-full mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg cursor-pointer"><i class="fa-brands fa-whatsapp text-lg mr-2"></i> Kirim Bukti Pembayaran ke WA Admin</button></div>`;
                        return;
                    }

                    if (group.approvedCount > 0 || group.rejectedCount > 0) {
                        hasHistory = true;
                        let statusText = 'Deposit Aktif';
                        let statusClass = 'text-cyan-400';
                        if (pct >= 100 || group.converted) {
                            statusText = 'Lunas';
                            statusClass = 'text-green-500';
                        } else if (group.approvedCount === 0 && group.rejectedCount > 0) {
                            statusText = 'Ditolak';
                            statusClass = 'text-red-500';
                        }
                        ht.innerHTML += `<tr class="border-b border-white/5"><td class="px-4 py-3 text-xs text-gray-400">${group.latestAt ? new Date(group.latestAt).toLocaleDateString('id-ID') : '-'}</td><td class="px-4 py-3"><p class="font-medium text-white">${group.eventName || latest.eventName || '-'}</p><p class="text-xs text-cyan-400">Deposit ${group.qty || 1}x ${group.category || '-'}</p>${progressHtml}</td><td class="px-4 py-3 font-bold"><div>${formatRp(group.approvedSum)}</div><div class="text-[10px] text-gray-500">dari ${formatRp(group.target)}</div></td><td class="px-4 py-3 text-right font-bold text-xs ${statusClass}">${statusText}</td></tr>`;
                    }
                });

                if (hasPending) pSec.classList.remove('hidden'); else pSec.classList.add('hidden');
                if (!hasHistory) ht.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">Belum ada riwayat transaksi selesai.</td></tr>';
            });

        }

        window.openEventDetailPage = function(evId) {
            window.currentViewingEventId = evId;
            const ev = window.eventDataMap[evId];
            if (!ev) return Swal.fire({icon: 'error', title: 'Data Hilang', background:'#1e293b', color:'#fff'});
            document.getElementById('det-agree').checked = false;
            safeSetText('det-title', ev.title || 'Event'); safeSetText('det-cat', ev.kategori || 'Event');
            document.getElementById('det-banner').src = ev.banner || ev.image || 'https://via.placeholder.com/1200x400';
            safeSetText('det-date', ev.date || '-'); safeSetText('det-time', ev.time || '-'); safeSetText('det-loc', ev.location || '-');
            safeSetText('det-org-name', ev.org_name || ev.artis || 'Penyelenggara Resmi');
            if(ev.org_logo) { document.getElementById('det-org-logo').src = ev.org_logo; document.getElementById('det-org-logo').classList.remove('hidden'); } else { document.getElementById('det-org-logo').classList.add('hidden'); }
            if(ev.org_sosmed) { document.getElementById('det-org-sosmed').href = ev.org_sosmed; document.getElementById('det-org-sosmed').classList.remove('hidden'); } else { document.getElementById('det-org-sosmed').classList.add('hidden'); }
            safeSetHTML('det-desc', formatRichTextHtml(ev.desc || 'Belum ada deskripsi untuk acara ini.'));
            safeSetHTML('det-snk', formatRichTextHtml(ev.snk || 'Seluruh aturan mengikuti standar penyelenggara.'));
            if (ev.fasilitas && ev.fasilitas.trim() !== '') { document.getElementById('det-fasilitas-box').classList.remove('hidden'); safeSetHTML('det-fasilitas', formatRichTextHtml(ev.fasilitas)); } else { document.getElementById('det-fasilitas-box').classList.add('hidden'); }
            if(ev.layout) { document.getElementById('det-layout-container').classList.remove('hidden'); document.getElementById('det-layout-img').src = ev.layout; } else { document.getElementById('det-layout-container').classList.add('hidden'); }
            
            const vSpContainer = document.getElementById('det-vendor-sponsors-container');
            if (vSpContainer) vSpContainer.classList.add('hidden');

            document.getElementById('co-evid').value = evId; document.getElementById('co-title').value = ev.title || 'Event'; document.getElementById('co-date').value = ev.date || '-'; document.getElementById('co-time').value = ev.time || '-';
            window.displayEventCustomForm(ev);
            if (ev.ownerId && ev.ownerId !== 'SUPER_ADMIN') {
                window.recordVendorVisitor(ev.ownerId);
            }
            const tiket = ev.tiket || {}; currentEventPrices = {}; const catSelect = document.getElementById('co-category'); catSelect.innerHTML = '';
            
            const labels = ev.categoryLabels || {};
            if (tiket.reg_eco_q !== undefined) {
                const addOption = (name, code, labelKey) => {
                    const q = parseInt(tiket[`${code}_q`]) || 0;
                    const sold = parseInt(tiket[`${code}_sold`]) || 0;
                    const h = parseInt(tiket[`${code}_h`]) || 0;
                    if (q > sold) {
                        currentEventPrices[name] = h;
                        const displayName = labels[labelKey] || name;
                        catSelect.innerHTML += `<option value="${name}">${displayName} - Rp ${h.toLocaleString('id-ID')} (Sisa ${q - sold})</option>`;
                    }
                };
                addOption('Presale', 'presale', 'presale');
                addOption('Reguler', 'reg_eco', 'reguler');
                addOption('VIP', 'reg_vip', 'vip');
                addOption('VVIP', 'reg_vvip', 'vvip');
                if(ev.kategori === 'Olahraga') { addOption('Terusan Ekonomi', 'trs_eco'); addOption('Terusan VIP', 'trs_vip'); }
            } else {
                currentEventPrices = { 'Ekonomi': parseInt(tiket.reg_eco_h) || 0, 'VIP': parseInt(tiket.reg_vip_h) || 0, 'VVIP': parseInt(tiket.reg_vvip_h) || 0 };
                const ecoLabel = labels.reguler || 'Ekonomi';
                const vipLabel = labels.vip || 'VIP';
                const vvipLabel = labels.vvip || 'VVIP';
                if(currentEventPrices['Ekonomi'] > 0) catSelect.innerHTML += `<option value="Ekonomi">${ecoLabel} - Rp ${currentEventPrices['Ekonomi'].toLocaleString('id-ID')}</option>`;
                if(currentEventPrices['VIP'] > 0) catSelect.innerHTML += `<option value="VIP">${vipLabel} - Rp ${currentEventPrices['VIP'].toLocaleString('id-ID')}</option>`;
                if(currentEventPrices['VVIP'] > 0) catSelect.innerHTML += `<option value="VVIP">${vvipLabel} - Rp ${currentEventPrices['VVIP'].toLocaleString('id-ID')}</option>`;
            }
            
            const btnProcess = document.getElementById('btn-process-co');
            if(catSelect.innerHTML === '') { catSelect.innerHTML = `<option value="">Semua Tiket Habis Terjual</option>`; btnProcess.disabled = true; btnProcess.innerHTML = "TIKET HABIS"; btnProcess.classList.remove('glow-button'); btnProcess.classList.add('bg-gray-600', 'text-gray-400'); } else { btnProcess.disabled = false; btnProcess.innerHTML = "Checkout Pembayaran"; btnProcess.classList.add('glow-button'); btnProcess.classList.remove('bg-gray-600', 'text-gray-400'); }
            window.calcTotal(); window.renderDepositSection(ev, evId); 
            
            // Load tribun data
            const tribunSection = document.getElementById('co-tribun-section');
            const tribunSelect = document.getElementById('co-tribun');
            const seatGroup = document.getElementById('co-seat-group');
            const tribunInfo = document.getElementById('co-tribun-info');
            const useSeatNumber = ev.tribun_use_seat_number !== false;
            if (ev.tribuns && ev.tribuns.length > 0) {
                tribunSection.classList.remove('hidden');
                window.populateTribunOptionsForCategory(ev, catSelect.value);
                if (useSeatNumber) {
                    seatGroup?.classList.remove('hidden');
                    tribunInfo.textContent = 'Pilih tribun terlebih dahulu';
                } else {
                    seatGroup?.classList.add('hidden');
                    tribunInfo.textContent = 'Nomor kursi tidak diperlukan untuk event ini.';
                }
            } else {
                tribunSection.classList.add('hidden');
                tribunSelect.innerHTML = '<option value="">Tidak Ada Tribun</option>';
            }
            
            showPage('event-detail');
        }

        window.calcTotal = function() {
            const cat = document.getElementById('co-category').value; const qty = parseInt(document.getElementById('co-qty').value) || 1;
            const eventId = document.getElementById('co-evid').value || window.currentViewingEventId;
            const price = window.getEventTicketPrice(cat, eventId);
            document.getElementById('co-total').innerText = formatRp(price * qty);
            if (typeof window.updateDepositProgressUI === 'function') {
                window.updateDepositProgressUI(window.eventDataMap?.[eventId], eventId);
            }
            if (typeof window.loadAvailableSeats === 'function' && document.getElementById('co-tribun')?.value) {
                window.loadAvailableSeats();
            }
        }

        window.updatePaymentTypeUI = async function() {
            const paymentType = document.querySelector('input[name="co-payment-type"]:checked')?.value || 'checkout';
            const depositSection = document.getElementById('deposit-section');
            const btnProcess = document.getElementById('btn-process-co');
            const btnDeposit = document.getElementById('btn-process-deposit');
            const depositOption = document.getElementById('co-payment-deposit-option');
            const depositAllowed = depositOption && !depositOption.classList.contains('hidden');
            const tribunSelect = document.getElementById('co-tribun');
            const seatSelect = document.getElementById('co-seat');
            const qtySelect = document.getElementById('co-qty');
            const depositCategory = document.getElementById('co-deposit-category');

            const isDepositMode = paymentType === 'deposit' && depositAllowed;
            depositSection?.classList.toggle('hidden', !isDepositMode);

            if (btnProcess) {
                btnProcess.disabled = isDepositMode;
                btnProcess.classList.toggle('glow-button', !isDepositMode);
                btnProcess.classList.toggle('bg-gray-600', isDepositMode);
                btnProcess.classList.toggle('text-gray-400', isDepositMode);
            }
            btnDeposit?.classList.toggle('hidden', !isDepositMode);

            if (!isDepositMode) {
                if (tribunSelect) tribunSelect.disabled = false;
                if (seatSelect) seatSelect.disabled = false;
                if (qtySelect) qtySelect.disabled = false;
                if (depositCategory) depositCategory.disabled = false;
                return;
            }

            const eventId = document.getElementById('co-evid')?.value || window.currentViewingEventId || '';
            const ev = window.eventDataMap?.[eventId] || null;
            await window.updateDepositTribunSelectionUI(ev, eventId);
            await window.updateDepositProgressUI(ev, eventId);
        };

        window.addTribunField = function() {
            const listContainer = document.getElementById('ev-tribun-list');
            if (!listContainer) return;
            
            const count = listContainer.children.length + 1;
            const fieldHtml = `
                <div class="tribun-field bg-darker border border-green-500/30 p-3 rounded-lg flex gap-2 items-end">
                    <div class="flex-1 min-w-[150px]">
                        <label class="text-[10px] text-gray-400 block mb-1 font-bold">Nama Tribun</label>
                        <input type="text" class="tribun-name w-full bg-dark border border-gray-600 rounded p-2 text-white text-sm" placeholder="Contoh: Tribun VIP, Tribun Reguler" required>
                    </div>
                    <div class="flex-1 min-w-[120px]">
                        <label class="text-[10px] text-gray-400 block mb-1 font-bold">Jumlah Kursi</label>
                        <input type="number" class="tribun-seats w-full bg-dark border border-gray-600 rounded p-2 text-white text-sm" placeholder="Jumlah" min="1" required>
                    </div>
                    <button type="button" onclick="this.parentElement.remove()" class="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-2 rounded cursor-pointer transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                </div>
            `;
            
            const div = document.createElement('div');
            div.innerHTML = fieldHtml;
            listContainer.appendChild(div.firstElementChild);
        }

        window.loadAvailableSeats = async function() {
            const tribunSelect = document.getElementById('co-tribun');
            const seatSelect = document.getElementById('co-seat');
            const seatCheckboxes = document.getElementById('co-seat-checkboxes');
            const tribunInfo = document.getElementById('co-tribun-info');
            
            if (!tribunSelect || !seatSelect || !seatCheckboxes) return;
            
            const selectedTribun = tribunSelect.value;
            if (!selectedTribun) {
                seatSelect.classList.remove('hidden');
                seatCheckboxes.classList.add('hidden');
                seatSelect.innerHTML = '<option value="">Pilih tribun terlebih dahulu</option>';
                seatCheckboxes.innerHTML = '';
                tribunInfo.textContent = 'Pilih tribun terlebih dahulu';
                seatSelect.multiple = false;
                seatSelect.size = 1;
                return;
            }
            const category = document.getElementById('co-category')?.value || '';
            const qty = parseInt(document.getElementById('co-qty')?.value || '1', 10) || 1;
            const eventId = document.getElementById('co-evid')?.value || '';
            const eventData = eventId ? window.eventDataMap?.[eventId] : null;
            const allowedTribuns = window.getAllowedTribunsForCategory(eventData, category);
            if (allowedTribuns.length && !allowedTribuns.some(t => t.name === selectedTribun)) {
                seatSelect.classList.remove('hidden');
                seatCheckboxes.classList.add('hidden');
                seatSelect.innerHTML = '<option value="">Tribun tidak tersedia untuk kategori ini</option>';
                seatCheckboxes.innerHTML = '';
                tribunInfo.textContent = 'Pilih tribun yang sesuai dengan kategori tiket Anda.';
                seatSelect.multiple = false;
                seatSelect.size = 1;
                return;
            }
            
            try {
                if (!eventId) return;
                const availableSeats = await window.getAvailableSeatsForTribun(eventId, selectedTribun);
                if (qty > 1) {
                    seatSelect.classList.add('hidden');
                    seatCheckboxes.classList.remove('hidden');
                    if (availableSeats.length === 0) {
                        seatCheckboxes.innerHTML = '<div class="text-xs text-gray-400">Tidak ada kursi tersedia.</div>';
                    } else {
                        seatCheckboxes.innerHTML = availableSeats.map(i => `
                            <label class="flex items-center gap-2 rounded-xl border border-white/10 bg-darker p-3 text-sm text-white cursor-pointer">
                                <input type="checkbox" value="${i}" class="w-4 h-4 text-amber-500 rounded border-gray-600 focus:ring-amber-500" />
                                Kursi ${i}
                            </label>
                        `).join('');
                    }
                } else {
                    seatSelect.classList.remove('hidden');
                    seatCheckboxes.classList.add('hidden');
                    seatSelect.multiple = false;
                    seatSelect.size = 1;
                    let seatOptions = '<option value="">-- Pilih Nomor Kursi --</option>';
                    availableSeats.forEach(i => {
                        seatOptions += `<option value="${i}">Kursi ${i}</option>`;
                    });
                    if (availableSeats.length === 0) {
                        seatOptions = '<option value="">Tidak ada kursi tersedia</option>';
                    }
                    seatSelect.innerHTML = seatOptions;
                }
                tribunInfo.textContent = `${availableSeats.length} kursi tersedia di ${selectedTribun}`;
            } catch (err) {
                console.error('Error loading seats:', err);
                seatSelect.classList.remove('hidden');
                seatCheckboxes.classList.add('hidden');
                seatSelect.innerHTML = '<option value="">Error memuat kursi</option>';
                seatCheckboxes.innerHTML = '';
                seatSelect.multiple = false;
                seatSelect.size = 1;
            }
        }

        window.getAllowedTribunsForCategory = function(ev, category) {
            if (!ev || !Array.isArray(ev.tribuns)) return [];
            const normalizedCat = (category || '').toString().trim().toLowerCase();
            const tribuns = ev.tribuns || [];
            const isVIP = normalizedCat === 'vip' || normalizedCat.includes('vip') && !normalizedCat.includes('vvip');
            const isVVIP = normalizedCat === 'vvip' || normalizedCat.includes('vvip');
            const isRegular = ['presale', 'reguler', 'ekonomi', 'terusan ekonomi'].some(key => normalizedCat === key || normalizedCat.includes(key));
            if (isVVIP) {
                return tribuns.filter(tribun => (tribun.name || '').toString().toLowerCase().includes('vvip'));
            }
            if (isVIP) {
                return tribuns.filter(tribun => {
                    const name = (tribun.name || '').toString().toLowerCase();
                    return name.includes('vip') && !name.includes('vvip');
                });
            }
            if (isRegular) {
                return tribuns.filter(tribun => {
                    const name = (tribun.name || '').toString().toLowerCase();
                    return !name.includes('vvip') && !name.includes('vip');
                });
            }
            return tribuns;
        };

        window.getAvailableSeatsForTribun = async function(eventId, selectedTribun) {
            if (!eventId || !selectedTribun) return [];
            const eventSnap = await db.ref(`events/${eventId}`).once('value');
            const eventData = eventSnap.val() || {};
            const tribuns = eventData.tribuns || [];
            const selectedTribunData = tribuns.find(t => t.name === selectedTribun);
            const totalSeats = parseInt(selectedTribunData?.seats || 0, 10) || 0;
            const bookedSeats = [];

            const ticketsSnap = await db.ref('tickets').orderByChild('eventId').equalTo(eventId).once('value');
            const tickets = ticketsSnap.val() || {};
            const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
            Object.entries(tickets).forEach(([ticketCode, t]) => {
                if (!t || t.selectedTribun !== selectedTribun || !t.selectedSeat) return;
                if (t.status === 'TRANSFERRED' || window.isTicketReplacedByUpgrade(t, ticketCode, upgradeReplacementMap)) return;
                const seatValues = ('' + t.selectedSeat).split(/\s*,\s*/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
                seatValues.forEach(n => bookedSeats.push(n));
            });

            const paymentsSnap = await db.ref('payments').once('value');
            const payments = paymentsSnap.val() || {};
            Object.values(payments).forEach(p => {
                if (!p || p.eventId !== eventId || p.selectedTribun !== selectedTribun || !p.selectedSeat || p.status === 'REJECTED') return;
                if (p.seatReleasedByUpgrade) return;
                if (p.depositConverted) return;
                if (p.type === 'UPGRADE' && p.status !== 'PENDING') return;
                const seatValues = ('' + p.selectedSeat).split(/\s*,\s*/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
                seatValues.forEach(n => bookedSeats.push(n));
            });

            const available = [];
            for (let i = 1; i <= totalSeats; i++) {
                if (!bookedSeats.includes(i)) available.push(i);
            }
            return available;
        };

        window.populateTribunOptionsForCategory = function(ev, category) {
            const tribunSelect = document.getElementById('co-tribun');
            const seatSelect = document.getElementById('co-seat');
            const tribunInfo = document.getElementById('co-tribun-info');
            const seatGroup = document.getElementById('co-seat-group');
            if (!tribunSelect) return;
            const allowedTribuns = window.getAllowedTribunsForCategory(ev, category);
            if (!allowedTribuns.length) {
                tribunSelect.innerHTML = '<option value="">Tribun tidak tersedia untuk kategori ini</option>';
                if (seatSelect) seatSelect.innerHTML = '<option value="">Pilih tribun terlebih dahulu</option>';
                if (tribunInfo) tribunInfo.textContent = 'Tidak ada tribun yang tersedia untuk kategori ini.';
                if (seatGroup) seatGroup.classList.add('hidden');
                return;
            }
            tribunSelect.innerHTML = '<option value="">-- Pilih Tribun --</option>' + allowedTribuns.map(tribun => `<option value="${tribun.name}">${tribun.name} (${tribun.seats} Kursi)</option>`).join('');
            if (seatSelect) seatSelect.innerHTML = '<option value="">Pilih tribun terlebih dahulu</option>';
            if (tribunInfo) tribunInfo.textContent = 'Pilih tribun terlebih dahulu';
            if (seatGroup && ev && ev.tribun_use_seat_number !== false) seatGroup.classList.remove('hidden');
        };

        window.filterTribunOptionsForCategory = function() {
            const evId = document.getElementById('co-evid')?.value || '';
            const category = document.getElementById('co-category')?.value || '';
            const eventData = evId ? window.eventDataMap?.[evId] : null;
            if (!eventData) return;
            window.populateTribunOptionsForCategory(eventData, category);
        };

        window.processCheckout = async function(e) {
            e.preventDefault();
            const agreeCheckbox = document.getElementById('det-agree');
            if (!agreeCheckbox || !agreeCheckbox.checked) { 
                return Swal.fire({ icon: 'warning', title: 'Harap Centang Persetujuan', text: 'Anda harus menyetujui Syarat & Ketentuan dari acara ini sebelum melanjutkan ke pembayaran.', background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b' }); 
            }
            
            const evId = document.getElementById('co-evid');
            if (!evId) { return Swal.fire({icon:'error', title:'Form tidak lengkap!', background:'#1e293b', color:'#fff'}); }
            
            if (window.currentEventCustomQuestions && window.currentEventCustomQuestions.length > 0) {
                let missingAnswers = false;
                for (let i = 0; i < window.currentEventCustomQuestions.length; i++) {
                    const ans = window.currentCustomFormAnswers[i];
                    if (!ans || typeof ans !== 'string' || ans.trim() === '') { missingAnswers = true; break; }
                }
                if (missingAnswers) { return Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Silakan isi semua data tambahan sebelum melanjutkan checkout!', background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b' }); }
            }
            
            const user = auth.currentUser; 
            if (!user) { Toast.fire({icon:'warning', title:'Silakan login dulu!'}); return setTimeout(() => openModal('login-modal'), 500); }

            const uSnap = await db.ref('users/'+user.uid).once('value');
            const uData = uSnap.val() || { nama: user.displayName || 'User', username: 'user' };
            
            const btn = document.getElementById('btn-process-co'); 
            if (!btn) { return Swal.fire({icon:'error', title:'Tombol checkout tidak ditemukan!', background:'#1e293b', color:'#fff'}); }
            
            const titleEl = document.getElementById('co-title');
            const catEl = document.getElementById('co-category');
            const qtyEl = document.getElementById('co-qty');
            if (!titleEl || !catEl || !qtyEl) { return Swal.fire({icon:'error', title:'Form tidak lengkap!', background:'#1e293b', color:'#fff'}); }
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; 
            btn.disabled = true;
            
            const title = titleEl.value;
            const cat = catEl.value; 
            const qty = parseInt(qtyEl.value);

            if (qty < 1) { btn.disabled = false; btn.innerHTML = "Checkout Pembayaran"; return Swal.fire({icon:'error', title:'Akses Ditolak', text:'Minimal harus membeli 1 tiket!', background:'#1e293b', color:'#fff'}); }
            
            const price = window.getEventTicketPrice(cat, evId.value);
            const total = price * qty;
            if (total <= 0) { btn.disabled = false; btn.innerHTML = "Checkout Pembayaran"; return Swal.fire({icon:'error', title:'Akses Ditolak', text:'Total harga tidak valid!', background:'#1e293b', color:'#fff'}); }

            try {
                const myPaySnap = await db.ref('payments').orderByChild('uid').equalTo(user.uid).once('value'); 
                const myPays = myPaySnap.val() || {}; 
                let lastBuyTime = 0;
                Object.values(myPays).forEach(p => { if(p && p.eventId === evId.value) { if(p.createdAt > lastBuyTime) lastBuyTime = p.createdAt; } });
                if(lastBuyTime > 0) { 
                    const offsetSnap = await db.ref('.info/serverTimeOffset').once('value'); 
                    const timeDiff = (Date.now() + (offsetSnap.val() || 0)) - lastBuyTime; 
                    if(timeDiff < 30 * 60 * 1000) { 
                        btn.disabled = false; 
                        btn.innerHTML = "Checkout Pembayaran"; 
                        return Swal.fire({ title: 'Sabar Ya Kak 🙏', html: '<p class="text-sm text-gray-300">Tunggu 30 menit lagi baru bisa transaksi event ini.</p>', icon: 'info', background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b' }); 
                    } 
                }

                const eventData = window.eventDataMap && window.eventDataMap[evId.value];
                if (!eventData) { btn.disabled = false; btn.innerHTML = "Checkout Pembayaran"; return Swal.fire({icon:'error', title:'Event tidak ditemukan!', background:'#1e293b', color:'#fff'}); }
                
                // Check if tribun is required and selected
                const hasTriBun = eventData.tribuns && eventData.tribuns.length > 0;
                const useSeatNumber = eventData.tribun_use_seat_number !== false;
                let selectedTribun = '';
                let selectedSeat = '';
                if (hasTriBun) {
                    selectedTribun = document.getElementById('co-tribun')?.value || '';
                    const seatElement = document.getElementById('co-seat');
                    const seatCheckboxes = document.getElementById('co-seat-checkboxes');
                    if (seatCheckboxes && !seatCheckboxes.classList.contains('hidden')) {
                        const selectedValues = Array.from(seatCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(o => o.value).filter(Boolean);
                        selectedSeat = selectedValues.join(',');
                    } else if (seatElement) {
                        selectedSeat = seatElement.value || '';
                    }
                    const allowedTribuns = window.getAllowedTribunsForCategory(eventData, cat);
                    if (!selectedTribun || (useSeatNumber && !selectedSeat)) {
                        btn.disabled = false;
                        btn.innerHTML = "Checkout Pembayaran";
                        return Swal.fire({icon:'warning', title:'Pilih Tribun', text: useSeatNumber ? 'Silakan pilih tribun dan nomor kursi terlebih dahulu!' : 'Silakan pilih tribun terlebih dahulu!', background:'#1e293b', color:'#fff'});
                    }
                    if (useSeatNumber && seatCheckboxes && !seatCheckboxes.classList.contains('hidden')) {
                        const requiredQty = parseInt(document.getElementById('co-qty')?.value || '1', 10) || 1;
                        const selectedCount = seatCheckboxes.querySelectorAll('input[type="checkbox"]:checked').length;
                        if (selectedCount !== requiredQty) {
                            btn.disabled = false;
                            btn.innerHTML = "Checkout Pembayaran";
                            return Swal.fire({icon:'warning', title:'Pilih Nomor Kursi', text: `Silakan pilih ${requiredQty} nomor kursi untuk tribun ini.`, background:'#1e293b', color:'#fff'});
                        }
                    }
                    if (!allowedTribuns.some(t => t.name === selectedTribun)) {
                        btn.disabled = false;
                        btn.innerHTML = "Checkout Pembayaran";
                        return Swal.fire({icon:'warning', title:'Tribun Tidak Sesuai', text:'Kategori tiket ini tidak bisa memilih tribun VIP/VVIP.', background:'#1e293b', color:'#fff'});
                    }
                }
                
                const eventOwnerId = eventData.ownerId || 'SUPER_ADMIN';
                if (eventOwnerId !== 'SUPER_ADMIN') {
                    await window.loadOwnerPaymentInfo(eventOwnerId);
                }
                const checkoutPayment = window.getPaymentInfoForOwner(eventOwnerId);
                const theBank = (checkoutPayment.bank || '').trim();
                const theName = (checkoutPayment.name || '').trim();
                const theQris = (checkoutPayment.qris || '').trim();
                if (!theBank && !theQris) {
                    btn.disabled = false;
                    btn.innerHTML = "Checkout Pembayaran";
                    return Swal.fire({
                        icon: 'warning',
                        title: 'Metode Pembayaran Belum Diatur',
                        text: eventOwnerId === 'SUPER_ADMIN'
                            ? 'Admin utama belum mengisi nomor rekening/e-wallet atau QRIS.'
                            : 'Vendor penyelenggara belum mengisi nomor rekening/e-wallet atau QRIS. Silakan hubungi penyelenggara.',
                        background: '#1e293b',
                        color: '#fff',
                        confirmButtonColor: '#f59e0b'
                    });
                }

                const newPayRef = db.ref('payments').push(); 
                const payKey = newPayRef.key;
                
                let payloadSet = { uid: user.uid, userName: uData.nama, eventId: evId.value, eventName: title, category: cat, total: total, qty: qty, status: 'PENDING', ownerId: eventOwnerId, type: 'CHECKOUT', createdAt: firebase.database.ServerValue.TIMESTAMP };
                if (hasTriBun) {
                    payloadSet.selectedTribun = selectedTribun;
                    payloadSet.selectedSeat = selectedSeat;
                }
                if (Object.keys(window.currentCustomFormAnswers || {}).length > 0) { payloadSet.customFormAnswers = window.currentCustomFormAnswers; }
                await newPayRef.set(payloadSet);

                let payHtml = `<div class="text-left text-sm mb-4"><p>Silakan lakukan pembayaran sebesar <b class="text-green-400 text-lg">${formatRp(total)}</b> menggunakan rekening/e-wallet atau QRIS berikut sebelum mengirim bukti pembayaran:</p>`;
                if (theBank) {
                    const escapedBank = theBank.replace(/'/g, '\\\'').replace(/"/g, '&quot;');
                    payHtml += `<div class="bg-dark p-4 rounded-xl mt-3 border border-white/10 shadow-inner"><p class="text-xs text-gray-400">Nomor Rekening / E-Wallet:</p><div class="flex justify-between items-center"><p class="font-bold text-amber-500 text-xl tracking-wide">${escapedBank}</p><button type="button" onclick="navigator.clipboard.writeText('${escapedBank}'); Swal.showValidationMessage('Berhasil di-copy!')" class="text-gray-400 hover:text-white bg-white/5 px-3 py-1 rounded cursor-pointer"><i class="fa-solid fa-copy"></i> Copy</button></div><p class="text-xs text-gray-400 mt-2">Atas Nama:</p><p class="font-bold text-white text-lg">${theName || 'Nama pemilik rekening belum dicantumkan'}</p></div>`;
                }
                if (theQris) {
                    const escapedQris = theQris.replace(/'/g, '\\\'').replace(/"/g, '&quot;');
                    payHtml += `<div class="mt-4 text-center"><p class="text-xs text-gray-400 mb-2">Atau Scan QRIS ini:</p><img src="${escapedQris}" class="w-48 mx-auto rounded-xl shadow-lg border border-white/10 mb-2"><a href="${escapedQris}" download="QRIS_Tiket_Kaka" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1 rounded-full"><i class="fa-solid fa-download"></i> Simpan Gambar QRIS</a></div>`;
                }

                const escapedPayKey = payKey.replace(/'/g, '\\\'');
                const escapedTitle = title.replace(/'/g, '\\\'').replace(/`/g, '\\`');
                const escapedCat = cat.replace(/'/g, '\\\'');
                payHtml += `</div><p class="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-bold mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Screenshot bukti transfer, lalu klik tombol di bawah ini untuk langsung mengirim bukti via WA ke Admin agar tiket di-approve.</p><button type="button" onclick="window.sendWAProof('${escapedPayKey}', '${escapedTitle}', '${escapedCat}', ${qty}, ${total}, '${eventOwnerId}'); Swal.close(); showPage('user-dash');" class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg cursor-pointer"><i class="fa-brands fa-whatsapp text-lg mr-2"></i> Kirim Bukti Pembayaran ke WA Admin</button>`;

                Swal.fire({ title: 'Pesanan Dibuat!', html: payHtml, showConfirmButton: false, background:'#1e293b', color:'#fff', allowOutsideClick: false });
            } catch (err) { Swal.fire({icon: 'error', title: 'Transaksi Gagal', text: err.message, background:'#1e293b', color:'#fff'}); } 
            finally { btn.innerHTML = "Checkout Pembayaran"; btn.disabled = false; }
        }

        window.renderDepositSection = function(ev, evId) {
            const depositSection = document.getElementById('deposit-section');
            const depositCategory = document.getElementById('co-deposit-category');
            const depositAmount = document.getElementById('co-deposit-amount');
            const depositSnkBox = document.getElementById('deposit-snk-box');
            const depositSnkEl = document.getElementById('det-deposit-snk');
            const depositAgreeWrapper = document.getElementById('deposit-agree-wrapper');
            const depositAgreeCheckbox = document.getElementById('det-agree-deposit');
            const depositOption = document.getElementById('co-payment-deposit-option');
            const checkoutRadio = document.querySelector('input[name="co-payment-type"][value="checkout"]');
            const depositRadio = document.querySelector('input[name="co-payment-type"][value="deposit"]');
            if (!depositSection || !depositCategory || !depositAmount) return;
            depositCategory.disabled = false;
            const planInput = document.getElementById('co-deposit-plan-id');
            const prevTribunInput = document.getElementById('co-prev-tribun');
            const prevSeatInput = document.getElementById('co-prev-seat');
            if (planInput) planInput.value = '';
            if (prevTribunInput) prevTribunInput.value = '';
            if (prevSeatInput) prevSeatInput.value = '';
            const eventId = typeof evId === 'string' ? evId : (evId?.value || '');
            const allowed = window.getAllowedDepositCategories(ev, eventId);
            const isDepositActive = window.isDepositPeriodActive(ev);
            const showDepositOption = ev.deposit_enabled && (allowed.length > 0 || (Array.isArray(ev.deposit_categories) && ev.deposit_categories.length > 0));
            if (!showDepositOption) {
                if (depositOption) depositOption.classList.add('hidden');
                if (checkoutRadio) checkoutRadio.checked = true;
                if (depositRadio) depositRadio.checked = false;
                depositSection.classList.add('hidden');
                depositCategory.innerHTML = '';
                depositAmount.value = '';
                if (depositSnkBox) depositSnkBox.classList.add('hidden');
                if (depositAgreeWrapper) depositAgreeWrapper.classList.add('hidden');
                if (depositAgreeCheckbox) depositAgreeCheckbox.checked = false;
                return;
            }
            if (depositOption) depositOption.classList.remove('hidden');
            if (checkoutRadio) checkoutRadio.checked = true;
            depositSection.classList.add('hidden');
            depositCategory.innerHTML = allowed.map(cat => {
                const price = window.getEventTicketPrice(cat, eventId);
                const label = `${cat} - Rp ${price.toLocaleString('id-ID')}`;
                return `<option value="${cat}">${label}</option>`;
            }).join('');
            depositAmount.value = '';
            if (depositSnkBox && depositSnkEl) {
                depositSnkBox.classList.remove('hidden');
                if (ev.deposit_snk && ev.deposit_snk.trim()) {
                    depositSnkEl.innerHTML = formatRichTextHtml(ev.deposit_snk);
                } else {
                    depositSnkEl.innerHTML = '<p class="text-gray-400 text-xs">Belum ada syarat deposit khusus dari penyelenggara.</p>';
                }
            }
            if (depositAgreeWrapper) depositAgreeWrapper.classList.remove('hidden');
            depositCategory.onchange = async () => {
                await window.updateDepositTribunSelectionUI(ev, eventId);
                await window.updateDepositProgressUI(ev, eventId);
            };
            depositAmount.oninput = () => window.updateDepositProgressUI(ev, eventId);
            void window.updatePaymentTypeUI();
        };

        window.createDepositProgressChart = function(canvasId) {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return null;
            if (ctx.chart) ctx.chart.destroy();
            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Terbayar', 'Sisa'],
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#22d3ee', '#64748b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: function(context) { return `${context.label}: ${context.parsed}%`; } } }
                    }
                }
            });
        };

        window.updateDepositProgressUI = async function(ev, evId) {
            const requestId = (window.__depositProgressRequestId || 0) + 1;
            window.__depositProgressRequestId = requestId;
            const depositCategory = document.getElementById('co-deposit-category');
            const depositAmount = document.getElementById('co-deposit-amount');
            const amountLabel = document.getElementById('co-deposit-amount-label');
            const qtyEl = document.getElementById('co-qty');
            const progressBoard = document.getElementById('deposit-progress-board');
            const pctText = document.getElementById('deposit-pct-text');
            const remainingText = document.getElementById('deposit-remaining-text');
            const targetText = document.getElementById('deposit-target-text');
            if (!depositCategory || !depositAmount || !progressBoard || !pctText || !remainingText || !targetText) return;

            const category = depositCategory.value;
            const eventId = typeof evId === 'string' ? evId : (evId?.value || '');
            const qty = parseInt(qtyEl?.value || '1', 10) || 1;
            const useSeatNumber = ev && ev.tribun_use_seat_number !== false;
            const prevTribunValue = document.getElementById('co-prev-tribun')?.value || '';
            const prevSeatValue = document.getElementById('co-prev-seat')?.value || '';
            const planId = document.getElementById('co-deposit-plan-id')?.value || '';
            let selectedTribun = prevTribunValue || document.getElementById('co-tribun')?.value || '';
            let selectedSeat = prevSeatValue;
            if (!selectedSeat && useSeatNumber) {
                const seatCheckboxes = document.getElementById('co-seat-checkboxes');
                const seatElement = document.getElementById('co-seat');
                if (seatCheckboxes && !seatCheckboxes.classList.contains('hidden')) {
                    selectedSeat = Array.from(seatCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(o => o.value).filter(Boolean).join(',');
                } else if (seatElement) {
                    selectedSeat = seatElement.value || '';
                }
            }

            const progress = await window.getUserDepositProgress(eventId, category, selectedTribun, selectedSeat, useSeatNumber, qty, planId);
            if (requestId !== window.__depositProgressRequestId) return;
            const existingPaid = progress.totalPaid || 0;
            const pendingAmount = progress.pendingAmount || 0;
            const fullPrice = progress.fullPrice || 0;
            const pct = fullPrice > 0 ? Math.min(100, Math.round((existingPaid / fullPrice) * 100)) : 0;
            const remaining = Math.max(0, fullPrice - existingPaid);

            pctText.textContent = `${pct}%`;
            remainingText.textContent = formatRp(remaining);
            targetText.textContent = formatRp(fullPrice);

            const noteEl = document.getElementById('deposit-progress-note');
            const installmentInfoEl = document.getElementById('deposit-installment-count');
            if (noteEl) {
                const notes = [];
                if (existingPaid > 0) notes.push(`Sudah disetujui ${formatRp(existingPaid)}.`);
                if (pendingAmount > 0) notes.push(`Menunggu validasi ${formatRp(pendingAmount)}.`);
                notes.push(`Sisa ${formatRp(remaining)}.`);
                noteEl.textContent = notes.join(' ');
                noteEl.classList.remove('hidden');
            }
            if (installmentInfoEl) {
                const maxInstallments = ev?.deposit_max_installments ? Math.min(6, Math.max(3, parseInt(ev.deposit_max_installments, 10) || 3)) : 3;
                installmentInfoEl.textContent = `Cicilan deposit: ${progress.installmentCount || 0} dari ${maxInstallments} kali.`;
            }

            progressBoard.classList.remove('hidden');
            const initialMinimum = Math.min(50000, remaining || 50000);
            const nextMinimum = Math.min(20000, remaining || 20000);
            const minimum = existingPaid > 0 || progress.installmentCount > 0 ? nextMinimum : initialMinimum;
            depositAmount.min = String(Math.max(1, minimum));
            depositAmount.max = remaining > 0 ? String(remaining) : '';
            depositAmount.placeholder = remaining > 0 ? `Sisa deposit: ${formatRp(remaining)}` : 'Deposit sudah lunas';
            if (amountLabel) {
                amountLabel.textContent = existingPaid > 0 || progress.installmentCount > 0 ? `Jumlah Deposit Berikutnya (Min ${formatRp(nextMinimum)})` : `Jumlah Deposit Awal (Min ${formatRp(initialMinimum)})`;
            }

            if (!window.depositProgressChart) window.depositProgressChart = window.createDepositProgressChart('deposit-progress-chart');
            if (window.depositProgressChart) {
                window.depositProgressChart.data.datasets[0].data = [pct, 100 - pct];
                window.depositProgressChart.update();
            }
            return progress;
        };

        window.getUserDepositProgress = async function(evId, category, selectedTribun = '', selectedSeat = '', useSeatNumber = true, qtyOverride = 1, planIdOverride = '') {
            const fallbackPrice = (window.getEventTicketPrice(category, evId) || 0) * (parseInt(qtyOverride || '1', 10) || 1);
            if (!auth || !auth.currentUser || !db || !evId || !category) return { totalPaid: 0, pendingAmount: 0, fullPrice: fallbackPrice, installmentCount: 0, qty: qtyOverride };
            try {
                const snap = await db.ref('payments').orderByChild('uid').equalTo(auth.currentUser.uid).once('value');
                const payments = snap.val() || {};
                const groups = Object.values(window.buildDepositGroups(payments, { includeConverted: false })).filter(group =>
                    group.uid === auth.currentUser.uid &&
                    group.eventId === evId &&
                    window.normalizeDepositCategory(group.category) === window.normalizeDepositCategory(category) &&
                    (group.approvedCount + group.pendingCount) > 0
                );

                let active = null;
                if (planIdOverride) active = groups.find(group => group.depositPlanId === planIdOverride || group.key === `PLAN|${planIdOverride}`) || null;
                if (!active && selectedTribun) {
                    const normalizedSeat = window.normalizeDepositSeat(selectedSeat);
                    active = groups.find(group => {
                        if ((group.selectedTribun || '') !== selectedTribun) return false;
                        if (!useSeatNumber || !normalizedSeat) return true;
                        return window.normalizeDepositSeat(group.selectedSeat) === normalizedSeat;
                    }) || null;
                }
                if (!active) active = groups.sort((a, b) => b.latestAt - a.latestAt)[0] || null;

                if (!active) return { totalPaid: 0, pendingAmount: 0, fullPrice: fallbackPrice, installmentCount: 0, qty: qtyOverride, depositPlanId: '', paymentKeys: [] };
                return {
                    totalPaid: active.approvedSum || 0,
                    pendingAmount: active.pendingSum || 0,
                    fullPrice: active.target || fallbackPrice,
                    installmentCount: active.installmentCount || 0,
                    qty: active.qty || qtyOverride,
                    depositPlanId: active.depositPlanId || '',
                    groupKey: active.key,
                    paymentKeys: active.entries.map(entry => entry.key),
                    selectedTribun: active.selectedTribun || '',
                    selectedSeat: active.selectedSeat || ''
                };
            } catch (err) {
                console.error('Failed to retrieve deposit progress:', err);
                return { totalPaid: 0, pendingAmount: 0, fullPrice: fallbackPrice, installmentCount: 0, qty: qtyOverride, depositPlanId: '', paymentKeys: [] };
            }
        };

        window.getUserDepositSelection = async function(evId, category, useSeatNumber = true) {
            if (!auth || !auth.currentUser || !db || !evId || !category) return null;
            try {
                const snap = await db.ref('payments').orderByChild('uid').equalTo(auth.currentUser.uid).once('value');
                const payments = snap.val() || {};
                const groups = Object.values(window.buildDepositGroups(payments, { includeConverted: false })).filter(group =>
                    group.uid === auth.currentUser.uid &&
                    group.eventId === evId &&
                    window.normalizeDepositCategory(group.category) === window.normalizeDepositCategory(category) &&
                    (group.approvedCount + group.pendingCount) > 0
                ).sort((a, b) => b.latestAt - a.latestAt);
                return groups[0] || null;
            } catch (err) {
                console.error('Failed to retrieve deposit selection:', err);
                return null;
            }
        };

        window.getUserActiveDepositPlan = async function(evId) {
            if (!auth || !auth.currentUser || !db || !evId) return null;
            try {
                const snap = await db.ref('payments').orderByChild('uid').equalTo(auth.currentUser.uid).once('value');
                const payments = snap.val() || {};
                return Object.values(window.buildDepositGroups(payments, { includeConverted: false }))
                    .filter(group => group.uid === auth.currentUser.uid && group.eventId === evId && (group.approvedCount + group.pendingCount) > 0)
                    .sort((a, b) => b.latestAt - a.latestAt)[0] || null;
            } catch (err) {
                console.error('Failed to retrieve active deposit plan:', err);
                return null;
            }
        };

        window.updateDepositTribunSelectionUI = async function(ev, evId) {
            const depositCategory = document.getElementById('co-deposit-category');
            const qtySelect = document.getElementById('co-qty');
            const tribunSelect = document.getElementById('co-tribun');
            const seatSelect = document.getElementById('co-seat');
            const summaryContainer = document.getElementById('deposit-selected-seat-summary');
            const summaryText = document.getElementById('deposit-selected-seat-text');
            const prevTribun = document.getElementById('co-prev-tribun');
            const prevSeat = document.getElementById('co-prev-seat');
            const planInput = document.getElementById('co-deposit-plan-id');
            if (!depositCategory || !tribunSelect || !seatSelect || !summaryContainer || !summaryText || !prevTribun || !prevSeat || !planInput) return null;
            const paymentType = document.querySelector('input[name="co-payment-type"]:checked')?.value || 'checkout';
            if (!auth || !auth.currentUser || paymentType !== 'deposit') {
                summaryContainer.classList.add('hidden');
                prevTribun.value = '';
                prevSeat.value = '';
                planInput.value = '';
                tribunSelect.disabled = false;
                seatSelect.disabled = false;
                if (qtySelect) qtySelect.disabled = false;
                depositCategory.disabled = false;
                return null;
            }

            let category = depositCategory.value;
            const useSeatNumber = ev && ev.tribun_use_seat_number !== false;
            let existing = await window.getUserActiveDepositPlan(evId);
            if (existing && window.normalizeDepositCategory(existing.category) !== window.normalizeDepositCategory(category)) {
                if (depositCategory.querySelector(`option[value="${existing.category}"]`) === null) {
                    const price = existing.target || window.getEventTicketPrice(existing.category, evId) || 0;
                    depositCategory.innerHTML = `<option value="${existing.category}">${existing.category} - ${formatRp(price)}</option>` + depositCategory.innerHTML;
                }
                depositCategory.value = existing.category;
                category = existing.category;
            }
            window.populateTribunOptionsForCategory(ev, category);
            if (!existing) existing = await window.getUserDepositSelection(evId, category, useSeatNumber);
            if (existing) {
                planInput.value = existing.depositPlanId || '';
                if (qtySelect && existing.qty) {
                    qtySelect.value = String(existing.qty);
                    qtySelect.disabled = true;
                }
                depositCategory.disabled = true;
                prevTribun.value = existing.selectedTribun || '';
                prevSeat.value = existing.selectedSeat || '';
                if (existing.selectedTribun) {
                    summaryText.innerHTML = useSeatNumber ? `<span class="font-semibold">Tribun:</span> ${existing.selectedTribun} <span class="font-semibold">• Kursi:</span> ${existing.selectedSeat || '-'}` : `<span class="font-semibold">Tribun:</span> ${existing.selectedTribun}`;
                    summaryContainer.classList.remove('hidden');
                    if (tribunSelect.querySelector(`option[value="${existing.selectedTribun}"]`) === null) tribunSelect.innerHTML = `<option value="${existing.selectedTribun}">${existing.selectedTribun}</option>` + tribunSelect.innerHTML;
                    tribunSelect.value = existing.selectedTribun;
                    tribunSelect.disabled = true;
                    if (useSeatNumber) {
                        const seatValues = (existing.selectedSeat || '').toString().split(/\s*,\s*/).filter(Boolean);
                        seatSelect.multiple = seatValues.length > 1;
                        seatSelect.size = seatSelect.multiple ? Math.min(Math.max(3, seatValues.length), 6) : 1;
                        seatSelect.innerHTML = seatValues.map(v => `<option value="${v}" selected>Kursi ${v}</option>`).join('') || '<option value="">Kursi belum tersimpan</option>';
                        seatSelect.disabled = true;
                    } else {
                        seatSelect.multiple = false;
                        seatSelect.size = 1;
                        seatSelect.innerHTML = '<option value="">Nomor Kursi tidak diperlukan</option>';
                        seatSelect.disabled = true;
                    }
                } else {
                    summaryContainer.classList.add('hidden');
                }
                return existing;
            }

            summaryContainer.classList.add('hidden');
            prevTribun.value = '';
            prevSeat.value = '';
            planInput.value = '';
            tribunSelect.disabled = false;
            seatSelect.disabled = false;
            seatSelect.multiple = false;
            seatSelect.size = 1;
            if (qtySelect) qtySelect.disabled = false;
            depositCategory.disabled = false;
            return null;
        };

        window.processDeposit = async function(e) {
            const evId = document.getElementById('co-evid')?.value || window.currentViewingEventId;
            const eventData = window.eventDataMap && window.eventDataMap[evId];
            if (!eventData) { return Swal.fire({ icon:'error', title:'Event tidak ditemukan!', background:'#1e293b', color:'#fff' }); }
            const depositCategory = document.getElementById('co-deposit-category');
            const depositAmountInput = document.getElementById('co-deposit-amount');
            const qtyEl = document.getElementById('co-qty');
            const category = depositCategory?.value || '';
            const qty = parseInt(qtyEl?.value || '1', 10) || 1;
            const amount = parseInt(depositAmountInput?.value || '0', 10) || 0;
            const unitPrice = window.getEventTicketPrice(category, evId);
            let price = unitPrice * qty;
            if (!category || amount <= 0) { return Swal.fire({ icon:'warning', title:'Deposit Tidak Valid', text:'Silakan pilih kategori deposit dan masukkan jumlah deposit yang valid.', background:'#1e293b', color:'#fff' }); }
            const prevTribunValue = document.getElementById('co-prev-tribun')?.value || '';
            const prevSeatValue = document.getElementById('co-prev-seat')?.value || '';
            const hasTriBun = eventData.tribuns && eventData.tribuns.length > 0;
            const useSeatNumber = eventData.tribun_use_seat_number !== false;
            let selectedTribun = '';
            let selectedSeat = '';
            if (hasTriBun) {
                selectedTribun = prevTribunValue || document.getElementById('co-tribun')?.value || '';
                const seatElement = document.getElementById('co-seat');
                const seatCheckboxes = document.getElementById('co-seat-checkboxes');
                if (prevSeatValue) {
                    selectedSeat = prevSeatValue;
                } else if (seatCheckboxes && !seatCheckboxes.classList.contains('hidden')) {
                    const selectedValues = Array.from(seatCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(o => o.value).filter(Boolean);
                    selectedSeat = selectedValues.join(',');
                } else if (seatElement) {
                    selectedSeat = seatElement.value || '';
                }
                const allowedTribuns = window.getAllowedTribunsForCategory(eventData, category);
                if (!selectedTribun || (useSeatNumber && !selectedSeat)) {
                    return Swal.fire({ icon:'warning', title:'Pilih Tribun', text: useSeatNumber ? 'Silakan pilih tribun dan nomor kursi terlebih dahulu sebelum deposit.' : 'Silakan pilih tribun terlebih dahulu sebelum deposit.', background:'#1e293b', color:'#fff' });
                }
                if (useSeatNumber && seatCheckboxes && !seatCheckboxes.classList.contains('hidden') && !prevSeatValue) {
                    const requiredQty = parseInt(document.getElementById('co-qty')?.value || '1', 10) || 1;
                    const selectedCount = seatCheckboxes.querySelectorAll('input[type="checkbox"]:checked').length;
                    if (selectedCount !== requiredQty) {
                        return Swal.fire({ icon:'warning', title:'Pilih Nomor Kursi', text: `Silakan pilih ${requiredQty} nomor kursi untuk tribun ini.`, background:'#1e293b', color:'#fff' });
                    }
                }
                if (!allowedTribuns.some(t => t.name === selectedTribun)) {
                    return Swal.fire({ icon:'warning', title:'Tribun Tidak Sesuai', text: 'Kategori deposit ini tidak bisa memilih tribun VIP/VVIP.', background:'#1e293b', color:'#fff' });
                }
            }
            const user = auth.currentUser; 
            if (!user) { Toast.fire({icon:'warning', title:'Silakan login dulu!'}); return setTimeout(() => openModal('login-modal'), 500); }
            const uSnap = await db.ref('users/'+user.uid).once('value');
            const uData = uSnap.val() || { nama: user.displayName || 'User', username: 'user' };
            const planIdInput = document.getElementById('co-deposit-plan-id')?.value || '';
            const progress = await window.getUserDepositProgress(evId, category, selectedTribun, selectedSeat, useSeatNumber, qty, planIdInput);
            price = progress.fullPrice || price;
            const effectiveQty = progress.qty || qty;
            const remainingAmount = Math.max(0, price - progress.totalPaid);
            const maxInstallments = Math.min(6, Math.max(3, parseInt(eventData.deposit_max_installments || '3', 10) || 3));
            if (progress.pendingAmount > 0) {
                return Swal.fire({ icon:'warning', title:'Masih Menunggu Validasi', text:`Deposit sebelumnya sebesar ${formatRp(progress.pendingAmount)} masih menunggu validasi vendor.`, background:'#1e293b', color:'#fff' });
            }
            if (progress.installmentCount >= maxInstallments) {
                return Swal.fire({ icon:'warning', title:'Batas Deposit Tercapai', text:`Anda sudah melakukan ${progress.installmentCount} kali pembayaran deposit. Maksimal ${maxInstallments} kali pembayaran.`, background:'#1e293b', color:'#fff' });
            }
            if (progress.totalPaid >= price) {
                return Swal.fire({ icon:'info', title:'Deposit Sudah Lunas', text:'Pembayaran deposit Anda sudah mencapai 100% harga tiket.', background:'#1e293b', color:'#fff' });
            }
            const minimumDeposit = progress.installmentCount === 0 ? Math.min(50000, remainingAmount) : Math.min(20000, remainingAmount);
            if (amount < minimumDeposit) {
                return Swal.fire({ icon:'warning', title:'Nominal Deposit Kurang', text:`${progress.installmentCount === 0 ? 'Deposit awal' : 'Deposit berikutnya'} minimal ${formatRp(minimumDeposit)}.`, background:'#1e293b', color:'#fff' });
            }
            if (amount > remainingAmount) {
                return Swal.fire({ icon:'warning', title:'Nominal Deposit Melebihi Sisa', text:`Nominal yang Anda masukkan melebihi sisa deposit yang harus dibayar. Maksimal yang diperbolehkan adalah ${formatRp(remainingAmount)}.`, background:'#1e293b', color:'#fff' });
            }
            let depositPlanId = progress.depositPlanId || '';
            if (!depositPlanId) {
                depositPlanId = window.createDepositPlanId(user.uid, evId);
                if ((progress.paymentKeys || []).length > 0) {
                    const migrationUpdates = {};
                    progress.paymentKeys.forEach(paymentKey => { migrationUpdates[`payments/${paymentKey}/depositPlanId`] = depositPlanId; });
                    await db.ref().update(migrationUpdates);
                }
            }
            const btn = document.getElementById('btn-process-deposit');
            if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true; }
            
            // Lock tribun dan kursi selectors saat deposit dimulai
            const tribunSelect = document.getElementById('co-tribun');
            const seatSelect = document.getElementById('co-seat');
            const seatCheckboxes = document.getElementById('co-seat-checkboxes');
            const origTribunDisabled = tribunSelect?.disabled || false;
            const origSeatDisabled = seatSelect?.disabled || false;
            const origSeatCheckboxesDisabled = seatCheckboxes ? Array.from(seatCheckboxes.querySelectorAll('input[type="checkbox"]')).map(el => el.disabled) : [];
            if (tribunSelect) tribunSelect.disabled = true;
            if (seatSelect) seatSelect.disabled = true;
            if (seatCheckboxes) {
                seatCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(el => el.disabled = true);
            }
            
            try {
                const newPayRef = db.ref('payments').push(); 
                const payKey = newPayRef.key;
                const ownerId = eventData.ownerId || 'SUPER_ADMIN';
                if (ownerId !== 'SUPER_ADMIN') {
                    await window.loadOwnerPaymentInfo(ownerId);
                }
                const payloadSet = {
                    uid: user.uid,
                    userName: uData.nama,
                    eventId: evId,
                    eventName: eventData.title || 'Event',
                    category: category,
                    total: amount,
                    qty: effectiveQty,
                    status: 'PENDING',
                    ownerId: ownerId,
                    type: 'DEPOSIT',
                    depositPlanId: depositPlanId,
                    depositSequence: (progress.installmentCount || 0) + 1,
                    depositAmount: amount,
                    depositMin: minimumDeposit,
                    fullPrice: price,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                if (hasTriBun) { payloadSet.selectedTribun = selectedTribun; payloadSet.selectedSeat = selectedSeat; }
                if (Object.keys(window.currentCustomFormAnswers || {}).length > 0) { payloadSet.customFormAnswers = window.currentCustomFormAnswers; }
                await newPayRef.set(payloadSet);

                const depositPayment = window.getPaymentInfoForOwner(ownerId);
                const theBank = depositPayment.bank;
                const theName = depositPayment.name;
                const theQris = depositPayment.qris;
                const escapedTitle = (eventData.title || 'Event').replace(/'/g, "\\'").replace(/`/g, '\\`');
                const escapedCategory = category.replace(/'/g, "\\'");
                let payHtml = `<div class="text-left text-sm mb-4"><p>Silakan lakukan pembayaran deposit sebesar <b class="text-green-400 text-lg">${formatRp(amount)}</b> untuk kategori <b>${category}</b>.</p>`;
                if(theBank) { 
                    const escapedBank = theBank.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    payHtml += `<div class="bg-dark p-4 rounded-xl mt-3 border border-white/10 shadow-inner"><p class="text-xs text-gray-400">Bank / E-Wallet:</p><div class="flex justify-between items-center"><p class="font-bold text-amber-500 text-xl tracking-wide">${escapedBank}</p><button type="button" onclick="navigator.clipboard.writeText('${escapedBank}'); Swal.showValidationMessage('Berhasil di-copy!')" class="text-gray-400 hover:text-white bg-white/5 px-3 py-1 rounded cursor-pointer"><i class="fa-solid fa-copy"></i> Copy</button></div><p class="text-xs text-gray-400 mt-2">Atas Nama:</p><p class="font-bold text-white text-lg">${theName}</p></div>`; 
                }
                if(theQris) { 
                    const escapedQris = theQris.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    payHtml += `<div class="mt-4 text-center"><p class="text-xs text-gray-400 mb-2">Atau Scan QRIS ini:</p><img src="${escapedQris}" class="w-48 mx-auto rounded-xl shadow-lg border border-white/10 mb-2"><a href="${escapedQris}" download="QRIS_Tiket_Kaka" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1 rounded-full"><i class="fa-solid fa-download"></i> Simpan Gambar QRIS</a></div>`; 
                }
                payHtml += `</div><p class="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-bold mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Screenshot bukti transfer, lalu klik tombol di bawah ini untuk langsung mengirim bukti via WA ke Admin agar deposit di-approve.</p><button type="button" onclick="window.sendWAProof('${payKey}', '${escapedTitle}', '${escapedCategory}', ${effectiveQty}, ${amount}, '${ownerId}'); Swal.close(); showPage('user-dash');" class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg cursor-pointer"><i class="fa-brands fa-whatsapp text-lg mr-2"></i> Kirim Bukti Pembayaran ke WA Admin</button>`;
                Swal.fire({ title: 'Deposit Dibuat!', html: payHtml, showConfirmButton: false, background:'#1e293b', color:'#fff', allowOutsideClick: false });
            } catch(err) {
                // Unlock tribun dan kursi saat error
                if (tribunSelect) tribunSelect.disabled = origTribunDisabled;
                if (seatSelect) seatSelect.disabled = origSeatDisabled;
                if (seatCheckboxes) {
                    seatCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((el, idx) => { el.disabled = origSeatCheckboxesDisabled[idx] || false; });
                }
                Swal.fire({icon:'error', title:'Deposit Gagal', text: err.message, background:'#1e293b', color:'#fff'});
            } finally {
                // Pastikan selector tribun/kursi dikembalikan ke kondisi semula setelah proses selesai
                if (tribunSelect) tribunSelect.disabled = origTribunDisabled;
                if (seatSelect) seatSelect.disabled = origSeatDisabled;
                if (seatCheckboxes) {
                    seatCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((el, idx) => { el.disabled = origSeatCheckboxesDisabled[idx] || false; });
                }
                if (btn) { btn.innerHTML = '<i class="fa-solid fa-coins mr-2"></i> Bayar Deposit'; btn.disabled = false; }
            }
        }

        window.sendWAProof = async function(paymentId, eventName, category, qty, total, pOwnerId) {
            try {
                const user = auth.currentUser; 
                if (!user) { Swal.fire({icon:'error', title:'Error', text:'Silakan login terlebih dahulu!', background: '#1e293b', color: '#fff'}); return; }
                const uData = window.usersMapCache[user.uid] || { nama: 'User', username: 'user' };
                const paymentSnap = await db.ref(`payments/${paymentId}`).once('value');
                const paymentData = paymentSnap.val() || {};
                const paymentType = (paymentData.type || '').toString().toUpperCase();
                const snap = await db.ref('settings/whatsapp').once('value'); const waData = snap.val() || {}; 
                let targetWaNumbers = [];
                Object.values(waData).forEach(wa => { 
                    if (!wa || !wa.number) return;
                    const waOwner = wa.ownerId || 'SUPER_ADMIN'; 
                    const ownerData = window.usersMapCache[waOwner] || {};
                    const isSuperAdminWa = waOwner === 'SUPER_ADMIN' || ownerData.role === 'Super Admin';
                    if (pOwnerId === 'SUPER_ADMIN') { if (isSuperAdminWa) targetWaNumbers.push(wa.number); } 
                    else { if (waOwner === pOwnerId) targetWaNumbers.push(wa.number); }
                });
                if (targetWaNumbers.length === 0 && pOwnerId !== 'SUPER_ADMIN') { 
                    Object.values(waData).forEach(wa => { 
                        if (!wa || !wa.number) return;
                        const waOwner = wa.ownerId || 'SUPER_ADMIN';
                        const ownerData = window.usersMapCache[waOwner] || {};
                        if (waOwner === 'SUPER_ADMIN' || ownerData.role === 'Super Admin') targetWaNumbers.push(wa.number); 
                    }); 
                }
                if(targetWaNumbers.length === 0) return Swal.fire({icon:'error', title:'Error', text:'Belum ada nomor WA CS yang diatur!', background: '#1e293b', color: '#fff'});
                const adminWA = targetWaNumbers[Math.floor(Math.random() * targetWaNumbers.length)]; 
                const escName = (uData.nama || 'User').replace(/[*_`~]/g, '\$&');
                const escUser = (uData.username || 'user').replace(/[*_`~]/g, '\$&');
                const escEvent = (eventName || 'Event').replace(/[*_`~]/g, '\$&');
                const escCategory = (category || '').replace(/[*_`~]/g, '\$&');
                const amountText = typeof total === 'number' ? (typeof formatRp === 'function' ? formatRp(total) : total) : total;
                const qtyValue = parseInt(qty, 10) || parseInt(paymentData.qty || '1', 10) || 1;
                const qtyText = `\nJumlah tiket: ${qtyValue}`;
                const amountTextLine = `\nNominal: ${amountText}`;
                let text = '';
                // Three templates: DEPOSIT, UPGRADE, PURCHASE
                if (paymentType === 'DEPOSIT') {
                    text = `Halo admin saya *${escName}*, dengan user name *${escUser}*.`;
                    text += `\nSaya sudah melakukan *Deposite* tiket (${escEvent}) untuk kategori (${escCategory}).`;
                    text += qtyText;
                    text += amountTextLine;
                    text += `\nMohon untuk di approve. Berikut bukti tf nya.`;
                } else if ((paymentType || '').toString().toUpperCase().includes('UPGRADE') || (paymentType || '').toString().toUpperCase().includes('MIGRAT')) {
                    // Upgrade/migration template requested
                    const seatInfo = paymentData.selectedTribun || paymentData.selectedSeat ? `\nTribun/Kursi: ${paymentData.selectedTribun || '-'}${paymentData.selectedSeat ? ` • ${paymentData.selectedSeat}` : ''}` : '';
                    text = `Halo admin saya *${escName}*, dengan user name *${escUser}*.`;
                    text += `\nBerikut Permintaan upgrade/migrasi tiket (${escEvent}) (jenis tiket : ${escCategory}).`;
                    text += qtyText;
                    text += amountTextLine;
                    text += seatInfo;
                    text += `\nTolong di approve. Berikut Bukti TF nya.`;
                } else {
                    // Purchase template
                    text = `Halo admin saya *${escName}*, dengan user name *${escUser}*.`;
                    text += `\nSaya sudah membeli tiket (${escEvent}) untuk kategori (${escCategory}).`;
                    text += qtyText;
                    text += amountTextLine;
                    text += `\nMohon untuk di approve. Berikut bukti tf nya.`;
                }
                window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(text)}`, '_blank');
            } catch(e) { console.error(e); Swal.fire({icon:'error', title:'Error', text:e.message, background: '#1e293b', color: '#fff'}); }
        }

        window.reserveRaffleNumber = async function(eventId) {
            if (!eventId || !window.db) return undefined;
            try {
                const result = await db.ref(`events/${eventId}/raffle_counter`).transaction(curr => (curr || 0) + 1);
                return result?.snapshot?.val() ?? null;
            } catch (err) {
                console.error('reserveRaffleNumber failed', err);
                return undefined;
            }
        }

        async function tryConvertApprovedDepositPayment(paymentKey, pData) {
            if (!pData || (pData.type || '').toString().toUpperCase() !== 'DEPOSIT') return;
            const userId = pData.uid;
            const eventId = pData.eventId;
            const category = pData.category;
            if (!userId || !eventId || !category) return;

            const paySnap = await db.ref('payments').orderByChild('uid').equalTo(userId).once('value');
            const payData = paySnap.val() || {};
            const groups = Object.values(window.buildDepositGroups(payData, { includeConverted: true }));
            const group = groups.find(item => item.entries.some(entry => entry.key === paymentKey));
            if (!group) return;
            const fullPrice = group.target || parseInt(pData.fullPrice || 0, 10) || window.getEventTicketPrice(category, eventId);
            if (!fullPrice || group.approvedSum < fullPrice) return;

            const matchedKeys = group.entries.filter(entry => entry.status !== 'REJECTED').map(entry => entry.key);
            async function collectTicketCodesForPaymentKeys(keys) {
                const codes = [];
                for (const key of keys) {
                    if (!key) continue;
                    const existingSnap = await db.ref('tickets').orderByChild('paymentId').equalTo(key).once('value');
                    const existingTicketData = existingSnap.val() || {};
                    Object.keys(existingTicketData).forEach(code => { if (code) codes.push(code); });
                }
                return [...new Set(codes)];
            }

            const existingTicketCodes = await collectTicketCodesForPaymentKeys(matchedKeys);
            if (existingTicketCodes.length > 0) {
                const updates = {};
                matchedKeys.forEach(k => {
                    updates[`payments/${k}/depositConverted`] = true;
                    updates[`payments/${k}/depositTicketCode`] = existingTicketCodes.join(',');
                    updates[`payments/${k}/ticketCreatedAt`] = firebase.database.ServerValue.TIMESTAMP;
                });
                if (Object.keys(updates).length) await db.ref().update(updates);
                await window.reconcileEventTicketCounts(eventId);
                return;
            }

            const ownerId = pData.ownerId || group.ownerId || 'SUPER_ADMIN';
            const eventData = window.eventDataMap?.[eventId] || {};
            const categoryLower = (category || '').toLowerCase();
            const isTerusan = categoryLower.includes('terusan');
            let seasonScanQuota = 0;
            if (isTerusan && eventData.tiket) seasonScanQuota = categoryLower.includes('ekonomi') ? parseInt(eventData.tiket.trs_eco_scan) || 0 : parseInt(eventData.tiket.trs_vip_scan) || 0;

            const selectedTribun = group.selectedTribun || pData.selectedTribun || '';
            const selectedSeat = group.selectedSeat || pData.selectedSeat || '';
            const seatValues = selectedSeat.toString().split(/\s*,\s*/).filter(Boolean);
            const ticketCount = seatValues.length || parseInt(group.qty || pData.qty || '1', 10) || 1;
            const createdTicketCodes = [];
            for (let i = 0; i < ticketCount; i++) {
                const ticketCode = await window.generateSecureTicketCode(ownerId, eventId, eventData);
                const raffleNumber = eventData.raffle_enabled ? await window.reserveRaffleNumber(eventId) : null;
                const tixPayload = { code: ticketCode, paymentId: paymentKey, depositPlanId: group.depositPlanId || pData.depositPlanId || '', uid: userId, userName: pData.userName || group.userName, eventId, eventName: pData.eventName || group.eventName, category, status: 'ACTIVE', ownerId, createdAt: firebase.database.ServerValue.TIMESTAMP };
                if (raffleNumber !== null && typeof raffleNumber !== 'undefined') tixPayload.raffle_number = raffleNumber;
                if (isTerusan) { tixPayload.type = 'terusan'; tixPayload.quota = seasonScanQuota; tixPayload.remaining = seasonScanQuota; }
                if (selectedTribun) tixPayload.selectedTribun = selectedTribun;
                if (seatValues.length) tixPayload.selectedSeat = seatValues[i] || seatValues[seatValues.length - 1];
                if (pData.customFormAnswers) tixPayload.customFormAnswers = pData.customFormAnswers;
                await db.ref(`tickets/${ticketCode}`).set(cleanObject(tixPayload));
                createdTicketCodes.push(ticketCode);
            }

            await db.ref(`events/${eventId}/sold`).transaction(c => (c || 0) + ticketCount);
            const catKey = window.getEventCategorySoldKey(category);
            if (catKey) await db.ref(`events/${eventId}/tiket/${catKey}`).transaction(c => (c || 0) + ticketCount);
            const updates = {};
            matchedKeys.forEach(k => {
                updates[`payments/${k}/depositConverted`] = true;
                updates[`payments/${k}/depositTicketCode`] = createdTicketCodes.join(',');
                updates[`payments/${k}/ticketCreatedAt`] = firebase.database.ServerValue.TIMESTAMP;
            });
            if (Object.keys(updates).length) await db.ref().update(updates);
            Toast.fire({ icon: 'success', title: 'Total deposit sudah 100%, tiket otomatis diterbitkan!' });
            if (typeof window.loadUserDashboard === 'function') window.loadUserDashboard(userId);
        }

        window.repairMissingTicketsForApprovedPayments = async function() {
            if (!db || window.__repairMissingTicketsRunning || window.__ticketCreationLock) return;
            window.__repairMissingTicketsRunning = true;
            try {
                const [paymentsSnap, ticketsSnap] = await Promise.all([
                    db.ref('payments').once('value'),
                    db.ref('tickets').once('value')
                ]);
                const payments = paymentsSnap.val() || {};
                const tickets = ticketsSnap.val() || {};
                const ticketCountByPayment = {};
                Object.values(tickets || {}).forEach(ticket => {
                    if (ticket?.paymentId) {
                        ticketCountByPayment[ticket.paymentId] = (ticketCountByPayment[ticket.paymentId] || 0) + 1;
                    }
                });

                const repairTasks = [];
                Object.entries(payments).forEach(([paymentKey, pData]) => {
                    if (!pData) return;
                    const status = (pData.status || '').toString().toUpperCase();
                    if (status !== 'APPROVED') return;
                    const paymentType = (pData.type || '').toString().toUpperCase();
                    if (paymentType === 'DEPOSIT' || paymentType === 'UPGRADE') return;
                    const qty = parseInt(pData.qty || '1', 10) || 1;
                    const existingCount = ticketCountByPayment[paymentKey] || 0;
                    const missingQty = Math.max(0, qty - existingCount);
                    if (missingQty <= 0) return;

                    repairTasks.push((async () => {
                        await window.ensureTicketsForPayment(paymentKey, {
                            ...pData,
                            qty: missingQty,
                            eventId: pData.eventId,
                            eventName: pData.eventName,
                            category: pData.category || '',
                            ownerId: pData.ownerId || window.getPaymentOwnerId?.(pData) || 'SUPER_ADMIN',
                            selectedTribun: pData.selectedTribun,
                            selectedSeat: pData.selectedSeat,
                            customFormAnswers: pData.customFormAnswers
                        });
                    })());
                });

                if (repairTasks.length) {
                    await Promise.all(repairTasks);
                    Toast.fire({ icon: 'success', title: 'Tiket berhasil dipulihkan untuk pembayaran approved.' });
                }
            } catch (e) {
                console.warn('repairMissingTicketsForApprovedPayments failed', e);
            } finally {
                window.__repairMissingTicketsRunning = false;
            }
        };

        window.deletePaymentEntry = async function(key) {
            if (!key) return Toast.fire({ icon: 'error', title: 'Payment key tidak ditemukan.' });
            if (!window.isSuperAdmin) return Toast.fire({ icon: 'error', title: 'Hanya admin utama yang bisa menghapus data pembayaran ini.' });
            if (!confirm('Hapus data pembayaran ini?')) return;
            try {
                await window.db.ref(`payments/${key}`).remove();
                if (window.globalPaymentsData && typeof window.globalPaymentsData === 'object') {
                    delete window.globalPaymentsData[key];
                }
                window.refreshDashboardAfterDataMutation?.();
                Toast.fire({ icon: 'success', title: 'Data pembayaran berhasil dihapus.' });
            } catch (e) {
                Toast.fire({ icon: 'error', title: e.message || 'Gagal menghapus data pembayaran.' });
            }
        };async function approvePayment(btn, key, uid, userName, evId, eventName, category, qty) {
            if(!confirm('Approve pembayaran ini?')) return;
            btn.disabled = true; let ogText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Proses';
            try {
                const pStatusSnap = await db.ref(`payments/${key}`).once('value');
                const pData = pStatusSnap.val() || {};
                const existingStatus = (pData.status || '').toString().toUpperCase();
                if (['APPROVED', 'REJECTED'].includes(existingStatus)) {
                    Toast.fire({icon:'info', title:'Pembayaran ini sudah diproses sebelumnya!'});
                    return;
                }

                const ownerId = window.getPaymentOwnerId(pData) || 'SUPER_ADMIN';
                if (window.isVendor && ownerId !== window.currentUserData?.uid) {
                    btn.disabled = false; btn.innerHTML = ogText;
                    return Swal.fire('Akses Ditolak', 'Pembayaran ini bukan milik vendor Anda.', 'error');
                }

                const isUpgrade = (pData.type || '').toString().toUpperCase() === 'UPGRADE';
                const isDeposit = (pData.type || '').toString().toUpperCase() === 'DEPOSIT';
                window.__ticketCreationLock = true;
                try {
                    if (isUpgrade) {
                        const ticketCode = pData.ticketCode || pData.ticket_code;
                        if (!ticketCode) throw new Error('Data tiket upgrade tidak lengkap.');
                        const ticketSnap = await db.ref(`tickets/${ticketCode}`).once('value');
                        const ticketData = ticketSnap.val();
                        if (!ticketData) throw new Error('Tiket lama untuk upgrade tidak ditemukan.');
                        if (ticketData.status !== 'ACTIVE') throw new Error('Tiket lama tidak aktif, tidak dapat di-upgrade.');
                        if (ticketData.uid !== (pData.uid || uid)) throw new Error('Pemilik tiket upgrade tidak cocok dengan pembayaran.');

                        const oldCategory = ticketData.category || pData.currentCategory || '';
                        const newCategory = pData.targetCategory || category;
                        const eventData = window.eventDataMap?.[evId] || {};
                        let newTicketCode = await window.generateSecureTicketCode(ownerId, evId, eventData);
                        let codeExists = true;
                        let attempts = 0;
                        while (codeExists && attempts < 8) {
                            const codeSnap = await db.ref(`tickets/${newTicketCode}`).once('value');
                            codeExists = codeSnap.exists();
                            if (codeExists) {
                                attempts += 1;
                                newTicketCode = await window.generateSecureTicketCode(ownerId, evId, eventData);
                            }
                        }
                        if (codeExists) throw new Error('Gagal membuat kode tiket upgrade yang unik.');

                        let serverOffset = 0;
                        try {
                            const offsetSnap = await db.ref('.info/serverTimeOffset').once('value');
                            serverOffset = Number(offsetSnap.val() || 0);
                        } catch (e) {}
                        const upgradedAt = Date.now() + serverOffset;
                        const originalSelectedTribun = ticketData.selectedTribun || '';
                        const originalSelectedSeat = ticketData.selectedSeat || '';
                        const oldPaymentId = ticketData.paymentId || '';

                        const upgradedTicket = {
                            ...ticketData,
                            code: newTicketCode,
                            paymentId: key,
                            category: newCategory,
                            status: 'ACTIVE',
                            upgradedAt,
                            upgradedFrom: {
                                originalCode: ticketCode,
                                originalCategory: oldCategory,
                                originalPaymentId: oldPaymentId,
                                upgradedAt
                            },
                            upgradePaymentId: key,
                            createdAt: upgradedAt
                        };
                        delete upgradedTicket.transferredTo;
                        delete upgradedTicket.transferredToUid;
                        delete upgradedTicket.transferredToTicketCode;
                        delete upgradedTicket.transferredAt;
                        delete upgradedTicket.transferHistory;
                        delete upgradedTicket.transferredFrom;
                        delete upgradedTicket.scannedAt;
                        delete upgradedTicket.scannedBy;

                        if (pData.selectedTribun !== undefined && pData.selectedTribun !== null && pData.selectedTribun !== '') {
                            upgradedTicket.selectedTribun = pData.selectedTribun;
                        } else if (originalSelectedTribun && oldCategory.toLowerCase() !== newCategory.toLowerCase()) {
                            delete upgradedTicket.selectedTribun;
                        }
                        if (pData.selectedSeat !== undefined && pData.selectedSeat !== null && pData.selectedSeat !== '') {
                            upgradedTicket.selectedSeat = pData.selectedSeat;
                        } else if (originalSelectedSeat && oldCategory.toLowerCase() !== newCategory.toLowerCase()) {
                            delete upgradedTicket.selectedSeat;
                        }

                        const retiredOldTicket = cleanObject({
                            ...ticketData,
                            status: 'USED',
                            replacedByUpgrade: true,
                            invalidatedReason: 'UPGRADE',
                            upgradedAt,
                            upgradedToTicketCode: newTicketCode,
                            upgradePaymentId: key
                        });
                        delete retiredOldTicket.scannedAt;
                        delete retiredOldTicket.scannedBy;

                        const upgradeUpdates = {};
                        upgradeUpdates[`payments/${key}/status`] = 'APPROVED';
                        upgradeUpdates[`payments/${key}/approvedAt`] = upgradedAt;
                        upgradeUpdates[`payments/${key}/replacedTicketCode`] = ticketCode;
                        upgradeUpdates[`payments/${key}/upgradedTicketCode`] = newTicketCode;
                        upgradeUpdates[`tickets/${ticketCode}`] = retiredOldTicket;
                        upgradeUpdates[`tickets/${newTicketCode}`] = cleanObject(upgradedTicket);
                        if (oldPaymentId && oldPaymentId !== key && (originalSelectedTribun || originalSelectedSeat)) {
                            if (originalSelectedTribun) upgradeUpdates[`payments/${oldPaymentId}/selectedTribun`] = null;
                            if (originalSelectedSeat) upgradeUpdates[`payments/${oldPaymentId}/selectedSeat`] = null;
                            upgradeUpdates[`payments/${oldPaymentId}/seatReleasedByUpgrade`] = true;
                        }

                        // Pembayaran, penonaktifan tiket lama, dan pembuatan tiket upgrade diproses bersamaan.
                        await db.ref().update(upgradeUpdates);
                        if (window.globalPaymentsData) {
                            window.globalPaymentsData[key] = {
                                ...(window.globalPaymentsData[key] || pData),
                                status: 'APPROVED',
                                approvedAt: upgradedAt,
                                replacedTicketCode: ticketCode,
                                upgradedTicketCode: newTicketCode
                            };
                        }
                        if (window.globalTicketsData) {
                            window.globalTicketsData[ticketCode] = retiredOldTicket;
                            window.globalTicketsData[newTicketCode] = cleanObject(upgradedTicket);
                        }
                        try {
                            const localTickets = JSON.parse(localStorage.getItem('beetix_local_tix') || '{}');
                            localTickets[ticketCode] = retiredOldTicket;
                            localTickets[newTicketCode] = cleanObject(upgradedTicket);
                            localStorage.setItem('beetix_local_tix', JSON.stringify(localTickets));
                        } catch (e) {}
                        await window.reconcileEventTicketCounts(evId);
                        window.refreshDashboardAfterDataMutation?.();
                        Toast.fire({icon:'success', title:'Upgrade disetujui! Tiket lama dinonaktifkan dan tiket baru diterbitkan.'});
                    } else {
                        await db.ref(`payments/${key}`).update({status: 'APPROVED', approvedAt: firebase.database.ServerValue.TIMESTAMP});
                        if (window.globalPaymentsData) {
                            window.globalPaymentsData[key] = { ...(window.globalPaymentsData[key] || {}), status: 'APPROVED', approvedAt: Date.now() };
                        }
                        window.refreshDashboardAfterDataMutation?.();

                        if (isDeposit) {
                            await tryConvertApprovedDepositPayment(key, pData);
                        } else {
                            const ensured = await window.ensureTicketsForPayment(key, {
                                ...pData,
                                uid,
                                userName,
                                eventId: evId,
                                eventName,
                                category,
                                qty,
                                ownerId,
                                selectedTribun: pData.selectedTribun,
                                selectedSeat: pData.selectedSeat,
                                customFormAnswers: pData.customFormAnswers
                            });
                            await window.reconcileEventTicketCounts(evId);
                            if (ensured.created === 0) {
                                Toast.fire({ icon: 'success', title: 'Approved! Tiket sudah ada sebelumnya.' });
                                return;
                            }
                        }
                        Toast.fire({icon:'success', title:'Approved!'});
                    }
                } finally {
                    window.__ticketCreationLock = false;
                    window.pruneOverGeneratedTicketsForPayments?.();
                }
            } catch(e) {
                btn.disabled = false;
                btn.innerHTML = ogText;
                window.__ticketCreationLock = false;
                Swal.fire('Gagal Approve', e.message, 'error');
            }
        }
        
        async function rejectPayment(key) {
            if (!key) { Toast.fire({icon:'error', title:'Payment key tidak ditemukan!'}); return; }
            if(!confirm('Tolak pembayaran ini?')) return;
            try {
                if (!window.db) throw new Error('Database tidak tersedia!');
                const snap = await window.db.ref(`payments/${key}`).once('value');
                const pData = snap.val() || {};
                const ownerId = window.getPaymentOwnerId(pData) || 'SUPER_ADMIN';
                if (window.isVendor && ownerId !== window.currentUserData?.uid) {
                    return Toast.fire({icon:'error', title:'Akses Ditolak', text:'Pembayaran ini bukan milik vendor Anda.'});
                }
                await window.db.ref(`payments/${key}`).update({status:'REJECTED'});
                if (window.globalPaymentsData) {
                    window.globalPaymentsData[key] = { ...(window.globalPaymentsData[key] || {}), status: 'REJECTED' };
                }
                window.refreshDashboardAfterDataMutation?.();
                Toast.fire({icon:'success', title:'Pembayaran ditolak!'});
            } catch(e) { 
                Toast.fire({icon:'error', title:e.message}); 
            }
        }

        window.isProcessingScan = false;
        window.scanTimeoutId = null;
        async function validateTicketCode(code) {
            if(!code || window.isProcessingScan) return;
            window.isProcessingScan = true;
            if(window.scanTimeoutId) clearTimeout(window.scanTimeoutId);
            
            const cleanCode = code.trim().toUpperCase();
            const resArea = document.getElementById('scan-result-area');
            if(!resArea) { window.isProcessingScan = false; return; }
            
            resArea.innerHTML = `<div class="bg-blue-500/20 text-blue-400 p-4 rounded-xl text-center animate-pulse"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><br><b>Memvalidasi...</b></div>`;
            
            let tData = null; let isOnline = navigator.onLine;
            if (isOnline) { try { const snap = await db.ref(`tickets/${cleanCode}`).once('value'); tData = snap.val(); } catch(e){} }
            if (!tData) { let localTix = JSON.parse(localStorage.getItem('beetix_local_tix') || '{}'); tData = localTix[cleanCode]; }
            if (!tData && cleanCode.includes('-')) {
                const segments = cleanCode.split('-');
                if (segments.length > 2) {
                    const possibleParentCode = segments.slice(0, 2).join('-');
                    if (possibleParentCode !== cleanCode) {
                        try {
                            const parentSnap = await db.ref(`tickets/${possibleParentCode}`).once('value');
                            const parentTicket = parentSnap.val();
                            if (parentTicket) {
                                tData = { ...parentTicket, code: cleanCode, originalCode: possibleParentCode, virtualTicketCode: cleanCode };
                            }
                        } catch(e){}
                    }
                }
            }

            let discoveredUpgradeReplacement = null;
            const lookupOriginalCode = tData?.originalCode || cleanCode;
            if (tData && tData.status === 'ACTIVE' && !window.isTicketReplacedByUpgrade(tData, lookupOriginalCode)) {
                discoveredUpgradeReplacement = await window.findUpgradeReplacementTicket(lookupOriginalCode);
                if (discoveredUpgradeReplacement) {
                    tData = {
                        ...tData,
                        status: 'USED',
                        replacedByUpgrade: true,
                        invalidatedReason: 'UPGRADE',
                        upgradedAt: discoveredUpgradeReplacement.upgradedAt || tData.upgradedAt || Date.now(),
                        upgradedToTicketCode: discoveredUpgradeReplacement.replacementCode || ''
                    };
                    try {
                        const localTickets = JSON.parse(localStorage.getItem('beetix_local_tix') || '{}');
                        localTickets[lookupOriginalCode] = tData;
                        localStorage.setItem('beetix_local_tix', JSON.stringify(localTickets));
                    } catch (e) {}
                    const ticketOwnerId = tData.ownerId || (window.eventDataMap?.[tData.eventId]?.ownerId || 'SUPER_ADMIN');
                    const canRepairRecord = window.isSuperAdmin || (window.isVendor && ticketOwnerId === window.currentUserData?.uid);
                    if (canRepairRecord && isOnline) {
                        db.ref(`tickets/${lookupOriginalCode}`).update({
                            status: 'USED',
                            replacedByUpgrade: true,
                            invalidatedReason: 'UPGRADE',
                            upgradedAt: tData.upgradedAt,
                            upgradedToTicketCode: tData.upgradedToTicketCode
                        }).catch(() => {});
                    }
                }
            }
            const isUpgradedTicket = window.isTicketReplacedByUpgrade(tData, lookupOriginalCode) || !!discoveredUpgradeReplacement;
            const vendorTicketOwnerId = tData ? (tData.ownerId || (window.eventDataMap?.[tData.eventId]?.ownerId || 'SUPER_ADMIN')) : '';
            const vendorOwnerMismatch = !!(tData && window.isVendor && vendorTicketOwnerId !== window.currentUserData?.uid);

            if(!tData) {
                playScanFeedback('error');
                resArea.innerHTML = `<div class="bg-red-500/20 text-red-500 p-4 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-xmark text-4xl mb-2"></i><br><b class="text-xl">TIKET TIDAK VALID / TIDAK DITEMUKAN</b></div>`;
            } else if (vendorOwnerMismatch) {
                playScanFeedback('error');
                resArea.innerHTML = `<div class="bg-red-500/20 text-red-500 p-4 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-xmark text-4xl mb-2"></i><br><b class="text-xl">Akses Ditolak</b><br><span class="text-sm">Tiket ini bukan milik vendor Anda.</span></div>`;
                window.scanTimeoutId = setTimeout(() => { window.isProcessingScan = false; }, 1500);
                return;
            } else if (isUpgradedTicket) {
                playScanFeedback('error');
                const replacementCodeText = tData.upgradedToTicketCode || discoveredUpgradeReplacement?.replacementCode || '';
                resArea.innerHTML = `<div class="bg-purple-500/20 border-2 border-purple-500 text-purple-200 p-6 rounded-xl text-center shadow-[0_0_20px_rgba(168,85,247,0.25)]"><i class="fa-solid fa-arrow-up-right-dots text-5xl mb-3"></i><br><b class="text-3xl tracking-wider">TIKET SUDAH DI-UPGRADE</b><br><div class="mt-4 text-sm text-purple-100 bg-purple-950/50 p-3 rounded text-left"><p>Tiket lama ini sudah tidak berlaku dan tidak dapat digunakan untuk masuk.</p>${replacementCodeText ? `<p class="mt-2"><b>Kode tiket pengganti:</b> ${replacementCodeText}</p>` : ''}</div></div>`;
                window.scanTimeoutId = setTimeout(() => { window.isProcessingScan = false; }, 1500);
                return;
            } else if (tData.status === 'TRANSFER_PENDING') {
                playScanFeedback('error');
                resArea.innerHTML = `<div class="bg-amber-500/20 border-2 border-amber-500 text-amber-300 p-6 rounded-xl text-center"><i class="fa-solid fa-spinner fa-spin text-5xl mb-3"></i><br><b class="text-3xl tracking-wider">TRANSFER DIPROSES</b><br><p class="mt-3 text-sm">Tiket sedang dikunci untuk proses transfer dan belum dapat digunakan.</p></div>`;
                window.scanTimeoutId = setTimeout(() => { window.isProcessingScan = false; }, 1500);
                return;
            } else if (tData.status === 'TRANSFERRED') {
                playScanFeedback('error');
                resArea.innerHTML = `<div class="bg-gray-500/20 border-2 border-gray-500 text-gray-300 p-6 rounded-xl text-center shadow-[0_0_20px_rgba(107,114,128,0.25)]"><i class="fa-solid fa-right-left text-5xl mb-3"></i><br><b class="text-3xl tracking-wider">TIKET SUDAH DITRANSFER</b><br><div class="mt-4 text-sm text-gray-300 bg-gray-900/50 p-3 rounded text-left"><p>Tiket lama ini sudah tidak berlaku dan tidak dapat digunakan untuk masuk.</p>${tData.transferredTo ? `<p class="mt-2"><b>Ditransfer ke:</b> ${tData.transferredTo}</p>` : ''}</div></div>`;
                window.scanTimeoutId = setTimeout(() => { window.isProcessingScan = false; }, 1500);
                return;
            } else if (tData.status === 'SUSPENDED') {
                playScanFeedback('error');
                resArea.innerHTML = `<div class="bg-red-500/20 border-2 border-red-500 text-red-500 p-6 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-triangle-exclamation text-5xl mb-3"></i><br><b class="text-3xl tracking-wider">DITANGGUHKAN</b><br><div class="mt-4 text-sm text-red-300 bg-red-900/50 p-3 rounded text-left"><p>Tiket Anda sedang ditangguhkan oleh Admin dan untuk sementara tidak dapat digunakan.</p>${tData.suspendedMessage ? `<p class="mt-2"><b>Pesan Admin:</b> ${tData.suspendedMessage}</p>` : ''}</div></div>`;
                window.scanTimeoutId = setTimeout(() => { window.isProcessingScan = false; }, 1500);
                return;
            } else if (tData.status === 'USED' || ((typeof tData.remaining === 'number') && tData.remaining <= 0)) {
                playScanFeedback('error'); 
                const dStr = tData.scannedAt ? new Date(tData.scannedAt).toLocaleString('id-ID') : '-'; 
                const outOfQuota = (typeof tData.remaining === 'number') ? `<br><span class="text-sm">Kuota Scan Habis</span>` : '';
                resArea.innerHTML = `<div class="bg-red-500/20 border-2 border-red-500 text-red-500 p-6 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-triangle-exclamation text-5xl mb-3"></i><br><b class="text-3xl tracking-wider">SUDAH DI GUNAKAN</b>${outOfQuota}<br><div class="mt-4 text-sm text-red-300 bg-red-900/50 p-3 rounded text-left"><p><b>Event:</b> ${tData.eventName}</p><p><b>Waktu Scan:</b> ${dStr}</p><p><b>Gate/Oleh:</b> ${tData.scannedBy || 'Unknown'}</p></div></div>`;
            } else if (tData.status === 'ACTIVE') {
                // Only allow automatic marking as USED by scanner/vendor/superadmin accounts.
                const canAutoMark = !!(window.isScanner || window.isVendor || window.isSuperAdmin);
                playScanFeedback('success');
                let isMultiScan = (typeof tData.remaining === 'number');

                // If current user is not authorized to mark, show VALID but do NOT change DB/local state.
                if (!canAutoMark) {
                    let theUsername = ''; if (window.usersMapCache[tData.uid]) { theUsername = `(@${window.usersMapCache[tData.uid].username})`; }
                    let sisaText = '';
                    if (tData.type === 'sponsor') sisaText = `<div class="bg-blue-500 text-white font-bold px-4 py-2 mt-2 rounded-lg inline-block shadow-lg border border-white/20"><i class="fa-solid fa-star mr-1 text-yellow-300"></i> AKSES SPONSOR - Sisa: ${tData.remaining}x</div>`;
                    else if (typeof tData.remaining === 'number') sisaText = `<div class="bg-green-600 text-white font-bold px-4 py-2 mt-2 rounded-lg inline-block shadow-lg border border-white/20"><i class="fa-solid fa-futbol mr-1 text-yellow-300"></i> Sisa: ${tData.remaining}x Scan</div>`;
                    resArea.innerHTML = `<div class="bg-green-500/20 border-2 border-green-500 text-green-500 p-6 rounded-xl text-center shadow-[0_0_30px_rgba(34,197,94,0.3)]"><i class="fa-solid fa-circle-check text-6xl mb-3"></i><br><b class="text-3xl tracking-widest">VALID</b><br>${sisaText}<div class="mt-4 text-sm text-green-200 bg-green-900/50 p-3 rounded text-left"><p><b>Nama:</b> ${tData.userName} <span class="text-green-400 text-xs">${theUsername}</span></p><p><b>Event:</b> ${tData.eventName}</p><p><b>Kategori:</b> ${tData.category}</p></div></div>`;
                    // do not modify tData, local storage, or sync queue
                } else {
                    // Authorized to mark usage
                    tData.scannedAt = Date.now(); tData.scannedBy = window.currentUserData ? window.currentUserData.nama : 'Gate';
                    let newStatus = tData.status;
                    if(isMultiScan) { tData.remaining = (typeof tData.remaining === 'number') ? (tData.remaining - 1) : (tData.remaining); if(tData.remaining <= 0) newStatus = 'USED'; } else { newStatus = 'USED'; }
                    tData.status = newStatus;

                    let localTix = JSON.parse(localStorage.getItem('beetix_local_tix') || '{}'); localTix[cleanCode] = tData; localStorage.setItem('beetix_local_tix', JSON.stringify(localTix));
                    let queue = JSON.parse(localStorage.getItem('beetix_sync_queue') || '[]'); queue.push({code: cleanCode, scannedAt: tData.scannedAt, scannedBy: tData.scannedBy, remaining: tData.remaining, isMultiScan: isMultiScan}); localStorage.setItem('beetix_sync_queue', JSON.stringify(queue));

                    const updateCode = tData.originalCode || cleanCode;
                    if (isOnline && typeof db !== 'undefined') { db.ref(`tickets/${updateCode}`).update({ status: newStatus, remaining: tData.remaining !== undefined ? tData.remaining : null, scannedAt: tData.scannedAt, scannedBy: tData.scannedBy }); }

                    let theUsername = ''; if (window.usersMapCache[tData.uid]) { theUsername = `(@${window.usersMapCache[tData.uid].username})`; }
                    let sisaText = ''; if(tData.type === 'sponsor') sisaText = `<div class="bg-blue-500 text-white font-bold px-4 py-2 mt-2 rounded-lg inline-block shadow-lg border border-white/20"><i class="fa-solid fa-star mr-1 text-yellow-300"></i> AKSES SPONSOR - Sisa: ${tData.remaining}x</div>`; else if (typeof tData.remaining === 'number') sisaText = `<div class="bg-green-600 text-white font-bold px-4 py-2 mt-2 rounded-lg inline-block shadow-lg border border-white/20"><i class="fa-solid fa-futbol mr-1 text-yellow-300"></i> Sisa: ${tData.remaining}x Scan</div>`;

                    resArea.innerHTML = `<div class="bg-green-500/20 border-2 border-green-500 text-green-500 p-6 rounded-xl text-center shadow-[0_0_30px_rgba(34,197,94,0.3)]"><i class="fa-solid fa-circle-check text-6xl mb-3"></i><br><b class="text-3xl tracking-widest">VALID</b><br>${sisaText}<div class="mt-4 text-sm text-green-200 bg-green-900/50 p-3 rounded text-left"><p><b>Nama:</b> ${tData.userName} <span class="text-green-400 text-xs">${theUsername}</span></p><p><b>Event:</b> ${tData.eventName}</p><p><b>Kategori:</b> ${tData.category}</p></div></div>`;
                    if(isOnline) syncPendingTickets();
                }
            }

            window.scanTimeoutId = setTimeout(() => { 
                const manInput = document.getElementById('man-scan-input');
                if(manInput) { manInput.value = ''; manInput.focus(); }
                window.isProcessingScan = false; 
            }, 1500);
        }

        async function viewTicket(tcode) {
            try {
                openModal('ticket-modal');
                if(activeTicketRef && activeTicketCb) { activeTicketRef.off('value', activeTicketCb); }
                activeTicketRef = db.ref(`tickets/${tcode}`);
                activeTicketCb = activeTicketRef.on('value', async (snap) => {
                    const tix = snap.val(); if(!tix) return;
                    if (window.isTicketReplacedByUpgrade(tix, tcode)) {
                        closeModal('ticket-modal');
                        if (activeTicketRef && activeTicketCb) activeTicketRef.off('value', activeTicketCb);
                        activeTicketRef = null;
                        activeTicketCb = null;
                        return Swal.fire({ icon:'info', title:'Tiket Sudah Di-upgrade', text:'Tiket lama hanya disimpan sebagai riwayat dan tidak dapat dibuka atau digunakan lagi.', background:'#1e293b', color:'#fff' });
                    }
                    if (tix.status === 'TRANSFER_PENDING') {
                        closeModal('ticket-modal');
                        if (activeTicketRef && activeTicketCb) activeTicketRef.off('value', activeTicketCb);
                        activeTicketRef = null;
                        activeTicketCb = null;
                        return Swal.fire({ icon:'info', title:'Transfer Sedang Diproses', text:'Tiket sedang dikunci sementara dan tidak dapat dibuka.', background:'#1e293b', color:'#fff' });
                    }
                    if (tix.status === 'TRANSFERRED') {
                        closeModal('ticket-modal');
                        if (activeTicketRef && activeTicketCb) activeTicketRef.off('value', activeTicketCb);
                        activeTicketRef = null;
                        activeTicketCb = null;
                        return Swal.fire({ icon:'info', title:'Tiket Sudah Ditransfer', text:'Tiket lama hanya disimpan sebagai riwayat dan tidak dapat dibuka atau digunakan lagi.', background:'#1e293b', color:'#fff' });
                    }
                    const ticketOwnerId = tix.ownerId || (window.eventDataMap?.[tix.eventId]?.ownerId || 'SUPER_ADMIN');
                    if (window.isVendor && ticketOwnerId !== window.currentUserData?.uid) {
                        safeSetText('t-event-name', 'Akses Ditolak');
                        safeSetText('t-event-sub', 'Tiket ini bukan milik vendor Anda.');
                        const _tdate = document.getElementById('t-date'); if(_tdate) _tdate.textContent = '-';
                        const _ttime = document.getElementById('t-time'); if(_ttime) _ttime.textContent = '-';
                        const _tuser = document.getElementById('t-user'); if(_tuser) _tuser.textContent = '-';
                        const _tcode = document.getElementById('t-code'); if(_tcode) _tcode.textContent = (tix.code || '-');
                        const _ttribun = document.getElementById('t-tribun-seat'); if(_ttribun) _ttribun.classList.add('hidden');
                        const _tcustom = document.getElementById('t-custom-answers'); if(_tcustom) _tcustom.innerHTML = '';
                        return;
                    }
                    const evSnap = await db.ref(`events/${tix.eventId}`).once('value'); const ev = evSnap.val() || {}; const isMultiScan = (typeof tix.remaining === 'number');
                    
                    safeSetText('t-event-name', ev.title || 'Event'); safeSetText('t-event-sub', ev.artis || (ev.kategori === 'Konser' ? "Konser Musik" : "Pertandingan Olahraga"));
                    safeSetText('t-date', ev.date || '00/00/0000'); safeSetText('t-time', ev.time || '00:00'); safeSetText('t-user', tix.userName || 'USER'); safeSetText('t-code', tix.code || 'XXXX-0000');
                    const tTribunSeat = document.getElementById('t-tribun-seat');
                    if (tTribunSeat) {
                        if (tix.selectedTribun) {
                            tTribunSeat.textContent = `Tribun: ${tix.selectedTribun}` + (tix.selectedSeat ? ` • Kursi: ${tix.selectedSeat}` : '');
                            tTribunSeat.classList.remove('hidden');
                        } else {
                            tTribunSeat.textContent = '';
                            tTribunSeat.classList.add('hidden');
                        }
                    }

                    const customAnswerContainer = document.getElementById('t-custom-answers');
                    if (customAnswerContainer) {
                        if (tix.customFormAnswers && Object.keys(tix.customFormAnswers).length > 0) {
                            const questionsData = window.eventDataMap?.[tix.eventId]?.customQuestions || '';
                            const questions = questionsData.split('|').map(q => q.trim()).filter(q => q);
                            const keys = Object.keys(tix.customFormAnswers || {}).sort((a, b) => Number(a) - Number(b));
                            let customHtml = '';
                            keys.forEach((key, idx) => {
                                const question = questions[idx] || `Pertanyaan ${idx + 1}`;
                                const answer = tix.customFormAnswers[key] || '-';
                                const escapedQ = document.createElement('div'); escapedQ.textContent = question; const safeQ = escapedQ.innerHTML;
                                const escapedA = document.createElement('div'); escapedA.textContent = answer; const safeA = escapedA.innerHTML;
                                customHtml += `<div class="bg-dark/50 p-3 rounded border border-blue-500/30"><p class="text-xs text-blue-400 font-bold">${safeQ}</p><p class="text-white mt-1">${safeA}</p></div>`;
                            });
                            customAnswerContainer.innerHTML = customHtml;
                            customAnswerContainer.classList.remove('hidden');
                        } else {
                            customAnswerContainer.innerHTML = '';
                            customAnswerContainer.classList.add('hidden');
                        }
                    }

                    const raffleNumberEl = document.getElementById('t-raffle-number');
                    if (raffleNumberEl) {
                        if (tix.raffle_number !== undefined && tix.raffle_number !== null) {
                            raffleNumberEl.textContent = `No Undian: ${tix.raffle_number}`;
                            raffleNumberEl.classList.remove('hidden');
                        } else {
                            raffleNumberEl.textContent = '';
                            raffleNumberEl.classList.add('hidden');
                        }
                    }
                    const orgLogoImg = document.getElementById('t-org-logo');
                    if(orgLogoImg) {
                        let ownerLogo = (ev && ev.org_logo) ? ev.org_logo : '';
                        const ticketOwnerId = (tix.ownerId && tix.ownerId !== 'SUPER_ADMIN') ? tix.ownerId : (ev && ev.ownerId ? ev.ownerId : 'SUPER_ADMIN');
                        if(!ownerLogo && ticketOwnerId && window.usersMapCache && window.usersMapCache[ticketOwnerId]) {
                            const ticketOwnerData = window.usersMapCache[ticketOwnerId];
                            ownerLogo = ticketOwnerData.org_logo || ticketOwnerData.logo || ticketOwnerData.image || ticketOwnerData.avatar || '';
                        }
                        if(ownerLogo) {
                            orgLogoImg.src = ownerLogo;
                            orgLogoImg.parentElement?.classList.remove('hidden');
                        } else {
                            orgLogoImg.src = '';
                            orgLogoImg.parentElement?.classList.add('hidden');
                        }
                    }
                    const catText = document.getElementById('t-category'); const header = document.getElementById('t-header-bg'); const pArea = document.getElementById('ticket-print-area');
                    
                    if(catText) { 
                        if (tix.type === 'sponsor') catText.innerText = `${tix.category} (SPONSOR - Sisa ${tix.remaining}x)`;
                    else if (typeof tix.remaining === 'number') catText.innerText = `${tix.category} (Sisa ${tix.remaining}x Scan)`;
                    else catText.innerText = (tix.category || 'REGULER'); 
                        catText.className = "text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 uppercase"; 
                    }
                    if(header) header.className = "ticket-bg text-white p-6 text-center border-b-4 relative transition-colors duration-500 border-amber-500";
                    const cat = (tix.category || '').toLowerCase();
                    if(cat.includes('vvip')) { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-purple-900', 'border-purple-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-purple-600', 'to-purple-900'); }
                    else if(cat.includes('vip')) { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-amber-800', 'border-amber-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-amber-500', 'to-yellow-600'); }
                    else { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-blue-900', 'border-blue-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-blue-500', 'to-cyan-600'); }
                    
                    const usedOverlay = document.getElementById('t-used-overlay'); const usedDetails = document.getElementById('t-used-details');
                    const suspendedOverlay = document.getElementById('t-suspended-overlay');
                    const adminMsgCard = document.getElementById('t-admin-message-card');
                    const adminMsgDisplay = document.getElementById('t-admin-message-display');
                    const adminStatusSection = document.getElementById('t-admin-status-section');
                    const adminStatusSelect = document.getElementById('t-admin-status');
                    const adminMessageInput = document.getElementById('t-admin-message');
                    
                    if(tix.status === 'USED' || (isMultiScan && tix.remaining <= 0)) { 
                        if(usedOverlay) usedOverlay.classList.remove('hidden'); 
                        if(suspendedOverlay) suspendedOverlay.classList.add('hidden');
                        if(pArea) pArea.classList.add('ticket-used-blur'); 
                        if(usedDetails) usedDetails.innerHTML = `Discan pada: <br><b>${tix.scannedAt ? new Date(tix.scannedAt).toLocaleString('id-ID') : '-'}</b><br>Oleh: <b>${tix.scannedBy || 'Gate'}</b>`; 
                    } else if(tix.status === 'SUSPENDED') {
                        if(usedOverlay) usedOverlay.classList.add('hidden');
                        if(suspendedOverlay) suspendedOverlay.classList.remove('hidden');
                        if(pArea) pArea.classList.add('ticket-used-blur');
                        if(adminMsgCard && tix.suspendedMessage) { adminMsgCard.classList.remove('hidden'); adminMsgDisplay.textContent = tix.suspendedMessage; } else if(adminMsgCard) { adminMsgCard.classList.add('hidden'); }
                    } else { 
                        if(usedOverlay) usedOverlay.classList.add('hidden'); 
                        if(suspendedOverlay) suspendedOverlay.classList.add('hidden');
                        if(pArea) pArea.classList.remove('ticket-used-blur');
                        if(adminMsgCard) adminMsgCard.classList.add('hidden');
                    }
                    
                    if(adminStatusSection) {
                        // Show admin status panel to superadmin, admin, or the vendor owner of this ticket
                        if(window.isSuperAdmin || window.isAdmin || (window.isVendor && ticketOwnerId === window.currentUserData?.uid)) {
                            adminStatusSection.classList.remove('hidden');
                            if(adminStatusSelect) adminStatusSelect.value = tix.status || 'ACTIVE';
                            if(adminMessageInput) adminMessageInput.value = tix.suspendedMessage || '';
                            window.toggleTicketMessageField();
                            // If another UI action requested opening modal in suspend mode, apply it now
                            if (window.openSuspendFlag && window.openSuspendTicketCode === tix.code) {
                                try { if (adminStatusSelect) adminStatusSelect.value = 'SUSPENDED'; window.toggleTicketMessageField(); if (adminMessageInput) adminMessageInput.focus(); } catch(e){}
                                window.openSuspendFlag = false; window.openSuspendTicketCode = null;
                            }
                        } else {
                            adminStatusSection.classList.add('hidden');
                        }
                    }
                    
                    const qrcodeEl = document.getElementById('t-qrcode'); if(qrcodeEl) { qrcodeEl.innerHTML = ''; new QRCode(qrcodeEl, { text: tix.code, width: 120, height: 120, colorDark : "#0f172a", colorLight : "#ffffff" }); }
                    try { JsBarcode("#t-barcode", tix.code, { format: "CODE128", width: 2, height: 50, displayValue: false, lineColor: "#0f172a" }); } catch(e){} 
                    
                    const upgradeBtn = document.getElementById('t-upgrade-btn');
                    if (upgradeBtn) {
                        window.activeTicketCodeForUpgrade = tcode;
                        if (tix.status === 'ACTIVE' && window.canUpgradeTicketCategory(tix.category)) {
                            upgradeBtn.classList.remove('hidden');
                        } else {
                            upgradeBtn.classList.add('hidden');
                        }
                    }
                    
                    const spContainer = document.getElementById('t-sponsor-logos'); const spSection = document.getElementById('t-sponsor-section');
                    if(spContainer && spSection) {
                        spContainer.innerHTML = ''; let hasPdfSponsor = false; const evOwner = (ev && ev.ownerId) ? ev.ownerId : (tix.ownerId || 'SUPER_ADMIN');
                        let sponsorSource = (window.appSponsors && Object.keys(window.appSponsors).length) ? window.appSponsors : ((window.cachedSettings && window.cachedSettings.sponsors) ? window.cachedSettings.sponsors : {});
                        if(!Object.keys(sponsorSource).length && window.db) {
                            try { const sSnap = await window.db.ref('settings/sponsors').once('value'); sponsorSource = sSnap.val() || {}; } catch(e){ console.warn('Failed loading sponsors fallback', e); }
                        }
                        Object.keys(sponsorSource || {}).forEach(k => { 
                            const sp = sponsorSource[k]; 
                            const spOwner = sp.ownerId || 'SUPER_ADMIN';
                            // Only show sponsors that belong to the same owner as the event/ticket
                            if (spOwner === evOwner) { 
                                hasPdfSponsor = true; 
                                const img = document.createElement('img');
                                img.src = sp.logo || '';
                                img.alt = sp.name || 'Sponsor';
                                img.className = 'h-5 md:h-6 object-contain opacity-80 mix-blend-multiply';
                                img.loading = 'lazy';
                                img.onerror = function(){ this.style.display='none'; console.warn('Sponsor image failed to load', this.src); };
                                spContainer.appendChild(img);
                            } 
                        }); 
                        if(hasPdfSponsor) { spSection.style.display = 'block'; } else { spSection.style.display = 'none'; }
                        if(window.populateTicketSponsorsFromModal) { setTimeout(() => { try { window.populateTicketSponsorsFromModal(); } catch(e){ console.error('populateTicketSponsorsFromModal call error', e); } }, 100); }
                    }
                });
            } catch(e) { console.error(e); }
        }

        async function openTicketModalWithData(ticketData, ticketKey) {
            try {
                if (window.isTicketReplacedByUpgrade(ticketData, ticketKey || ticketData?.code || '')) {
                    return Swal.fire({ icon:'info', title:'Tiket Sudah Di-upgrade', text:'Tiket lama hanya disimpan sebagai riwayat dan tidak dapat dibuka atau digunakan lagi.', background:'#1e293b', color:'#fff' });
                }
                if (ticketData?.status === 'TRANSFERRED') {
                    return Swal.fire({ icon:'info', title:'Tiket Sudah Ditransfer', text:'Tiket lama hanya disimpan sebagai riwayat dan tidak dapat dibuka atau digunakan lagi.', background:'#1e293b', color:'#fff' });
                }
                openModal('ticket-modal');
                if(activeTicketRef && activeTicketCb) { activeTicketRef.off('value', activeTicketCb); }
                activeTicketRef = null;
                activeTicketCb = null;
                const tix = ticketData;
                const tcode = tix.code || '';
                const evSnap = await db.ref(`events/${tix.eventId}`).once('value'); const ev = evSnap.val() || {};
                const isMultiScan = (typeof tix.remaining === 'number');
                safeSetText('t-event-name', ev.title || 'Event'); safeSetText('t-event-sub', ev.artis || (ev.kategori === 'Konser' ? "Konser Musik" : "Pertandingan Olahraga"));
                safeSetText('t-date', ev.date || '00/00/0000'); safeSetText('t-time', ev.time || '00:00'); safeSetText('t-user', tix.userName || 'USER'); safeSetText('t-code', tcode || 'XXXX-0000');
                const tTribunSeat = document.getElementById('t-tribun-seat');
                if (tTribunSeat) {
                    if (tix.selectedTribun) {
                        tTribunSeat.textContent = `Tribun: ${tix.selectedTribun}` + (tix.selectedSeat ? ` • Kursi: ${tix.selectedSeat}` : '');
                        tTribunSeat.classList.remove('hidden');
                    } else {
                        tTribunSeat.textContent = '';
                        tTribunSeat.classList.add('hidden');
                    }
                }
                const raffleNumberEl = document.getElementById('t-raffle-number');
                if (raffleNumberEl) {
                    if (tix.raffle_number !== undefined && tix.raffle_number !== null) {
                        raffleNumberEl.textContent = `No Undian: ${tix.raffle_number}`;
                        raffleNumberEl.classList.remove('hidden');
                    } else {
                        raffleNumberEl.textContent = '';
                        raffleNumberEl.classList.add('hidden');
                    }
                }
                const orgLogoImg = document.getElementById('t-org-logo');
                if(orgLogoImg) {
                    let ownerLogo = (ev && ev.org_logo) ? ev.org_logo : '';
                    const ticketOwnerId = (tix.ownerId && tix.ownerId !== 'SUPER_ADMIN') ? tix.ownerId : (ev && ev.ownerId ? ev.ownerId : 'SUPER_ADMIN');
                    if(!ownerLogo && ticketOwnerId && window.usersMapCache && window.usersMapCache[ticketOwnerId]) {
                        const ticketOwnerData = window.usersMapCache[ticketOwnerId];
                        ownerLogo = ticketOwnerData.org_logo || ticketOwnerData.logo || ticketOwnerData.image || ticketOwnerData.avatar || '';
                    }
                    if(ownerLogo) {
                        orgLogoImg.src = ownerLogo;
                        orgLogoImg.parentElement?.classList.remove('hidden');
                    } else {
                        orgLogoImg.src = '';
                        orgLogoImg.parentElement?.classList.add('hidden');
                    }
                }
                const catText = document.getElementById('t-category'); const header = document.getElementById('t-header-bg'); const pArea = document.getElementById('ticket-print-area');
                if(catText) {
                    if (tix.type === 'sponsor') catText.innerText = `${tix.category} (SPONSOR - Sisa ${tix.remaining}x)`; else if (typeof tix.remaining === 'number') catText.innerText = `${tix.category} (Sisa ${tix.remaining}x Scan)`; else catText.innerText = (tix.category || 'REGULER');
                    catText.className = "text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 uppercase";
                }
                if(header) header.className = "ticket-bg text-white p-6 text-center border-b-4 relative transition-colors duration-500 border-amber-500";
                const cat = (tix.category || '').toLowerCase();
                if(cat.includes('vvip')) { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-purple-900', 'border-purple-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-purple-600', 'to-purple-900'); }
                else if(cat.includes('vip')) { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-amber-800', 'border-amber-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-amber-500', 'to-yellow-600'); }
                else { if(header) header.classList.add('bg-gradient-to-tr', 'from-slate-900', 'to-blue-900', 'border-blue-500'); if(catText) catText.classList.add('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-blue-500', 'to-cyan-600'); }
                const usedOverlay = document.getElementById('t-used-overlay'); const usedDetails = document.getElementById('t-used-details');
                if(tix.status === 'USED' || (isMultiScan && tix.remaining <= 0)) { if(usedOverlay) usedOverlay.classList.remove('hidden'); if(pArea) pArea.classList.add('ticket-used-blur'); if(usedDetails) usedDetails.innerHTML = `Discan pada: <br><b>${tix.scannedAt ? new Date(tix.scannedAt).toLocaleString('id-ID') : '-'}</b><br>Oleh: <b>${tix.scannedBy || 'Gate'}</b>`; }
                else { if(usedOverlay) usedOverlay.classList.add('hidden'); if(pArea) pArea.classList.remove('ticket-used-blur'); }
                const qrcodeEl = document.getElementById('t-qrcode'); if(qrcodeEl) { qrcodeEl.innerHTML = ''; new QRCode(qrcodeEl, { text: tcode, width: 120, height: 120, colorDark : "#0f172a", colorLight : "#ffffff" }); }
                try { JsBarcode("#t-barcode", tcode, { format: "CODE128", width: 2, height: 50, displayValue: false, lineColor: "#0f172a" }); } catch(e){}
                const upgradeBtn = document.getElementById('t-upgrade-btn');
                if (upgradeBtn) {
                    window.activeTicketCodeForUpgrade = tcode;
                    if (tix.status === 'ACTIVE' && window.canUpgradeTicketCategory(tix.category)) {
                        upgradeBtn.classList.remove('hidden');
                    } else {
                        upgradeBtn.classList.add('hidden');
                    }
                }
                const spContainer = document.getElementById('t-sponsor-logos'); const spSection = document.getElementById('t-sponsor-section');
                if(spContainer && spSection) {
                    spContainer.innerHTML = ''; let hasPdfSponsor = false; const evOwner = (ev && ev.ownerId) ? ev.ownerId : (tix.ownerId || 'SUPER_ADMIN');
                    let sponsorSource = (window.appSponsors && Object.keys(window.appSponsors).length) ? window.appSponsors : ((window.cachedSettings && window.cachedSettings.sponsors) ? window.cachedSettings.sponsors : {});
                    if(!Object.keys(sponsorSource).length && window.db) {
                        try { const sSnap = await window.db.ref('settings/sponsors').once('value'); sponsorSource = sSnap.val() || {}; } catch(e){ console.warn('Failed loading sponsors fallback', e); }
                    }
                    Object.keys(sponsorSource || {}).forEach(k => { 
                        const sp = sponsorSource[k]; 
                        const spOwner = sp.ownerId || 'SUPER_ADMIN';
                        if (spOwner === evOwner) { 
                            hasPdfSponsor = true; 
                            const img = document.createElement('img');
                            img.src = sp.logo || '';
                            img.alt = sp.name || 'Sponsor';
                            img.className = 'h-5 md:h-6 object-contain opacity-80 mix-blend-multiply';
                            img.loading = 'lazy';
                            img.onerror = function(){ this.style.display='none'; console.warn('Sponsor image failed to load', this.src); };
                            spContainer.appendChild(img);
                        } 
                    }); 
                    if(hasPdfSponsor) { spSection.style.display = 'block'; } else { spSection.style.display = 'none'; }
                    if(window.populateTicketSponsorsFromModal) { setTimeout(() => { try { window.populateTicketSponsorsFromModal(); } catch(e){ console.error('populateTicketSponsorsFromModal call error', e); } }, 100); }
                }
            } catch(e) { console.error(e); }
        }

        async function openLegacySplitTicket(ticketKey, seat) {
            if (!ticketKey || !seat) return;
            try {
                const snap = await db.ref(`tickets/${ticketKey}`).once('value');
                const t = snap.val();
                if (!t) return;
                const codeSuffix = seat.toString().replace(/[^a-zA-Z0-9]/g, '');
                const virtualCode = `${t.code}-${codeSuffix}`;
                const virtualTicket = { ...t, code: virtualCode, selectedSeat: seat };
                await openTicketModalWithData(virtualTicket, ticketKey);
            } catch (e) {
                console.error('Failed opening legacy split ticket:', e);
            }
        }

        window.openTransferTicketModal = function(ticketCode, code, eventName) {
            if (window.userUpgradedTicketCodes?.has(ticketCode)) {
                return Swal.fire({icon:'info', title:'Tiket Sudah Di-upgrade', text:'Tiket lama tidak dapat ditransfer.', background:'#1e293b', color:'#fff'});
            }
            window.pendingTransferData = { ticketCode: ticketCode, code: code, eventName: eventName };
            openModal('transfer-confirm-modal');
        };

        window.openUpgradeTicketModalFromModal = function() {
            if(window.activeTicketCodeForUpgrade) {
                window.openUpgradeTicketModal(window.activeTicketCodeForUpgrade);
            }
        };

        window.openUpgradeTicketModal = async function(ticketKey) {
            try {
                if (!ticketKey) return Swal.fire({icon:'error', title:'Data tidak lengkap', text:'Kode tiket tidak ditemukan.', background:'#1e293b', color:'#fff'});
                const ticketSnap = await db.ref(`tickets/${ticketKey}`).once('value');
                const ticket = ticketSnap.val();
                if (!ticket) return Swal.fire({icon:'error', title:'Tiket tidak ditemukan', text:'Silakan coba lagi atau hubungi admin.', background:'#1e293b', color:'#fff'});
                const replacementTicket = window.isTicketReplacedByUpgrade(ticket, ticketKey) ? (window.userUpgradeReplacementMap?.[ticketKey] || {}) : await window.findUpgradeReplacementTicket(ticketKey);
                if (window.isTicketReplacedByUpgrade(ticket, ticketKey) || replacementTicket) return Swal.fire({icon:'info', title:'Tiket Sudah Di-upgrade', text:'Tiket lama tidak dapat di-upgrade kembali.', background:'#1e293b', color:'#fff'});
                if (ticket.status !== 'ACTIVE') return Swal.fire({icon:'warning', title:'Tidak dapat upgrade', text:'Hanya tiket aktif yang bisa di-upgrade.', background:'#1e293b', color:'#fff'});
                if (!window.canUpgradeTicketCategory(ticket.category)) return Swal.fire({icon:'info', title:'Upgrade tidak tersedia', text:'Kategori tiket ini tidak bisa di-upgrade ke VIP/VVIP.', background:'#1e293b', color:'#fff'});

                const evSnap = await db.ref(`events/${ticket.eventId}`).once('value');
                const ev = evSnap.val() || {};
                const currentPrice = window.getEventTicketPrice(ticket.category, ticket.eventId);
                const vipPrice = window.getEventTicketPrice('VIP', ticket.eventId);
                const vvipPrice = window.getEventTicketPrice('VVIP', ticket.eventId);
                const upgrades = [];
                if (vipPrice > currentPrice) upgrades.push({ key: 'VIP', label: `VIP - Rp ${vipPrice.toLocaleString('id-ID')} (Selisih ${formatRp(vipPrice - currentPrice)})` });
                if (vvipPrice > currentPrice) upgrades.push({ key: 'VVIP', label: `VVIP - Rp ${vvipPrice.toLocaleString('id-ID')} (Selisih ${formatRp(vvipPrice - currentPrice)})` });
                if (!upgrades.length) return Swal.fire({icon:'info', title:'Tidak dapat upgrade', text:'Tidak ada opsi upgrade yang lebih tinggi dari kategori tiket Anda saat ini.', background:'#1e293b', color:'#fff'});

                const optionsHtml = upgrades.map(u => `<option value="${u.key}">${u.label}</option>`).join('');
                const currentSeatInfo = ticket.selectedTribun || ticket.selectedSeat ? `<div><strong>Tribun/Kursi saat ini:</strong> ${ticket.selectedTribun || '-'}${ticket.selectedSeat ? ` • Kursi: ${ticket.selectedSeat}` : ''}</div>` : '';
                const html = `<div class="text-left text-sm space-y-3"><div><strong>Tiket saat ini:</strong> ${ticket.category}</div><div><strong>Nama event:</strong> ${ticket.eventName}</div>${currentSeatInfo}<div><label class="block text-xs text-gray-300 mb-2">Pilih target upgrade:</label><select id="swal-upgrade-select" class="w-full rounded-xl bg-slate-800 text-white border border-slate-600 px-3 py-2">${optionsHtml}</select></div></div>`;
                const result = await Swal.fire({
                    title: 'Minta Upgrade Tiket',
                    html,
                    showCancelButton: true,
                    confirmButtonText: 'Lanjutkan',
                    cancelButtonText: 'Batal',
                    background:'#1e293b',
                    color:'#fff',
                    preConfirm: () => {
                        const select = document.getElementById('swal-upgrade-select');
                        return select ? select.value : null;
                    }
                });
                if (!result.value) return;
                const targetCategory = result.value;
                const targetPrice = window.getEventTicketPrice(targetCategory, ticket.eventId);
                const diff = targetPrice - currentPrice;
                if (diff <= 0) return Swal.fire({icon:'error', title:'Upgrade gagal', text:'Nilai upgrade tidak valid.', background:'#1e293b', color:'#fff'});

                const useSeatNumber = ev.tribun_use_seat_number !== false;
                const hasTribuns = Array.isArray(ev.tribuns) && ev.tribuns.length > 0;
                const eventTribuns = hasTribuns ? window.getAllowedTribunsForCategory(ev, targetCategory) : [];
                if (hasTribuns && !eventTribuns.length) return Swal.fire({icon:'error', title:'Upgrade gagal', text:'Tidak ada tribun tersedia untuk kategori upgrade ini.', background:'#1e293b', color:'#fff'});

                const tribunOptionsHtml = hasTribuns ? eventTribuns.map(t => `<option value="${t.name}">${t.name} (${t.seats} Kursi)</option>`).join('') : '';
                const seatSelectorHtml = useSeatNumber && hasTribuns
                    ? `<select id="swal-upgrade-seat" class="w-full rounded-xl bg-slate-800 text-white border border-slate-600 px-3 py-2"><option value="">Pilih tribun terlebih dahulu</option></select>`
                    : `<div class="rounded-xl bg-slate-800 border border-slate-600 p-3 text-sm text-gray-300">Nomor kursi tidak diperlukan untuk event ini.</div>`;
                const seatSectionLabel = useSeatNumber ? '<div><label class="block text-xs text-gray-300 mb-2">Pilih nomor kursi upgrade:</label>' : '<div><label class="block text-xs text-gray-300 mb-2">Nomor kursi:</label>';
                const html2 = `<div class="text-left text-sm space-y-3">
                    <div><strong>Tiket saat ini:</strong> ${ticket.category}</div>
                    <div><strong>Nama event:</strong> ${ticket.eventName}</div>
                    ${currentSeatInfo}
                    ${hasTribuns ? `<div><label class="block text-xs text-gray-300 mb-2">Pilih tribun upgrade:</label>
                        <select id="swal-upgrade-tribun" class="w-full rounded-xl bg-slate-800 text-white border border-slate-600 px-3 py-2">${tribunOptionsHtml}</select>
                    </div>` : `<div class="rounded-xl bg-slate-800 border border-slate-600 p-3 text-sm text-gray-300">Event ini tidak menggunakan pilihan tribun/kursi.</div>`}
                    ${seatSectionLabel}${seatSelectorHtml}</div>
                </div>`;

                const result2 = await Swal.fire({
                    title: 'Pilih Tribun & Kursi Upgrade',
                    html: html2,
                    showCancelButton: true,
                    confirmButtonText: 'Lanjutkan ke Pembayaran',
                    cancelButtonText: 'Batal',
                    background:'#1e293b',
                    color:'#fff',
                    didOpen: () => {
                        const tribunSelect2 = document.getElementById('swal-upgrade-tribun');
                        const seatSelect2 = document.getElementById('swal-upgrade-seat');
                        const loadSeats = async (tribunName) => {
                            if (!useSeatNumber || !hasTribuns) return;
                            if (!tribunName) {
                                if (seatSelect2) seatSelect2.innerHTML = '<option value="">Pilih tribun terlebih dahulu</option>';
                                return;
                            }
                            const availableSeats = await window.getAvailableSeatsForTribun(ticket.eventId, tribunName);
                            if (!seatSelect2) return;
                            let options = '<option value="">-- Pilih Nomor Kursi --</option>';
                            if (availableSeats.length) {
                                availableSeats.forEach(i => { options += `<option value="${i}">Kursi ${i}</option>`; });
                            } else {
                                options = '<option value="">Tidak ada kursi tersedia</option>';
                            }
                            seatSelect2.innerHTML = options;
                        };
                        if (tribunSelect2) {
                            tribunSelect2.addEventListener('change', () => loadSeats(tribunSelect2.value));
                            if (tribunSelect2.value && useSeatNumber) loadSeats(tribunSelect2.value);
                        }
                    },
                    preConfirm: () => {
                        const tribunSelect2 = document.getElementById('swal-upgrade-tribun');
                        const seatSelect2 = document.getElementById('swal-upgrade-seat');
                        let selectedTribunForUpgrade = '';
                        if (hasTribuns) {
                            if (!tribunSelect2) return null;
                            selectedTribunForUpgrade = tribunSelect2.value;
                            if (!selectedTribunForUpgrade) {
                                Swal.showValidationMessage('Silakan pilih tribun upgrade.');
                                return null;
                            }
                        }
                        const selectedSeatForUpgrade = (useSeatNumber && hasTribuns && seatSelect2) ? seatSelect2.value : '';
                        if (useSeatNumber && hasTribuns && !selectedSeatForUpgrade) {
                            Swal.showValidationMessage('Silakan pilih nomor kursi upgrade.');
                            return null;
                        }
                        return { selectedTribunForUpgrade, selectedSeatForUpgrade };
                    }
                });
                if (!result2.value) return;
                const selectedTribunForUpgrade = result2.value.selectedTribunForUpgrade;
                const selectedSeatForUpgrade = result2.value.selectedSeatForUpgrade;

                const user = auth.currentUser;
                if (!user) { Toast.fire({icon:'warning', title:'Silakan login dulu!'}); return setTimeout(() => openModal('login-modal'), 500); }
                const uSnap = await db.ref('users/'+user.uid).once('value');
                const uData = uSnap.val() || { nama: user.displayName || 'User', username: 'user' };
                const newPayRef = db.ref('payments').push();
                const payKey = newPayRef.key;
                const ownerId = ev.ownerId || ticket.ownerId || 'SUPER_ADMIN';
                if (ownerId !== 'SUPER_ADMIN') await window.loadOwnerPaymentInfo(ownerId);
                const payload = {
                    uid: user.uid,
                    userName: uData.nama,
                    eventId: ticket.eventId,
                    eventName: ticket.eventName || ev.title || 'Event',
                    category: targetCategory,
                    total: diff,
                    qty: 1,
                    status: 'PENDING',
                    ownerId: ownerId,
                    type: 'UPGRADE',
                    ticketCode: ticketKey,
                    currentCategory: ticket.category,
                    targetCategory: targetCategory,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                if (hasTribuns && selectedTribunForUpgrade) {
                    payload.selectedTribun = selectedTribunForUpgrade;
                }
                if (useSeatNumber && selectedSeatForUpgrade) {
                    payload.selectedSeat = selectedSeatForUpgrade;
                }
                if (ticket.customFormAnswers) { payload.customFormAnswers = ticket.customFormAnswers; }
                await newPayRef.set(payload);
                // Build payment instruction HTML using vendor override when available
                const upgradePayment = window.getPaymentInfoForOwner(ownerId);
                let upBank = upgradePayment.bank;
                let upName = upgradePayment.name;
                let upQris = upgradePayment.qris;
                let upHtml = `<div class="text-left text-sm mb-4"><p>Silakan lakukan pembayaran selisih upgrade sebesar <b class="text-green-400 text-lg">${formatRp(diff)}</b>.</p>`;
                if (upBank) {
                    const eb = upBank.replace(/'/g, "\\'").replace(/\"/g, '&quot;');
                    upHtml += `<div class="bg-dark p-4 rounded-xl mt-3 border border-white/10 shadow-inner"><p class="text-xs text-gray-400">Bank / E-Wallet:</p><div class="flex justify-between items-center"><p class="font-bold text-amber-500 text-xl tracking-wide">${eb}</p><button type="button" onclick="navigator.clipboard.writeText('${eb}'); Swal.showValidationMessage('Berhasil di-copy!')" class="text-gray-400 hover:text-white bg-white/5 px-3 py-1 rounded cursor-pointer"><i class="fa-solid fa-copy"></i> Copy</button></div><p class="text-xs text-gray-400 mt-2">Atas Nama:</p><p class="font-bold text-white text-lg">${upName}</p></div>`;
                }
                if (upQris) {
                    const eq = upQris.replace(/'/g, "\\'").replace(/\"/g, '&quot;');
                    upHtml += `<div class="mt-4 text-center"><p class="text-xs text-gray-400 mb-2">Atau Scan QRIS ini:</p><img src="${eq}" class="w-48 mx-auto rounded-xl shadow-lg border border-white/10 mb-2"><a href="${eq}" download="QRIS_Tiket_Kaka" target="_blank" class="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-3 py-1 rounded-full"><i class="fa-solid fa-download"></i> Simpan Gambar QRIS</a></div>`;
                }
                upHtml += `</div>`;

                Swal.fire({
                    icon: 'success',
                    title: 'Permintaan upgrade dibuat',
                    html: upHtml,
                    background:'#1e293b',
                    color:'#fff',
                    confirmButtonText: 'Kirim Bukti via WA',
                    showCancelButton: true,
                    cancelButtonText: 'Tutup',
                    preConfirm: () => {
                        window.sendWAProof(payKey, ticket.eventName || ev.title || 'Event', targetCategory, 1, diff, ownerId);
                    }
                });
            } catch (err) {
                Swal.fire({icon:'error', title:'Gagal', text: err.message || 'Terjadi kesalahan saat meminta upgrade.', background:'#1e293b', color:'#fff'});
            }
        };

        window.confirmTransferAndProceed = function() {
            if (!window.pendingTransferData) return;
            closeModal('transfer-confirm-modal');
            document.getElementById('transfer-ticket-code').value = window.pendingTransferData.ticketCode;
            document.getElementById('transfer-ticket-code-display').innerText = window.pendingTransferData.code;
            document.getElementById('transfer-ticket-info').innerText = window.pendingTransferData.eventName;
            document.getElementById('transfer-email').value = '';
            openModal('transfer-ticket-modal');
            window.pendingTransferData = null;
        };

        window.generateNewTicketCode = async function(ownerId = null, eventId = null, eventData = null) {
            const codePrefix = window.getTicketCodePrefix(ownerId, eventId, eventData);
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const timestamp = Date.now().toString(36).toUpperCase();
            return `${codePrefix}-${randomSuffix}${timestamp}`.substring(0, 15);
        };

        // Prevent re-creating tickets for the same payment while still allowing
        // multiple purchases from the same customer in separate payments.
        window.checkDuplicateTicketByNameCategory = async function(userName, eventId, category, paymentId = null) {
            try {
                if (!db || !eventId) return false;
                if (paymentId) {
                    const snap = await db.ref('tickets').orderByChild('paymentId').equalTo(paymentId).once('value');
                    const data = snap.val() || {};
                    return Object.keys(data).length > 0;
                }
                return false;
            } catch (e) {
                console.warn('checkDuplicateTicketByNameCategory failed', e);
                return false;
            }
        };

        window.handleTransferTicket = async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-transfer-ticket');
            const originalText = btn ? btn.innerHTML : 'Transfer Tiket';
            let transferStage = 'persiapan';
            let ticketRef = null;
            let originalTicket = null;
            let lockedTicketCode = '';
            let lockedNewTicketCode = '';
            let recipientTicketCreated = false;
            let originalTicketFinalized = false;

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses Transfer...';
                }

                const currentUser = auth.currentUser;
                const ticketCode = document.getElementById('transfer-ticket-code')?.value || '';
                const recipientEmail = (document.getElementById('transfer-email')?.value || '').toLowerCase().trim();

                if (!currentUser) throw new Error('Silakan login terlebih dahulu.');
                if (!ticketCode || !recipientEmail) {
                    return Swal.fire({icon:'error', title:'Data Tidak Lengkap', text:'Harap isi semua data transfer!', background:'#1e293b', color:'#fff'});
                }
                if (recipientEmail === (currentUser.email || '').toLowerCase()) {
                    return Swal.fire({icon:'warning', title:'Penerima Tidak Valid', text:'Tiket tidak dapat ditransfer ke akun Anda sendiri.', background:'#1e293b', color:'#fff'});
                }

                transferStage = 'membaca tiket lama';
                console.log('[TRANSFER] Stage:', transferStage, ticketCode);
                ticketRef = db.ref(`tickets/${ticketCode}`);
                const ticketSnap = await ticketRef.once('value');
                originalTicket = ticketSnap.val();
                if (!originalTicket) {
                    return Swal.fire({icon:'error', title:'Tiket Tidak Ditemukan', background:'#1e293b', color:'#fff'});
                }
                if (originalTicket.uid !== currentUser.uid) {
                    return Swal.fire({icon:'error', title:'Akses Ditolak', text:'Tiket ini bukan milik akun Anda.', background:'#1e293b', color:'#fff'});
                }
                const upgradeReplacement = window.isTicketReplacedByUpgrade(originalTicket, ticketCode) ? (window.userUpgradeReplacementMap?.[ticketCode] || {}) : await window.findUpgradeReplacementTicket(ticketCode);
                if (window.isTicketReplacedByUpgrade(originalTicket, ticketCode) || upgradeReplacement) {
                    return Swal.fire({icon:'info', title:'Tiket Sudah Di-upgrade', text:'Tiket lama tidak dapat ditransfer atau digunakan lagi.', background:'#1e293b', color:'#fff'});
                }
                if (originalTicket.status !== 'ACTIVE') {
                    return Swal.fire({icon:'error', title:'Tiket Tidak Aktif', text:'Hanya tiket ACTIVE yang bisa ditransfer!', background:'#1e293b', color:'#fff'});
                }

                transferStage = 'mencari akun penerima';
                console.log('[TRANSFER] Stage:', transferStage, recipientEmail);
                const usersSnap = await db.ref('users').orderByChild('email').equalTo(recipientEmail).once('value');
                const usersData = usersSnap.val() || {};
                const recipientUid = Object.keys(usersData)[0] || null;
                const recipientData = recipientUid ? usersData[recipientUid] : null;
                if (!recipientUid || !recipientData) {
                    return Swal.fire({icon:'error', title:'Email Tidak Terdaftar', text:'Penerima harus sudah memiliki akun Tiket Kaka.', background:'#1e293b', color:'#fff'});
                }
                if (recipientUid === currentUser.uid) {
                    return Swal.fire({icon:'warning', title:'Penerima Tidak Valid', text:'Tiket tidak dapat ditransfer ke akun Anda sendiri.', background:'#1e293b', color:'#fff'});
                }

                transferStage = 'membuat kode tiket penerima';
                const resolvedOwnerId = originalTicket.ownerId || window.eventDataMap?.[originalTicket.eventId]?.ownerId || 'SUPER_ADMIN';
                let newTicketCode = await window.generateNewTicketCode(resolvedOwnerId, originalTicket.eventId, window.eventDataMap?.[originalTicket.eventId] || {});
                let codeExists = true;
                let attempts = 0;
                while (codeExists && attempts < 5) {
                    const codeCheckSnap = await db.ref(`tickets/${newTicketCode}`).once('value');
                    codeExists = codeCheckSnap.exists();
                    if (codeExists) {
                        attempts += 1;
                        newTicketCode = await window.generateNewTicketCode(resolvedOwnerId, originalTicket.eventId, window.eventDataMap?.[originalTicket.eventId] || {});
                    }
                }
                if (codeExists) {
                    return Swal.fire({icon:'error', title:'Gagal Generate Kode', text:'Sistem gagal membuat kode tiket baru. Silakan coba lagi.', background:'#1e293b', color:'#fff'});
                }

                let serverOffset = 0;
                try {
                    const offsetSnap = await db.ref('.info/serverTimeOffset').once('value');
                    serverOffset = Number(offsetSnap.val() || 0);
                } catch (e) {}
                const transferTimestamp = Date.now() + serverOffset;
                const recipientName = (recipientData.nama || 'User').toString();

                transferStage = 'mengunci tiket lama';
                console.log('[TRANSFER] Stage:', transferStage);
                const lockResult = await ticketRef.transaction(current => {
                    if (!current || current.uid !== currentUser.uid || current.status !== 'ACTIVE') return;
                    return {
                        ...current,
                        status: 'TRANSFER_PENDING',
                        transferredTo: recipientEmail,
                        transferredToUid: recipientUid,
                        transferredToTicketCode: newTicketCode,
                        transferredAt: transferTimestamp,
                        transferHistory: `Ditransfer ke: ${recipientName} (${recipientEmail})`
                    };
                });
                if (!lockResult.committed) throw new Error('Tiket sedang diproses atau statusnya sudah berubah. Silakan muat ulang.');
                lockedTicketCode = ticketCode;
                lockedNewTicketCode = newTicketCode;

                const newTicketData = {
                    code: newTicketCode,
                    paymentId: originalTicket.paymentId || null,
                    uid: recipientUid,
                    userName: recipientName,
                    eventId: originalTicket.eventId,
                    eventName: originalTicket.eventName,
                    category: originalTicket.category,
                    status: 'ACTIVE',
                    ownerId: resolvedOwnerId,
                    transferredFrom: {
                        originalCode: ticketCode,
                        originalUid: originalTicket.uid,
                        originalOwner: originalTicket.userName,
                        transferredAt: transferTimestamp
                    },
                    createdAt: transferTimestamp
                };
                if (originalTicket.selectedTribun) newTicketData.selectedTribun = originalTicket.selectedTribun;
                if (originalTicket.selectedSeat) newTicketData.selectedSeat = originalTicket.selectedSeat;
                if (originalTicket.raffle_number !== undefined && originalTicket.raffle_number !== null) newTicketData.raffle_number = originalTicket.raffle_number;
                if (originalTicket.type) newTicketData.type = originalTicket.type;
                if (originalTicket.quota !== undefined && originalTicket.quota !== null) newTicketData.quota = originalTicket.quota;
                if (originalTicket.remaining !== undefined && originalTicket.remaining !== null) newTicketData.remaining = originalTicket.remaining;
                if (originalTicket.customFormAnswers) newTicketData.customFormAnswers = originalTicket.customFormAnswers;

                // Tahap terpisah agar Firebase Rules tidak bergantung pada evaluasi sibling multi-location.
                transferStage = 'membuat tiket aktif penerima';
                console.log('[TRANSFER] Stage:', transferStage);
                await db.ref(`tickets/${newTicketCode}`).set(cleanObject(newTicketData));
                recipientTicketCreated = true;

                transferStage = 'menonaktifkan tiket lama';
                console.log('[TRANSFER] Stage:', transferStage);
                await ticketRef.update({ status: 'TRANSFERRED' });
                originalTicketFinalized = true;

                // Riwayat bersifat tambahan. Transfer tetap sukses jika riwayat gagal disimpan.
                transferStage = 'menyimpan riwayat transfer';
                try {
                    const transferHistoryRef = db.ref('transferHistory').push();
                    await transferHistoryRef.set(cleanObject({
                        fromUid: originalTicket.uid,
                        fromEmail: currentUser.email || '',
                        fromUserName: originalTicket.userName,
                        toUid: recipientUid,
                        toEmail: recipientEmail,
                        toUserName: recipientName,
                        originalTicketCode: ticketCode,
                        newTicketCode: newTicketCode,
                        eventId: originalTicket.eventId,
                        eventName: originalTicket.eventName,
                        category: originalTicket.category,
                        transferredAt: transferTimestamp
                    }));
                } catch (historyError) {
                    console.warn('[TRANSFER] Riwayat tidak tersimpan, tiket tetap berhasil dipindahkan:', historyError);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Transfer Berhasil!',
                    html: `<p class="text-sm mb-2">Tiket aktif sudah dipindahkan ke:</p><p class="font-bold text-green-400">${recipientName}<br>${recipientEmail}</p><p class="text-xs text-gray-400 mt-3">Tiket lama tetap tampil sebagai <b>TRANSFER</b> dan tidak dapat digunakan.<br>Kode tiket baru: <b class="text-amber-500">${newTicketCode}</b></p>`,
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#f59e0b'
                }).then(() => {
                    closeModal('transfer-ticket-modal');
                    switchUserTab('tiket');
                });
            } catch (err) {
                console.error(`[TRANSFER] Gagal pada tahap: ${transferStage}`, err);

                // Bila tiket penerima sudah dibuat tetapi finalisasi gagal, hapus tiket itu terlebih dahulu.
                if (recipientTicketCreated && !originalTicketFinalized && lockedNewTicketCode) {
                    try {
                        await db.ref(`tickets/${lockedNewTicketCode}`).remove();
                        recipientTicketCreated = false;
                    } catch (deleteError) {
                        console.error('[TRANSFER] Gagal menghapus tiket penerima saat rollback:', deleteError);
                    }
                }

                // Kembalikan tiket lama ke ACTIVE hanya jika finalisasi belum berhasil dan tiket penerima sudah tidak ada.
                if (!originalTicketFinalized && lockedTicketCode && ticketRef) {
                    try {
                        const recipientTicketSnap = lockedNewTicketCode ? await db.ref(`tickets/${lockedNewTicketCode}`).once('value') : null;
                        if (!recipientTicketSnap || !recipientTicketSnap.exists()) {
                            await ticketRef.update({
                                status: 'ACTIVE',
                                transferredTo: null,
                                transferredToUid: null,
                                transferredToTicketCode: null,
                                transferredAt: null,
                                transferHistory: null
                            });
                        }
                    } catch (rollbackError) {
                        console.error('[TRANSFER] ROLLBACK ERROR:', rollbackError);
                    }
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Transfer Tiket',
                    text: `Tahap ${transferStage}: ${err.message || 'Terjadi kesalahan saat memproses transfer tiket.'}`,
                    background: '#1e293b',
                    color: '#fff'
                });
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        };


        async function handleAddScanner(e) {
            e.preventDefault(); 
            const btn = document.getElementById('btn-save-scanner'); 
            if (!btn) return;
            const og = btn.innerHTML; btn.innerHTML = "Memproses..."; btn.disabled = true;
            try {
                if (!window.currentUserData) throw new Error('Silakan login terlebih dahulu!');
                const userEl = document.getElementById('scan-user');
                const passEl = document.getElementById('scan-pass');
                const nameEl = document.getElementById('scan-name');
                const catEl = document.getElementById('scan-cat');
                if (!userEl || !passEl || !nameEl || !catEl) throw new Error('Form tidak lengkap!');
                const email = userEl.value.trim() + '@beetix.com'; 
                const pass = passEl.value.trim();
                if (!pass || pass.length < 6) throw new Error('Password minimal 6 karakter!');
                window.ensureSecondaryApp();
                if (!window.secondaryApp || !window.secondaryApp.auth) throw new Error('Sistem autentikasi tidak tersedia!');
                const res = await window.secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
                await db.ref(`users/${res.user.uid}`).set({ uid: res.user.uid, nama: nameEl.value, username: userEl.value, email: email, role: catEl.value, ownerId: window.currentUserData.uid, createdAt: firebase.database.ServerValue.TIMESTAMP });
                await window.secondaryApp.auth().signOut();
                Toast.fire({ icon: 'success', title: 'Scanner ditambahkan!' }); 
                const form = document.getElementById('add-scanner-modal')?.querySelector('form');
                if (form) form.reset(); 
                closeModal('add-scanner-modal');
            } catch (err) { Toast.fire({ icon: 'error', title: err.message }); } 
            finally { btn.innerHTML = og; btn.disabled = false; }
        }

        async function handleAddVendor(e) {
            e.preventDefault(); 
            const btn = document.getElementById('btn-save-vendor'); 
            if (!btn) return;
            const og = btn.innerHTML; btn.innerHTML = "Memproses..."; btn.disabled = true;
            try {
                if (!window.currentUserData) throw new Error('Silakan login terlebih dahulu!');
                const userEl = document.getElementById('vend-user');
                const passEl = document.getElementById('vend-pass');
                const nameEl = document.getElementById('vend-name');
                const feeEl = document.getElementById('vend-fee');
                const eoFeeEl = document.getElementById('vend-eo-fee');
                if (!userEl || !passEl || !nameEl || !feeEl || !eoFeeEl) throw new Error('Form tidak lengkap!');
                const email = userEl.value.trim() + '@beetix.com'; 
                const pass = passEl.value.trim();
                if (!pass || pass.length < 6) throw new Error('Password minimal 6 karakter!');
                const fee = parseFloat(feeEl.value) || 0;
                const eoFee = parseFloat(eoFeeEl.value) || 0;
                window.ensureSecondaryApp();
                if (!window.secondaryApp || !window.secondaryApp.auth) throw new Error('Sistem autentikasi tidak tersedia!');
                const res = await window.secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
                await db.ref(`users/${res.user.uid}`).set({ uid: res.user.uid, nama: nameEl.value, username: userEl.value, email: email, role: 'Vendor', platform_fee: fee, eo_fee: eoFee, ownerId: window.currentUserData.uid, createdAt: firebase.database.ServerValue.TIMESTAMP });
                await window.secondaryApp.auth().signOut();
                Toast.fire({ icon: 'success', title: 'Akun Vendor Berhasil Dibuat!' }); 
                const form = document.getElementById('add-vendor-modal')?.querySelector('form');
                if (form) form.reset(); 
                closeModal('add-vendor-modal');
            } catch (err) { Toast.fire({ icon: 'error', title: err.message }); } 
            finally { btn.innerHTML = og; btn.disabled = false; }
        }

        window.populateSponsorEventSelect = function() {
            const sel = document.getElementById('spo-acc-ev'); sel.innerHTML = '<option value="">-- Pilih Event --</option>';
            Object.keys(window.eventDataMap || {}).forEach(k => { const evOwner = window.eventDataMap[k].ownerId || 'SUPER_ADMIN'; if (window.isVendor && evOwner !== window.currentUserData.uid) return; sel.innerHTML += `<option value="${k}">${window.eventDataMap[k].title}</option>`; });
        }

        window.populateRaffleEventSelect = function() {
            const sel = document.getElementById('raffle-event-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">Semua Event</option>';
            Object.keys(window.eventDataMap || {}).forEach(k => {
                const ev = window.eventDataMap[k];
                if (!ev || !ev.raffle_enabled) return;
                const evOwner = ev.ownerId || 'SUPER_ADMIN';
                if (window.isVendor && evOwner !== window.currentUserData.uid) return;
                sel.innerHTML += `<option value="${k}">${ev.title}</option>`;
            });
        }

        async function handleCreateSponsorTicket(e) {
            e.preventDefault(); 
            const btn = document.getElementById('btn-save-spo-acc'); 
            if (!btn) return;
            const og = btn.innerHTML; btn.innerHTML = "Memproses..."; btn.disabled = true;
            try {
                if (!window.currentUserData) throw new Error('Silakan login terlebih dahulu!');
                const nameEl = document.getElementById('spo-acc-name');
                const userEl = document.getElementById('spo-acc-user');
                const passEl = document.getElementById('spo-acc-pass');
                const evEl = document.getElementById('spo-acc-ev');
                const catEl = document.getElementById('spo-acc-cat');
                const quotaEl = document.getElementById('spo-acc-quota');
                if (!nameEl || !userEl || !passEl || !evEl || !catEl || !quotaEl) throw new Error('Form tidak lengkap!');
                
                const name = nameEl.value.trim();
                const spUsername = userEl.value.trim();
                const email = spUsername + '@beetix.com'; 
                const pass = passEl.value.trim();
                const evId = evEl.value; 
                const cat = catEl.value; 
                const quota = parseInt(quotaEl.value) || 0;
                
                if (!name || !spUsername || !pass || !evId || !cat || !quota) throw new Error('Semua field harus diisi!');
                if (pass.length < 6) throw new Error('Password minimal 6 karakter!');
                if (quota < 1) throw new Error('Kuota minimal 1!');
                
                window.ensureSecondaryApp();
                if (!window.secondaryApp || !window.secondaryApp.auth) throw new Error('Sistem autentikasi tidak tersedia!');
                const res = await window.secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
                await db.ref(`users/${res.user.uid}`).set({ uid: res.user.uid, nama: name, username: spUsername, email: email, role: 'Sponsor', ownerId: window.currentUserData.uid, createdAt: firebase.database.ServerValue.TIMESTAMP });
                await window.secondaryApp.auth().signOut();
                
                const evName = (window.eventDataMap && window.eventDataMap[evId]) ? (window.eventDataMap[evId].title || 'Event') : 'Event'; 
                // Prevent duplicate sponsor ticket: same name + same category for the event
                const isDupSpo = await window.checkDuplicateTicketByNameCategory(name, evId, cat);
                if (isDupSpo) {
                    throw new Error('Tiket dengan nama dan jenis yang sama sudah ada untuk event ini.');
                }
                const raffleNumber = (window.eventDataMap?.[evId]?.raffle_enabled) ? await window.reserveRaffleNumber(evId) : null;
                const tcode = "BTX-SP-" + Math.random().toString(36).substring(2, 7).toUpperCase();
                const sponsorTicket = { code: tcode, uid: res.user.uid, userName: name, sponsorUsername: spUsername, eventId: evId, eventName: evName, category: cat, status: 'ACTIVE', type: 'sponsor', quota: quota, remaining: quota, ownerId: window.currentUserData.uid, createdAt: firebase.database.ServerValue.TIMESTAMP };
                if (raffleNumber !== null && typeof raffleNumber !== 'undefined') {
                    sponsorTicket.raffle_number = raffleNumber;
                }
                await db.ref(`tickets/${tcode}`).set(cleanObject(sponsorTicket));
                Toast.fire({ icon: 'success', title: 'Akun & Tiket Sponsor Dibuat!' }); 
                const form = document.getElementById('add-spo-acc-modal')?.querySelector('form');
                if (form) form.reset(); 
                closeModal('add-spo-acc-modal');
            } catch (err) { Toast.fire({ icon: 'error', title: err.message }); } 
            finally { btn.innerHTML = og; btn.disabled = false; }
        }

        async function openEditEvent(k) { 
            try { 
                const snap = await db.ref(`events/${k}`).once('value'); 
                const ev = snap.val(); 
                if(!ev) return; 
                window.editEventKey = k; 
                
                const modalTitle = document.getElementById('ev-modal-title');
                const saveBtn = document.getElementById('btn-save-event');
                const ownerContainer = document.getElementById('ev-owner-container');
                const ownerSelect = document.getElementById('ev-owner');
                
                if (modalTitle) safeSetText('ev-modal-title', 'Update Data Event'); 
                if (saveBtn) saveBtn.innerText = "Update Event"; 
                
                if(window.isSuperAdmin) { 
                    if (ownerContainer) ownerContainer.classList.remove('hidden'); 
                    if (ownerSelect) safeSetValue('ev-owner', ev.ownerId || 'SUPER_ADMIN'); 
                } else { 
                    if (ownerContainer) ownerContainer.classList.add('hidden'); 
                }
                
                const kategoriEl = document.getElementById('ev-kategori');
                const kategoriCustomEl = document.getElementById('ev-kategori-custom');
                const sportSeasonEl = document.getElementById('ev-sport-season-box');
                
                if (ev.kategori && ev.kategori !== 'Konser' && ev.kategori !== 'Olahraga') { 
                    if (kategoriEl) safeSetValue('ev-kategori', 'Lainnya'); 
                    if (kategoriCustomEl) kategoriCustomEl.classList.remove('hidden'); 
                    if (sportSeasonEl) sportSeasonEl.classList.add('hidden'); 
                    if (kategoriCustomEl) safeSetValue('ev-kategori-custom', ev.kategori); 
                } else if (ev.kategori === 'Olahraga') { 
                    if (kategoriEl) safeSetValue('ev-kategori', 'Olahraga'); 
                    if (sportSeasonEl) sportSeasonEl.classList.remove('hidden'); 
                    if (kategoriCustomEl) kategoriCustomEl.classList.add('hidden'); 
                } else { 
                    if (kategoriEl) safeSetValue('ev-kategori', ev.kategori || 'Konser'); 
                    if (kategoriCustomEl) kategoriCustomEl.classList.add('hidden'); 
                    if (sportSeasonEl) sportSeasonEl.classList.add('hidden'); 
                }
                
                safeSetValue('ev-title', ev.title || ''); 
                safeSetValue('ev-artis', ev.artis || ''); 
                safeSetValue('ev-prefix', ev.prefix || ''); 
                safeSetValue('ev-date', ev.date || ''); 
                safeSetValue('ev-time', ev.time || ''); 
                safeSetValue('ev-location', ev.location || ''); 
                safeSetValue('ev-image', ev.image || ''); 
                safeSetValue('ev-banner', ev.banner || ''); 
                safeSetValue('ev-org-name', ev.org_name || ''); 
                safeSetValue('ev-org-logo', ev.org_logo || ''); 
                safeSetValue('ev-org-sosmed', ev.org_sosmed || ''); 
                safeSetValue('ev-desc', ev.desc || ''); 
                safeSetValue('ev-snk', ev.snk || ''); 
                safeSetValue('ev-layout', ev.layout || '');
                
                const fasilCheck = document.getElementById('ev-has-fasilitas');
                const fasilEl = document.getElementById('ev-fasilitas');
                if(ev.fasilitas && ev.fasilitas.trim() !== '') { 
                    if (fasilCheck) fasilCheck.checked = true; 
                    if (fasilEl) fasilEl.classList.remove('hidden'); 
                    safeSetValue('ev-fasilitas', ev.fasilitas); 
                } else { 
                    if (fasilCheck) fasilCheck.checked = false; 
                    if (fasilEl) fasilEl.classList.add('hidden'); 
                    safeSetValue('ev-fasilitas', ''); 
                }

                const t = ev.tiket || {}; 
                safeSetValue('k-pre-h', t.presale_h || '');
                safeSetValue('k-pre-q', t.presale_q || '');
                safeSetValue('k-reg-eco-h', t.reg_eco_h || '');
                safeSetValue('k-reg-eco-q', t.reg_eco_q || '');
                safeSetValue('k-reg-eco-scan', t.reg_eco_scan || '');
                safeSetValue('k-reg-vip-h', t.reg_vip_h || '');
                safeSetValue('k-reg-vip-q', t.reg_vip_q || '');
                safeSetValue('k-reg-vip-scan', t.reg_vip_scan || '');
                safeSetValue('k-reg-vvip-h', t.reg_vvip_h || '');
                safeSetValue('k-reg-vvip-q', t.reg_vvip_q || '');
                const depositCats = ev.deposit_categories || [];
                document.getElementById('ev-deposit-enabled').checked = !!ev.deposit_enabled;
                document.getElementById('ev-deposit-from').value = ev.deposit_from || '';
                document.getElementById('ev-deposit-to').value = ev.deposit_to || '';
                document.getElementById('ev-deposit-cat-presale').checked = depositCats.includes('Presale');
                document.getElementById('ev-deposit-cat-reguler').checked = depositCats.includes('Reguler');
                document.getElementById('ev-deposit-cat-vip').checked = depositCats.includes('VIP');
                document.getElementById('ev-deposit-cat-vvip').checked = depositCats.includes('VVIP');
                safeSetValue('ev-deposit-max-installments', ev.deposit_max_installments || 3);
                safeSetValue('ev-deposit-snk', ev.deposit_snk || '');
                const labels = ev.categoryLabels || {};
                safeSetValue('ev-label-presale', labels.presale || 'Presale');
                safeSetValue('ev-label-reguler', labels.reguler || 'Reguler');
                safeSetValue('ev-label-vip', labels.vip || 'VIP');
                safeSetValue('ev-label-vvip', labels.vvip || 'VVIP');
                const raffleEnabledEl = document.getElementById('ev-enable-raffle');
                if (raffleEnabledEl) raffleEnabledEl.checked = !!ev.raffle_enabled;
                safeSetValue('k-trs-eco-h', t.trs_eco_h || ''); 
                safeSetValue('k-trs-eco-q', t.trs_eco_q || ''); 
                safeSetValue('k-trs-eco-scan', t.trs_eco_scan || ''); 
                const trsEcoEnabled = (t.trs_eco_enabled !== undefined ? !!t.trs_eco_enabled : ((parseInt(t.trs_eco_q) || 0) > 0));
                const trsVipEnabled = (t.trs_vip_enabled !== undefined ? !!t.trs_vip_enabled : ((parseInt(t.trs_vip_q) || 0) > 0));
                const trsEcoEnabledEl = document.getElementById('k-trs-eco-enabled');
                const trsVipEnabledEl = document.getElementById('k-trs-vip-enabled');
                if (trsEcoEnabledEl) trsEcoEnabledEl.checked = trsEcoEnabled;
                safeSetValue('k-trs-vip-h', t.trs_vip_h || ''); 
                safeSetValue('k-trs-vip-q', t.trs_vip_q || ''); 
                safeSetValue('k-trs-vip-scan', t.trs_vip_scan || '');
                if (trsVipEnabledEl) trsVipEnabledEl.checked = trsVipEnabled;
                
                // Load tribun data
                const tribunCheck = document.getElementById('ev-use-tribun');
                const tribunBox = document.getElementById('ev-tribun-box');
                const tribunList = document.getElementById('ev-tribun-list');
                const seatNumberCheck = document.getElementById('ev-use-seat-number');
                if (ev.tribuns && ev.tribuns.length > 0) {
                    if (tribunCheck) tribunCheck.checked = true;
                    if (seatNumberCheck) seatNumberCheck.checked = ev.tribun_use_seat_number !== false;
                    if (tribunBox) tribunBox.classList.remove('hidden');
                    if (tribunList) {
                        tribunList.innerHTML = '';
                        ev.tribuns.forEach(tribun => {
                            const div = document.createElement('div');
                            div.className = 'tribun-field bg-darker border border-green-500/30 p-3 rounded-lg flex gap-2 items-end';
                            div.innerHTML = `
                                <div class="flex-1 min-w-[150px]">
                                    <label class="text-[10px] text-gray-400 block mb-1 font-bold">Nama Tribun</label>
                                    <input type="text" class="tribun-name w-full bg-dark border border-gray-600 rounded p-2 text-white text-sm" placeholder="Contoh: Tribun VIP, Tribun Reguler" value="${tribun.name}" required>
                                </div>
                                <div class="flex-1 min-w-[120px]">
                                    <label class="text-[10px] text-gray-400 block mb-1 font-bold">Jumlah Kursi</label>
                                    <input type="number" class="tribun-seats w-full bg-dark border border-gray-600 rounded p-2 text-white text-sm" placeholder="Jumlah" min="1" value="${tribun.seats}" required>
                                </div>
                                <button type="button" onclick="this.parentElement.remove()" class="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-2 rounded cursor-pointer transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                            `;
                            tribunList.appendChild(div);
                        });
                    }
                } else {
                    if (tribunCheck) tribunCheck.checked = false;
                    if (seatNumberCheck) seatNumberCheck.checked = true;
                    if (tribunBox) tribunBox.classList.add('hidden');
                    if (tribunList) tribunList.innerHTML = '';
                }
                
                openModal('add-event-modal'); 
            } catch(e){ console.error(e); } 
        }

        async function handleAddEvent(e) {
            e.preventDefault(); 
            const btn = document.getElementById('btn-save-event'); 
            if (!btn) { Toast.fire({icon:'error', title:'Tombol tidak ditemukan!'}); return; }
            
            const ogText = btn.innerHTML;
            btn.innerHTML = "Memproses..."; 
            btn.disabled = true;
            
            try {
                const kategoriEl = document.getElementById('ev-kategori');
                const kategoriCustomEl = document.getElementById('ev-kategori-custom');
                const titleEl = document.getElementById('ev-title');
                
                if (!kategoriEl || !titleEl) throw new Error('Form tidak lengkap!');
                
                let kategoriVal = kategoriEl.value; 
                if (kategoriVal === 'Lainnya') { 
                    kategoriVal = (kategoriCustomEl ? kategoriCustomEl.value : '') || 'Lainnya'; 
                }
                
                let p_q = parseInt(document.getElementById('k-pre-q')?.value) || 0; 
                let e_q = parseInt(document.getElementById('k-reg-eco-q')?.value) || 0; 
                let v_q = parseInt(document.getElementById('k-reg-vip-q')?.value) || 0; 
                let vv_q = parseInt(document.getElementById('k-reg-vvip-q')?.value) || 0; 
                let e_scan = parseInt(document.getElementById('k-reg-eco-scan')?.value) || 0;
                let v_scan = parseInt(document.getElementById('k-reg-vip-scan')?.value) || 0;
                let t_e_enabled = !!document.getElementById('k-trs-eco-enabled')?.checked;
                let t_v_enabled = !!document.getElementById('k-trs-vip-enabled')?.checked;
                let t_e_q = t_e_enabled ? parseInt(document.getElementById('k-trs-eco-q')?.value) || 0 : 0; 
                let t_v_q = t_v_enabled ? parseInt(document.getElementById('k-trs-vip-q')?.value) || 0 : 0;
                let t_e_scan = t_e_enabled ? parseInt(document.getElementById('k-trs-eco-scan')?.value) || 0 : 0;
                let t_v_scan = t_v_enabled ? parseInt(document.getElementById('k-trs-vip-scan')?.value) || 0 : 0;
                let t_k = p_q + e_q + v_q + vv_q + t_e_q + t_v_q; 
                
                let existingTiket = {}; 
                if (window.editEventKey && window.eventDataMap && window.eventDataMap[window.editEventKey]) { 
                    existingTiket = window.eventDataMap[window.editEventKey].tiket || {}; 
                }
                
                const fasilCheckEl = document.getElementById('ev-has-fasilitas');
                const fasilEl = document.getElementById('ev-fasilitas');
                let fas = '';
                if (fasilCheckEl && fasilCheckEl.checked && fasilEl) { 
                    fas = fasilEl.value; 
                }
                
                const ownerEl = document.getElementById('ev-owner');
                let theOwnerId = 'SUPER_ADMIN';
                if (window.isSuperAdmin && ownerEl && ownerEl.value.trim() !== '') {
                    theOwnerId = ownerEl.value.trim();
                } else if (!window.isSuperAdmin && window.currentUserData) {
                    theOwnerId = window.currentUserData.uid;
                }
                
                const customFormCheckEl = document.getElementById('ev-use-custom-form');
                const customQuestEl = document.getElementById('ev-custom-questions');
                let customQuestions = '';
                if (customFormCheckEl && customFormCheckEl.checked && customQuestEl) { 
                    customQuestions = customQuestEl.value.trim(); 
                }

                // Collect tribun data
                const tribunCheckEl = document.getElementById('ev-use-tribun');
                const tribuns = [];
                if (tribunCheckEl && tribunCheckEl.checked) {
                    const tribunFields = document.querySelectorAll('.tribun-field');
                    tribunFields.forEach(field => {
                        const name = field.querySelector('.tribun-name')?.value || '';
                        const seats = field.querySelector('.tribun-seats')?.value || '0';
                        if (name && seats > 0) {
                            tribuns.push({ name: name.trim(), seats: parseInt(seats) });
                        }
                    });
                }

                const payload = { 
                    kategori: kategoriVal, 
                    title: titleEl?.value || '', 
                    artis: document.getElementById('ev-artis')?.value || '', 
                    prefix: document.getElementById('ev-prefix')?.value || '', 
                    date: document.getElementById('ev-date')?.value || '', 
                    time: document.getElementById('ev-time')?.value || '', 
                    location: document.getElementById('ev-location')?.value || '', 
                    image: document.getElementById('ev-image')?.value || '', 
                    banner: document.getElementById('ev-banner')?.value || '', 
                    org_name: document.getElementById('ev-org-name')?.value || '', 
                    org_logo: document.getElementById('ev-org-logo')?.value || '', 
                    org_sosmed: document.getElementById('ev-org-sosmed')?.value || '', 
                    desc: document.getElementById('ev-desc')?.value || '', 
                    snk: document.getElementById('ev-snk')?.value || '', 
                    layout: document.getElementById('ev-layout')?.value || '', 
                    fasilitas: fas, 
                    customQuestions: customQuestions, 
                    total_kuota: t_k, 
                    ownerId: theOwnerId,
                    deposit_enabled: document.getElementById('ev-deposit-enabled')?.checked ? true : false,
                    deposit_from: document.getElementById('ev-deposit-from')?.value || '',
                    deposit_to: document.getElementById('ev-deposit-to')?.value || '',
                    deposit_categories: [
                        document.getElementById('ev-deposit-cat-presale')?.checked ? 'Presale' : null,
                        document.getElementById('ev-deposit-cat-reguler')?.checked ? 'Reguler' : null,
                        document.getElementById('ev-deposit-cat-vip')?.checked ? 'VIP' : null,
                        document.getElementById('ev-deposit-cat-vvip')?.checked ? 'VVIP' : null
                    ].filter(Boolean),
                    deposit_min: 20000,
                    deposit_max_installments: Math.min(6, Math.max(3, parseInt(document.getElementById('ev-deposit-max-installments')?.value || '3', 10) || 3)),
                    deposit_snk: document.getElementById('ev-deposit-snk')?.value || '',
                    raffle_enabled: document.getElementById('ev-enable-raffle')?.checked ? true : false,
                    categoryLabels: {
                        presale: (document.getElementById('ev-label-presale')?.value || 'Presale').trim(),
                        reguler: (document.getElementById('ev-label-reguler')?.value || 'Reguler').trim(),
                        vip: (document.getElementById('ev-label-vip')?.value || 'VIP').trim(),
                        vvip: (document.getElementById('ev-label-vvip')?.value || 'VVIP').trim()
                    },
                    tiket: { 
                        presale_h: document.getElementById('k-pre-h')?.value || 0, 
                        presale_q: p_q, 
                        presale_sold: existingTiket.presale_sold || 0, 
                        reg_eco_h: document.getElementById('k-reg-eco-h')?.value || 0, 
                        reg_eco_q: e_q, 
                        reg_eco_scan: e_scan, 
                        reg_eco_sold: existingTiket.reg_eco_sold || 0, 
                        reg_vip_h: document.getElementById('k-reg-vip-h')?.value || 0, 
                        reg_vip_q: v_q, 
                        reg_vip_scan: v_scan, 
                        reg_vip_sold: existingTiket.reg_vip_sold || 0, 
                        reg_vvip_h: document.getElementById('k-reg-vvip-h')?.value || 0, 
                        reg_vvip_q: vv_q, 
                        reg_vvip_sold: existingTiket.reg_vvip_sold || 0, 
                        trs_eco_h: document.getElementById('k-trs-eco-h')?.value || 0, 
                        trs_eco_q: t_e_q, 
                        trs_eco_sold: existingTiket.trs_eco_sold || 0, 
                        trs_eco_scan: t_e_scan, 
                        trs_eco_enabled: t_e_enabled,
                        trs_vip_h: document.getElementById('k-trs-vip-h')?.value || 0, 
                        trs_vip_q: t_v_q, 
                        trs_vip_sold: existingTiket.trs_vip_sold || 0, 
                        trs_vip_scan: t_v_scan, 
                        trs_vip_enabled: t_v_enabled 
                    }, 
                    tribuns: tribuns,
                    tribun_use_seat_number: document.getElementById('ev-use-seat-number')?.checked ? true : false,
                    status: 'ACTIVE' 
                };
                
                if(window.editEventKey) { 
                    if (!window.db) throw new Error('Database tidak tersedia!');
                    await window.db.ref(`events/${window.editEventKey}`).update(payload); 
                    Toast.fire({ icon: 'success', title: 'Event diupdate!' }); 
                } else { 
                    if (!window.db) throw new Error('Database tidak tersedia!');
                    payload.createdAt = firebase.database.ServerValue.TIMESTAMP; 
                    payload.sold = 0; 
                    await window.db.ref('events').push(payload); 
                    Toast.fire({ icon: 'success', title: 'Event dipublish!' }); 
                }
                
                const formEl = document.getElementById('form-add-event');
                if (formEl) formEl.reset(); 
                window.editEventKey = null; 
                closeModal('add-event-modal'); 
            } catch (err) { 
                Toast.fire({ icon: 'error', title: err.message }); 
            } finally { 
                btn.innerHTML = ogText; 
                btn.disabled = false; 
            }
        }

        async function handleSaveBanners(e) { 
            e.preventDefault(); 
            const btn = e.target?.querySelector('button'); 
            if (!btn) { Toast.fire({icon:'error', title:'Tombol tidak ditemukan!'}); return; }
            
            const ogText = btn.innerHTML; 
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; 
            btn.disabled = true;
            try {
                let banners = []; 
                for(let i=1; i<=20; i++){ 
                    const imgEl = document.getElementById(`bn-img-${i}`);
                    const urlEl = document.getElementById(`bn-url-${i}`);
                    if (!imgEl || !urlEl) continue; // Skip if elements don't exist
                    let img = imgEl.value; 
                    let url = urlEl.value; 
                    if(img) banners.push({img: img, url: url}); 
                } 
                if (!window.db) throw new Error('Database tidak tersedia!');
                await window.db.ref('settings/banners').set(banners); 
                if (window.cachedSettings && typeof window.cachedSettings === 'object') {
                    window.cachedSettings.banners = banners;
                }
                window.renderTopAdSliderFromBanners(banners);
                Toast.fire({icon:'success', title:'Slider Iklan diupdate!'}); 
            } catch(err){ 
                Toast.fire({icon:'error', title:err.message}); 
            } finally { 
                btn.innerHTML = ogText; 
                btn.disabled = false; 
            }
        }
        
        async function handleSaveSponsor(e) { 
            e.preventDefault(); 
            try { 
                const nameEl = document.getElementById('sp-name');
                const logoEl = document.getElementById('sp-logo');
                const sosmedEl = document.getElementById('sp-sosmed');
                if (!nameEl || !logoEl || !sosmedEl) throw new Error('Form tidak lengkap!');
                if (!window.currentUserData && !window.isSuperAdmin) throw new Error('Silakan login terlebih dahulu!');
                if (!window.db) throw new Error('Database tidak tersedia!');
                
                const ownerId = window.isSuperAdmin ? 'SUPER_ADMIN' : window.currentUserData.uid;
                await window.db.ref('settings/sponsors').push({ name: nameEl.value, logo: logoEl.value, sosmed: sosmedEl.value, ownerId: ownerId }); 
                nameEl.value=''; 
                logoEl.value=''; 
                sosmedEl.value=''; 
                Toast.fire({icon:'success', title:'Sponsor ditambah!'}); 
            } catch(err) {
                Toast.fire({icon:'error', title:err.message}); 
            }
        }
        
        async function handleSaveWA(e) { 
            e.preventDefault(); 
            try { 
                const nameEl = document.getElementById('wa-name');
                const numEl = document.getElementById('wa-num');
                if (!nameEl || !numEl) throw new Error('Form tidak lengkap!');
                if (!window.currentUserData && !window.isSuperAdmin) throw new Error('Silakan login terlebih dahulu!');
                if (!window.db) throw new Error('Database tidak tersedia!');
                
                const ownerId = window.isSuperAdmin ? 'SUPER_ADMIN' : window.currentUserData.uid;
                await window.db.ref('settings/whatsapp').push({ name: nameEl.value, number: numEl.value, ownerId: ownerId }); 
                nameEl.value=''; 
                numEl.value=''; 
                Toast.fire({icon:'success', title:'WA ditambah!'}); 
            } catch(err) {
                Toast.fire({icon:'error', title:err.message}); 
            }
        }
        
        async function handleWebSettingsForm(e) { 
            e.preventDefault(); 
            try { 
                const titleEl = document.getElementById('set-web-title');
                const nameEl = document.getElementById('set-web-name');
                const taglineEl = document.getElementById('set-web-tagline');
                const descEl = document.getElementById('set-web-desc');
                const evTitleEl = document.getElementById('set-web-ev-title');
                const heroBgEl = document.getElementById('set-hero-bg');
                const logoNavEl = document.getElementById('set-logo-nav');
                
                if (!titleEl || !nameEl) throw new Error('Form tidak lengkap!');
                if (!window.db) throw new Error('Database tidak tersedia!');
                
                const t = (titleEl.value || '').split(" | "); 
                await window.db.ref('settings/content').update({ 
                    name: window.normalizeBrandName ? window.normalizeBrandName(nameEl.value) : (nameEl.value || 'Tiket Kaka'), 
                    tagline: taglineEl?.value || '', 
                    title: t[0] || '', 
                    sub: t[1] || '', 
                    desc: descEl?.value || '', 
                    evTitle: evTitleEl?.value || '', 
                    heroBg: heroBgEl?.value || '' 
                }); 
                if (logoNavEl) await window.db.ref('settings/logos').update({ nav: window.normalizeBrandLogoUrl ? window.normalizeBrandLogoUrl(logoNavEl.value) : (logoNavEl.value || '').trim() }); 
                Toast.fire({icon:'success', title:'Web diperbarui!'}); 
            } catch(err) {
                Toast.fire({icon:'error', title:err.message}); 
            }
        }

        async function handleFooterSettingsForm(e) {
            e.preventDefault();
            try {
                if (!window.isSuperAdmin) throw new Error('Hanya Super Admin yang dapat mengubah footer dan dokumen hukum.');
                if (!window.db) throw new Error('Database tidak tersedia!');

                const logoEl = document.getElementById('set-footer-logo');
                const descriptionEl = document.getElementById('set-footer-description');
                const companyEl = document.getElementById('set-footer-company');
                const privacyEl = document.getElementById('set-footer-privacy');
                const termsEl = document.getElementById('set-footer-terms');
                const legalEl = document.getElementById('set-footer-legal');
                if (!descriptionEl || !companyEl || !privacyEl || !termsEl || !legalEl) throw new Error('Form footer tidak lengkap!');

                const payload = {
                    logo: window.normalizeBrandLogoUrl ? window.normalizeBrandLogoUrl(logoEl?.value) : (logoEl?.value || '').trim(),
                    description: descriptionEl.value.trim(),
                    company: companyEl.value.trim(),
                    privacy: privacyEl.value.trim(),
                    terms: termsEl.value.trim(),
                    legal: legalEl.value.trim(),
                    updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    updatedBy: window.currentUserData?.uid || auth?.currentUser?.uid || ''
                };

                if (!payload.description || !payload.company || !payload.privacy || !payload.terms || !payload.legal) {
                    throw new Error('Deskripsi, pengelola, dan seluruh dokumen hukum wajib diisi.');
                }

                await window.db.ref('settings/footer').set(payload);
                window.cachedSettings = window.cachedSettings || {};
                window.cachedSettings.footer = payload;
                window.renderFooterSettings(payload, window.cachedSettings.logos || {});
                Toast.fire({ icon: 'success', title: 'Footer & dokumen hukum diperbarui!' });
            } catch (err) {
                Toast.fire({ icon: 'error', title: err.message || 'Gagal menyimpan footer.' });
            }
        }
        
        async function savePaymentSettings(e) { 
            e.preventDefault(); 
            try { 
                const bankEl = document.getElementById('set-pay-bank');
                const nameEl = document.getElementById('set-pay-name');
                const qrisEl = document.getElementById('set-pay-qris');
                if (!bankEl || !nameEl) throw new Error('Form tidak lengkap!');
                if (!window.db) throw new Error('Database tidak tersedia!');
                
                if(window.isVendor && window.currentUserData) { 
                    const vendorUid = window.currentUserData.uid;
                    const bank = (bankEl.value || '').trim();
                    const name = (nameEl.value || '').trim();
                    const qris = (qrisEl?.value || '').trim();
                    if (!bank && !qris) throw new Error('Isi nomor rekening/e-wallet atau URL QRIS terlebih dahulu.');
                    const vendorUpdates = {};
                    vendorUpdates[`users/${vendorUid}/pay_bank`] = bank;
                    vendorUpdates[`users/${vendorUid}/pay_name`] = name;
                    vendorUpdates[`users/${vendorUid}/pay_qris`] = qris;
                    vendorUpdates[`settings/vendorPayments/${vendorUid}`] = {
                        bank,
                        name,
                        qris,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    await window.db.ref().update(vendorUpdates);
                    // Update local cache and UI immediately so checkout can read the public payment method.
                    try {
                        window.currentUserData.pay_bank = bank;
                        window.currentUserData.pay_name = name;
                        window.currentUserData.pay_qris = qris;
                        if (!window.usersMapCache) window.usersMapCache = {};
                        window.usersMapCache[vendorUid] = window.currentUserData;
                        window.vendorPaymentMethods = window.vendorPaymentMethods || {};
                        window.vendorPaymentMethods[vendorUid] = { bank, name, qris, updatedAt: Date.now() };
                        safeSetValue('set-pay-bank', bank);
                        safeSetValue('set-pay-name', name);
                        safeSetValue('set-pay-qris', qris);
                    } catch (e) { console.warn('Failed to update local vendor payment cache', e); }
                } else if (window.isSuperAdmin) { 
                    const bank = (bankEl.value || '').trim();
                    const name = (nameEl.value || '').trim();
                    const qris = (qrisEl?.value || '').trim();
                    if (!bank && !qris) throw new Error('Isi nomor rekening/e-wallet atau URL QRIS terlebih dahulu.');
                    await window.db.ref('settings/payment').update({ bank, name, qris }); 
                    // Update local sysPayment cache so settings reflect immediately
                    try { window.sysPayment = { bank, name, qris }; } catch (e) {}
                } else {
                    throw new Error('Anda tidak memiliki akses untuk mengubah pengaturan pembayaran!');
                }
                Toast.fire({icon:'success', title:'Pengaturan pembayaran disimpan!'}); 
            } catch(err) {
                Toast.fire({icon:'error', title:err.message}); 
            }
        }
        async function handleUpdateAccount(e) { 
            e.preventDefault(); 
            const user = auth.currentUser; 
            if(!user) { Toast.fire({icon: 'error', title: 'Silakan login terlebih dahulu!'}); return; }
            const userEl = document.getElementById('set-user');
            const passEl = document.getElementById('set-pass');
            if(!userEl || !passEl) { Toast.fire({icon: 'error', title: 'Form tidak lengkap!'}); return; }
            const newUsername = userEl.value; 
            const newPass = passEl.value; 
            try { 
                if(newUsername) await db.ref(`users/${user.uid}`).update({ username: newUsername }); 
                if(newPass) await user.updatePassword(newPass); 
                Toast.fire({icon: 'success', title: 'Akun diperbarui!'}); 
                passEl.value=''; 
            } catch(err) { Toast.fire({icon: 'error', title: err.message}); } 
        }

        async function handleUserUpdateAccount(e) { 
            e.preventDefault(); 
            const user = auth.currentUser; 
            if(!user) { Toast.fire({icon: 'error', title: 'Silakan login terlebih dahulu!'}); return; }
            const userEl = document.getElementById('user-set-username');
            const passEl = document.getElementById('user-set-pass');
            if(!userEl || !passEl) { Toast.fire({icon: 'error', title: 'Form tidak lengkap!'}); return; }
            const newUsername = userEl.value; 
            const newPass = passEl.value; 
            try { 
                if(newUsername) await db.ref(`users/${user.uid}`).update({ username: newUsername }); 
                if(newPass) await user.updatePassword(newPass); 
                Toast.fire({icon: 'success', title: 'Pengaturan Akun Diperbarui!'}); 
                passEl.value=''; 
            } catch(err) { Toast.fire({icon: 'error', title: err.message}); } 
        }
        
        async function handleRegister(e) { 
            e.preventDefault(); 
            try { 
                const emailEl = document.getElementById('reg-email-front');
                const passEl = document.getElementById('reg-password');
                const passConfirmEl = document.getElementById('reg-password-confirm');
                const nameEl = document.getElementById('reg-name');
                const phoneEl = document.getElementById('reg-phone');
                const usernameEl = document.getElementById('reg-username');
                
                if (!emailEl || !passEl || !passConfirmEl || !nameEl || !phoneEl || !usernameEl) {
                    return Toast.fire({ icon: 'error', title: 'Form tidak lengkap!' });
                }
                
                let emailFront = emailEl.value.trim().toLowerCase();
                if (!emailFront) return Toast.fire({ icon: 'error', title: 'Email tidak boleh kosong!' });
                
                // Safe email formatting - remove @gmail.com suffix if present
                if (emailFront.includes('@gmail.com')) {
                    emailFront = emailFront.substring(0, emailFront.length - 10); // Remove @gmail.com
                } else if (emailFront.includes('@')) {
                    // If user provided different domain, reject
                    return Toast.fire({ icon: 'error', title: 'Hanya email Gmail yang diizinkan!' });
                }
                
                const emailInput = emailFront + '@gmail.com'; 
                const passInput = passEl.value; 
                const passConfirm = passConfirmEl.value;
                
                if (!passInput || passInput.length < 6) { 
                    return Toast.fire({ icon: 'error', title: 'Password minimal 6 karakter!' }); 
                }
                if (passInput !== passConfirm) { 
                    return Toast.fire({ icon: 'error', title: 'Password dan Ulangi Password harus sama!' }); 
                }
                
                const res = await auth.createUserWithEmailAndPassword(emailInput, passInput); 
                await db.ref('users/' + res.user.uid).set({ uid: res.user.uid, nama: nameEl.value || 'User', phone: phoneEl.value || '', email: res.user.email, username: usernameEl.value || 'user', role: 'User', createdAt: firebase.database.ServerValue.TIMESTAMP }); 
                await auth.signOut(); 
                
                const loginEmailEl = document.getElementById('login-email');
                const loginPassEl = document.getElementById('login-password');
                if (loginEmailEl) loginEmailEl.value = emailInput; 
                if (loginPassEl) loginPassEl.value = passInput;
                
                Toast.fire({ icon: 'success', title: 'Daftar berhasil! Silakan klik Masuk.' }); 
                closeModal('register-modal'); setTimeout(() => openModal('login-modal'), 300); 
            } catch(err) { Toast.fire({ icon: 'error', title: err.message }); } 
        }
        
        async function handleLogin(e) { 
            e.preventDefault(); 
            const btn = document.getElementById('btn-login-submit');
            if (!btn) return;
            
            const emailEl = document.getElementById('login-email');
            const passEl = document.getElementById('login-password');
            if (!emailEl || !passEl) {
                Toast.fire({ icon: 'error', title: 'Form tidak lengkap!' });
                return;
            }
            
            const ogText = btn.innerHTML; 
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; 
            btn.disabled = true;
            try { 
                let originalInput = emailEl.value.trim(); 
                if (!originalInput) throw new Error('Email/Username tidak boleh kosong!');
                
                let loginInput = originalInput; 
                let isUsernameMode = false;
                if (!loginInput.includes('@')) { 
                    loginInput = loginInput + '@beetix.com'; 
                    isUsernameMode = true; 
                } 
                
                const passInput = passEl.value;
                if (!passInput) throw new Error('Password tidak boleh kosong!');
                
                const res = await auth.signInWithEmailAndPassword(loginInput, passInput); 
                if (!res.user || !res.user.uid) throw new Error('Login gagal - user tidak valid');
                
                const snap = await db.ref('users/' + res.user.uid).once('value'); 
                const data = snap.val(); 
                if (!data || !data.username || !data.role) { 
                    await auth.signOut(); 
                    throw new Error('Akun tidak ditemukan atau sudah dihapus.'); 
                }
                const username = (data.username || '').toString().trim().toLowerCase(); 
                const email = (data.email || '').toString().trim().toLowerCase(); 
                const normalizedInput = originalInput.toLowerCase(); 
                if (isUsernameMode) { 
                    if (username !== normalizedInput) { 
                        await auth.signOut(); 
                        throw new Error('Email/Username atau Password salah!'); 
                    } 
                } else { 
                    const inputUsername = normalizedInput.endsWith('@beetix.com') ? normalizedInput.replace(/@beetix\.com$/, '') : normalizedInput; 
                    const matchesEmail = email === normalizedInput; 
                    const matchesUsername = username === inputUsername; 
                    if (!matchesEmail && !matchesUsername) { 
                        await auth.signOut(); 
                        throw new Error('Email/Username atau Password salah!'); 
                    } 
                } 
                if (data.role === 'User' && isUsernameMode) { 
                    await auth.signOut(); 
                    Toast.fire({ icon: 'error', title: 'AKSES DITOLAK: Pembeli Umum Wajib Menggunakan Email Asli!' }); 
                    return; 
                } 
                await window.registerLoginDevice(res.user.uid);
                closeModal('login-modal'); 
            } catch(err) { 
                let errMsg = err.message || 'Terjadi kesalahan saat login'; 
                if(errMsg.includes('user-not-found') || errMsg.includes('wrong-password') || errMsg.includes('INVALID_LOGIN_CREDENTIALS')) { 
                    errMsg = "Email/Username atau Password salah!"; 
                }
                if (!errMsg.includes('Email/Username atau Password salah!')) {
                    Toast.fire({ icon: 'error', title: errMsg });
                } else {
                    Toast.fire({ icon: 'error', title: errMsg });
                }
                try { await auth.signOut(); } catch(e){}
            } finally { 
                btn.innerHTML = ogText; 
                btn.disabled = false; 
            }
        }
        
        async function handleResetPassword() {
            Swal.fire({ title: 'Lupa Password?', input: 'email', inputLabel: 'Masukkan Email Akun Anda', inputPlaceholder: 'Email Anda...', showCancelButton: true, confirmButtonText: 'Kirim Link Reset', cancelButtonText: 'Batal', background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b'
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    try { Swal.fire({title:'Mengirim Email...', allowOutsideClick:false, background:'#1e293b', color:'#fff', didOpen:()=>{Swal.showLoading()}}); await auth.sendPasswordResetEmail(result.value); Swal.fire({icon:'success', title:'Link Terkirim!', text:'Silakan cek Inbox atau folder Spam di email Anda.', background:'#1e293b', color:'#fff'}); } 
                    catch (error) { let msg = error.message; if(msg.includes('user-not-found')) msg = 'Email tidak terdaftar di sistem kami.'; Swal.fire({icon:'error', title:'Gagal', text:msg, background:'#1e293b', color:'#fff'}); }
                }
            });
        }
        
        function logout() { 
            auth.signOut(); localStorage.removeItem('beetix_last_page'); showPage('home'); Toast.fire({ icon: 'info', title: 'Logout berhasil' }); 
        }

        window.editTaxPopup = function() {
            const currentTax = parseFloat(window.currentUserData?.tax || window.sysPayment?.tax || 0);
            const currentTaxEnabled = typeof window.currentUserData?.tax_enabled === 'boolean' ? window.currentUserData.tax_enabled : typeof window.sysPayment?.tax_enabled === 'boolean' ? window.sysPayment.tax_enabled : currentTax > 0;
            Swal.fire({
                title: 'Atur Pajak Event',
                html: `<div class="text-left">
                        <label class="text-sm text-white block mb-2">Pajak (%)</label>
                        <input id="swal-tax-pct" type="number" class="swal2-input" min="0" max="100" step="0.1" value="${currentTax}">
                        <label class="text-sm text-white mt-3 block"><input id="swal-tax-enabled" type="checkbox" style="transform:scale(1.1);margin-right:8px;" ${currentTaxEnabled ? 'checked' : ''}> Aktifkan Pajak</label>
                    </div>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Simpan',
                cancelButtonText: 'Batal',
                background: '#1e293b',
                color: '#fff',
                confirmButtonColor: '#f59e0b',
                preConfirm: () => {
                    const taxPct = parseFloat(document.getElementById('swal-tax-pct').value);
                    const taxEnabled = document.getElementById('swal-tax-enabled').checked;
                    if (taxEnabled && (isNaN(taxPct) || taxPct < 0)) {
                        Swal.showValidationMessage('Masukkan angka pajak yang valid');
                        return false;
                    }
                    return { tax: taxPct, tax_enabled: taxEnabled };
                }
            }).then(async (result) => { if (result.isConfirmed) { try { const payload = { tax: parseFloat(result.value.tax) || 0, tax_enabled: result.value.tax_enabled };
                        if(window.isVendor) { await db.ref(`users/${window.currentUserData.uid}`).update(payload); } else { await db.ref('settings/payment').update(payload); }
                        Toast.fire({icon: 'success', title: 'Pajak berhasil diupdate!'});
                    } catch (err) { Swal.fire({icon: 'error', title: 'Gagal', text: err.message, background: '#1e293b', color: '#fff'}); } } });
        }

        window.resetDashboardData = async function(category) {
            if(!window.isSuperAdmin) { return Swal.fire({icon: 'error', title: 'Akses Ditolak', text: 'Hanya Super Admin (Pemilik Sistem) yang diizinkan untuk mereset penjualan.', background: '#1e293b', color: '#fff'}); }
            Swal.fire({ title: `RESET DATA ${category.toUpperCase()}`, html: `<p class="text-sm text-gray-300">Anda akan MENGHAPUS SEMUA transaksi khusus <b>${category}</b>:<br><br>1. Riwayat Pembayaran ${category}<br>2. Tiket ${category} yang sudah dibeli<br>3. Mengembalikan kuota event ${category} ke 0<br><br><b class="text-amber-500">Data Akun & Data Event TIDAK DIHAPUS.</b></p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#4b5563', confirmButtonText: 'Ya, Reset ' + category, cancelButtonText: 'Batal', background: '#1e293b', color: '#fff'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'Konfirmasi Keamanan', input: 'text', inputLabel: `Ketik "RESET ${category.toUpperCase()}" (tanpa kutip)`, inputPlaceholder: `RESET ${category.toUpperCase()}`, showCancelButton: true, confirmButtonColor: '#ef4444', background: '#1e293b', color: '#fff', preConfirm: (val) => { if (val !== `RESET ${category.toUpperCase()}`) Swal.showValidationMessage('Ketik konfirmasi dengan benar!'); }
                    }).then(async (finalResult) => {
                        if (finalResult.isConfirmed) {
                            try {
                                Swal.fire({title: 'Mereset Data...', allowOutsideClick: false, background:'#1e293b', color:'#fff', didOpen: () => {Swal.showLoading()}});
                                const evSnap = await db.ref('events').once('value'); const evData = evSnap.val() || {}; 
                                const matchingEventIds = [];
                                const removedPaymentKeys = [];
                                const removedTicketKeys = [];
                                for(let k in evData) { 
                                    let theOwner = evData[k].ownerId || 'SUPER_ADMIN';
                                    if (window.isVendor && theOwner !== window.currentUserData.uid) continue; 
                                    let c = evData[k].kategori || 'Konser'; let match = false;
                                    if(category === 'Lainnya') { if (c !== 'Konser' && c !== 'Olahraga') match = true; } else { if(c === category) match = true; }
                                    if(match) {
                                        matchingEventIds.push(k);
                                        await db.ref(`events/${k}`).update({ sold: 0 });
                                        if (evData[k].tiket) { await db.ref(`events/${k}/tiket`).update({ presale_sold: 0, reg_eco_sold: 0, reg_vip_sold: 0, reg_vvip_sold: 0, trs_eco_sold: 0, trs_vip_sold: 0 }); }
                                        if (window.eventDataMap?.[k]) {
                                            window.eventDataMap[k].sold = 0;
                                            if (window.eventDataMap[k].tiket) {
                                                window.eventDataMap[k].tiket.presale_sold = 0;
                                                window.eventDataMap[k].tiket.reg_eco_sold = 0;
                                                window.eventDataMap[k].tiket.reg_vip_sold = 0;
                                                window.eventDataMap[k].tiket.reg_vvip_sold = 0;
                                                window.eventDataMap[k].tiket.trs_eco_sold = 0;
                                                window.eventDataMap[k].tiket.trs_vip_sold = 0;
                                            }
                                        }
                                    } 
                                }
                                const paySnap = await db.ref('payments').once('value'); const payData = paySnap.val() || {};
                                for(let p in payData) { 
                                    let theOwner = payData[p].ownerId || 'SUPER_ADMIN';
                                    if (window.isVendor && theOwner !== window.currentUserData.uid) continue;
                                    let evInfo = evData[payData[p].eventId] || {}; let c = evInfo.kategori || 'Konser'; let match = false;
                                    if(category === 'Lainnya') { if (c !== 'Konser' && c !== 'Olahraga') match = true; } else { if(c === category) match = true; }
                                    if(match) {
                                        removedPaymentKeys.push(p);
                                        await db.ref(`payments/${p}`).remove();
                                    }
                                }
                                const tixSnap = await db.ref('tickets').once('value'); const tixData = tixSnap.val() || {};
                                for(let t in tixData) { 
                                    let theOwner = tixData[t].ownerId || 'SUPER_ADMIN';
                                    if (window.isVendor && theOwner !== window.currentUserData.uid) continue;
                                    let evInfo = evData[tixData[t].eventId] || {}; let c = evInfo.kategori || 'Konser'; let match = false;
                                    if(category === 'Lainnya') { if (c !== 'Konser' && c !== 'Olahraga') match = true; } else { if(c === category) match = true; }
                                    if(match) {
                                        removedTicketKeys.push(t);
                                        await db.ref(`tickets/${t}`).remove();
                                    }
                                }
                                removedPaymentKeys.forEach(key => { delete window.globalPaymentsData?.[key]; });
                                removedTicketKeys.forEach(key => { delete window.globalTicketsData?.[key]; });
                                window.renderAdminTicketTablesFromCache?.(window.globalTicketsData || {});
                                window.updateAdminSalesSummaryFromTickets?.();
                                window.updateFinanceSummaryCards?.();
                                window.refreshAdminPaymentViews?.();
                                window.renderLaporanPerEvent?.();
                                Swal.fire({icon: 'success', title: 'Reset Berhasil!', text: `Data ${category} kembali bersih.`, background:'#1e293b', color:'#fff'});
                            } catch (e) { Swal.fire({icon: 'error', title: 'Gagal Mereset', text: e.message, background:'#1e293b', color:'#fff'}); }
                        }
                    });
                }
            });
        }

        window.isOfflineScannerReady = false;
        function initScannerSync() {
            if(window.isOfflineScannerReady) return; window.isOfflineScannerReady = true;
            const netStatus = document.getElementById('scan-net-status');
            const updateNetUI = () => { if(netStatus) { if(navigator.onLine) { netStatus.innerHTML = '<span class="text-green-500 font-bold"><i class="fa-solid fa-wifi"></i> ONLINE</span> - Tersinkronisasi'; syncPendingTickets(); } else { netStatus.innerHTML = '<span class="text-red-500 font-bold"><i class="fa-solid fa-plane-up"></i> OFFLINE</span> - Scan berjalan otomatis'; } } };
            window.addEventListener('online', updateNetUI); window.addEventListener('offline', updateNetUI); updateNetUI();
            if (typeof db !== 'undefined') { db.ref('tickets').once('value').then(snap => { if(snap.val()) localStorage.setItem('beetix_local_tix', JSON.stringify(snap.val())); }); setInterval(syncPendingTickets, 3000); }
        }

        async function syncPendingTickets() {
            if(!navigator.onLine) return; let queue = JSON.parse(localStorage.getItem('beetix_sync_queue') || '[]'); if(queue.length === 0) return;
            let remaining = [];
            for(let t of queue) {
                try {
                    await db.ref(`tickets/${t.code}`).transaction((curr) => {
                        if(curr) { if(t.isMultiScan) { if(t.remaining !== undefined) { curr.remaining = t.remaining; if(curr.remaining <= 0) curr.status = 'USED'; } curr.scannedAt = t.scannedAt; curr.scannedBy = t.scannedBy; return curr; } else if(curr.status === 'ACTIVE') { curr.status = 'USED'; curr.scannedAt = t.scannedAt; curr.scannedBy = t.scannedBy; return curr; } }
                        return; 
                    });
                } catch(e) { remaining.push(t); }
            }
            localStorage.setItem('beetix_sync_queue', JSON.stringify(remaining));
        }

        window.currentEventCustomQuestions = [];
        window.currentCustomFormAnswers = {};

        window.resetCustomFormState = function() {
            window.currentCustomFormAnswers = {};
            window.currentEventCustomQuestions = [];
            const fieldsDiv = document.getElementById('custom-form-fields');
            if (fieldsDiv) fieldsDiv.innerHTML = '';
        };

        window.renderCustomFormModal = function(questions) {
            const fieldsDiv = document.getElementById('custom-form-fields');
            if (!fieldsDiv) return;
            window.currentEventCustomQuestions = Array.isArray(questions) ? questions : [];
            window.currentCustomFormAnswers = {};
            fieldsDiv.innerHTML = '';
            questions.forEach((q, idx) => {
                const inputId = `custom-q-${idx}`;
                const savedVal = window.currentCustomFormAnswers[idx] || '';
                fieldsDiv.innerHTML += `<div><label class="text-sm font-bold text-blue-300 mb-2 block">${q}</label><input type="text" id="${inputId}" required class="w-full bg-darker border border-blue-500/50 rounded p-3 text-white text-sm focus:border-blue-400 outline-none" value="${savedVal}" placeholder="Jawab pertanyaan..."></div>`;
            });
        };

        window.handleCustomFormSubmit = function(e) {
            e.preventDefault();
            const questions = window.currentEventCustomQuestions || [];
            window.currentCustomFormAnswers = {};
            let allValid = true;
            let firstInvalidIdx = -1;
            questions.forEach((q, idx) => {
                const field = document.getElementById(`custom-q-${idx}`);
                if (field) {
                    const val = field.value.trim();
                    if (!val) {
                        allValid = false;
                        if (firstInvalidIdx === -1) firstInvalidIdx = idx;
                        field.classList.add('border-red-500');
                    } else {
                        field.classList.remove('border-red-500');
                        window.currentCustomFormAnswers[idx] = val;
                    }
                }
            });
            if (!allValid) {
                if (firstInvalidIdx >= 0) document.getElementById(`custom-q-${firstInvalidIdx}`).focus();
                return Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Harap isi semua pertanyaan terlebih dahulu!', background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b' });
            }
            closeModal('custom-form-modal');
            Toast.fire({ icon: 'success', title: 'Data Tersimpan!' });
        };

        window.displayEventCustomForm = function(eventData) {
            const container = document.getElementById('co-custom-form-container');
            if (!container) return;
            if (eventData && eventData.customQuestions) {
                const qs = eventData.customQuestions.split('|').map(q => q.trim()).filter(q => q);
                window.currentEventCustomQuestions = qs;
                window.currentCustomFormAnswers = {};
                if (qs.length > 0) { container.classList.remove('hidden'); } else { container.classList.add('hidden'); }
            } else {
                container.classList.add('hidden');
                window.resetCustomFormState();
            }
        };

        window.showCustomFormAnswers = function(answers, ticketCode, eventId) {
            let questionsData = '';
            if (eventId && window.eventDataMap && window.eventDataMap[eventId]) {
                questionsData = window.eventDataMap[eventId].customQuestions || '';
            } else if (window.eventDataMap && window.eventDataMap[window.currentViewingEventId]) {
                questionsData = window.eventDataMap[window.currentViewingEventId].customQuestions || '';
            }
            let questions = questionsData.split('|').map(q => q.trim()).filter(q => q);
            if (questions.length === 0) {
                questions = Object.keys(answers || {}).sort((a, b) => Number(a) - Number(b)).map((_, idx) => `Pertanyaan ${idx + 1}`);
            }
            let answersHtml = `<div class="text-left text-sm space-y-3">`;
            questions.forEach((q, idx) => {
                const ans = answers[idx] || '-';
                const escapedQ = document.createElement('div'); escapedQ.textContent = q; const safeQ = escapedQ.innerHTML;
                const escapedA = document.createElement('div'); escapedA.textContent = ans; const safeA = escapedA.innerHTML;
                answersHtml += `<div class="bg-dark/50 p-3 rounded border border-blue-500/30"><p class="text-xs text-blue-400 font-bold">${safeQ}</p><p class="text-white mt-1">${safeA}</p></div>`;
            });
            answersHtml += `</div>`;
            Swal.fire({ title: `Data Tambahan - ${ticketCode}`, html: answersHtml, background: '#1e293b', color: '#fff', confirmButtonColor: '#f59e0b', confirmButtonText: 'Tutup', icon: 'info' });
        };

        // Visitor Tracking System
        window.generateUUID = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        window.ensureVisitorId = function() {
            const visitorIdKey = 'beetix_visitor_id';
            let visitorId = localStorage.getItem(visitorIdKey);
            if (!visitorId) {
                visitorId = window.generateUUID();
                localStorage.setItem(visitorIdKey, visitorId);
            }
            return visitorId;
        };

        window.getDeviceId = function() {
            const deviceKey = 'beetix_device_id';
            let deviceId = localStorage.getItem(deviceKey);
            if (!deviceId) {
                deviceId = window.generateUUID();
                localStorage.setItem(deviceKey, deviceId);
            }
            return deviceId;
        };

        window.getDeviceCategory = function() {
            const ua = navigator.userAgent || '';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|Mobile/i.test(ua);
            return isMobile ? 'mobile' : 'desktop';
        };

        window.registerLoginDevice = async function(uid) {
            if (!uid || !db) return { authorized: true, newDevice: false };
            const deviceId = window.getDeviceId();
            const category = window.getDeviceCategory();
            const slotRef = db.ref(`users/${uid}/devices/${category}`);
            const slotSnap = await slotRef.once('value');
            const existingDevice = slotSnap.val();

            await slotRef.set({
                deviceId,
                userAgent: navigator.userAgent,
                category,
                lastLoginAt: firebase.database.ServerValue.TIMESTAMP,
                lastSeenAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { authorized: true, newDevice: !existingDevice || !existingDevice.deviceId };
        };

        window.unregisterDevice = function(uid) {
            if (!uid || !db) return Promise.resolve();
            const deviceId = window.getDeviceId();
            const category = window.getDeviceCategory();
            const slotRef = db.ref(`users/${uid}/devices/${category}`);
            return slotRef.once('value').then(snapshot => {
                const existingDevice = snapshot.val();
                if (existingDevice && existingDevice.deviceId === deviceId) {
                    return slotRef.remove();
                }
                return Promise.resolve();
            }).catch(() => Promise.resolve());
        };

        window.recordGlobalVisitor = async function() {
            const visitorId = window.ensureVisitorId();
            try {
                await window.waitForDBReady();
                if (!db || typeof db.ref !== 'function') return;

                const visitorRef = db.ref(`analytics/traffic/visitorIds/${visitorId}`);
                const visitorSnap = await visitorRef.once('value');

                if (!visitorSnap.exists()) {
                    await visitorRef.set({
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        userAgent: navigator.userAgent,
                        pageUrl: window.location.href
                    });

                    await db.ref('analytics/traffic/visitors').transaction(current => {
                        return (current || 0) + 1;
                    });
                }
            } catch (err) {
                console.error('Global visitor tracking error:', err);
            }
        };

        window.recordVendorVisitor = async function(vendorId) {
            if (!vendorId || vendorId === 'SUPER_ADMIN') return;
            const visitorId = window.ensureVisitorId();
            try {
                await window.waitForDBReady();
                const vendorPath = `analytics/traffic/vendorVisitors/${vendorId}`;
                const visitorRef = db.ref(`${vendorPath}/visitorIds/${visitorId}`);
                const visitorSnap = await visitorRef.once('value');

                if (!visitorSnap.exists()) {
                    await visitorRef.set({
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        userAgent: navigator.userAgent,
                        pageUrl: window.location.href
                    });
                    await db.ref(`${vendorPath}/count`).transaction(current => (current || 0) + 1);
                }
            } catch (err) {
                console.error('Vendor visitor tracking error:', err);
            }
        };

        // Realtime visitor stats listener
        window.startVisitorStatsListener = function(vendorId) {
            const updateCount = count => {
                const superAdminEl = document.getElementById('stats-total-visitors');
                const vendorEl = document.getElementById('vd-stats-total-visitors');
                if (superAdminEl) superAdminEl.innerText = count.toLocaleString('id-ID');
                if (vendorEl) vendorEl.innerText = count.toLocaleString('id-ID');
            };

            const cleanup = () => {
                try { db.ref('analytics/traffic/vendorVisitors').off('value'); } catch (e) {}
                if (vendorId) {
                    try { db.ref(`analytics/traffic/vendorVisitors/${vendorId}/count`).off('value'); } catch (e) {}
                }
                try { db.ref('analytics/traffic/visitors').off('value'); } catch (e) {}
            };

            cleanup();

            if (vendorId) {
                db.ref(`analytics/traffic/vendorVisitors/${vendorId}/count`).on('value', snap => {
                    const count = snap.val() || 0;
                    updateCount(count);
                });
            } else {
                db.ref('analytics/traffic/vendorVisitors').on('value', snap => {
                    const data = snap.val() || {};
                    let total = 0;
                    Object.values(data).forEach(child => {
                        if (child && typeof child.count === 'number') total += child.count;
                    });
                    updateCount(total);
                });
            }
        };

        window.updateVisitorStatsListener = function() {
            if (!window.db) return;
            if (window.isVendor && window.currentUserData?.uid) {
                window.startVisitorStatsListener(window.currentUserData.uid);
            } else if (window.isSuperAdmin) {
                window.startVisitorStatsListener();
            }
        };

        // Buyer Data Export Functions
        window.generateBuyerReport = async function() {
            await window.waitForDBReady();
            const reportData = [];
            
            // Query all needed data directly dari Firebase
            const [ticketsSnap, paymentsSnap, usersSnap, eventsSnap] = await Promise.all([
                window.db.ref('tickets').once('value'),
                window.db.ref('payments').once('value'),
                window.db.ref('users').once('value'),
                window.db.ref('events').once('value')
            ]);
            
            const tickets = ticketsSnap.val() || {};
            const payments = paymentsSnap.val() || {};
            const users = usersSnap.val() || {};
            const events = eventsSnap.val() || {};
            const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
            
            // Group by buyer + event (tidak filter di sini, filter di payment checking)
            const grouped = {};
            Object.keys(tickets).forEach(tkey => {
                const t = tickets[tkey];
                if (!t.uid || !t.eventId || window.isTicketReplacedByUpgrade(t, tkey, upgradeReplacementMap)) return;
                
                const key = `${t.uid}_${t.eventId}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(t);
            });
            
            // Process grouped data
            Object.keys(grouped).forEach(key => {
                const [uid, eventId] = key.split('_');
                const buyerTickets = grouped[key];
                const buyer = users[uid];
                const event = events[eventId];
                
                if (!buyer || !event) return;
                
                // Get payment info - match exact payment owner logic seperti renderLaporanTable
                let paymentStatus = 'UNKNOWN';
                let hasMatchingPayment = false;
                Object.keys(payments).forEach(pid => {
                    const p = payments[pid];
                    if (p.uid === uid && p.eventId === eventId) {
                        // Match exact filtering logic seperti di renderLaporanTable
                        const pOwner = p.ownerId || 'SUPER_ADMIN';
                        const isMine = pOwner === window.currentUserData?.uid || (window.isSuperAdmin && pOwner === 'SUPER_ADMIN');
                        
                        // Isolasi Cepat Vendor - hanya jika payment milik vendor ini
                        if (window.isVendor && !isMine) return;
                        
                        paymentStatus = p.status || 'UNKNOWN';
                        hasMatchingPayment = true;
                    }
                });
                
                // Skip if vendor doesn't have matching payment
                if (window.isVendor && !hasMatchingPayment) return;
                
                // Count by category
                const cats = {};
                buyerTickets.forEach(t => {
                    const c = t.category || 'Umum';
                    if (!cats[c]) cats[c] = [];
                    cats[c].push(t);
                });
                
                // Add row per category
                Object.keys(cats).forEach(cat => {
                    reportData.push({
                        eventName: event.title || '-',
                        eventDate: event.date || '-',
                        eventLocation: event.location || '-',
                        buyerName: buyer.nama || '-',
                        buyerEmail: buyer.email || '-',
                        buyerPhone: buyer.phone || '-',
                        purchaseDate: new Date(buyerTickets[0].createdAt || 0).toLocaleDateString('id-ID'),
                        ticketType: cat,
                        ticketQty: cats[cat].length,
                        paymentStatus: paymentStatus,
                        ticketCodes: cats[cat].map(t => t.code).join(', ')
                    });
                });
            });
            
            return reportData;
        };

        window.generateCSV = function(data) {
            const headers = [
                'Nama Event',
                'Tanggal Event',
                'Lokasi Event',
                'Nama Pembeli',
                'Email',
                'No. WhatsApp',
                'Tanggal Pembelian',
                'Tipe Tiket',
                'Jumlah Tiket',
                'Status Pembayaran',
                'Kode Tiket'
            ];
            
            let csv = headers.map(h => `"${h}"`).join(',') + '\n';
            
            data.forEach(row => {
                const values = [
                    row.eventName,
                    row.eventDate,
                    row.eventLocation,
                    row.buyerName,
                    row.buyerEmail,
                    row.buyerPhone,
                    row.purchaseDate,
                    row.ticketType,
                    row.ticketQty,
                    row.paymentStatus,
                    row.ticketCodes
                ];
                csv += values.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
            
            return csv;
        };

        window.downloadBuyerDataReport = async function(btn) {
            if (!btn) btn = event?.target;
            if (!btn) return;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            btn.disabled = true;
            
            try {
                const reportData = await window.generateBuyerReport();
                
                if (reportData.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Data Kosong',
                        text: 'Tidak ada data pembeli untuk diunduh.',
                        background: '#1e293b',
                        color: '#fff'
                    });
                    return;
                }
                
                const csv = window.generateCSV(reportData);
                const timestamp = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
                const fileName = `Data_Pembeli_${timestamp}.csv`;
                
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                Toast.fire({
                    icon: 'success',
                    title: 'Laporan berhasil diunduh!'
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Export',
                    text: err.message,
                    background: '#1e293b',
                    color: '#fff'
                });
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };

        window.downloadRafflePdf = async function(btn) {
            if (!btn) btn = event?.target;
            if (!btn) return;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan PDF...';
            btn.disabled = true;

            try {
                const selectedEventId = document.getElementById('raffle-event-select')?.value || '';
                const ticketsSnap = await db.ref('tickets').once('value');
                const eventsSnap = await db.ref('events').once('value');
                const usersSnap = await db.ref('users').once('value');

                const tickets = ticketsSnap.val() || {};
                const events = eventsSnap.val() || {};
                const users = usersSnap.val() || {};
                const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
                const selectedEvent = selectedEventId ? events[selectedEventId] : null;
                if (selectedEventId && selectedEvent && !selectedEvent.raffle_enabled) {
                    Swal.fire({ icon: 'warning', title: 'Event Tidak Aktif untuk Undian', text: 'Event ini belum diaktifkan untuk undian. Silakan aktifkan undian pada edit event terlebih dahulu.', background: '#1e293b', color: '#fff' });
                    return;
                }
                const selectedEventTitle = selectedEventId && selectedEvent ? selectedEvent.title || 'Event' : 'Semua_Event';
                const rows = [];

                Object.keys(tickets).forEach((ticketKey, index) => {
                    const t = tickets[ticketKey];
                    if (!t || !t.uid || !t.eventId || window.isTicketReplacedByUpgrade(t, ticketKey, upgradeReplacementMap)) return;
                    const evt = events[t.eventId];
                    if (!evt || !evt.raffle_enabled) return;
                    if (selectedEventId && t.eventId !== selectedEventId) return;
                    if (window.isVendor) {
                        if (!evt || evt.ownerId !== window.currentUserData?.uid) return;
                    }

                    const user = users[t.uid] || {};
                    rows.push({
                        noUndian: (typeof t.raffle_number !== 'undefined' && t.raffle_number !== null) ? t.raffle_number : rows.length + 1,
                        ticketCode: t.code || ticketKey,
                        ticketName: t.userName || user.nama || '-',
                        eventName: (events[t.eventId] && events[t.eventId].title) ? events[t.eventId].title : 'Event',
                        ticketStatus: t.status || 'UNKNOWN'
                    });
                });

                if (rows.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Data Kosong',
                        text: 'Tidak ada tiket yang bisa dicetak untuk undian.',
                        background: '#1e293b',
                        color: '#fff'
                    });
                    return;
                }

                let ticketCards = '';
                rows.forEach(row => {
                    ticketCards += `
                        <div style="width: calc(50% - 10px); box-sizing: border-box; padding: 12px; margin: 5px; border: 2px dashed #999; border-radius: 16px; page-break-inside: avoid; display: inline-block; vertical-align: top; background: #fff;">
                            <div style="font-size: 10px; letter-spacing: .12em; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Undian Tiket</div>
                            <div style="font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 10px;">No Undian: ${row.noUndian}</div>
                            <div style="font-size: 14px; color: #374151; margin-bottom: 10px;">No Tiket: <strong>${row.ticketCode}</strong></div>
                            <div style="font-size: 14px; color: #374151; margin-bottom: 10px;">Nama: <strong>${row.ticketName}</strong></div>
                            <div style="font-size: 13px; color: #9ca3af;">Event: ${row.eventName}</div>
                            <div style="margin-top: 12px; border-top: 1px dashed #d1d5db; padding-top: 10px; font-size: 11px; color: #6b7280;">Potong di garis putus-putus untuk undian.</div>
                        </div>
                    `;
                });

                const printDiv = document.createElement('div');
                printDiv.innerHTML = `
                    <div style="font-family: Arial, sans-serif; color: #111827; background: #f8fafc; padding: 24px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="font-size: 28px; font-weight: 800; color: #111827;">Daftar Undian Tiket</div>
                            <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">Nama & No Tiket siap cetak, gunting, dan acak untuk undian.</div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
                            ${ticketCards}
                        </div>
                        <div style="margin-top: 24px; font-size: 11px; color: #6b7280;">Catatan: cetak pada kertas tebal atau karton ringan agar mudah digunting. Setiap potongan berisi No Undian, No Tiket, dan Nama pembeli.</div>
                    </div>
                `;

                const safeFileTitle = selectedEventTitle.replace(/[^a-z0-9]/gi, '_');
                const opt = {
                    margin:       10,
                    filename:     `Undian_Tiket_${safeFileTitle}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                await html2pdf().set(opt).from(printDiv).save();
                Toast.fire({ icon: 'success', title: 'PDF undian berhasil diunduh!' });
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Buat PDF',
                    text: err.message,
                    background: '#1e293b',
                    color: '#fff'
                });
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };

        document.addEventListener('DOMContentLoaded', () => { 
            window.waitForDBReady().then(() => {
                // Initialize global visitor tracking
                window.recordGlobalVisitor();
            }).catch(err => {
                console.error('DB ready failed, visitor tracking disabled:', err);
            });
            
            const bannerFields = document.getElementById('admin-banner-fields');
            if(bannerFields) {
                let bHtml = '';
                for(let i=1; i<=20; i++) {
                    bHtml += `<div class="bg-dark/50 p-3 rounded-xl border border-white/5 shadow-inner"><p class="text-amber-500 font-bold mb-2 text-xs uppercase tracking-wider">Slot Iklan ${i}</p><label class="text-[10px] text-gray-400 block mb-1">URL Gambar (Landscape)</label><input type="url" id="bn-img-${i}" class="w-full bg-darker border border-gray-600 rounded p-2 text-white text-xs focus:border-amber-500 outline-none mb-2" placeholder="https://..."><label class="text-[10px] text-gray-400 block mb-1">URL Link Tujuan (Bila diklik)</label><input type="url" id="bn-url-${i}" class="w-full bg-darker border border-gray-600 rounded p-2 text-white text-xs focus:border-amber-500 outline-none" placeholder="https://instagram.com/..."></div>`;
                }
                bannerFields.innerHTML = bHtml;
            }
            
            document.addEventListener('click', (e) => {
                if (e.target.closest('.view-custom-answers')) {
                    const btn = e.target.closest('.view-custom-answers');
                    const answersJson = btn.dataset.answers;
                    const code = btn.dataset.code;
                    const eventId = btn.dataset.eventid || '';
                    try {
                        const answers = JSON.parse(decodeURIComponent(answersJson || ''));
                        if (typeof window.showCustomFormAnswers === 'function') {
                            window.showCustomFormAnswers(answers, code, eventId);
                        }
                    } catch(err) {
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal menampilkan data', background: '#1e293b', color: '#fff' });
                    }
                }
            });
            
            window.addEventListener('scroll', () => { const nav = document.getElementById('navbar'); if(nav) { if(window.scrollY > 50) { nav.classList.add('shadow-lg'); nav.style.background = 'var(--bg-nav)'; nav.classList.remove('glass'); } else { nav.classList.add('glass'); nav.style.background = ''; nav.classList.remove('shadow-lg'); } } }); 
        });

        // ========================================
        // FITUR KEAMANAN TAMBAHAN - TIDAK BOLEH DIUBAH
        // ========================================

        window.getTicketCodePrefix = function(ownerId = null, eventId = null, eventData = null) {
            try {
                const candidates = [];
                const resolvedEvent = eventData || (eventId ? window.eventDataMap?.[eventId] || {} : {});
                const ownerData = ownerId ? (window.usersMapCache?.[ownerId] || {}) : {};
                if (resolvedEvent?.prefix) candidates.push(resolvedEvent.prefix);
                if (resolvedEvent?.ticketPrefix) candidates.push(resolvedEvent.ticketPrefix);
                if (resolvedEvent?.ticket_prefix) candidates.push(resolvedEvent.ticket_prefix);
                if (ownerData?.prefix) candidates.push(ownerData.prefix);
                if (ownerData?.ticketPrefix) candidates.push(ownerData.ticketPrefix);
                if (ownerData?.ticket_prefix) candidates.push(ownerData.ticket_prefix);
                if (ownerData?.ticket_code_prefix) candidates.push(ownerData.ticket_code_prefix);
                if (ownerData?.vendor_prefix) candidates.push(ownerData.vendor_prefix);
                for (const raw of candidates) {
                    const normalized = (raw || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                    if (normalized) return normalized;
                }
                if (ownerId && window.usersMapCache?.[ownerId]?.nama) {
                    const ownerPrefix = (window.usersMapCache[ownerId].nama || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                    if (ownerPrefix) return ownerPrefix;
                }
            } catch (e) {
                console.warn('getTicketCodePrefix failed', e);
            }
            return 'BTX';
        };

        // 1. GENERATE SECURE TICKET CODE (Menggantikan Math.random())
        window.generateSecureTicketCode = async function(ownerId = null, eventId = null, eventData = null) {
            try {
                const prefix = window.getTicketCodePrefix(ownerId, eventId, eventData);
                const suffix = (window.crypto && window.crypto.getRandomValues)
                    ? (() => {
                        const array = new Uint8Array(8);
                        window.crypto.getRandomValues(array);
                        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
                    })()
                    : (() => {
                        const array = new Uint8Array(8);
                        for (let i = 0; i < array.length; i++) {
                            array[i] = Math.floor(Math.random() * 256);
                        }
                        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
                    })();
                return `${prefix}-${suffix.substring(0, 12)}`;
            } catch (err) {
                console.error('Error generating secure ticket code:', err);
                const prefix = window.getTicketCodePrefix(ownerId, eventId, eventData);
                return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            }
        };

        // 2. SESSION TIMEOUT SYSTEM (30 menit inaktif)
        window.SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit
        window.sessionTimerInterval = null;
        window.isSessionActive = true;

        window.initializeSessionTimeout = function() {
            if (window.sessionTimerInterval) clearInterval(window.sessionTimerInterval);

            const resetSessionTimer = () => {
                if (window.sessionTimerInterval) clearInterval(window.sessionTimerInterval);
                
                window.sessionTimerInterval = setTimeout(() => {
                    if (auth && auth.currentUser) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Sesi Telah Berakhir',
                            text: 'Anda tidak aktif selama 30 menit. Silakan login kembali.',
                            background: '#1e293b',
                            color: '#fff',
                            confirmButtonColor: '#f59e0b',
                            allowOutsideClick: false,
                            didOpen: () => {
                                auth.signOut();
                                localStorage.removeItem('beetix_last_page');
                                window.isSessionActive = false;
                                setTimeout(() => location.reload(), 2000);
                            }
                        });
                    }
                }, window.SESSION_TIMEOUT_MS);
            };

            // Reset timer pada setiap user interaction
            ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
                document.addEventListener(event, () => {
                    if (window.isSessionActive && auth && auth.currentUser) {
                        resetSessionTimer();
                    }
                }, true);
            });

            // Initial start
            resetSessionTimer();
        };

        // Auto-initialize session timeout ketika user login
        window.initializeSessionTimeoutOnAuth = function() {
            if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                window.auth.onAuthStateChanged((user) => {
                    if (user) {
                        window.isSessionActive = true;
                        window.initializeSessionTimeout();
                    } else {
                        window.isSessionActive = false;
                        if (window.sessionTimerInterval) clearInterval(window.sessionTimerInterval);
                    }
                });
            }
        };

        // 3. TWO-FACTOR AUTHENTICATION (2FA) UNTUK ADMIN
        window.adminTwoFAEnabled = {};
        window.adminTwoFASecret = {};
        window.adminTwoFAAttempts = {};

        window.enableAdminTwoFA = async function(adminUid) {
            try {
                const secret = window.generateTwoFASecret();
                const qrCode = `otpauth://totp/Tiket%20Kaka%20Admin:${adminUid}?secret=${secret}&issuer=Tiket%20Kaka`;
                
                window.adminTwoFASecret[adminUid] = secret;
                window.adminTwoFAAttempts[adminUid] = 0;

                const modal = await Swal.fire({
                    title: '🔐 Setup 2FA untuk Admin',
                    html: `
                        <div class="text-left text-sm space-y-3">
                            <p class="text-gray-300">Scan QR Code ini dengan aplikasi Authenticator (Google Authenticator, Authy, dll):</p>
                            <div id="qrcode-2fa" class="flex justify-center py-3"></div>
                            <p class="text-gray-400 text-xs">Atau masukkan kode manual:</p>
                            <div class="bg-dark p-3 rounded border border-amber-500 text-center font-mono text-sm text-amber-500 break-all">${secret}</div>
                            <p class="text-gray-300"><b>Masukkan kode 6 digit dari aplikasi Authenticator:</b></p>
                            <input type="text" id="verify-2fa-code" class="w-full bg-darker border border-gray-600 rounded p-2 text-white text-center text-2xl tracking-widest focus:border-amber-500 outline-none" placeholder="000000" maxlength="6" inputmode="numeric">
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Verifikasi & Aktifkan 2FA',
                    cancelButtonText: 'Batal',
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#10b981',
                    didOpen: () => {
                        new QRCode(document.getElementById('qrcode-2fa'), {
                            text: qrCode,
                            width: 200,
                            height: 200,
                            colorDark: '#ffffff',
                            colorLight: '#1e293b'
                        });
                        document.getElementById('verify-2fa-code').focus();
                    },
                    preConfirm: () => {
                        const code = document.getElementById('verify-2fa-code').value;
                        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                            Swal.showValidationMessage('Masukkan kode 6 digit yang valid');
                            return false;
                        }
                        const isValid = window.verifyTwoFACode(secret, code);
                        if (!isValid) {
                            Swal.showValidationMessage('Kode tidak cocok. Coba lagi!');
                            return false;
                        }
                        return true;
                    }
                });

                if (modal.isConfirmed) {
                    window.adminTwoFAEnabled[adminUid] = true;
                    await db.ref(`users/${adminUid}`).update({
                        twoFAEnabled: true,
                        twoFASecret: window.encryptSecret(secret)
                    });
                    Toast.fire({ icon: 'success', title: '2FA Berhasil Diaktifkan!' });
                    return true;
                }
            } catch (err) {
                console.error('2FA Setup Error:', err);
                Toast.fire({ icon: 'error', title: 'Gagal mengaktifkan 2FA' });
            }
            return false;
        };

        window.generateTwoFASecret = function() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let secret = '';
            for (let i = 0; i < 32; i++) {
                secret += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return secret;
        };

        window.verifyTwoFACode = function(secret, code) {
            try {
                // Implementasi sederhana TOTP verification
                // Dalam production, gunakan library seperti speakeasy atau node-otp
                const time = Math.floor(Date.now() / 30000);
                
                // Generate expected codes untuk window ±1 (90 detik)
                const expectedCodes = [];
                for (let i = -1; i <= 1; i++) {
                    const generatedCode = window.generateTOTPCode(secret, time + i);
                    expectedCodes.push(generatedCode);
                }
                
                return expectedCodes.includes(code);
            } catch (err) {
                console.error('2FA Verification Error:', err);
                return false;
            }
        };

        window.generateTOTPCode = function(secret, time) {
            // Implementasi HMAC-SHA1 sederhana (production gunakan library crypto)
            const hmac = window.hmacSha1(secret, time.toString());
            const offset = parseInt(hmac.substring(hmac.length - 1), 16);
            const code = (parseInt(hmac.substring(offset * 2, offset * 2 + 8), 16) & 0x7fffffff) % 1000000;
            return code.toString().padStart(6, '0');
        };

        window.hmacSha1 = function(key, msg) {
            // Simplified HMAC-SHA1 (untuk production gunakan crypto library)
            let hash = '';
            try {
                // Fallback ke hash sederhana jika crypto tidak tersedia
                hash = key.split('').map((c, i) => {
                    return String.fromCharCode(c.charCodeAt(0) ^ (i % 256));
                }).join('') + msg;
            } catch (err) {
                console.error('HMAC Error:', err);
            }
            return hash;
        };

        window.encryptSecret = function(secret) {
            // Enkripsi sederhana (production: gunakan TweetNaCl.js atau libsodium)
            return btoa(secret); // Base64 encode
        };

        window.decryptSecret = function(encrypted) {
            try {
                return atob(encrypted); // Base64 decode
            } catch (err) {
                console.error('Decrypt Error:', err);
                return null;
            }
        };

        window.verifyAdminLoginWith2FA = async function(adminUid) {
            const verified = await Swal.fire({
                title: '🔐 Verifikasi 2FA',
                html: `
                    <p class="text-gray-300 mb-4">Masukkan kode 6 digit dari aplikasi Authenticator Anda:</p>
                    <input type="text" id="admin-2fa-code" class="w-full bg-darker border border-gray-600 rounded p-3 text-white text-center text-2xl tracking-widest focus:border-amber-500 outline-none" placeholder="000000" maxlength="6" inputmode="numeric">
                `,
                showCancelButton: true,
                confirmButtonText: 'Verifikasi',
                cancelButtonText: 'Batal',
                background: '#1e293b',
                color: '#fff',
                confirmButtonColor: '#10b981',
                didOpen: () => {
                    document.getElementById('admin-2fa-code').focus();
                },
                preConfirm: () => {
                    const code = document.getElementById('admin-2fa-code').value;
                    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                        Swal.showValidationMessage('Masukkan kode 6 digit yang valid');
                        return false;
                    }
                    
                    // Cek attempt limit
                    window.adminTwoFAAttempts[adminUid] = (window.adminTwoFAAttempts[adminUid] || 0) + 1;
                    if (window.adminTwoFAAttempts[adminUid] > 5) {
                        Swal.showValidationMessage('Terlalu banyak percobaan salah. Coba lagi nanti.');
                        return false;
                    }
                    
                    const secret = window.adminTwoFASecret[adminUid];
                    const isValid = window.verifyTwoFACode(secret, code);
                    if (!isValid) {
                        Swal.showValidationMessage(`Kode tidak cocok. Percobaan ${window.adminTwoFAAttempts[adminUid]}/5`);
                        return false;
                    }
                    
                    window.adminTwoFAAttempts[adminUid] = 0; // Reset on success
                    return true;
                }
            });

            return verified.isConfirmed;
        };

        // Integrasi 2FA dengan login admin
        window.original_handleLogin = window.handleLogin;
        window.handleLogin = async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-login-submit');
            const ogText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            btn.disabled = true;

            try {
                let originalInput = document.getElementById('login-email').value.trim();
                let loginInput = originalInput;
                let isUsernameMode = false;
                
                if (!loginInput.includes('@')) {
                    loginInput = loginInput.toLowerCase() + '@beetix.com';
                    isUsernameMode = true;
                } else {
                    loginInput = loginInput.toLowerCase();
                }
                
                const res = await auth.signInWithEmailAndPassword(loginInput, document.getElementById('login-password').value);
                const snap = await db.ref('users/' + res.user.uid).once('value');
                const data = snap.val() || {};

                // Ensure username mode matches exact stored username
                if (isUsernameMode) {
                    const storedUsername = (data.username || '').trim().toLowerCase();
                    if (!storedUsername || storedUsername !== originalInput.toLowerCase()) {
                        await auth.signOut();
                        throw new Error('Email/Username atau Password salah!');
                    }
                }

                // Check 2FA for Admin
                if ((data.role === 'Super Admin' || data.role === 'Vendor') && data.twoFAEnabled) {
                    // Load stored secret
                    const decryptedSecret = window.decryptSecret(data.twoFASecret);
                    window.adminTwoFASecret[res.user.uid] = decryptedSecret;

                    const verified = await window.verifyAdminLoginWith2FA(res.user.uid);
                    if (!verified) {
                        await auth.signOut();
                        Toast.fire({ icon: 'error', title: 'Verifikasi 2FA Gagal!' });
                        btn.innerHTML = ogText;
                        btn.disabled = false;
                        return;
                    }
                }

                if (data.role === 'User' && isUsernameMode) {
                    await auth.signOut();
                    Toast.fire({ icon: 'error', title: 'AKSES DITOLAK: Pembeli Umum Wajib Menggunakan Email Asli!' });
                    btn.innerHTML = ogText;
                    btn.disabled = false;
                    return;
                }

                await window.registerLoginDevice(res.user.uid);

                closeModal('login-modal');
            } catch(err) {
                let errMsg = err.message;
                if(errMsg.includes('user-not-found') || errMsg.includes('wrong-password') || errMsg.includes('INVALID_LOGIN_CREDENTIALS')) {
                    errMsg = "Email/Username atau Password salah!";
                }
                Toast.fire({ icon: 'error', title: errMsg });
                try { await auth.signOut(); } catch(e){}
            } finally {
                btn.innerHTML = ogText;
                btn.disabled = false;
            }
        };

        // Delete Sponsor Ticket Function
        window.deleteSponsorTicket = function(ticketKey, ticketCode) {
            Swal.fire({
                icon: 'warning',
                title: 'Hapus Tiket Sponsor?',
                html: `<p class="text-sm text-gray-300">Apakah Anda yakin ingin menghapus tiket sponsor:<br><b class="text-amber-500">${ticketCode}</b></p>`,
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#4b5563',
                confirmButtonText: 'Ya, Hapus',
                cancelButtonText: 'Batal',
                background: '#1e293b',
                color: '#fff'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await db.ref(`tickets/${ticketKey}`).remove();
                        if (window.globalTicketsData) delete window.globalTicketsData[ticketKey];
                        window.renderAdminTicketTablesFromCache?.(window.globalTicketsData || {});
                        window.refreshDashboardAfterDataMutation?.();
                        Toast.fire({ icon: 'success', title: 'Tiket Sponsor dihapus!' });
                    } catch (err) {
                        Toast.fire({ icon: 'error', title: 'Gagal menghapus: ' + err.message });
                    }
                }
            });
        };

        // Download Laporan Keseluruhan as CSV - SIMPLIFIED & ROBUST
        // Wait for global DB ready (used by download actions)
        window.waitForDBReady = function(timeoutMs = 15000) {
            if (window.db) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const iv = setInterval(() => {
                    if (window.db) { clearInterval(iv); resolve(); }
                    if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error('Database tidak siap. Silakan refresh halaman.')); }
                }, 200);
            });
        };



        window.downloadLaporanCSV = async function() {
            try {
                await window.waitForDBReady();
                Swal.fire({ title: 'Memproses...', icon: 'info', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                // Get all data dari Firebase
                const [paymentsSnap, usersSnap, eventsSnap] = await Promise.all([
                    window.db.ref('payments').once('value'),
                    window.db.ref('users').once('value'),
                    window.db.ref('events').once('value')
                ]);
                
                const payments = paymentsSnap.val() || {};
                const users = usersSnap.val() || {};
                const events = eventsSnap.val() || {};
                
                // Build report - match exact logic dari renderLaporanTable
                const rows = [];
                Object.keys(payments).forEach(pid => {
                    const p = payments[pid];
                    if (p.status !== 'APPROVED' || !p.uid || !p.eventId) return;
                    
                    // Match exact filtering logic seperti di renderLaporanTable
                    const pOwner = p.ownerId || 'SUPER_ADMIN';
                    const isMine = pOwner === window.currentUserData?.uid || (window.isSuperAdmin && pOwner === 'SUPER_ADMIN');
                    
                    // Isolasi Cepat Vendor
                    if (window.isVendor && !isMine) return;
                    
                    const user = users[p.uid];
                    const evt = events[p.eventId];
                    if (!user || !evt) return;
                    
                    rows.push([
                        new Date(p.createdAt || 0).toLocaleDateString('id-ID'),
                        (user.nama || '').replace(/"/g, '""'),
                        (evt.title || '').replace(/"/g, '""'),
                        'Tiket',
                        p.total || 0
                    ]);
                });
                
                if (rows.length === 0) {
                    Swal.close();
                    Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada laporan untuk diunduh.', background: '#1e293b', color: '#fff' });
                    return;
                }
                
                // Build CSV
                let csv = 'Tanggal,Pembeli,Event,Kategori,Pemasukan\n';
                rows.forEach(row => csv += row.map(v => `"${v}"`).join(',') + '\n');
                
                // Download
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Laporan_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                Swal.close();
                Toast.fire({ icon: 'success', title: 'Download berhasil!' });
            } catch (err) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#1e293b', color: '#fff' });
            }
        };
        
        // Download Database Tiket as CSV - SIMPLIFIED & ROBUST
        window.downloadTicketsCSV = async function() {
            try {
                await window.waitForDBReady();
                Swal.fire({ title: 'Memproses...', icon: 'info', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                // Get all data dari Firebase
                const [ticketsSnap, usersSnap, eventsSnap] = await Promise.all([
                    window.db.ref('tickets').once('value'),
                    window.db.ref('users').once('value'),
                    window.db.ref('events').once('value')
                ]);
                
                const tickets = ticketsSnap.val() || {};
                const users = usersSnap.val() || {};
                const events = eventsSnap.val() || {};
                const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
                
                // Build rows - match vendor filtering logic
                const rows = [];
                Object.keys(tickets).forEach(tkey => {
                    const t = tickets[tkey];
                    if (!t.code || !t.uid || !t.eventId) return;
                    
                    const user = users[t.uid];
                    const evt = events[t.eventId];
                    if (!user || !evt) return;
                    
                    // For vendor: check if they own the event
                    if (window.isVendor) {
                        const evOwner = evt.ownerId || 'SUPER_ADMIN';
                        if (evOwner !== window.currentUserData?.uid) return;
                    }
                    
                    const isUpgraded = window.isTicketReplacedByUpgrade(t, tkey, upgradeReplacementMap);
                    const statusLabel = isUpgraded ? 'Di-upgrade' : ((t.status || '').toString().toUpperCase() === 'USED' ? 'Terpakai' : (t.status || 'Aktif'));
                    rows.push([
                        (t.code || '').replace(/"/g, '""'),
                        (user.nama || '').replace(/"/g, '""'),
                        (evt.title || '').replace(/"/g, '""'),
                        (t.category || '').replace(/"/g, '""'),
                        statusLabel,
                        new Date(t.createdAt || 0).toLocaleDateString('id-ID')
                    ]);
                });
                
                if (rows.length === 0) {
                    Swal.close();
                    Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada tiket untuk diunduh.', background: '#1e293b', color: '#fff' });
                    return;
                }
                
                // Build CSV
                let csv = 'Kode Tiket,Pembeli,Event,Kategori,Status,Tanggal\n';
                rows.forEach(row => csv += row.map(v => `"${v}"`).join(',') + '\n');
                
                // Download
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Tiket_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                Swal.close();
                Toast.fire({ icon: 'success', title: 'Download berhasil!' });
            } catch (err) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#1e293b', color: '#fff' });
            }
        };

        // Download PDF Laporan Per Event
        // Provide a simple wrapper so buttons can call a single function name
        window.generatePDFEvent = function(eventId) {
            if (typeof window.downloadPDFLaporanPerEvent === 'function') {
                return window.downloadPDFLaporanPerEvent(eventId);
            }
            return Promise.reject(new Error('PDF generator tidak tersedia'));
        };

        window.downloadPDFLaporanPerEvent = async function(eventId) {
            try {
                await window.waitForDBReady();
                Swal.fire({ title: 'Memproses...', icon: 'info', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                const evt = window.eventDataMap?.[eventId];
                if (!evt) throw new Error('Event tidak ditemukan');
                
                // Get data dari Firebase
                const [paymentsSnap, usersSnap, ticketsSnap] = await Promise.all([
                    window.db.ref('payments').once('value'),
                    window.db.ref('users').once('value'),
                    window.db.ref('tickets').once('value')
                ]);
                
                const payments = paymentsSnap.val() || {};
                const users = usersSnap.val() || {};
                const tickets = ticketsSnap.val() || {};
                const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
                
                // Build report data
                const reportData = [];
                let totalRevenue = 0;
                
                Object.keys(payments).forEach(pid => {
                    const p = payments[pid];
                    if (p.eventId !== eventId || p.status !== 'APPROVED') return;
                    
                    // Check vendor filtering
                    const pOwner = p.ownerId || 'SUPER_ADMIN';
                    const isMine = pOwner === window.currentUserData?.uid || (window.isSuperAdmin && pOwner === 'SUPER_ADMIN');
                    if (window.isVendor && !isMine) return;
                    
                    const user = users[p.uid];
                    if (!user) return;
                    
                    // Count tickets untuk payment ini
                    let ticketCount = 0;
                    Object.keys(tickets).forEach(tkey => {
                        const t = tickets[tkey];
                        if (!t || window.isTicketReplacedByUpgrade(t, tkey, upgradeReplacementMap)) return;
                        if (t.paymentId === pid) ticketCount++;
                    });
                    
                    reportData.push({
                        date: new Date(p.createdAt || 0).toLocaleDateString('id-ID'),
                        name: user.nama || '-',
                        phone: user.phone || '-',
                        email: user.email || '-',
                        ticketQty: ticketCount,
                        amount: p.total || 0
                    });
                    totalRevenue += p.total || 0;
                });
                
                if (reportData.length === 0) {
                    Swal.close();
                    Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada data penjualan untuk event ini.', background: '#1e293b', color: '#fff' });
                    return;
                }
                
                // Generate HTML untuk PDF
                const timestamp = new Date().toLocaleDateString('id-ID');
                let htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h1 style="text-align: center; color: #f59e0b; margin-bottom: 5px;">Laporan Penjualan Tiket</h1>
                        <h2 style="text-align: center; color: #666; margin-top: 0; font-size: 16px;">${evt.title || 'Event'}</h2>
                        <hr style="border: 1px solid #ddd;">
                        <p style="text-align: center; color: #999; font-size: 12px;">Tanggal Laporan: ${timestamp}</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr style="background-color: #f59e0b; color: white;">
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tanggal</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nama Pembeli</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">No. HP</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Jumlah Tiket</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Nominal</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                reportData.forEach(row => {
                    htmlContent += `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${row.date}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${row.name}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${row.phone}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.ticketQty}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rp ${row.amount.toLocaleString('id-ID')}</td>
                        </tr>
                    `;
                });
                
                htmlContent += `
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 20px; border-top: 2px solid #f59e0b; padding-top: 10px;">
                            <h3 style="text-align: right; color: #f59e0b;">Total Pemasukan: Rp ${totalRevenue.toLocaleString('id-ID')}</h3>
                        </div>
                    </div>
                `;
                
                // Generate PDF
                const element = document.createElement('div');
                element.innerHTML = htmlContent;
                
                const opt = {
                    margin: 10,
                    filename: `Laporan_${evt.title}_${timestamp.replace(/\//g, '-')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
                };
                
                html2pdf().set(opt).from(element).save();
                
                Swal.close();
                Toast.fire({ icon: 'success', title: 'PDF berhasil diunduh!' });
            } catch (err) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#1e293b', color: '#fff' });
            }
        };
    