<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumina | Acesso</title>
    <link rel="icon" type="image/png" href="/app/src/img/lumina-logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <main class="login-shell">
        <section class="login-panel">
            <div class="login-card">
                <div class="login-header">
                    <div class="brand-container">
                        <img src="/app/src/img/lumina-logo.png" alt="Lumina Logo" class="brand-logo-img">
                        <span class="brand-name">Lumina</span>
                    </div>
                    <h2>Entrar</h2>
                    <p>Acesse sua conta para continuar.</p>
                </div>

                <div class="login-body">
                    <form id="loginForm" novalidate>
                        <div class="mb-3">
                            <label for="usuario" class="form-label">Usuario</label>
                            <div class="input-group input-shell">
                                <span class="input-group-text">
                                    <i class="bi bi-person-circle"></i>
                                </span>
                                <input
                                    type="text"
                                    class="form-control"
                                    id="usuario"
                                    name="usuario"
                                    placeholder="seu_usuario"
                                    required
                                    pattern="[a-zA-Z0-9_]{3,50}"
                                    title="Use apenas letras, numeros e underscore (_)">
                                <div class="invalid-feedback">
                                    Usuario invalido. Use de 3 a 50 caracteres.
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="password" class="form-label">Senha</label>
                            <div class="input-group input-shell">
                                <span class="input-group-text">
                                    <i class="bi bi-key"></i>
                                </span>
                                <input
                                    type="password"
                                    class="form-control"
                                    id="password"
                                    name="password"
                                    placeholder="Sua senha"
                                    required
                                    minlength="6">
                                <button class="btn btn-ghost" type="button" id="togglePassword" aria-label="Mostrar senha">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <div class="invalid-feedback">
                                    A senha deve ter pelo menos 6 caracteres.
                                </div>
                            </div>
                        </div>

                        <div class="login-actions">
                            <button type="submit" class="btn btn-login btn-lg">
                                <i class="bi bi-box-arrow-in-right me-2"></i>
                                Entrar
                            </button>
                        </div>
                    </form>

                    <div class="login-footer">
                        <p>&copy; 2026 Lumina</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/app/src/js/login/login.js"></script>
</body>

</html>
