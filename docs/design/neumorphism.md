# AutoApply Neumorphism Design System

## 🎨 Visual Identity Overview

AutoApply now features a modern **Neumorphism** design aesthetic combined with a dark-mode-first approach. This creates a sophisticated, tactile user interface that feels both professional and approachable.

---

## 🎯 Color Palette

### Base Colors
```
Background:       #0A0D14  (Deep Space Black)
Surface:          #111827  (Card Background)
Border:           #1E2A3A  (Subtle Blue-Dark)
Light Surface:    #1A2332  (Raised Elevation)
Highlight:        #242E3F  (Depth Layer)
```

### Accent Colors
```
Primary (Electric Blue):  #4F8EF7
Success (Mint Green):     #10B981
Warning (Amber):          #F59E0B
Error (Red):              #EF4444
Info (Info Blue):         #3B82F6
```

### Text Colors
```
Primary Text:     #F1F5F9  (White)
Muted Text:       #64748B  (Gray)
Subtle Text:      #94A3B8  (Light Gray)
```

---

## 🔧 Neumorphism Shadows

### Shadow Utilities (Tailwind Classes)

#### `shadow-neumo-light` (Raised Card)
```css
box-shadow: 5px 5px 12px rgba(0, 0, 0, 0.3), 
            -5px -5px 12px rgba(255, 255, 255, 0.05);
```
**Use for:** Primary cards, raised buttons, active states

#### `shadow-neumo-down` (Pressed Button)
```css
box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.4), 
            2px 2px 4px rgba(0, 0, 0, 0.2);
```
**Use for:** CTA buttons, primary actions

#### `shadow-neumo-inset` (Recessed Input)
```css
box-shadow: inset 5px 5px 12px rgba(0, 0, 0, 0.3), 
            inset -5px -5px 12px rgba(255, 255, 255, 0.05);
```
**Use for:** Input fields, search boxes, inset elements

#### `shadow-neumo-up` (Raised Inset)
```css
box-shadow: inset 2px 2px 4px rgba(255, 255, 255, 0.1), 
            inset -2px -2px 4px rgba(0, 0, 0, 0.3);
```
**Use for:** Active input states, hover effects

---

## 📦 Component Classes

### `.neumo-card`
Raised card component with glassmorphism effect.
```html
<div class="neumo-card p-6">
  <!-- Card content -->
</div>
```

**Features:**
- Neumorphic shadow (raised)
- Subtle backdrop blur (10px)
- Subtle border
- Rounded corners (24px)

### `.neumo-btn`
Neumorphic button with interactive states.
```html
<button class="neumo-btn">Click Me</button>
```

**States:**
- **Default:** Raised appearance
- **Hover:** Lighter shadow, translate up (-2px)
- **Active:** Inset shadow, no translation
- **Disabled:** Opacity 0.6

### `.neumo-input`
Recessed input field for data entry.
```html
<input class="neumo-input" type="email" placeholder="your@email.com" />
```

**Features:**
- Inset shadow (recessed)
- Focus glow effect (blue highlight)
- Dark background with subtle border
- Smooth transitions

---

## 🎭 Status Badges

### Badge Classes
```html
<span class="status-badge applied">Applied</span>
<span class="status-badge pending">Pending</span>
<span class="status-badge success">Success</span>
<span class="status-badge error">Rejected</span>
```

| Status    | Class        | Color           | Usage                      |
|-----------|--------------|-----------------|----------------------------|
| Applied   | `.applied`   | Electric Blue   | Application sent           |
| Pending   | `.pending`   | Amber           | Awaiting response           |
| Success   | `.success`   | Mint Green      | Interview/offer received   |
| Error     | `.error`     | Red             | Rejected/ghosted           |

---

## 📊 KPI Cards

### Structure
```html
<div class="neumo-card p-6">
  <div class="w-12 h-12 rounded-xl bg-accent-primary/10 text-accent-primary">
    <Icon />
  </div>
  <h3 class="kpi-label">Jobs Applied</h3>
  <div class="kpi-value">247</div>
  <span class="text-accent-success">↗ +12% this week</span>
</div>
```

### KPI Classes
- `.kpi-value`: Large display number (Space Grotesk, 5xl, bold)
- `.kpi-label`: Small uppercase label (12px, muted)

---

## 🎨 Typography

### Font Stack
```
Display/Headings:  "Space Grotesk" (geometric, confident)
Body Text:         "Inter" (clean, legible)
Data/Labels:       "JetBrains Mono" (monospace numbers)
```

### Sizing
```
h1: 36px (font-display, font-bold)
h2: 28px (font-display, font-semibold)
h3: 20px (font-display, font-semibold)
Body: 15px (font-sans, font-medium)
Label: 12px (font-sans, font-semibold, uppercase)
```

---

## ✨ Animations

### Fade In
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in { animation: fade-in 0.6s ease-out; }
```

### Slide In Right
```css
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
.slide-in-right { animation: slide-in-right 0.6s ease-out; }
```

### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(79, 142, 247, 0.3); }
  50% { box-shadow: 0 0 40px rgba(79, 142, 247, 0.6); }
}
.pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
```

### Ripple
```css
@keyframes ripple {
  0% { box-shadow: 0 0 0 0 rgba(79, 142, 247, 0.7); }
  70% { box-shadow: 0 0 0 20px rgba(79, 142, 247, 0); }
  100% { box-shadow: 0 0 0 0 rgba(79, 142, 247, 0); }
}
.ripple { animation: ripple 0.6s ease-out; }
```

---

## 🚀 Key Features Implemented

### 1. Dashboard
- **KPI Row:** 4 metric cards (Applied Today, Response Rate, Interviews, Active Campaigns)
- **Application Pulse Feed:** Real-time activity feed with ripple animations
- **Application Funnel:** Visual pipeline from Applied → Viewed → Responded → Interviewed → Offers
- **Weekly Activity Heatmap:** GitHub-style contribution graph

### 2. Neumorphic Cards
- **Raised Appearance:** Primary cards with shadow depth
- **Glassmorphism:** Subtle backdrop blur for modern feel
- **Interactive States:** Hover lift, press-down, active glow
- **Accessibility:** High contrast, clear focus states

### 3. Application Pulse Component
- **Live Feed:** Real-time application events
- **Status Indicators:** Applied (blue), Viewed (amber), Responded (green)
- **Time Formatting:** "just now", "5m ago", "2h ago"
- **Ripple Animation:** Animated ripple on latest application
- **Company Info:** Logo placeholder, role title, status badge

### 4. Auth Pages
- **Neumorphic Form:** Recessed input fields with inset shadows
- **Gradient Background:** Subtle radial gradients for depth
- **Input Focus Glow:** Electric blue focus effect
- **Error Animations:** Shake animation on validation errors
- **Glassmorphic Card:** Semi-transparent auth form

### 5. Sidebar Navigation
- **Active Indicator:** Left border accent on active nav item
- **Hover Effects:** Subtle lift on hover
- **Gradient Logo:** Blue-to-green gradient text
- **Logout Button:** Red accent with hover effects

---

## 💡 Design Principles

### 1. Dark Mode First
- Always starts with dark background (#0A0D14)
- Reduces eye strain for extended use
- Premium, modern aesthetic

### 2. Tactile Neumorphism
- Shadows create depth perception
- Light and dark shadows simulate 3D
- Users can "feel" button interactions

### 3. Purposeful Color
- Electric Blue (#4F8EF7) for primary actions
- Mint Green (#10B981) for success states
- Amber (#F59E0B) for warnings
- Clear visual hierarchy

### 4. Smooth Transitions
- All interactions have 300ms transitions
- Cubic-bezier easing for natural motion
- Reduces jarring visual changes

### 5. Data-Dense Layouts
- Whitespace used deliberately
- Information hierarchy is clear
- No visual clutter

---

## 🔄 Tailwind Configuration

All neumorphism utilities are defined in `tailwind.config.js`:

```javascript
colors: {
  'neumo-bg': '#0A0D14',
  'neumo-surface': '#111827',
  'accent-primary': '#4F8EF7',
  'accent-success': '#10B981',
  'accent-warning': '#F59E0B',
},
boxShadow: {
  'neumo-light': '5px 5px 12px rgba(0, 0, 0, 0.3), -5px -5px 12px rgba(255, 255, 255, 0.05)',
  'neumo-down': '8px 8px 16px rgba(0, 0, 0, 0.4), 2px 2px 4px rgba(0, 0, 0, 0.2)',
  'neumo-inset': 'inset 5px 5px 12px rgba(0, 0, 0, 0.3), inset -5px -5px 12px rgba(255, 255, 255, 0.05)',
  'neumo-up': 'inset 2px 2px 4px rgba(255, 255, 255, 0.1), inset -2px -2px 4px rgba(0, 0, 0, 0.3)',
}
```

---

## 📱 Responsive Design

All components are fully responsive:
- Mobile: Single column layouts
- Tablet: 2-3 column grids
- Desktop: Full multi-column layouts
- Sidebar collapses on mobile devices

---

## 🎯 Usage Examples

### Creating a Card
```jsx
<div className="neumo-card p-6">
  <h3 className="text-white font-display font-semibold mb-4">
    Card Title
  </h3>
  <p className="text-gray-400">Card content goes here</p>
</div>
```

### Creating a Button
```jsx
<button className="neumo-btn">
  Click Me
</button>
```

### Creating an Input
```jsx
<input 
  className="neumo-input" 
  type="email" 
  placeholder="Enter email..."
/>
```

### Creating a Status Badge
```jsx
<span className="status-badge applied">
  Applied
</span>
```

---

## 🎨 Design Files

- **Tailwind Config:** `frontend/tailwind.config.js`
- **Global Styles:** `frontend/src/styles/globals.css`
- **Component Styles:** `frontend/src/components/**/*.css`
- **Neumorphic Card:** `frontend/src/components/Common/NeumorphicCard.tsx`
- **Application Pulse:** `frontend/src/components/Dashboard/ApplicationPulse.tsx`

---

## 🚀 Next Steps

1. Update remaining pages (Jobs, Applications, Settings) with neumorphism
2. Create component library documentation
3. Add more micro-interactions and animations
4. Implement dark/light mode toggle (optional)
5. Create design tokens export for consistency

---

## 📝 Notes

- All colors are accessible (WCAG AA compliant)
- Shadows are performance-optimized
- Font loading is done via Google Fonts
- Animations use hardware acceleration (transform, opacity)
- Mobile-first responsive design approach

---

**Last Updated:** 2026-06-26
**Design System Version:** 1.0
