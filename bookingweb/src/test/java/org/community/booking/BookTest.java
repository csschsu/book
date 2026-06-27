package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BookTest {

    private Path tempDbFile;
    private Jdbi jdbi;
    private Book book;

    @BeforeEach
    public void setUp() throws IOException {
        // Create a temporary database file for SQLite to ensure state isolation and persistence across Jdbi handles
        tempDbFile = Files.createTempFile("booking_test_", ".db");
        String dbUrl = "jdbc:sqlite:" + tempDbFile.toAbsolutePath() + "?foreign_keys=true";

        jdbi = Jdbi.create(dbUrl);
        jdbi.installPlugin(new SqlObjectPlugin());

        // Initialize database schema
        jdbi.useExtension(org.community.booking.BookingDao.class, dao -> {
            dao.initializeSchema();
        });

        // Initialize Book instance (which registers mappers and plugins on the Jdbi instance)
        book = new Book(jdbi);
    }

    @AfterEach
    public void tearDown() throws IOException {
        // Clean up temporary database file
        Files.deleteIfExists(tempDbFile);
    }

    @Test
    public void testSupplierOperations() {
        Models.Supplier supplier = new Models.Supplier();
        supplier.name = "Test Supplier";
        supplier.address = new Models.address();
        supplier.address.email = "supplier@test.com";
        supplier.address.phone = "123456789";

        book.addSupplier(supplier);

        // Retrieve supplier (ID should be 1 as it is the first inserted)
        Models.Supplier retrieved = book.getSupplier(1);
        assertNotNull(retrieved);
        assertEquals(1, retrieved.id);
        assertEquals("Test Supplier", retrieved.name);
        assertNotNull(retrieved.address);
        assertEquals("supplier@test.com", retrieved.address.email);
        assertEquals("123456789", retrieved.address.phone);
    }

    @Test
    public void testBuyerOperations() {
        Models.Buyer buyer = new Models.Buyer();
        buyer.name = "Test Buyer";
        buyer.address = new Models.address();
        buyer.address.email = "buyer@test.com";
        buyer.address.phone = "987654321";

        book.addBuyer(buyer);

        // Retrieve buyer (ID should be 1 as it is the first inserted)
        Models.Buyer retrieved = book.getBuyer(1);
        assertNotNull(retrieved);
        assertEquals(1, retrieved.id);
        assertEquals("Test Buyer", retrieved.name);
        assertNotNull(retrieved.address);
        assertEquals("buyer@test.com", retrieved.address.email);
        assertEquals("987654321", retrieved.address.phone);
    }

    @Test
    public void testDeleteFreeTime() {
        // Insert supplier and asset to satisfy foreign keys
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO supplier (id, name, address) VALUES (1, 'Supplier 1', 'Address 1')");
            handle.execute("INSERT INTO asset (id, supplier_id, description, price_per_hour) VALUES (10, 1, 'Asset 1', 10.0)");
            handle.createUpdate("INSERT INTO free (id, asset_id, start_time, end_time) VALUES (:id, :assetId, :start, :end)")
                    .bind("id", 100)
                    .bind("assetId", 10)
                    .bind("start", LocalDateTime.of(2026, 6, 20, 10, 0))
                    .bind("end", LocalDateTime.of(2026, 6, 20, 18, 0))
                    .execute();
        });

        // Verify free slot exists
        jdbi.useHandle(handle -> {
            int count = handle.createQuery("SELECT COUNT(*) FROM free WHERE id = 100").mapTo(Integer.class).one();
            assertEquals(1, count);
        });

        // Delete free slot
        book.deleteFreeTime(100);

        // Verify free slot is deleted
        jdbi.useHandle(handle -> {
            int count = handle.createQuery("SELECT COUNT(*) FROM free WHERE id = 100").mapTo(Integer.class).one();
            assertEquals(0, count);
        });
    }

    @Test
    public void testBookTimeAndDeleteBookedTime() {
        // Setup database records
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO supplier (id, name, address) VALUES (1, 'Supplier 1', 'Address 1')");
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (2, 'Buyer 1', 'Address 2')");
            handle.execute("INSERT INTO asset (id, supplier_id, description, price_per_hour) VALUES (10, 1, 'Asset 1', 10.0)");
            handle.createUpdate("INSERT INTO free (id, asset_id, start_time, end_time) VALUES (:id, :assetId, :start, :end)")
                    .bind("id", 100)
                    .bind("assetId", 10)
                    .bind("start", LocalDateTime.of(2026, 6, 20, 10, 0))
                    .bind("end", LocalDateTime.of(2026, 6, 20, 18, 0))
                    .execute();
        });

        LocalDateTime bookStart = LocalDateTime.of(2026, 6, 20, 12, 0);
        LocalDateTime bookEnd = LocalDateTime.of(2026, 6, 20, 14, 0);

        // Book time
        book.bookTime(100, 2, bookStart, bookEnd);

        // Verify booking exists
        jdbi.useHandle(handle -> {
            int count = handle.createQuery("SELECT COUNT(*) FROM booked WHERE free_id = 100 AND buyer_id = 2").mapTo(Integer.class).one();
            assertEquals(1, count);
        });

        // Delete the booked time
        book.deleteBookedTime(1);

        // Verify booking is deleted
        jdbi.useHandle(handle -> {
            int count = handle.createQuery("SELECT COUNT(*) FROM booked WHERE id = 1").mapTo(Integer.class).one();
            assertEquals(0, count);
        });
    }

    @Test
    public void testFindTimeslot_FullAvailability() {
        setupLocationWithFreeSlot("Stockholm", 100,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Search starting from 12:00
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 12, 0));

        assertEquals(1, slots.size());
        Book.Timeslot slot = slots.get(0);
        assertEquals(100, slot.getFreeid());
        assertEquals(LocalDateTime.of(2026, 6, 20, 12, 0), slot.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 18, 0), slot.getEndTime());
    }

    @Test
    public void testFindTimeslot_PartiallyBooked() {
        setupLocationWithFreeSlot("Stockholm", 100,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Insert a buyer
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (1, 'Buyer 1', 'Address 1')");
        });

        // Add a booking from 13:00 to 15:00
        book.bookTime(100, 1,
                LocalDateTime.of(2026, 6, 20, 13, 0),
                LocalDateTime.of(2026, 6, 20, 15, 0));

        // Search starting from 10:00
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 10, 0));

        // We expect two available slots: 10:00 - 13:00 and 15:00 - 18:00
        assertEquals(2, slots.size());

        Book.Timeslot slot1 = slots.get(0);
        assertEquals(100, slot1.getFreeid());
        assertEquals(LocalDateTime.of(2026, 6, 20, 10, 0), slot1.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 13, 0), slot1.getEndTime());

        Book.Timeslot slot2 = slots.get(1);
        assertEquals(100, slot2.getFreeid());
        assertEquals(LocalDateTime.of(2026, 6, 20, 15, 0), slot2.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 18, 0), slot2.getEndTime());
    }

    @Test
    public void testFindTimeslot_FullyBooked() {
        setupLocationWithFreeSlot("Stockholm", 100,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Insert a buyer
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (1, 'Buyer 1', 'Address 1')");
        });

        // Add a booking covering the entire duration
        book.bookTime(100, 1,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Search starting from 10:00
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 10, 0));

        // No slots should be available
        assertTrue(slots.isEmpty());
    }

    @Test
    public void testFindTimeslot_MultipleBookings() {
        setupLocationWithFreeSlot("Stockholm", 100,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Insert a buyer
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (1, 'Buyer 1', 'Address 1')");
        });

        // Add booking 1: 11:00 to 12:00
        book.bookTime(100, 1,
                LocalDateTime.of(2026, 6, 20, 11, 0),
                LocalDateTime.of(2026, 6, 20, 12, 0));

        // Add booking 2: 14:00 to 15:00
        book.bookTime(100, 1,
                LocalDateTime.of(2026, 6, 20, 14, 0),
                LocalDateTime.of(2026, 6, 20, 15, 0));

        // Search starting from 11:30 (middle of the first booking)
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 11, 30));

        // We expect two slots:
        // 1. From end of booking 1 (12:00) to start of booking 2 (14:00)
        // 2. From end of booking 2 (15:00) to end of free slot (18:00)
        assertEquals(2, slots.size());

        Book.Timeslot slot1 = slots.get(0);
        assertEquals(LocalDateTime.of(2026, 6, 20, 12, 0), slot1.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 14, 0), slot1.getEndTime());

        Book.Timeslot slot2 = slots.get(1);
        assertEquals(LocalDateTime.of(2026, 6, 20, 15, 0), slot2.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 18, 0), slot2.getEndTime());
    }

    @Test
    public void testFindTimeslot_BookingAtEnd() {
        setupLocationWithFreeSlot("Stockholm", 100,
                LocalDateTime.of(2026, 6, 20, 10, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Insert a buyer
        jdbi.useHandle(handle -> {
            handle.execute("INSERT INTO buyer (id, name, address) VALUES (1, 'Buyer 1', 'Address 1')");
        });

        // Add booking covering the end: 16:00 to 18:00
        book.bookTime(100, 1,
                LocalDateTime.of(2026, 6, 20, 16, 0),
                LocalDateTime.of(2026, 6, 20, 18, 0));

        // Search starting from 10:00
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 10, 0));

        // We expect one slot: 10:00 to 16:00
        assertEquals(1, slots.size());
        Book.Timeslot slot = slots.get(0);
        assertEquals(LocalDateTime.of(2026, 6, 20, 10, 0), slot.getStartTime());
        assertEquals(LocalDateTime.of(2026, 6, 20, 16, 0), slot.getEndTime());
    }

    @Test
    public void testFindTimeslot_NoFreeSlots() {
        // Search when no slots/locations are configured at all
        List<Book.Timeslot> slots = book.findTimeslot("Stockholm", LocalDateTime.of(2026, 6, 20, 10, 0));
        assertTrue(slots.isEmpty());
    }

    // Helper method to set up supplier, asset, location, and free slot
    private void setupLocationWithFreeSlot(String locationName, int freeId, LocalDateTime start, LocalDateTime end) {
        jdbi.useHandle(handle -> {
            // Insert supplier
            handle.execute("INSERT INTO supplier (id, name, address) VALUES (1, 'Supplier 1', 'Address 1')");
            // Insert asset
            handle.execute("INSERT INTO asset (id, supplier_id, description, price_per_hour) VALUES (10, 1, 'Asset 1', 10.0)");
            // Insert location
            handle.createUpdate("INSERT INTO location (id, asset_id, name, address) VALUES (20, 10, :name, 'Location Address')")
                    .bind("name", locationName)
                    .execute();
            // Insert free block
            handle.createUpdate("INSERT INTO free (id, asset_id, start_time, end_time) VALUES (:freeId, 10, :start, :end)")
                    .bind("freeId", freeId)
                    .bind("start", start)
                    .bind("end", end)
                    .execute();
        });
    }
}
