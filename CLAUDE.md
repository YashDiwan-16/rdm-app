# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RDM App is a full-stack mindful digital rewards application built with React Native (Expo) frontend and Node.js/Express backend. The app helps users track mindful goals and earn digital tokens as rewards.

**Tech Stack:**
- **Frontend**: React Native + Expo Router, TypeScript, Axios
- **Backend**: Express.js + TypeScript, Supabase (PostgreSQL)
- **Authentication**: JWT tokens with AsyncStorage persistence
- **Database**: Supabase with users, wallets, goals, transactions tables

## Development Commands

### Backend Development
```bash
cd backend
npm install              # Install dependencies
npm run dev             # Start development server with hot reload (port 3001)
npm run build           # Compile TypeScript to JavaScript
npm start               # Run production build
```

### Frontend Development
```bash
cd rdm-frontend
npm install              # Install dependencies  
npm start               # Start Expo development server
expo start              # Alternative command
npm run android         # Run on Android emulator/device
npm run ios             # Run on iOS simulator/device
npm run web             # Run in web browser
npm run lint            # Run ESLint for code quality
```

### Additional Frontend Commands
```bash
npm run reset-project   # Reset to blank project template
eas build              # Build for production (requires EAS setup)
```

## Architecture Overview

### Backend Architecture
- **Entry Point**: `backend/src/server.ts` - Express server with CORS configuration
- **API Routes**: `backend/src/routes/index.ts` - All API endpoints including auth, goals, wallet
- **Database**: `backend/src/db/supabase.ts` - Supabase client configuration
- **Authentication**: `backend/src/middleware/auth.ts` - JWT verification middleware
- **Port**: 3001 with network accessibility (0.0.0.0)

### Frontend Architecture
- **Routing**: File-based routing with Expo Router
- **State Management**: React Context for authentication (`contexts/AuthContext.tsx`)
- **API Layer**: Axios instance with interceptors (`services/api.ts` and `services/apiServices.ts`)
- **Storage**: AsyncStorage for token persistence
- **Entry Point**: `app/_layout.tsx` wraps app with AuthProvider

### Key Components Structure
```
rdm-frontend/
├── app/                    # File-based routes
│   ├── _layout.tsx        # Root layout with auth provider
│   ├── login.tsx          # Login screen
│   ├── signup.tsx         # Signup screen  
│   ├── dashboard.tsx      # Main dashboard
│   └── (tabs)/            # Tab navigation
├── components/            # Reusable UI components
├── contexts/             # React contexts (auth)
├── services/             # API configuration and calls
└── hooks/                # Custom React hooks
```

## Database Schema

### Core Tables
- **users**: User accounts with email/password
- **wallets**: Three-purse system (base_purse, reward_purse, remorse_purse)
- **goals**: Default system goals and custom user goals
- **user_goals**: Goal completion tracking
- **transactions**: Token transfer history

### Wallet System
- **Base Purse**: Earned tokens from completed goals
- **Reward Purse**: Tokens for self-rewards  
- **Remorse Purse**: Tokens for charitable donations
- Users can transfer tokens between their own purses or to other users

## API Endpoints

### Authentication
- `POST /api/signup` - User registration with wallet creation
- `POST /api/login` - User login returning JWT token

### Goals (Protected routes require Authorization header)
- `GET /api/goals` - Get user's visible goals with claim status
- `GET /api/goals/default` - Get default goals (public)
- `POST /api/goals/custom` - Create custom goal
- `POST /api/goals/complete` - Mark goal complete and award tokens
- `POST /api/goals/seed` - Seed default goals (development)

### Wallet (Protected routes)
- `GET /api/wallet` - Get user's wallet details
- `GET /api/wallet/balance` - Get purse balances
- `POST /api/wallet/transfer` - Transfer tokens (self-transfer or peer-to-peer)

## Development Workflow

### Network Configuration
- Backend runs on `0.0.0.0:3001` for network access
- Frontend API client auto-detects development IP (`192.168.0.3` currently configured)
- CORS configured for multiple origins including local IPs and Expo URLs

### Authentication Flow
1. User credentials → JWT token from backend
2. Token stored in AsyncStorage for persistence  
3. Axios interceptor adds Bearer token to requests
4. Protected routes redirect to login if unauthenticated
5. Auto-logout on token expiry (401 responses)

### Goal Completion System
1. User claims goal completion
2. System checks if already claimed
3. Records completion in user_goals table
4. Awards associated_tokens to base_purse
5. Returns success with token award info

## Code Conventions

### TypeScript Configuration
- Strict mode enabled in both frontend and backend
- Frontend extends Expo's TypeScript base config
- Backend compiles to `dist/` directory

### Error Handling
- Backend returns structured error responses
- Frontend AuthContext handles specific error cases
- Axios interceptors manage auth errors globally
- AsyncStorage failures are handled gracefully

### Development Tools
- Backend uses ts-node-dev for hot reload
- Frontend uses Expo's fast refresh
- ESLint configured with Expo rules
- No test suite currently configured

## Environment Setup

### Required Environment Variables (Backend)
```
PORT=3001
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_key>  
JWT_SECRET=<your_jwt_secret>
```

### IP Configuration
Update `rdm-frontend/services/api.ts` line 9 with your development machine's IP address for physical device testing.

## Important Notes

- Default goals include meditation, hydration, reading, walking, gratitude
- Token transfers support both self-transfers between purses and peer-to-peer
- Wallet creation is automatic during user signup
- JWT tokens expire in 7 days
- All database operations use Supabase client with proper error handling