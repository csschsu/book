package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class AddFreeTimeValidationTest {

    private Jdbi jdbi;
    private Book book;

    @BeforeEach
    public void setUp() {
        File dbFile = new File("target/test_validation.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
        jdbi = Jdbi.create("jdbc:sqlite:target/test_validation.db?foreign_keys=true");
        book = new Book(jdbi);

        // Initialize schema
        jdbi.useHandle(handle -> {
            handle.execute(
                    "CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, code INTEGER DEFAULT 0, createtime TEXT NOT NULL, role TEXT NOT NULL, address TEXT, alias TEXT)");
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

            // Create initial user and asset
            handle.execute(
                    "INSERT INTO user (id, email, password, createtime, role, address, alias) VALUES (1, 'owner@example.com', 'pass', '2026-01-01T00:00:00', 'USER', '{}', 'Alias: 1')");
            handle.execute(
                    "INSERT INTO asset (id, user_id, mark, price_per_hour) VALUES (1, 1, 'Tennis Court 1', 100.0)");
            handle.execute(
                    "INSERT INTO asset (id, user_id, mark, price_per_hour) VALUES (2, 1, 'Tennis Court 2', 100.0)");
        });
    }

    @AfterEach
    public void tearDown() {
        File dbFile = new File("target/test_validation.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    public void testRuleB_StartTimeMustBeBiggerThanCurrentTime() {
        LocalDateTime pastStart = LocalDateTime.now().minusHours(1);
        LocalDateTime futureEnd = LocalDateTime.now().plusHours(2);

        BookException ex = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, pastStart, futureEnd);
        });
        assertEquals("Start time must be in the future", ex.getMessage());
    }

    @Test
    public void testRuleC_EndTimeMustBeBiggerThanStartTime() {
        LocalDateTime futureStart = LocalDateTime.now().plusHours(2);
        LocalDateTime invalidEnd = LocalDateTime.now().plusHours(1); // Before start

        BookException ex = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, futureStart, invalidEnd);
        });
        assertEquals("End time must be after start time", ex.getMessage());

        // Equal start and end
        BookException exEqual = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, futureStart, futureStart);
        });
        assertEquals("End time must be after start time", exEqual.getMessage());
    }

    @Test
    public void testRuleA_MustNotOverlapAnotherFreeForSameAsset() {
        LocalDateTime start1 = LocalDateTime.now().plusDays(5).withHour(10).withMinute(0).withSecond(0);
        LocalDateTime end1 = start1.plusHours(4); // 10:00 - 14:00

        // First registration succeeds
        book.addFreeTime(1, start1, end1);

        // Attempt exact overlap
        BookException exExact = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, start1, end1);
        });
        assertEquals("Free time overlaps with existing free time for this asset",
                exExact.getMessage());

        // Attempt partial overlap (starts inside: 12:00 - 16:00)
        LocalDateTime startOverlap1 = start1.plusHours(2);
        LocalDateTime endOverlap1 = startOverlap1.plusHours(4);
        BookException exPartial1 = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, startOverlap1, endOverlap1);
        });
        assertEquals("Free time overlaps with existing free time for this asset",
                exPartial1.getMessage());

        // Attempt partial overlap (ends inside: 08:00 - 12:00)
        LocalDateTime startOverlap2 = start1.minusHours(2);
        LocalDateTime endOverlap2 = start1.plusHours(2);
        BookException exPartial2 = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, startOverlap2, endOverlap2);
        });
        assertEquals("Free time overlaps with existing free time for this asset",
                exPartial2.getMessage());

        // Attempt full enclosing overlap (08:00 - 16:00)
        LocalDateTime startEnclosing = start1.minusHours(2);
        LocalDateTime endEnclosing = end1.plusHours(2);
        BookException exEnclosing = assertThrows(BookException.class, () -> {
            book.addFreeTime(1, startEnclosing, endEnclosing);
        });
        assertEquals("Free time overlaps with existing free time for this asset",
                exEnclosing.getMessage());

        // Different asset with overlapping time -> Should succeed (only overlaps for
        // the same asset are rejected)
        assertDoesNotThrow(() -> {
            book.addFreeTime(2, start1, end1);
        });

        // Adjacent / back-to-back free time for same asset (14:00 - 16:00) -> Should
        // succeed (no overlap)
        assertDoesNotThrow(() -> {
            book.addFreeTime(1, end1, end1.plusHours(2));
        });

        // Preceding adjacent free time (08:00 - 10:00) -> Should succeed (no overlap)
        assertDoesNotThrow(() -> {
            book.addFreeTime(1, start1.minusHours(2), start1);
        });
    }
}
