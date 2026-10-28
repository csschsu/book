package org.community.booking;

import org.community.booking.security.UserPrincipal;
import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class DeleteBookedTimeValidationTest {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private Jdbi jdbi;
    private Book book;
    private PasswordEncoder passwordEncoder;
    private BookController controller;

    private int pastBookingId;
    private int futureBookingIdUser1;

    @BeforeEach
    public void setUp() {
        File dbFile = new File("target/test_delete_val.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
        jdbi = Jdbi.create("jdbc:sqlite:target/test_delete_val.db?foreign_keys=true");
        book = new Book(jdbi);
        passwordEncoder = new BCryptPasswordEncoder();
        controller = new BookController(book, passwordEncoder);

        jdbi.useHandle(handle -> {
            handle.execute(
                    "CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, code TEXT DEFAULT NULL, createtime TEXT NOT NULL, role TEXT NOT NULL, address TEXT, alias TEXT)");
            handle.execute(
                    "CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, latitude REAL, longitude REAL, address TEXT)");
            handle.execute(
                    "CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER, user_id INTEGER NOT NULL, name TEXT NOT NULL, mark TEXT, price_per_hour REAL NOT NULL, blob BLOB, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE, FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)");
            handle.execute(
                    "CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)");
            handle.execute(
                    "CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, user_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)");

            // Users: User 1 (BOOKUSER), User 2 (BOOKUSER), Admin (BOOKADMIN)
            handle.execute(
                    "INSERT INTO user (id, email, password, createtime, role, address, alias) VALUES (1, 'user1@test.se', 'pass', '2026-01-01T00:00:00', 'BOOKUSER', '{}', 'User 1')");
            handle.execute(
                    "INSERT INTO user (id, email, password, createtime, role, address, alias) VALUES (2, 'user2@test.se', 'pass', '2026-01-01T00:00:00', 'BOOKUSER', '{}', 'User 2')");
            handle.execute(
                    "INSERT INTO user (id, email, password, createtime, role, address, alias) VALUES (3, 'admin@test.se', 'pass', '2026-01-01T00:00:00', 'BOOKADMIN', '{}', 'Admin')");

            handle.execute("INSERT INTO location (id, name) VALUES (1, 'Location 1')");
            handle.execute("INSERT INTO asset (id, location_id, user_id, name, mark, price_per_hour) VALUES (1, 1, 1, 'Asset 1', 'Mark 1', 10.0)");

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime pastStart = now.minusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime pastEnd = pastStart.plusHours(2);
            LocalDateTime futureStart = now.plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime futureEnd = futureStart.plusHours(2);

            handle.execute("INSERT INTO free (id, asset_id, start_time, end_time) VALUES (1, 1, ?, ?)",
                    now.minusDays(10).format(FORMATTER), now.plusDays(10).format(FORMATTER));

            handle.execute("INSERT INTO booked (id, free_id, user_id, start_time, end_time) VALUES (1, 1, 1, ?, ?)",
                    pastStart.format(FORMATTER), pastEnd.format(FORMATTER));
            pastBookingId = 1;

            handle.execute("INSERT INTO booked (id, free_id, user_id, start_time, end_time) VALUES (2, 1, 1, ?, ?)",
                    futureStart.format(FORMATTER), futureEnd.format(FORMATTER));
            futureBookingIdUser1 = 2;
        });
    }

    @AfterEach
    public void tearDown() {
        File dbFile = new File("target/test_delete_val.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    private Authentication createAuth(int userId, String email, String role) {
        Models.User user = new Models.User();
        user.setId(userId);
        user.setEmail(email);
        user.setRole(role);
        user.setPassword("pass");
        UserPrincipal principal = new UserPrincipal(user);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    public void testRule2a_PastStartTimeThrowsException() {
        Authentication auth = createAuth(1, "user1@test.se", "BOOKUSER");
        BookException ex = assertThrows(BookException.class, () ->
                controller.deleteBookedTime(pastBookingId, auth));
        assertEquals("Ändring före aktuell tid är inte tillåten", ex.getMessage());
    }

    @Test
    public void testRule2b_NotLoggedInThrowsException() {
        BookException exNull = assertThrows(BookException.class, () ->
                controller.deleteBookedTime(futureBookingIdUser1, null));
        assertEquals("Delete kan bara göras av inloggad användare", exNull.getMessage());
    }

    @Test
    public void testRule2c_DifferentUserNotAdminThrowsException() {
        // User 2 tries to delete User 1's booking
        Authentication authUser2 = createAuth(2, "user2@test.se", "BOOKUSER");
        BookException ex = assertThrows(BookException.class, () ->
                controller.deleteBookedTime(futureBookingIdUser1, authUser2));
        assertEquals("Bokning tillhör annan användare", ex.getMessage());
    }

    @Test
    public void testRule2c_CreatorCanDeleteBooking() {
        // User 1 deletes their own booking
        Authentication authUser1 = createAuth(1, "user1@test.se", "BOOKUSER");
        ResponseEntity<?> response = controller.deleteBookedTime(futureBookingIdUser1, authUser1);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals(futureBookingIdUser1, body.get("deleted"));

        // Verify it was deleted from db
        assertNull(book.getBookedById(futureBookingIdUser1));
    }

    @Test
    public void testRule2c_AdminCanDeleteOtherUserBooking() {
        // Admin deletes User 1's booking
        Authentication authAdmin = createAuth(3, "admin@test.se", "BOOKADMIN");
        ResponseEntity<?> response = controller.deleteBookedTime(futureBookingIdUser1, authAdmin);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals(futureBookingIdUser1, body.get("deleted"));

        // Verify it was deleted from db
        assertNull(book.getBookedById(futureBookingIdUser1));
    }

    @Test
    public void testBookTimeInPastThrowsException() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime pastStart = now.minusDays(1).withHour(14).withMinute(0);
        LocalDateTime pastEnd = pastStart.plusHours(2);

        Authentication authUser1 = createAuth(1, "user1@test.se", "BOOKUSER");
        BookException ex = assertThrows(BookException.class, () ->
                controller.bookTime(1, 1, pastStart, pastEnd, authUser1));
        assertEquals("Ändring före aktuell tid är inte tillåten", ex.getMessage());
    }

    @Test
    public void testBookTimeInFutureSucceeds() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime futureStart = now.plusDays(3).withHour(14).withMinute(0);
        LocalDateTime futureEnd = futureStart.plusHours(2);

        Authentication authUser1 = createAuth(1, "user1@test.se", "BOOKUSER");
        ResponseEntity<?> response = controller.bookTime(1, 1, futureStart, futureEnd, authUser1);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
    }
}

