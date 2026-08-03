# JURIS-FLOW — Sistema de Design & Identidade Visual

> Inspiração: sofisticação jurídica clássica com modernidade digital. Nada de clichê (martelo de justiça, cores ofuscantes, gradientes piegas).

---

## 1. Identidade Verbal

| Elemento | Decisão |
|---|---|
| **Nome** | **Juris-Flow** |
| **Tagline** | "Advogado no tempo. Cliente no centro." |
| **Tom** | Sóbrio, direto, inteligente. Confiança sem arrogância. |
| **Porteiro** | Você fala com advogado adulto, não com cliente. |
| **Evite** | "Vença na justiça", "conquiste", "ganhe" — Código de Ética OAB proíbe prometer resultado |
| **Use** | "organize", "controle", "antecipe", "decida com clareza", "transforme horas em minutos" |
| **Porte** | "IA que entende do Direito — não só de softwares" |

---

## 2. Logo

### Conceito
- Ícone: **fluxo contínuo que se dobra** (representando: linhas de código jurídicas, fluxo de processos, decisão)
- Tipografia: **Söhne** ou Inter (sans-serif geométrica) — jurídico sem ostentar

### Construção
```
Logo Lockup Horizontal:
[Ícone] [Juris] [Flow]
   ↘ ↘ ↘
linha 1
linha 2  (flow)
```

### Variações
- Primário: ícone + nome + tagline
- Compacto: só ícone + nome
- Wordmark: só nome
- Favicon: ícone 32px, apenas "JF"

### Cores do Logo
- Default: `bg-slate-50` com `text-slate-900` (light) ou `bg-slate-950` com `text-white` (dark)
- Brand color: grafite jurídico (não azul corporativo)

---

## 3. Paleta de Cores

### Design Tokens (Tailwind)

```ts
// tailwind.config.ts — extend.colors

const colors = {
  // === NEUTROS JURÍDICOS (sofisticados) ===
  ink: {
    50:  '#F7F7F8',
    100: '#EEEFF1',
    200: '#D6D8DC',
    300: '#B0B4BC',
    400: '#7A7F89',
    500: '#525762',
    600: '#363A42',
    700: '#252830',
    800: '#181B22',
    900: '#0E1014',
    950: '#070809',
  },

  // === PRIMÁRIA — "Vara" (azul-grafite, jurídico) ===
  vara: {
    50:  '#F0F4F9',
    100: '#DDE6F0',
    200: '#BFD0E2',
    300: '#94B0CC',
    400: '#6B8FB5',
    500: '#4D739E',
    600: '#3D5B82',
    700: '#334966',
    800: '#2E3F54',
    900: '#293547',
    950: '#1A2230',
  },

  // === ACENTO POSITIVO — "Procedência" ===
  procede: {
    50:  '#F0FBF1',
    100: '#D8F4DB',
    200: '#B2E8B8',
    300: '#7FD48A',
    400: '#4DBA5E',
    500: '#2F9F44',
    600: '#218037',
    700: '#1B6630',
    800: '#185029',
    900: '#154223',
  },

  // === ACENTO DE ALERTA — "Prazo Fatal" ===
  prazo: {
    50:  '#FFF8E6',
    100: '#FFEEB3',
    200: '#FFDC73',
    300: '#FFC638',
    400: '#FFAE0A',
    500: '#E88A00',
    600: '#C66A00',
    700: '#A04F00',
    800: '#7F4000',
    900: '#5F3000',
  },

  // === ERRO — "Improcedência" ===
  improcede: {
    50:  '#FEF2F2',
    100: '#FEE1E1',
    200: '#FFC6C6',
    300: '#FE9D9D',
    400: '#FB6565',
    500: '#E14040',
    600: '#C72A2A',
    700: '#A02020',
    800: '#841D1D',
    900: '#681A1A',
  },

  // === INFO ===
  ciente: {
    50:  '#F0F6FB',
    100: '#DAE9F4',
    200: '#B9D2E6',
    300: '#88B0D2',
    400: '#5B8DB9',
    500: '#3F70A0',
    600: '#335A82',
    700: '#2D4968',
    800: '#283D55',
    900: '#223244',
  },
}
```

### CSS Variables

```css
:root {
  --vf-surface-app: #070809;
  --vf-surface-canvas: #0E1014;
  --vf-surface-card: #181B22;
  --vf-surface-elevated: #252830;
  --vf-surface-border: #252830;
  --vf-surface-hover: #2E3138;

  --vf-ink-default: #EEEFF1;
  --vf-ink-muted: #B0B4BC;
  --vf-ink-subtle: #525762;
  --vf-ink-inverse: #0E1014;

  --vf-brand: #6B8FB5;
  --vf-brand-hover: #94B0CC;
  --vf-brand-foreground: #FFFFFF;

  --vf-success: #4DBA5E;
  --vf-warning: #FFAE0A;
  --vf-danger: #FB6565;
  --vf-info: #5B8DB9;

  --vf-radius-sm: 6px;
  --vf-radius-md: 10px;
  --vf-radius-lg: 14px;
  --vf-radius-xl: 20px;

  --vf-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --vf-shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --vf-shadow-lg: 0 12px 32px rgba(0,0,0,0.6);

  --vf-font-sans: 'Inter', 'Söhne', system-ui, sans-serif;
  --vf-font-serif: 'Source Serif Pro', 'PT Serif', serif;
  --vf-font-mono: 'JetBrains Mono', monospace;
}

[data-theme="light"] {
  --vf-surface-app: #FAFAF9;
  --vf-surface-canvas: #F4F4F2;
  --vf-surface-card: #FFFFFF;
  --vf-surface-elevated: #FFFFFF;
  --vf-surface-border: #E8E8E5;
  --vf-surface-hover: #F4F4F2;

  --vf-ink-default: #181B22;
  --vf-ink-muted: #525762;
  --vf-ink-subtle: #7A7F89;
  --vf-ink-inverse: #FFFFFF;
}
```

---

## 4. Tipografia

```css
/* Type Scale */
.t-display-2xl { font-size: 4.5rem; line-height: 1.05; letter-spacing: -0.04em; font-weight: 700; }
.t-display-xl  { font-size: 3.5rem; line-height: 1.1;  letter-spacing: -0.03em; font-weight: 700; }
.t-display-lg  { font-size: 2.75rem; line-height: 1.15; letter-spacing: -0.025em; font-weight: 600; }
.t-display-md  { font-size: 2.25rem; line-height: 1.2;  letter-spacing: -0.02em; font-weight: 600; }
.t-display-sm  { font-size: 1.875rem; line-height: 1.25; font-weight: 600; }

.t-heading-lg  { font-size: 1.5rem; line-height: 1.3; font-weight: 600; }
.t-heading-md  { font-size: 1.25rem; line-height: 1.35; font-weight: 600; }
.t-heading-sm  { font-size: 1.125rem; line-height: 1.4; font-weight: 600; }

.t-body-lg     { font-size: 1.125rem; line-height: 1.55; }
.t-body        { font-size: 1rem; line-height: 1.55; }
.t-body-sm     { font-size: 0.875rem; line-height: 1.5; }
.t-caption     { font-size: 0.8125rem; line-height: 1.4; letter-spacing: 0.01em; }
.t-overline    { font-size: 0.6875rem; line-height: 1; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
```

### Casos de Uso
- **Peças jurídicas** em modo leitura: `font-serif` (PT Serif) para o corpo — tradicional
- **UI**: `font-sans` (Inter)
- **Numbers/IDs** (CNJ, OAB): `font-mono`

---

## 5. Espaçamento, Raios e Sombras

```ts
// Raios
radius: {
  'xs': '4px',
  'sm': '6px',
  'md': '10px',
  'lg': '14px',
  'xl': '20px',
  '2xl': '28px',
  'full': '9999px',
}

// Spacing (8pt grid)
// Tailwind default é suficiente — múltiplos de 4px
```

### Sombras (dark mode)
```css
--vf-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.6);
--vf-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4);
--vf-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.6), 0 4px 6px -4px rgb(0 0 0 / 0.5);
--vf-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.7);
```

---

## 6. Componentes Core (shadcn/ui customizado)

### Button
```tsx
<Button variant="primary" size="md" leftIcon={<Plus />}>
  Novo Processo
</Button>

// variants: primary, secondary, ghost, danger, success, outline
// sizes: sm (h-8), md (h-10), lg (h-12), icon (h-10 w-10)
```

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Próximos Prazos</CardTitle>
    <CardDescription>5 processos com prazo fatal nos próximos 7 dias</CardDescription>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
  <CardFooter>
    <Button variant="ghost">Ver todos</Button>
  </CardFooter>
</Card>
```

### Badge
- Cores semânticas:
  - `Ativo` → vara.500
  - `Arquivado` → ink.500
  - `Suspenso` → prazo.500
  - `Sentenciado` → procede.500
  - `Em Recurso` → ciente.500
  - `Improcedente` → improcede.500
  - `Prazo Fatal` → prazo.500 + dot pulsante

### DataTable
- Header sticky, hover em row
- Filtros em chips acima
- Paginação no rodapé
- Ações em menu kebab
- Bulk select com checkbox

### Drawer (lateral direita)
- Padrão de "detalhe"
- 70% viewport em desktop, full no mobile
- Header fixo, footer fixo, conteúdo scroll

### Modal
- Para confirmações destrutivas
- Max-width `md` (560px) ou `lg` (720px)
- Foco gerenciado

### Toast
- Top-right
- auto-dismiss 4s
- variants: info, success, warning, danger

### Tabs
- Top-tabs com border-bottom ativo
- Variante pill para grupos pequenos

---

## 7. Padrões de UX

### States

| Estado | Padrão |
|---|---|
| **Loading (page)** | Skeleton com shimmer |
| **Loading (inline)** | Spinner (var(--vf-brand)) |
| **Empty** | Ilustração SVG + mensagem + CTA |
| **Error** | Banner vermelho + detalhes colapsáveis + retry |
| **Forbidden (403)** | Mensagem amigável + link para admin |
| **Not found (404)** | Ilustração + busca |

### Feedback Imediato
- Toda mutação: optimistic update
- Erro de IA: toast + manter draft + oferecer retry

### Densidade de Informação
- **Compact mode** (default para tabelas densas): h-8 rows
- **Cozy mode** (forms, detalhes): padding generoso
- **Spacious** (dashboards premium): cards respiram

### Acessibilidade (WCAG 2.2 AA)

```ts
// Contraste mínimo
const contrast = {
  inkDefaultOnInk950: 18.5, // AAA
  inkMutedOnInk950: 8.2,   // AAA
  brandOnInk950: 5.8,      // AA Large + UI
}

// Foco visível
*:focus-visible {
  outline: 2px solid var(--vf-brand);
  outline-offset: 2px;
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
  }
}
```

### Keyboard Shortcuts
- `Cmd/Ctrl + K` — command palette global
- `Cmd/Ctrl + N` — novo (case/client/lead/...)
- `Cmd/Ctrl + /` — toggle dark/light
- `g` + `i` — go to inbox (publicações)
- `g` + `p` — go to processos
- `g` + `c` — go to clientes
- `?` — shortcuts modal

---

## 8. Ilustrações & Ícones

### Biblioteca
- **Ícones:** Phosphor Icons (jurídico + clean)
  - Scales, Gavel, Document, Briefcase, Building
  - User, Users, Calendar, Bell, Search, Settings
- **Ilustrações:** unDraw (open source) customizadas em neutros
- **Empty states**: SVG inline minimalistas

### Avatar
- Avatares com iniciais em fundo `vara-700`
- Suporte a upload (R2)
- Fallback para OAB photo se vinculada

---

## 9. Animação & Motion

```ts
// Motion tokens
const durations = {
  fast: '120ms',
  normal: '200ms',
  slow: '320ms',
}

const easing = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',   // ease-out-expo
  in: 'cubic-bezier(0.7, 0, 0.84, 0)',    // ease-in-quart
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // ease-in-out-cubic
}
```

### Onde tem motion
- Sidebar collapse (transform + width)
- Drawer slide (transform)
- Toast slide-in
- Hover lift (translate-Y -2px)
- Loading pulse
- Streaming de texto na geração IA (suave)

### Onde NÃO tem motion
- Text rendering da peça (estático após completo)
- Tabelas densas (sem hover transform)
- Foco em formulário (sem animar)

---

## 10. Iconografia Custom para Domínio Jurídico

Phosphor Icons cobre 90%. Custom para o resto:

```svg
<!-- Juris-Flow Icon "flow" -->
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12h4l3 -9l4 18l3 -9h4" />
</svg>

<!-- Variação "lines" (linha do tempo processual) -->
<svg viewBox="0 0 24 24">
  <circle cx="6" cy="12" r="2" />
  <circle cx="18" cy="12" r="2" />
  <line x1="8" y1="12" x2="16" y2="12" />
</svg>
```

---

## 11. Marketing vs Product

### Marketing (LP, ads)
- Cores mais vibrantes
- Mais espaço em branco
- Hero com mockup da tela em mockup.js
- Tipografia maior
- Animações mais expressivas

### Product (app)
- Densidade alta
- Cores sóbrias
- Tipografia funcional
- Animações sutis
- Priorizar performance

---

## 12. Stack de Implementação

```bash
# shadcn/ui — instalar
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input badge table dialog drawer select popover calendar command tooltip sonner dropdown-menu separator avatar sheet tabs toast

# Tailwind 4 (Vite plugin)
npm install tailwindcss@next @tailwindcss/vite

# Fontes
npm install @fontsource-variable/inter @fontsource/pt-serif

# Animações
npm install framer-motion

# Ícones
npm install @phosphor-icons/react

# Datas
npm install date-fns  # ótimo pra i18n PT-BR
```

---

## 13. Tema Dark (default)

```tsx
// app/layout.tsx
<html lang="pt-BR" data-theme="dark" className="bg-ink-950">
```

**Decisão:** dark mode default porque reduz fadiga visual em advogados que ficam até tarde lendo peças. Toggle com `Cmd+J`.

---

## 14. Documentação de Design

Documentação interna: Storybook rodando em `/_dev/storybook`.

Cada componente tem:
- Variantes (visual)
- States (loading, error, empty, disabled)
- A11y annotations
- Exemplos de uso
- Do/Don't
