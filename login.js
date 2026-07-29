document.addEventListener('DOMContentLoaded', () => {
    Shared.initCommon();

    const tabs = document.querySelectorAll('.login-tab');
    const contents = document.querySelectorAll('.login-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });

    const passwordInput = document.getElementById('admin-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let score = 0;
            let label = '';
            let color = '';

            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            if (val.length === 0) {
                label = '';
                color = '';
            } else if (score <= 1) {
                label = 'Lemah';
                color = 'var(--danger)';
            } else if (score <= 2) {
                label = 'Sedang';
                color = 'var(--warning)';
            } else if (score <= 3) {
                label = 'Cukup';
                color = 'var(--primary)';
            } else {
                label = 'Kuat';
                color = 'var(--success)';
            }

            const width = val.length === 0 ? '0' : Math.min(score * 20, 100) + '%';
            strengthBar.style.width = width;
            strengthBar.style.background = color;
            strengthText.textContent = label;
            strengthText.style.color = color;
        });
    }

    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value;

            if (!username || !password) {
                Shared.showToast('error', 'Username dan password harus diisi!');
                return;
            }
            if (username === 'admin' && password === 'admin123') {
                Shared.login();
                Shared.showToast('success', 'Login berhasil! Mengalihkan ke dashboard...');
                setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
            } else {
                Shared.showToast('error', 'Username atau password salah!');
            }
        });
    }
});
