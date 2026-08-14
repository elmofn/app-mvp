// ⚠️⚠️ TEMPORÁRIO — APENAS PARA TESTE. REMOVER antes de mergear. ⚠️⚠️
// Card de teste para validar as ROTAS internas (app://) do CTA do banner:
//   - app://shop          -> aba TravelShop
//   - app://hotels        -> marketplace (passa pelo gate telefone+email)
//   - app://promotional1  -> página promocional 1
//   - https://...         -> navegador externo (contraprova)
// Ligado em BannersCarousel.tsx (também marcado como TESTE TEMPORÁRIO).
export const TEST_BANNER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root{
            --purple-light:#6444DA; --purple-main:#4D2ACC; --dark:#1B0F4A;
            --mint:#85EDD3; --text:#0F022D; --card:#FFFFFF;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,-apple-system,sans-serif;
            background:rgba(27,15,74,0.4);display:flex;justify-content:center;
            align-items:center;min-height:100vh;padding:20px}
        .alert-modal{background:var(--card);border-radius:16px;width:100%;max-width:320px;
            padding:24px 20px;box-shadow:0 8px 24px rgba(0,0,0,.2);text-align:center;
            animation:fadeIn .2s ease-out}
        @keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        .icon{font-size:40px;margin-bottom:14px}
        .title{color:var(--text);font-size:21px;font-weight:700;letter-spacing:-.5px;margin-bottom:6px}
        .desc{color:var(--text);font-size:14px;line-height:1.5;opacity:.8;margin-bottom:22px}
        .actions{display:flex;flex-direction:column;gap:10px}
        .btn{display:flex;justify-content:center;align-items:center;border-radius:12px;
            padding:14px;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;
            text-decoration:none}
        .btn-primary{color:var(--mint);
            background:linear-gradient(180deg,var(--purple-light),var(--purple-main))}
        .btn-ghost{color:var(--purple-main);background:#EDEDF2}
    </style>
</head>
<body>
    <div class="alert-modal">
        <div class="icon">🧭</div>
        <h2 class="title">Teste de Rotas</h2>
        <p class="desc">Toque nos botões para validar a navegação interna (app://) e a externa.</p>
        <div class="actions">
            <a href="app://shop" class="btn btn-primary">Ir para a Loja</a>
            <a href="app://hotels" class="btn btn-ghost">Buscar Hotéis (gate)</a>
            <a href="app://promotional1" class="btn btn-ghost">Página Promocional 1</a>
            <a href="https://wa.link/78c1pc" class="btn btn-ghost">Abrir site (externo)</a>
        </div>
    </div>
</body>
</html>`;
