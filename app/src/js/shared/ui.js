(() => {
    function toast(icon, title, text, timer = 2800) {
        if (window.Swal) {
            return Swal.fire({
                toast: true,
                position: 'top-end',
                icon,
                title,
                text,
                timer,
                timerProgressBar: true,
                showConfirmButton: false
            });
        }

        return null;
    }

    function modalAlert({ icon = 'info', title, text, html, footer, timer, showConfirmButton = true }) {
        if (window.Swal) {
            return Swal.fire({
                icon,
                title,
                text,
                html,
                footer,
                timer,
                timerProgressBar: Boolean(timer),
                showConfirmButton
            });
        }

        if (text) {
            alert(text);
        }

        return Promise.resolve();
    }

    function loading(title = 'Carregando...', text = 'Aguarde um instante.') {
        if (!window.Swal) {
            return { close() {} };
        }

        Swal.fire({
            title,
            html: text,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        return {
            close() {
                Swal.close();
            }
        };
    }

    function confirm(options) {
        if (!window.Swal) {
            return Promise.resolve({ isConfirmed: window.confirm(options.text || options.title || 'Confirmar?') });
        }

        return Swal.fire(options);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDateTime(value) {
        if (!value) {
            return 'Nao informado';
        }

        return new Date(value).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDate(value) {
        if (!value) {
            return 'Nao informado';
        }

        return new Date(value).toLocaleDateString('pt-BR');
    }

    function formatBytes(bytes) {
        if (!bytes) {
            return '0 Bytes';
        }

        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const size = bytes / (1024 ** index);

        return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    }

    window.LuminaUI = {
        toast,
        modalAlert,
        loading,
        confirm,
        escapeHtml,
        formatDateTime,
        formatDate,
        formatBytes
    };
})();
