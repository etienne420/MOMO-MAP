# MoMo-MAP Design Guidelines

This document outlines the core design principles, typography, colors, component styling, and layout guidelines for MoMo-MAP, an interactive 2D wayfinding application for Collège Montmorency.

The overarching design philosophy is a calm, map-first interface characterized by soft floating surfaces, high-contrast interactive controls, and vibrant, color-coded amenity icons. It prioritizes navigation clarity over dense information reading.

## 1. Core Design Principles

### 1.1 The Map is the Main Content

The interface exists to help users orient themselves within Collège Montmorency, find destinations, and understand routes. The hierarchy of visual importance is:

1.  **Current Location:** Where the user is right now.
2.  **Destination:** Where the user wants to go.
3.  **Active Route:** The path connecting the two.
4.  **Route Inputs:** The search fields.
5.  **Relevant Amenities:** Key locations along the way or nearby.
6.  **Map Utilities:** Controls for zooming, centering, and layers.

Floating UI controls must support the map, never compete with it.

### 1.2 Neutral Interface, Meaningful Color

The majority of the UI surfaces, text, and utility controls should use neutral tones (whites, blacks, and grays). Reserve saturated colors strictly for:

*   Amenity categories (e.g., Cafeteria, Washrooms).
*   Current location indicators.
*   Navigation routes.
*   Critical status messages (e.g., errors or warnings).
*   Selected/focused states requiring emphasis.

### 1.3 Soft Surfaces, Crisp Information

Panels and cards should appear as translucent layers softly hovering over the map. However, the information upon them must remain absolutely clear.

*   **Rule:** Text and critical icons must be fully opaque (100% opacity).
*   **Rule:** Apply translucency only to the background surface of the panel, not the entire component.
*   **Rule:** Avoid reducing contrast so much that the interface becomes difficult to read over busy map areas.

### 1.4 Spatial Consistency

Users should develop muscle memory for the interface.

*   Map tools must remain in predictable locations.
*   The order of amenity categories should remain constant.
*   Route input fields should be grouped logically.
*   Avoid shifting the position of main controls when a route is selected or when state changes occur.

## 2. Color System

### 2.1 Foundation Colors (The UI Chrome)

These colors form the base of the floating panels and text.

| Token | CSS Variable (Example) | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | `--color-bg-base` | `#FFFFFF` | Base application surface (if map is not present) |
| **Primary Foreground** | `--color-text-main` | `#09090B` | Main text, utility icons, high emphasis |
| **Muted Foreground** | `--color-text-muted` | `#71717A` | Secondary text, supporting labels |
| **Subtle Border** | `--color-border-soft` | `#E4E4E7` | Dividers between list items |
| **Floating Surface** | `--color-surface-float` | `rgba(255, 255, 255, 0.8)` | Main panels, cards, route inputs |
| **Solid Surface** | `--color-surface-solid` | `#FFFFFF` | Elements needing guaranteed contrast over complex map geometry |

*   **Note:** Main panels should be visually borderless by default. Introduce the `--color-border-soft` only if the translucent panel blends too much with the underlying map.

### 2.2 Map Colors

The map itself should be subdued to allow routes and markers to stand out.

| Element | Suggested Value | Purpose |
| :--- | :--- | :--- |
| **Map Geometry** | `rgba(29, 131, 73, 0.15)` | Quiet environmental context (walls, non-routable areas) |
| **Active Route** | `rgba(38, 116, 55, 0.9)` | The primary navigation path |
| **Current Location** | `#4B7BD5` | The user's exact position |
| **Location Casing** | `#FFFFFF` | A white stroke to separate the location marker from the map |
| **Destination Marker** | `rgba(9, 9, 11, 0.9)` | High-contrast marker for the endpoint |

*   **Rule:** The active route must be significantly more saturated and opaque than the base map geometry.
*   **Rule:** If the route crosses complex geometry, apply a white or neutral casing (stroke) behind the route line to ensure readability.

### 2.3 Amenity Category Colors

These colors are critical for quick visual scanning and must remain consistent across lists, map markers, and filters.

| Category | Background Color | Icon Color | Notes |
| :--- | :--- | :--- | :--- |
| **Washrooms** | `#2563EB` (Blue) | White | Label spelling corrected |
| **CCTI** | `#7C3AED` (Violet) | White | Ensure the icon glyph differentiates it from Subway |
| **Elevators** | `#047857` (Green) | White | Label capitalized consistently |
| **SAA** | `#B45309` (Amber) | White | |
| **Cafeteria** | `#EF4444` (Red) | White | Do not use this red for error states without clear error icons/text |
| **Subway** | `#8B5CF6` (Purple) | White/Yellow | Ensure visual separation from CCTI |

## 3. Typography

MoMo-MAP utilizes a modern sans-serif stack, prioritizing Geist for a refined, technical feel appropriate for a college navigation tool.

### 3.1 Typeface Details

*   **Primary Typeface:** Geist (or a similar clean, modern sans-serif like Inter).
*   **Fallback Stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

### 3.2 Typographic Hierarchy

| Role | Size | Weight | Line Height | Tracking (Letter Spacing) |
| :--- | :--- | :--- | :--- | :--- |
| **Panel Heading** | `20px` | `600` (Semi-bold) | `26-28px` | `-0.4px` (Slightly tight) |
| **Place Name (Markers)** | `18px` | `600` (Semi-bold) | `24px` | Normal |
| **Route Input Text** | `16-18px` | `400-500` | `24px` | Normal |
| **Amenity Label** | `16-18px` | `400-500` | `22-24px` | Normal |
| **Supporting Text** | `14px` | `400` (Regular) | `20px` | Normal |
| **Metadata / Small Labels**| `12-13px` | `400-500` | `16-18px` | Normal |

### 3.3 Monospace Usage

Use a monospace font (like Geist Mono) specifically for data where vertical alignment or technical precision is helpful:

*   Room Numbers (e.g., `E-305`)
*   Floor Codes (e.g., `Niv 3`)
*   Coordinate Data (if exposed for debugging)

### 3.4 Language and Localization

Collège Montmorency is a French-language institution. Ensure all hardcoded labels, amenity names, and directions are grammatically correct in French.

## 4. Spacing and Geometry System

### 4.1 Spacing Scale

Use a strict 4px baseline grid for all padding and margins to ensure rhythm and predictability.

*   `4px`: Micro adjustments.
*   `8px`: Space between an icon and its text label.
*   `12px`: Padding inside small controls (like utility buttons).
*   `16px`: Standard gap between list items or input fields.
*   `24px`: Internal padding for main floating panels.
*   `32px`: Spacious padding for major sections.
*   `48px`: Gap between distinct UI regions (e.g., Route Panel and Amenity Panel).

### 4.2 Shape and Corner Radius (Border-Radius)

Shape communicates the role of a component. Do not use the same radius for everything.

*   **Large Panels (Route, Amenities):** `24px` - `32px` (Soft, rounded rectangles).
*   **Input Fields & Amenity Rows:** `12px` - `16px`.
*   **Amenity Icon Tiles:** `8px` (Small rounded squares).
*   **Utility Buttons (Zoom, Center):** Fully rounded (`50%` or `9999px`) to create circular targets.

### 4.3 Surfaces, Transparency, and Elevation

Elevation is communicated through subtle, neutral shadows.

*   **Floating Panels & Route Inputs:**
    *   Background: `rgba(255, 255, 255, 0.8)`
    *   Backdrop Filter: `blur(12px)` (Apply the blur to the background layer only, keeping text sharp).
    *   Box Shadow: `0px 4px 16px rgba(0, 0, 0, 0.08)` (Soft, diffused shadow).
*   **Current Location Marker:**
    *   Requires a stronger shadow to lift it off the map geometry: `0px 8px 24px rgba(0, 0, 0, 0.12)`.

## 5. Component Guidelines

### 5.1 Route Inputs

*   **Structure:** Two distinct fields (Start and Destination) with a swap button (`↑↓`) positioned between them.
*   **Sizing:** Ensure both fields have identical width and a minimum height of `44px` for touch targets.
*   **States:** Clearly differentiate between an empty state (placeholder text), a typed query, a selected location, and a "loading" state during route calculation.

### 5.2 Amenity Cards (Rows)

*   **Anatomy:** Soft row surface + Colored Icon Tile + Label + Selection Indicator.
*   **Target:** The entire row must be clickable, not just the icon or the text.
*   **Icon Tile:** Keep the foreground glyph visually centered within the colored square. Ensure the glyphs maintain a consistent stroke weight across all categories.

### 5.3 Top Toolbar (Map Utilities)

*   **Placement:** Upper right corner.
*   **Appearance:** Circular buttons on a soft white pill-shaped container. Use `#09090B` (Primary Foreground) for the icons.
*   **Accessibility:** Every icon must have an explicit `aria-label` or tooltip (e.g., "Centrer sur ma position", "Zoom avant"). Do not rely on ambiguous symbols.

## 6. Interaction States

Every interactive element must provide visual feedback.

| State | Visual Treatment |
| :--- | :--- |
| **Default** | Standard styling defined above. |
| **Hover (Desktop)** | Subtle darkening of the background surface (e.g., `rgba(255, 255, 255, 0.9)`) or a slightly stronger border. Do not shift elements significantly on hover. |
| **Focus (Keyboard)**| A clear, high-contrast `2px` focus ring, offset by `2px` from the element. This is critical for accessibility. |
| **Active (Pressed)** | A small tonal shift (slightly darker). |
| **Selected** | Apply a subtle background tint related to the item's category color, or use a definitive checkmark icon. |
| **Disabled** | Reduce opacity of the entire control to ~50%. Ensure the reason for being disabled is clear if it isn't obvious. |

## 7. Responsive Layout (Mobile Approach)

The desktop layout (panels on the left) does not translate directly to mobile.

*   **Mobile Structure:** Use a Bottom Sheet pattern.
    *   **Map:** Fills the entire viewport behind the UI.
    *   **Top Bar:** Route inputs or a collapsed search summary.
    *   **Bottom Sheet:** Houses amenities, search results, and step-by-step navigation instructions.
    *   **Map Tools:** Floating action buttons (FABs) positioned above the bottom sheet.
*   **Sheet States:** Define three clear states for the bottom sheet: Collapsed (just a handle/summary), Half-Expanded (shows amenities while retaining map context), and Fully Expanded (for long lists or detailed instructions).

## 8. Specific Indoor Navigation Needs (MoMo-MAP)

Because this is a campus map, the UI must explicitly handle:

*   **Floor Changes:** A clear, persistent UI element indicating the current floor (e.g., "Niveau 3").
*   **Vertical Routing:** When a route involves stairs or elevators, the UI must explicitly state this (e.g., "Prendre l'ascenseur jusqu'au Niveau 2") rather than just showing a line disappearing into a wall.
*   **Accessibility Routing:** If an accessible route (e.g., wheelchair friendly) is requested, prioritize elevators over stairs and visually confirm this selection in the UI.