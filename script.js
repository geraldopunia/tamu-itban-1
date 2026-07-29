const App = {
    guests: [],
    editingId: null,
    confirmCallback: null,
    signatureData: null,
    canvas: null,
    ctx: null,
    isDrawing: false,

    init() {
        this.loadData();
        this.initCanvas();
        this.initTheme();
        this.startClock();
        this.bindEvents();
        this.renderTable();
        this.updateStats();
        this.hideLoading();
    },

    /* ─── Loading ─── */
    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 600);
    },

    /* ─── LocalStorage ─── */
    loadData() {
        try {
            const data = localStorage.getItem('guest_data');
            this.guests = data ? JSON.parse(data) : [];
        } catch { this.guests = []; }
    },

    saveData() {
        localStorage.setItem('guest_data', JSON.stringify(this.guests));
    },

    /* ─── Clock ─── */
    startClock() {
        const update = () => {
            const now = new Date();
            const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('date-display').textContent = now.toLocaleDateString('id-ID', opts);
            document.getElementById('time-display').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        update();
        setInterval(update, 1000);
    },

    /* ─── Theme ─── */
    initTheme() {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateThemeIcon(next);
    },

    updateThemeIcon(theme) {
        const icon = document.querySelector('#theme-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    },

    /* ─── Canvas Signature ─── */
    initCanvas() {
        this.canvas = document.getElementById('signature-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            return { x: x * (this.canvas.width / rect.width), y: y * (this.canvas.height / rect.height) };
        };

        const startDraw = (e) => {
            e.preventDefault();
            this.isDrawing = true;
            const pos = getPos(e);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        };

        const draw = (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1a202c';
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        };

        const endDraw = () => { this.isDrawing = false; };

        this.canvas.addEventListener('mousedown', startDraw);
        this.canvas.addEventListener('mousemove', draw);
        this.canvas.addEventListener('mouseup', endDraw);
        this.canvas.addEventListener('mouseleave', endDraw);
        this.canvas.addEventListener('touchstart', startDraw, { passive: false });
        this.canvas.addEventListener('touchmove', draw, { passive: false });
        this.canvas.addEventListener('touchend', endDraw);

        this.loadSignature();
    },

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * 2;
        this.canvas.height = 200 * 2;
        this.ctx.scale(2, 2);
        if (this.signatureData) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width / 2, this.canvas.height / 2);
            };
            img.src = this.signatureData;
        }
    },

    isCanvasEmpty() {
        const blank = document.createElement('canvas');
        blank.width = this.canvas.width;
        blank.height = this.canvas.height;
        return this.canvas.toDataURL() === blank.toDataURL();
    },

    saveSignature() {
        this.signatureData = this.canvas.toDataURL();
        localStorage.setItem('signature_data', this.signatureData);
    },

    loadSignature() {
        const saved = localStorage.getItem('signature_data');
        if (saved) {
            this.signatureData = saved;
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width / 2, this.canvas.height / 2);
            };
            img.src = saved;
        }
    },

    clearSignature() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.signatureData = null;
        localStorage.removeItem('signature_data');
    },

    /* ─── Events ─── */
    bindEvents() {
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('attendance-form').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('reset-btn').addEventListener('click', () => this.resetForm());
        document.getElementById('clear-signature').addEventListener('click', () => this.clearSignature());
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('search-clear').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.handleSearch('');
        });
        document.getElementById('export-csv').addEventListener('click', () => this.exportCSV());
        document.getElementById('print-btn').addEventListener('click', () => window.print());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.confirmClearAll());
        document.getElementById('edit-form').addEventListener('submit', (e) => this.handleEditSubmit(e));
        document.getElementById('modal-close').addEventListener('click', () => this.closeEditModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeEditModal());
        document.getElementById('edit-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeEditModal(); });
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-ok').addEventListener('click', () => { if (this.confirmCallback) this.confirmCallback(); this.closeConfirmModal(); });
        document.getElementById('confirm-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeConfirmModal(); });

        const scrollTopBtn = document.getElementById('scroll-top');
        window.addEventListener('scroll', () => {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 300);
        });
        scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    },

    /* ─── Form Submit ─── */
    handleSubmit(e) {
        e.preventDefault();
        const fields = {
            nama: document.getElementById('nama').value.trim(),
            instansi: document.getElementById('instansi').value.trim(),
            jabatan: document.getElementById('jabatan').value.trim(),
            nohp: document.getElementById('nohp').value.trim(),
            email: document.getElementById('email').value.trim(),
            tujuan: document.getElementById('tujuan').value.trim(),
            bertemu: document.getElementById('bertemu').value.trim(),
            keperluan: document.getElementById('keperluan').value.trim(),
            jumlah: document.getElementById('jumlah').value.trim()
        };

        /* Validation */
        let valid = true;
        document.querySelectorAll('#attendance-form input').forEach(i => i.classList.remove('error'));

        const required = ['nama', 'instansi', 'jabatan', 'nohp', 'tujuan', 'bertemu', 'keperluan', 'jumlah'];
        for (const key of required) {
            if (!fields[key]) {
                document.getElementById(key).classList.add('error');
                valid = false;
            }
        }

        if (fields.nohp && !/^[0-9+\-\s()]{8,15}$/.test(fields.nohp)) {
            document.getElementById('nohp').classList.add('error');
            valid = false;
        }

        if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
            document.getElementById('email').classList.add('error');
            valid = false;
        }

        if (this.isCanvasEmpty()) {
            this.showToast('warning', 'Silakan tanda tangan terlebih dahulu');
            return;
        }

        if (!valid) {
            this.showToast('error', 'Harap isi semua field yang wajib diisi dengan benar');
            return;
        }

        this.saveSignature();

        const now = new Date();
        const guest = {
            id: Date.now(),
            ...fields,
            jumlah: parseInt(fields.jumlah) || 1,
            tanggal: now.toLocaleDateString('id-ID'),
            jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            timestamp: now.toISOString()
        };

        this.guests.unshift(guest);
        this.saveData();
        this.renderTable();
        this.updateStats();
        this.resetForm();
        this.showToast('success', `Berhasil! ${guest.nama} terdaftar sebagai tamu`);
    },

    /* ─── Reset ─── */
    resetForm() {
        document.getElementById('attendance-form').reset();
        document.getElementById('jumlah').value = 1;
        document.querySelectorAll('#attendance-form input').forEach(i => i.classList.remove('error'));
        this.clearSignature();
    },

    /* ─── Render Table ─── */
    renderTable(filter = '') {
        const tbody = document.getElementById('guest-tbody');
        const emptyState = document.getElementById('empty-state');
        let data = this.guests;

        if (filter) {
            const q = filter.toLowerCase();
            data = data.filter(g =>
                g.nama.toLowerCase().includes(q) ||
                g.instansi.toLowerCase().includes(q) ||
                g.tujuan.toLowerCase().includes(q)
            );
        }

        if (data.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = data.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${this.esc(g.nama)}</td>
                <td>${this.esc(g.instansi)}</td>
                <td>${this.esc(g.jabatan)}</td>
                <td>${this.esc(g.nohp)}</td>
                <td>${this.esc(g.tujuan)}</td>
                <td>${this.esc(g.tanggal)}</td>
                <td>${this.esc(g.jam)}</td>
                <td><span class="status-badge"><i class="fas fa-circle"></i> Sudah Hadir</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" title="Edit" onclick="App.editGuest(${g.id})"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus" onclick="App.deleteGuest(${g.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /* ─── Search ─── */
    handleSearch(value) {
        document.getElementById('search-clear').style.display = value ? 'flex' : 'none';
        this.renderTable(value);
    },

    /* ─── Stats ─── */
    updateStats() {
        const today = new Date().toLocaleDateString('id-ID');
        const todayCount = this.guests.filter(g => g.tanggal === today).length;
        const totalInstansi = new Set(this.guests.map(g => g.instansi.toLowerCase())).size;

        this.animateNumber('stat-total-hari', todayCount);
        this.animateNumber('stat-total-semua', this.guests.length);
        this.animateNumber('stat-instansi', totalInstansi);
    },

    animateNumber(id, target) {
        const el = document.getElementById(id);
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;
        const diff = target - current;
        const step = Math.ceil(Math.abs(diff) / 15);
        let val = current;
        const interval = setInterval(() => {
            val += diff > 0 ? step : -step;
            if ((diff > 0 && val >= target) || (diff < 0 && val <= target)) {
                val = target;
                clearInterval(interval);
            }
            el.textContent = val;
        }, 30);
    },

    /* ─── Edit ─── */
    editGuest(id) {
        const guest = this.guests.find(g => g.id === id);
        if (!guest) return;
        this.editingId = id;
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-nama').value = guest.nama;
        document.getElementById('edit-instansi').value = guest.instansi;
        document.getElementById('edit-jabatan').value = guest.jabatan;
        document.getElementById('edit-nohp').value = guest.nohp;
        document.getElementById('edit-email').value = guest.email || '';
        document.getElementById('edit-tujuan').value = guest.tujuan;
        document.getElementById('edit-bertemu').value = guest.bertemu;
        document.getElementById('edit-keperluan').value = guest.keperluan;
        document.getElementById('edit-jumlah').value = guest.jumlah;
        document.getElementById('edit-modal').classList.add('active');
    },

    handleEditSubmit(e) {
        e.preventDefault();
        const id = this.editingId;
        const guest = this.guests.find(g => g.id === id);
        if (!guest) return;

        guest.nama = document.getElementById('edit-nama').value.trim();
        guest.instansi = document.getElementById('edit-instansi').value.trim();
        guest.jabatan = document.getElementById('edit-jabatan').value.trim();
        guest.nohp = document.getElementById('edit-nohp').value.trim();
        guest.email = document.getElementById('edit-email').value.trim();
        guest.tujuan = document.getElementById('edit-tujuan').value.trim();
        guest.bertemu = document.getElementById('edit-bertemu').value.trim();
        guest.keperluan = document.getElementById('edit-keperluan').value.trim();
        guest.jumlah = parseInt(document.getElementById('edit-jumlah').value) || 1;

        this.saveData();
        this.renderTable(document.getElementById('search-input').value);
        this.updateStats();
        this.closeEditModal();
        this.showToast('success', `Data ${guest.nama} berhasil diperbarui`);
    },

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('active');
        this.editingId = null;
    },

    /* ─── Delete ─── */
    deleteGuest(id) {
        const guest = this.guests.find(g => g.id === id);
        if (!guest) return;
        this.showConfirm(
            'Hapus Tamu',
            `Apakah Anda yakin ingin menghapus data ${guest.nama}?`,
            () => {
                this.guests = this.guests.filter(g => g.id !== id);
                this.saveData();
                this.renderTable(document.getElementById('search-input').value);
                this.updateStats();
                this.showToast('success', `Data ${guest.nama} berhasil dihapus`);
            }
        );
    },

    confirmClearAll() {
        if (this.guests.length === 0) {
            this.showToast('warning', 'Tidak ada data untuk dihapus');
            return;
        }
        this.showConfirm(
            'Hapus Semua Data',
            `Apakah Anda yakin ingin menghapus semua ${this.guests.length} data tamu? Tindakan ini tidak dapat dibatalkan.`,
            () => {
                this.guests = [];
                this.saveData();
                this.renderTable();
                this.updateStats();
                this.showToast('success', 'Semua data berhasil dihapus');
            }
        );
    },

    /* ─── Confirm Modal ─── */
    showConfirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        this.confirmCallback = callback;
        document.getElementById('confirm-modal').classList.add('active');
    },

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('active');
        this.confirmCallback = null;
    },

    /* ─── Export CSV ─── */
    exportCSV() {
        if (this.guests.length === 0) {
            this.showToast('warning', 'Tidak ada data untuk diekspor');
            return;
        }
        const headers = ['No', 'Nama', 'Instansi', 'Jabatan', 'No HP', 'Email', 'Tujuan', 'Bertemu Dengan', 'Keperluan', 'Jumlah', 'Tanggal', 'Jam'];
        const rows = this.guests.map((g, i) => [
            i + 1, g.nama, g.instansi, g.jabatan, g.nohp, g.email || '-',
            g.tujuan, g.bertemu, g.keperluan, g.jumlah, g.tanggal, g.jam
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daftar-tamu-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('success', 'File CSV berhasil diunduh');
    },

    /* ─── Toast ─── */
    showToast(type, message) {
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle' };
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
