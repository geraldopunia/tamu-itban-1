document.addEventListener('DOMContentLoaded', () => {
    Shared.initCommon();

    if (!Shared.isLoggedIn()) {
        Shared.showToast('warning', 'Silakan login terlebih dahulu.');
        setTimeout(() => { window.location.href = 'login.html'; }, 800);
        return;
    }

    let currentPage = 1;
    const PAGE_SIZE = 10;
    let filteredData = [];

    function getFilteredData() {
        let data = Shared.loadData();
        const search = document.getElementById('search-input').value.toLowerCase();
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;
        const status = document.getElementById('filter-status').value;

        if (search) {
            data = data.filter(g =>
                (g.nama || '').toLowerCase().includes(search) ||
                (g.instansi || '').toLowerCase().includes(search) ||
                (g.keperluan || '').toLowerCase().includes(search)
            );
        }

        if (dateFrom) {
            data = data.filter(g => {
                const d = new Date(g.timestamp || g.tanggal);
                return d >= new Date(dateFrom);
            });
        }

        if (dateTo) {
            data = data.filter(g => {
                const d = new Date(g.timestamp || g.tanggal);
                return d <= new Date(dateTo + 'T23:59:59');
            });
        }

        if (status) {
            data = data.filter(g => (g.status || 'diterima') === status);
        }

        return data;
    }

    function buildRow(g, index) {
        const tr = document.createElement('tr');
        const st = g.status || 'diterima';
        const stLabel = st.charAt(0).toUpperCase() + st.slice(1);
        tr.innerHTML = `
            <td>${index}</td>
            <td>${Shared.esc(g.nama || '')}</td>
            <td>${Shared.esc(g.instansi || '')}</td>
            <td>${Shared.esc(g.jabatan || '')}</td>
            <td>${Shared.esc(g.nohp || '')}</td>
            <td>${Shared.esc(g.email || '-')}</td>
            <td>${Shared.esc(g.bertemu || '')}</td>
            <td>${Shared.esc(g.keperluan || '')}</td>
            <td>${g.jumlah || 1}</td>
            <td>${Shared.esc(g.tanggal || '')}</td>
            <td>${Shared.esc(g.jam || '')}</td>
            <td><span class="status-badge ${st}"><i class="fas fa-circle"></i> ${stLabel}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn qr" title="QR Code"><i class="fas fa-qrcode"></i></button>
                    <button class="action-btn history" title="Riwayat"><i class="fas fa-history"></i></button>
                    <button class="action-btn delete" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;

        const guestId = g.id;
        const guestNama = g.nama || '';
        const btns = tr.querySelectorAll('.action-btn');
        btns[0].addEventListener('click', () => viewGuest(guestId));
        btns[1].addEventListener('click', () => editGuest(guestId));
        btns[2].addEventListener('click', () => showQR(guestId));
        btns[3].addEventListener('click', () => showHistory(guestId));
        btns[4].addEventListener('click', () => deleteGuest(guestId));

        return tr;
    }

    function renderTable() {
        try {
            filteredData = getFilteredData();
            const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
            if (currentPage > totalPages) currentPage = totalPages;
            const start = (currentPage - 1) * PAGE_SIZE;
            const pageData = filteredData.slice(start, start + PAGE_SIZE);

            const tbody = document.getElementById('guest-tbody');
            const emptyState = document.getElementById('empty-state');

            tbody.innerHTML = '';

            if (filteredData.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
                const fragment = document.createDocumentFragment();
                pageData.forEach((g, i) => {
                    fragment.appendChild(buildRow(g, start + i + 1));
                });
                tbody.appendChild(fragment);
            }

            renderPagination(filteredData.length, totalPages);
            updateStats();
        } catch (err) {
            console.error('renderTable error:', err);
        }
    }

    function renderPagination(total, totalPages) {
        const info = document.getElementById('pagination-info');
        const controls = document.getElementById('pagination-controls');
        if (!info || !controls) return;

        const start = (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(currentPage * PAGE_SIZE, total);
        info.textContent = total > 0 ? `Menampilkan ${start}-${end} dari ${total} data` : 'Tidak ada data';

        let html = '';
        html += `<button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span style="padding:0 4px;color:var(--text-tertiary)">...</span>`;
        }

        for (let p = startPage; p <= endPage; p++) {
            html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="padding:0 4px;color:var(--text-tertiary)">...</span>`;
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        html += `<button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;

        controls.innerHTML = html;

        controls.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                renderTable();
            });
        });

        const prevBtn = controls.querySelector('.pagination-btn:first-child');
        const nextBtn = controls.querySelector('.pagination-btn:last-child');
        if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
        if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderTable(); } });
    }

    function updateStats() {
        const data = Shared.loadData();
        const today = new Date().toLocaleDateString('id-ID');
        const todayCount = data.filter(g => g.tanggal === today).length;
        const instansi = [...new Set(data.map(g => g.instansi).filter(Boolean))].length;

        Shared.animateNumber('stat-total-hari', todayCount);
        Shared.animateNumber('stat-total-semua', data.length);
        Shared.animateNumber('stat-instansi', instansi);
    }

    renderTable();

    // Firebase real-time sync
    if (Shared.isFirebaseReady()) {
        Shared.listenFirebase((guests) => {
            Shared.saveData(guests);
            renderTable();
            updateStats();
        });
    }

    document.getElementById('search-input').addEventListener('input', () => {
        const val = document.getElementById('search-input').value;
        document.getElementById('search-clear').style.display = val ? 'block' : 'none';
        currentPage = 1;
        renderTable();
    });

    document.getElementById('search-clear').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        currentPage = 1;
        renderTable();
    });

    ['filter-date-from', 'filter-date-to', 'filter-status'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            currentPage = 1;
            renderTable();
        });
    });

    document.getElementById('filter-reset').addEventListener('click', () => {
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-status').value = '';
        currentPage = 1;
        renderTable();
        Shared.showToast('warning', 'Filter direset.');
    });

    document.getElementById('export-csv').addEventListener('click', () => {
        const data = filteredData.length > 0 ? filteredData : Shared.loadData();
        if (data.length === 0) {
            Shared.showToast('warning', 'Tidak ada data untuk diekspor.');
            return;
        }
        const headers = ['No', 'Nama', 'Instansi', 'Jabatan', 'No HP', 'Email', 'Bertemu', 'Keperluan', 'Jumlah', 'Tanggal', 'Jam', 'Status'];
        const rows = data.map((g, i) => [
            i + 1, g.nama, g.instansi, g.jabatan, g.nohp, g.email || '', g.bertemu, g.keperluan, g.jumlah, g.tanggal, g.jam, g.status || 'diterima'
        ]);
        let csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `daftar_hadir_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        Shared.showToast('success', 'Export CSV berhasil!');
    });

    document.getElementById('export-pdf').addEventListener('click', () => {
        if (typeof window.jspdf === 'undefined') {
            Shared.showToast('error', 'PDF library belum dimuat. Silakan coba lagi.');
            return;
        }
        const data = filteredData.length > 0 ? filteredData : Shared.loadData();
        if (data.length === 0) {
            Shared.showToast('warning', 'Tidak ada data untuk diekspor.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text('Daftar Hadir Tamu', 14, 15);
        doc.setFontSize(9);
        doc.text(`Diekspor: ${new Date().toLocaleString('id-ID')}`, 14, 22);

        doc.autoTable({
            startY: 28,
            head: [['No', 'Nama', 'Instansi', 'No HP', 'Keperluan', 'Tanggal', 'Jam', 'Status']],
            body: data.map((g, i) => [
                i + 1, g.nama, g.instansi, g.nohp, g.keperluan, g.tanggal, g.jam, g.status || 'diterima'
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [102, 126, 234] }
        });

        doc.save(`daftar_hadir_${new Date().toISOString().slice(0, 10)}.pdf`);
        Shared.showToast('success', 'Export PDF berhasil!');
    });

    document.getElementById('print-btn').addEventListener('click', () => {
        const data = filteredData.length > 0 ? filteredData : Shared.loadData();
        if (data.length === 0) {
            Shared.showToast('warning', 'Tidak ada data untuk dicetak.');
            return;
        }

        const previewContent = document.getElementById('preview-content');
        previewContent.innerHTML = `<iframe id="print-frame" style="width:100%;height:400px;border:1px solid var(--border-color);border-radius:var(--radius-sm);"></iframe>`;
        const iframe = document.getElementById('print-frame');

        let html = `<html><head><title>Cetak Daftar Hadir</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                h2 { text-align: center; margin-bottom: 4px; }
                p.subtitle { text-align: center; color: #666; font-size: 11px; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
                th { background: #f0f0f0; font-weight: bold; }
            </style></head><body>
            <h2>Daftar Hadir Tamu</h2>
            <p class="subtitle">Dicetak: ${new Date().toLocaleString('id-ID')}</p>
            <table><thead><tr>
                <th>No</th><th>Nama</th><th>Instansi</th><th>Jabatan</th><th>No HP</th>
                <th>Keperluan</th><th>Tanggal</th><th>Jam</th><th>Status</th>
            </tr></thead><tbody>
            ${data.map((g, i) => `<tr>
                <td>${i + 1}</td><td>${g.nama || ''}</td><td>${g.instansi || ''}</td><td>${g.jabatan || ''}</td><td>${g.nohp || ''}</td>
                <td>${g.keperluan || ''}</td><td>${g.tanggal || ''}</td><td>${g.jam || ''}</td><td>${g.status || 'diterima'}</td>
            </tr>`).join('')}
            </tbody></table></body></html>`;

        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();
        document.getElementById('preview-modal').classList.add('active');

        document.getElementById('preview-print-btn').onclick = () => {
            iframe.contentWindow.print();
        };
    });

    document.getElementById('preview-close').addEventListener('click', () => {
        document.getElementById('preview-modal').classList.remove('active');
    });
    document.getElementById('preview-close-btn').addEventListener('click', () => {
        document.getElementById('preview-modal').classList.remove('active');
    });
    document.getElementById('preview-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    document.getElementById('clear-all-btn').addEventListener('click', () => {
        Shared.showConfirm('Hapus Semua Data', 'Semua data tamu akan dihapus permanen. Apakah Anda yakin?', () => {
            localStorage.removeItem('guest_data');
            currentPage = 1;
            renderTable();
            Shared.showToast('success', 'Semua data berhasil dihapus.');
            Shared.deleteAllFromFirebase();
        });
    });

    function viewGuest(id) {
        const data = Shared.loadData();
        const g = data.find(x => x.id === id);
        if (!g) return;

        const content = document.getElementById('detail-content');
        const st = g.status || 'diterima';
        const stLabel = st.charAt(0).toUpperCase() + st.slice(1);
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Nama</span><span class="detail-value">${Shared.esc(g.nama || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Instansi</span><span class="detail-value">${Shared.esc(g.instansi || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Jabatan</span><span class="detail-value">${Shared.esc(g.jabatan || '')}</span></div>
                <div class="detail-item"><span class="detail-label">No HP</span><span class="detail-value">${Shared.esc(g.nohp || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${Shared.esc(g.email || '-')}</span></div>
                <div class="detail-item"><span class="detail-label">Bertemu</span><span class="detail-value">${Shared.esc(g.bertemu || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Keperluan</span><span class="detail-value">${Shared.esc(g.keperluan || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Jumlah</span><span class="detail-value">${g.jumlah || 1} orang</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${st}"><i class="fas fa-circle"></i> ${stLabel}</span></span></div>
                <div class="detail-item"><span class="detail-label">Tanggal</span><span class="detail-value">${Shared.esc(g.tanggal || '')}</span></div>
                <div class="detail-item"><span class="detail-label">Jam</span><span class="detail-value">${Shared.esc(g.jam || '')}</span></div>
            </div>
            ${g.signature ? `<div class="detail-signature"><span class="detail-label">Tanda Tangan</span><img src="${g.signature}" class="signature-preview" alt="TTD"></div>` : ''}
        `;
        document.getElementById('detail-modal').classList.add('active');
    }

    function editGuest(id) {
        const data = Shared.loadData();
        const g = data.find(x => x.id === id);
        if (!g) return;

        document.getElementById('edit-id').value = g.id;
        document.getElementById('edit-nama').value = g.nama || '';
        document.getElementById('edit-instansi').value = g.instansi || '';
        document.getElementById('edit-jabatan').value = g.jabatan || '';
        document.getElementById('edit-nohp').value = g.nohp || '';
        document.getElementById('edit-email').value = g.email || '';
        document.getElementById('edit-bertemu').value = g.bertemu || '';
        document.getElementById('edit-keperluan').value = g.keperluan || '';
        document.getElementById('edit-jumlah').value = g.jumlah || 1;
        document.getElementById('edit-status').value = g.status || 'diterima';
        document.getElementById('edit-modal').classList.add('active');
    }

    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('edit-modal').classList.remove('active');
    });
    document.getElementById('modal-cancel').addEventListener('click', () => {
        document.getElementById('edit-modal').classList.remove('active');
    });
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-id').value);
        const data = Shared.loadData();
        const idx = data.findIndex(g => g.id === id);
        if (idx === -1) return;

        data[idx].nama = document.getElementById('edit-nama').value.trim();
        data[idx].instansi = document.getElementById('edit-instansi').value.trim();
        data[idx].jabatan = document.getElementById('edit-jabatan').value.trim();
        data[idx].nohp = document.getElementById('edit-nohp').value.trim();
        data[idx].email = document.getElementById('edit-email').value.trim();
        data[idx].bertemu = document.getElementById('edit-bertemu').value.trim();
        data[idx].keperluan = document.getElementById('edit-keperluan').value.trim();
        data[idx].jumlah = parseInt(document.getElementById('edit-jumlah').value);
        data[idx].status = document.getElementById('edit-status').value;

        Shared.saveData(data);
        document.getElementById('edit-modal').classList.remove('active');
        renderTable();
        Shared.showToast('success', 'Data berhasil diperbarui.');
        Shared.pushAllToFirebase(data);
    });

    function deleteGuest(id) {
        Shared.showConfirm('Hapus Tamu', 'Data tamu ini akan dihapus permanen. Apakah Anda yakin?', () => {
            const data = Shared.loadData().filter(g => g.id !== id);
            Shared.saveData(data);
            renderTable();
            Shared.showToast('success', 'Data tamu berhasil dihapus.');
            Shared.deleteFromFirebase(id);
        });
    }

    function showQR(id) {
        const data = Shared.loadData();
        const g = data.find(x => x.id === id);
        if (!g) return;

        const qrData = Shared.generateQR({
            nama: g.nama,
            instansi: g.instansi,
            tanggal: g.tanggal,
            jam: g.jam,
            keperluan: g.keperluan
        });

        const qrContent = document.getElementById('qr-content');
        qrContent.innerHTML = qrData
            ? `<div>${qrData}</div><p style="margin-top:10px;font-size:12px;color:var(--text-tertiary)">${Shared.esc(g.nama || '')} - ${Shared.esc(g.tanggal || '')}</p>`
            : '<p>QR tidak tersedia</p>';
        document.getElementById('qr-modal').classList.add('active');
    }

    document.getElementById('qr-close').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.remove('active');
    });
    document.getElementById('qr-close-btn').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.remove('active');
    });
    document.getElementById('qr-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    function showHistory(id) {
        const data = Shared.loadData();
        const guest = data.find(g => g.id === id);
        if (!guest) return;
        const history = data.filter(g => g.nama === guest.nama);

        const content = document.getElementById('history-content');
        if (history.length === 0) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Tidak ada riwayat kunjungan</p></div>';
        } else {
            content.innerHTML = `
                <h4 style="margin-bottom:12px;font-size:14px;">Riwayat: ${Shared.esc(guest.nama || '')}</h4>
                <table class="preview-table">
                    <thead><tr><th>Tanggal</th><th>Jam</th><th>Instansi</th><th>Keperluan</th><th>Status</th></tr></thead>
                    <tbody>
                    ${history.map(g => {
                        const st = g.status || 'diterima';
                        return `<tr>
                            <td>${Shared.esc(g.tanggal || '')}</td><td>${Shared.esc(g.jam || '')}</td><td>${Shared.esc(g.instansi || '')}</td>
                            <td>${Shared.esc(g.keperluan || '')}</td>
                            <td><span class="status-badge ${st}">${st.charAt(0).toUpperCase() + st.slice(1)}</span></td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            `;
        }
        document.getElementById('history-modal').classList.add('active');
    }

    document.getElementById('history-close').addEventListener('click', () => {
        document.getElementById('history-modal').classList.remove('active');
    });
    document.getElementById('history-close-btn').addEventListener('click', () => {
        document.getElementById('history-modal').classList.remove('active');
    });
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.remove('active');
    });
    document.getElementById('detail-close-btn').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.remove('active');
    });
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        Shared.showConfirm('Keluar', 'Apakah Anda yakin ingin keluar?', () => {
            Shared.logout();
            Shared.showToast('success', 'Berhasil logout.');
            setTimeout(() => { window.location.href = 'login.html'; }, 800);
        });
    });

    function renderChart() {
        if (typeof Chart === 'undefined') return;
        try {
            const data = Shared.loadData();
            const dayMap = {};
            const labels = [];
            const now = new Date();

            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('id-ID');
                labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }));
                dayMap[key] = 0;
            }

            data.forEach(g => {
                if (dayMap.hasOwnProperty(g.tanggal)) {
                    dayMap[g.tanggal]++;
                }
            });

            const values = labels.map((_, i) => {
                const d = new Date(now);
                d.setDate(d.getDate() - (6 - i));
                return dayMap[d.toLocaleDateString('id-ID')] || 0;
            });

            const ctx = document.getElementById('visit-chart');
            if (!ctx) return;

            if (ctx._chart) ctx._chart.destroy();

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#cbd5e1' : '#4a5568';
            const gridColor = isDark ? '#334155' : '#e2e8f0';

            ctx._chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Jumlah Tamu',
                        data: values,
                        backgroundColor: 'rgba(102,126,234,0.6)',
                        borderColor: 'rgba(102,126,234,1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1, font: { size: 11 } }, grid: { color: gridColor } }
                    }
                }
            });
        } catch (err) {
            console.error('renderChart error:', err);
        }
    }

    setTimeout(renderChart, 300);

    setInterval(() => {
        renderTable();
        renderChart();
    }, 30000);
});
