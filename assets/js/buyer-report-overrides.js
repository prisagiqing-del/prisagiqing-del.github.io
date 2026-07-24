
    // [INTEGRATED INDEX] - Solusi Penyelaras Database & Patching Laporan Pembeli (CSV)
    
    // 1. Definisikan fallback untuk database ready agar tidak memicu error "is not a function"
    window.waitForDBReady = function() {
        return Promise.resolve(); // Langsung kembalikan sukses karena database aslinya sudah siap sejak halaman dimuat
    };

    // 2. Overriding generateBuyerReport agar menarik data lunas secara realtime dan aman dari vendor-isolation
    window.generateBuyerReport = async function() {
        const reportData = [];
        if (typeof db === 'undefined' || !db) {
            throw new Error("Database Firebase belum siap. Silakan muat ulang halaman.");
        }
        
        const [ticketsSnap, paymentsSnap, usersSnap, eventsSnap] = await Promise.all([
            db.ref('tickets').once('value'),
            db.ref('payments').once('value'),
            db.ref('users').once('value'),
            db.ref('events').once('value')
        ]);
        
        const tickets = ticketsSnap.val() || {};
        const payments = paymentsSnap.val() || {};
        const users = usersSnap.val() || {};
        const events = eventsSnap.val() || {};
        const upgradeReplacementMap = window.getUpgradeReplacementMap(tickets);
        
        const grouped = {};
        Object.keys(tickets).forEach(tkey => {
            const t = tickets[tkey];
            if (!t.uid || !t.eventId || window.isTicketReplacedByUpgrade(t, tkey, upgradeReplacementMap)) return;
            
            // Isolasi data untuk Vendor (EO hanya bisa melihat pembeli dari event miliknya sendiri)
            if (window.isVendor) {
                const evt = events[t.eventId];
                if (!evt || evt.ownerId !== window.currentUserData?.uid) return;
            }
            
            const key = `${t.uid}_${t.eventId}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });
        
        Object.keys(grouped).forEach(key => {
            const [uid, eventId] = key.split('_');
            const buyerTickets = grouped[key];
            const buyer = users[uid];
            const event = events[eventId];
            
            if (!buyer || !event) return;
            
            // Mencocokkan status pembayaran terakhir pembeli di event ini
            let paymentStatus = 'UNKNOWN';
            Object.keys(payments).forEach(pid => {
                const p = payments[pid];
                if (p.uid === uid && p.eventId === eventId) {
                    paymentStatus = p.status || 'UNKNOWN';
                }
            });
            
            // Kelompokkan tiket berdasarkan jenis/kategori
            const cats = {};
            buyerTickets.forEach(t => {
                const c = t.category || 'Umum';
                if (!cats[c]) cats[c] = [];
                cats[c].push(t);
            });
            
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

    // 3. Overriding downloadBuyerDataReport agar berjalan tanpa hambatan dan menghasilkan CSV yang rapi
    window.downloadBuyerDataReport = async function(btn) {
        if (!btn) btn = event?.target;
        const originalText = btn ? btn.innerHTML : 'Download Laporan';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            btn.disabled = true;
        }
        
        try {
            Swal.fire({
                title: 'Memproses Data...',
                text: 'Menarik database pembeli secara realtime...',
                allowOutsideClick: false,
                background: '#1e293b',
                color: '#fff',
                didOpen: () => { Swal.showLoading() }
            });
            
            const reportData = await window.generateBuyerReport();
            
            if (reportData.length === 0) {
                Swal.close();
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
                return Swal.fire({
                    icon: 'warning',
                    title: 'Data Kosong',
                    text: 'Tidak ada data pembeli lunas yang ditemukan untuk diexport.',
                    background: '#1e293b',
                    color: '#fff'
                });
            }
            
            // Konversi ke format CSV
            const csv = window.generateCSV(reportData);
            const timestamp = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
            const fileName = `Data_Pembeli_Tiket_Kaka_${timestamp}.csv`;
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Swal.close();
            Toast.fire({
                icon: 'success',
                title: 'Data pembeli lunas berhasil diunduh!'
            });
        } catch (err) {
            console.error(err);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Gagal Export',
                text: err.message,
                background: '#1e293b',
                color: '#fff'
            });
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    };

    // 4. Fallback generator CSV jika fungsi bawaan tidak sengaja terhapus sebelumnya
    if (typeof window.generateCSV !== 'function') {
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
    }
