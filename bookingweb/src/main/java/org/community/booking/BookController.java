package org.community.booking;

import org.community.booking.security.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
public class BookController {

    private final Book book;
    private final PasswordEncoder passwordEncoder;

    public BookController(Book book, PasswordEncoder passwordEncoder) {
        this.book = book;
        this.passwordEncoder = passwordEncoder;
    }

    @ExceptionHandler(BookException.class)
    public ResponseEntity<?> handleBookException(BookException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
    }

    @GetMapping("/book")
    public ResponseEntity<String> getBookGreeting() {
        return ResponseEntity.ok("Community Booking System API is running");
    }

    @GetMapping("/locations")
    public ResponseEntity<List<Models.Location>> getLocations() {
        return ResponseEntity.ok(book.getLocations());
    }

    @PostMapping({ "/location", "/locations" })
    public ResponseEntity<Models.Location> createLocation(@RequestBody Models.Location location) {
        Models.Location created = book.addLocation(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping({ "/location/{id}", "/locations/{id}" })
    public ResponseEntity<Models.Location> updateLocation(@PathVariable int id, @RequestBody Models.Location location) {
        location.setId(id);
        Models.Location updated = book.updateLocation(location);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/assetlocations")
    public ResponseEntity<List<Models.AssetLocation>> getAssetLocations(
            @RequestParam(required = false) Integer locationId) {
        if (locationId != null) {
            return ResponseEntity.ok(book.getAssetLocationsByLocation(locationId));
        }
        return ResponseEntity.ok(book.getAssetLocations());
    }

    @PostMapping("/location/{locationId}/asset")
    public ResponseEntity<Models.AssetLocation> createAssetForLocation(
            @PathVariable int locationId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        Double price = body.get("pricePerHour") != null ? Double.valueOf(body.get("pricePerHour").toString()) : null;
        Integer userId = body.get("userId") != null ? Integer.valueOf(body.get("userId").toString()) : null;
        Models.AssetLocation created = book.addAssetToLocation(locationId, name, price, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/asset/{assetId}")
    public ResponseEntity<Map<String, Object>> deleteAsset(@PathVariable int assetId) {
        book.deleteAsset(assetId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Asset deleted"));
    }

    @DeleteMapping("/assetlocation/{id}")
    public ResponseEntity<Map<String, Object>> deleteAssetLocation(@PathVariable int id) {
        book.deleteAssetLocation(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Asset location deleted"));
    }

    @GetMapping("/booked")
    public ResponseEntity<List<Models.Booked>> getBookedByQuery(
            @RequestParam(required = false) Integer locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime) {
        if (locationId != null) {
            if (startTime != null) {
                return ResponseEntity.ok(book.getBookedBlocks(locationId, startTime));
            }
            return ResponseEntity.ok(book.getBookedBlocksByLocation(locationId));
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/booked/{locationId}")
    public ResponseEntity<List<Models.Booked>> getBookedByLocation(
            @PathVariable int locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime) {
        if (startTime != null) {
            return ResponseEntity.ok(book.getBookedBlocks(locationId, startTime));
        }
        return ResponseEntity.ok(book.getBookedBlocksByLocation(locationId));
    }

    @GetMapping("/free")
    public ResponseEntity<List<Models.Free>> getFreeByQuery(
            @RequestParam(required = false) Integer locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime) {
        if (locationId != null) {
            if (startTime != null) {
                return ResponseEntity.ok(book.getFreeBlocks(locationId, startTime));
            }
            return ResponseEntity.ok(book.getFreeBlocksByLocation(locationId));
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/free/{locationId}")
    public ResponseEntity<List<Models.Free>> getFreeByLocationAdmin(@PathVariable int locationId) {
        return ResponseEntity.ok(book.getFreeBlocksByLocation(locationId));
    }

    @GetMapping("/free/asset/{assetId}")
    public ResponseEntity<List<Models.Free>> getFreeByAssetAdmin(@PathVariable int assetId) {
        return ResponseEntity.ok(book.getAllFreeBlocksByAsset(assetId));
    }

    @PostMapping("/timeslot")
    public ResponseEntity<List<Models.Timeslot>> getTimeslots(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestBody Models.Location location) {
        return ResponseEntity.ok(book.findTimeslot(location.getId(), startTime, endTime));
    }

    @PostMapping("/free")
    public ResponseEntity<List<Models.Free>> getFreeNext24Hours(@RequestBody Models.Location location) {
        LocalDateTime now = LocalDateTime.now();
        return ResponseEntity.ok(book.getFreeBlocks(location.getId(), now));
    }

    @PostMapping("/bookTime")
    public ResponseEntity<?> bookTime(
            @RequestParam int freeId,
            @RequestParam(required = false) Integer userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            Authentication authentication) {

        int resolvedUserId;
        if (userId != null && userId > 0) {
            resolvedUserId = userId;
        } else if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            resolvedUserId = principal.getId();
        } else {
            throw new BookException("User ID is required to book a time");
        }

        int bookedId = book.bookTime(freeId, resolvedUserId, startTime, endTime);
        return ResponseEntity.ok(Map.of("id", bookedId, "message", "Booking created successfully"));
    }

    @DeleteMapping("/bookedTime/{bookedId}")
    public ResponseEntity<?> deleteBookedTime(@PathVariable int bookedId) {
        int rows = book.deleteBookedTime(bookedId);
        return ResponseEntity.ok(Map.of("success", rows > 0, "deleted", bookedId));
    }

    @DeleteMapping("/freeTime/{freeId}")
    public ResponseEntity<?> deleteFreeTime(@PathVariable int freeId) {
        int rows = book.deleteFreeTime(freeId);
        return ResponseEntity.ok(Map.of("success", rows > 0, "deleted", freeId));
    }

    @PostMapping("/freeTime")
    public ResponseEntity<?> addFreeTime(
            @RequestParam int assetId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        int freeId = book.addFreeTime(assetId, startTime, endTime);
        return ResponseEntity.ok(Map.of("id", freeId, "message", "Free time added successfully"));
    }

    @PostMapping("/user")
    public ResponseEntity<?> createUser(@RequestBody Models.User user) {
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (user.getCreatetime() == null || user.getCreatetime().isBlank()) {
            user.setCreatetime(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("BOOKUSER");
        }
        int userId = book.insertUser(user);
        user.setId(userId);
        user.setPassword(null); // Do not return hashed password
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @PutMapping({ "/user/{id}", "/users/{id}" })
    public ResponseEntity<?> updateUser(@PathVariable int id, @RequestBody Models.User user) {
        user.setId(id);
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        Models.User updated = book.updateUser(user);
        updated.setPassword(null);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<?> getUserById(@PathVariable int id) {
        Models.User user = book.getUserById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/user/email/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        Models.User user = book.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/users")
    public ResponseEntity<List<Models.User>> getUsers() {
        List<Models.User> users = book.getUsers();
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
    }
}
