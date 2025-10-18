# SC Backend - AI Coding Instructions

## Architecture Overview

This is a **sports connection platform backend** built with Express.js and Supabase, featuring a **multi-profile system** where users can be athletes, agents, or teams. The app uses JWT authentication, Stripe subscriptions, and a swipe-based matching system similar to dating apps but for sports networking.

### Core Data Model

- **Three profile types**: `athlete`, `agent`, `team` (separate tables, each linked to `users` via `user_id`)
- **Profile completion is mandatory**: Users sign up with email/password (or Google OAuth), then must call `/auth/complete-profile` with `profileType` to create their specific profile
- **Sport-based segregation**: Swipe interactions only work between users in the same sport (`sport_id` validation)
- **Matching system**: Bidirectional likes create entries in `match` table via `match_state` lookups

## Authentication & Authorization Patterns

### JWT Flow
```javascript
// All protected routes use middleware chain:
verifyToken → (optional: isAdmin or canAccessResource)

// Token payload structure:
{ id: user.id, email: user.email, role: user.role }
```

### Profile Completion Requirements
When implementing `/auth/complete-profile`, **validate `profileType`** against `['athlete', 'agent', 'team']` and ensure:
- `athlete`: requires `name`, `last_name`, `birthdate`, `height`, `weight`, `location_id`, `sport_id`, `phone_number` (optionals: `ig_user`, `x_user`, `description`)
- `agent`: requires `name`, `last_name`, `description`, `location_id`, `sport_id`, `phone_number` (optionals: `ig_user`, `x_user`, `agency`)
- `team`: requires `name`, `job`, `description`, `sport_id`, `location_id`, `phone_number` (optionals: `ig_user`, `x_user`)

**Always validate foreign keys** (`location_id`, `sport_id`) exist in their respective tables before insertion.

## Supabase Query Patterns

### Standard Supabase Client Initialization
Every controller starts with:
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
```

### Common Query Patterns
- **Nested selects for relationships**: Use column aliases with foreign key syntax
  ```javascript
  .select('*, location:location_id(*), sport:sport_id(*)')
  ```
- **Single result queries**: Always add `.single()` at the end
- **Error handling**: Check `error` object from Supabase responses, especially for unique constraint violations (`error.code === '23505'`)

### Profile Lookup Helper Pattern
When determining user's profile type (see `swipeController.js` and `profileController.js`):
```javascript
async function getUserProfileType(user_id) {
  // Check athlete → team → agent tables sequentially
  // Return { type: 'athlete|team|agent', profile: data }
}
```

## Controller Response Conventions

### Success Responses
- **200 OK**: Standard retrieval → `res.json(data)` or `{ message: "...", data: ... }`
- **201 Created**: After insertion → `{ message: "Created successfully", [entity]: newData }`

### Error Responses
- **400 Bad Request**: Missing/invalid fields → `{ message: "...", missingFields: [...] }`
- **401 Unauthorized**: Invalid JWT → `{ message: "Invalid token" }`
- **403 Forbidden**: Insufficient permissions → `{ message: "Requires admin privileges" }` or `{ message: "Access denied" }`
- **404 Not Found**: Resource doesn't exist → `{ message: "... not found" }`
- **500 Internal Server Error**: Catch-all → `{ message: error.message }`

**Always return specific error details** (e.g., list missing fields) rather than generic messages.

## Swipe/Matching Business Logic

### Critical Rules (see `swipeController.js`)
1. **Same sport validation**: `swiper` and `swiped` users must have matching `sport_id`
2. **No self-swipes**: Validate `swiper_user_id !== swiped_user_id`
3. **One interaction per pair**: Check for existing `swipes` record before insertion
4. **Match creation**: On "like" action, query for reciprocal like:
   ```javascript
   // If reciprocal like exists:
   await supabase.from('swipes').select('*')
     .eq('swiper_user_id', swiped_user_id)
     .eq('swiped_user_id', swiper_user_id)
     .eq('action', 'like')
   
   // Then lookup match_state and create match entry
   ```

## File Upload (Profile Photos)

Uses **Multer + Supabase Storage**:
- Storage bucket: `profile_photos`
- Upload pattern: `profilePhotoController.js` handles multipart uploads
- Store URL in profile table's `photo_url` column
- **Always cleanup**: Delete old photo from storage before uploading new one

## Google Maps Integration

### Venues Controller
- Uses `@googlemaps/google-maps-services-js` for nearby venue searches
- **Caching strategy**: Store results in `sports_venues` table for 24 hours (`last_updated` check)
- Query types: `['gym', 'stadium', 'sports_complex']`
- Upserts venues with `place_id` as conflict key

## Environment Variables

Required `.env` keys:
```env
SUPABASE_URL, SUPABASE_ANON_KEY
JWT_SECRET, JWT_EXPIRES_IN
PORT (defaults to 3000)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL (OAuth)
GOOGLE_MAPS_API_KEY (venues feature)
STRIPE_SECRET_KEY (subscriptions)
```

**Security note**: Never commit `.env`. Generate production `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development Workflow

### Running Locally
```bash
npm run dev  # Uses nodemon for hot reload
npm start    # Production mode
```

### Testing Endpoints
- Documented in `endpoints.txt` with full request/response examples
- Use `testing-guide.txt` for step-by-step Postman/Thunder Client setup
- **Auth flow**: Signup → Login (get token) → Complete profile → Access protected routes

## Common Pitfalls

1. **Profile updates**: Always exclude `id`, `user_id`, `created_at`, and `role` from update payloads
2. **Password hashing**: Use `bcrypt.hash(password, 10)` before storing (10 rounds)
3. **Admin routes**: ALL routes under `/admin` require `verifyToken, isAdmin` middleware
4. **CORS**: Development allows `localhost:5173` and `localhost:3000`; update `corsOptions` in `index.js` for production
5. **Foreign key validation**: Always verify referenced IDs exist before insertion/update operations

## Project Structure Conventions

- **Controllers**: Business logic + Supabase queries
- **Routes**: Express router with middleware chains only
- **Middleware**: `auth.js` contains `verifyToken`, `isAdmin`, `canAccessResource`
- **No config folder**: Environment variables accessed directly via `process.env`
