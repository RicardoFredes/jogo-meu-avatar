# Lauren Fashion - Plano Completo

## Visao Geral

**Lauren Fashion** e um jogo infantil (5 anos) de criar personagens 2D e vesti-los com roupas e acessorios usando **drag and drop**. Dados persistidos em localStorage. Arquitetura **data-driven via JSON** com assets visuais em **arquivos SVG/PNG separados** referenciados por URL.

### Inspiracao Visual (imagem de referencia)
- Tema **roxo/lilas** com gradientes suaves
- Personagens estilo **chibi** (cabeca grande, corpo fofo)
- Fundo com textura de madeira clara e luzes decorativas
- Elementos decorativos: estrelas, coracoes, brilhos
- UI arredondada, botoes grandes e coloridos
- Categorias de roupa no painel lateral esquerdo
- Personagem grande no centro/direita
- Grid de itens arrastaveis no centro

---

## Tech Stack - Dependencias

### Renderizacao + Canvas: Konva.js
- **O que faz**: Motor 2D com scene graph (Stage > Layer > Group > Image). Perfeito para personagem em camadas
- **Por que**: Drag & drop nativo com suporte touch, filtros de cor (HSL) para trocar cor de roupas, API simples e declarativa
- **Tamanho**: ~150 KB minified
- **CDN**: `https://unpkg.com/konva@9/konva.min.js`
- **Alternativa descartada**: PixiJS (overkill, WebGL, 500KB+), Phaser (game engine completo, 1MB+), Fabric.js (mais voltado para editor tipo Canva)

### Drag & Drop (DOM para Canvas): interact.js
- **O que faz**: Drag and drop de elementos HTML com suporte touch completo
- **Por que**: Para arrastar thumbnails do painel HTML de itens ate o canvas Konva do personagem
- **Tamanho**: ~30 KB minified
- **CDN**: `https://unpkg.com/interactjs@1/dist/interact.min.js`
- **Alternativa descartada**: HTML5 DnD nativo (quebrado em mobile/touch), Sortable.js (so para listas)

### Animacoes CSS: Animate.css
- **O que faz**: Classes CSS prontas para animacoes (bounce, tada, heartBeat, fadeIn, etc)
- **Por que**: Zero JavaScript, basta adicionar classe. Perfeito para transicoes de tela, feedback de botao, entrada de personagem
- **Tamanho**: ~13 KB gzipped
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css`

### Efeito de Celebracao: canvas-confetti
- **O que faz**: Confetti/estrelas animados no canvas
- **Por que**: Ao salvar personagem ou look, dispara celebracao. Uma unica chamada de funcao
- **Tamanho**: ~6 KB gzipped
- **CDN**: `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js`

### Design Tokens CSS: Open Props
- **O que faz**: Variaveis CSS prontas (cores, sombras, easings, gradientes, espacamentos)
- **Por que**: Oferece easings como `--ease-bounce` e `--ease-elastic-out` ideais para UI infantil, alem de sombras e gradientes pre-definidos
- **Tamanho**: ~4.4 KB
- **CDN**: `https://unpkg.com/open-props`

### Fontes: Fredoka + Nunito (Google Fonts)
- **Fredoka**: Titulos e botoes. Arredondada, gordinha, divertida. Variable font com multiplos pesos
- **Nunito**: Textos e labels. Arredondada mas legivel em tamanhos menores. Par natural com Fredoka
- **CDN**: `https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap`
- **Descartadas**: Bubblegum Sans (dificil de ler), Comic Neue (parece Comic Sans), Baloo 2 (arquivo pesado)

### Icones: Phosphor Icons (duotone)
- **O que faz**: Biblioteca de 9000+ icones com estilo duotone (2 tons de cor)
- **Por que**: Estilo duotone e fofo/divertido, perfeito para tema infantil. Tem todos os icones necessarios: heart, star, crown, t-shirt, dress, pants, sneaker, palette, magic-wand, sparkle, scissors, house, plus-circle
- **Peso duotone**: Vamos usar **SVGs inline apenas dos ~20 icones necessarios** (~5 KB total, em vez de carregar a webfont inteira de 500KB)
- **Site**: https://phosphoricons.com/
- **Uso**: Copiar SVGs dos icones necessarios e embutir inline no HTML/JS

### Resumo de Peso Total

| Dependencia | Tamanho (gzip) |
|-------------|----------------|
| Konva.js | ~50 KB |
| interact.js | ~12 KB |
| Animate.css | ~13 KB |
| canvas-confetti | ~6 KB |
| Open Props | ~4.4 KB |
| Google Fonts | ~40 KB |
| Icones (inline SVG) | ~5 KB |
| **TOTAL** | **~130 KB** |

Stack leve (~130 KB de dependencias) para um jogo rico e interativo.

---

## Arquitetura Data-Driven

### Principio Central

O codigo JS e um **motor generico**. Todo conteudo visual vem de:
- **Arquivos JSON** descrevendo categorias, itens, tamanhos e URLs dos assets
- **Arquivos SVG/PNG separados** na pasta `assets/` referenciados pelos JSONs

Adicionar conteudo novo = adicionar asset + entrada no JSON. Zero mudanca em codigo.

### Fluxo

```
[assets/]  <-- Arquivos SVG/PNG individuais
     ^
     |  (URL referenciada)
     |
[data/*.json]  --> descreve itens, tamanhos, posicoes, categorias
     |
     v
[Motor JS generico]  --> Carrega JSONs, monta UI, posiciona assets, drag & drop
     |
     v
[Tela do jogo]  --> Personagem montado com <img> sobrepostas via CSS position
```

### Como assets sao referenciados no JSON

```json
{
  "id": "hair-curly-long",
  "name": "Cacheado Longo",
  "assets": {
    "thumbnail": "assets/hair/thumbnails/curly-long.png",
    "front": "assets/hair/front/curly-long.svg",
    "back": "assets/hair/back/curly-long.svg"
  },
  "size": { "width": 120, "height": 100 },
  "offset": { "x": -10, "y": -30 },
  "zIndex": 80,
  "colorable": true,
  "colorPalette": "hair-colors"
}
```

- **`assets`**: Objeto com URLs para cada camada/variacao do item
- **`size`**: Dimensoes em pixels do asset no canvas do personagem
- **`offset`**: Ajuste de posicao relativo ao ponto de ancora
- **`thumbnail`**: Imagem pequena exibida no painel de selecao / drag source

---

## Estrutura de Arquivos

```
person-game/
│
├── index.html
├── css/
│   └── style.css
│
├── js/
│   ├── app.js                  -- Inicializacao, roteamento SPA
│   ├── config-loader.js        -- Carrega e valida JSONs + preload de assets
│   ├── catalog.js              -- Registro central de itens
│   ├── storage.js              -- CRUD localStorage
│   ├── renderer.js             -- Composicao visual do personagem (camadas)
│   ├── drag-drop.js            -- Sistema de drag and drop
│   ├── character-creator.js    -- Tela de criacao
│   └── wardrobe.js             -- Tela de guarda-roupa
│
├── data/
│   ├── ui-config.json          -- Nome, tema, etapas, categorias
│   ├── body-shapes.json        -- Corpos base (URLs dos SVGs + dimensoes)
│   ├── skin-colors.json        -- Paleta de tons de pele
│   ├── color-palettes.json     -- Paletas de cores reutilizaveis
│   ├── body-parts/
│   │   ├── face-shapes.json
│   │   ├── eyes.json
│   │   ├── eyebrows.json
│   │   ├── noses.json
│   │   ├── mouths.json
│   │   ├── hair.json
│   │   ├── facial-hair.json
│   │   └── extras.json         -- Sardas, pintinhas, bochechas
│   ├── clothing/
│   │   ├── tops.json
│   │   ├── bottoms.json
│   │   ├── shoes.json
│   │   └── full-body.json      -- Vestidos, macacao
│   └── accessories/
│       ├── head.json           -- Chapeus, tiaras, lacos, coroas
│       ├── face.json           -- Oculos, mascaras
│       └── body.json           -- Colares, mochilas, asas, capas
│
└── assets/
    ├── ui/                     -- Icones da UI, fundo, decoracoes
    │   ├── bg-home.png
    │   ├── bg-creator.png
    │   ├── bg-wardrobe.png
    │   ├── logo.svg
    │   ├── icon-star.svg
    │   ├── icon-heart.svg
    │   ├── sparkle.svg
    │   └── btn-*.svg
    ├── bodies/                 -- Corpos base
    │   ├── child-female-thin.svg
    │   ├── child-female-normal.svg
    │   ├── child-female-fat.svg
    │   ├── child-male-thin.svg
    │   ├── child-male-normal.svg
    │   ├── child-male-fat.svg
    │   ├── adult-female-thin.svg
    │   ├── ... (12 variacoes: 2 sexos x 2 tamanhos x 3 builds)
    │   └── thumbnails/
    │       └── *.png
    ├── faces/
    │   ├── shapes/             -- Formatos de rosto (contorno)
    │   ├── eyes/               -- Olhos
    │   ├── eyebrows/           -- Sobrancelhas
    │   ├── noses/              -- Narizes
    │   ├── mouths/             -- Bocas
    │   ├── facial-hair/        -- Barbas, bigodes
    │   ├── extras/             -- Sardas, bochechas rosadas
    │   └── thumbnails/
    │       └── *.png
    ├── hair/
    │   ├── front/              -- Parte frontal do cabelo
    │   ├── back/               -- Parte traseira do cabelo
    │   └── thumbnails/
    │       └── *.png
    ├── clothing/
    │   ├── tops/
    │   ├── bottoms/
    │   ├── shoes/
    │   ├── full-body/
    │   └── thumbnails/
    │       └── *.png
    └── accessories/
        ├── head/
        ├── face/
        ├── body/
        └── thumbnails/
            └── *.png
```

---

## Schemas dos JSONs

### body-shapes.json

```json
{
  "version": "1.0",
  "shapes": [
    {
      "id": "child-female-normal",
      "sex": "female",
      "size": "child",
      "build": "normal",
      "label": "Menina",
      "assets": {
        "body": "assets/bodies/child-female-normal.svg",
        "thumbnail": "assets/bodies/thumbnails/child-female-normal.png"
      },
      "dimensions": {
        "width": 180,
        "height": 320
      },
      "anchors": {
        "head": { "x": 90, "y": 55, "radius": 50 },
        "eyeLine": { "x": 90, "y": 48 },
        "nose": { "x": 90, "y": 60 },
        "mouth": { "x": 90, "y": 68 },
        "hairTop": { "x": 90, "y": 10 },
        "shoulders": { "x": 90, "y": 110 },
        "torsoCenter": { "x": 90, "y": 145 },
        "waist": { "x": 90, "y": 170 },
        "hips": { "x": 90, "y": 185 },
        "feet": { "x": 90, "y": 300 }
      }
    }
  ]
}
```

### body-parts/*.json (schema generico)

```json
{
  "version": "1.0",
  "category": "eyes",
  "type": "body-part",
  "label": "Olhinhos",
  "icon": "assets/ui/icon-eyes.svg",
  "anchor": "eyeLine",
  "zIndex": 70,
  "colorable": true,
  "colorPalette": "eye-colors",
  "items": [
    {
      "id": "eyes-round-big",
      "name": "Redondinhos",
      "assets": {
        "main": "assets/faces/eyes/round-big.svg",
        "thumbnail": "assets/faces/thumbnails/eyes-round-big.png"
      },
      "size": { "width": 70, "height": 30 },
      "offset": { "x": 0, "y": 0 },
      "tags": ["default", "cute"]
    },
    {
      "id": "eyes-anime",
      "name": "Anime",
      "assets": {
        "main": "assets/faces/eyes/anime.svg",
        "thumbnail": "assets/faces/thumbnails/eyes-anime.png"
      },
      "size": { "width": 80, "height": 40 },
      "offset": { "x": 0, "y": -2 },
      "tags": ["anime", "grande"]
    }
  ]
}
```

### hair.json (multiplas camadas)

```json
{
  "version": "1.0",
  "category": "hair",
  "type": "body-part",
  "label": "Cabelo",
  "icon": "assets/ui/icon-hair.svg",
  "colorable": true,
  "colorPalette": "hair-colors",
  "items": [
    {
      "id": "hair-curly-long",
      "name": "Cacheado Longo",
      "assets": {
        "back": "assets/hair/back/curly-long.svg",
        "front": "assets/hair/front/curly-long.svg",
        "thumbnail": "assets/hair/thumbnails/curly-long.png"
      },
      "layers": [
        { "asset": "back", "anchor": "hairTop", "zIndex": 10, "size": { "width": 150, "height": 200 }, "offset": { "x": 0, "y": 0 } },
        { "asset": "front", "anchor": "hairTop", "zIndex": 80, "size": { "width": 140, "height": 120 }, "offset": { "x": 0, "y": 0 } }
      ],
      "tags": ["longo", "cacheado"]
    }
  ]
}
```

### clothing/*.json

```json
{
  "version": "1.0",
  "category": "tops",
  "type": "clothing",
  "slotId": "top",
  "label": "Blusas",
  "icon": "assets/ui/icon-top.svg",
  "zIndex": 30,
  "anchor": "shoulders",
  "colorable": true,
  "colorPalette": "clothing-colors",
  "items": [
    {
      "id": "top-tshirt",
      "name": "Camiseta",
      "assets": {
        "main": "assets/clothing/tops/tshirt.svg",
        "thumbnail": "assets/clothing/thumbnails/top-tshirt.png"
      },
      "size": { "width": 120, "height": 80 },
      "offset": { "x": 0, "y": 0 },
      "adaptToBody": true,
      "conflicts": ["full-body"],
      "tags": ["casual", "basico"]
    }
  ]
}
```

### full-body.json (vestidos, macacao)

```json
{
  "version": "1.0",
  "category": "full-body",
  "type": "clothing",
  "slotId": "full-body",
  "label": "Vestidos",
  "icon": "assets/ui/icon-dress.svg",
  "zIndex": 28,
  "anchor": "shoulders",
  "colorable": true,
  "colorPalette": "clothing-colors",
  "items": [
    {
      "id": "dress-princess",
      "name": "Vestido Princesa",
      "assets": {
        "main": "assets/clothing/full-body/dress-princess.svg",
        "thumbnail": "assets/clothing/thumbnails/dress-princess.png"
      },
      "size": { "width": 140, "height": 180 },
      "offset": { "x": 0, "y": 0 },
      "adaptToBody": true,
      "conflicts": ["top", "bottom"],
      "tags": ["fantasia", "princesa"]
    }
  ]
}
```

### accessories/*.json

```json
{
  "version": "1.0",
  "category": "head-accessories",
  "type": "accessory",
  "slotId": "head-acc",
  "label": "Chapeus",
  "icon": "assets/ui/icon-crown.svg",
  "zIndex": 90,
  "anchor": "hairTop",
  "colorable": false,
  "items": [
    {
      "id": "acc-crown-gold",
      "name": "Coroa Dourada",
      "assets": {
        "main": "assets/accessories/head/crown-gold.svg",
        "thumbnail": "assets/accessories/thumbnails/acc-crown-gold.png"
      },
      "size": { "width": 80, "height": 50 },
      "offset": { "x": 0, "y": -15 },
      "tags": ["fantasia", "princesa", "realeza"]
    }
  ]
}
```

### color-palettes.json

```json
{
  "version": "1.0",
  "palettes": {
    "eye-colors": [
      { "id": "brown", "name": "Castanho", "hex": "#8B4513" },
      { "id": "blue", "name": "Azul", "hex": "#4169E1" },
      { "id": "green", "name": "Verde", "hex": "#228B22" },
      { "id": "black", "name": "Preto", "hex": "#1A1A1A" },
      { "id": "honey", "name": "Mel", "hex": "#DAA520" },
      { "id": "gray", "name": "Cinza", "hex": "#708090" },
      { "id": "violet", "name": "Violeta", "hex": "#8A2BE2" },
      { "id": "red", "name": "Vermelho", "hex": "#DC143C" }
    ],
    "hair-colors": [
      { "id": "black", "name": "Preto", "hex": "#1A1A1A" },
      { "id": "dark-brown", "name": "Castanho Escuro", "hex": "#3B2314" },
      { "id": "brown", "name": "Castanho", "hex": "#8B4513" },
      { "id": "light-brown", "name": "Castanho Claro", "hex": "#C49A6C" },
      { "id": "blonde", "name": "Loiro", "hex": "#F0D58C" },
      { "id": "ginger", "name": "Ruivo", "hex": "#B7472A" },
      { "id": "gray", "name": "Grisalho", "hex": "#A9A9A9" },
      { "id": "white", "name": "Branco", "hex": "#F5F5F5" },
      { "id": "pink", "name": "Rosa", "hex": "#FF69B4" },
      { "id": "blue", "name": "Azul", "hex": "#4169E1" },
      { "id": "purple", "name": "Roxo", "hex": "#9370DB" },
      { "id": "green", "name": "Verde", "hex": "#32CD32" }
    ],
    "clothing-colors": [
      { "id": "white", "name": "Branco", "hex": "#FFFFFF" },
      { "id": "black", "name": "Preto", "hex": "#222222" },
      { "id": "red", "name": "Vermelho", "hex": "#E74C3C" },
      { "id": "blue", "name": "Azul", "hex": "#3498DB" },
      { "id": "green", "name": "Verde", "hex": "#2ECC71" },
      { "id": "yellow", "name": "Amarelo", "hex": "#F1C40F" },
      { "id": "pink", "name": "Rosa", "hex": "#E91E90" },
      { "id": "purple", "name": "Roxo", "hex": "#9B59B6" },
      { "id": "orange", "name": "Laranja", "hex": "#E67E22" },
      { "id": "lilac", "name": "Lilas", "hex": "#C8A2C8" }
    ],
    "skin-tones": [
      { "id": "skin-1", "name": "Clara", "hex": "#FCDEC0" },
      { "id": "skin-2", "name": "Pessego", "hex": "#F0C8A0" },
      { "id": "skin-3", "name": "Mel", "hex": "#D2946B" },
      { "id": "skin-4", "name": "Canela", "hex": "#B07040" },
      { "id": "skin-5", "name": "Chocolate", "hex": "#8B5E3C" },
      { "id": "skin-6", "name": "Cafe", "hex": "#6B4226" },
      { "id": "skin-7", "name": "Escura", "hex": "#4A2912" },
      { "id": "skin-8", "name": "Fantasia Rosa", "hex": "#FFB6C1" },
      { "id": "skin-9", "name": "Fantasia Azul", "hex": "#87CEEB" },
      { "id": "skin-10", "name": "Fantasia Verde", "hex": "#90EE90" }
    ]
  }
}
```

### ui-config.json

```json
{
  "version": "1.0",
  "gameName": "Lauren Fashion",
  "subtitle": "Crie, Vista e Brilhe!",
  "theme": {
    "primaryColor": "#9B59B6",
    "secondaryColor": "#C8A2C8",
    "accentColor": "#F39C12",
    "bgGradient": ["#E8D5F5", "#F5E6FF", "#FFF0F5"],
    "panelBg": "rgba(255, 255, 255, 0.9)",
    "buttonPrimary": "#9B59B6",
    "buttonSecondary": "#E91E90",
    "buttonDanger": "#E74C3C",
    "buttonSuccess": "#2ECC71",
    "glowColor": "#FFD700",
    "fontFamily": "'Nunito', 'Segoe UI', sans-serif",
    "borderRadius": "16px"
  },
  "backgrounds": {
    "home": "assets/ui/bg-home.png",
    "creator": "assets/ui/bg-creator.png",
    "wardrobe": "assets/ui/bg-wardrobe.png"
  },
  "decorations": {
    "stars": "assets/ui/sparkle.svg",
    "hearts": "assets/ui/icon-heart.svg"
  },
  "creationSteps": [
    {
      "id": "basics",
      "label": "Quem Voce Vai Criar?",
      "icon": "assets/ui/icon-star.svg",
      "fields": ["name", "sex", "size", "build"]
    },
    {
      "id": "skin",
      "label": "Cor da Pele",
      "icon": "assets/ui/icon-palette.svg",
      "dataSource": "skin-tones"
    },
    {
      "id": "face",
      "label": "Rostinho",
      "icon": "assets/ui/icon-face.svg",
      "dataSource": "body-parts/face-shapes"
    },
    {
      "id": "eyes",
      "label": "Olhinhos",
      "icon": "assets/ui/icon-eye.svg",
      "dataSources": ["body-parts/eyes", "body-parts/eyebrows"]
    },
    {
      "id": "nose-mouth",
      "label": "Nariz e Boquinha",
      "icon": "assets/ui/icon-smile.svg",
      "dataSources": ["body-parts/noses", "body-parts/mouths"]
    },
    {
      "id": "hair",
      "label": "Cabelo",
      "icon": "assets/ui/icon-hair.svg",
      "dataSource": "body-parts/hair"
    },
    {
      "id": "extras",
      "label": "Detalhes Especiais",
      "icon": "assets/ui/icon-magic.svg",
      "dataSources": ["body-parts/facial-hair", "body-parts/extras"]
    },
    {
      "id": "review",
      "label": "Ficou Lindo!",
      "icon": "assets/ui/icon-check.svg",
      "type": "review"
    }
  ],
  "wardrobeCategories": [
    { "dataSource": "clothing/full-body", "label": "Vestidos", "icon": "assets/ui/icon-dress.svg" },
    { "dataSource": "clothing/tops", "label": "Blusas", "icon": "assets/ui/icon-top.svg" },
    { "dataSource": "clothing/bottoms", "label": "Calcas", "icon": "assets/ui/icon-bottom.svg" },
    { "dataSource": "clothing/shoes", "label": "Sapatos", "icon": "assets/ui/icon-shoes.svg" },
    { "dataSource": "accessories/head", "label": "Chapeus", "icon": "assets/ui/icon-crown.svg" },
    { "dataSource": "accessories/face", "label": "Oculos", "icon": "assets/ui/icon-glasses.svg" },
    { "dataSource": "accessories/body", "label": "Acessorios", "icon": "assets/ui/icon-accessory.svg" }
  ],
  "messages": {
    "emptyState": "Crie sua primeira personagem!",
    "confirmDelete": "Tem certeza que quer apagar?",
    "saved": "Salvo!",
    "lookSaved": "Look salvo na galeria!",
    "dragHint": "Arraste as roupas para vestir!"
  }
}
```

---

## Sistema de Drag and Drop

### Como funciona

A tela de **Guarda-Roupa** usa drag and drop como interacao principal:

```
[Painel de Itens]          [Personagem]
┌──────────────┐          ┌──────────────┐
│ ┌──┐ ┌──┐   │  DRAG    │              │
│ │👗│ │👕│   │ -------> │   👧 DROP    │
│ └──┘ └──┘   │          │    ZONE      │
│ ┌──┐ ┌──┐   │          │              │
│ │👖│ │👟│   │          │              │
│ └──┘ └──┘   │          └──────────────┘
└──────────────┘
```

### Fluxo de interacao

1. **Painel lateral esquerdo**: Grid de thumbnails dos itens (drag sources)
2. **Area central/direita**: Personagem montado (drop zone)
3. Crianca **arrasta** thumbnail do item ate o personagem
4. Ao soltar sobre o personagem:
   - Item e equipado no slot correto
   - Asset do item aparece posicionado sobre o corpo
   - Conflitos resolvidos automaticamente (vestido remove blusa+calca)
   - Feedback visual: brilho/glow + pequena animacao de "encaixe"
5. **Clicar em item ja equipado no personagem** = desequipa (remove)
6. **Arrastar item para fora** do personagem = desequipa

### Implementacao tecnica (drag-drop.js com interact.js + Konva)

**Fluxo DOM-para-Canvas**:
Os thumbnails vivem no HTML (DOM). O personagem vive no Konva (Canvas). O interact.js faz a ponte:

```js
// 1. Thumbnails no HTML sao draggable via interact.js
interact('.item-thumbnail').draggable({
  inertia: true,
  listeners: {
    start(event) {
      // Cria clone visual do thumbnail
      createDragClone(event.target);
    },
    move(event) {
      // Move clone seguindo dedo/mouse
      moveDragClone(event.dx, event.dy);
    },
    end(event) {
      // Verifica se soltou sobre o canvas do Konva
      const canvasRect = stage.container().getBoundingClientRect();
      const dropPoint = { x: event.clientX, y: event.clientY };

      if (isInsideRect(dropPoint, canvasRect)) {
        // SUCESSO: equipa item no personagem
        const itemId = event.target.dataset.itemId;
        equipItem(itemId);
        confetti({ particleCount: 30, spread: 50 }); // celebracao!
      } else {
        // FORA: snap back animado
        snapBackClone();
      }
      destroyDragClone();
    }
  }
});

// 2. Itens JA equipados no Konva sao clicaveis para remover
konvaImage.on('tap click', () => {
  unequipItem(slotId);
});
```

**Touch support nativo**: interact.js unifica mouse + touch automaticamente. Previne scroll durante drag. Suporte a inertia (arrasta e solta com velocidade).

### Feedback visual do drag

- **Ao iniciar drag**: Thumbnail cresce levemente (scale 1.1), sombra aparece
- **Durante drag**: Clone semi-transparente segue o dedo/mouse
- **Sobre drop zone**: Personagem ganha borda brilhante (glow dourado)
- **Ao soltar (sucesso)**: Flash de brilho + item aparece no personagem com animacao
- **Ao soltar (fora)**: Clone volta para posicao original com animacao suave
- **Item ja equipado**: Borda dourada no thumbnail do painel

### Interacao alternativa (clique)

Para criancas que tenham dificuldade com drag:
- **Clique simples** no thumbnail tambem equipa/desequipa o item
- Drag and drop e a interacao primaria, clique e fallback

---

## Telas do Jogo

### 1. Tela Inicial - "Minhas Criacoes"

Inspirada na imagem de referencia (secao 1):

```
┌─────────────────────────────────────────────┐
│  ✨ LAUREN FASHION ✨                       │
│     Crie, Vista e Brilhe!                   │
│                                             │
│  ┌─────────┐  MINHAS CRIACOES ⭐           │
│  │         │                                │
│  │  + NOVA │  ┌─────┐ ┌─────┐ ┌─────┐     │
│  │PERSONAGEM│  │ 👧  │ │ 👦  │ │ 👧  │     │
│  │         │  │Luna │ │ Sol │ │Star │     │
│  └─────────┘  │[V][E]│ │[V][E]│ │[V][E]│  │
│               └─────┘ └─────┘ └─────┘     │
│                                    ✨ ♥     │
└─────────────────────────────────────────────┘
```

- **Fundo**: Gradiente lilas com textura de madeira e luzinhas
- **Logo**: "Lauren Fashion" estilizado com estrelas
- **Botao "+ Nova Personagem"**: Grande, roxo, com brilho
- **Cards dos personagens**: Miniatura SVG + nome + data
- **Botoes por card**: Vestir (roxo) | Editar (lilas) | Apagar (vermelho, com confirmacao)
- **Vazio**: Mensagem fofa + animacao de convite

### 2. Tela de Criacao do Personagem

Inspirada na imagem de referencia (secao 2):

```
┌─────────────────────────────────────────────┐
│  ← Voltar        ROSTINHO          3/8      │
│                                             │
│  ┌───────────────┐  ┌─────────────────────┐│
│  │               │  │ FORMATO DO ROSTO    ││
│  │               │  │ (😀)(😊)(😐)(😃)   ││
│  │    PREVIEW    │  │                     ││
│  │   AO VIVO     │  │ OLHINHOS            ││
│  │     👧        │  │ (👁)(👁)(👁)(👁)    ││
│  │               │  │                     ││
│  │               │  │ COR DOS OLHOS       ││
│  │               │  │ 🟤🔵🟢⚫🟡⚪🟣🔴 ││
│  └───────────────┘  └─────────────────────┘│
│                                             │
│        [← VOLTAR]        [PROXIMO →]        │
└─────────────────────────────────────────────┘
```

- **Esquerda**: Preview ao vivo do personagem (atualiza a cada selecao)
- **Direita**: Opcoes do passo atual (geradas do JSON)
- **Navegacao**: Voltar / Proximo (etapas conforme `ui-config.json`)
- **Indicador de progresso**: Passo atual / total
- **Opcoes**: Thumbnails dos assets com borda de selecao (glow dourado)

### 3. Tela de Guarda-Roupa (Drag & Drop)

Inspirada na imagem de referencia (secao 3):

```
┌─────────────────────────────────────────────┐
│  ← Voltar     GUARDA-ROUPA     [Meus Looks] │
│                                             │
│ ┌──────┐ ┌─────────────────┐ ┌────────────┐│
│ │VESTID│ │                 │ │            ││
│ │BLUSAS│ │   👗 👕 👚 🎽  │ │            ││
│ │CALCAS│ │   👗 👕 👚 🎽  │ │    👧      ││
│ │SAPATO│ │   👗 👕 👚 🎽  │ │ PERSONAGEM ││
│ │CHAPEU│ │                 │ │  (DROP     ││
│ │OCULOS│ │  Arraste para   │ │   ZONE)    ││
│ │ACCESS│ │  vestir! →      │ │            ││
│ └──────┘ └─────────────────┘ └────────────┘│
│                                             │
│  [TIRAR TUDO]              [SALVAR LOOK ⭐] │
└─────────────────────────────────────────────┘
```

- **Esquerda**: Tabs de categorias (geradas do JSON)
- **Centro**: Grid de itens arrstaveis (thumbnails)
- **Direita**: Personagem grande (drop zone)
- **Abaixo**: Botoes "Tirar Tudo" e "Salvar Look"
- **Topo**: Botao "Meus Looks" abre galeria lateral

### Paleta de cores do item

Quando um item coloravel esta selecionado, aparece uma barra de cores acima do grid:

```
┌──────────────────────────────────┐
│ COR: 🔴🔵🟢🟡⚫⚪🟣🟠⚪🟤 │
└──────────────────────────────────┘
```

### 4. Galeria de Looks

Painel lateral que desliza da direita:

```
         ┌────────────┐
         │ MEUS LOOKS │
         │            │
         │ ┌──┐ ┌──┐ │
         │ │L1│ │L2│ │
         │ └──┘ └──┘ │
         │ ┌──┐ ┌──┐ │
         │ │L3│ │L4│ │
         │ └──┘ └──┘ │
         │            │
         │  [FECHAR]  │
         └────────────┘
```

- Miniaturas dos looks salvos
- Clicar carrega o look
- Botao X para apagar look

### 5. Tela "Personagem Pronto!" (pos-criacao)

Inspirada na imagem de referencia (secao 4):

```
┌─────────────────────────────────────────────┐
│            PERSONAGEM PRONTO! ✨             │
│                                             │
│         ┌───────────────┐                   │
│         │               │   Luna esta       │
│         │     👧        │   pronta para     │
│         │               │   novas           │
│         │               │   aventuras!      │
│         └───────────────┘                   │
│                                             │
│     [VOLTAR P/ GALERIA]   [VESTIR! →]       │
└─────────────────────────────────────────────┘
```

---

## Composicao Visual do Personagem (Konva.js - renderer.js)

O personagem e montado no **Konva.Stage** como arvore de camadas:

```
Konva.Stage (container HTML)
  └── Layer: character
        ├── Group: backHair     (zIndex 10)
        │     └── Konva.Image (cabelo traseiro)
        ├── Group: body         (zIndex 20)
        │     └── Konva.Image (corpo base)
        ├── Group: bottom       (zIndex 25)
        │     └── Konva.Image (calca/saia)
        ├── Group: top          (zIndex 30)
        │     └── Konva.Image (camiseta/blusa)
        ├── Group: shoes        (zIndex 35)
        │     └── Konva.Image (calcados)
        ├── Group: bodyAcc      (zIndex 40)
        │     └── Konva.Image (capa, asas, mochila)
        ├── Group: head         (zIndex 50)
        │     └── Konva.Image (formato do rosto)
        ├── Group: faceFeatures (zIndex 60-75)
        │     ├── Konva.Image (sobrancelhas)
        │     ├── Konva.Image (olhos)
        │     ├── Konva.Image (nariz)
        │     ├── Konva.Image (boca)
        │     └── Konva.Image (extras: sardas)
        ├── Group: facialHair   (zIndex 65)
        │     └── Konva.Image (barba)
        ├── Group: frontHair    (zIndex 80)
        │     └── Konva.Image (cabelo frontal)
        ├── Group: faceAcc      (zIndex 85)
        │     └── Konva.Image (oculos)
        └── Group: headAcc      (zIndex 90)
              └── Konva.Image (chapeu, coroa)
```

### Exemplo de codigo (renderer.js)

```js
// Criar stage
const stage = new Konva.Stage({
  container: 'character-canvas',
  width: 360,
  height: 640,
});

const layer = new Konva.Layer();
stage.add(layer);

// Adicionar item como imagem
async function addItemToCharacter(itemData, anchor, color) {
  const img = await loadImage(itemData.assets.main);

  // Se coloravel, aplicar cor via SVG replace
  if (color) {
    img.src = await colorizeAsset(itemData.assets.main, color);
  }

  const konvaImg = new Konva.Image({
    image: img,
    x: anchor.x + itemData.offset.x - itemData.size.width / 2,
    y: anchor.y + itemData.offset.y,
    width: itemData.size.width,
    height: itemData.size.height,
  });

  // Adicionar no grupo correto (por zIndex)
  getGroupByZIndex(itemData.zIndex).add(konvaImg);
  layer.batchDraw();
}
```

### Colorizacao de assets SVG

Assets coloraveis usam **`#FF00FF`** (magenta) como placeholder. Em runtime, o motor faz fetch + replace antes de renderizar no Konva:

```js
// Cache de SVGs ja carregados (evita fetch repetido)
const svgCache = new Map();

async function colorizeAsset(url, hexColor) {
  let svgText = svgCache.get(url);
  if (!svgText) {
    const response = await fetch(url);
    svgText = await response.text();
    svgCache.set(url, svgText);
  }
  const colored = svgText.replaceAll('#FF00FF', hexColor);
  const blob = new Blob([colored], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}
```

### Colorizacao de assets PNG (fallback)

Para PNGs, usa filtros HSL do Konva:

```js
konvaImage.cache();
konvaImage.filters([Konva.Filters.HSL]);
konvaImage.hue(120);         // Shift de matiz
konvaImage.saturation(0.5);  // Ajuste de saturacao
```

### Adaptacao ao corpo

Itens com `adaptToBody: true` tem seus `size` e `offset` recalculados proporcionalmente as `dimensions` do body-shape atual. Uma blusa feita para corpo normal e escalada ao ser usada num corpo gordo.

### Miniatura para galeria

O Konva permite exportar o stage como imagem para thumbnails:

```js
const dataURL = stage.toDataURL({ pixelRatio: 0.5 }); // thumbnail menor
```

---

## Modelo de Dados (localStorage)

```json
{
  "laurenFashion_characters": [
    {
      "id": "char_1713000000000",
      "name": "Luna",
      "createdAt": "2026-04-12T14:30:00.000Z",
      "body": {
        "shapeId": "child-female-normal",
        "skinColorId": "skin-3"
      },
      "parts": {
        "face-shape": { "itemId": "face-round" },
        "eyes": { "itemId": "eyes-round-big", "colorId": "green" },
        "eyebrows": { "itemId": "brows-thin-arch" },
        "nose": { "itemId": "nose-small" },
        "mouth": { "itemId": "mouth-smile" },
        "hair": { "itemId": "hair-curly-long", "colorId": "dark-brown" },
        "facial-hair": null,
        "extras": { "itemId": "extra-freckles" }
      },
      "outfit": {
        "top": { "itemId": "top-tshirt", "colorId": "purple" },
        "bottom": { "itemId": "bottom-skirt", "colorId": "pink" },
        "shoes": { "itemId": "shoes-sneakers", "colorId": "white" },
        "full-body": null,
        "head-acc": { "itemId": "acc-tiara" },
        "face-acc": null,
        "body-acc": null
      },
      "savedOutfits": [
        {
          "id": "outfit_1713000060000",
          "name": "Princesa",
          "savedAt": "2026-04-12T14:31:00.000Z",
          "outfit": { "...": "..." }
        }
      ]
    }
  ]
}
```

---

## Como Escalar (Exemplos Praticos)

### Adicionar novo cabelo
1. Criar SVGs: `assets/hair/front/space-buns.svg` + `assets/hair/back/space-buns.svg`
2. Criar thumbnail: `assets/hair/thumbnails/space-buns.png`
3. Adicionar entrada em `data/body-parts/hair.json` > `items[]`
4. Recarregar jogo. Pronto.

### Adicionar nova categoria de roupa (ex: "Pijamas")
1. Criar pasta: `assets/clothing/pajamas/` + SVGs
2. Criar `data/clothing/pajamas.json` seguindo o schema
3. Adicionar em `data/ui-config.json` > `wardrobeCategories`
4. Recarregar. Nova aba aparece automaticamente.

### Adicionar pack tematico (ex: "Pack Sereia")
1. Criar assets: cauda-sereia.svg, top-concha.svg, coroa-coral.svg, etc
2. Adicionar itens nos JSONs existentes com tag `"sereia-pack"`
3. Opcionalmente criar nova categoria `accessories/ocean.json`
4. Distribuir como .zip contendo assets + JSONs atualizados

### Adicionar novo tipo de customizacao (ex: "Maquiagem")
1. Criar assets: `assets/faces/makeup/*.svg`
2. Criar `data/body-parts/makeup.json`
3. Adicionar passo em `data/ui-config.json` > `creationSteps`
4. Recarregar. Novo passo aparece no fluxo de criacao.

### Trocar tema visual (ex: tema Natal)
1. Editar `data/ui-config.json` > `theme` (cores vermelhas/verdes)
2. Trocar `backgrounds` por cenarios natalinos
3. Trocar `decorations` por flocos de neve

### Adicionar suporte a cenarios/fundos
1. Criar `data/backgrounds.json` com lista de cenarios
2. Adicionar assets de fundo em `assets/backgrounds/`
3. Adicionar opcao na tela de guarda-roupa
4. (Requer pequena mudanca no wardrobe.js para nova secao)

---

## Convencoes de Assets

### SVGs coloraveis
- Usar **`#FF00FF`** (magenta) como cor placeholder nas areas coloraveis
- O motor substitui essa cor pela cor escolhida pelo jogador
- Areas que NAO mudam de cor usam cores fixas no SVG

### Thumbnails
- Formato: **PNG 120x120px** com fundo transparente
- Usados nos botoes de selecao e como drag source

### Assets principais
- Formato preferencial: **SVG** (escalavel, coloravel)
- Alternativa: **PNG** com fundo transparente (para assets muito complexos)
- Todos desenhados no viewport do body-shape (180x320 para crianca, 200x400 para adulto)

### Nomenclatura
```
assets/{tipo}/{subtipo}/{id-do-item}.svg
assets/{tipo}/thumbnails/{id-do-item}.png
```

---

## Etapas de Implementacao

### Fase 1 - Fundacao
- [ ] index.html (estrutura SPA, containers das telas)
- [ ] css/style.css (tema Lauren Fashion - roxo/lilas, layout, componentes)
- [ ] js/app.js (roteamento hash, inicializacao)
- [ ] js/config-loader.js (carrega JSONs via fetch)
- [ ] js/catalog.js (registro central)
- [ ] js/storage.js (CRUD localStorage)

### Fase 2 - Assets Base + Renderer
- [ ] Criar assets SVG dos corpos (12 variacoes)
- [ ] Criar assets SVG das partes do rosto
- [ ] Criar assets SVG dos cabelos (10 estilos x front/back)
- [ ] Criar todos os JSONs de body-parts
- [ ] Criar data/body-shapes.json
- [ ] Criar data/color-palettes.json
- [ ] js/renderer.js (composicao de camadas + colorizacao)

### Fase 3 - Tela de Criacao
- [ ] Criar data/ui-config.json
- [ ] js/character-creator.js (etapas dinamicas + preview ao vivo)
- [ ] Tela de revisao / "Personagem Pronto!"

### Fase 4 - Tela Inicial
- [ ] Galeria de personagens com miniaturas
- [ ] Card com botoes (vestir, editar, apagar)
- [ ] Estado vazio

### Fase 5 - Roupas + Guarda-Roupa
- [ ] Criar assets SVG de roupas (34 itens)
- [ ] Criar todos os JSONs de clothing + accessories
- [ ] js/drag-drop.js (drag & drop com touch support)
- [ ] js/wardrobe.js (UI dinamica, categorias, equip/desequip, cores)

### Fase 6 - Galeria de Looks
- [ ] Salvar look com nome
- [ ] Painel lateral de looks salvos
- [ ] Carregar/apagar looks

### Fase 7 - Polish Visual
- [ ] Assets de UI (fundo, logo, decoracoes, icones)
- [ ] Animacoes CSS (transicoes, glow, sparkle)
- [ ] Responsividade (tablet/celular)
- [ ] Testes finais

---

## Notas Importantes

- **Assets externos**: SVGs/PNGs em arquivos separados, referenciados por URL nos JSONs
- **Data-driven**: Todo conteudo vem dos JSONs + assets. Codigo e motor generico
- **Drag & Drop**: Interacao principal no guarda-roupa, com fallback de clique
- **Touch-first**: Pensado para tablet (toque), funciona com mouse tambem
- **Inclusividade**: Qualquer personagem pode usar qualquer item
- **Seguranca**: Zero dados saem do navegador
- **Offline**: Funciona sem internet apos carregamento inicial
- **Dependencias leves**: ~130 KB total (Konva, interact.js, Animate.css, canvas-confetti, Open Props, Google Fonts)
- **IDs estaveis**: Personagens salvos referenciam IDs. Asset atualizado = visual atualizado automaticamente
