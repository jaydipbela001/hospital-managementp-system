# HMS --- UI/UX, Branding and Global Design System

## 1. Visual direction

Create a modern, calm, trustworthy healthcare SaaS interface. It should
feel clean and professional rather than looking like a generic admin
template.

-   Primary style: light theme, spacious layouts, clear hierarchy,
    restrained color.
-   Backgrounds: very light cool grey; cards white; borders subtle.
-   Primary action: deep teal.
-   Secondary accent: blue.
-   Success: green; warning: amber; danger: red; informational: blue.
-   Avoid excessive gradients, glassmorphism, strong shadows, neon
    colors and decorative animation.
-   Use consistent 8px spacing rhythm, 10--14px card radius and clear
    typography.
-   Desktop admin layout: fixed/collapsible sidebar + top bar + content
    area.
-   Mobile: compact top bar and slide-in navigation; tables become cards
    or horizontally scrollable with clear labels.

## 2. Color palette

Define colors once in `src/styles/tokens.css`. Do not hardcode hex
colors inside component styles. Use semantic variables.

``` css
:root {
  /* Brand */
  --color-primary-900: #123B3A;
  --color-primary-800: #155452;
  --color-primary-700: #176B68;
  --color-primary-600: #16827D;
  --color-primary-100: #DDF3F0;
  --color-primary-50:  #F0FAF8;

  /* Secondary */
  --color-blue-700: #2457A6;
  --color-blue-100: #E8F0FE;

  /* Surfaces */
  --color-bg: #F5F8FA;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F0F4F6;
  --color-border: #DCE5E9;
  --color-border-strong: #B9C8CE;

  /* Text */
  --color-text: #172B2B;
  --color-text-muted: #617477;
  --color-text-subtle: #849497;
  --color-text-inverse: #FFFFFF;

  /* Status */
  --color-success: #16845B;
  --color-success-bg: #E7F6EF;
  --color-warning: #A96508;
  --color-warning-bg: #FFF4DB;
  --color-danger: #C23B43;
  --color-danger-bg: #FDECEE;
  --color-info: #2457A6;
  --color-info-bg: #EAF1FC;

  /* Focus and overlays */
  --color-focus: #4D9DE0;
  --color-overlay: rgb(12 30 32 / 48%);

  /* Typography */
  --font-family-base: Inter, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-heading: Inter, "Segoe UI", Roboto, Arial, sans-serif;

  /* Font sizes */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.375rem;
  --font-size-2xl: 1.75rem;
  --font-size-3xl: 2.125rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Shape and elevation */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 3px rgb(20 45 48 / 7%);
  --shadow-md: 0 8px 24px rgb(20 45 48 / 9%);

  /* Layout */
  --sidebar-width: 260px;
  --topbar-height: 68px;
  --content-max-width: 1600px;
}
```

The above palette is the default light theme. If dark mode is
implemented later, override the same semantic variables under
`[data-theme="dark"]`; do not create separate hardcoded component
colors.

## 3. Global CSS files

Recommended frontend structure:

``` text
src/
  styles/
    tokens.css          # all global colors, fonts, spacing, radius, shadows
    reset.css           # box sizing, body reset, base elements
    global.css          # typography, links, focus, common defaults
    utilities.css       # reusable layout helpers only
  components/
    common/
      Button/
      Input/
      Select/
      Modal/
      Badge/
      DataTable/
      EmptyState/
      Loader/
      ConfirmDialog/
      PageHeader/
      FormField/
  layouts/
    AppLayout/
    AuthLayout/
```

Import `tokens.css`, `reset.css` and `global.css` once from `main.jsx`.

## 4. Typography

Use **Inter** as the main typeface. Load it using a locally bundled font
or a reliable font provider; include system fallbacks. Use: - Page
title: 24--30px, weight 650--700. - Section title: 18--22px, weight
600. - Card title: 15--17px, weight 600. - Body: 14--16px, weight 400. -
Labels/table metadata: 12--14px, weight 500. - Line height: 1.45--1.6
for body copy.

Do not use too many font families or weights.

## 5. Component design rules

-   Buttons: primary, secondary, outline, ghost and danger variants;
    consistent height and disabled/loading states.
-   Forms: visible labels, helper text, inline validation and clear
    required-field indicators.
-   Tables: sticky header where useful, pagination, sorting, filters,
    empty state and responsive fallback.
-   Status badges: use semantic status colors and readable text; never
    rely on color alone.
-   Cards: white surface, subtle border and restrained shadow.
-   Modals: clear title, close control, action buttons and keyboard
    escape behavior.
-   Notifications: success/error/warning/info variants with accessible
    text.
-   Dashboard: meaningful KPI cards, small charts and recent activity;
    avoid chart clutter.
-   Destructive actions: confirmation dialog and server-side
    authorization.
-   Medical data: avoid displaying more sensitive information than the
    current role needs.

## 6. Responsive breakpoints

Use shared breakpoints in CSS: - Small mobile: up to 480px -
Mobile/tablet: 481px--768px - Laptop: 769px--1200px - Desktop: above
1200px

Example:

``` css
@media (max-width: 768px) {
  .app-sidebar { transform: translateX(-100%); }
  .app-content { padding: var(--space-4); }
}
```

Test at 360px, 390px, 768px, 1024px and 1440px. Avoid fixed widths that
cause horizontal overflow.

## 7. Animation rules (GSAP + Motion)

-   Use Motion for small component-level transitions (dialogs,
    dropdowns, page transitions).
-   Use GSAP only for deliberate timelines or complex sequences.
-   Do not animate every element. Keep animations subtle (roughly
    150--250ms for UI transitions).
-   Respect `prefers-reduced-motion`.
-   Avoid scroll-triggered animation on critical clinical workflows.
-   Clean up GSAP timelines and ScrollTriggers when components unmount.
-   Do not use both libraries to animate the same element.

## 8. Theme changes

To change the brand theme, edit semantic variables in `tokens.css` only.
Component styles must use variables such as `var(--color-primary-700)`,
`var(--color-bg)` and `var(--color-text)`. Do not use scattered raw hex
values.

## 9. UX acceptance checklist

-   All screens work on mobile and desktop.
-   Every form has validation and helpful error messages.
-   Every list has loading, empty and error states.
-   Keyboard focus is visible.
-   Contrast is readable.
-   Buttons show loading/disabled state when submitting.
-   No fake charts, fake counts or placeholder actions in a completed
    phase.
-   Animations do not block user interaction.
