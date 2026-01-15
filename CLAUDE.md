# Neo Together - Development Guide

> **IMPORTANT**: Keep this file up to date when making significant changes to models, endpoints, or features.

## Project Overview
A Progressive Web App for facilitating real-world meetups based on shared interests and location/time availability. No in-app messaging - purely about connecting people in person.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with PostGIS (geospatial)
- **ORM**: SQLAlchemy 2.0 (async)
- **Auth**: JWT tokens + Magic link email OR private keys
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
│   │   ├── seed.py              # Seed script for interests + test users
│   │   ├── models/
│   │   │   ├── __init__.py      # Exports all models
│   │   │   ├── user.py          # User, Interest models
│   │   │   ├── availability.py  # Availability model
│   │   │   ├── meetup.py        # MeetupRequest, Meetup models (legacy)
│   │   │   ├── interest_match.py # UserInterest, Match models
│   │   │   └── group.py         # Group, GroupMember, GroupJoinRequest
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # User/Auth schemas
│   │   │   ├── availability.py  # Availability schemas
│   │   │   ├── meetup.py        # Meetup schemas
│   │   │   ├── matching.py      # Discovery/matching schemas
│   │   │   └── group.py         # Group schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # /auth/* - signup, login, magic link
│   │   │   ├── users.py         # /users/* - profile, preferences
│   │   │   ├── interests.py     # /interests - list topics
│   │   │   ├── availability.py  # /availability/* - CRUD
│   │   │   ├── discover.py      # /discover/* - matching
│   │   │   └── groups.py        # /groups/* - group management
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py      # JWT, bcrypt, key generation
│   │       ├── names.py         # Approved names list
│   │       └── email.py         # Magic link email sending
│   ├── migrations/
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
│   │   │   ├── Login.tsx        # Login (email + private key modes)
│   │   │   ├── Signup.tsx       # Multi-step signup (email + private key)
│   │   │   └── Dashboard.tsx    # Main app hub (map, people, groups, matches)
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Nav + header
│   │   │   ├── LocationPicker.tsx # Google Places autocomplete
│   │   │   ├── AvailabilityForm.tsx # Add/edit availability
│   │   │   ├── TipsModal.tsx    # Tips and hints modal
│   │   │   └── OpenSourceNotice.tsx # Open source explanation
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
- `private_key_hash` (SHA256 hash)
- `first_name` (from approved list)
- `birth_year`, `gender`
- `is_available` (global toggle)
- `interests` (M2M → Interest)
- **Preferences:**
  - `min_age_preference`, `max_age_preference` (optional)
  - `gender_preferences` (array of strings)
  - `min_group_size`, `max_group_size` (default 2, 10)
- **Email Auth:**
  - `email` (unique, optional for legacy users)
  - `magic_token`, `magic_token_expires`

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

### Group (Formed on mutual match)
- `id`, `availability_id`, `status`, `created_at`
- Groups auto-form when two users match

### GroupMember
- `id`, `group_id`, `user_id`, `role`, `status`, `joined_at`
- Roles: founder, member
- Status: confirmed, pending, declined

### GroupJoinRequest
- `id`, `group_id`, `user_id`, `status`, `created_at`, `responded_at`
- For users requesting to join existing groups

---

## API Endpoints

### Auth (`/auth`)
- `POST /signup` - Create account with private key
- `POST /signup-with-email` - Create account with email
- `POST /login` - Login with private key, returns JWT
- `POST /request-magic-link` - Send login link to email
- `POST /verify-magic-link` - Verify token, return JWT
- `GET /approved-names` - List of valid first names

### Users (`/users`)
- `GET /me` - Current user profile
- `PATCH /me/availability` - Toggle global availability
- `PATCH /me/preferences` - Update age/gender/group preferences

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
- `GET /locations/{id}/people` - People at location (sorted by preference match)
- `POST /interest` - Express interest (creates Match + Group if mutual)
- `GET /matches` - My matches
- `POST /matches/{id}/propose-time` - Propose meetup time
- `POST /matches/{id}/confirm` - Confirm proposed time
- `GET /interests/sent` - Interests I've expressed

### Groups (`/groups`)
- `GET /` - My groups
- `GET /join-requests` - Pending join requests for my groups
- `POST /{id}/join` - Request to join a group
- `POST /join-requests/{id}/accept` - Accept join request
- `POST /join-requests/{id}/decline` - Decline join request

---

## Key Features

### Discovery & Matching
- **Location search**: Google Places autocomplete to search/jump to locations
- **People sorting**: Sorted by preference match (age + gender) then time overlap
- **Interest display**: Shows "You both like" (shared) and "They also like" (other)
- **"I'll be here too"**: Add yourself to an existing spot with one click

### Groups
- Auto-formed when two users mutually match
- Others can request to join groups
- Group size preferences (min/max) enforced
- Join request accept/decline by any member

### Authentication
- **Email (recommended)**: Magic link sent to email, click to login
- **Private key (legacy)**: 32-char hex key, user must save it

### User Preferences
- Age range (min/max)
- Gender preferences (multi-select)
- Group size comfort (min/max people)

### UI Features
- Tips modal with location-specific and general advice
- Open source notice explaining transparency
- Available/Away toggle with explanation

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
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

# 3. Create tables and seed data
python -c "from app.database import engine, Base; import asyncio; from app.models import *; asyncio.run(engine.run_sync(Base.metadata.create_all))"
python -m app.seed                    # Seed interests only
python -m app.seed --with-test-users  # Seed interests + 5 test users

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
FRONTEND_URL=http://localhost:5173

# Email (optional - magic links printed to console in debug mode)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@neotogether.app
```

### Frontend (.env)
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## Test Users

Run `python -m app.seed --with-test-users` to create:

| Name | Age | Gender | Location | Interests |
|------|-----|--------|----------|-----------|
| Alex | 25 | male | Central Park | Hiking, Coffee, Programming |
| Jordan | 30 | female | Brooklyn Coffee | Photography, Yoga, Travel |
| Sam | 28 | non-binary | Chelsea Piers | Soccer, Video Games, Anime |
| Taylor | 35 | male | East Village | Music, Concerts, Wine |
| Morgan | 23 | female | Bryant Park | AI & ML, Running, Travel |

Private keys are printed to console when seeding.

---

## Key Design Decisions

1. **Dual Auth**: Email magic links (recommended) + private keys (legacy support)
2. **Approved Names**: Limited name list prevents unique names being identifiable
3. **No Messaging**: Forces real-world interaction - the whole point of the app
4. **Manual Matching**: No algorithm - users browse and choose who to meet
5. **Mutual Interest**: Both must express interest before Match is created
6. **Auto Groups**: Groups form automatically on mutual match
7. **Location-First**: Everything revolves around WHERE people want to meet
8. **Open Source**: Full transparency - code is publicly auditable
