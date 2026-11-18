# Dominópolis — landing page

Landing page de e-commerce (PT-BR) do jogo de tabuleiro **Dominópolis**.
Site estático: HTML + CSS + JavaScript puro, sem build e sem dependências.

## Rodar localmente

Abra `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

Publica direto em GitHub Pages, Vercel, Netlify ou qualquer hospedagem estática.

## Estrutura

```
index.html                 página (todas as seções)
assets/css/styles.css      estilos (mobile-first, tokens de cor em :root)
assets/js/main.js          carrinho, seletor de edição, frete, galeria, barra mobile
assets/img/*.svg           ilustrações geradas (provisórias)
scripts/generate-art.mjs   gerador das ilustrações → node scripts/generate-art.mjs
```

## O que funciona

- Seletor de edição (Pocket / Completa) atualiza o preço, o preço no Pix e a barra mobile.
- Carrinho lateral: adicionar, alterar quantidade, remover, subtotal, desconto Pix de 5% e
  total; persiste no `localStorage`; foco preso no drawer, fecha com ESC/overlay.
- Simulador de frete por CEP (máscara, validação, opções Econômico e Expresso por região).
- Galeria com miniaturas, setas, teclado (← →), swipe no celular e zoom com mouse.
- Barra fixa no celular, que aparece quando o botão "Comprar Agora" sai da tela.
- FAQ em sanfona com `<details>` (funciona sem JS).

## ⚠️ Pendências antes de ir ao ar

| Item | Onde | Por quê |
|---|---|---|
| **Checkout real** | `CHECKOUT_URL` em `assets/js/main.js` | Hoje "Finalizar pedido" só mostra uma confirmação de demonstração. Nenhum pagamento é processado. |
| **Frete real** | `SHIPPING_TABLE` em `assets/js/main.js` | Os valores são simulados por faixa de CEP. Use uma API (Melhor Envio, Correios, Frenet…). |
| **Avaliações reais** | seção `#avaliacoes` em `index.html` | A nota 4,9, as 128 avaliações e os depoimentos são exemplos. Publicar avaliações inventadas é publicidade enganosa (CDC art. 37). |
| **Selo "Mais vendida"** | `index.html` | Não pode ser afirmado num lançamento sem dados de venda. Considere "Mais completa" ou "Recomendada". |
| **Conteúdo da Pocket** | comparativo e FAQ | Sem tabuleiro, sem suportes, com guia e "ideal para 2": tudo isso é suposição. Confirme. |
| **Prazo de postagem** | FAQ "Qual o prazo de envio?" | "Até 2 dias úteis" é um placeholder. |
| **Dados da empresa** | rodapé | Razão social, CNPJ, endereço e contato (Decreto 7.962/2013), além das políticas de troca/arrependimento e de privacidade (LGPD). |
| **Fotos do produto** | `assets/img/` | As ilustrações vetoriais são provisórias. Fotos reais e um vídeo curto de partida convertem mais. |
| **Imagem de compartilhamento** | `<meta property="og:image">` | WhatsApp e Facebook precisam de PNG/JPG 1200×630 com URL absoluta. |
