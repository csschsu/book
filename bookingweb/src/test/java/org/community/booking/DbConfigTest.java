package org.community.booking;

import org.community.booking.config.DbConfig;
import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.Test;

import java.io.File;

import static org.junit.jupiter.api.Assertions.*;

public class DbConfigTest {

    @Test
    public void testFindBookProjectFolder() {
        File projectFolder = DbConfig.findBookProjectFolder();
        assertNotNull(projectFolder, "Project folder should not be null");
        assertTrue(projectFolder.isDirectory(), "Project folder should be a directory");
        assertTrue(new File(projectFolder, "pom.xml").isFile(), "Project folder should contain root pom.xml");
        assertTrue(new File(projectFolder, "bookingweb").isDirectory(), "Project folder should contain bookingweb sub-module");
    }

    @Test
    public void testGetDbUrlResolvesToBookProjectFolder() {
        String dbUrl = DbConfig.getDbUrl();
        assertNotNull(dbUrl);
        assertTrue(dbUrl.startsWith("jdbc:sqlite:"), "DB URL should start with jdbc:sqlite:");
        assertTrue(dbUrl.contains("booking_system.db"), "DB URL should reference booking_system.db");

        // Verify the resolved file path matches the book project folder
        File expectedFile = new File(DbConfig.findBookProjectFolder(), "booking_system.db");
        assertTrue(dbUrl.contains(expectedFile.getAbsolutePath()),
                "DB URL should point to booking_system.db inside book project folder: " + expectedFile.getAbsolutePath() + " but was: " + dbUrl);
    }

    @Test
    public void testCreateJdbi() {
        Jdbi jdbi = DbConfig.createJdbi();
        assertNotNull(jdbi);
        // Verify database connectivity
        Integer result = jdbi.withHandle(handle -> handle.createQuery("SELECT 1").mapTo(Integer.class).one());
        assertEquals(1, result);
    }
}

