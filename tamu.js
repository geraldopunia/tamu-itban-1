document.addEventListener('DOMContentLoaded', () => {
    Shared.initCommon();

    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasSignature = false;

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const data = canvas.toDataURL();
        canvas.width = rect.width;
        canvas.height = parseInt(getComputedStyle(canvas).height);
        const img = new Image();
        img.onload = () => { if (hasSignature) ctx.drawImage(img, 0, 0); };
        img.src = data;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function startDraw(e) {
        e.preventDefault();
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        hasSignature = true;
    }

    function stopDraw() { drawing = false; }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    document.getElementById('clear-signature').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
    });

    const nohpInput = document.getElementById('nohp');
    const nohpHint = document.getElementById('nohp-hint');

    if (nohpInput && nohpHint) {
        nohpInput.addEventListener('input', () => {
            const val = nohpInput.value.trim();
            if (val.length === 0) {
                nohpHint.textContent = '';
                nohpHint.className = 'field-hint';
                nohpInput.classList.remove('error');
                return;
            }
            if (Shared.validatePhone(val)) {
                nohpHint.textContent = 'Format valid';
                nohpHint.className = 'field-hint valid';
                nohpInput.classList.remove('error');
            } else {
                nohpHint.textContent = 'Contoh: 08123456789 atau +628123456789';
                nohpHint.className = 'field-hint invalid';
            }
        });
    }

    const form = document.getElementById('attendance-form');
    const submitBtn = document.getElementById('submit-btn');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const nama = document.getElementById('nama').value.trim();
            const instansi = document.getElementById('instansi').value.trim();
            const jabatan = document.getElementById('jabatan').value.trim();
            const nohp = document.getElementById('nohp').value.trim();
            const email = document.getElementById('email').value.trim();
            const bertemu = document.getElementById('bertemu').value.trim();
            const keperluan = document.getElementById('keperluan').value.trim();
            const jumlah = document.getElementById('jumlah').value;

            if (!nama || !instansi || !jabatan || !nohp || !bertemu || !keperluan || !jumlah) {
                Shared.showToast('error', 'Semua field wajib harus diisi!');
                return;
            }

            if (!Shared.validatePhone(nohp)) {
                Shared.showToast('error', 'Format nomor HP tidak valid!');
                return;
            }

            if (!hasSignature) {
                Shared.showToast('error', 'Tanda tangan harus diisi!');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

            const now = new Date();
            const guest = {
                id: Date.now(),
                nama, instansi, jabatan,
                nohp: Shared.formatPhone(nohp),
                email, bertemu, keperluan,
                jumlah: parseInt(jumlah),
                tanggal: now.toLocaleDateString('id-ID'),
                jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                timestamp: now.toISOString(),
                signature: canvas.toDataURL('image/png'),
                status: 'diterima'
            };

            const data = Shared.loadData();
            data.push(guest);
            Shared.saveData(data);
            Shared.pushToFirebase(guest);

            const qrData = Shared.generateQR({
                nama: guest.nama,
                instansi: guest.instansi,
                tanggal: guest.tanggal,
                jam: guest.jam,
                keperluan: guest.keperluan
            });

            const qrEl = document.getElementById('success-qr');
            if (qrEl && qrData) qrEl.innerHTML = qrData;

            const details = document.getElementById('success-details');
            if (details) {
                details.innerHTML = `
                    <div class="success-info">
                        <p><strong>Nama:</strong> ${Shared.esc(nama)}</p>
                        <p><strong>Instansi:</strong> ${Shared.esc(instansi)}</p>
                        <p><strong>Tanggal:</strong> ${guest.tanggal}</p>
                        <p><strong>Jam:</strong> ${guest.jam}</p>
                        <p><strong>Keperluan:</strong> ${Shared.esc(keperluan)}</p>
                    </div>
                `;
            }

            document.getElementById('success-overlay').classList.add('active');
            Shared.showToast('success', 'Pendaftaran berhasil!');
        });
    }

    document.getElementById('success-close').addEventListener('click', () => {
        document.getElementById('success-overlay').classList.remove('active');
        form.reset();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Daftar Hadir';
        if (nohpHint) { nohpHint.textContent = ''; nohpHint.className = 'field-hint'; }
        renderMyAttendance();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        form.reset();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
        if (nohpHint) { nohpHint.textContent = ''; nohpHint.className = 'field-hint'; }
        Shared.showToast('warning', 'Form telah direset.');
    });

    function renderMyAttendance() {
        const tbody = document.getElementById('my-attendance-tbody');
        const emptyState = document.getElementById('my-empty-state');
        const data = Shared.loadData();

        if (data.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        const recent = data.slice(-10).reverse();

        tbody.innerHTML = recent.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${Shared.esc(g.nama)}</td>
                <td>${Shared.esc(g.instansi)}</td>
                <td>${Shared.esc(g.keperluan || '-')}</td>
                <td>${Shared.esc(g.tanggal)}</td>
                <td>${Shared.esc(g.jam)}</td>
                <td><span class="status-badge ${g.status || 'diterima'}"><i class="fas fa-circle"></i> ${(g.status || 'diterima').charAt(0).toUpperCase() + (g.status || 'diterima').slice(1)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn qr" onclick="showTamuQR(${g.id})" title="QR Code"><i class="fas fa-qrcode"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderMyAttendance();

    window.showTamuQR = function(id) {
        const data = Shared.loadData();
        const guest = data.find(g => g.id === id);
        if (!guest) return;

        const qrData = Shared.generateQR({
            nama: guest.nama,
            instansi: guest.instansi,
            tanggal: guest.tanggal,
            jam: guest.jam,
            keperluan: guest.keperluan
        });

        const qrContent = document.getElementById('tamu-qr-content');
        qrContent.innerHTML = qrData ? `<div>${qrData}</div><p style="margin-top:10px;font-size:12px;color:var(--text-tertiary)">${Shared.esc(guest.nama)} - ${Shared.esc(guest.tanggal)}</p>` : '<p>QR tidak tersedia</p>';
        document.getElementById('tamu-qr-modal').classList.add('active');
    };

    document.getElementById('tamu-qr-close').addEventListener('click', () => {
        document.getElementById('tamu-qr-modal').classList.remove('active');
    });
    document.getElementById('tamu-qr-close-btn').addEventListener('click', () => {
        document.getElementById('tamu-qr-modal').classList.remove('active');
    });
    document.getElementById('tamu-qr-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.target.classList.remove('active');
    });
});
