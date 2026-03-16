# RISE Research Dashboard - React App

Modern React dashboard for RISE Research student management system with Apple-inspired design.

## 🚀 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Icons** - Icon library
- **Apple Design System** - Custom CSS with Apple's design language

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard-specific components
│   └── shared/        # Shared components (Sidebar, etc.)
├── context/           # React Context (Auth)
├── pages/             # Page components (Login, Dashboard, etc.)
├── services/          # API service layer
├── styles/            # Global styles and theme
└── utils/             # Utility functions
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

The `.env` file is already created for local development:

```env
VITE_API_BASE_URL=http://localhost:3000
```

For production (Vercel), update `.env.production`:

```env
VITE_API_BASE_URL=https://your-api-domain.vercel.app
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

## 🌐 Deployment to Vercel

### Option 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. For production:
```bash
vercel --prod
```

### Option 2: Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will auto-detect Vite and configure build settings
5. Add environment variables:
   - `VITE_API_BASE_URL` = your API URL

### Build Settings (Vercel Dashboard)

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## 🔗 API Integration

The app connects to your Express backend via the API service layer (`src/services/api.js`).

### Backend Requirements

Your Express server (in parent directory) should provide these endpoints:

- `POST /api/verify-google-token` - Google OAuth verification
- `GET /api/students` - Fetch all students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/classes` - Fetch classes for invoicing
- `POST /api/validate-classes` - Validate and create invoices

### Connecting Frontend to Backend

1. Deploy your Express backend to Vercel (or other platform)
2. Get the backend URL (e.g., `https://api.example.com`)
3. Update `VITE_API_BASE_URL` in `.env.production`
4. Or add it in Vercel environment variables
5. Redeploy the React app

## 🎨 Design System

The app uses a custom Apple-inspired design system with:

- **CSS Variables** for consistent theming
- **SF Pro Font** (with Inter fallback)
- **Glass morphism** effects with backdrop-filter
- **Dark mode support** via prefers-color-scheme
- **Apple color palette** (Blue, Green, Red, etc.)
- **Smooth animations** with cubic-bezier easing

Theme file: `src/styles/apple-theme.css`

## 📱 Features

### Current
- ✅ Google OAuth authentication
- ✅ Protected routes with React Router
- ✅ Student dashboard with search
- ✅ Sidebar navigation with icons
- ✅ Responsive Apple design
- ✅ Dark mode support

### Coming Soon
- 🔄 Invoicing page (migrate from static HTML)
- 🔄 Analytics dashboard
- 🔄 Settings page
- 🔄 Student CRUD operations
- 🔄 Class validation UI

## 🛠️ Development Tips

### Hot Module Replacement (HMR)
Vite provides instant HMR - changes reflect immediately without full page reload.

### Debugging
- Use React DevTools browser extension
- Check browser console for errors
- API calls are logged via axios

### Code Style
- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use the global Apple theme

## 🔐 Security Notes

- Google Client ID is public (safe in frontend)
- Never expose Airtable API keys in React app
- All sensitive operations happen in backend
- Use HTTPS in production
- Implement CORS properly on backend

## 📄 License

© 2026 RISE Research. All rights reserved.
