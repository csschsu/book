package org.community.booking;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BookTest {

    private static Book book;

    @BeforeAll
    public static void setup() {
        // Run test data generator first
        TestDataGenerator.main(new String[]{});
        book = new Book();
    }

    @Test
    public void testUsersLoaded() {
        List<Models.User> users = book.getUsers();
        assertNotNull(users);
        assertTrue(users.size() >= 10);

        Models.User user1 = book.getUserByEmail("user1@example.com");
        assertNotNull(user1);
        assertEquals("BOOKADMIN", user1.getRole());
        assertNotNull(user1.getAddress());
        assertEquals("user1@example.com", user1.getAddress().getEmail());
    }

    @Test
    public void testLocationsAndAssetLocations() {
        List<Models.Location> locations = book.getLocations();
        assertEquals(2, locations.size());

        List<Models.AssetLocation> assetLocations = book.getAssetLocations();
        assertTrue(assetLocations.size() >= 100);

        List<Models.AssetLocation> loc1Assets = book.getAssetLocationsByLocation(1);
        assertEquals(50, loc1Assets.size());
    }

    @Test
    public void testAddFreeTimeValidation() {
        int assetId = 150; // Use high asset ID that has no free blocks initially
        LocalDateTime now = LocalDateTime.now();

        // 1. Start time in past should throw BookException
        assertThrows(BookException.class, () -> {
            book.addFreeTime(assetId, now.minusDays(1), now.plusDays(1));
        });

        // 2. End time before start time should throw BookException
        assertThrows(BookException.class, () -> {
            book.addFreeTime(assetId, now.plusDays(2), now.plusDays(1));
        });

        // 3. Valid free block
        LocalDateTime start1 = now.plusDays(10).withHour(10).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end1 = start1.plusHours(4);
        int freeId1 = book.addFreeTime(assetId, start1, end1);
        assertTrue(freeId1 > 0);

        // 4. Overlapping free block should throw BookException
        LocalDateTime overlapStart = start1.plusHours(1);
        LocalDateTime overlapEnd = end1.plusHours(1);
        assertThrows(BookException.class, () -> {
            book.addFreeTime(assetId, overlapStart, overlapEnd);
        });

        // Clean up
        book.deleteFreeTime(freeId1);
    }

    @Test
    public void testBookingAndTimeslots() {
        int assetId = 180;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime freeStart = now.plusDays(20).withHour(8).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime freeEnd = freeStart.plusHours(10); // 08:00 - 18:00

        int freeId = book.addFreeTime(assetId, freeStart, freeEnd);

        // Book 10:00 - 12:00
        LocalDateTime bookStart = freeStart.plusHours(2);
        LocalDateTime bookEnd = freeStart.plusHours(4);
        int bookedId = book.bookTime(freeId, 1, bookStart, bookEnd);
        assertTrue(bookedId > 0);

        // Try booking overlapping interval 11:00 - 13:00 -> should fail
        assertThrows(BookException.class, () -> {
            book.bookTime(freeId, 2, bookStart.plusHours(1), bookEnd.plusHours(1));
        });

        // Delete booking and free slot
        book.deleteBookedTime(bookedId);
        book.deleteFreeTime(freeId);
    }
}

