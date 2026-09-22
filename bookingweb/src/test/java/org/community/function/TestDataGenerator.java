package org.community.function;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.statement.PreparedBatch;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Delegator / alias for backwards-compatibility.
 * Main implementation is at org.community.booking.TestDataGenerator.
 */
public class TestDataGenerator {

        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
        private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

        public static class address {
                public String email;
                public String phone;

                public address() {
                }

                public address(String email, String phone) {
                        this.email = email;
                        this.phone = phone;
                }
        }

        private static String toJson(String email, String phone) {
                try {
                        return OBJECT_MAPPER.writeValueAsString(new address(email, phone));
                } catch (Exception e) {
                        throw new RuntimeException("Kunde inte serialisera adress till JSON", e);
                }
        }

        public static void main(String[] args) {
                String dbUrl = org.community.booking.config.DbConfig.getDbUrl();
                System.out.println("Ansluter till databasen: " + dbUrl);
                Jdbi jdbi = org.community.booking.config.DbConfig.createJdbi();

                System.out.println("Genererar testdata...");
                generateData(jdbi);
                System.out.println("Klart! Testdata har genererats framgångsrikt.");
        }

        public static void generateData(Jdbi jdbi) {
                jdbi.useHandle(handle -> {
                        handle.execute("DROP TABLE IF EXISTS booked");
                        handle.execute("DROP TABLE IF EXISTS free");
                        handle.execute("DROP TABLE IF EXISTS asset_location");
                        handle.execute("DROP TABLE IF EXISTS location");
                        handle.execute("DROP TABLE IF EXISTS asset");
                        handle.execute("DROP TABLE IF EXISTS user");

                        handle.execute(
                                        "DELETE FROM sqlite_sequence WHERE name IN ('booked', 'free', 'asset_location', 'asset', 'user')");

                        handle.execute(
                                        "CREATE TABLE user (" +
                                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                                        "email TEXT UNIQUE NOT NULL, " +
                                                        "password TEXT NOT NULL, " +
                                                        "code INTEGER DEFAULT 0, " +
                                                        "createtime TEXT NOT NULL, " +
                                                        "role TEXT NOT NULL, " +
                                                        "address TEXT, " +
                                                        "alias TEXT)");
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

                        // 2. Generera 10 användare (users) med roller och krypterat lösenord
                        String now = LocalDateTime.now().format(FORMATTER);
                        String hashedPassword = PASSWORD_ENCODER.encode("password123");

                        PreparedBatch userBatch = handle.prepareBatch(
                                        "INSERT INTO user (email, password, code, createtime, role, address, alias) VALUES (?, ?, ?, ?, ?, ?, ?)");
                        for (int i = 1; i <= 10; i++) {
                                String email = "user" + i + "@example.com";
                                String jsonAddress = toJson(email, "070-22222" + String.format("%02d", i));
                                String role = (i == 1) ? "BOOKADMIN" : ((i == 2) ? "BOOKUSER,BOOKADMIN" : "BOOKUSER");
                                String alias = "Alias: " + i;
                                userBatch.bind(0, email)
                                                .bind(1, hashedPassword)
                                                .bind(2, 0)
                                                .bind(3, now)
                                                .bind(4, role)
                                                .bind(5, jsonAddress)
                                                .bind(6, alias)
                                                .add();
                        }
                        userBatch.execute();
                        List<Long> userIds = handle.createQuery("SELECT id FROM user").mapTo(Long.class).list();

                        // 3. Generera 200 tillgångar (assets)
                        PreparedBatch assetBatch = handle
                                        .prepareBatch("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (?, ?, ?, ?)");
                        for (int i = 1; i <= 200; i++) {
                                long randomUserId = userIds.get(ThreadLocalRandom.current().nextInt(userIds.size()));
                                assetBatch.bind(0, randomUserId)
                                                .bind(1, "Asset Mark " + i)
                                                .bind(2, 1.0)
                                                .bind(3, (byte[]) null)
                                                .add();
                        }
                        assetBatch.execute();
                        List<Long> assetIds = handle.createQuery("SELECT id FROM asset").mapTo(Long.class).list();

                        // 4. Generera 2 platser (locations) och koppla 50 unika assets till vardera
                        PreparedBatch locationBatch = handle
                                        .prepareBatch("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)");
                        for (int loc = 1; loc <= 2; loc++) {
                                String jsonAddress = toJson("location" + loc + "@example.com", "070-33333" + loc);
                                locationBatch.bind(0, "Location " + loc)
                                                .bind(1, 59.3293 + loc * 0.01)
                                                .bind(2, 18.0686 + loc * 0.01)
                                                .bind(3, jsonAddress)
                                                .add();
                        }
                        locationBatch.execute();
                        List<Long> locationIds = handle.createQuery("SELECT id FROM location").mapTo(Long.class).list();

                        List<Long> shuffledAssets = new ArrayList<>(assetIds);
                        Collections.shuffle(shuffledAssets);
                        PreparedBatch assetLocationBatch = handle
                                        .prepareBatch("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)");

                        int assetIndex = 0;
                        for (int locIndex = 0; locIndex < locationIds.size(); locIndex++) {
                                long locationId = locationIds.get(locIndex);
                                for (int i = 0; i < 50; i++) {
                                        long uniqueAssetId = shuffledAssets.get(assetIndex++);
                                        assetLocationBatch.bind(0, locationId)
                                                        .bind(1, uniqueAssetId)
                                                        .bind(2, "Asset Location " + (locIndex + 1))
                                                        .add();
                                }
                        }
                        assetLocationBatch.execute();

                        // 5. Generera 100 lediga tider (free)
                        PreparedBatch freeBatch = handle
                                        .prepareBatch("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)");

                        LocalDateTime nowDate = LocalDateTime.now();
                        LocalDateTime startRange = nowDate.minusDays(1);
                        LocalDateTime endRange = nowDate.plusDays(9);
                        long minEpochSecond = startRange.toEpochSecond(java.time.ZoneOffset.UTC);
                        long maxEpochSecond = endRange.toEpochSecond(java.time.ZoneOffset.UTC);

                        for (int i = 0; i < 100; i++) {
                                long randomAssetId = assetIds.get(ThreadLocalRandom.current().nextInt(assetIds.size()));
                                long randomStartSecond = ThreadLocalRandom.current().nextLong(minEpochSecond,
                                                maxEpochSecond);

                                LocalDateTime startTime = LocalDateTime.ofEpochSecond(randomStartSecond, 0,
                                                java.time.ZoneOffset.UTC);
                                LocalDateTime endTime = startTime.plusHours(48);

                                freeBatch.bind(0, randomAssetId)
                                                .bind(1, startTime.format(FORMATTER))
                                                .bind(2, endTime.format(FORMATTER))
                                                .add();
                        }
                        freeBatch.execute();
                });
        }
}
