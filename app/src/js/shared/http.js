(() => {
    const DEFAULT_HEADERS = {
        'X-Requested-With': 'XMLHttpRequest'
    };

    async function request(url, options = {}) {
        const config = {
            credentials: 'include',
            ...options,
            headers: {
                ...DEFAULT_HEADERS,
                ...(options.headers || {})
            }
        };

        const response = await fetch(url, config);
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : await response.text();

        if (!response.ok) {
            const message = isJson
                ? payload.message || payload.mensagem || `Erro HTTP ${response.status}`
                : `Erro HTTP ${response.status}`;
            throw new Error(message);
        }

        return payload;
    }

    async function get(url, options = {}) {
        return request(url, { method: 'GET', ...options });
    }

    async function postJson(url, data, options = {}) {
        return request(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });
    }

    async function postForm(url, formData, options = {}) {
        return request(url, {
            method: 'POST',
            body: formData,
            ...options
        });
    }

    window.LuminaHttp = {
        request,
        get,
        postJson,
        postForm
    };
})();
