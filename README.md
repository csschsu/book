# Community Booking (`org.community.booking`)

A full-stack facility and resource booking system designed with a decoupled **Single Page Application (SPA) + REST API** architecture.

## Technology Stack & Architecture

```
┌─────────────────────────────────┐       HTTP / REST (JSON + JWT)       ┌─────────────────────────────────┐
│     Frontend (React + Vite)     │ ◄──────────────────────────────────► │    Backend (Spring Boot + Java) │
│ • TypeScript                    │                                      │ • Spring Security (JWT)         │
│ • React Big Calendar + Moment   │                                      │ • JDBI / JDBC DAO               │
│ • Custom CSS Design System      │                                      │ • SQLite Database               │
└─────────────────────────────────┘                                      └─────────────────────────────────┘
```

### Backend (`bookingweb`)
* **Core Framework**: **Java 25** with **Spring Boot**, packaged as a multi-module Maven project.
* **Security & Auth**:
  * **Spring Security** with stateless **JWT (JSON Web Token)** authentication (`io.jsonwebtoken / jjwt`).
  * **BCrypt** password hashing for secure credentials.
  * Role-Based Access Control (**RBAC**) differentiating administrators (`BOOKADMIN`) and regular users (`BOOKUSER`).
* **Database & Persistence**:
  * **SQLite** embedded database via `sqlite-jdbc` and `JDBI`.
  * Custom Data Access Object (`BookingDao`) handling optimized SQL queries, joins, and schema evolution.
* **API Design & Validation**:
  * RESTful controllers (`BookController.java`) supporting ISO-8601 datetime serialization (`LocalDateTime`).
  * Centralized exception handling (`BookException`) translating business rules into HTTP status codes.
* **Testing & Seeding**:
  * **JUnit 5** automated unit and integration tests.
  * Dedicated test data generators (`TestDataGenerator.java`) for initializing demo users, locations, assets, and free slots.

### Frontend (`bookingapp`)
* **Core Framework**: **React 18** paired with **TypeScript** for strict type safety.
* **Build Tool**: **Vite** providing fast Hot Module Replacement (HMR) and optimized client bundling.
* **Calendar & Date Handling**:
  * **React Big Calendar** (`react-big-calendar`) adapted with Swedish localization (weekdays, months, 24-hour timeline 09:00–22:00).
  * **Moment.js** for date calculations, format conversions, and strict Swedish 24-hour datetime handling.
* **UI & Styling**:
  * Custom CSS design system using CSS variables (`--primary`, `--radius`, `--shadow`, etc.) for responsive cards, modals, alerts, and tables.
  * Native calendar picker integration (`<input type="date">`) combined with 24-hour time controls and `<datalist>` time presets.
  * **Lucide React** (`lucide-react`) for icons.
* **API Communication**:
  * Typed client service layer (`api.ts`) using the native Fetch API with automatic JWT Bearer token management in `localStorage`.

### Core Business Domain
* **Locations & Assets**: Multi-location support (e.g., sports facilities) hosting bookable resources (e.g., courts, rooms).
* **Availability Management**: Administrative management of free time blocks for resources (`FreePage.tsx`).
* **Bookings**: User reservation of time slots within free blocks, with real-time calendar visualization and backend overlap/conflict prevention (`BookPage.tsx`).

---

## Commands & Getting Started

### Database & Test Data
Recreate the SQLite database and seed initial test data:
```bash
cd bookingweb
mvn test-compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"
mvn test-compile exec:java -Dexec.mainClass="org.community.function.GenerateFreeYearTest"
```

### Start Backend (Spring Boot)
```bash
cd bookingweb
./mvnw spring-boot:run
```

### Start Frontend (React App)
```bash
cd bookingapp
npm run dev
```
