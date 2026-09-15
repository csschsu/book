/*
 * Create Test in GenerateFreeYearTest.java in package org.community.function and use
 * JDBI create testdata in tables and generate data into the tables.
 * 
 * // Tabellerna rensas i bakåtvänd ordning för att inte bryta mot FOREIGN
 * // KEY-restriktioner
 * handle.execute("DROP TABLE IF EXISTS booked");
 * handle.execute("DROP TABLE IF EXISTS free");
 * handle.execute("DROP TABLE IF EXISTS asset_location");
 * handle.execute("DROP TABLE IF EXISTS location");
 * handle.execute("DROP TABLE IF EXISTS asset");
 * handle.execute("DROP TABLE IF EXISTS user");
 * 
 * // Nollställer AUTOINCREMENT-räknarna i SQLite så att ID börjar om på 1
 * handle.execute(
 * "DELETE FROM sqlite_sequence WHERE name IN ('booked', 'free', 'asset_location', 'asset', 'user')"
 * );
 * 
 * handle.execute(
 * "CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, code INTEGER, name TEXT NOT NULL, address TEXT)"
 * );
 * handle.execute(
 * "CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mark TEXT, price_per_hour REAL NOT NULL, blob BLOB, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)"
 * );
 * handle.execute(
 * "CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, latitude REAL, longitude REAL, address TEXT)"
 * );
 * handle.execute(
 * "CREATE TABLE asset_location (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER, asset_id INTEGER UNIQUE, name TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)"
 * );
 * handle.execute(
 * "CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)"
 * );
 * handle.execute(
 * "CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, user_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)"
 * );
 * 2. Generera 10 köpare (users)
 * 3. Generera 1 tillgång (asset)
 * 4. Generera 1 plats (locations)
 * 5. Generera 1 lediga tider (free) under ÅRET som startar current timestamp
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

import java.io.File;
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

        public static String getDbUrl() {
                return "jdbc:sqlite:booking_system.db?foreign_keys=true";
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
                                        "CREATE TABLE user (" +
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

                        // 2. Generera 10 köpare (users)
                        String createtime = currentTimestamp.format(FORMATTER);
                        PreparedBatch userBatch = handle.prepareBatch(
                                        "INSERT INTO user (email, password, code, createtime, role, address) VALUES (?, ?, ?, ?, ?, ?)");
                        for (int i = 1; i <= 10; i++) {
                                String email = "user" + i + "@example.com";
                                String jsonAddress = toJson(email, "070-22222" + String.format("%02d", i));
                                userBatch.bind(0, email)
                                                .bind(1, "password123")
                                                .bind(2, 0)
                                                .bind(3, createtime)
                                                .bind(4, "BOOKUSER")
                                                .bind(5, jsonAddress)
                                                .add();
                        }
                        userBatch.execute();
                        List<Long> userIds = handle.createQuery("SELECT id FROM user ORDER BY id ASC").mapTo(Long.class)
                                        .list();
                        long user1Id = userIds.get(0);
                        long user2Id = userIds.get(1);

                        // 3. Generera 1 tillgång (asset)
                        handle.execute("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (?, ?, ?, ?)",
                                        user1Id, "Asset 1", 10.0, null);
                        long assetId = handle.createQuery("SELECT id FROM asset ORDER BY id ASC LIMIT 1")
                                        .mapTo(Long.class).one();

                        // 4. Generera 1 plats (locations)
                        String locationAddress = toJson("location1@example.com", "070-333331");
                        handle.execute("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)",
                                        "Location 1", 59.3293, 18.0686, locationAddress);
                        long locationId = handle.createQuery("SELECT id FROM location ORDER BY id ASC LIMIT 1")
                                        .mapTo(Long.class)
                                        .one();

                        handle.execute("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)",
                                        locationId, assetId, "Asset Location 1");

                        // 5. Generera 1 lediga tider (free) under ÅRET som startar current timestamp
                        // och slutar current timestamp + 1 år.
                        LocalDateTime start = currentTimestamp;
                        LocalDateTime end = currentTimestamp.plusYears(1);

                        handle.execute("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)",
                                        assetId, start.format(FORMATTER), end.format(FORMATTER));
                        long freeId = handle.createQuery("SELECT id FROM free ORDER BY id ASC LIMIT 1")
                                        .mapTo(Long.class).one();

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

                System.out.println("Genererar testdata för ett helt år...");
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
                        // 2. Kontrollera 10 köpare (users)
                        int userCount = handle.createQuery("SELECT COUNT(*) FROM user").mapTo(Integer.class).one();
                        assertEquals(10, userCount, "Det ska finnas 10 användare");

                        // Kontrollera att user_1 och user_2 finns
                        String user1Email = handle.createQuery("SELECT email FROM user WHERE id = 1")
                                        .mapTo(String.class).one();
                        assertEquals("user1@example.com", user1Email);
                        String user2Email = handle.createQuery("SELECT email FROM user WHERE id = 2")
                                        .mapTo(String.class).one();
                        assertEquals("user2@example.com", user2Email);

                        // 3. Kontrollera 1 tillgång (asset)
                        int assetCount = handle.createQuery("SELECT COUNT(*) FROM asset").mapTo(Integer.class).one();
                        assertEquals(1, assetCount, "Det ska finnas 1 tillgång");

                        // 4. Kontrollera 1 plats (locations) och koppling
                        int locationCount = handle.createQuery("SELECT COUNT(*) FROM location").mapTo(Integer.class)
                                        .one();
                        assertEquals(1, locationCount, "Det ska finnas 1 plats");

                        int assetLocationCount = handle.createQuery("SELECT COUNT(*) FROM asset_location")
                                        .mapTo(Integer.class)
                                        .one();
                        assertEquals(1, assetLocationCount, "Det ska finnas 1 asset_location koppling");

                        // 5. Kontrollera 1 ledig tid (free)
                        int freeCount = handle.createQuery("SELECT COUNT(*) FROM free").mapTo(Integer.class).one();
                        assertEquals(1, freeCount, "Det ska finnas 1 ledig tidsperiod");

                        String freeStartTime = handle.createQuery("SELECT start_time FROM free LIMIT 1")
                                        .mapTo(String.class).one();
                        String freeEndTime = handle.createQuery("SELECT end_time FROM free LIMIT 1").mapTo(String.class)
                                        .one();
                        assertEquals(now.format(FORMATTER), freeStartTime);
                        assertEquals(now.plusYears(1).format(FORMATTER), freeEndTime);

                        // 6. Kontrollera bokningar (booked)
                        int bookedCount = handle.createQuery("SELECT COUNT(*) FROM booked").mapTo(Integer.class).one();
                        assertTrue(bookedCount >= 100,
                                        "Det bör finnas cirka 104 bokningar (52 tisdagar + 52 torsdagar)");

                        // 6a. Kontrollera alla bokningar för user_1 (alla ska vara tisdagar kl 18-20)
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
                        for (Models.Booked b : user1Bookings) {
                                assertEquals(DayOfWeek.TUESDAY, b.startTime.getDayOfWeek(),
                                                "Bokning för user_1 ska vara en tisdag");
                                assertEquals(18, b.startTime.getHour(), "Starttid ska vara 18:00");
                                assertEquals(0, b.startTime.getMinute(), "Startminut ska vara 00");
                                assertEquals(20, b.endTime.getHour(), "Sluttid ska vara 20:00");
                                assertEquals(0, b.endTime.getMinute(), "Slutminut ska vara 00");
                                assertTrue(!b.startTime.isBefore(now),
                                                "Bokning ska inte starta före current timestamp");
                                assertTrue(!b.endTime.isAfter(now.plusYears(1)),
                                                "Bokning ska inte sluta efter current timestamp + 1 år");
                        }

                        // 6b. Kontrollera alla bokningar för user_2 (alla ska vara torsdagar kl 18-20)
                        List<Models.Booked> user2Bookings = handle.createQuery(
                                        "SELECT id, free_id AS freeId, user_id AS userId, start_time AS startTime, end_time AS endTime "
                                                        +
                                                        "FROM booked WHERE user_id = 2")
                                        .map((rs, ctx) -> {
                                                Models.Booked b = new Models.Booked();
                                                b.id = rs.getInt("id");
                                                b.freeId = rs.getInt("freeId");
                                                b.userId = rs.getInt("userId");
                                                b.startTime = LocalDateTime.parse(rs.getString("startTime"), FORMATTER);
                                                b.endTime = LocalDateTime.parse(rs.getString("endTime"), FORMATTER);
                                                return b;
                                        }).list();

                        assertFalse(user2Bookings.isEmpty(), "User 2 ska ha bokningar");
                        for (Models.Booked b : user2Bookings) {
                                assertEquals(DayOfWeek.THURSDAY, b.startTime.getDayOfWeek(),
                                                "Bokning för user_2 ska vara en torsdag");
                                assertEquals(18, b.startTime.getHour(), "Starttid ska vara 18:00");
                                assertEquals(0, b.startTime.getMinute(), "Startminut ska vara 00");
                                assertEquals(20, b.endTime.getHour(), "Sluttid ska vara 20:00");
                                assertEquals(0, b.endTime.getMinute(), "Slutminut ska vara 00");
                                assertTrue(!b.startTime.isBefore(now),
                                                "Bokning ska inte starta före current timestamp");
                                assertTrue(!b.endTime.isAfter(now.plusYears(1)),
                                                "Bokning ska inte sluta efter current timestamp + 1 år");
                        }
                });

                // Verifiera integration mot Book-tjänsten
                Book book = new Book(jdbi);
                List<Models.Location> locations = book.getLocations();
                assertEquals(1, locations.size());
                assertEquals("Location 1", locations.get(0).name);

                List<Models.User> users = book.getUsers();
                assertEquals(10, users.size());

                List<Models.AssetLocation> assetLocations = book.getAssetLocations();
                assertEquals(1, assetLocations.size());
        }
}