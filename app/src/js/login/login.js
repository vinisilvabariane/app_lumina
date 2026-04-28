(() => {
    const form = document.getElementById('loginForm');
    if (!form) {
        return;
    }

    const elements = {
        form,
        user: document.getElementById('usuario'),
        password: document.getElementById('password'),
        togglePassword: document.getElementById('togglePassword'),
        submitButton: form.querySelector('button[type="submit"]'),
        title: document.querySelector('.login-header h2')
    };

    const state = {
        requestInFlight: false
    };

    const USER_REGEX = /^[a-zA-Z0-9_]{3,50}$/;

    function init() {
        bindEvents();
        animateTitle();
        checkSession();
        window.setTimeout(() => elements.user.focus(), 250);
    }

    function bindEvents() {
        elements.togglePassword.addEventListener('click', togglePasswordVisibility);
        elements.form.addEventListener('submit', handleSubmit);
        elements.user.addEventListener('input', sanitizeUserInput);
        elements.password.addEventListener('input', clearFieldError);
    }

    function animateTitle() {
        if (!elements.title) {
            return;
        }

        elements.title.classList.add('login-title-enter');
    }

    function togglePasswordVisibility() {
        const isPassword = elements.password.type === 'password';
        const icon = elements.togglePassword.querySelector('i');

        elements.password.type = isPassword ? 'text' : 'password';
        elements.togglePassword.classList.toggle('active', isPassword);
        icon.classList.toggle('bi-eye', !isPassword);
        icon.classList.toggle('bi-eye-slash', isPassword);
        elements.togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    }

    function sanitizeUserInput(event) {
        const { value } = event.target;
        const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);

        if (value !== sanitized) {
            event.target.value = sanitized;
        }

        clearFieldError(event);
    }

    function clearFieldError(event) {
        event.target.classList.remove('is-invalid');
        elements.form.classList.remove('was-validated');
    }

    function validateForm() {
        let valid = true;

        if (!USER_REGEX.test(elements.user.value.trim())) {
            elements.user.classList.add('is-invalid');
            valid = false;
        }

        if ((elements.password.value || '').length < 6) {
            elements.password.classList.add('is-invalid');
            valid = false;
        }

        elements.form.classList.add('was-validated');
        return valid;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm() || state.requestInFlight) {
            return;
        }

        state.requestInFlight = true;
        const payload = new URLSearchParams(new FormData(elements.form));
        setLoading(true);

        try {
            const response = await fetch('/app/routers/login/LoginRouter.php?action=login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Falha ao autenticar');
            }

            LuminaUI.toast('success', 'Login realizado', result.message || 'Acesso liberado.');
            elements.submitButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Abrindo...';
            window.location.href = result.redirect || '/app/views/flow/overview/index.php';
        } catch (error) {
            handleLoginError(error);
        } finally {
            state.requestInFlight = false;

            if (!document.hidden) {
                setLoading(false);
            }
        }
    }

    function handleLoginError(error) {
        const message = error.message || 'Erro de conexao. Tente novamente.';
        const lowered = message.toLowerCase();

        if (lowered.includes('usu')) {
            elements.user.classList.add('is-invalid');
        }

        if (lowered.includes('senha')) {
            elements.password.classList.add('is-invalid');
        }

        LuminaUI.toast('error', 'Falha no login', message, 3600);
    }

    function setLoading(isLoading) {
        const controls = elements.form.querySelectorAll('input, button');
        elements.form.classList.toggle('is-loading', isLoading);
        elements.submitButton.disabled = isLoading;
        elements.submitButton.setAttribute('aria-busy', String(isLoading));
        elements.submitButton.innerHTML = isLoading
            ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Entrando...'
            : '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';

        controls.forEach((control) => {
            if (control !== elements.submitButton) {
                control.disabled = isLoading;
            }
        });
    }

    async function checkSession() {
        try {
            const result = await LuminaHttp.get('/app/routers/login/LoginRouter.php?action=check');

            if (result.success) {
                LuminaUI.toast('info', 'Sessao ativa', 'Voce ja esta logado. Redirecionando...', 2200);
                window.setTimeout(() => {
                    window.location.href = '/app/views/flow/overview/index.php';
                }, 700);
            }
        } catch (error) {
            console.debug('Sessao nao verificada:', error.message);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
