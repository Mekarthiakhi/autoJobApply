# 🎨 AutoApply - AI Job Application Automation Platform

A production-grade full-stack application that automatically discovers, filters, scores, and applies to jobs matching your profile using AI-powered matching and Telegram notifications, featuring a modern **Neumorphic** dark mode UI.

## ✨ Features

### 🔍 **AI Job Discovery Agent**
- Multi-source job scraping (LinkedIn, Naukri, Indeed, CareerPages)
- Automatic duplicate detection and normalization
- Real-time job updates every hour
- Support for multiple locations and job types

### 🤖 **Multi-Agent Matching & Ranking**
- Gemini & OpenAI-powered resume-to-job matching
- Advanced Match scoring (0-100%) and personalized gap analysis
- Generates missing skills identification
- Prepares tailored Cover Letters per application
- Employs multiple Resume Versions for targeted applying

### 📋 **Review Queue (Human-in-the-loop)**
- **Explicit User Approval**: The AI does the heavy lifting, but *you* have the final say. No auto-submit without review.
- Inspect AI-prepared applications (Match Score, Warnings, Questionnaire answers)
- One-click approve and auto-apply or reject

### 📊 **Dashboard & Activity Logs**
- Real-time application statistics (Pending Reviews, Matches, Offers)
- Comprehensive AI Activity Logging (track everything the agents do)
- Interview pipeline and job tracking

### 💬 **Notifications**
- Telegram bot integration for daily job summaries
- Alerting for items in the Review Queue

### 🎨 **Modern UI**
- Glassmorphism design with neumorphic accents
- Responsive layout and smooth animations
- Dark mode support

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-3.5
- **Notifications**: Telegram Bot API
- **Scheduling**: Node Cron
- **Authentication**: JWT
- **Security**: Bcrypt, Rate Limiting

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Styling**: CSS3 + Glassmorphism
- **State**: React Hooks + Context

### Deployment
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Server**: Nginx (optional)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- OpenAI API Key
- Telegram Bot Token (optional)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ai-job-automation.git
cd ai-job-automation
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Using Docker Compose (Recommended)
```bash
docker-compose up -d
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Database: PostgreSQL on 5432

### 4. Manual Setup

#### Backend
```bash
cd backend
npm install
npm run build
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📚 API Documentation

### Authentication
```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

# Get Profile
GET /api/auth/profile
Headers: { Authorization: "Bearer <token>" }

# Update Profile
PUT /api/auth/profile
{
  "preferredLocations": ["Remote", "Bangalore"],
  "employmentType": "Full-Time",
  "minMatchScore": 80
}
```

### Jobs
```bash
# Get All Jobs
GET /api/jobs?limit=50
Headers: { Authorization: "Bearer <token>" }

# Get Job Details
GET /api/jobs/:jobId
Headers: { Authorization: "Bearer <token>" }

# Search Jobs
POST /api/jobs/search
{
  "keywords": ["React", "JavaScript"]
}
Headers: { Authorization: "Bearer <token>" }
```

### Applications
```bash
# Apply to Job
POST /api/applications/apply
{
  "jobId": "uuid"
}
Headers: { Authorization: "Bearer <token>" }

# Get Applications
GET /api/applications
Headers: { Authorization: "Bearer <token>" }

# Update Application Status
PUT /api/applications/:applicationId
{
  "status": "interview_scheduled"
}
Headers: { Authorization: "Bearer <token>" }
```

### Dashboard
```bash
# Get Dashboard Stats
GET /api/dashboard
Headers: { Authorization: "Bearer <token>" }
```

## 🤖 Telegram Bot Commands

```
/jobs - Show recent jobs
/topmatches - Show top matching jobs
/applications - Show your applications
/apply [jobId] - Apply to a job
/reject [jobId] - Reject a job
/settings - Configure bot settings
```

## 📊 Database Schema

### Tables
- `users` - User accounts and preferences
- `resumes` - Resume storage and extraction
- `jobs` - Job listings from various sources
- `applications` - Application tracking
- `match_scores` - AI matching results
- `automation_settings` - User automation preferences
- `notifications` - Notification history

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting (100 requests/15min)
- CORS protection
- Helmet.js security headers
- Encrypted credential storage
- Audit logs for applications

## 📈 Performance Optimization

- Database indexing on frequently queried fields
- Connection pooling for database
- Caching strategies for job listings
- Lazy loading in frontend
- Code splitting and tree shaking
- Image optimization

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart db
```

### API Connection Issues
```bash
# Check backend is running
curl http://localhost:5000/health

# Check logs
docker-compose logs backend
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules
npm install
npm run build
```

## 📦 Deployment

### VPS Deployment
```bash
# Clone repository
git clone <repo> /app

# Setup environment
cd /app
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose -f docker-compose.yml up -d

# Setup nginx reverse proxy
# Point domain to server IP
```

### Environment Variables (Production)
```env
NODE_ENV=production
JWT_SECRET=long-random-string-here
OPENAI_API_KEY=sk-your-key
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_CHAT_ID=your-chat-id
DB_PASSWORD=strong-password
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Project Structure

```
ai-job-automation/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access layer
│   │   ├── jobs/           # Scheduled jobs
│   │   ├── scrapers/       # Job scrapers
│   │   └── middleware/     # Express middleware
│   └── Dockerfile
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client
│   │   └── styles/         # CSS styles
│   └── Dockerfile
├── docker-compose.yml       # Docker composition
└── .github/workflows/       # CI/CD workflows
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

For support, email support@example.com or open an issue on GitHub.

## 🎯 Roadmap

- [ ] LinkedIn API integration (replace scraper)
- [ ] Auto-apply with Playwright automation
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced filters and saved searches
- [ ] Interview scheduling integration
- [ ] Resume optimization suggestions
- [ ] Analytics and insights dashboard

---

## ✨ What's Inside

### 🎯 Complete Neumorphism Redesign
- **Dark Mode First** - Deep space black background (#0A0D14) optimized for extended use
- **Tactile Interface** - Neumorphic shadows create 3D depth perception
- **Premium Colors** - Electric blue, mint green, amber, and red accents
- **Smooth Animations** - Micro-interactions with 300ms transitions
- **Fully Responsive** - Mobile-first design that works everywhere

### 📦 Components Redesigned

#### Dashboard ✅
- **4 KPI Cards** - Applied Today, Response Rate, Interviews, Active Campaigns
- **Live Application Pulse** - Real-time feed showing applications being sent
- **Success Metrics** - Circular progress, application summary
- **Application Funnel** - 5-stage pipeline visualization
- **Weekly Heatmap** - GitHub-style contribution graph

#### Sidebar Navigation ✅
- Gradient logo (blue-to-green)
- Active indicator with left border accent
- Smooth hover effects with lift animation
- Red accent on logout button

#### Authentication Pages ✅
- Neumorphic form cards with glassmorphism
- Recessed input fields with inset shadows
- Gradient background with radial accents
- Focus glow effects (electric blue)
- Error animations (shake effect)

#### Reusable Components ✅
- **NeumorphicCard** - Variants: raised, inset, flat
- **StatsCard** - KPI cards with icon, label, value, trend
- **ApplicationPulse** - Live feed with status indicators
- **Status Badges** - Applied, Pending, Success, Error

---

## 🎨 Design System

### Color Palette
```
Background:        #0A0D14  (Deep Space Black)
Surface:           #111827  (Card Background)
Primary Accent:    #4F8EF7  (Electric Blue)
Success:           #10B981  (Mint Green)
Warning:           #F59E0B  (Amber)
Error:             #EF4444  (Red)
Text Primary:      #F1F5F9  (White)
Text Muted:        #64748B  (Gray)
```

### Typography
```
Headings:    Space Grotesk (geometric, confident)
Body:        Inter (clean, legible)
Data:        JetBrains Mono (monospace)
```

### Shadow System
```
neumo-light:  Raised cards (5px shadow + light highlight)
neumo-down:   Pressed buttons (8px + 2px shadow)
neumo-inset:  Recessed inputs (inset dual shadow)
neumo-up:     Active insets (subtle lift effect)
```

### Animations
```
fade-in:       Smooth opacity fade (600ms)
slide-in-right: Slide from right with fade (600ms)
pulse-glow:    Infinite pulsing glow effect
ripple:        Expanding ripple animation (600ms)
shake:         Error validation shake
```

---

## 📁 Project Structure

```
autoJobApply-neumorphism/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── Dashboard.tsx ✅ (Redesigned with all features)
│   │   │   │   ├── StatsCard.tsx ✅ (Neumorphic KPI card)
│   │   │   │   └── ApplicationPulse.tsx ✅ (Live feed component)
│   │   │   ├── Common/
│   │   │   │   ├── NeumorphicCard.tsx ✅ (Reusable raised/inset)
│   │   │   │   ├── Common.module.css ✅ (Sidebar styling)
│   │   │   │   └── Sidebar.tsx (Ready to use)
│   │   │   ├── Auth/
│   │   │   │   └── Auth.css ✅ (Form styling)
│   │   │   └── ... (other components)
│   │   ├── styles/
│   │   │   ├── globals.css ✅ (Neumorphic classes, animations)
│   │   │   └── ... (other styles)
│   │   └── ... (API hooks, main, etc.)
│   ├── tailwind.config.js ✅ (Neumorphism config)
│   ├── package.json (No changes needed)
│   └── ... (vite config, tsconfig, etc.)
├── backend/ (unchanged)
├── NEUMORPHISM_DESIGN_GUIDE.md 📖 (Complete design system)
├── DESIGN_SHOWCASE.md 🎨 (Visual component showcase)
├── IMPLEMENTATION_CHECKLIST.md ✅ (What's been done)
├── QUICK_START.md 🚀 (Developer quick reference)
└── README.md (this file)
```

---

## 🚀 Quick Start

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

### Build for Production
```bash
npm run build
npm run preview
```

---

## 💡 Key Features

### 1. KPI Dashboard
- 4-column grid of metric cards
- Real-time trend indicators
- Neumorphic depth with dual shadows
- Color-coded by metric type
- Fully responsive (1-4 columns)

### 2. Application Pulse Feed
- Live event tracking
- Real-time company + role information
- Time-based formatting (just now, 5m ago, etc.)
- Status indicators (Applied, Viewed, Responded)
- Ripple animation on new events
- Color-coded left border per status

### 3. Success Metrics
- Circular progress indicator
- Application summary cards
- Status breakdown (Applied, Matched, Pending, Offers)
- Next steps CTA card

### 4. Application Funnel
- 5-stage visualization
- Applied → Viewed → Responded → Interviewing → Offers
- Numeric display per stage
- Responsive grid layout
- Downward flow arrows

### 5. Weekly Activity Heatmap
- 7-day contribution graph
- Gradient bars (blue to green)
- Height represents volume
- Hover tooltips with counts
- Smooth animations

---

## 🎨 Component Usage

### KPI Card
```jsx
<StatsCard
  icon={<Zap size={20} />}
  label="Jobs Applied"
  value={247}
  trend={{ value: 12, direction: 'up' }}
  accentColor="blue"
/>
```

### Application Pulse
```jsx
<ApplicationPulse isRunning={true} />
```

### Neumorphic Card
```jsx
<NeumorphicCard variant="raised">
  <h3>Card Title</h3>
  <p>Content goes here</p>
</NeumorphicCard>
```

### Status Badge
```jsx
<span className="status-badge applied">Applied</span>
<span className="status-badge success">Success</span>
```

---

## 🎯 Tailwind Classes

### Card & Button Classes
```jsx
<div className="neumo-card p-6">Card</div>
<button className="neumo-btn">Button</button>
<input className="neumo-input" />
<span className="status-badge applied">Badge</span>
```

### Color Utilities
```jsx
className="text-accent-primary"     // Electric Blue
className="text-accent-success"     // Mint Green
className="text-accent-warning"     // Amber
className="bg-neumo-surface"        // Card surface
className="bg-accent-primary/10"    // 10% opacity
```

### Shadow Utilities
```jsx
className="shadow-neumo-light"      // Raised card
className="shadow-neumo-down"       // Pressed button
className="shadow-neumo-inset"      // Recessed input
className="shadow-glow-blue"        // Blue glow
```

### Animation Classes
```jsx
className="fade-in"                 // Fade in animation
className="slide-in-right"          // Slide from right
className="pulse-glow"              // Pulsing glow (infinite)
className="ripple"                  // Ripple effect
```

---

## 📐 Responsive Design

### Breakpoints
```
Mobile:   < 640px  (1 column, full width)
Tablet:   640px    (2 columns, adjusted spacing)
Desktop:  768px    (3-4 columns, full layout)
Large:    1024px   (4+ columns, expanded)
```

### Example Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Cards automatically adjust */}
</div>
```

---

## 🎭 Interactive States

### Buttons
- **Default**: Raised shadow
- **Hover**: Lighter shadow, translate up -2px
- **Active**: Inset shadow, no translation
- **Disabled**: 60% opacity

### Inputs
- **Normal**: Inset shadow, gray border
- **Focus**: Blue glow effect, blue border
- **Error**: Red border, error styling

### Navigation Items
- **Default**: Muted text
- **Hover**: Blue tint, light lift
- **Active**: Blue background, left border, bright text

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **QUICK_START.md** | Developer quick reference & common patterns |
| **NEUMORPHISM_DESIGN_GUIDE.md** | Complete design system documentation |
| **DESIGN_SHOWCASE.md** | Visual components & design decisions |
| **IMPLEMENTATION_CHECKLIST.md** | What's been completed & next steps |

---

## ✅ What's Been Completed

- ✅ Tailwind configuration with neumorphism colors & shadows
- ✅ Global styles with neumorphic classes & animations
- ✅ Dashboard component with KPI grid & visualizations
- ✅ Application Pulse real-time feed component
- ✅ StatsCard neumorphic card component
- ✅ NeumorphicCard reusable component (3 variants)
- ✅ Sidebar navigation redesign
- ✅ Authentication pages styling
- ✅ Complete design documentation (3 guides)

---

## 🔄 Optional Next Steps

- [ ] Apply neumorphism to Jobs, Applications, Settings pages
- [ ] Create Storybook component library
- [ ] Add more micro-interactions & loading states
- [ ] Implement dark/light mode toggle
- [ ] Create design tokens export
- [ ] Add keyboard shortcuts guide

---

## 🎨 Design Principles

### Dark Mode First
- Reduces eye strain for extended use
- Premium, modern aesthetic
- Optimized for tech professionals

### Tactile Neumorphism
- Shadows create depth perception
- Light and dark shadows simulate 3D
- Users can "feel" button interactions

### Purposeful Color
- Electric Blue (#4F8EF7) for primary actions
- Mint Green (#10B981) for success states
- Amber (#F59E0B) for warnings
- Clear visual hierarchy

### Smooth Interactions
- 300ms transitions by default
- Cubic-bezier easing for natural motion
- Hardware-accelerated transforms
- No jarring visual changes

---

## 🔍 Browser Support

- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ✅ Safari (Full support, vendor prefixes)
- ✅ Mobile browsers (Full support)

---

## ♿ Accessibility

- ✅ WCAG AA contrast ratios (4.5:1 minimum)
- ✅ Clear focus indicators (blue glow)
- ✅ Keyboard navigation support
- ✅ Semantic HTML structure
- ✅ Proper form labels & ARIA attributes

---

## 📊 Performance

- 🚀 GPU-accelerated shadows
- 🚀 Hardware-accelerated animations
- 🚀 60fps animation target
- 🚀 Optimized font loading
- 🚀 Tailwind CSS purging

---

## 🎯 Color Showcase

```
🟦 Electric Blue     #4F8EF7  - Primary actions, focus
🟩 Mint Green        #10B981  - Success, positive
🟨 Amber             #F59E0B  - Warnings, pending
🟥 Red               #EF4444  - Errors, destructive
⬛ Deep Black        #0A0D14  - Background
⬜ White             #F1F5F9  - Primary text
⬜ Gray              #64748B  - Secondary text
```

---

## 💬 Questions?

Refer to:
1. **QUICK_START.md** - Common patterns & troubleshooting
2. **NEUMORPHISM_DESIGN_GUIDE.md** - Complete design reference
3. **DESIGN_SHOWCASE.md** - Visual examples & rationale

---

## 📝 Notes

- All colors are WCAG AA accessible
- Fonts load from Google Fonts
- Shadows use CSS `box-shadow` (GPU accelerated)
- Animations use `transform` and `opacity` (performant)
- Mobile-first responsive design
- No breaking changes to existing backend API

---

## 🚀 Ready to Launch!

Your AutoApply platform now has a beautiful, modern neumorphism interface that:
- Looks premium and professional
- Feels interactive and responsive
- Guides users with clear visual hierarchy
- Works perfectly on all devices
- Maintains excellent performance

**Start exploring the redesigned Dashboard today!**

---

**Version:** 1.0 Neumorphism Edition
**Design System:** Complete & Production Ready ✨
**Last Updated:** June 26, 2026

Happy coding! 🎨🚀
