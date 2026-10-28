package org.community.booking;

import org.community.booking.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
public class BookController {

    private static final Logger logger = LoggerFactory.getLogger(BookController.class);

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

    @GetMapping("/location")
    public ResponseEntity<List<Models.Location>> getLocations() {
        return ResponseEntity.ok(book.getLocations());
    }

    @PostMapping({ "/location" })
    public ResponseEntity<Models.Location> createLocation(@RequestBody Models.Location location) {
        Models.Location created = book.addLocation(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping({ "/location/{id}" })
    public ResponseEntity<Models.Location> updateLocation(@PathVariable int id, @RequestBody Models.Location location) {
        location.setId(id);
        Models.Location updated = book.updateLocation(location);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping({ "/location/{id}" })
    public ResponseEntity<Map<String, Object>> deleteLocation(@PathVariable int id) {
        book.deleteLocation(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Location deleted"));
    }

    @GetMapping({ "/assets", "/asset" })
    public ResponseEntity<List<Models.Asset>> getAssets(
            @RequestParam(required = false) Integer locationId) {
        if (locationId != null) {
            return ResponseEntity.ok(book.getAssetsByLocation(locationId));
        }
        return ResponseEntity.ok(book.getAssets());
    }

    @GetMapping("/asset/{id}")
    public ResponseEntity<Models.Asset> getAssetById(@PathVariable int id) {
        Models.Asset asset = book.getAssetById(id);
        if (asset == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(asset);
    }

    @PostMapping("/location/{locationId}/asset")
    public ResponseEntity<Models.Asset> createAssetForLocation(
            @PathVariable int locationId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String mark = (String) body.get("mark");
        Double price = body.get("pricePerHour") != null ? Double.valueOf(body.get("pricePerHour").toString()) : null;
        Integer userId = body.get("userId") != null ? Integer.valueOf(body.get("userId").toString()) : null;
        Models.Asset created = book.addAssetToLocation(locationId, name, mark, price, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/asset/{id}")
    public ResponseEntity<Models.Asset> updateAsset(@PathVariable int id, @RequestBody Models.Asset asset) {
        asset.setId(id);
        Models.Asset updated = book.updateAsset(asset);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/asset/{assetId}")
    public ResponseEntity<Map<String, Object>> deleteAsset(@PathVariable int assetId) {
        book.deleteAsset(assetId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Asset deleted"));
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
    public ResponseEntity<?> deleteBookedTime(@PathVariable int bookedId, Authentication authentication) {
        Models.Booked booking = book.getBookedById(bookedId);
        if (booking == null) {
            throw new BookException("Bokning hittades inte");
        }

        // 2a. when clicked booking starttime is greater than current time it's ok to continue.
        //     When not ok Exception message from API "Ändring före aktuell tid är inte tillåten"
        if (!booking.getStartTime().isAfter(LocalDateTime.now())) {
            throw new BookException("Ändring före aktuell tid är inte tillåten");
        }

        // 2b. when current user is logged in it's ok to continue.
        //     When not ok Exception message from API "Delete kan bara göras av inloggad användare"
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BookException("Delete kan bara göras av inloggad användare");
        }

        // 2c. when clicked booking has been created by the current user OR current user has role BOOKADMIN it's ok to continue.
        //     When not ok Exception message from API "Bokning tillhör annan användare"
        boolean isCreator = booking.getUserId() == principal.getId();
        boolean isAdmin = principal.getAuthorities() != null && principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_BOOKADMIN") || a.getAuthority().equals("BOOKADMIN"));
        if (!isAdmin && principal.getRole() != null) {
            isAdmin = Arrays.stream(principal.getRole().split(","))
                    .map(String::trim)
                    .anyMatch(r -> r.equals("BOOKADMIN") || r.equals("ROLE_BOOKADMIN"));
        }

        if (!isCreator && !isAdmin) {
            throw new BookException("Bokning tillhör annan användare");
        }

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

    @PutMapping("/freeTime/{freeId}")
    public ResponseEntity<?> updateFreeTime(
            @PathVariable int freeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        book.updateFreeTime(freeId, startTime, endTime);
        return ResponseEntity.ok(Map.of("id", freeId, "message", "Free time updated successfully"));
    }

    @PostMapping("/user")
    public ResponseEntity<?> createUser(@RequestBody Models.User user) {
        if (user.getPassword() == null || user.getPassword().length() < 8) {
            throw new BookException("Password är för kort");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getCreatetime() == null || user.getCreatetime().isBlank()) {
            user.setCreatetime(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("BOOKUSER");
        }
        user.setCode(null);
        int userId = book.insertUser(user);
        user.setId(userId);
        user.setPassword(null); // Do not return hashed password
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @PutMapping({ "/user/{id}", "/users/{id}" })
    public ResponseEntity<?> updateUser(@PathVariable int id, @RequestBody Models.User user) {
        user.setId(id);
        if (user.getPassword() != null) {
            if (user.getPassword().length() < 8) {
                throw new BookException("Password är för kort");
            }
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

    @PostMapping("/confirmuser")
    public ResponseEntity<?> confirmUserPost(@RequestBody(required = false) Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        String code = body != null ? body.get("code") : null;
        return executeConfirmUser(email, code, false);
    }

    @GetMapping("/confirmuser")
    public ResponseEntity<?> confirmUserGet(@RequestParam(required = false) String email,
                                           @RequestParam(required = false) String code) {
        return executeConfirmUser(email, code, true);
    }

    private ResponseEntity<?> executeConfirmUser(String email, String code, boolean isHtml) {
        if (email != null) {
            email = email.trim();
        }
        if (code != null) {
            code = code.trim();
        }

        Models.User user = (email != null && !email.isEmpty()) ? book.getUserByEmail(email) : null;

        // b6.1.3 kontroll WARNING: email does not match user.email, no action
        if (user == null) {
            logger.warn("Confirmation attempt of NON existing user {}", email);
            if (isHtml) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .header("Content-Type", "text/html; charset=UTF-8")
                        .body(renderErrorHtml("Ogiltig användare eller felaktig länk."));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Confirmation attempt of NON existing user"));
        }

        // b6.1.2 kontroll OK: email matches user.email and table user.code=NULL
        if (user.getCode() == null) {
            logger.info("Confirmation attempt for already verified user {}", email);
            if (isHtml) {
                return ResponseEntity.ok()
                        .header("Content-Type", "text/html; charset=UTF-8")
                        .body(renderSuccessHtml("Ditt konto är redan verifierat. Du kan logga in och boka resurser."));
            }
            return ResponseEntity.ok(Map.of("message", "Användaren är redan verifierad"));
        }

        // b6.1.1 kontroll OK: email matches user.email and code matches user.code
        if (code != null && !code.isEmpty() && code.equals(user.getCode())) {
            book.updateUserCode(user.getId(), null);
            logger.info("User {} successfully confirmed and verified registration", email);
            if (isHtml) {
                return ResponseEntity.ok()
                        .header("Content-Type", "text/html; charset=UTF-8")
                        .body(renderSuccessHtml("Ditt konto har verifierats. Du kan nu logga in och börja boka resurser."));
            }
            return ResponseEntity.ok(Map.of("message", "Användaren har verifierats"));
        }

        // b6.1.4 kontroll NOTOK: email matches, code does not match and user.code != NULL
        logger.warn("Confirmation attempt with wrong code for user {}", email);
        book.deleteUserByEmail(email);
        if (isHtml) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .header("Content-Type", "text/html; charset=UTF-8")
                    .body(renderErrorHtml("Ogiltig eller utgången verifieringskod. Registrera dig på nytt om nödvändigt."));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "failed attempt to verify user"));
    }

    private String renderSuccessHtml(String message) {
        return "<!DOCTYPE html><html lang=\"sv\"><head><meta charset=\"UTF-8\"><title>Konto verifierat</title>"
                + "<style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}"
                + ".card{background:#fff;max-width:480px;margin:auto;padding:32px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);}"
                + "h1{color:#16a34a;margin-bottom:12px;}p{color:#475569;margin-bottom:24px;line-height:1.5;}"
                + "a{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;}</style>"
                + "</head><body><div class=\"card\">"
                + "<h1>Konto verifierat!</h1>"
                + "<p>" + message + "</p>"
                + "<a href=\"/\">Gå till inloggning</a>"
                + "</div></body></html>";
    }

    private String renderErrorHtml(String message) {
        return "<!DOCTYPE html><html lang=\"sv\"><head><meta charset=\"UTF-8\"><title>Verifiering misslyckades</title>"
                + "<style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}"
                + ".card{background:#fff;max-width:480px;margin:auto;padding:32px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);}"
                + "h1{color:#dc2626;margin-bottom:12px;}p{color:#475569;margin-bottom:24px;line-height:1.5;}"
                + "a{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;}</style>"
                + "</head><body><div class=\"card\">"
                + "<h1>Verifiering misslyckades</h1>"
                + "<p>" + message + "</p>"
                + "<a href=\"/\">Tillbaka till start</a>"
                + "</div></body></html>";
    }
}
