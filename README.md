# 🚀 AI Job Application Automation Platform

A production-grade full-stack application that automatically discovers, filters, scores, and applies to jobs matching your profile using AI-powered matching and Telegram notifications.

## ✨ Features

### 🔍 **Job Discovery**
- Multi-source job scraping (LinkedIn, Naukri, Indeed, CareerPages)
- Automatic duplicate detection
- Real-time job updates every hour
- Support for multiple locations and job types

### 🤖 **AI Matching Engine**
- OpenAI-powered resume-to-job matching
- Match scoring (0-100%)
- Missing skills identification
- Strength analysis and recommendations
- Customizable minimum match threshold

### 📊 **Dashboard**
- Real-time statistics
- Job discovery analytics
- Application tracking
- Interview pipeline management
- Offer tracking

### 💬 **Notifications**
- Telegram bot integration
- Daily job summaries
- Application updates
- Interview reminders

### ⚙️ **Automation**
- Scheduled job discovery (cron-based)
- Automated AI matching
- Three automation modes:
  - **Manual**: View jobs only
  - **Approval Mode**: Get notified, approve to apply
  - **Auto Apply**: Auto-apply when match score ≥ 90%

### 🎨 **Modern UI**
- Glassmorphism design
- Responsive layout
- Dark mode support
- Smooth animations

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

**Built with ❤️ for job seekers everywhere**
