# 🎓 RISE Research - Student Class Tracker

A secure web application for tracking student class attendance with Google authentication and Airtable integration.

## ✨ Features

- 🔐 **Google Authentication** - Secure login with Google Sign-In
- 📊 **Airtable Integration** - Fetch students and record class dates
- 🔒 **Secure Backend** - API credentials protected with Express server
- 📱 **Responsive Design** - Works on desktop and mobile
- ➕ **Dynamic Forms** - Add multiple students and up to 12 class dates each
- 💾 **Automatic Sync** - Data automatically saved to Airtable

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Airtable Account](https://airtable.com/)
- [Google Cloud Project](https://console.cloud.google.com/) (for OAuth)

## 🚀 Quick Start

### 1. Clone/Download the Project

```powershell
cd d:\rise_research
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure Airtable

See [AIRTABLE_SETUP.md](AIRTABLE_SETUP.md) for detailed instructions:
- Create Personal Access Token
- Set up "Students" and "Classes" tables
- Get your Base ID

### 4. Configure Environment Variables

Edit `.env` file with your credentials:

```env
AIRTABLE_PERSONAL_ACCESS_TOKEN=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_STUDENTS_TABLE=Students
AIRTABLE_CLASSES_TABLE=Classes
PORT=3000
```

### 5. Start the Backend Server

```powershell
npm run dev
```

### 6. Open the Application

Visit: http://localhost:3000/index.html

## 📁 Project Structure

```
rise_research/
├── index.html              # Main application page
├── script.js               # Frontend JavaScript
├── styles.css              # Application styles
├── server.js               # Express backend server
├── package.json            # Node.js dependencies
├── .env                    # Environment variables (gitignored)
├── .env.example            # Template for .env
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── AIRTABLE_SETUP.md       # Airtable configuration guide
└── BACKEND_SETUP.md        # Backend server guide
```

## 🔌 API Endpoints

### GET `/api/health`
Check server status

### GET `/api/students`
Fetch all students from Airtable

### POST `/api/classes`
Create new class records

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for detailed API documentation.

## 🎯 How to Use

1. **Login** with your Google account
2. **Select a student** from the dropdown (loaded from Airtable)
3. **Add class dates** (start with 1, add up to 12)
4. **Add more students** if needed
5. **Submit** to save to Airtable

## 📊 Airtable Structure

### Students Table (Read)
- Student ID
- Name
- Email

### Classes Table (Write)
- Name (Student name)
- Email (Submitter's email)
- Student ID
- Class 1 Date through Class 12 Date

## 🔒 Security

- ✅ API credentials stored server-side only
- ✅ `.env` file gitignored
- ✅ Google OAuth authentication
- ✅ CORS enabled for secure requests
- ✅ No credentials exposed to browser

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify Node.js is installed: `node --version`
- Run `npm install` to ensure dependencies are installed

### Students not loading
- Verify backend server is running
- Check `.env` credentials are correct
- Test API directly: http://localhost:3000/api/students

### Form submission fails
- Check server console for errors
- Verify "Classes" table exists in Airtable
- Ensure column names match exactly

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for more troubleshooting tips.

## 📦 Deployment

### Local Development
```powershell
npm run dev
```

### Production Options
- **Heroku** - Easy deployment with Git
- **Render** - Free tier available
- **Railway** - Simple setup
- **DigitalOcean** - App Platform

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for deployment guides.

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 🆘 Support

For issues and questions:
1. Check the setup guides in this repository
2. Review browser and server console logs
3. Verify Airtable configuration
4. Test API endpoints directly

## 🎓 Resources

- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [Express.js Documentation](https://expressjs.com/)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Node.js Documentation](https://nodejs.org/docs/)
