let loginRequestInFlight = false;

document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
        this.classList.add('active');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
        this.classList.remove('active');
    }
});

document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopPropagation();
    const form = this;
    const usuarioInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('password');
    let isValid = true;
    const usuarioRegex = /^[a-zA-Z0-9_]{3,50}$/;

    if (!usuarioInput.value || !usuarioRegex.test(usuarioInput.value)) {
        usuarioInput.classList.add('is-invalid');
        isValid = false;
    } else {
        usuarioInput.classList.remove('is-invalid');
    }

    if (!passwordInput.value || passwordInput.value.length < 6) {
        passwordInput.classList.add('is-invalid');
        isValid = false;
    } else {
        passwordInput.classList.remove('is-invalid');
    }

    if (isValid) {
        realizarLogin(form);
    }

    form.classList.add('was-validated');
});

document.getElementById('usuario').addEventListener('input', function () {
    const usuarioRegex = /^[a-zA-Z0-9_]{0,50}$/;
    if (!usuarioRegex.test(this.value)) {
        this.value = this.value.replace(/[^a-zA-Z0-9_]/g, '');
    }
    if (this.classList.contains('is-invalid')) {
        this.classList.remove('is-invalid');
        document.getElementById('loginForm').classList.remove('was-validated');
    }
});

async function realizarLogin(form) {
    if (loginRequestInFlight) {
        return;
    }

    loginRequestInFlight = true;
    let loginSucceeded = false;
    const submitButton = form.querySelector('button[type="submit"]');
    const formControls = form.querySelectorAll('input, button');
    const originalText = submitButton.innerHTML;
    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());
    const startedAt = Date.now();

    setLoginLoadingState(form, submitButton, formControls, true);
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Entrando...';

    try {
        const response = await fetch('/app/routers/login/LoginRouter.php?action=login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(dados)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const elapsed = Date.now() - startedAt;

        if (elapsed < 400) {
            await wait(400 - elapsed);
        }

        if (data.sucesso) {
            loginSucceeded = true;
            const redirectUrl = data.redirect || '/app/views/workflow/geral/index.php';
            submitButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Abrindo...';
            safeShowToast('success', data.mensagem || 'Login realizado com sucesso!');
            window.location.href = redirectUrl;
            return;
        }

        safeShowToast('error', data.mensagem || 'Erro ao fazer login');

        if (data.mensagem && data.mensagem.toLowerCase().includes('usu')) {
            document.getElementById('usuario').classList.add('is-invalid');
        }
        if (data.mensagem && data.mensagem.toLowerCase().includes('senha')) {
            document.getElementById('password').classList.add('is-invalid');
        }
    } catch (error) {
        console.error('Erro:', error);
        safeShowToast('error', 'Erro de conexao. Tente novamente.');
    } finally {
        loginRequestInFlight = false;
        if (!loginSucceeded) {
            setLoginLoadingState(form, submitButton, formControls, false);
            submitButton.innerHTML = originalText;
        }
    }
}

function setLoginLoadingState(form, submitButton, formControls, isLoading) {
    form.classList.toggle('is-loading', isLoading);
    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    formControls.forEach(control => {
        if (control !== submitButton) {
            control.disabled = isLoading;
        }
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function safeShowToast(type, message) {
    try {
        showToast(type, message);
    } catch (error) {
        console.error('Falha ao exibir toast:', error);
    }
}

function showToast(type, message) {
    if (!window.bootstrap || !window.bootstrap.Toast) {
        return;
    }

    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1050';
    const toastId = 'loginToast' + Date.now();
    const backgroundClass = type === 'success'
        ? 'bg-success'
        : type === 'info'
            ? 'bg-primary'
            : 'bg-danger';
    const iconClass = type === 'success'
        ? 'bi-check-circle-fill'
        : type === 'info'
            ? 'bi-info-circle-fill'
            : 'bi-exclamation-triangle-fill';
    const title = type === 'success'
        ? 'Sucesso!'
        : type === 'info'
            ? 'Aviso!'
            : 'Erro!';
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${backgroundClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi ${iconClass} me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <strong>${title}</strong><br>
                        ${message}
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000,
        animation: true
    });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', function () {
        toastContainer.remove();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const title = document.querySelector('.login-header h2');
    if (title) {
        title.style.opacity = '0';
        setTimeout(() => {
            title.style.transition = 'opacity 1s ease-in-out';
            title.style.opacity = '1';
        }, 300);
    }
    verificarSessao();
    setTimeout(() => {
        document.getElementById('usuario').focus();
    }, 500);
});

function verificarSessao() {
    fetch('/app/routers/login/LoginRouter.php?action=check', {
        credentials: 'same-origin'
    })
        .then(response => {
            if (!response.ok) {
                return { sucesso: false };
            }
            return response.json();
        })
        .then(data => {
            if (data.sucesso) {
                safeShowToast('info', 'Voce ja esta logado. Redirecionando...');
                setTimeout(() => {
                    window.location.href = '/app/views/workflow/geral/index.php';
                }, 2000);
            }
        })
        .catch(() => {
            console.log('Sessao nao verificada ou erro na requisicao');
        });
}

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' &&
        (document.activeElement.id === 'usuario' ||
            document.activeElement.id === 'password')) {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});
