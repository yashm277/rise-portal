# RISE Research - Vercel Deployment Guide

## 📋 Overview

You now have two applications:
1. **React Dashboard** (`rise-dashboard/`) - Modern React frontend
2. **Express API** (root directory) - Backend API with Airtable

## 🚀 Deployment Strategy

### Option 1: Separate Deployments (Recommended)

Deploy frontend and backend as separate Vercel projects.

#### Step 1: Deploy Backend API

1. Create a new Vercel project for the API
2. Point it to the **root directory** (`d:\rise_research`)
3. Configure as **Node.js** project
4. Add environment variables in Vercel dashboard:
   ```
   CONTACT_BASE_ID=<your_contact_base_id>
   INVOICING_BASE_ID=<your_invoicing_base_id>
   AIRTABLE_TOKEN=<your_airtable_token>
   ```
5. Deploy

**Result:** You'll get a URL like `https://rise-api.vercel.app`

#### Step 2: Deploy React Frontend

1. Create another Vercel project for the frontend
2. Point it to the **rise-dashboard** subdirectory
3. Configure as **Vite** project (auto-detected)
4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://rise-api.vercel.app
   ```
5. Deploy

**Result:** You'll get a URL like `https://rise-dashboard.vercel.app`

### Option 2: Monorepo Deployment

Deploy both in one repository using Vercel's monorepo features.

#### Configuration

1. Update root `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "rise-dashboard/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "rise-dashboard/dist"
      }
    },
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/rise-dashboard/dist/$1"
    }
  ]
}
```

2. Deploy from root directory

## 🔧 Pre-Deployment Checklist

### Backend
- [ ] Environment variables configured in Vercel
- [ ] CORS enabled for frontend domain
- [ ] All API endpoints tested locally
- [ ] Airtable credentials verified

### Frontend
- [ ] `.env.production` has correct API URL
- [ ] Google OAuth Client ID is correct
- [ ] Build runs successfully (`npm run build`)
- [ ] All routes work in production build

## 📝 Deployment Commands

### Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy backend (from root):
```bash
cd d:\rise_research
vercel --prod
```

3. Deploy frontend (from rise-dashboard):
```bash
cd d:\rise_research\rise-dashboard
vercel --prod
```

### Using Vercel Dashboard

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure build settings
4. Add environment variables
5. Deploy

## 🔗 Connecting Frontend to Backend

After deploying backend, update frontend:

1. Get backend URL from Vercel (e.g., `https://rise-api.vercel.app`)
2. Update `.env.production`:
   ```env
   VITE_API_BASE_URL=https://rise-api.vercel.app
   ```
3. Or add to Vercel environment variables
4. Redeploy frontend

## 🛡️ CORS Configuration

Update your `server.js` to allow frontend domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // Local dev
    'https://rise-dashboard.vercel.app'  // Production
  ],
  credentials: true
}));
```

## ✅ Testing Deployment

After deployment:

1. Visit your frontend URL
2. Try logging in with Google
3. Check if dashboard loads students
4. Verify API calls in browser DevTools
5. Test all navigation routes

## 🐛 Troubleshooting

### Frontend shows "Network Error"
- Check `VITE_API_BASE_URL` is correct
- Verify backend is deployed and running
- Check CORS configuration

### Google Login fails
- Verify Google Client ID is correct
- Check if domain is authorized in Google Console
- Ensure backend `/api/verify-google-token` works

### Build fails
- Check all imports are correct
- Verify all dependencies are installed
- Review build logs in Vercel

### API returns 404
- Verify backend routes are configured
- Check `vercel.json` routes
- Ensure environment variables are set

## 📊 Environment Variables Summary

### Backend (Express API)
```env
CONTACT_BASE_ID=<from_airtable>
INVOICING_BASE_ID=<from_airtable>
AIRTABLE_TOKEN=<from_airtable>
```

### Frontend (React App)
```env
VITE_API_BASE_URL=https://your-api-domain.vercel.app
```

## 🎯 Next Steps After Deployment

1. Test all features thoroughly
2. Setup custom domain (optional)
3. Configure monitoring/analytics
4. Implement error tracking (Sentry, etc.)
5. Add more features (invoicing, analytics)

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console errors
3. Test API endpoints directly
4. Verify environment variables

---

**Ready to deploy?** Start with the backend, then frontend, then connect them! 🚀
