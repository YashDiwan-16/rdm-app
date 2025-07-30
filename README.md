# RDM App - Mindful Digital Rewards

A full-stack React Native application with Express.js backend for mindful goal tracking and token rewards.

## Architecture

### Backend (Express.js + TypeScript)
- **Port**: 3001
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens
- **API Endpoints**: RESTful API with CORS support

### Frontend (React Native + Expo)
- **Framework**: Expo Router
- **State Management**: React Context
- **HTTP Client**: Axios with interceptors
- **Storage**: AsyncStorage for persistent authentication

## Features Implemented

### ✅ Authentication System
- User registration and login
- JWT token-based authentication
- Persistent authentication using AsyncStorage
- Automatic token refresh and logout on expiry
- Protected routes with authentication middleware

### ✅ Backend API
- User signup/login endpoints
- JWT middleware for protected routes
- Goals CRUD operations (default and custom goals)
- Wallet system with multiple purses
- Token transfer functionality
- CORS configuration for frontend access

### ✅ Frontend Components
- Login/Signup screens with real API integration
- Dashboard with user information and logout
- Auth context for global state management
- Protected routes with automatic redirects
- Loading states and error handling
- Responsive UI with themed components

### ✅ Database Integration
- Supabase connection established
- User, wallet, and goals tables
- Default goals seeding functionality
- Proper database relationships

## Project Structure

```
rdm-app/
├── backend/
│   ├── src/
│   │   ├── server.ts                 # Express server setup
│   │   ├── middleware/auth.ts        # JWT authentication middleware
│   │   ├── routes/index.ts          # API routes
│   │   └── db/supabase.ts           # Database connection
│   ├── package.json
│   └── .env                         # Environment variables
└── rdm-frontend/
    ├── app/
    │   ├── _layout.tsx              # Root layout with providers
    │   ├── login.tsx                # Login screen
    │   ├── signup.tsx               # Signup screen
    │   └── dashboard.tsx            # Main dashboard
    ├── components/
    │   ├── LoginScreen.tsx          # Login component
    │   ├── SignupScreen.tsx         # Signup component
    │   └── ProtectedRoute.tsx       # Auth route wrapper
    ├── contexts/
    │   └── AuthContext.tsx          # Authentication context
    ├── services/
    │   ├── api.ts                   # Axios configuration
    │   └── apiServices.ts           # API service functions
    ├── hooks/
    │   └── useApi.ts                # Custom API hooks
    └── package.json
```

## Setup Instructions

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment variables are already configured in `.env`:
   - PORT=3001
   - SUPABASE_URL and SUPABASE_KEY
   - JWT_SECRET

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd rdm-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/signup` - User registration
- `POST /api/login` - User login

### Goals
- `GET /api/goals` - Get user's goals (default + custom) [Protected]
- `GET /api/goals/default` - Get default goals [Public]
- `POST /api/goals/custom` - Create custom goal [Protected]
- `POST /api/goals/complete` - Mark goal as complete [Protected]
- `POST /api/goals/seed` - Seed default goals [Development]

### Wallet
- `GET /api/wallet` - Get user's wallet [Protected]
- `POST /api/wallet/transfer` - Transfer tokens [Protected]

## Testing the Connection

### Test User Credentials
- Email: `demo@rdmapp.com`
- Password: `demo123`

### Manual API Testing
```bash
# Test signup
curl -X POST http://localhost:3001/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Test login
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@rdmapp.com", "password": "demo123"}'

# Test protected endpoint (replace TOKEN with actual token)
curl -X GET http://localhost:3001/api/goals \
  -H "Authorization: Bearer TOKEN"
```

## Key Technologies

### Backend
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Supabase**: Database and authentication
- **JWT**: Token-based authentication
- **bcryptjs**: Password hashing
- **CORS**: Cross-origin resource sharing

### Frontend
- **React Native**: Mobile app framework
- **Expo**: Development platform
- **Expo Router**: File-based routing
- **Axios**: HTTP client
- **AsyncStorage**: Local storage
- **TypeScript**: Type safety

## Authentication Flow

1. User enters credentials on login screen
2. Frontend sends POST request to `/api/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token in AsyncStorage
5. Token automatically included in subsequent API requests
6. Protected routes redirect unauthenticated users to login
7. Token expiry triggers automatic logout

## Next Steps

To continue development, consider implementing:

1. **Wallet Integration**: Update frontend to match backend wallet structure
2. **Goal Completion**: Add UI for completing goals and earning tokens
3. **Token Transfers**: Implement send tokens and charity donation features
4. **Real-time Updates**: Add WebSocket support for live updates
5. **Push Notifications**: Remind users about their goals
6. **Goal Analytics**: Track progress and statistics
7. **Social Features**: Share achievements with friends

The foundation is now complete with a fully connected backend and frontend, persistent authentication, and a working API structure ready for feature expansion.
