package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.File;

import static org.junit.jupiter.api.Assertions.*;

public class UserPasswordValidationTest {

    private Jdbi jdbi;
    private Book book;
    private PasswordEncoder passwordEncoder;
    private BookController controller;

    @BeforeEach
    public void setUp() {
        File dbFile = new File("target/test_user_val.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
        jdbi = Jdbi.create("jdbc:sqlite:target/test_user_val.db?foreign_keys=true");
        book = new Book(jdbi);
        passwordEncoder = new BCryptPasswordEncoder();
        controller = new BookController(book, passwordEncoder);

        jdbi.useHandle(handle -> {
            handle.execute(
                    "CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, code INTEGER DEFAULT 0, createtime TEXT NOT NULL, role TEXT NOT NULL, address TEXT, alias TEXT)");
            handle.execute(
                    "INSERT INTO user (id, email, password, createtime, role, address, alias) VALUES (1, 'existing@example.com', '"
                            + passwordEncoder.encode("existingPass123") + "', '2026-01-01T00:00:00', 'BOOKUSER', '{}', 'Existing User')");
        });
    }

    @AfterEach
    public void tearDown() {
        File dbFile = new File("target/test_user_val.db");
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    public void testCreateUserWithShortPasswordThrowsException() {
        Models.User user = new Models.User();
        user.setEmail("short@example.com");
        user.setPassword("1234567"); // 7 chars, less than 8

        BookException ex = assertThrows(BookException.class, () -> controller.createUser(user));
        assertEquals("Password är för kort", ex.getMessage());
    }

    @Test
    public void testCreateUserWithNullPasswordThrowsException() {
        Models.User user = new Models.User();
        user.setEmail("nopass@example.com");
        user.setPassword(null);

        BookException ex = assertThrows(BookException.class, () -> controller.createUser(user));
        assertEquals("Password är för kort", ex.getMessage());
    }

    @Test
    public void testCreateUserWithValidPasswordSucceeds() {
        Models.User user = new Models.User();
        user.setEmail("valid@example.com");
        user.setPassword("validPass123"); // >= 8 chars

        ResponseEntity<?> res = controller.createUser(user);
        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        assertNotNull(res.getBody());
        assertTrue(res.getBody() instanceof Models.User);
        Models.User created = (Models.User) res.getBody();
        assertNull(created.getPassword()); // password is null in response
    }

    @Test
    public void testUpdateUserWithShortPasswordThrowsException() {
        Models.User user = new Models.User();
        user.setEmail("existing@example.com");
        user.setPassword("short"); // 5 chars, less than 8

        BookException ex = assertThrows(BookException.class, () -> controller.updateUser(1, user));
        assertEquals("Password är för kort", ex.getMessage());
    }

    @Test
    public void testUpdateUserWithValidPasswordSucceeds() {
        Models.User user = new Models.User();
        user.setEmail("existing@example.com");
        user.setPassword("newValidPassword123"); // >= 8 chars

        ResponseEntity<?> res = controller.updateUser(1, user);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
    }

    @Test
    public void testUpdateUserWithoutPasswordSucceeds() {
        Models.User user = new Models.User();
        user.setEmail("existing@example.com");
        user.setAlias("Updated Alias Only");
        user.setPassword(null); // No password change

        ResponseEntity<?> res = controller.updateUser(1, user);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
    }
}
