package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BookTest {

    private Jdbi jdbi;
    private Book book;

    @BeforeEach
    public void setUp() {
        // Use a file-based SQLite database for testing to ensure persistence between connection opens/closes
        java.io.File dbFile = new java.io.File("target/test.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
        jdbi = Jdbi.create("jdbc:sqlite:target/test.db?foreign_keys=true");
        book = new Book(jdbi);

        // Initialize schema
        jdbi.useHandle(handle -> {
            handle.execute("CREATE TABLE supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute("CREATE TABLE buyer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute("CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, description TEXT, price_per_hour REAL NOT NULL, FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE)");
            handle.execute("CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT)");
            handle.execute("CREATE TABLE asset_location (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER, asset_id INTEGER UNIQUE, name TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)");
            handle.execute("CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)");
            handle.execute("CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE)");
        });
    }

    @org.junit.jupiter.api.AfterEach
    public void tearDown() {
        java.io.File dbFile = new java.io.File("target/test.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    public void testFindTimeslotWithAssetLocationAndSplitting() {
        // Setup initial test data
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO supplier (id, name, address) VALUES (1, 'Supplier 1', 'Supplier Address')");
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (1, 'Buyer 1', 'Buyer Address')");
            handle.execute("INSERT INTO asset (id, supplier_id, description, price_per_hour) VALUES (1, 1, 'Asset 1', 10.0)");
            handle.execute("INSERT INTO location (id, name, address) VALUES (1, 'Location 1', 'Location Address')");
            handle.execute("INSERT INTO asset_location (id, location_id, asset_id, name) VALUES (1, 1, 1, 'Asset Location 1')");
            
            // Free block: 2026-07-04T10:00:00 to 2026-07-04T18:00:00
            handle.execute("INSERT INTO free (id, asset_id, start_time, end_time) VALUES (10, 1, '2026-07-04T10:00:00', '2026-07-04T18:00:00')");
            
            // Bookings:
            // Booking 1: 2026-07-04T12:00:00 to 2026-07-04T13:00:00
            // Booking 2: 2026-07-04T15:00:00 to 2026-07-04T16:00:00
            handle.execute("INSERT INTO booked (id, free_id, buyer_id, start_time, end_time) VALUES (101, 10, 1, '2026-07-04T12:00:00', '2026-07-04T13:00:00')");
            handle.execute("INSERT INTO booked (id, free_id, buyer_id, start_time, end_time) VALUES (102, 10, 1, '2026-07-04T15:00:00', '2026-07-04T16:00:00')");
        });

        Models.AssetLocation al = new Models.AssetLocation();
        al.id = 1;
        al.locationId = 1;
        al.assetId = 1;
        al.name = "Asset Location 1";

        LocalDateTime wantedStart = LocalDateTime.of(2026, 7, 4, 13, 0);
        LocalDateTime wantedEnd = LocalDateTime.of(2026, 7, 4, 14, 30);

        List<Models.Timeslot> slots = book.findTimeslot(al, wantedStart, wantedEnd);

        // Expected timeslots:
        // Only the timeslot [13:00 to 15:00] contains the wanted range [13:00 to 14:30]
        assertEquals(1, slots.size());

        // The slot bounds should remain the original free timeslot bounds
        assertEquals(LocalDateTime.of(2026, 7, 4, 13, 0), slots.get(0).startTime);
        assertEquals(LocalDateTime.of(2026, 7, 4, 15, 0), slots.get(0).endTime);

        // Verify with another range
        LocalDateTime wantedStart2 = LocalDateTime.of(2026, 7, 4, 10, 30);
        LocalDateTime wantedEnd2 = LocalDateTime.of(2026, 7, 4, 11, 30);
        List<Models.Timeslot> slots2 = book.findTimeslot(al, wantedStart2, wantedEnd2);

        // Only the timeslot [10:00 to 12:00] contains the wanted range [10:30 to 11:30]
        assertEquals(1, slots2.size());
        assertEquals(LocalDateTime.of(2026, 7, 4, 10, 0), slots2.get(0).startTime);
        assertEquals(LocalDateTime.of(2026, 7, 4, 12, 0), slots2.get(0).endTime);
    }
}
