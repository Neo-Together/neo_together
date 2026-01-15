# Neo Together - 14 Feature Implementation Plan

## IMPLEMENTATION COMPLETE!

All 13 features have been implemented (Feature 14 - zero-access encryption was skipped per user request).

### To Test:
```bash
# 1. Recreate database tables (new columns added)
cd backend
# Drop and recreate tables, or run migrations

# 2. Seed data
python -m app.seed                      # Just interests
python -m app.seed --with-test-users    # Interests + 5 test users

# 3. Start backend
uvicorn app.main:app --reload

# 4. Start frontend
cd ../frontend
npm run dev
```

### New Database Columns (need migration/recreation):
- `users.min_age_preference`, `max_age_preference`, `gender_preferences`
- `users.min_group_size`, `max_group_size`
- `users.email`, `magic_token`, `magic_token_expires`
- New tables: `groups`, `group_members`, `group_join_requests`

---

## Overview

Implementing 13 features (feature 14 skipped per user request) organized into 7 phases by complexity and dependencies.

---

## Phase 1: Quick Wins (No DB changes)

### Feature 3: Location Search Bar
**Files:** `frontend/src/pages/Dashboard.tsx`
- Add Google Places Autocomplete above map
- On selection, pan map to location and zoom to level 14
- Use existing `@react-google-maps/api` Autocomplete

### Feature 4: Available/Away Explanation
**Files:** `frontend/src/pages/Dashboard.tsx`
- Add helper text below toggle: "When Away, all your availability slots are hidden from others"

### Feature 5: Display All Interests (shared + non-shared)
**Files:**
- `backend/app/schemas/matching.py` - Add `other_interests: list[str]`
- `backend/app/routers/discover.py` - Compute non-shared interests
- `frontend/src/pages/Dashboard.tsx` - Show "You both like:" (orange) and "They also like:" (gray)

### Feature 6: Show Gender
**Files:** `frontend/src/pages/Dashboard.tsx`
- Add gender to person display: `{name}, {age}, {gender}`

### Feature 13: Open Source Notice
**Files:**
- Create `frontend/src/components/OpenSourceNotice.tsx`
- Add to Dashboard footer/profile section
- Content: explanation + GitHub link

---

## Phase 2: User Preferences (DB migration)

### Feature 2: Age Range Preference
**Migration:**
```sql
ALTER TABLE users ADD COLUMN min_age_preference INTEGER;
ALTER TABLE users ADD COLUMN max_age_preference INTEGER;
```

**Files:**
- `backend/app/models/user.py` - Add fields
- `backend/app/schemas/user.py` - Add to UserRead/UserUpdate
- `backend/app/routers/users.py` - Add `PATCH /me/preferences`
- `backend/app/routers/discover.py` - Filter by mutual age preferences
- `frontend/src/pages/Dashboard.tsx` - Add preference UI

### Feature 7: Gender Preferences + Sorting
**Migration:**
```sql
ALTER TABLE users ADD COLUMN gender_preferences TEXT[] DEFAULT '{}';
```

**Files:**
- `backend/app/models/user.py` - Add `gender_preferences` array
- `backend/app/routers/discover.py` - Filter + sort by match quality:
  1. Full match (age + gender preferences met)
  2. Partial match
  3. No preferences set

---

## Phase 3: Add Spot Feature

### Feature 1: Allow User to Add Existing Spot
**Files:** `frontend/src/pages/Dashboard.tsx`
- Add "I'll be here too" button in people-at-location section
- Pre-fill newSpot form with selected location's lat/lng/name
- Existing `POST /availability` endpoint works as-is

---

## Phase 4: Tips

### Feature 8: Tips Collection
**Files:**
- Create `frontend/src/components/TipsModal.tsx`
- Add tips icon in Dashboard header

**Tips content:**
- Bubble tea store → "People here likely enjoy bubble tea"
- Soccer field → "Great to find people who want to play soccer"
- Coffee shop → "Perfect for casual meetups"
- General: "Check app regularly for group responses"

---

## Phase 5: Test Data

### Feature 9: Test Profiles
**Files:** `backend/app/seed.py`

Add `seed_test_users()` creating 5 users:
1. Alex (25, male) - Central Park, weekends, hiking/coffee
2. Jordan (30, female) - Brooklyn Coffee, mornings, art/reading
3. Sam (28, non-binary) - Chelsea Park, evenings, sports/gaming
4. Taylor (35, male) - East Village, afternoons, music/food
5. Morgan (23, female) - Midtown, lunch, tech/travel

Run: `python -m app.seed --with-test-users`

---

## Phase 6: Groups (Complex)

### Feature 10: Group Formation
**Migration:**
```sql
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    availability_id INTEGER REFERENCES availabilities(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

ALTER TABLE matches ADD COLUMN group_id INTEGER REFERENCES groups(id);
```

**Files:**
- Create `backend/app/models/group.py` - Group, GroupMember models
- Create `backend/app/schemas/group.py` - GroupRead, GroupMemberRead
- Create `backend/app/routers/groups.py`:
  - `GET /groups` - My groups
  - `POST /groups/{id}/confirm-member` - Confirm join request
- Modify `backend/app/routers/discover.py`:
  - On mutual match → create Group with 2 members
  - Return groups as bundled in people list
  - Express interest targets group
- `frontend/src/pages/Dashboard.tsx`:
  - GroupCard component showing all members
  - "Request to Join Group" button
  - Notification: "You can assume you can join, but group will confirm"

### Feature 11: Group Size Preferences
**Migration:**
```sql
ALTER TABLE users ADD COLUMN min_group_size INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN max_group_size INTEGER DEFAULT 10;
```

**Logic:**
- At max_group_size → group hidden, message: "One member prefers smaller groups"
- Below min_group_size → group marked "tentative"
- Notify when size requirement met

---

## Phase 7: Email Auth

### Feature 12: Magic Link Authentication
**Migration:**
```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN magic_token VARCHAR(255);
ALTER TABLE users ADD COLUMN magic_token_expires TIMESTAMP;
```

**Files:**
- Create `backend/app/utils/email.py` - Send magic link
- `backend/app/routers/auth.py`:
  - `POST /auth/request-magic-link` - Generate token, send email
  - `GET /auth/verify-magic-link?token=x` - Verify, return JWT
- `frontend/src/pages/Login.tsx` - Email input → "Check email" flow
- `frontend/src/pages/Signup.tsx` - Email instead of private key

**Migration path:**
1. Existing users: Prompt to add email
2. Transition: Both email and private key work
3. New users: Email required

---

## Verification Plan

### After Each Phase:
1. Run backend: `uvicorn app.main:app --reload`
2. Run frontend: `npm run dev`
3. Test changed features manually
4. Run existing tests: `pytest` (backend)

### Specific Tests:
- Phase 1: Visual verification in browser
- Phase 2: Create user with preferences, verify filtering
- Phase 3: Add spot via "I'll be here too", verify it appears
- Phase 6: Match two users, verify group forms, test join flow
- Phase 7: Full magic link flow with email

---

## File Summary

**Backend modifications:**
- `backend/app/models/user.py`
- `backend/app/models/group.py` (new)
- `backend/app/schemas/user.py`
- `backend/app/schemas/matching.py`
- `backend/app/schemas/group.py` (new)
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/routers/discover.py`
- `backend/app/routers/groups.py` (new)
- `backend/app/utils/email.py` (new)
- `backend/app/seed.py`

**Frontend modifications:**
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Signup.tsx`
- `frontend/src/components/TipsModal.tsx` (new)
- `frontend/src/components/OpenSourceNotice.tsx` (new)

**Migrations:** 3 Alembic migrations for DB changes
