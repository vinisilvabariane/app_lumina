# Flow

Aplicacao PHP com estrutura MVC para login, listagem de workflows e detalhes do fluxo.

## Pasta correta

A raiz do projeto e esta:

```text
C:\Repositories\flow
```

E aqui que estao:

- `docker-compose.yml`
- `Dockerfile`
- `index.php`
- `app/`

## Stack real

- PHP 8.2 + Apache
- MySQL 8
- Bootstrap + jQuery
- DataTables
- Select2
- SweetAlert2

## Como subir

Na raiz do projeto:

```powershell
docker compose up -d --build
```

Aplicacao:

```text
http://localhost:8080
```

Banco:

```text
localhost:3307
```

## Fluxo de desenvolvimento

O `docker-compose.yml` agora monta a pasta inteira do projeto em `/var/www/html`.
Isso significa que alteracoes locais em `app/`, `index.php`, CSS, JS e views passam a aparecer no container sem precisar rebuildar a imagem a cada ajuste.

Se o container ja estava rodando antes dessa mudanca, recrie:

```powershell
docker compose down
docker compose up -d --build
```

## Estrutura

```text
app/
  configs/
  controllers/
  models/
  routers/
  src/
  views/
docker/
uploads/
```

## Observacoes

- Se a tela de workflows travar, abra o console do navegador primeiro.
- Se as alteracoes nao aparecerem, o problema normalmente e container antigo sem rebuild ou sem volume montado.
- Se quiser um refactor arquitetural maior, o proximo passo correto e separar frontend, camadas de servico e configuracao de ambiente por `.env`.
