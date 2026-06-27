/*
Create  TestDataGenerator.java jdbi in package org.community.booking  to create testdata in tables 

genererate 25 suppliers
CREATE TABLE supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

genererate 10 buyers
CREATE TABLE buyer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

genererate 200 assets using a random existing supplier_id, set price_per_hour 1
CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, description TEXT, price_per_hour REAL NOT NULL, FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE);

genererate 100 locations using a random but existing asset
CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER UNIQUE, name TEXT NOT NULL, address TEXT, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE);

generate 100 free 
use a random existing asset, use a random start_time between 2026-06-20 and 2026-07-20 and set end_time 24 hours after start_time 
CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE);

generate 10 booked
use a random existing free_id, set a random start_time between free start_time and free end_time    
CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE);

*/

package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class TestDataGenerator {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static void main(String[] args) {
        // Initialize Jdbi (Update the connection string to match your database)
        Jdbi jdbi = Jdbi.create("jdbc:sqlite:booking_system.db");

        jdbi.useHandle(handle -> {
            // Enable foreign keys if using SQLite
            handle.execute("PRAGMA foreign_keys = ON;");

            // 1. Generate 25 suppliers
            List<Integer> supplierIds = new ArrayList<>();
            for (int i = 1; i <= 25; i++) {
                int id = handle.createUpdate("INSERT INTO supplier (name, address) VALUES (:name, :address)")
                        .bind("name", "Supplier " + i)
                        .bind("address", "Supplier Address " + i)
                        .executeAndReturnGeneratedKeys("id")
                        .mapTo(Integer.class)
                        .one();
                supplierIds.add(id);
            }

            // 2. Generate 10 buyers
            List<Integer> buyerIds = new ArrayList<>();
            for (int i = 1; i <= 10; i++) {
                int id = handle.createUpdate("INSERT INTO buyer (name, address) VALUES (:name, :address)")
                        .bind("name", "Buyer " + i)
                        .bind("address", "Buyer Address " + i)
                        .executeAndReturnGeneratedKeys("id")
                        .mapTo(Integer.class)
                        .one();
                buyerIds.add(id);
            }

            // 3. Generate 200 assets
            List<Integer> assetIds = new ArrayList<>();
            for (int i = 1; i <= 200; i++) {
                int randomSupplierId = supplierIds.get(ThreadLocalRandom.current().nextInt(supplierIds.size()));
                int id = handle.createUpdate(
                        "INSERT INTO asset (supplier_id, description, price_per_hour) VALUES (:supplierId, :desc, :price)")
                        .bind("supplierId", randomSupplierId)
                        .bind("desc", "Asset Description " + i)
                        .bind("price", 1.0)
                        .executeAndReturnGeneratedKeys("id")
                        .mapTo(Integer.class)
                        .one();
                assetIds.add(id);
            }

            // 4. Generate 100 locations (asset_id is UNIQUE, shuffle to pick 100 unique
            // assets)
            List<Integer> shuffledAssetIds = new ArrayList<>(assetIds);
            Collections.shuffle(shuffledAssetIds);
            for (int i = 0; i < 100; i++) {
                int uniqueAssetId = shuffledAssetIds.get(i);
                handle.createUpdate("INSERT INTO location (asset_id, name, address) VALUES (:assetId, :name, :address)")
                        .bind("assetId", uniqueAssetId)
                        .bind("name", "Location " + (i + 1))
                        .bind("address", "Location Address " + (i + 1))
                        .execute();
            }

            // 5. Generate 100 free slots (Save start/end metadata for child records)
            List<FreeSlot> freeSlots = new ArrayList<>();
            LocalDateTime dateRangeStart = LocalDateTime.of(2026, 6, 20, 0, 0);
            LocalDateTime dateRangeEnd = LocalDateTime.of(2026, 7, 20, 0, 0);
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(dateRangeStart, dateRangeEnd);

            for (int i = 0; i < 100; i++) {
                int randomAssetId = assetIds.get(ThreadLocalRandom.current().nextInt(assetIds.size()));

                // Random start time within range
                long randomDays = ThreadLocalRandom.current().nextLong(daysBetween);
                long randomHours = ThreadLocalRandom.current().nextLong(24);
                LocalDateTime startTime = dateRangeStart.plusDays(randomDays).plusHours(randomHours);
                LocalDateTime endTime = startTime.plusHours(24);

                int id = handle
                        .createUpdate(
                                "INSERT INTO free (asset_id, start_time, end_time) VALUES (:assetId, :start, :end)")
                        .bind("assetId", randomAssetId)
                        .bind("start", startTime.format(FORMATTER))
                        .bind("end", endTime.format(FORMATTER))
                        .executeAndReturnGeneratedKeys("id")
                        .mapTo(Integer.class)
                        .one();

                freeSlots.add(new FreeSlot(id, startTime, endTime));
            }

            // 6. Generate 10 booked entries
            for (int i = 0; i < 10; i++) {
                FreeSlot randomFree = freeSlots.get(ThreadLocalRandom.current().nextInt(freeSlots.size()));
                int randomBuyerId = buyerIds.get(ThreadLocalRandom.current().nextInt(buyerIds.size()));

                // Random booking start/end within the specific 'free' window
                long minutesWindow = java.time.temporal.ChronoUnit.MINUTES.between(randomFree.startTime,
                        randomFree.endTime);
                long randomStartMinutes = ThreadLocalRandom.current().nextLong(minutesWindow - 60); // Ensure at least 1
                                                                                                    // hour available
                long randomDurationMinutes = ThreadLocalRandom.current().nextLong(60,
                        minutesWindow - randomStartMinutes);

                LocalDateTime bookedStart = randomFree.startTime.plusMinutes(randomStartMinutes);
                LocalDateTime bookedEnd = bookedStart.plusMinutes(randomDurationMinutes);

                handle.createUpdate(
                        "INSERT INTO booked (free_id, buyer_id, start_time, end_time) VALUES (:freeId, :buyerId, :start, :end)")
                        .bind("freeId", randomFree.id)
                        .bind("buyerId", randomBuyerId)
                        .bind("start", bookedStart.format(FORMATTER))
                        .bind("end", bookedEnd.format(FORMATTER))
                        .execute();
            }

            System.out.println("Test data successfully generated!");
        });
    }

    // Helper class to store 'free' time metadata needed for 'booked' verification
    private static class FreeSlot {
        int id;
        LocalDateTime startTime;
        LocalDateTime endTime;

        FreeSlot(int id, LocalDateTime startTime, LocalDateTime endTime) {
            this.id = id;
            this.startTime = startTime;
            this.endTime = endTime;
        }
    }
}
