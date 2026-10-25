package org.community.booking.plugins;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class RandomStringGeneratorTest {

    @Test
    public void testGenerateRandomStringLength() {
        String code = RandomStringGenerator.generateRandomString(20);
        assertNotNull(code);
        assertEquals(20, code.length());
    }

    @Test
    public void testGenerateRandomStringOnlyAlphanumeric() {
        String code = RandomStringGenerator.generateRandomString(20);
        assertTrue(code.matches("^[A-Za-z0-9]{20}$"), "Code should only contain letters and digits");
    }

    @Test
    public void testGenerateRandomStringUniqueness() {
        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            String code = RandomStringGenerator.generateRandomString(20);
            assertTrue(generated.add(code), "Code should be unique: " + code);
        }
        assertEquals(1000, generated.size());
    }

    @Test
    public void testGenerateRandomStringDifferentLengths() {
        assertEquals(5, RandomStringGenerator.generateRandomString(5).length());
        assertEquals(32, RandomStringGenerator.generateRandomString(32).length());
        assertEquals(0, RandomStringGenerator.generateRandomString(0).length());
    }
}

