# Community Booking System – Instruktion att bygga från grunden

**Datum:** 2026-09-21  
**Projekt:** Community Resource Booking (org.community.booking)  
**Syfte:** Steg-för-steg-instruktion för att bygga hela bokningssystemet från noll.

---

## Systembeskrivning

Ett webbaserat bokningssystem där:

- **Platser (Locations)** äger **resurser (Assets)** via en kopplingspost (**AssetLocation**).
- En **BOOKADMIN** registrerar lediga tider (`free`) för resurser.
- Alla besökare (öppen åtkomst) kan se lediga och bokade tider i en kalender.
- Inloggade användare med rollen **BOOKUSER** eller **BOOKADMIN** kan boka en tid (`booked`).
- JWT-token används för autentisering (stateless REST API).

### Arkitektur

```
book/                          (rotprojekt)
├── pom.xml                    (Maven multi-modul, parent)
├── spring.properties          (databaskonfiguration, hemligheter)
├── booking_system.db          (SQLite-databas, skapas automatiskt)
├── bookingweb/                (Java/Spring Boot REST-backend, port 8080)
│   ├── pom.xml
│   └── src/main/java/org/community/booking/
│       ├── AssetApplication.java      (Spring Boot main)
│       ├── Book.java                  (affärslogik, DAO)
│       ├── BookController.java        (REST-controller)
│       ├── BookException.java         (valideringsfel)
│       ├── Models.java                (datamodeller)
│       ├── JsonAddressMapper.java     (JSON-mapper för adressfält)
│       ├── config/
│       │   └── JdbiConfig.java          (JDBI/SQLite-konfiguration)
│       └── security/
│           ├── SecurityConfig.java          (Spring Security, CORS, JWT-filter)
│           ├── AuthController.java          (POST /login, POST /logout)
│           ├── AuthDtos.java                (LoginRequest, LoginResponse)
│           ├── JwtService.java              (generera/validera JWT)
│           ├── JwtAuthenticationFilter.java (Bearer-filter)
│           ├── CustomUserDetailsService.java(ladda användare från DB)
│           └── UserPrincipal.java           (Spring Security principal)
└── bookingapp/                (React/TypeScript frontend, port 5173)
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx                   (React entrypoint)
        ├── App.tsx                    (root-komponent)
        ├── index.css                  (global CSS + BigCalendar-styling)
        ├── StartPage.tsx              (nav, state-hantering, sidval)
        ├── services/
        │   ├── api.ts                 (alla API-anrop)
        │   └── momentSv.ts            (Moment.js, svensk lokalisering)
        ├── types/
        │   └── models.ts              (TypeScript-gränssnitt)
        └── book/, free/, login/       (sidkomponenter)
```

---

## Del 1 – Backend (Java / Spring Boot)

### Steg 1.1 – Förutsättningar

- Java 25 (eller 21+)
- Maven 3.9+
- Node.js 18+ och npm

### Steg 1.2 – Skapa Maven multi-modul projekt

**Rotkatalog `book/`**

Skapa `book/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.community</groupId>
  <artifactId>booking</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>pom</packaging>
  <name>booking</name>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.0</version>
    <relativePath />
  </parent>

  <properties>
    <maven.compiler.release>25</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <jdbi.version>3.51.0</jdbi.version>
    <sqlite.version>3.51.1.0</sqlite.version>
    <jsonwebtoken.version>0.11.5</jsonwebtoken.version>
    <lombok.version>1.18.40</lombok.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <modules>
    <module>bookingweb</module>
  </modules>
</project>
```

Skapa `book/spring.properties` (databaskonfiguration, läses av backend och tester):

```properties
spring.datasource.url=jdbc:sqlite:booking_system.db?foreign_keys=true
database.file=booking_system.db
# Valfritt: JWT-hemlighet och giltighetstid
# jwt.secret=minst32teckenHemligNyckel!MinstSå
# jwt.expiration=86400000
```

### Steg 1.3 – `bookingweb/pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <parent>
    <groupId>org.community</groupId>
    <artifactId>booking</artifactId>
    <version>1.0-SNAPSHOT</version>
  </parent>
  <artifactId>bookingweb</artifactId>
  <packaging>war</packaging>

  <dependencies>
    <!-- Spring Boot Web -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-tomcat</artifactId><scope>provided</scope></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-devtools</artifactId><scope>runtime</scope><optional>true</optional></dependency>

    <!-- Spring Security -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>

    <!-- JWT (jjwt 0.11.5) -->
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>${jsonwebtoken.version}</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>${jsonwebtoken.version}</version><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>${jsonwebtoken.version}</version><scope>runtime</scope></dependency>

    <!-- JDBI 3 (jdbi3-core, jdbi3-sqlobject, jdbi3-jackson2 version 3.51.0) -->
    <dependency><groupId>org.jdbi</groupId><artifactId>jdbi3-core</artifactId><version>${jdbi.version}</version></dependency>
    <dependency><groupId>org.jdbi</groupId><artifactId>jdbi3-sqlobject</artifactId><version>${jdbi.version}</version></dependency>
    <dependency><groupId>org.jdbi</groupId><artifactId>jdbi3-jackson2</artifactId><version>${jdbi.version}</version></dependency>

    <!-- SQLite JDBC (3.51.1.0) -->
    <dependency><groupId>org.xerial</groupId><artifactId>sqlite-jdbc</artifactId><version>${sqlite.version}</version></dependency>

    <!-- Jackson (jackson-core, jackson-databind, jackson-datatype-jsr310) -->
    <dependency><groupId>com.fasterxml.jackson.core</groupId><artifactId>jackson-databind</artifactId></dependency>
    <dependency><groupId>com.fasterxml.jackson.datatype</groupId><artifactId>jackson-datatype-jsr310</artifactId></dependency>

    <!-- Lombok -->
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>

    <!-- Test -->
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
      <!-- Exec plugin för att köra TestDataGenerator -->
      <plugin>
        <groupId>org.codehaus.mojo</groupId><artifactId>exec-maven-plugin</artifactId><version>3.6.4</version>
        <configuration><classpathScope>test</classpathScope><mainClass>org.community.booking.TestDataGenerator</mainClass></configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

### Steg 1.4 – `application.properties`

`bookingweb/src/main/resources/application.properties`:

```properties
spring.config.import=optional:classpath:spring.properties
spring.main.banner-mode=OFF
logging.level.jdbc=OFF
logging.level.org.community.booking=DEBUG
```

### Steg 1.5 – SQLite-databasschema

SQLite-tabeller skapas av `TestDataGenerator`. Schemat:

```sql
CREATE TABLE user (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,           -- BCrypt-hashat
  code        INTEGER DEFAULT 0,
  createtime  TEXT NOT NULL,           -- ISO-8601
  role        TEXT NOT NULL,           -- "BOOKADMIN", "BOOKUSER", "BOOKUSER,BOOKADMIN"
  address     TEXT                     -- JSON: {"email":"...","phone":"..."}
);

CREATE TABLE asset (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,
  mark           TEXT,
  price_per_hour REAL NOT NULL,
  blob           BLOB,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE location (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  latitude  REAL,
  longitude REAL,
  address   TEXT                       -- JSON: {"email":"...","phone":"..."}
);

CREATE TABLE asset_location (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER,
  asset_id    INTEGER UNIQUE,          -- en resurs tillhör max en plats
  name        TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE
);

CREATE TABLE free (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id   INTEGER NOT NULL,
  start_time TEXT NOT NULL,            -- ISO-8601
  end_time   TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE
);

CREATE TABLE booked (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  free_id    INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  start_time TEXT NOT NULL,            -- ISO-8601
  end_time   TEXT NOT NULL,
  FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

### Steg 1.6 – Java-källfiler

#### `AssetApplication.java`
```java
package org.community.booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AssetApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssetApplication.class, args);
    }
}
```

#### `Models.java`
Statiska inre klasser med Lombok `@Data`:
- **User** – id, email, password, code, createtime, role, address (Models.Address)
- **Asset** – id, userId, mark, pricePerHour, blob
- **Location** – id, name, latitude, longitude, address (Models.Address)
- **AssetLocation** – id, locationId, assetId, name
- **Free** – id, assetId, startTime, endTime
- **Booked** – id, freeId, userId, userEmail, startTime, endTime
- **Timeslot** – freeid, assetId, startTime, endTime *(transient, beräknad)*
- **Address** – email, phone *(JSON i databas)*

#### `BookException.java`
```java
package org.community.booking;
public class BookException extends RuntimeException {
    public BookException(String message) { super(message); }
}
```

#### `config/JdbiConfig.java`
Statisk hjälpklass som:
1. Söker rotprojektmappen uppåt från `user.dir` (letar efter `bookingweb/` och `pom.xml`)
2. Läser `spring.properties` (classpath + projektmapp)
3. Löser relativa SQLite-filsökvägar till absoluta
4. Returnerar `Jdbi.create(url)` med `SqlObjectPlugin` installerat

Viktiga metoder: `getDbUrl()`, `createJdbi()`, `findBookProjectFolder()`

#### `Book.java` – affärslogik och DAO

**Inre gränssnitt `BookingDao`:**
Annoterat med `@RegisterFieldMapper` för alla modeller. SQL-metoder via JDBI:

| Metod | Beskrivning |
|-------|-------------|
| `insertUser(user)` | Lägg till user |
| `getUserById(id)` | Hämta user |
| `getUserByEmail(email)` | Hämta user |
| `getUsers()` | Alla users |
| `getLocations()` | Alla platser |
| `getAssetLocations()` | Alla asset_location |
| `getFreeBlocks(locationId, startTime)` | Lediga tider för plats efter startTime |
| `getAllFreeBlocksByAsset(assetId)` | Alla lediga tider för resurs |
| `getFreeBlocksByAsset(assetId, startTime)` | Lediga tider för resurs efter startTime |
| `getFreeBlocksByLocation(locationId)` | Alla lediga tider för plats |
| `getBookedBlocks(locationId, startTime)` | Bokade tider för plats |
| `getBookedBlocksByLocation(locationId)` | Alla bokade tider för plats |
| `getBookedBlocksByFreeId(freeId)` | Bokade tider för ett free-block |
| `bookTime(freeId, userId, start, end)` | Skapa bokning |
| `deleteBookedTime(bookedId)` | Ta bort bokning |
| `addFreeTime(assetId, start, end)` | Lägg till ledig tid |
| `deleteFreeTime(freeId)` | Ta bort ledig tid |

**Affärsregler i `addFreeTime()`:**
1. `start_time` måste vara i framtiden (`> LocalDateTime.now()`)
2. `end_time` måste vara efter `start_time`
3. Ny tid får inte överlappa befintlig ledig tid för samma resurs  
   *(overlap: `existing.startTime < newEnd && existing.endTime > newStart`)*

**`findTimeslot()` – algoritm:**
1. Hämta `free`-block för platsen/resursen
2. Skapa ett `Timeslot` per block
3. Per timeslot: hämta bokningar med samma `free_id`
4. Per bokning som ryms i timeslot:
   - Nytt timeslot: `[booked.endTime – slot.endTime]`
   - Stympa: `slot.endTime = booked.startTime`
5. Filtrera: behåll bara timeslots där `wantedStart/wantedEnd` ryms
6. Sortera på startTime

**JDBI-konfiguration i `Book`-konstruktorn:**
```java
this.jdbi.installPlugin(new SqlObjectPlugin());
this.jdbi.registerColumnMapper(Models.Address.class, new JsonAddressMapper.Column());
this.jdbi.registerArgument(new JsonAddressMapper.Factory());
// Registrera LocalDateTime mapper (ISO-8601 TEXT <-> LocalDateTime)
this.jdbi.registerArgument(/* AbstractArgumentFactory<LocalDateTime> */);
this.jdbi.registerColumnMapper(LocalDateTime.class, /* ColumnMapper */);
```

#### `BookController.java` – REST API

```java
@CrossOrigin(origins = "*")
@RestController
```

| Metod | URL | Auth | Beskrivning |
|-------|-----|------|-------------|
| GET | `/book` | OPEN | Hälsning |
| GET | `/locations` | OPEN | Alla platser |
| GET | `/assetlocations` | OPEN | Alla resurs-plats-kopplingar |
| GET | `/booked?locationId=N` | OPEN | Bokade tider för plats |
| GET | `/booked/{locationId}` | OPEN | Bokade tider för plats |
| GET | `/free?locationId=N` | OPEN | Lediga tider för plats |
| GET | `/free/{locationId}` | BOOKADMIN | Lediga tider, admin |
| GET | `/free/asset/{assetId}` | BOOKADMIN | Lediga tider för resurs |
| POST | `/timeslot?startTime=...&endTime=...` body: Location | OPEN | Sök lediga luckor |
| POST | `/free` body: Location | BOOKADMIN | Sök lediga tider (next 24h) |
| POST | `/bookTime?freeId=N&startTime=...&endTime=...` | BOOKUSER/ADMIN | Boka tid |
| DELETE | `/bookedTime/{bookedId}` | BOOKUSER/ADMIN | Avboka |
| DELETE | `/freeTime/{freeId}` | BOOKADMIN | Ta bort ledig tid |
| POST | `/freeTime?assetId=N&startTime=...&endTime=...` | BOOKADMIN | Lägg till ledig tid |
| POST | `/user` body: User | BOOKADMIN | Skapa användare |
| GET | `/user/{id}` | BOOKADMIN | Hämta user |
| GET | `/user/email/{email}` | BOOKADMIN | Hämta user via email |
| GET | `/users` | BOOKADMIN | Alla användare |

**Felhantering:**
```java
@ExceptionHandler(BookException.class)
public ResponseEntity<?> handleBookException(BookException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", e.getMessage()));
}
```

#### `security/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    // CSRF: inaktiverat
    // Session: STATELESS
    // CORS: alla origins, metoder, headers, credentials
    // JWT-filter läggs BEFORE UsernamePasswordAuthenticationFilter
}
```

**Åtkomstregler:**
```
OPEN:  GET  /book, /locations, /assetlocations, /booked, /booked/**
OPEN:  GET  /free
OPEN:  POST /timeslot
OPEN:  OPTIONS /**
OPEN:  /login, /auth/**
BOOKADMIN: GET /free/*,  POST /free
BOOKADMIN: /freeTime, /freeTime/**
BOOKADMIN: /user/**, /users
BOOKUSER/ADMIN: POST /bookTime, DELETE /bookedTime/**, /logout
```

#### `security/AuthController.java`

```java
@CrossOrigin(origins = "*")
@RestController
public class AuthController {
    // POST /login och /auth/login
    // Request:  { "email": "...", "password": "..." }
    // Response: { "token": "...", "type": "Bearer", "id": N, "email": "...", "role": "..." }

    // POST /logout och /auth/logout
    // Response: { "message": "Logged out successfully" }
}
```

#### `security/JwtService.java`

```java
@Service
public class JwtService {
    @Value("${jwt.secret:defaultSecretKeyForCommunityBookingAppSecure256BitsMinimum!}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}") // 24h
    private long jwtExpiration;

    // generateToken(UserDetails, int userId, String role) -> JWT med claims: sub=email, userId, role
    // isTokenValid(token, UserDetails) -> boolean
    // extractUsername(token) -> email
    // Algoritm: HMAC-SHA256, nyckel via Keys.hmacShaKeyFor(secretKey.getBytes())
}
```

#### `security/JwtAuthenticationFilter.java`

`OncePerRequestFilter`:
1. Läs `Authorization: Bearer <token>`
2. Extrahera email från JWT
3. Ladda användare via `CustomUserDetailsService`
4. Validera token, sätt `SecurityContextHolder`
5. Fortsätt filter-kedjan

#### `security/CustomUserDetailsService.java`

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Override
    public UserDetails loadUserByUsername(String username) {
        Models.User user = book.getUserByEmail(username);
        if (user == null) throw new UsernameNotFoundException("...");
        return new UserPrincipal(user);
    }
}
```

#### `security/UserPrincipal.java`

Implementerar `UserDetails`:
- `getAuthorities()`: parsar `user.role` (kommaseparerad) och returnerar `SimpleGrantedAuthority("ROLE_" + roll)`
- `getUsername()`: `user.email`
- `getPassword()`: `user.password` (BCrypt)
- `isAccountNonExpired/Locked/CredentialsNonExpired/Enabled()`: returnerar `true`

#### `security/AuthDtos.java`

```java
public class AuthDtos {
    @Builder @Data
    public static class LoginRequest {
        private String identifier;  // email (eller userId som sträng)
        private String password;
    }

    @Builder @Data
    public static class LoginResponse {
        private String token;
        private String type;    // "Bearer"
        private int id;
        private String email;
        private String role;
    }
}
```

#### `JsonAddressMapper.java`

JDBI-anpassning för att läsa/skriva `Models.Address` som JSON TEXT i SQLite:
- `Column`: implementerar `ColumnMapper<Models.Address>` (deserialiserar JSON)
- `Factory`: implementerar `ArgumentFactory` (serialiserar till JSON)
- Använder Jackson `ObjectMapper`

### Steg 1.7 – Testdatagenerator

`src/test/java/org/community/function/TestDataGenerator.java` skapar om hela databasen:

1. Droppar och återskapar alla 6 tabeller
2. **10 användare** (user1–user10@example.com, lösenord: `password123`, BCrypt):
   - user1: `BOOKADMIN`, user2: `BOOKUSER,BOOKADMIN`, user3–10: `BOOKUSER`
3. **200 assets** (slumpmässigt kopplade till users)
4. **2 platser** (Location 1, Location 2)
5. **100 asset_location** (50 assets per plats)
6. **100 lediga tider** (48h-block, slumpmässiga tider ±1–9 dagar)

```bash
# Kör testdatageneratorn
cd bookingweb
mvn test-compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"
```

### Steg 1.8 – Starta backend

```bash
cd bookingweb
mvnw spring-boot:run
# Backend på http://localhost:8080
```

---

## Del 2 – Frontend (React / TypeScript / Vite)

### Steg 2.1 – Skapa Vite-projekt

```bash
npm create vite@latest bookingapp -- --template react-ts
cd bookingapp
npm install
```

### Steg 2.2 – Installera beroenden

```bash
npm install react-big-calendar moment lucide-react
npm install -D @types/react-big-calendar
```

| Paket | Syfte |
|-------|-------|
| `react-big-calendar` | Kalenderkomponent (vecka/dag/månad/agenda-vy) |
| `moment` | Datumformatering och lokalisering |
| `lucide-react` | Ikoner |

### Steg 2.3 – Vite-proxykonfiguration

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

### Steg 2.4 – TypeScript-modeller (`src/types/models.ts`)

```typescript
export interface Address { email: string; phone: string; }
export interface AuthSession { token: string; type: string; id: number; email: string; role: string; }
export interface Location { id: number; name: string; latitude?: number; longitude?: number; address: Address; }
export interface AssetLocation { id: number; locationId: number; assetId: number; name: string; }
export interface Free { id: number; assetId: number; startTime: string; endTime: string; }
export interface Booked { id: number; freeId: number; userId: number; userEmail?: string; startTime: string; endTime: string; }
export interface Timeslot { freeid: number; assetId: number; startTime: string; endTime: string; }
export interface User { id: number; email: string; password?: string; code: number; createtime?: string; role: string; address?: Address; }
```

### Steg 2.5 – API-tjänst (`src/services/api.ts`)

```typescript
const API_BASE = '/api';
const AUTH_KEY = 'community_booking_auth';

// Autentiseringsfunktioner:
// getAuthSession() / setAuthSession() / clearAuthSession() – JWT i localStorage
// getAuthHeaders() – returnerar { Authorization: "Bearer <token>" }

// API-funktioner:
// login(email, password) -> AuthSession
// logout()
// fetchLocations() -> Location[]
// fetchAssetLocations() -> AssetLocation[]
// fetchFreeByLocation(locationId) -> Free[]
// fetchBookedByLocation(locationId) -> Booked[]
// fetchTimeslots(location, startTime, endTime) -> Timeslot[]
// bookTime(freeId, userId, startTime, endTime)
// deleteBookedTime(bookedId)
// fetchFreeByLocationIdAdmin(locationId) -> Free[]   [BOOKADMIN]
// fetchFreeByAssetIdAdmin(assetId) -> Free[]         [BOOKADMIN]
// addFreeTime(assetId, startTime, endTime)            [BOOKADMIN]
// deleteFreeTime(freeId)                              [BOOKADMIN]
// fetchUsers() -> User[]                              [BOOKADMIN]
// addUser(user)                                       [BOOKADMIN]
```

### Steg 2.6 – Svensk Moment.js-lokalisering

> **VIKTIGT:** Vite pre-bundlar `moment/locale/sv` som en isolerad modul med egen intern moment-instans. `import 'moment/locale/sv'` + `moment.locale('sv')` fungerar **inte** för veckostart. Använd `moment.updateLocale()` istället.

`src/services/momentSv.ts`:

```typescript
import moment from 'moment';

export const SWEDISH_WEEKDAYS = [
  'Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'
];
export const SWEDISH_MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
];

export function setupSwedishLocale() {
  moment.updateLocale('sv', {
    months: 'januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december'.split('_'),
    monthsShort: 'jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec'.split('_'),
    weekdays: 'söndag_måndag_tisdag_onsdag_torsdag_fredag_lördag'.split('_'),
    weekdaysShort: 'sön_mån_tis_ons_tor_fre_lör'.split('_'),
    weekdaysMin: 'sö_må_ti_on_to_fr_lö'.split('_'),
    longDateFormat: { LT: 'HH:mm', LTS: 'HH:mm:ss', L: 'YYYY-MM-DD', LL: 'D MMMM YYYY' },
    week: {
      dow: 1,  // Måndag som veckans första dag
      doy: 4,
    },
  });
  moment.locale('sv');
}

setupSwedishLocale();
```

Importera i `src/main.tsx` **allra först**:

```typescript
import './services/momentSv'   // MÅSTE vara överst!
import './index.css'
import App from './App.tsx'
```

### Steg 2.7 – Kalenderformatering i `BookPage.tsx`

```typescript
import { Calendar as BigCalendar, momentLocalizer, type Formats } from 'react-big-calendar';
import moment from 'moment';
import { SWEDISH_WEEKDAYS, SWEDISH_MONTHS, setupSwedishLocale } from '../services/momentSv';

setupSwedishLocale();
const localizer = momentLocalizer(moment);
localizer.startOfWeek = () => 1;  // Tvinga måndag som veckostart

const calendarFormats: Formats = {
  timeGutterFormat: 'HH:mm',
  agendaTimeFormat: 'HH:mm',
  weekdayFormat: (date: Date) => SWEDISH_WEEKDAYS[date.getDay()],
  dayFormat: (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  },
  dayHeaderFormat: (date: Date) => {
    const month = SWEDISH_MONTHS[date.getMonth()].toLowerCase();
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${date.getDate()} ${month} ${date.getFullYear()}`;
  },
  agendaDateFormat: (date: Date) => {
    const month = SWEDISH_MONTHS[date.getMonth()].toLowerCase();
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${date.getDate()} ${month}`;
  },
  monthHeaderFormat: (date: Date) => `${SWEDISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  dayRangeHeaderFormat: ({ start, end }) => {
    if (start.getMonth() === end.getMonth()) {
      return `${SWEDISH_MONTHS[start.getMonth()]} ${start.getFullYear()}: ${start.getDate()} – ${end.getDate()}`;
    }
    return `${start.getDate()} ${SWEDISH_MONTHS[start.getMonth()].toLowerCase()} – ${end.getDate()} ${SWEDISH_MONTHS[end.getMonth()].toLowerCase()} ${end.getFullYear()}`;
  },
  eventTimeRangeFormat: () => '',
  selectRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
  agendaTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
};

// I JSX:
// <BigCalendar culture="sv" formats={calendarFormats} messages={calendarMessages} ... />
```

### Steg 2.8 – Komponentstruktur och sidflöde

**Bokningsflöde (steg/step i `StartPage.tsx`):**

| Steg | Komponent | Beskrivning |
|------|-----------|-------------|
| 1 | `LocationPage` | Lista alla platser (OPEN), välj en |
| 2 | `AssetPage` | Grid av resurser för vald plats (visas om > 1 resurs) |
| 3 | `BookPage` | Kalender, markera tidsintervall |
| 6 | `BookPage` | Visa sammanfattning, bekräfta bokning |
| 8 | `BookPage` | Bokningskvitto |

**Admin-vyer (kräver BOOKADMIN):**

| Vy | Komponent | Beskrivning |
|----|-----------|-------------|
| `admin-free` | `FreePage` | Grid av platser/resurser, hantera lediga tider |
| `admin-users` | `UserPage` | Skapa och visa användarkonton |

**Källfiler:**
```
src/App.tsx               – Rotklass (renderar StartPage)
src/StartPage.tsx         – Navigation, state, sidval
src/book/LocationPage.tsx – Steg 1: platslista
src/book/AssetPage.tsx    – Steg 2: resursgrid
src/book/BookPage.tsx     – Steg 3/6/8: kalender och bokning
src/free/FreePage.tsx     – Admin: lediga tider
src/login/LoginPage.tsx   – Login-modal (JWT)
src/login/UserPage.tsx    – Admin: användare
```

### Steg 2.9 – Autentisering i frontend

```typescript
// Spara session efter inloggning
localStorage.setItem('community_booking_auth', JSON.stringify({
  token: "eyJ...",
  type: "Bearer",
  id: 1,
  email: "user1@example.com",
  role: "BOOKADMIN"
}));

// Kontrollera roll
const isAdmin = session.role.split(',').includes('BOOKADMIN');

// Skicka autentiserad request
headers: { 'Authorization': `Bearer ${session.token}` }
```

### Steg 2.10 – Starta frontend

```bash
cd bookingapp
npm run dev
# Frontend på http://localhost:5173
```

---

## Del 3 – Datumformat

**Backend:** `LocalDateTime` serialiseras/deserialiseras med `DateTimeFormatter.ISO_LOCAL_DATE_TIME`.  
Format: `2026-09-21T09:00:00`

**Frontend:** Använd `moment(str).format('HH:mm')` för 24-timmarsformat.  
Undvik `toLocaleTimeString()` – den kan visa 12h-format beroende på webbläsarens inställningar.

**Tidszon:** Systemet arbetar med lokal tid. SQLite lagrar datum som TEXT utan tidszon.

---

## Del 4 – Testanvändare (efter TestDataGenerator)

| Email | Lösenord | Roll |
|-------|----------|------|
| user1@example.com | password123 | BOOKADMIN |
| user2@example.com | password123 | BOOKUSER, BOOKADMIN |
| user3–user10@example.com | password123 | BOOKUSER |

---

## Del 5 – Kommandon (sammanfattning)

```bash
# Skapa/återskapa databasen med testdata
cd bookingweb
mvn test-compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"

# Starta backend (port 8080)
cd bookingweb
mvnw spring-boot:run

# Starta frontend (port 5173)
cd bookingapp
npm run dev

# Bygg frontend för produktion
cd bookingapp
npm run build
```

---

## Del 6 – Vanliga problem och lösningar

| Problem | Orsak | Lösning |
|---------|-------|---------|
| Kalender visar söndag som första dag | `moment/locale/sv` pre-bundlas av Vite isolerat | Använd `moment.updateLocale('sv', {week:{dow:1}})` och `localizer.startOfWeek = () => 1` |
| Kalender visar engelska veckodagsnamn | Samma Vite-problem | Använd `SWEDISH_WEEKDAYS[date.getDay()]` array direkt |
| JWT saknar Spring-roll-prefix | Spring Security kräver `ROLE_`-prefix | `UserPrincipal.getAuthorities()` lägger till `ROLE_` |
| `BookException` ger inte JSON-svar | Saknas `@ExceptionHandler` | Lägg till handler i `BookController` |
| CORS-fel från frontend | Backend ej konfigurerat | `@CrossOrigin(origins="*")` + `CorsConfigurationSource` i `SecurityConfig` |
| SQLite foreign key constraint-fel | FKs inaktiverade som standard i SQLite | Lägg `?foreign_keys=true` i JDBC-URL |
| `bookingweb` hittar inte `booking_system.db` | Relativ sökväg löst fel | `JdbiConfig.findBookProjectFolder()` söker uppåt efter rotprojektmapp |
| 401 vid API-anrop | JWT-token saknas eller utgången | Kontrollera `Authorization`-header och token-giltighetstid |
