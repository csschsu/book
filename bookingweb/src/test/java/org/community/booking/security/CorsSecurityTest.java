package org.community.booking.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CorsSecurityTest {

    @Test
    public void testCorsAllowedOriginsFromProperty() {
        SecurityConfig config = new SecurityConfig(null);
        ReflectionTestUtils.setField(config, "corsAllowed", "https://localhost:5173");

        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/free");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);
        assertNotNull(corsConfig);
        assertEquals(List.of("https://localhost:5173"), corsConfig.getAllowedOrigins());
        assertTrue(corsConfig.getAllowCredentials());
        assertFalse(corsConfig.getAllowedOrigins().contains("*"));
    }

    @Test
    public void testMultipleCorsAllowedOrigins() {
        SecurityConfig config = new SecurityConfig(null);
        ReflectionTestUtils.setField(config, "corsAllowed", "https://localhost:5173, https://book.systemkonstruktion.se");

        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/free");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);
        assertNotNull(corsConfig);
        assertEquals(List.of("https://localhost:5173", "https://book.systemkonstruktion.se"), corsConfig.getAllowedOrigins());
    }
}
