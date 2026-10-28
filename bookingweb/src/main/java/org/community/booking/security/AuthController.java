package org.community.booking.security;

import org.community.booking.Book;
import org.community.booking.Models;
import org.community.booking.plugins.EmailSender;
import org.community.booking.plugins.RandomStringGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final Book book;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    @Value("${book.user.add:false}")
    private boolean bookUserAdd;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
            Book book, PasswordEncoder passwordEncoder, EmailSender emailSender) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.book = book;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
    }

    @GetMapping("/auth/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of("bookUserAdd", bookUserAdd));
    }

    @PostMapping({ "/login", "/auth/login" })
    public ResponseEntity<?> login(@RequestBody AuthDtos.LoginRequest request) {
        try {
            String identifier = request.getResolvedIdentifier();
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, request.getPassword()));

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            Models.User user = principal.getUser();

            // a.1 & a.2: kontrollera att code == NULL
            if (user != null && user.getCode() != null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Verifiera användare innan inloggning"));
            }

            String token = jwtService.generateToken(principal, principal.getId(), principal.getRole());

            AuthDtos.LoginResponse response = AuthDtos.LoginResponse.builder()
                    .token(token)
                    .type("Bearer")
                    .id(principal.getId())
                    .email(principal.getUsername())
                    .role(principal.getRole())
                    .build();

            return ResponseEntity.ok(response);
        } catch (AuthenticationException e) {
            // a.3: Är email eller password är NOTOK
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Användare saknas eller password är fel"));
        }
    }

    @PostMapping({ "/register", "/auth/register" })
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        if (!bookUserAdd) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Registrering av användare är inte aktiverad"));
        }

        String email = body != null ? body.get("email") : null;
        String password = body != null ? body.get("password") : null;

        logger.info("Registration request received for email: {}", email);

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "E-postadress måste anges"));
        }
        email = email.trim();

        if (password == null || password.length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Lösenordet måste vara minst 8 tecken"));
        }

        Models.User existing = book.getUserByEmail(email);
        if (existing != null) {
            if (existing.getCode() == null) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "E-postadressen är redan registrerad"));
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "E-postadressen är redan registrerad. Verifiera användare innan inloggning"));
            }
        }

        // b2: Generera slumpmässig code med RandomStringGenerator(20) som inte visas för app
        String code = RandomStringGenerator.generateRandomString(20);

        // b3: Spara email, krypterat password, code och createtime som timestamp i tabell user
        Models.User newUser = new Models.User();
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(password));
        newUser.setCode(code);
        newUser.setCreatetime(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        newUser.setRole("BOOKUSER");
        newUser.setAddress(new Models.Address(email, ""));
        newUser.setAlias(email.contains("@") ? email.substring(0, email.indexOf('@')) : email);

        book.insertUser(newUser);
        logger.info("User registered in database with email: {}. Calling EmailSender.sendVerificationEmail", email);

        // b4: Skicka mail till email med EmailSender
        boolean emailSent = emailSender.sendVerificationEmail(email, code);
        if (emailSent) {
            logger.info("EmailSender successfully sent verification email to: {}", email);
        } else {
            logger.warn("EmailSender reported failure sending verification email to: {}", email);
        }

        // b3.1: Meddelande till frontend
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Verifiera registrering med mottaget mail, logga därefter in"));
    }

    @PostMapping({ "/logout", "/auth/logout" })
    public ResponseEntity<Map<String, String>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
