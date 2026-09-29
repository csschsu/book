package org.community.booking.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = JwtService.class)
@TestPropertySource("classpath:application.properties")
public class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    @Test
    public void testTokenGenerationAndValidation() {
        assertNotNull(jwtService, "JwtService should be injected");

        UserDetails user = new User("test@systemkonstruktion.se", "password", Collections.emptyList());
        String token = jwtService.generateToken(user, 42, "BOOKADMIN");

        assertNotNull(token);
        assertFalse(token.isBlank());

        String username = jwtService.extractUsername(token);
        assertEquals("test@systemkonstruktion.se", username);

        Integer userId = jwtService.extractUserId(token);
        assertEquals(42, userId);

        String role = jwtService.extractRole(token);
        assertEquals("BOOKADMIN", role);

        assertTrue(jwtService.isTokenValid(token, user));
    }
}
