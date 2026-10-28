package org.community.booking.security;

import org.community.booking.Book;
import org.community.booking.BookController;
import org.community.booking.Models;
import org.community.booking.plugins.EmailSender;
import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class UserRegistrationAndLoginTest {

    private Jdbi jdbi;
    private Book book;
    private PasswordEncoder passwordEncoder;
    private AuthenticationManager authManager;
    private JwtService jwtService;
    private EmailSender emailSender;
    private AuthController authController;
    private BookController bookController;

    private static final String DB_PATH = "target/test_user_reg.db";

    @BeforeEach
    public void setUp() {
        File dbFile = new File(DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }
        jdbi = Jdbi.create("jdbc:sqlite:" + DB_PATH + "?foreign_keys=true");
        book = new Book(jdbi);
        passwordEncoder = new BCryptPasswordEncoder();
        authManager = mock(AuthenticationManager.class);
        jwtService = mock(JwtService.class);
        emailSender = mock(EmailSender.class);

        authController = new AuthController(authManager, jwtService, book, passwordEncoder, emailSender);
        ReflectionTestUtils.setField(authController, "bookUserAdd", true);

        bookController = new BookController(book, passwordEncoder);

        jdbi.useHandle(handle -> {
            handle.execute(
                    "CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, code TEXT DEFAULT NULL, createtime TEXT NOT NULL, role TEXT NOT NULL, address TEXT, alias TEXT)");
            // 1. Verified user (code is NULL)
            handle.execute(
                    "INSERT INTO user (id, email, password, code, createtime, role, address, alias) VALUES (1, 'verified@test.se', '"
                            + passwordEncoder.encode("secret123") + "', NULL, '2026-01-01T00:00:00', 'BOOKUSER', '{}', 'Verified')");
            // 2. Unverified user (code is NOT NULL)
            handle.execute(
                    "INSERT INTO user (id, email, password, code, createtime, role, address, alias) VALUES (2, 'unverified@test.se', '"
                            + passwordEncoder.encode("secret123") + "', 'ABC12345678901234567', '2026-01-01T00:00:00', 'BOOKUSER', '{}', 'Unverified')");
        });
    }

    @AfterEach
    public void tearDown() {
        File dbFile = new File(DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    public void testRuleA1_LoginSuccessWhenCodeIsNull() {
        Models.User user = book.getUserByEmail("verified@test.se");
        UserPrincipal principal = new UserPrincipal(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        when(authManager.authenticate(any())).thenReturn(auth);
        when(jwtService.generateToken(any(), anyInt(), any())).thenReturn("mock.jwt.token");

        AuthDtos.LoginRequest req = AuthDtos.LoginRequest.builder()
                .email("verified@test.se")
                .password("secret123")
                .build();
        ResponseEntity<?> resp = authController.login(req);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertTrue(resp.getBody() instanceof AuthDtos.LoginResponse);
        AuthDtos.LoginResponse loginResp = (AuthDtos.LoginResponse) resp.getBody();
        assertEquals("mock.jwt.token", loginResp.getToken());
    }

    @Test
    public void testRuleA2_LoginForbiddenWhenCodeIsNotNull() {
        Models.User user = book.getUserByEmail("unverified@test.se");
        UserPrincipal principal = new UserPrincipal(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        when(authManager.authenticate(any())).thenReturn(auth);

        AuthDtos.LoginRequest req = AuthDtos.LoginRequest.builder()
                .email("unverified@test.se")
                .password("secret123")
                .build();
        ResponseEntity<?> resp = authController.login(req);

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("Verifiera användare innan inloggning", body.get("error"));
    }

    @Test
    public void testRuleA3_LoginUnauthorizedWhenBadCredentials() {
        when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        AuthDtos.LoginRequest req = AuthDtos.LoginRequest.builder()
                .email("verified@test.se")
                .password("wrongpassword")
                .build();
        ResponseEntity<?> resp = authController.login(req);

        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("Användare saknas eller password är fel", body.get("error"));
    }

    @Test
    public void testRegisterNewUserSuccess() {
        when(emailSender.sendVerificationEmail(anyString(), anyString())).thenReturn(true);

        ResponseEntity<?> resp = authController.register(Map.of(
                "email", "newuser@test.se",
                "password", "secret12345"
        ));

        assertEquals(HttpStatus.CREATED, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("Verifiera registrering med mottaget mail, logga därefter in", body.get("message"));

        // Verify user in db
        Models.User created = book.getUserByEmail("newuser@test.se");
        assertNotNull(created);
        assertEquals("BOOKUSER", created.getRole());
        assertNotNull(created.getCode());
        assertEquals(20, created.getCode().length());
        assertNotNull(created.getCreatetime());
        assertTrue(passwordEncoder.matches("secret12345", created.getPassword()));

        // Verify email was sent with the generated code
        verify(emailSender).sendVerificationEmail("newuser@test.se", created.getCode());
    }

    @Test
    public void testRuleB6_1_1_ConfirmUserPostSuccess() {
        Models.User before = book.getUserByEmail("unverified@test.se");
        assertNotNull(before);
        assertEquals("ABC12345678901234567", before.getCode());

        ResponseEntity<?> resp = bookController.confirmUserPost(Map.of(
                "email", "unverified@test.se",
                "code", "ABC12345678901234567"
        ));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        Models.User after = book.getUserByEmail("unverified@test.se");
        assertNotNull(after);
        assertNull(after.getCode(), "code must be NULL after successful verification");
    }

    @Test
    public void testRuleB6_1_2_ConfirmUserPostAlreadyVerifiedDoesNotDeleteUser() {
        Models.User before = book.getUserByEmail("verified@test.se");
        assertNotNull(before);
        assertNull(before.getCode());

        ResponseEntity<?> resp = bookController.confirmUserPost(Map.of(
                "email", "verified@test.se",
                "code", "ANY_CODE"
        ));

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("Användaren är redan verifierad", body.get("message"));

        Models.User after = book.getUserByEmail("verified@test.se");
        assertNotNull(after, "User must NOT be deleted when already verified");
        assertNull(after.getCode());
    }

    @Test
    public void testRuleB6_1_3_ConfirmUserPostNonExistingUserNoAction() {
        assertNull(book.getUserByEmail("nonexisting@test.se"));

        ResponseEntity<?> resp = bookController.confirmUserPost(Map.of(
                "email", "nonexisting@test.se",
                "code", "ABC12345678901234567"
        ));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) resp.getBody();
        assertNotNull(body);
        assertEquals("Confirmation attempt of NON existing user", body.get("error"));

        assertNull(book.getUserByEmail("nonexisting@test.se"));
    }

    @Test
    public void testRuleB6_1_4_ConfirmUserPostWrongCodeDeletesUser() {
        assertNotNull(book.getUserByEmail("unverified@test.se"));

        ResponseEntity<?> resp = bookController.confirmUserPost(Map.of(
                "email", "unverified@test.se",
                "code", "WRONG_CODE_12345678"
        ));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        // User should have been deleted per rule b6.1.4
        assertNull(book.getUserByEmail("unverified@test.se"), "User must be deleted on failed verification");
    }

    @Test
    public void testConfirmUserGetSuccess() {
        Models.User before = book.getUserByEmail("unverified@test.se");
        assertNotNull(before);

        ResponseEntity<?> resp = bookController.confirmUserGet("unverified@test.se", "ABC12345678901234567");

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Konto verifierat!"));

        Models.User after = book.getUserByEmail("unverified@test.se");
        assertNotNull(after);
        assertNull(after.getCode());
    }

    @Test
    public void testConfirmUserGetAlreadyVerified() {
        Models.User before = book.getUserByEmail("verified@test.se");
        assertNotNull(before);
        assertNull(before.getCode());

        ResponseEntity<?> resp = bookController.confirmUserGet("verified@test.se", "ANY_CODE");

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Konto verifierat!"));
        assertTrue(resp.getBody().toString().contains("Ditt konto är redan verifierat"));

        Models.User after = book.getUserByEmail("verified@test.se");
        assertNotNull(after);
    }

    @Test
    public void testConfirmUserGetNonExistingUser() {
        ResponseEntity<?> resp = bookController.confirmUserGet("nonexisting@test.se", "ANY_CODE");

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertTrue(resp.getBody().toString().contains("Verifiering misslyckades"));
    }
}
