# Neo Together - Development Guide

## Project Overview
A Progressive Web App for facilitating real-world meetups based on shared interests and location/time availability. No in-app messaging - purely about connecting people in person.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with PostGIS (geospatial)
- **ORM**: SQLAlchemy 2.0 (async)
- **Auth**: JWT tokens with bcrypt-hashed private keys
- **Migrations**: Alembic

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand (client) + React Query (server)
- **Maps**: Google Maps + Places API

---

## Project Structure

```
neo_together/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # Async SQLAlchemy setup
│   │   ├── dependencies.py      # Auth middleware (get_current_user)
│   │   ├── seed.py              # Seed script for interests
│   │   ├── models/
│   │   │   ├── __init__.py      # Exports all models
│   │   │   ├── user.py          # User, Interest models
│   │   │   ├── availability.py  # Availability model
│   │   │   ├── meetup.py        # MeetupRequest, Meetup models
│   │   │   └── interest_match.py # UserInterest, Match models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # User/Auth schemas
│   │   │   ├── availability.py  # Availability schemas
│   │   │   ├── meetup.py        # Meetup schemas
│   │   │   └── matching.py      # Discovery/matching schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # /auth/* - signup, login
│   │   │   ├── users.py         # /users/* - profile
│   │   │   ├── interests.py     # /interests - list topics
│   │   │   ├── availability.py  # /availability/* - CRUD
│   │   │   └── discover.py      # /discover/* - matching
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py      # JWT, bcrypt, key generation
│   │       └── names.py         # Approved names list
│   ├── migrations/
│   │   ├── env.py               # Alembic async config
│   │   ├── script.py.mako
│   │   └── versions/            # Migration files
│   ├── tests/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router + providers
│   │   ├── main.tsx             # Entry point
│   │   ├── index.css            # Tailwind imports
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing page
│   │   │   ├── Login.tsx        # Login form
│   │   │   ├── Signup.tsx       # Multi-step signup
│   │   │   ├── Browse.tsx       # Map + discovery
│   │   │   ├── Availability.tsx # Manage availability
│   │   │   ├── Meetups.tsx      # Matches + scheduling
│   │   │   └── Profile.tsx      # User profile
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Nav + header
│   │   │   ├── LocationPicker.tsx # Google Places autocomplete
│   │   │   └── AvailabilityForm.tsx # Add/edit availability
│   │   └── stores/
│   │       └── auth.ts          # Zustand auth store
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── docker-compose.yml           # PostgreSQL + PostGIS
└── README.md                    # Original vision doc
```

---

## Database Models

### User
- `id` (UUID, PK)
- `private_key_hash` (bcrypt hash)
- `first_name` (from approved list)
- `birth_year`, `gender`
- `is_available` (global toggle)
- `interests` (M2M → Interest)

### Interest (Topics/Hobbies)
- `id`, `name`, `category`
- Seeded with ~50 interests across categories

### Availability
- `id`, `user_id` (FK → User)
- `location_name`, `latitude`, `longitude`, `location` (PostGIS)
- `radius_meters` (optional)
- `time_start`, `time_end` (HH:MM strings)
- `repeat_days` (array of 0-6 for Mon-Sun)
- `is_active`

### UserInterest (Expressing interest in meeting someone)
- `id`, `requester_id`, `target_id`, `availability_id`
- Unique constraint on (requester, target, availability)

### Match (Mutual interest)
- `id`, `user1_id`, `user2_id`, `availability_id`
- `status`: pending → time_proposed → confirmed
- `proposed_datetime`, `proposed_by_id`, `confirmed_at`

### MeetupRequest / Meetup (Legacy - not actively used)
- Original design before Match model
- Can be removed or repurposed

---

## API Endpoints

### Auth (`/auth`)
- `POST /signup` - Create account, returns private key
- `POST /login` - Returns JWT token
- `GET /approved-names` - List of valid first names

### Users (`/users`)
- `GET /me` - Current user profile
- `PATCH /me/availability` - Toggle global availability

### Interests (`/interests`)
- `GET /` - List all interest topics

### Availability (`/availability`)
- `GET /` - My availability slots
- `POST /` - Create slot
- `GET /{id}` - Get slot
- `PATCH /{id}` - Update slot
- `DELETE /{id}` - Delete slot

### Discovery (`/discover`)
- `GET /locations` - Locations with people counts
- `GET /locations/{id}/people` - People at location + overlap info
- `POST /interest` - Express interest (creates Match if mutual)
- `GET /matches` - My matches
- `POST /matches/{id}/propose-time` - Propose meetup time
- `POST /matches/{id}/confirm` - Confirm proposed time
- `GET /interests/sent` - Interests I've expressed

---

## User Flows

### 1. Signup
1. Enter name (from approved list) + birth year + gender
2. Select interests (fetched from `/interests`)
3. System generates private key (shown once!)
4. User saves key, proceeds to login

### 2. Login
1. Enter name + private key
2. System verifies against bcrypt hash
3. Returns JWT token (stored in Zustand + localStorage)

### 3. Set Availability
1. Click "Add Availability Slot"
2. Search for location (Google Places Autocomplete)
3. Set time range + repeat days
4. Save → stored with PostGIS coordinates

### 4. Discover People
1. Map shows markers at locations with people
2. Click marker → see list of people there
3. Each person shows: name, age, interests, time overlap
4. "Express Interest" button

### 5. Matching
1. Express interest → check for mutual interest
2. If mutual → Match created, both notified
3. One proposes time → other confirms
4. Meetup confirmed!

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)
- Google Cloud API key (Maps + Places APIs)

### Setup

```bash
# 1. Start database
docker compose up -d

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

# 3. Create tables and seed data
python -c "from app.database import engine, Base; import asyncio; from app.models import *; asyncio.run(engine.run_sync(Base.metadata.create_all))"
python -m app.seed

# 4. Start backend
uvicorn app.main:app --reload
# API at http://localhost:8000
# Docs at http://localhost:8000/docs

# 5. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Add your VITE_GOOGLE_MAPS_API_KEY

# 6. Start frontend
npm run dev
# App at http://localhost:5173
```

---

## Environment Variables

### Backend (.env)
```
DEBUG=true
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/neo_together
SECRET_KEY=your_secret_key_here  # openssl rand -hex 32
```

### Frontend (.env)
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## Completed Milestones

- [x] **Milestone 1**: Foundation - Project setup, database, basic structure
- [x] **Milestone 2**: Authentication - Private key system, JWT tokens
- [x] **Milestone 3**: Profile & Interests - Interest selection, profile viewing
- [x] **Milestone 4**: Availability System - Location picker, time/day scheduling
- [x] **Milestone 5**: Discovery & Matching - Map browse, express interest, mutual matching
- [x] **Milestone 6 & 7**: Meetup Requests - Merged into Match flow (propose/confirm time)
- [ ] **Milestone 8**: PWA & Polish - Service worker, offline support, install prompt (IN PROGRESS)

---

## Next Steps (Milestone 8)

1. Install `vite-plugin-pwa` ✓ (installed, not configured)
2. Configure PWA manifest with app icons
3. Set up service worker for offline caching
4. Add install prompt component
5. Test mobile responsiveness
6. (Future) Push notifications for matches

---

## Deferred Features

- **Rating System**: Thumbs up/down after meetups
- **Anti-gaming**: Preventing fake accounts/ratings
- **No-show handling**: Reporting/penalties
- **Push notifications**: Real-time match alerts

---

## Key Design Decisions

1. **Private Key Auth**: No email/password for privacy. Users save a generated key.
2. **Approved Names**: Limited name list prevents unique names being identifiable.
3. **No Messaging**: Forces real-world interaction - the whole point of the app.
4. **Manual Matching**: No algorithm - users browse and choose who to meet.
5. **Mutual Interest**: Both must express interest before seeing each other as a "match".
6. **Location-First**: Everything revolves around WHERE people want to meet.
