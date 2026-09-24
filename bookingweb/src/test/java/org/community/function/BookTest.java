package org.community.function;

public class BookTest {

    // private static Book book;

    // @BeforeAll
    // public static void setup() {
    // // Run test data generator first
    // TestDataGenerator.main(new String[] {});
    // book = new Book();
    // }

    // @Test
    // public void testUsersLoaded() {
    // List<Models.User> users = book.getUsers();
    // assertNotNull(users);
    // assertTrue(users.size() >= 10);

    // Models.User user1 = book.getUserByEmail("user1@example.com");
    // assertNotNull(user1);
    // assertEquals("BOOKADMIN", user1.getRole());
    // assertNotNull(user1.getAddress());
    // assertEquals("user1@example.com", user1.getAddress().getEmail());
    // }

    // @Test
    // public void testLocationsAndAssetLocations() {
    // List<Models.Location> locations = book.getLocations();
    // assertEquals(2, locations.size());

    // List<Models.AssetLocation> assetLocations = book.getAssetLocations();
    // assertTrue(assetLocations.size() >= 100);

    // List<Models.AssetLocation> loc1Assets = book.getAssetLocationsByLocation(1);
    // assertEquals(50, loc1Assets.size());
    // }

    // @Test
    // public void testAddFreeTimeValidation() {
    // int assetId = 150; // Use high asset ID that has no free blocks initially
    // LocalDateTime now = LocalDateTime.now();

    // // 1. Start time in past should throw BookException
    // assertThrows(BookException.class, () -> {
    // book.addFreeTime(assetId, now.minusDays(1), now.plusDays(1));
    // });

    // // 2. End time before start time should throw BookException
    // assertThrows(BookException.class, () -> {
    // book.addFreeTime(assetId, now.plusDays(2), now.plusDays(1));
    // });

    // // 3. Valid free block
    // LocalDateTime start1 =
    // now.plusDays(10).withHour(10).withMinute(0).withSecond(0).withNano(0);
    // LocalDateTime end1 = start1.plusHours(4);
    // int freeId1 = book.addFreeTime(assetId, start1, end1);
    // assertTrue(freeId1 > 0);

    // // 4. Overlapping free block should throw BookException
    // LocalDateTime overlapStart = start1.plusHours(1);
    // LocalDateTime overlapEnd = end1.plusHours(1);
    // assertThrows(BookException.class, () -> {
    // book.addFreeTime(assetId, overlapStart, overlapEnd);
    // });

    // // Clean up
    // book.deleteFreeTime(freeId1);
    // }

    // @Test
    // public void testBookingAndTimeslots() {
    // int assetId = 180;
    // LocalDateTime now = LocalDateTime.now();
    // LocalDateTime freeStart =
    // now.plusDays(20).withHour(8).withMinute(0).withSecond(0).withNano(0);
    // LocalDateTime freeEnd = freeStart.plusHours(10); // 08:00 - 18:00

    // int freeId = book.addFreeTime(assetId, freeStart, freeEnd);

    // // Book 10:00 - 12:00
    // LocalDateTime bookStart = freeStart.plusHours(2);
    // LocalDateTime bookEnd = freeStart.plusHours(4);
    // int bookedId = book.bookTime(freeId, 1, bookStart, bookEnd);
    // assertTrue(bookedId > 0);

    // // Try booking overlapping interval 11:00 - 13:00 -> should fail
    // assertThrows(BookException.class, () -> {
    // book.bookTime(freeId, 2, bookStart.plusHours(1), bookEnd.plusHours(1));
    // });

    // // Delete booking and free slot
    // book.deleteBookedTime(bookedId);
    // book.deleteFreeTime(freeId);
    // }

    // @Test
    // public void testLocationAndAssetCrud() {
    // // 1. Create Location
    // Models.Location newLoc = new Models.Location();
    // newLoc.setName("Test Center");
    // newLoc.setLatitude(59.33);
    // newLoc.setLongitude(18.07);
    // newLoc.setAddress(new Models.Address("test@center.se", "08-123456"));
    // Models.Location createdLoc = book.addLocation(newLoc);
    // assertTrue(createdLoc.getId() > 0);
    // assertEquals("Test Center", createdLoc.getName());

    // // 2. Update Location
    // createdLoc.setName("Test Center Updated");
    // createdLoc.getAddress().setPhone("08-654321");
    // Models.Location updatedLoc = book.updateLocation(createdLoc);
    // assertEquals("Test Center Updated", updatedLoc.getName());
    // assertEquals("08-654321", updatedLoc.getAddress().getPhone());

    // // 3. Add Asset to Location
    // Models.AssetLocation createdAssetLoc =
    // book.addAssetToLocation(createdLoc.getId(), "Test Room 101", 150.0, 1);
    // assertNotNull(createdAssetLoc);
    // assertTrue(createdAssetLoc.getId() > 0);
    // assertEquals("Test Room 101", createdAssetLoc.getName());
    // assertEquals(createdLoc.getId(), createdAssetLoc.getLocationId());

    // List<Models.AssetLocation> locAssets =
    // book.getAssetLocationsByLocation(createdLoc.getId());
    // assertEquals(1, locAssets.size());
    // assertEquals("Test Room 101", locAssets.get(0).getName());

    // // 4. Delete Asset
    // book.deleteAsset(createdAssetLoc.getAssetId());
    // List<Models.AssetLocation> afterDeleteAssets =
    // book.getAssetLocationsByLocation(createdLoc.getId());
    // assertEquals(0, afterDeleteAssets.size());

    // // Clean up created location
    // book.deleteLocation(createdLoc.getId());
    // }
}
