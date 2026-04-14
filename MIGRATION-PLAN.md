# Plano de Migração: Vite + Componentes Alpine.js

> Objetivo: reorganizar o projeto em componentes co-locados (HTML + JS + CSS por pasta)
> usando Vite como bundler, sem trocar de framework.

---

## 1. Visão Geral

### Antes (hoje)

```
person-game/
  index.html              ← 848 linhas, tudo inline
  css/
    tokens.css
    style.css
  js/
    services/             ← 5 arquivos (globals via IIFE)
    stores/               ← 3 arquivos (Alpine.store)
    components/
      screens/            ← 5 arquivos (Alpine.data)
      widgets/            ← 10 arquivos (Alpine.data)
    main.js
  sw.js
  server.js               ← dev server custom (Node http)
```

- Sem build step — 27 `<script>` tags carregados via CDN + caminhos relativos
- Ordem de carregamento importa (services > stores > widgets > screens > main > Alpine)
- Services são globals (`Storage`, `Catalog`, `Renderer`, `ConfigLoader`, `SvgUtils`)
- Estilos em 2 arquivos CSS monolíticos

### Depois

```
person-game/
  src/
    index.html                          ← shell (~60 linhas) com <!-- @include -->
    main.js                             ← entry point, importa tudo
    styles/
      tokens.css
      global.css                        ← estilos globais e boot-loader
    services/
      storage.js                        ← export default (ES module)
      catalog.js
      renderer.js
      config-loader.js
      svg-utils.js
    stores/
      app-store.js                      ← import Alpine
      character-store.js
      install-store.js
    components/
      screens/
        home/
          home.html                     ← fragmento de template
          home.js                       ← Alpine.data + import CSS
          home.css
        creator/
          creator.html
          creator.js
          creator.css
        studio/
          studio.html
          studio.js
          studio.css
        done/
          done.html
          done.js
          done.css
        fullscreen/
          fullscreen.html
          fullscreen.js
          fullscreen.css
      widgets/
        character-preview/
          character-preview.html
          character-preview.js
          character-preview.css
        item-grid/
        color-bar/
        color-picker/
        category-tabs/
        focus-zoom/
        mobile-panel/
        modal/
        step-dots/
        scroll-row/
  public/
    assets/                             ← SVGs e PNGs (servidos estáticos)
    data/                               ← JSONs de configuração
    favicon.ico
    manifest.json
    icons/
  sw.js
  vite.config.js
  package.json
  server.js                             ← mantido para API do admin
```

---

## 2. Arquitetura dos Componentes

### 2.1 Plugin Vite para @include (build-time)

O template de cada componente vive em `.html` separado. Um plugin Vite de ~15 linhas
substitui `<!-- @include path -->` pelo conteúdo do arquivo no build. Zero custo no runtime.

```js
// vite-plugin-html-include.js
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'

export default function htmlInclude() {
  return {
    name: 'vite-plugin-html-include',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const baseDir = dirname(ctx.filename)
        return html.replace(
          /<!--\s*@include\s+(.+?)\s*-->/g,
          (_, filePath) => {
            const full = resolve(baseDir, filePath.trim())
            return readFileSync(full, 'utf-8')
          }
        )
      },
    },
  }
}
```

### 2.2 Shell HTML (src/index.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, ...">
  <title>Lauren Fashion</title>
  <link rel="manifest" href="/manifest.json">
  <!-- fonts, icons, meta tags -->
</head>
<body x-data>

  <!-- Boot loader (inline, critical CSS) -->
  <!-- @include components/boot-loader/boot-loader.html -->

  <main>
    <!-- @include components/screens/home/home.html -->
    <!-- @include components/screens/creator/creator.html -->
    <!-- @include components/screens/studio/studio.html -->
    <!-- @include components/screens/done/done.html -->
    <!-- @include components/screens/fullscreen/fullscreen.html -->
  </main>

  <!-- @include components/widgets/modal/modal.html -->

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 2.3 Componente Exemplo: Home Screen

**src/components/screens/home/home.html**
```html
<!-- HOME SCREEN - Gallery de personagens salvos -->
<section x-show="$store.app.screen === 'home'"
         x-data="homeScreen"
         class="screen home-screen">
  <!-- ... mesmo HTML que hoje está inline no index.html -->
</section>
```

**src/components/screens/home/home.js**
```js
import './home.css'
import { Storage } from '../../services/storage.js'
import { Renderer } from '../../services/renderer.js'

export default function (Alpine) {
  Alpine.data('homeScreen', () => ({
    characters: [],
    thumbnails: {},
    _fingerprints: {},

    init() {
      this.load()
      this.$watch('$store.app.screen', (screen) => {
        if (screen === 'home') this.load()
      })
    },

    load() {
      this.characters = Storage.getCharacters()
      this.characters.forEach(char => {
        const fp = JSON.stringify({ b: char.body, p: char.parts, o: char.outfit })
        if (!this.thumbnails[char.id] || this._fingerprints[char.id] !== fp) {
          this._fingerprints[char.id] = fp
          const charId = char.id
          Renderer.renderToDataURL(char, 130).then(url => {
            if (url) this.thumbnails = { ...this.thumbnails, [charId]: url }
          })
        }
      })
    },

    // ...
  }))
}
```

**src/components/screens/home/home.css**
```css
.home-screen .home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}
/* ... estilos que hoje estão no style.css referentes à home */
```

### 2.4 Entry Point (src/main.js)

```js
import Alpine from 'alpinejs'

// -- Styles --
import './styles/tailwind.css'   // Tailwind v4 + @theme customizations
import './styles/tokens.css'
import './styles/global.css'

// -- Services (order matters: Catalog depends on nothing, Renderer depends on Catalog) --
import { Storage } from './services/storage.js'
import { Catalog } from './services/catalog.js'
import { SvgUtils } from './services/svg-utils.js'
import { ConfigLoader } from './services/config-loader.js'
import { Renderer } from './services/renderer.js'

// -- Stores --
import appStore from './stores/app-store.js'
import characterStore from './stores/character-store.js'
import installStore from './stores/install-store.js'

// -- Widgets --
import characterPreview from './components/widgets/character-preview/character-preview.js'
import itemGrid from './components/widgets/item-grid/item-grid.js'
import colorBar from './components/widgets/color-bar/color-bar.js'
import colorPicker from './components/widgets/color-picker/color-picker.js'
import categoryTabs from './components/widgets/category-tabs/category-tabs.js'
import focusZoom from './components/widgets/focus-zoom/focus-zoom.js'
import mobilePanel from './components/widgets/mobile-panel/mobile-panel.js'
import modal from './components/widgets/modal/modal.js'
import stepDots from './components/widgets/step-dots/step-dots.js'
import scrollRow from './components/widgets/scroll-row/scroll-row.js'

// -- Screens --
import homeScreen from './components/screens/home/home.js'
import creatorScreen from './components/screens/creator/creator.js'
import studioScreen from './components/screens/studio/studio.js'
import doneScreen from './components/screens/done/done.js'
import fullscreenView from './components/screens/fullscreen/fullscreen.js'

// -- Register stores --
appStore(Alpine)
characterStore(Alpine)
installStore(Alpine)

// -- Register components --
characterPreview(Alpine)
itemGrid(Alpine)
colorBar(Alpine)
colorPicker(Alpine)
categoryTabs(Alpine)
focusZoom(Alpine)
mobilePanel(Alpine)
modal(Alpine)
stepDots(Alpine)
scrollRow(Alpine)

homeScreen(Alpine)
creatorScreen(Alpine)
studioScreen(Alpine)
doneScreen(Alpine)
fullscreenView(Alpine)

// -- Expose services globally for stores/components that need them --
// (interim: gradualmente migrar para imports diretos)
window.__services = { Storage, Catalog, Renderer, ConfigLoader, SvgUtils }

// -- Boot --
Alpine.start()
```

### 2.5 Props (já funciona)

Alpine.data já suporta parâmetros. Uso no template:

```html
<div x-data="characterPreview({ scale: 0.5, paddingPx: 16 })"></div>
<div x-data="characterPreview({ scale: 'fit' })"></div>
<div x-data="itemGrid({ category: 'hair-front', mode: 'thumbnail' })"></div>
```

Definição no JS:
```js
Alpine.data('characterPreview', ({ scale = 'fit', paddingPx = 8 } = {}) => ({
  // scale e paddingPx vêm como props do template
}))
```

---

## 3. Conversão dos Services para ES Modules

Hoje cada service é um IIFE que expõe um global:

```js
// ANTES: js/services/storage.js
const Storage = (() => {
  function getCharacters() { /* ... */ }
  return { getCharacters }
})()
```

Conversão:

```js
// DEPOIS: src/services/storage.js
const KEY = 'laurenFashion_characters'

function _getAll() { /* ... */ }
function _saveAll(characters) { /* ... */ }

export function getCharacters() { return _getAll() }
export function getCharacter(id) { /* ... */ }
export function saveCharacter(data) { /* ... */ }
// ...

// Named export para manter a API { Storage.getCharacter(...) }
export const Storage = { getCharacters, getCharacter, saveCharacter, /* ... */ }
```

### Dependências entre services

```
SvgUtils       ← sem dependências
Storage        ← sem dependências
Catalog        ← sem dependências (recebe dados do ConfigLoader)
ConfigLoader   ← importa Catalog (para registrar dados)
Renderer       ← importa Catalog, SvgUtils, Konva (externo)
```

Konva continua como dependência externa. Duas opções:

- **Opção A** (mais simples): manter CDN, declarar como `external` no Vite config
- **Opção B** (mais limpo): `npm install konva`, importar como ES module

Recomendação: **Opção B** — elimina CDN e permite tree-shaking.

```js
// vite.config.js (se opção A)
export default {
  build: {
    rollupOptions: {
      external: ['konva'],
      output: { globals: { konva: 'Konva' } }
    }
  }
}
```

---

## 4. Conversão dos Stores

Hoje:
```js
document.addEventListener('alpine:init', () => {
  Alpine.store('app', { /* ... */ })
})
```

Depois:
```js
// src/stores/app-store.js
export default function (Alpine) {
  Alpine.store('app', {
    ready: false,
    screen: 'loading',
    // ... (mesma lógica)
  })
}
```

O `document.addEventListener('alpine:init', ...)` some — o registro acontece
em `main.js` antes do `Alpine.start()`.

---

## 5. Configuração Vite + Tailwind

### Tailwind CSS 4 (via Vite)

Tailwind v4 usa `@tailwindcss/vite` como plugin — sem `tailwind.config.js` separado.
A configuração é feita direto no CSS com `@theme`.

**src/styles/tailwind.css**
```css
@import "tailwindcss";

/* Theme customizations (equivalente ao tailwind.config inline atual) */
@theme {
  --color-primary: #9B59B6;
  --color-primary-light: #C39BD3;
  --color-primary-dark: #7D3C98;
  --color-secondary: #E8A0BF;
  --color-accent: #F39C12;
  --color-accent-glow: #FFD700;
  --color-lauren-bg: #F5E6FF;
  --color-lauren-card: #FFF0F5;
  --color-lauren-pink: #E91E90;

  --font-display: 'Fredoka', sans-serif;
  --font-body: 'Nunito', sans-serif;
  --font-logo: 'Pacifico', cursive;

  --radius-xl2: 16px;
  --radius-xl3: 20px;
}
```

### vite.config.js

```js
// vite.config.js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import htmlInclude from './vite-plugin-html-include.js'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [
    tailwindcss(),
    htmlInclude(),
  ],
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls para o server.js existente (admin tool)
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
```

### package.json atualizado

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "api": "node server.js",
    "admin": "node scripts/open-admin.mjs"
  },
  "dependencies": {
    "alpinejs": "^3.14.0",
    "konva": "^9.3.0",
    "canvas-confetti": "^1.9.3"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

---

## 6. Service Worker

O sw.js precisa de ajustes porque o Vite gera filenames com hash:

```
dist/
  index.html
  assets/
    main-abc123.js      ← hash no nome
    style-def456.css
```

**Estratégia**: Usar `vite-plugin-pwa` (workbox) OU manter o sw.js manual mas
com a lista de assets gerada pelo build.

Recomendação: manter o sw.js manual para simplicidade. No build script,
gerar um `sw-manifest.json` com a lista de arquivos para precache.

---

## 7. Migração do CSS

### O que extrair por componente

Percorrer o `css/style.css` (1028 linhas) e mover seletores para o CSS
do componente correspondente. Regra: se o seletor só se aplica dentro de
um componente, move. Se é global (body, reset, utilitários), fica em
`styles/global.css`.

| Destino | Tipo de regra |
|---------|---------------|
| `styles/tokens.css` | Custom properties, cores, fontes |
| `styles/global.css` | Reset, body, scrollbar, utilities, animações |
| `home/home.css` | `.home-grid`, `.home-card`, etc. |
| `studio/studio.css` | `.studio-*`, `.panel-*` |
| `creator/creator.css` | `.creator-*`, `.step-*` |
| `fullscreen/fullscreen.css` | `.fullscreen-*`, `.look-grid` |
| `character-preview/character-preview.css` | `.char-preview-*` |
| `focus-zoom/focus-zoom.css` | `.focus-zoom-*` |

O Tailwind migra de CDN para `@tailwindcss/vite` (v4). A configuração inline
(`tailwind.config = { ... }`) do `index.html` vira `@theme` no `src/styles/tailwind.css`.
O Vite faz tree-shaking automaticamente — só as classes usadas entram no build.

---

## 8. Checklist de Execução

### Fase 1: Setup (2h)

- [ ] `npm install alpinejs konva canvas-confetti`
- [ ] `npm install -D vite tailwindcss @tailwindcss/vite`
- [ ] Criar `vite.config.js` (com plugins `tailwindcss()` e `htmlInclude()`)
- [ ] Criar `vite-plugin-html-include.js`
- [ ] Criar estrutura de pastas `src/`
- [ ] Criar `src/styles/tailwind.css` com `@import "tailwindcss"` + `@theme` (migrar config inline do index.html)
- [ ] Mover `assets/` e `data/` para `public/`
- [ ] Criar `src/index.html` shell mínimo (sem conteúdo dos componentes, sem CDN do Tailwind)
- [ ] Criar `src/main.js` com `import './styles/tailwind.css'; import Alpine; Alpine.start()`
- [ ] Verificar que `npm run dev` abre uma página com Tailwind funcionando (testar uma classe como `bg-primary`)

### Fase 2: Services (2h)

- [ ] Converter `Storage` para ES module (export named + default)
- [ ] Converter `SvgUtils` para ES module
- [ ] Converter `Catalog` para ES module
- [ ] Converter `ConfigLoader` para ES module (importa Catalog)
- [ ] Converter `Renderer` para ES module (importa Catalog, SvgUtils, Konva)
- [ ] Verificar que todos os services importam corretamente em `main.js`

### Fase 3: Stores (1h)

- [ ] Converter `app-store.js` — remover `alpine:init` listener, exportar função
- [ ] Converter `character-store.js` — idem, importar Storage/Catalog
- [ ] Converter `install-store.js` — idem
- [ ] Registrar os 3 stores em `main.js`

### Fase 4: Widgets (3h)

Para cada widget (10 total):
- [ ] Criar pasta `src/components/widgets/{nome}/`
- [ ] Extrair HTML do `index.html` → `{nome}.html`
- [ ] Converter JS para ES module com `export default function(Alpine)`
- [ ] Extrair CSS relevante do `style.css` → `{nome}.css`
- [ ] Adicionar `<!-- @include -->` no shell `index.html`
- [ ] Importar e registrar em `main.js`

Ordem sugerida (menos dependências primeiro):
1. step-dots
2. scroll-row
3. modal
4. color-picker
5. color-bar
6. mobile-panel
7. category-tabs
8. character-preview (depende de Renderer)
9. item-grid (depende de Catalog)
10. focus-zoom

### Fase 5: Screens (3h)

Para cada screen (5 total):
- [ ] Criar pasta `src/components/screens/{nome}/`
- [ ] Extrair HTML do `index.html` → `{nome}.html`
- [ ] Converter JS para ES module
- [ ] Extrair CSS → `{nome}.css`
- [ ] Adicionar `<!-- @include -->` no shell
- [ ] Importar e registrar em `main.js`

Ordem sugerida:
1. done (mais simples, 21 linhas)
2. home
3. fullscreen
4. creator
5. studio (mais complexo, 226 linhas)

### Fase 6: CSS global (2h)

- [ ] Criar `src/styles/tokens.css` (mover de `css/tokens.css`)
- [ ] Criar `src/styles/global.css` com o que sobrou do `style.css`
- [ ] Remover regras duplicadas (já movidas para componentes)
- [ ] Verificar que `tailwind.css` (criado na Fase 1) tem todas as custom colors/fonts do config inline
- [ ] Remover referência ao CDN do Tailwind (`cdn.tailwindcss.com`) do HTML
- [ ] Testar que classes Tailwind customizadas (`bg-primary`, `font-display`, etc.) funcionam via Vite

### Fase 7: Service Worker + Build (2h)

- [ ] Ajustar `sw.js` para funcionar com output do Vite (hashed filenames)
- [ ] Mover `sw.js` para `public/` (servido estático)
- [ ] Testar `npm run build` + `npm run preview`
- [ ] Verificar que o SW precacheia os assets corretamente
- [ ] Ajustar GitHub Actions se necessário (build step antes do deploy)

### Fase 8: Cleanup + Teste (2h)

- [ ] Remover pasta `js/` antiga
- [ ] Remover pasta `css/` antiga
- [ ] Remover `index.html` antigo (root)
- [ ] Testar no mobile (iOS Safari, Chrome Android)
- [ ] Testar criar personagem completo (wizard → studio → home)
- [ ] Testar "Novo Look", editar look, apagar look
- [ ] Testar offline (SW cache)
- [ ] Testar admin.html (se ainda necessário, manter separado ou migrar depois)

---

## 9. Inventário Atual de Referência

### Script tags no index.html (ordem de carregamento)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `js/services/storage.js` | Service (global `Storage`) |
| 2 | `js/services/catalog.js` | Service (global `Catalog`) |
| 3 | `js/services/svg-utils.js` | Service (global `SvgUtils`) |
| 4 | `js/services/config-loader.js` | Service (global `ConfigLoader`) |
| 5 | `js/services/renderer.js` | Service (global `Renderer`) |
| 6 | `js/stores/app-store.js` | Store `app` |
| 7 | `js/stores/character-store.js` | Store `character` |
| 8 | `js/stores/install-store.js` | Store `install` |
| 9 | `js/components/widgets/modal.js` | Widget `modal` |
| 10 | `js/components/widgets/color-picker.js` | Widget `colorPicker` |
| 11 | `js/components/widgets/item-grid.js` | Widget `itemGrid` |
| 12 | `js/components/widgets/category-tabs.js` | Widget `categoryTabs` |
| 13 | `js/components/widgets/character-preview.js` | Widget `characterPreview` |
| 14 | `js/components/widgets/mobile-panel.js` | Widget `mobilePanel` |
| 15 | `js/components/widgets/step-dots.js` | Widget `stepDots` |
| 16 | `js/components/widgets/scroll-row.js` | Widget `scrollRow` |
| 17 | `js/components/widgets/color-bar.js` | Widget `colorBar` |
| 18 | `js/components/widgets/focus-zoom.js` | Widget `focusZoom` |
| 19 | `js/components/screens/home.js` | Screen `homeScreen` |
| 20 | `js/components/screens/creator.js` | Screen `creatorScreen` |
| 21 | `js/components/screens/studio.js` | Screen `studioScreen` |
| 22 | `js/components/screens/done.js` | Screen `doneScreen` |
| 23 | `js/components/screens/fullscreen.js` | Screen `fullscreenView` |
| 24 | `js/main.js` | Bootstrap |

### CDN dependencies

| Lib | URL | Substituir por npm? |
|-----|-----|---------------------|
| Alpine.js 3 | `cdn.jsdelivr.net/npm/alpinejs@3` | Sim (`alpinejs`) |
| Konva 9 | `unpkg.com/konva@9` | Sim (`konva`) |
| canvas-confetti | `cdn.jsdelivr.net/npm/canvas-confetti@1.9.3` | Sim (`canvas-confetti`) |
| Tailwind CSS 3→4 | `cdn.tailwindcss.com` | Sim (`tailwindcss` + `@tailwindcss/vite`, devDep) |
| Animate.css | `cdnjs.cloudflare.com/ajax/libs/animate.css` | Opcional (pouco usado) |
| Google Fonts | `fonts.googleapis.com` | Manter CDN |

### Alpine.data registrations

| Nome | Arquivo atual | Linhas |
|------|---------------|--------|
| `homeScreen` | screens/home.js | 53 |
| `creatorScreen` | screens/creator.js | 86 |
| `studioScreen` | screens/studio.js | 226 |
| `doneScreen` | screens/done.js | 21 |
| `fullscreenView` | screens/fullscreen.js | 115 |
| `characterPreview` | widgets/character-preview.js | 89 |
| `itemGrid` | widgets/item-grid.js | 126 |
| `focusZoom` | widgets/focus-zoom.js | 140 |
| `categoryTabs` | widgets/category-tabs.js | 47 |
| `colorBar` | widgets/color-bar.js | 59 |
| `colorPicker` | widgets/color-picker.js | 40 |
| `mobilePanel` | widgets/mobile-panel.js | 47 |
| `modal` | widgets/modal.js | 30 |
| `stepDots` | widgets/step-dots.js | 17 |
| `scrollRow` | widgets/scroll-row.js | 21 |

### Alpine.store registrations

| Nome | Arquivo atual | Linhas |
|------|---------------|--------|
| `app` | stores/app-store.js | 93 |
| `character` | stores/character-store.js | 383 |
| `install` | stores/install-store.js | 33 |
