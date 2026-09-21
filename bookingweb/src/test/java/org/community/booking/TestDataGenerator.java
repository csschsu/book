package org.community.booking;

import org.community.booking.config.DbConfig;
import org.jdbi.v3.core.Handle;
import org.jdbi.v3.core.Jdbi;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

public class TestDataGenerator {

    public static void main(String[] args) {
        System.out.println("Starting TestDataGenerator...");
        Jdbi jdbi = DbConfig.createJdbi();

        try (Handle handle = jdbi.open()) {
            // Enable foreign keys
            handle.execute("PRAGMA foreign_keys = ON");

            System.out.println("Dropping existing tables...");
            handle.execute("DROP TABLE IF EXISTS booked");
            handle.execute("DROP TABLE IF EXISTS free");
            handle.execute("DROP TABLE IF EXISTS asset_location");
            handle.execute("DROP TABLE IF EXISTS location");
            handle.execute("DROP TABLE IF EXISTS asset");
            handle.execute("DROP TABLE IF EXISTS user");

            System.out.println("Creating tables...");
            handle.execute("""
                CREATE TABLE user (
                  id          INTEGER PRIMARY KEY AUTOINCREMENT,
                  email       TEXT UNIQUE NOT NULL,
                  password    TEXT NOT NULL,
                  code        INTEGER DEFAULT 0,
                  createtime  TEXT NOT NULL,
                  role        TEXT NOT NULL,
                  address     TEXT
                )
            """);

            handle.execute("""
                CREATE TABLE asset (
                  id             INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id        INTEGER NOT NULL,
                  mark           TEXT,
                  price_per_hour REAL NOT NULL,
                  blob           BLOB,
                  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
                )
            """);

            handle.execute("""
                CREATE TABLE location (
                  id        INTEGER PRIMARY KEY AUTOINCREMENT,
                  name      TEXT NOT NULL,
                  latitude  REAL,
                  longitude REAL,
                  address   TEXT
                )
            """);

            handle.execute("""
                CREATE TABLE asset_location (
                  id          INTEGER PRIMARY KEY AUTOINCREMENT,
                  location_id INTEGER,
                  asset_id    INTEGER UNIQUE,
                  name        TEXT NOT NULL,
                  FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE,
                  FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE
                )
            """);

            handle.execute("""
                CREATE TABLE free (
                  id         INTEGER PRIMARY KEY AUTOINCREMENT,
                  asset_id   INTEGER NOT NULL,
                  start_time TEXT NOT NULL,
                  end_time   TEXT NOT NULL,
                  FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE
                )
            """);

            handle.execute("""
                CREATE TABLE booked (
                  id         INTEGER PRIMARY KEY AUTOINCREMENT,
                  free_id    INTEGER NOT NULL,
                  user_id    INTEGER NOT NULL,
                  start_time TEXT NOT NULL,
                  end_time   TEXT NOT NULL,
                  FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
                )
            """);

            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
            String defaultHash = encoder.encode("password123");
            String nowIso = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            System.out.println("Inserting 10 users...");
            for (int i = 1; i <= 10; i++) {
                String role = "BOOKUSER";
                if (i == 1) {
                    role = "BOOKADMIN";
                } else if (i == 2) {
                    role = "BOOKUSER,BOOKADMIN";
                }
                String email = "user" + i + "@example.com";
                String address = "{\"email\":\"" + email + "\",\"phone\":\"070-12345" + String.format("%02d", i) + "\"}";

                handle.createUpdate("INSERT INTO user (email, password, code, createtime, role, address) " +
                                    "VALUES (?, ?, ?, ?, ?, ?)")
                        .bind(0, email)
                        .bind(1, defaultHash)
                        .bind(2, 1000 + i)
                        .bind(3, nowIso)
                        .bind(4, role)
                        .bind(5, address)
                        .execute();
            }

            System.out.println("Inserting 2 locations...");
            handle.createUpdate("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)")
                    .bind(0, "Location 1")
                    .bind(1, 59.3293)
                    .bind(2, 18.0686)
                    .bind(3, "{\"email\":\"contact@location1.se\",\"phone\":\"08-111222\"}")
                    .execute();

            handle.createUpdate("INSERT INTO location (name, latitude, longitude, address) VALUES (?, ?, ?, ?)")
                    .bind(0, "Location 2")
                    .bind(1, 57.7089)
                    .bind(2, 11.9746)
                    .bind(3, "{\"email\":\"contact@location2.se\",\"phone\":\"031-333444\"}")
                    .execute();

            System.out.println("Inserting 200 assets...");
            Random random = new Random(42);
            for (int i = 1; i <= 200; i++) {
                int ownerUserId = 1 + random.nextInt(10);
                String mark = "Asset " + i;
                double price = 50.0 + (random.nextInt(10) * 15.0);

                handle.createUpdate("INSERT INTO asset (user_id, mark, price_per_hour) VALUES (?, ?, ?)")
                        .bind(0, ownerUserId)
                        .bind(1, mark)
                        .bind(2, price)
                        .execute();
            }

            System.out.println("Inserting 100 asset_location links (50 per location)...");
            for (int i = 1; i <= 50; i++) {
                handle.createUpdate("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)")
                        .bind(0, 1)
                        .bind(1, i)
                        .bind(2, "Room / Resource " + i + " (Loc 1)")
                        .execute();
            }
            for (int i = 51; i <= 100; i++) {
                handle.createUpdate("INSERT INTO asset_location (location_id, asset_id, name) VALUES (?, ?, ?)")
                        .bind(0, 2)
                        .bind(1, i)
                        .bind(2, "Room / Resource " + i + " (Loc 2)")
                        .execute();
            }

            System.out.println("Inserting 100 free blocks (48h blocks, ±1-9 days)...");
            LocalDateTime baseTime = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
            for (int i = 1; i <= 100; i++) {
                int assetId = i;
                int dayOffset = (random.nextInt(18) - 8); // -8 to +9 days
                if (dayOffset == 0) dayOffset = 1; // avoid immediate past/present boundary
                LocalDateTime blockStart = baseTime.plusDays(dayOffset).withHour(8);
                LocalDateTime blockEnd = blockStart.plusHours(48);

                handle.createUpdate("INSERT INTO free (asset_id, start_time, end_time) VALUES (?, ?, ?)")
                        .bind(0, assetId)
                        .bind(1, blockStart.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .bind(2, blockEnd.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .execute();
            }

            System.out.println("Database seeded successfully!");
        }
    }
}

