# ThinkLink - Meetup & Event Management Platform

ThinkLink is a modern web application that allows users to create, discover, and join meetups and events. Users can browse events by topic, join discussions, and connect with like-minded people.

## Features

- 🎯 **Create & Join Meetups**: Host your own events or join existing ones
- 🏷️ **Topic-based Discovery**: Browse events by categories and interests  
- 💬 **Event Chat**: Communicate with other participants
- 👤 **User Profiles**: Manage your profile and track your events
- 📱 **Responsive Design**: Works great on desktop and mobile
- 🔐 **Secure Authentication**: User registration and login system

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with sessions
- **Build Tool**: Vite
- **Deployment**: Ready for platforms like Vercel, Railway, or Render

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL database** (local or cloud-hosted)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Navigate to your project directory
cd "ThinkLink (replit)"

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/thinklink"

# Session Secret (use a long, random string)
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# Environment
NODE_ENV="development"

# Port (optional - defaults to 5000)
PORT=5000
```

**Important**: Replace the `DATABASE_URL` with your actual PostgreSQL connection string.

### 3. Set Up Database

```bash
# Push database schema to your PostgreSQL database
npm run db:push
```

### 4. Run the Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`

## Database Setup Options

### Option 1: Local PostgreSQL
1. Install PostgreSQL on your computer
2. Create a database named `thinklink`
3. Use connection string: `postgresql://username:password@localhost:5432/thinklink`

### Option 2: Cloud Database (Recommended)
Use a cloud PostgreSQL service like:
- **Neon** (free tier available): https://neon.tech
- **Supabase** (free tier available): https://supabase.com
- **Railway** (free tier available): https://railway.app

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

## Project Structure

```
ThinkLink/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Backend Express application
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── package.json           # Dependencies and scripts
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deploy to Railway

1. Connect your GitHub repo to Railway
2. Add a PostgreSQL database service
3. Set environment variables
4. Deploy!

### Deploy to Render

1. Connect your GitHub repo to Render
2. Create a PostgreSQL database
3. Set environment variables
4. Deploy!

## Environment Variables for Production

For production deployment, make sure to set:

```env
DATABASE_URL="your-production-database-url"
SESSION_SECRET="a-very-long-random-string-for-production"
NODE_ENV="production"
```

## Troubleshooting

### Common Issues

1. **Database connection errors**: Make sure your `DATABASE_URL` is correct and the database is accessible
2. **Port already in use**: Change the `PORT` in your `.env` file
3. **Build errors**: Run `npm run check` to see TypeScript errors

### Getting Help

If you encounter issues:
1. Check the console for error messages
2. Verify your environment variables are set correctly
3. Make sure your database is running and accessible
4. Try deleting `node_modules` and running `npm install` again

## Contributing

This project was generated with AI assistance and is ready for customization and enhancement. Feel free to modify it according to your needs!

## License

MIT License - feel free to use this project for personal or commercial purposes.
