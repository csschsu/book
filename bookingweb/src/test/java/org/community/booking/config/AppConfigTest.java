package org.community.booking.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

public class AppConfigTest {

    @AfterEach
    public void cleanup() {
        System.clearProperty("test.custom.key");
        System.clearProperty("spring.datasource.url");
        System.clearProperty("config.file");
        AppConfig.resetCache();
    }

    @Test
    public void testClasspathDefaultLoaded() {
        AppConfig.resetCache();
        // spring.application.name is defined in
        // src/main/resources/application.properties as "book"
        String appName = AppConfig.get("spring.application.name");
        assertEquals("book", appName);
    }

    @Test
    public void testSystemPropertyOverridesClasspath() {
        AppConfig.resetCache();
        System.setProperty("spring.application.name", "overridden-book");
        try {
            String appName = AppConfig.get("spring.application.name");
            assertEquals("overridden-book", appName);
        } finally {
            System.clearProperty("spring.application.name");
        }
    }

    @Test
    public void testFallbackDefaultValue() {
        AppConfig.resetCache();
        String missing = AppConfig.get("non.existent.key", "defaultFallback");
        assertEquals("defaultFallback", missing);
    }

    @Test
    public void testExternalPropertiesFileOverride() throws Exception {
        AppConfig.resetCache();
        File tempFile = File.createTempFile("app-prod-test", ".properties");
        tempFile.deleteOnExit();

        Properties p = new Properties();
        p.setProperty("test.custom.key", "production-value");
        p.setProperty("spring.datasource.url", "jdbc:sqlite:/custom/prod.db");
        try (FileOutputStream out = new FileOutputStream(tempFile)) {
            p.store(out, null);
        }

        System.setProperty("config.file", tempFile.getAbsolutePath());
        AppConfig.resetCache();

        try {
            assertEquals("production-value", AppConfig.get("test.custom.key"));
            assertEquals("jdbc:sqlite:/custom/prod.db", AppConfig.get("spring.datasource.url"));
        } finally {
            System.clearProperty("config.file");
            AppConfig.resetCache();
        }
    }

    @Test
    public void testJdbiConfigUsesResolvedProperties() {
        AppConfig.resetCache();
        String dbUrl = JdbiConfig.getDbUrl();
        assertNotNull(dbUrl);
        assertTrue(dbUrl.startsWith("jdbc:sqlite:"));
        assertTrue(dbUrl.contains("booking_system.db"));
    }
}
