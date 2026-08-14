// ⚠️⚠️ TEMPORÁRIO — APENAS PARA TESTE. REMOVER antes de mergear. ⚠️⚠️
// HTML de exemplo do banner (mock do card promocional) para validar o WebView
// do BannerRichTextModal end-to-end antes de o backend mandar o richtext real.
// Ligado em BannersCarousel.tsx (também marcado como TESTE TEMPORÁRIO).
export const TEST_BANNER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Travel Insurance</title>
    <!-- Fonte genérica para simular o ambiente nativo caso as fontes customizadas não carreguem -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-purple-light: #6444DA;
            --brand-purple-main: #4D2ACC;
            --brand-dark: #1B0F4A;
            --brand-mint: #85EDD3;
            --text-dark: #0F022D;
            --bg-card: #FFFFFF;
            --bg-body: #EDEDF2;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            /* Fundo escuro para simular o overlay do app */
            background-color: rgba(27, 15, 74, 0.4);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .alert-modal {
            background-color: var(--bg-card);
            border-radius: 12px;
            width: 100%;
            max-width: 320px;
            padding: 24px 20px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            text-align: center;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        .icon-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 16px;
        }

        .alert-title {
            color: var(--text-dark);
            font-size: 21px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }

        .alert-description {
            color: var(--text-dark);
            font-size: 14px;
            font-weight: 400;
            line-height: 1.4;
            letter-spacing: 0.2px;
            margin-bottom: 24px;
            opacity: 0.8; /* Suaviza um pouco o texto descritivo */
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .btn {
            border-radius: 12px;
            padding: 16px 20px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.5px;
            border: none;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex;
            justify-content: center;
            align-items: center;
            text-transform: uppercase;
        }

        .btn:active {
            opacity: 0.8;
        }

        .btn-primary {
            background: linear-gradient(180deg, var(--brand-purple-light) 0%, var(--brand-purple-main) 100%);
            color: var(--brand-mint);
            text-decoration: none;
        }

    </style>
</head>
<body>

    <div class="alert-modal">
        <div class="icon-container">
            <!-- Ícone de mala (SuitcaseRollingIcon adaptado) com a cor primária -->
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 256 256">
                <path d="M168,80V56a16,16,0,0,0-16-16H104A16,16,0,0,0,88,56V80H40a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16H56v8a8,8,0,0,0,16,0v-8H184v8a8,8,0,0,0,16,0v-8h16a16,16,0,0,0,16-16V96a16,16,0,0,0-16-16ZM104,56h48V80H104ZM216,208H40V96H216V208ZM144,120v64a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm-32,0v64a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Z" fill="#4D2ACC"></path>
            </svg>
        </div>

        <h2 class="alert-title">Travel Insurance</h2>

        <p class="alert-description">
            Travel with complete peace of mind. Get covered now and guarantee 24/7 protection and support during your journey.
        </p>

        <div class="actions">
            <a href="https://wa.link/78c1pc" class="btn btn-primary">Get Covered Now</a>
        </div>
    </div>

</body>
</html>`;
