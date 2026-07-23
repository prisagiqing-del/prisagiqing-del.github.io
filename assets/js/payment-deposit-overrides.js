
    window.getPaymentOwnershipInfo = function(p = {}) {
        const currentUid = window.currentUserData?.uid || window.currentUserData?.id || '';
        const pOwner = p.ownerId || p.owner || p.payOwnerId || p.eventOwnerId || 'SUPER_ADMIN';
        const eventOwnerId = (p.eventId && (window.eventDataMap?.[p.eventId]?.ownerId || window.eventDataMap?.[p.eventId]?.uid || '')) || '';
        const status = (p.status || 'PENDING').toString().toUpperCase();
        const isPending = !['APPROVED', 'REJECTED'].includes(status);
        const ownerMatches = !!(currentUid && (pOwner === currentUid || eventOwnerId === currentUid || (pOwner === 'SUPER_ADMIN' && eventOwnerId === currentUid)));
        const fallbackVisibleForVendor = !!(window.isVendor && currentUid && isPending && ownerMatches);
        return { pOwner, eventOwnerId, ownerMatches, isVisible: !!(window.isSuperAdmin || ownerMatches || fallbackVisibleForVendor) };
    };

    window.refreshAdminPaymentViews = function() {
        try {
            if (typeof window.renderAdminPayments === 'function') window.renderAdminPayments();
            if (typeof window.renderAdminDeposits === 'function' && (window.isSuperAdmin || window.isVendor)) window.renderAdminDeposits();
        } catch (e) {
            console.warn('refreshAdminPaymentViews error', e);
        }
    };

    // Render admin payments with deposit progress bar
    window.renderAdminPayments = async function() {
        try {
            if (typeof db === 'undefined' || !db) return;
            const tbody = document.getElementById('admin-payments-table');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-500">Memuat pembayaran...</td></tr>';

            const [paymentsSnap, usersSnap, eventsSnap] = await Promise.all([
                db.ref('payments').once('value'),
                db.ref('users').once('value'),
                db.ref('events').once('value')
            ]);
            const payments = paymentsSnap.val() || {};
            const users = usersSnap.val() || {};
            const events = eventsSnap.val() || {};
            const items = [];

            Object.entries(payments).forEach(([key, p]) => {
                if (!p || (p.type || '').toString().toUpperCase() === 'DEPOSIT') return;
                items.push({ kind: 'payment', key, data: p, latestAt: Number(p.createdAt || 0) || 0 });
            });
            Object.values(window.buildDepositGroups(payments, { includeConverted: true })).forEach(group => {
                items.push({ kind: 'deposit', group, latestAt: group.latestAt || 0 });
            });
            items.sort((a, b) => b.latestAt - a.latestAt);

            const safe = (s) => (s || '').toString().replace(/'/g, "\\'").replace(/\n/g, ' ');
            tbody.innerHTML = '';
            items.forEach(item => {
                if (item.kind === 'payment') {
                    const k = item.key;
                    const p = item.data || {};
                    const ownership = window.getPaymentOwnershipInfo?.(p) || {};
                    if (window.isVendor && !ownership.ownerMatches) return;
                    if (!window.isSuperAdmin && !ownership.ownerMatches) return;
                    const u = users[p.uid] || {};
                    const ev = events[p.eventId] || {};
                    const status = (p.status || 'PENDING').toString().toUpperCase();
                    const isPending = !['APPROVED', 'REJECTED'].includes(status);
                    const approveArgs = [k, p.uid || '', safe(u.nama || ''), p.eventId || '', safe(p.eventName || ev.title || ''), safe(p.category || ''), (p.qty || 1)];
                    const approveOnclick = `approvePayment(this, '${approveArgs[0]}', '${approveArgs[1]}', '${approveArgs[2]}', '${approveArgs[3]}', '${approveArgs[4]}', '${approveArgs[5]}', ${approveArgs[6]})`;
                    const customAnswerBtn = p.customFormAnswers ? `<button type="button" class="view-custom-answers bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px] font-semibold ml-2" data-answers="${encodeURIComponent(JSON.stringify(p.customFormAnswers || {}))}" data-code="${k}" data-eventid="${p.eventId || ''}" title="Lihat Data Tambahan">Data Tambahan</button>` : '';
                    const deleteBtn = window.isSuperAdmin ? `<button onclick="window.deletePaymentEntry('${k}')" class="ml-2 bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-xs">Hapus</button>` : '';
                    const actionBtn = isPending ? `<button onclick="${approveOnclick}" class="bg-green-600 text-white px-3 py-1 rounded text-xs">Approve</button><button onclick="rejectPayment('${k}')" class="ml-2 bg-red-600 text-white px-3 py-1 rounded text-xs">Reject</button>${deleteBtn}${customAnswerBtn}` : `<span class="text-xs text-gray-500">Selesai</span>${deleteBtn}${customAnswerBtn}`;
                    const ticketType = (p.type || 'REGULAR').toString().toUpperCase();
                    const typeLabel = ticketType === 'REGULAR' ? '<span class="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-semibold mr-1">🎟️ Regular</span>' : `<span class="inline-block bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs font-semibold mr-1">${ticketType}</span>`;
                    const tr = document.createElement('tr');
                    tr.className = 'border-b border-white/5';
                    tr.innerHTML = `<td class="px-4 py-3">${u.nama || p.userName || ('User:' + (p.uid || ''))}</td><td class="px-4 py-3">${typeLabel}<br>${ev.title || p.eventName || '-'}<br><span class="text-xs text-gray-400">${p.category || ''}</span></td><td class="px-4 py-3">${formatRp(p.total || 0)}</td><td class="px-4 py-3">${p.createdAt ? new Date(p.createdAt).toLocaleString('id-ID') : '-'}</td><td class="px-4 py-3">${status}</td><td class="px-4 py-3 text-right">${actionBtn}</td>`;
                    tbody.appendChild(tr);
                    return;
                }

                const group = item.group;
                const representative = group.latestPending?.data || group.entries[0]?.data || {};
                const ownership = window.getPaymentOwnershipInfo?.(representative) || {};
                if (window.isVendor && !ownership.ownerMatches) return;
                if (!window.isSuperAdmin && !ownership.ownerMatches) return;
                const u = users[group.uid] || {};
                const ev = events[group.eventId] || {};
                const pending = group.latestPending;
                const remaining = Math.max(0, group.target - group.approvedSum);
                const pct = group.target > 0 ? Math.min(100, Math.round((group.approvedSum / group.target) * 100)) : 0;
                let statusText = pct >= 100 || group.converted ? 'LUNAS' : group.pendingSum > 0 ? 'PENDING' : group.approvedSum > 0 ? 'DEPOSIT AKTIF' : 'MENUNGGU';
                let statusClass = pct >= 100 || group.converted ? 'text-green-400' : group.pendingSum > 0 ? 'text-yellow-400' : 'text-cyan-400';
                const progressHtml = `<div style="min-width:180px"><div class="flex justify-between text-[10px] mb-1"><span class="${statusClass} font-bold">${pct}%</span><span class="text-gray-400">Sisa ${formatRp(remaining)}</span></div><div class="w-full bg-darker rounded-full h-2.5 overflow-hidden border border-white/10"><div style="width:${pct}%" class="${pct >= 100 ? 'bg-green-500' : 'bg-cyan-500'} h-2.5"></div></div>${group.pendingSum > 0 ? `<div class="text-[10px] text-yellow-400 mt-1">Pending ${formatRp(group.pendingSum)}</div>` : ''}</div>`;
                let actionBtn = '<span class="text-xs text-gray-500">Tidak ada cicilan pending</span>';
                if (pending) {
                    const p = pending.data || {};
                    const k = pending.key;
                    const approveArgs = [k, p.uid || group.uid || '', safe(u.nama || group.userName || ''), p.eventId || group.eventId || '', safe(p.eventName || group.eventName || ev.title || ''), safe(p.category || group.category || ''), (p.qty || group.qty || 1)];
                    const approveOnclick = `approvePayment(this, '${approveArgs[0]}', '${approveArgs[1]}', '${approveArgs[2]}', '${approveArgs[3]}', '${approveArgs[4]}', '${approveArgs[5]}', ${approveArgs[6]})`;
                    const customAnswerBtn = p.customFormAnswers ? `<button type="button" class="view-custom-answers bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px] font-semibold ml-2" data-answers="${encodeURIComponent(JSON.stringify(p.customFormAnswers || {}))}" data-code="${k}" data-eventid="${p.eventId || ''}">Data Tambahan</button>` : '';
                    const deleteBtn = window.isSuperAdmin ? `<button onclick="window.deletePaymentEntry('${k}')" class="ml-2 bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-xs">Hapus</button>` : '';
                    actionBtn = `<button onclick="${approveOnclick}" class="bg-green-600 text-white px-3 py-1 rounded text-xs">Approve</button><button onclick="rejectPayment('${k}')" class="ml-2 bg-red-600 text-white px-3 py-1 rounded text-xs">Reject</button>${deleteBtn}${customAnswerBtn}`;
                }
                const tr = document.createElement('tr');
                tr.className = 'border-b border-white/5';
                tr.innerHTML = `<td class="px-4 py-3 font-semibold text-white">${u.nama || group.userName || ('User:' + group.uid)}</td><td class="px-4 py-3"><span class="inline-block bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs font-semibold mr-1">💰 Deposit</span><br>${ev.title || group.eventName || '-'}<br><span class="text-xs text-gray-400">${group.category || ''} • ${group.qty || 1} tiket</span></td><td class="px-4 py-3"><div class="font-bold text-green-400">${formatRp(group.approvedSum)}</div><div class="text-[10px] text-gray-500">Target ${formatRp(group.target)}</div></td><td class="px-4 py-3">${group.latestAt ? new Date(group.latestAt).toLocaleString('id-ID') : '-'}</td><td class="px-4 py-3">${progressHtml}<div class="text-[10px] ${statusClass} font-bold mt-1">${statusText}</div></td><td class="px-4 py-3 text-right">${actionBtn}</td>`;
                tbody.appendChild(tr);
            });
            if (tbody.children.length === 0) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-500">Belum ada pembayaran.</td></tr>';
        } catch (e) {
            console.error('renderAdminPayments error', e);
        }
    };

    window.renderAdminDeposits = async function() {
        try {
            if (typeof db === 'undefined' || !db) return;
            const tbody = document.getElementById('admin-deposit-table');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-500">Memuat data deposit...</td></tr>';
            const [paymentsSnap, usersSnap, eventsSnap] = await Promise.all([
                db.ref('payments').once('value'),
                db.ref('users').once('value'),
                db.ref('events').once('value')
            ]);
            const payments = paymentsSnap.val() || {};
            const users = usersSnap.val() || {};
            const events = eventsSnap.val() || {};
            const groupRows = Object.values(window.buildDepositGroups(payments, { includeConverted: true })).filter(group => {
                const representative = group.entries[0]?.data || {};
                const ownership = window.getPaymentOwnershipInfo?.(representative) || {};
                return window.isSuperAdmin || ownership.ownerMatches;
            }).sort((a, b) => b.latestAt - a.latestAt);

            let totalApproved = 0;
            let totalTarget = 0;
            tbody.innerHTML = '';
            groupRows.forEach(group => {
                const remaining = Math.max(0, group.target - group.approvedSum);
                const pct = group.target > 0 ? Math.min(100, Math.round((group.approvedSum / group.target) * 100)) : 0;
                let statusLabel = '<span class="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs font-bold">Deposit Aktif</span>';
                if (pct >= 100 || group.converted) statusLabel = '<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">✓ Lunas</span>';
                else if (group.pendingSum > 0) statusLabel = '<span class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">◐ Menunggu Validasi</span>';
                else if (group.approvedSum === 0 && group.rejectedCount > 0) statusLabel = '<span class="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">Ditolak</span>';
                const progressHtml = `<div class="flex flex-col gap-1"><div class="flex justify-between items-center text-xs text-gray-300 font-semibold"><span class="text-white">${pct}%</span><span class="text-amber-400">${formatRp(remaining)} sisa</span></div><div class="w-full bg-darker rounded-full h-3 overflow-hidden border border-white/10"><div style="width:${pct}%" class="${pct >= 100 ? 'bg-green-500' : 'bg-cyan-500'} h-3 transition-all"></div></div>${group.pendingSum > 0 ? `<span class="text-[10px] text-yellow-400">Pending ${formatRp(group.pendingSum)}</span>` : ''}</div>`;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td class="px-4 py-3 font-semibold text-white">${users[group.uid]?.nama || group.userName || ('User:' + group.uid)}</td><td class="px-4 py-3"><div class="font-semibold text-white">${events[group.eventId]?.title || group.eventName || 'Tidak diketahui'}</div><div class="text-xs text-gray-400 mt-1">${group.category} • ${group.qty || 1} tiket</div></td><td class="px-4 py-3 font-bold text-green-400">${formatRp(group.approvedSum)}</td><td class="px-4 py-3 text-white">${formatRp(group.target)}</td><td class="px-4 py-3 text-white">${group.installmentCount || 0}x</td><td class="px-4 py-3 font-semibold text-amber-400">${formatRp(remaining)}</td><td class="px-4 py-3" style="min-width:220px">${progressHtml}</td><td class="px-4 py-3 text-center">${statusLabel}</td>`;
                tbody.appendChild(tr);
                totalApproved += group.approvedSum;
                totalTarget += group.target;
            });
            if (!groupRows.length) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-gray-500">Belum ada data deposit.</td></tr>';

            const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalApproved / totalTarget) * 100)) : 0;
            const remainingTotal = Math.max(0, totalTarget - totalApproved);
            const remainingPct = totalTarget > 0 ? Math.max(0, 100 - overallPct) : 0;
            document.getElementById('adm-deposit-group-count').textContent = groupRows.length;
            document.getElementById('adm-deposit-approved').textContent = formatRp(totalApproved);
            document.getElementById('adm-deposit-approved-pct').textContent = `${overallPct}% dari target`;
            document.getElementById('adm-deposit-target').textContent = formatRp(totalTarget);
            document.getElementById('adm-deposit-remaining').textContent = formatRp(remainingTotal);
            document.getElementById('adm-deposit-remaining-pct').textContent = `${remainingPct}% tersisa`;
            if (!window.adminDepositChart) window.adminDepositChart = window.createDepositProgressChart('admin-deposit-progress-chart');
            if (window.adminDepositChart) {
                window.adminDepositChart.data.labels = ['Disetujui', 'Sisa'];
                window.adminDepositChart.data.datasets[0].data = [totalApproved, remainingTotal];
                window.adminDepositChart.update();
            }
        } catch (e) {
            console.error('renderAdminDeposits error', e);
        }
    };
    