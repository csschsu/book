/*
Create  TestDataGenerator.java jdbi in package org.community.booking  to create testdata in tables 

genererate 25 suppliers
CREATE TABLE supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

genererate 10 buyers
CREATE TABLE buyer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

genererate 200 assets using a random existing supplier_id, set price_per_hour 1
CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, description TEXT, price_per_hour REAL NOT NULL, FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE);

genererate 5 locations each with 25 random unique existing assets
CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);
CREATE TABLE asset_location (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id , asset_id INTEGER UNIQUE, name TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE);

generate 100 free 
use a random existing asset, set a random start_time between current date - 1 day and current date + 9 days, set end_time 24 hours after start_time 
CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE);

generate 10 booked
use a random existing free_id, set a random start_time between free start_time and free end_time    
CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE);


use //JSON
public static class address {
        public String email;
        public String phone;    
        } 
    } to create address

*/

package org.community.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.statement.PreparedBatch;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

public class TestDataGenerator {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
        String dbUrl = "jdbc:sqlite:booking_system.db";
        System.out.println("Ansluter till databasen: " + dbUrl);
        Jdbi jdbi = Jdbi.create(dbUrl);

        initDatabase(jdbi);

        System.out.println("Genererar testdata...");
        generateData(jdbi);
        System.out.println("Klart! Testdata har genererats framgångsrikt.");
    }

    private static void initDatabase(Jdbi jdbi) {
        jdbi.useHandle(handle -> {
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS buyer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS asset (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, description TEXT, price_per_hour REAL NOT NULL, FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS asset_location (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER, asset_id INTEGER UNIQUE, name TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)");
            handle.execute(
                    "CREATE TABLE IF NOT EXISTS booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE)");
        });
    }

    public static void generateData(Jdbi jdbi) {
        jdbi.useHandle(handle -> {
            // Inledande rensning (Motsvarande TRUNCATE i SQLite)
            // Tabellerna rensas i bakåtvänd ordning för att inte bryta mot FOREIGN
            // KEY-restriktioner
            handle.execute("DELETE FROM booked");
            handle.execute("DELETE FROM free");
            handle.execute("DELETE FROM asset_location");
            handle.execute("DELETE FROM location");
            handle.execute("DELETE FROM asset");
            handle.execute("DELETE FROM buyer");
            handle.execute("DELETE FROM supplier");

            // Nollställer AUTOINCREMENT-räknarna i SQLite så att ID börjar om på 1
            handle.execute(
                    "DELETE FROM sqlite_sequence WHERE name IN ('booked', 'free', 'asset_location', 'asset', 'buyer', 'supplier')");

            // 1. Generera 25 leverantörer (suppliers)
            PreparedBatch supplierBatch = handle.prepareBatch("INSERT INTO supplier (name, address) VALUES (?, ?)");
            for (int i = 1; i <= 25; i++) {
                String jsonAddress = toJson("supplier" + i + "@example.com", "070-11111" + String.format("%02d", i));
                supplierBatch.bind(0, "Supplier " + i).bind(1, jsonAddress).add();
            }
            supplierBatch.execute();
            List<Long> supplierIds = handle.createQuery("SELECT id FROM supplier").mapTo(Long.class).list();

            // 2. Generera 10 köpare (buyers)
            PreparedBatch buyerBatch = handle.prepareBatch("INSERT INTO buyer (name, address) VALUES (?, ?)");
            for (int i = 1; i <= 10; i++) {
                String jsonAddress = toJson("buyer" + i + "@example.com", "070-22222" + String.format("%02d", i));
                buyerBatch.bind(0, "Buyer " + i).bind(1, jsonAddress).add();
            }
            buyerBatch.execute();
            List<Long> buyerIds = handle.createQuery("SELECT id FROM buyer").mapTo(Long.class).list();

            // 3. Generera 200 tillgångar (assets)
            PreparedBatch assetBatch = handle
                    .prepareBatch("INSERT INTO asset (supplier_id, description, price_per_hour) VALUES (?, ?, ?)");
            for (int i = 1; i <= 200; i++) {
                long randomSupplierId = supplierIds.get(ThreadLocalRandom.current().nextInt(supplierIds.size()));
                assetBatch.bind(0, randomSupplierId)
                        .bind(1, "Asset Description " + i)
                        .bind(2, 1.0)
                        .add();
            }
            assetBatch.execute();
            List<Long> assetIds = handle.createQuery("SELECT id FROM asset").mapTo(Long.class).list();

            // 4. Generera 2 platser (locations) och koppla 50 unika assets till vardera
            PreparedBatch locationBatch = handle.prepareBatch("INSERT INTO location (name, address) VALUES (?, ?)");
            for (int loc = 1; loc <= 2; loc++) {
                String jsonAddress = toJson("location" + loc + "@example.com", "070-33333" + loc);
                locationBatch.bind(0, "Location " + loc).bind(1, jsonAddress).add();
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
            List<FreeTimeSlot> freeSlots = new ArrayList<>();
            PreparedBatch freeBatch = handle
                    .prepareBatch("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)");

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startRange = now.minusDays(1);
            LocalDateTime endRange = now.plusDays(9);
            long minEpochSecond = startRange.toEpochSecond(java.time.ZoneOffset.UTC);
            long maxEpochSecond = endRange.toEpochSecond(java.time.ZoneOffset.UTC);

            for (int i = 0; i < 100; i++) {
                long randomAssetId = assetIds.get(ThreadLocalRandom.current().nextInt(assetIds.size()));
                long randomStartSecond = ThreadLocalRandom.current().nextLong(minEpochSecond, maxEpochSecond);

                LocalDateTime startTime = LocalDateTime.ofEpochSecond(randomStartSecond, 0, java.time.ZoneOffset.UTC);
                LocalDateTime endTime = startTime.plusHours(48);

                freeBatch.bind(0, randomAssetId)
                        .bind(1, startTime.format(FORMATTER))
                        .bind(2, endTime.format(FORMATTER))
                        .add();

                freeSlots.add(new FreeTimeSlot(startTime, endTime));
            }
            freeBatch.execute();

            List<Long> freeIds = handle.createQuery("SELECT id FROM free ORDER BY id ASC").mapTo(Long.class).list();
            for (int i = 0; i < freeIds.size(); i++) {
                freeSlots.get(i).setId(freeIds.get(i));
            }

            // 6. Generera 10 bokade tider (booked)
            PreparedBatch bookedBatch = handle
                    .prepareBatch("INSERT INTO booked (free_id, buyer_id, start_time, end_time) VALUES (?, ?, ?, ?)");
            for (int i = 0; i < 10; i++) {
                FreeTimeSlot randomFree = freeSlots.get(ThreadLocalRandom.current().nextInt(freeSlots.size()));
                long randomBuyerId = buyerIds.get(ThreadLocalRandom.current().nextInt(buyerIds.size()));

                long freeStartSec = randomFree.getStart().toEpochSecond(java.time.ZoneOffset.UTC);
                long freeEndSec = randomFree.getEnd().toEpochSecond(java.time.ZoneOffset.UTC);

                long bookedStartSec = ThreadLocalRandom.current().nextLong(freeStartSec, freeEndSec);
                long bookedEndSec = ThreadLocalRandom.current().nextLong(bookedStartSec, freeEndSec);

                LocalDateTime bookedStart = LocalDateTime.ofEpochSecond(bookedStartSec, 0, java.time.ZoneOffset.UTC);
                LocalDateTime bookedEnd = LocalDateTime.ofEpochSecond(bookedEndSec, 0, java.time.ZoneOffset.UTC);

                bookedBatch.bind(0, randomFree.getId())
                        .bind(1, randomBuyerId)
                        .bind(2, bookedStart.format(FORMATTER))
                        .bind(3, bookedEnd.format(FORMATTER))
                        .add();
            }
            bookedBatch.execute();
        });
    }

    private static class FreeTimeSlot {
        private long id;
        private final LocalDateTime start;
        private final LocalDateTime end;

        public FreeTimeSlot(LocalDateTime start, LocalDateTime end) {
            this.start = start;
            this.end = end;
        }

        public long getId() {
            return id;
        }

        public void setId(long id) {
            this.id = id;
        }

        public LocalDateTime getStart() {
            return start;
        }

        public LocalDateTime getEnd() {
            return end;
        }
    }
}
