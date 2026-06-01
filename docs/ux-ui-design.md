# Novelle — Diseño UX/UI

## Filosofía de Diseño

Novelle sigue una estética **minimalista premium** inspirada en:
- Wattpad (experiencia de lectura)
- Medium (tipografía y espaciado)
- Notion (limpieza y elegancia)
- Apps de lectura premium (inmersión)

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Blanco puro | `#FFFFFF` | Fondo principal (light) |
| Negro profundo | `#111111` | Texto principal, botones |
| Gris claro | `#F5F5F5` | Fondos secundarios |
| Gris suave | `#D9D9D9` | Bordes, separadores |
| Morado pastel | `#C4B5E0` | Acentos sutiles |
| Morado claro | `#E8DEF8` | Fondos de acento |

## Tipografía

| Fuente | Uso |
|--------|-----|
| **Montserrat** | Display, títulos grandes, logo |
| **Poppins** | Headings, labels, botones |
| **Inter** | Body text, lectura, UI general |

## Escala Tipográfica
- xs: 12px
- sm: 14px
- base: 16px
- md: 18px (lectura)
- lg: 20px
- xl: 24px
- 2xl: 32px
- 3xl: 40px

## Componentes

### Tarjetas
- Border radius: 20px
- Sombra suave en hover
- Efecto lift en interacción
- Aspecto 3:4 para covers

### Botones
- Primary: negro sólido, texto blanco
- Secondary: borde gris, transparente
- Ghost: sin borde, solo texto
- Loading state con spinner

### Inputs
- Floating labels
- Validación visual (verde/rojo)
- Password strength meter
- Focus ring sutil

### Navegación
- Navbar fija con glassmorphism
- Sidebar slide-out en mobile
- Links con underline animation

## Responsive Breakpoints
- Mobile: 375px
- Small: 480px
- Tablet: 768px
- Desktop: 1024px
- Large: 1280px
- XL: 1440px

## Animaciones
- Page transitions: fade + slide (300ms)
- Card hover: translateY(-3px) + shadow
- Stagger children: 60ms delay
- Scroll reveal: Intersection Observer
- Reduced motion: respetado
