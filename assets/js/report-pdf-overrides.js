
    // [INTEGRATED INDEX] - Overriding renderLaporanPerEvent untuk menyambungkan tombol ke fungsi PDF
    window.renderLaporanPerEvent = function() {
        const container = document.getElementById('laporan-per-event-container');
        if (!container) return; 
        container.innerHTML = ''; 
        let hasEvents = false;
        
        Object.keys(window.eventDataMap || {}).reverse().forEach(k => {
            const ev = window.eventDataMap[k];
            const theOwner = ev.ownerId || 'SUPER_ADMIN';
            const isMine = theOwner === window.currentUserData?.uid || (window.isSuperAdmin && theOwner === 'SUPER_ADMIN');
            if (!isMine) return;
            
            hasEvents = true;
            // Amankan nama event dari karakter kutip agar tidak menyebabkan SyntaxError
            let safeTitle = (ev.title || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
            
            container.innerHTML += `
                <div class="bg-dark/50 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div>
                        <p class="text-xs text-amber-500 font-bold mb-1">${ev.kategori || 'Event'}</p>
                        <h4 class="font-bold text-white mb-2 line-clamp-2">${ev.title || 'Event'}</h4>
                        <p class="text-[10px] text-gray-400 mb-4"><i class="fa-solid fa-calendar mr-1"></i> ${ev.date || '-'}</p>
                    </div>
                    <button type="button" onclick="window.generatePDFEvent('${k}', '${safeTitle}')" class="w-full bg-white/10 hover:bg-amber-500 hover:text-dark text-white text-xs font-bold py-2 rounded transition-colors border border-white/10 hover:border-amber-500 cursor-pointer">
                        <i class="fa-solid fa-file-pdf mr-1"></i> Download PDF Event
                    </button>
                </div>`;
        });
        if(!hasEvents) container.innerHTML = '<p class="text-gray-500 text-sm">Belum ada event untuk diunduh laporannya.</p>';
    };

    window.generatePDFEvent = async function(eventId, eventTitle) {
        try {
            Swal.fire({
                title: 'Menyiapkan PDF...',
                text: 'Mengumpulkan data tiket lunas...',
                allowOutsideClick: false,
                background: '#1e293b',
                color: '#fff',
                didOpen: () => { Swal.showLoading() }
            });
            
            // Ambil data transaksi khusus untuk event terkait
            const snap = await db.ref('payments').orderByChild('eventId').equalTo(eventId).once('value');
            const data = snap.val() || {};
            
            let totalPemasukan = 0;
            let totalTiket = 0;
            let rows = '';
            
            Object.values(data).forEach(p => {
                if(p.status === 'APPROVED') {
                    totalPemasukan += p.total;
                    totalTiket += p.qty;
                    rows += `
                        <tr style="border-bottom: 1px solid #ddd; font-size: 12px;">
                            <td style="padding: 10px 8px;">${new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                            <td style="padding: 10px 8px; font-weight: bold;">${p.userName}</td>
                            <td style="padding: 10px 8px;">${p.category}</td>
                            <td style="padding: 10px 8px; text-align: center;">${p.qty}</td>
                            <td style="padding: 10px 8px; text-align: right; color: #16a34a; font-weight: bold;">${formatRp(p.total)}</td>
                        </tr>
                    `;
                }
            });

            if(totalTiket === 0) {
                return Swal.fire({
                    icon: 'info',
                    title: 'Data Kosong',
                    text: 'Belum ada tiket yang lunas terjual untuk event ini.',
                    background: '#1e293b',
                    color: '#fff'
                });
            }

            const printDiv = document.createElement('div');
            printDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff;">
                    <h2 style="text-align: center; margin-bottom: 5px; font-size: 24px; font-weight: 800; color: #020617;">LAPORAN PENJUALAN TIKET</h2>
                    <h3 style="text-align: center; color: #f59e0b; margin-top: 0; font-size: 18px; margin-bottom: 30px; text-transform: uppercase;">${eventTitle}</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px;">
                        <thead>
                            <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                <th style="padding: 12px 8px;">Tanggal</th>
                                <th style="padding: 12px 8px;">Nama Pembeli</th>
                                <th style="padding: 12px 8px;">Kategori</th>
                                <th style="padding: 12px 8px; text-align: center;">Qty</th>
                                <th style="padding: 12px 8px; text-align: right;">Total (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 15px; border-top: 2px solid #1e293b; padding-top: 15px; font-weight: bold;">
                        <span>Total Tiket Terjual: <span style="color: #3b82f6;">${totalTiket} Tiket</span></span>
                        <span>Total Pemasukan Bersih: <span style="color: #16a34a;">${formatRp(totalPemasukan)}</span></span>
                    </div>
                    <p style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 60px;">Digenerate otomatis oleh Sistem Ticketing Tiket Kaka pada ${new Date().toLocaleString('id-ID')}</p>
                </div>
            `;

            const opt = {
                margin:       0.5,
                filename:     `Laporan_Event_${eventTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(printDiv).save().then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Laporan PDF Berhasil Diunduh!',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#1e293b',
                    color: '#fff'
                });
            });
            
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Download',
                text: err.message,
                background: '#1e293b',
                color: '#fff'
            });
        }
    };
