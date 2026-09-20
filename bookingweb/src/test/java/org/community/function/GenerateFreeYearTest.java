/*
 * Create Test in GenerateFreeYearTest.java in package org.community.function and use
 * JDBI create testdata in tables and generate data into the tables.
 * 1. test@test.se
 * 2. 
 * 3. Generera tillgångar (assets)
 * 4. Generera 2 platser (locations), första platsen med en tillgång, andra platsen med två tillgångar
 * 5. Generera lediga tider (free) under ÅRET som startar current timestamp
 *    och slutar current timestamp + 1 år.
 * 6. Generera bokningar (booked)
 *    a. En tid från kl 18 - 20 för user_1 varje tisdag under ÅRET.
 *    b. En tid från kl 18 - 20 för user_2 varje torsdag under ÅRET.
 * keep this instruction as a comment in the file
 */

package org.community.function;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.community.booking.Book;
import org.community.booking.Models;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.statement.PreparedBatch;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class GenerateFreeYearTest {

        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
        private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

        public static String getDbUrl() {
                return org.community.booking.config.DbConfig.getDbUrl();
        }

        private static String toJson(String email, String phone) {
                try {
                        Models.Address addr = new Models.Address();
                        addr.email = email;
                        addr.phone = phone;
                        return OBJECT_MAPPER.writeValueAsString(addr);
                } catch (Exception e) {
                        throw new RuntimeException("Kunde inte serialisera adress till JSON", e);
                }
        }

        public static void generateData(Jdbi jdbi) {
                generateData(jdbi, LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
        }

        public static void generateData(Jdbi jdbi, LocalDateTime currentTimestamp) {
                jdbi.useHandle(handle -> {
                        // Tabellerna rensas i bakåtvänd ordning för att inte bryta mot FOREIGN
                        // KEY-restriktioner
                        handle.execute("DROP TABLE IF EXISTS booked");
                        handle.execute("DROP TABLE IF EXISTS free");
                        handle.execute("DROP TABLE IF EXISTS asset_location");
                        handle.execute("DROP TABLE IF EXISTS location");
                        handle.execute("DROP TABLE IF EXISTS asset");
                        handle.execute("DROP TABLE IF EXISTS user");

                        // Nollställer AUTOINCREMENT-räknarna i SQLite så att ID börjar om på 1
                        try {
                                handle.execute(
                                                "DELETE FROM sqlite_sequence WHERE name IN ('booked', 'free', 'asset_location', 'asset', 'user')");
                        } catch (Exception ignored) {
                                // sqlite_sequence finns inte i en helt ny SQLite-databas förrän en
                                // AUTOINCREMENT-tabell skapats
                        }

                        handle.execute(
                                        "CREATE TABLE IF NOT EXISTS user (" +
                                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                                        "email TEXT UNIQUE NOT NULL, " +
                                                        "password TEXT NOT NULL, " +
                                                        "code INTEGER DEFAULT 0, " +
                                                        "createtime TEXT NOT NULL, " +
                                                        "role TEXT NOT NULL, " +
                                                        "address TEXT)");
                        handle.execute(
                                        "CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mark TEXT, price_per_hour REAL NOT NULL, blob BLOB, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)");
                        handle.execute(
                                        "CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, latitude REAL, longitude REAL, address TEXT)");
                        handle.execute(
                                        "CREATE TABLE asset_location (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER, asset_id INTEGER UNIQUE, name TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)");
                        handle.execute(
                                        "CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)");
                        handle.execute(
                                        "CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, user_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)");

                        // 2. Generera användare (user)
                        String createtime = currentTimestamp.format(FORMATTER);
                        String email = "test@test.se";
                        String hashedPassword = PASSWORD_ENCODER.encode("password");
                        String jsonAddress = toJson(email, "070-1234567");

                        handle.createUpdate(
                                        "INSERT INTO user (email, password, code, createtime, role, address) VALUES (:email, :password, :code, :createtime, :role, :address)")
                                        .bind("email", email)
                                        .bind("password", hashedPassword)
                                        .bind("code", 0)
                                        .bind("createtime", createtime)
                                        .bind("role", "BOOKUSER,BOOKADMIN")
                                        .bind("address", jsonAddress)
                                        .execute();

                        List<Long> userIds = handle.createQuery("SELECT id FROM user WHERE email = '" + email + "'")
                                        .mapTo(Long.class)
                                        .list();
                        long user1Id = userIds.get(0);
                        long user2Id = user1Id;

                        // 3. Generera 3 tillgångar (assets)
                        // Första platsen med 1 tillgång, andra platsen med 2 tillgångar
                        handle.execute("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (?, ?, ?, ?)",
                                        user1Id, "Asset 1", 10.0, null);
                        handle.execute("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (?, ?, ?, ?)",
                                        user1Id, "Asset 2", 15.0, null);
                        handle.execute("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (?, ?, ?, ?)",
                                        user1Id, "Asset 3", 20.0, null);

                        List<Long> assetIds = handle.createQuery("SELECT id FROM asset ORDER BY id ASC")
                                        .mapTo(Long.class).list();
                        long asset1Id = assetIds.get(0);
                        long asset2Id = assetIds.get(1);
                        long asset3Id = assetIds.get(2);

                        // 4. Generera 2 platser (locations)
                        // Första platsen med en tillgång, andra platsen med två tillgångar
                        String location1Address = toJson("location1@example.com", "070-333331");
                        handle.execute("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)",
                                        "Location 1", 59.3293, 18.0686, location1Address);

                        String location2Address = toJson("location2@example.com", "070-333332");
                        handle.execute("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)",
                                        "Location 2", 57.7089, 11.9746, location2Address);

                        List<Long> locationIds = handle.createQuery("SELECT id FROM location ORDER BY id ASC")
                                        .mapTo(Long.class).list();
                        long location1Id = locationIds.get(0);
                        long location2Id = locationIds.get(1);

                        // Koppla tillgångar till platser i asset_location
                        // Första platsen med 1 tillgång:
                        handle.execute("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)",
                                        location1Id, asset1Id, "Asset Location 1");

                        // Andra platsen med 2 tillgångar:
                        handle.execute("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)",
                                        location2Id, asset2Id, "Asset Location 2");
                        handle.execute("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)",
                                        location2Id, asset3Id, "Asset Location 2");

                        // 5. Generera lediga tider (free) under ÅRET som startar current timestamp
                        // och slutar current timestamp + 1 år.
                        LocalDateTime start = currentTimestamp;
                        LocalDateTime end = currentTimestamp.plusYears(1);

                        handle.execute("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)",
                                        asset1Id, start.format(FORMATTER), end.format(FORMATTER));
                        long freeId = handle
                                        .createQuery("SELECT id FROM free WHERE asset_id = " + asset1Id
                                                        + " ORDER BY id ASC LIMIT 1")
                                        .mapTo(Long.class).one();

                        handle.execute("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)",
                                        asset2Id, start.format(FORMATTER), end.format(FORMATTER));
                        handle.execute("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)",
                                        asset3Id, start.format(FORMATTER), end.format(FORMATTER));

                        // 6. Generera bokningar (booked)
                        // a. En tid från kl 18 - 20 för user_1 varje tisdag under ÅRET.
                        // b. En tid från kl 18 - 20 för user_2 varje torsdag under ÅRET.
                        LocalDate startDate = start.toLocalDate();
                        LocalDate endDate = end.toLocalDate();

                        PreparedBatch bookedBatch = handle.prepareBatch(
                                        "INSERT INTO booked (free_id, user_id, start_time, end_time) VALUES (?, ?, ?, ?)");

                        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                                if (date.getDayOfWeek() == DayOfWeek.TUESDAY) {
                                        LocalDateTime bookingStart = date.atTime(18, 0);
                                        LocalDateTime bookingEnd = date.atTime(20, 0);
                                        if (!bookingStart.isBefore(start) && !bookingEnd.isAfter(end)) {
                                                bookedBatch.bind(0, freeId)
                                                                .bind(1, user1Id)
                                                                .bind(2, bookingStart.format(FORMATTER))
                                                                .bind(3, bookingEnd.format(FORMATTER))
                                                                .add();
                                        }
                                } else if (date.getDayOfWeek() == DayOfWeek.THURSDAY) {
                                        LocalDateTime bookingStart = date.atTime(18, 0);
                                        LocalDateTime bookingEnd = date.atTime(20, 0);
                                        if (!bookingStart.isBefore(start) && !bookingEnd.isAfter(end)) {
                                                bookedBatch.bind(0, freeId)
                                                                .bind(1, user2Id)
                                                                .bind(2, bookingStart.format(FORMATTER))
                                                                .bind(3, bookingEnd.format(FORMATTER))
                                                                .add();
                                        }
                                }
                        }
                        bookedBatch.execute();
                });
        }

        public static void main(String[] args) {
                String dbUrl = getDbUrl();
                System.out.println("Ansluter till databasen: " + dbUrl);
                Jdbi jdbi = Jdbi.create(dbUrl);

                System.out.println("Genererar testdata för ett helt år med 2 platser...");
                generateData(jdbi);
                System.out.println("Klart! Testdata har genererats framgångsrikt.");
        }

        @Test
        public void testGenerateFreeYear() {
                String dbUrl = getDbUrl();
                Jdbi jdbi = Jdbi.create(dbUrl);
                LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
                generateData(jdbi, now);

                jdbi.useHandle(handle -> {
                        // 2. Kontrollera användare (user)
                        int userCount = handle.createQuery("SELECT COUNT(*) FROM user").mapTo(Integer.class).one();
                        assertEquals(1, userCount, "Det ska finnas 1 användare");

                        // Kontrollera att test@test.se finns och att lösenordet är krypterat
                        String user1Email = handle.createQuery("SELECT email FROM user WHERE id = 1")
                                        .mapTo(String.class).one();
                        assertEquals("test@test.se", user1Email);

                        String user1Password = handle.createQuery("SELECT password FROM user WHERE id = 1")
                                        .mapTo(String.class).one();
                        assertTrue(PASSWORD_ENCODER.matches("password", user1Password),
                                        "Lösenordet ska vara krypterat och matcha 'password'");

                        // 3. Kontrollera 3 tillgångar (assets)
                        int assetCount = handle.createQuery("SELECT COUNT(*) FROM asset").mapTo(Integer.class).one();
                        assertEquals(3, assetCount, "Det ska finnas 3 tillgångar");

                        // 4. Kontrollera 2 platser (locations) och kopplingar
                        int locationCount = handle.createQuery("SELECT COUNT(*) FROM location").mapTo(Integer.class)
                                        .one();
                        assertEquals(2, locationCount, "Det ska finnas 2 platser");

                        int assetLocationCount = handle.createQuery("SELECT COUNT(*) FROM asset_location")
                                        .mapTo(Integer.class)
                                        .one();
                        assertEquals(3, assetLocationCount, "Det ska finnas 3 asset_location kopplingar");

                        // Kontrollera att Location 1 har 1 tillgång och Location 2 har 2 tillgångar
                        int loc1Assets = handle.createQuery("SELECT COUNT(*) FROM asset_location WHERE location_id = 1")
                                        .mapTo(Integer.class).one();
                        assertEquals(1, loc1Assets, "Location 1 ska ha 1 tillgång");

                        int loc2Assets = handle.createQuery("SELECT COUNT(*) FROM asset_location WHERE location_id = 2")
                                        .mapTo(Integer.class).one();
                        assertEquals(2, loc2Assets, "Location 2 ska ha 2 tillgångar");

                        // 5. Kontrollera lediga tider (free)
                        int freeCount = handle.createQuery("SELECT COUNT(*) FROM free").mapTo(Integer.class).one();
                        assertEquals(3, freeCount, "Det ska finnas 3 lediga tidsperioder");

                        List<String> freeStartTimes = handle.createQuery("SELECT start_time FROM free ORDER BY id ASC")
                                        .mapTo(String.class).list();
                        List<String> freeEndTimes = handle.createQuery("SELECT end_time FROM free ORDER BY id ASC")
                                        .mapTo(String.class).list();
                        for (String fStart : freeStartTimes) {
                                assertEquals(now.format(FORMATTER), fStart);
                        }
                        for (String fEnd : freeEndTimes) {
                                assertEquals(now.plusYears(1).format(FORMATTER), fEnd);
                        }

                        // 6. Kontrollera bokningar (booked)
                        int bookedCount = handle.createQuery("SELECT COUNT(*) FROM booked").mapTo(Integer.class).one();
                        assertTrue(bookedCount >= 100,
                                        "Det bör finnas cirka 104 bokningar (52 tisdagar + 52 torsdagar)");

                        // Kontrollera alla bokningar för user 1 (både tisdagar och torsdagar kl 18-20)
                        List<Models.Booked> user1Bookings = handle.createQuery(
                                        "SELECT id, free_id AS freeId, user_id AS userId, start_time AS startTime, end_time AS endTime "
                                                        +
                                                        "FROM booked WHERE user_id = 1")
                                        .map((rs, ctx) -> {
                                                Models.Booked b = new Models.Booked();
                                                b.id = rs.getInt("id");
                                                b.freeId = rs.getInt("freeId");
                                                b.userId = rs.getInt("userId");
                                                b.startTime = LocalDateTime.parse(rs.getString("startTime"), FORMATTER);
                                                b.endTime = LocalDateTime.parse(rs.getString("endTime"), FORMATTER);
                                                return b;
                                        }).list();

                        assertFalse(user1Bookings.isEmpty(), "User 1 ska ha bokningar");
                        int tuesdayCount = 0;
                        int thursdayCount = 0;
                        for (Models.Booked b : user1Bookings) {
                                assertTrue(b.startTime.getDayOfWeek() == DayOfWeek.TUESDAY
                                                || b.startTime.getDayOfWeek() == DayOfWeek.THURSDAY,
                                                "Bokning ska vara en tisdag eller torsdag");
                                if (b.startTime.getDayOfWeek() == DayOfWeek.TUESDAY) {
                                        tuesdayCount++;
                                } else if (b.startTime.getDayOfWeek() == DayOfWeek.THURSDAY) {
                                        thursdayCount++;
                                }
                                assertEquals(18, b.startTime.getHour(), "Starttid ska vara 18:00");
                                assertEquals(0, b.startTime.getMinute(), "Startminut ska vara 00");
                                assertEquals(20, b.endTime.getHour(), "Sluttid ska vara 20:00");
                                assertEquals(0, b.endTime.getMinute(), "Slutminut ska vara 00");
                                assertTrue(!b.startTime.isBefore(now),
                                                "Bokning ska inte starta före current timestamp");
                                assertTrue(!b.endTime.isAfter(now.plusYears(1)),
                                                "Bokning ska inte sluta efter current timestamp + 1 år");
                        }
                        assertTrue(tuesdayCount >= 50, "Det ska finnas tisdagsbokningar");
                        assertTrue(thursdayCount >= 50, "Det ska finnas torsdagsbokningar");
                });

                // Verifiera integration mot Book-tjänsten
                Book book = new Book(jdbi);
                List<Models.Location> locations = book.getLocations();
                assertEquals(2, locations.size());
                assertEquals("Location 1", locations.get(0).name);
                assertEquals("Location 2", locations.get(1).name);

                List<Models.User> users = book.getUsers();
                assertEquals(1, users.size());
                assertEquals("test@test.se", users.get(0).email);

                List<Models.AssetLocation> assetLocations = book.getAssetLocations();
                assertEquals(3, assetLocations.size());
        }
}