# 🚀 Deployment Guide

## Pre-Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set strong `JWT_SECRET`
- [ ] Configure OpenAI API key
- [ ] Setup Telegram bot (optional)
- [ ] Configure database credentials
- [ ] Setup domain and SSL certificate
- [ ] Configure firewall rules

## Local Development

### Using Docker Compose
```bash
docker-compose up -d
```

Monitor logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

Stop services:
```bash
docker-compose down
```

### Manual Development

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

### Step 1: VPS Setup
```bash
# SSH into VPS
ssh root@your-server-ip

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone Repository
```bash
mkdir -p /app
cd /app
git clone https://github.com/yourusername/ai-job-automation.git .
```

### Step 3: Environment Configuration
```bash
cp .env.example .env
nano .env  # Edit with production values
```

Production `.env` example:
```env
NODE_ENV=production
PORT=5000
DB_HOST=db
DB_PORT=5432
DB_NAME=job_automation
DB_USER=postgres
DB_PASSWORD=STRONG_PASSWORD_HERE
JWT_SECRET=very-long-random-string-min-32-chars
OPENAI_API_KEY=sk-your-key
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
VITE_API_URL=https://api.yourdomain.com/api
```

### Step 4: Start Services
```bash
docker-compose up -d
```

### Step 5: Nginx Reverse Proxy Setup
```bash
sudo apt-get install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/default
```

Nginx configuration:
```nginx
upstream backend {
    server localhost:5000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # API routes
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

### Step 6: SSL Certificate (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
sudo systemctl restart nginx
```

### Step 7: Enable Auto-start
```bash
# Create systemd service
sudo nano /etc/systemd/system/job-automation.service
```

Service file:
```ini
[Unit]
Description=AI Job Automation Platform
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/app
Type=simple
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable job-automation.service
sudo systemctl start job-automation.service
```

## Monitoring & Maintenance

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs
docker-compose logs -f
```

### Database Backup
```bash
docker-compose exec db pg_dump -U postgres job_automation > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore
```bash
docker-compose exec -T db psql -U postgres job_automation < backup_file.sql
```

### Update Application
```bash
cd /app
git pull origin main
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Memory Issues
```bash
# Check memory usage
docker stats

# Increase swap space if needed
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

## Performance Tuning

### Database Optimization
```sql
-- Connect to database
docker-compose exec db psql -U postgres -d job_automation

-- Analyze performance
ANALYZE;

-- View index usage
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';
```

### Connection Pool Tuning
Edit backend environment or docker-compose.yml to adjust pool size based on expected concurrent users.

## Security Hardening

1. **Firewall Configuration**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Fail2Ban Protection**
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

3. **Regular Updates**
```bash
# Update docker images
docker pull postgres:15-alpine
docker-compose up -d
```

4. **Backup Strategy**
- Daily database backups
- Weekly full system backups
- Store backups on separate server

## Scaling

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy, AWS ALB)
- Run multiple backend instances
- Use Redis for session caching
- Consider CDN for frontend assets

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
- Use connection pooling

## Cost Optimization

1. **Server**: Start with 2GB RAM, scale up as needed
2. **Database**: Use managed databases (RDS, Azure DB) for production
3. **Storage**: Keep only recent backups (30 days)
4. **OpenAI API**: Monitor usage, implement caching
5. **Telegram**: Free service, no additional costs

## Support & Maintenance

For issues, check:
- Application logs: `docker-compose logs`
- System logs: `/var/log/syslog`
- Nginx logs: `/var/log/nginx/`
- Database logs: `docker-compose logs db`

Contact support or create GitHub issue for persistent problems.
