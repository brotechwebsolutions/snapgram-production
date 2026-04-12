# SnapGram — Production-Ready Social Media Platform

> A full-stack Instagram-like social media platform built with **Java 17 LTS + Spring Boot 3.2** and **React + Vite**.
> Fully configured for deployment on **Render** (backend) and **Vercel** (frontend).

✅ **Java 17 LTS Compatible**  |  ✅ **Production Ready**  |  ✅ **Zero Security Issues**

---

## 🐛 Bugs Fixed in This Version

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `pom.xml` | Malformed `<name>` XML tag | Rewrote with correct tag |
| 2 | `User.java` | `isPrivate/isOnline/isActive` Lombok @Builder conflict | Renamed to `privateAccount/online/active` |
| 3 | `Post.java` | `isPinned` Lombok @Builder conflict | Renamed to `pinned` |
| 4 | `Comment.java` | `isPinned/isDeleted` Lombok @Builder conflict | Renamed to `pinned/deleted` |
| 5 | `Message.java` | `isDeleted` Lombok @Builder conflict | Renamed to `deleted` |
| 6 | `Notification.java` | `isRead` Lombok @Builder conflict | Renamed to `read` |
| 7 | `LoginHistory.java` | `isActive` Lombok @Builder conflict | Renamed to `active` |
| 8 | `AuthService.java` | `EmailService` called but never injected | Added `final EmailService emailService` |
| 9 | `MessageService.java` | Circular dependency crash at startup | Added `@Lazy` on `PostService` injection |
| 10 | `NotificationService.java` | `PageRequest.of(0, Integer.MAX_VALUE)` MongoDB crash | Use `List`-returning repository method |
| 11 | `UserController.java` | `LoginHistoryService` imported but never used | Now properly injected + endpoint added |
| 12 | `JwtUtils.java` | Double Base64 encoding (weak/wrong key) | Use raw UTF-8 bytes directly |
| 13 | `PostService.pinPost()` | Lambda variable capture issue | Extracted `willBePinned` before lambda |
| 14 | All repositories | `@Query` strings used old `isXxx` MongoDB field names | Updated to `pinned/deleted/read` |
| 15 | `Comment/Conversation` models | Missing `@Builder.Default` on List fields → NPE | Added all missing `@Builder.Default` |

### New Features Added
- `SearchService + SearchController` — unified user/post/hashtag search
- `AnalyticsService + AnalyticsController` — post and profile engagement stats
- `RateLimitingFilter` — Bucket4j token-bucket rate limiting
- `AsyncConfig` — thread pool for async email/notification dispatch
- `JacksonConfig` — ISO-8601 date serialization
- `MongoConfig` — explicit MongoDB auditing configuration
- Frontend: Trending hashtags on Search and Explore pages
- Frontend: Analytics panel in Settings page
- Frontend: Proper `useDebounce` and `useInfiniteScroll` hooks

---

## 🚀 Quick Start

### Prerequisites
- **Java 17 LTS** ([Download Eclipse Temurin](https://adoptium.net/temurin/releases/?version=17))
- **Maven 3.9+** (included in IDEs or [download](https://maven.apache.org/download.cgi))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **MongoDB Atlas** ([Free M0 account](https://cloud.mongodb.com/))
- **Cloudinary** ([Free tier](https://cloudinary.com/))
- **Gmail Account** with [App Password enabled](SETUP_GMAIL.md)

### 1. Clone
```bash
git clone https://github.com/your-username/snapgram.git
cd snapgram
```

### 2. Backend Setup
```bash
cd backend

# Verify Java 17 is installed (IMPORTANT!)
java -version
# Should show: openjdk version "17.0.x"

# Copy environment template and customize
cp .env.example .env
# Edit .env with YOUR values (see Environment Variables section below)

# Build and verify compilation
mvn clean compile

# Run tests
mvn clean test

# Start server
mvn spring-boot:run
# Or directly: java -jar target/snapgram-backend-1.0.0.jar
# Starts on http://localhost:8080

# Verify health
curl http://localhost:8080/actuator/health
# Should return: {"status":"UP"}
```

Alternative from repository root:

- Copy root template `.env.backend` values into `backend/.env`
- Run `mvn -f backend/pom.xml clean test-compile`
- Run `mvn -f backend/pom.xml spring-boot:run`

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8080
# VITE_WS_URL=http://localhost:8080/ws

npm install
npm run dev
# Opens at http://localhost:5173
```

Alternative from repository root:

- Copy root template `.env.frontend` values into `frontend/.env`
- Run `npm --prefix frontend install`
- Run `npm --prefix frontend run dev`

---

## ☁️ Deployment

### Backend → Render
1. Push to GitHub (includes updated `Dockerfile` with Java 17)
2. Render Dashboard → **New Web Service** → Connect repo
3. Configure:
   - **Build Command:** `mvn clean package -DskipTests`
   - **Start Command:** `java -jar target/snapgram-backend-1.0.0.jar`
   - **Environment Variables:** Copy all from `.env` into Render dashboard
4. Deploy and monitor logs

**Health check:** `https://your-app.onrender.com/actuator/health` should return `{"status":"UP"}`

**Important:** Free tier sleeps after 15 mins inactivity. Upgrade to Starter ($7/mo) for always-on service.

### Frontend → Vercel
1. Push to GitHub
2. Vercel Dashboard → **New Project** → Import repo → set Root Directory to `frontend/`  
3. **Framework:** Vite (auto-detected)
4. **Environment Variables:**
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
   - `VITE_WS_URL` = `https://your-backend.onrender.com/ws`
5. Deploy
6. **Update Render** → Set `FRONTEND_URL` env var to your Vercel URL → Redeploy

**Full deployment guide:** See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions with screenshots.

---

## 🔐 Environment Variables

### Backend `.env` (Required fields)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/snapgram
MONGODB_DATABASE=snapgram

# JWT (generate strong secret: openssl rand -base64 48)
JWT_SECRET=your-min-32-char-secret-here
JWT_EXPIRATION=86400000       # 24 hours
JWT_REFRESH_EXPIRATION=604800000 # 7 days

# Gmail SMTP (Use Gmail App Password, not account password!)
# Setup: https://myaccount.google.com/apppasswords
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Cloudinary (dashboard.cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# URLs
FRONTEND_URL=http://localhost:5173      # Local dev
BACKEND_URL=http://localhost:8080
PORT=8080

# Security
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=24
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30
MAX_FAILED_ATTEMPTS=5
LOCK_DURATION_MINUTES=30
```

### Frontend `.env` (Required fields)

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080/ws
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/send-otp` | ❌ | Signup step 1: send OTP |
| POST | `/api/auth/verify-otp` | ❌ | Signup step 2: verify OTP |
| POST | `/api/auth/set-password` | ❌ | Signup step 3: complete account |
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/logout` | ✅ | Logout |
| GET | `/api/auth/verify-email?token=` | ❌ | Verify email |
| POST | `/api/auth/resend-verification` | ❌ | Resend signup OTP |
| POST | `/api/auth/forgot-password/link` | ❌ | Send reset link |
| POST | `/api/auth/reset-password/link` | ❌ | Reset by link token |
| POST | `/api/auth/forgot-password` | ❌ | Send reset email |
| POST | `/api/auth/forgot-password/resend` | ❌ | Resend reset OTP |
| POST | `/api/auth/reset-password` | ❌ | Reset password |
| PUT | `/api/auth/change-password` | ✅ | Change password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Current user |
| GET | `/api/users/:username/profile` | Public profile |
| PUT | `/api/users/me` | Update profile |
| POST | `/api/users/:id/follow` | Follow |
| DELETE | `/api/users/:id/follow` | Unfollow |
| POST | `/api/users/:id/block` | Block |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/me/login-history` | Login history |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts` | Create post (multipart) |
| GET | `/api/posts/feed/global` | Global feed |
| GET | `/api/posts/feed/following` | Following feed |
| POST | `/api/posts/:id/like` | Like/unlike |
| POST | `/api/posts/:id/react` | React with emoji |
| POST | `/api/posts/:id/save` | Save/unsave |
| POST | `/api/posts/:id/pin` | Pin post |
| GET | `/api/posts/hashtag/:tag` | Posts by hashtag |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=` | Global search |
| GET | `/api/search/users?q=` | Search users |
| GET | `/api/search/posts?q=` | Search posts |
| GET | `/api/search/trending` | Trending hashtags |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/profile` | Profile stats |
| GET | `/api/analytics/posts` | All posts stats |
| GET | `/api/analytics/posts/:id` | Single post stats |

### WebSocket Topics
| Destination | Direction | Event |
|-------------|-----------|-------|
| `/user/queue/messages` | Server→Client | New message |
| `/user/queue/notifications` | Server→Client | Notification |
| `/user/queue/typing` | Server→Client | Typing indicator |
| `/user/queue/user-updates` | Server→Client | Online status |
| `/app/typing` | Client→Server | Send typing |

---

## 🔧 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `407 Proxy Authentication Required` | Maven behind proxy | Configure `~/.m2/settings.xml` proxy |
| `MongoDB: connection refused` | Wrong URI or IP not whitelisted | Check Atlas network access |
| `JWT signature invalid` | Secret < 32 chars | Make `JWT_SECRET` at least 32 characters |
| `Mail: Authentication failed` | Wrong password | Use Gmail App Password, not account password |
| `Cloudinary upload failed` | Wrong credentials | Verify cloud name, API key, API secret |
| `CORS error` | `FRONTEND_URL` mismatch | Set exact origin URL without trailing slash |
| `BeanCurrentlyInCreationException` | Circular dependency | Already fixed with `@Lazy` on PostService |
| `NullPointerException in @Builder` | Missing `@Builder.Default` | Already fixed on all List/boolean fields |

---

## 📂 Project Structure

```
snapgram/
├── backend/
│   ├── src/main/java/com/snapgram/
│   │   ├── config/          SecurityConfig, WebSocketConfig, Cloudinary, Async, Jackson, Mongo, RateLimiting
│   │   ├── controller/      Auth, User, Post, Comment, Story, Message, Note, Notification, Search, Analytics
│   │   ├── dto/
│   │   │   ├── request/     10 request DTOs
│   │   │   └── response/    11 response DTOs
│   │   ├── exception/       5 exceptions + GlobalExceptionHandler
│   │   ├── model/           11 MongoDB documents
│   │   ├── repository/      11 Spring Data MongoDB repositories
│   │   ├── scheduler/       CleanupScheduler (stories, notes, tokens)
│   │   ├── security/        JWT filter, UserDetails
│   │   ├── service/         13 services
│   │   ├── util/            SecurityUtils
│   │   └── websocket/       WebSocketEventController
│   ├── src/main/resources/application.properties
│   └── pom.xml
│
└── frontend/
    ├── src/
    │   ├── api/             auth, users, posts, messages, stories, notifications, search, analytics
    │   ├── components/      common (Layout, Sidebar, BottomNav, Avatar, Skeletons)
    │   │                    feed (PostCard, CommentsModal, CreatePostModal, PostDetailModal)
    │   │                    profile (EditProfileModal)
    │   │                    stories (StoryBar, StoryViewer, CreateStoryModal)
    │   ├── context/         Auth, Theme, Socket, Notification
    │   ├── hooks/           useInfiniteScroll, useDebounce, useLocalStorage
    │   ├── pages/           15 pages
    │   └── utils/           helpers.js
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vercel.json
```

---

##  Version Info

| Component | Version | Notes |
|-----------|---------|-------|
| **Java** | **17 LTS** ✨ | Production runtime baseline |
| **Spring Boot** | 3.2.5 | Full Java 17 support |
| **Maven** | 3.9.12+ | Required for reliable Java 17 builds |
| **Node.js** | 18+ | For frontend development |
| **React** | 18.2.0 | Latest function components + Hooks |
| **Vite** | 5.2.0 | Modern bundler for fast dev/build |
| **Tailwind CSS** | 3.4.3 | Utility-first CSS framework |

---

## 📝 Support

For issues or questions:
1. Check **Common Issues & Solutions** section above
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment problems
3. See [SETUP_GMAIL.md](SETUP_GMAIL.md) for email OTP issues
4. Check backend logs: `tail -f logs/application.log`
5. Check Render logs: Dashboard → Logs

**Last Updated:** 2026-04-12 (Java 17 Compatibility Finalized)
