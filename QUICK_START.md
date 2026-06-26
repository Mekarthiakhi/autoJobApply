# AutoApply Neumorphism - Quick Start Guide

## 🚀 Getting Started

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
Visit: `http://localhost:5173`

### Build
```bash
npm run build
```

---

## 📦 What's New

✨ **Complete Neumorphism Redesign**
- Modern, tactile interface with depth shadows
- Dark mode optimized for extended use
- Electric blue, mint green, and amber accent colors
- Smooth micro-interactions and animations
- Fully responsive design

---

## 🎨 Key Components

### 1. Dashboard ✅
**Location:** `frontend/src/components/Dashboard/Dashboard.tsx`

**Features:**
- 4 KPI cards (Applied Today, Response Rate, Interviews, Active Campaigns)
- Live Application Pulse feed with real-time events
- Success rate circular progress
- Application funnel visualization
- Weekly activity heatmap

**Props:** None required (uses mock data)

**Usage:**
```jsx
import Dashboard from './components/Dashboard/Dashboard';

<Dashboard />
```

---

### 2. StatsCard ✅
**Location:** `frontend/src/components/Dashboard/StatsCard.tsx`

**Props:**
```typescript
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  children?: React.ReactNode;
  className?: string;
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}
```

**Usage:**
```jsx
<StatsCard
  icon={<Zap size={20} />}
  label="Jobs Applied"
  value={247}
  trend={{ value: 12, direction: 'up' }}
  accentColor="blue"
>
  <p>Additional content here</p>
</StatsCard>
```

---

### 3. ApplicationPulse ✅
**Location:** `frontend/src/components/Dashboard/ApplicationPulse.tsx`

**Props:**
```typescript
interface ApplicationPulseProps {
  events?: ApplicationEvent[];
  isRunning?: boolean;
}
```

**Usage:**
```jsx
<ApplicationPulse isRunning={true} />
```

---

### 4. NeumorphicCard ✅
**Location:** `frontend/src/components/Common/NeumorphicCard.tsx`

**Props:**
```typescript
interface NeumorphicCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'raised' | 'inset' | 'flat';
  onClick?: () => void;
  noBorder?: boolean;
}
```

**Usage:**
```jsx
<NeumorphicCard variant="raised">
  <h3>Card Title</h3>
  <p>Card content</p>
</NeumorphicCard>
```

---

## 🎨 Tailwind Classes

### Card Classes
```jsx
// Raised card (most common)
<div className="neumo-card p-6">Content</div>

// Button with neumorphic styling
<button className="neumo-btn">Click Me</button>

// Input field with recessed shadow
<input className="neumo-input" placeholder="Enter text..." />

// Status badge
<span className="status-badge applied">Applied</span>
```

### Color Utilities
```jsx
// Accent colors
className="text-accent-primary"    // Electric Blue
className="text-accent-success"    // Mint Green
className="text-accent-warning"    // Amber
className="text-accent-error"      // Red

// Background colors
className="bg-neumo-bg"            // Deep Space Black
className="bg-neumo-surface"       // Card Surface
className="bg-accent-primary/10"   // Blue with 10% opacity
```

### Shadow Utilities
```jsx
className="shadow-neumo-light"     // Raised card
className="shadow-neumo-down"      // Pressed button
className="shadow-neumo-inset"     // Recessed input
className="shadow-glow-blue"       // Blue glow effect
```

---

## 🎯 Color Palette Reference

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Deep Space Black | #0A0D14 | Page background |
| Card | Card Surface | #111827 | Card containers |
| Primary | Electric Blue | #4F8EF7 | Links, actions, focus |
| Success | Mint Green | #10B981 | Positive, success |
| Warning | Amber | #F59E0B | Warnings, pending |
| Error | Red | #EF4444 | Errors, destructive |
| Text Primary | White | #F1F5F9 | Headings, body text |
| Text Muted | Gray | #64748B | Secondary content |

---

## ✨ Animation Classes

```jsx
// Fade in animation
<div className="fade-in">Content</div>

// Slide in from right
<div className="slide-in-right">Content</div>

// Pulse glow effect (infinite)
<div className="pulse-glow">Content</div>

// Ripple effect (one-time)
<div className="ripple">Content</div>
```

---

## 📱 Responsive Examples

### 4-Column Grid (Dashboard KPIs)
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatsCard ... />
  <StatsCard ... />
  <StatsCard ... />
  <StatsCard ... />
</div>
```

### 3-Column Layout (With sidebar)
```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Main content - 2/3 width */}
  </div>
  <div>
    {/* Sidebar - 1/3 width */}
  </div>
</div>
```

---

## 🔄 Common Patterns

### Status Badge
```jsx
<span className="status-badge applied">Applied</span>
<span className="status-badge pending">Pending</span>
<span className="status-badge success">Success</span>
<span className="status-badge error">Rejected</span>
```

### KPI Display
```jsx
<div className="neumo-card p-6">
  <h3 className="kpi-label">Jobs Applied</h3>
  <div className="kpi-value">247</div>
  <p className="text-sm text-accent-success">↗ +12% this week</p>
</div>
```

### Form Group
```jsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-semibold mb-2">Email</label>
    <input className="neumo-input" type="email" />
  </div>
</div>
```

### Button Group
```jsx
<div className="flex gap-3">
  <button className="neumo-btn flex-1">Cancel</button>
  <button className="neumo-btn flex-1">Submit</button>
</div>
```

---

## 🎭 Component Variants

### Card Variants
```jsx
// Raised (default)
<NeumorphicCard variant="raised">Content</NeumorphicCard>

// Inset (for inputs)
<NeumorphicCard variant="inset">Content</NeumorphicCard>

// Flat (minimal)
<NeumorphicCard variant="flat">Content</NeumorphicCard>
```

### Accent Colors
```jsx
// Blue (primary)
<StatsCard accentColor="blue" ... />

// Green (success)
<StatsCard accentColor="green" ... />

// Amber (warning)
<StatsCard accentColor="amber" ... />

// Red (error)
<StatsCard accentColor="red" ... />

// Purple (secondary)
<StatsCard accentColor="purple" ... />
```

---

## 📐 Spacing Scale

```
p-2   = 8px
p-3   = 12px
p-4   = 16px
p-6   = 24px
p-8   = 32px

gap-2  = 8px
gap-3  = 12px
gap-4  = 16px
gap-6  = 24px
```

---

## 🔍 Typography

### Headings
```jsx
<h1 className="text-4xl font-display font-bold">Main Heading</h1>
<h2 className="text-2xl font-display font-semibold">Section Title</h2>
<h3 className="text-lg font-display font-semibold">Card Title</h3>
```

### Text Levels
```jsx
<p className="text-base font-medium text-white">Primary text</p>
<p className="text-sm text-gray-400">Secondary text</p>
<p className="text-xs text-gray-500">Tertiary text</p>
```

### Special
```jsx
<p className="font-mono text-sm">Monospace text (data)</p>
<span className="font-display">Display font (headings)</span>
```

---

## 🧪 Testing Colors

### Quick Color Test
```jsx
<div className="space-y-2 p-6">
  <div className="bg-neumo-bg p-4 rounded">neumo-bg</div>
  <div className="bg-neumo-surface p-4 rounded text-white">neumo-surface</div>
  <div className="bg-accent-primary p-4 rounded text-white">accent-primary</div>
  <div className="bg-accent-success p-4 rounded text-white">accent-success</div>
  <div className="bg-accent-warning p-4 rounded text-black">accent-warning</div>
  <div className="bg-accent-error p-4 rounded text-white">accent-error</div>
</div>
```

---

## 🐛 Troubleshooting

### Shadows Not Showing?
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.js` has neumorphism shadows
- Verify `globals.css` is imported in `main.tsx`

### Colors Look Wrong?
- Clear browser cache (Ctrl+Shift+Delete)
- Rebuild CSS: `npm run dev`
- Check color values in `tailwind.config.js`

### Responsive Issues?
- Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Test on mobile (DevTools responsive mode)
- Verify grid/flex classes applied correctly

### Fonts Not Loading?
- Check Google Fonts import in `globals.css`
- Verify font families in `tailwind.config.js`
- Check browser DevTools (Network tab)

---

## 📚 Documentation Files

- **NEUMORPHISM_DESIGN_GUIDE.md** - Complete design system documentation
- **DESIGN_SHOWCASE.md** - Visual component showcase with examples
- **IMPLEMENTATION_CHECKLIST.md** - Detailed implementation status

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx ✅
│   │   │   ├── StatsCard.tsx ✅
│   │   │   └── ApplicationPulse.tsx ✅
│   │   ├── Common/
│   │   │   ├── NeumorphicCard.tsx ✅
│   │   │   └── Common.module.css ✅
│   │   ├── Auth/
│   │   │   └── Auth.css ✅
│   │   └── ...
│   ├── styles/
│   │   └── globals.css ✅
│   └── ...
├── tailwind.config.js ✅
└── package.json
```

---

## 🚀 Next Steps

1. **Install and Run**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Explore Dashboard**
   - View KPI cards, pulse feed, funnel, heatmap
   - Interact with buttons, hover effects
   - Try responsive design (resize browser)

3. **Customize**
   - Update colors in `tailwind.config.js`
   - Modify animations in `globals.css`
   - Add new components using NeumorphicCard

4. **Extend**
   - Apply neumorphism to other pages
   - Create component library with Storybook
   - Add more interactive features

---

## 💡 Pro Tips

✅ **Always use gap-6 for spacing between cards**
✅ **Use kpi-value class for large numbers**
✅ **Combine status badges with lists**
✅ **Use accentColor prop for visual variety**
✅ **Test on mobile (responsive is important)**

---

## 📞 Support

For issues or questions:
- Check the design guide: `NEUMORPHISM_DESIGN_GUIDE.md`
- Review component showcase: `DESIGN_SHOWCASE.md`
- Verify implementation: `IMPLEMENTATION_CHECKLIST.md`

---

**Version:** 1.0 Neumorphism Edition
**Status:** Production Ready ✨
**Last Updated:** June 26, 2026

Happy coding! 🚀
