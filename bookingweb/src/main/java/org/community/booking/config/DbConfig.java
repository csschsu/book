package org.community.booking.config;

import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

/**
 * Central database configuration utility.
 * Reads database settings from spring.properties (or application.properties)
 * and ensures the SQLite database resolves to booking_system.db in the book project folder.
 */
public class DbConfig {

    private static final String DEFAULT_DB_URL = "jdbc:sqlite:booking_system.db?foreign_keys=true";
    private static File cachedBookProjectFolder = null;

    /**
     * Locates the root "book" project folder (where root pom.xml and booking_system.db reside).
     */
    public static synchronized File findBookProjectFolder() {
        if (cachedBookProjectFolder != null && cachedBookProjectFolder.isDirectory()) {
            return cachedBookProjectFolder;
        }

        // 1. Explicit system property or environment variable
        String envDir = System.getProperty("book.project.dir");
        if (envDir == null || envDir.isBlank()) {
            envDir = System.getenv("BOOK_PROJECT_DIR");
        }
        if (envDir != null && !envDir.isBlank()) {
            File f = new File(envDir).getAbsoluteFile();
            if (f.isDirectory()) {
                cachedBookProjectFolder = f;
                return cachedBookProjectFolder;
            }
        }

        // 2. Search upwards from user.dir for directory containing bookingweb and pom.xml
        File current = new File(System.getProperty("user.dir", ".")).getAbsoluteFile();
        File dir = current;
        while (dir != null) {
            File bookingwebDir = new File(dir, "bookingweb");
            File pomFile = new File(dir, "pom.xml");
            if (bookingwebDir.isDirectory() && pomFile.isFile()) {
                cachedBookProjectFolder = dir;
                return cachedBookProjectFolder;
            }
            dir = dir.getParentFile();
        }

        // 3. Fallback to user.dir
        cachedBookProjectFolder = current;
        return cachedBookProjectFolder;
    }

    /**
     * Loads properties defined in spring.properties (with application.properties as fallback).
     */
    public static Properties loadProperties() {
        Properties props = new Properties();

        // 1. Base: application.properties from classpath
        try (InputStream in = DbConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in != null) {
                props.load(in);
            }
        } catch (Exception ignored) {
        }

        // 2. Classpath spring.properties
        try (InputStream in = DbConfig.class.getClassLoader().getResourceAsStream("spring.properties")) {
            if (in != null) {
                props.load(in);
            }
        } catch (Exception ignored) {
        }

        // 3. Project folder spring.properties if present
        File projectFolder = findBookProjectFolder();
        File externalProps = new File(projectFolder, "spring.properties");
        if (externalProps.isFile()) {
            try (InputStream in = new FileInputStream(externalProps)) {
                props.load(in);
            } catch (Exception ignored) {
            }
        }

        // 4. Working directory spring.properties if different
        File localProps = new File("spring.properties");
        if (localProps.isFile() && !localProps.getAbsolutePath().equals(externalProps.getAbsolutePath())) {
            try (InputStream in = new FileInputStream(localProps)) {
                props.load(in);
            } catch (Exception ignored) {
            }
        }

        // 5. Allow System property overrides (-Dspring.datasource.url=...)
        for (String name : props.stringPropertyNames()) {
            String sys = System.getProperty(name);
            if (sys != null && !sys.isBlank()) {
                props.setProperty(name, sys);
            }
        }

        return props;
    }

    /**
     * Resolves a JDBC URL so that relative SQLite filenames point to the book project folder.
     */
    public static String resolveDbUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = DEFAULT_DB_URL;
        }
        rawUrl = rawUrl.trim();

        String prefix = "jdbc:sqlite:";
        if (rawUrl.startsWith(prefix)) {
            String remainder = rawUrl.substring(prefix.length());
            String query = "";
            int qIdx = remainder.indexOf('?');
            if (qIdx >= 0) {
                query = remainder.substring(qIdx);
                remainder = remainder.substring(0, qIdx);
            }

            File file = new File(remainder);
            if (!file.isAbsolute()) {
                File resolved = new File(findBookProjectFolder(), remainder);
                return prefix + resolved.getAbsolutePath() + query;
            }
        }
        return rawUrl;
    }

    /**
     * Returns the resolved JDBC URL defined in spring.properties.
     */
    public static String getDbUrl() {
        Properties props = loadProperties();
        String url = props.getProperty("spring.datasource.url");
        if (url == null || url.isBlank()) {
            url = props.getProperty("database.url");
        }
        if (url == null || url.isBlank()) {
            url = props.getProperty("db.url");
        }
        if (url == null || url.isBlank()) {
            String dbName = props.getProperty("database.file", "booking_system.db");
            url = "jdbc:sqlite:" + dbName + "?foreign_keys=true";
        }
        return resolveDbUrl(url);
    }

    /**
     * Creates and configures a Jdbi instance using the database defined in spring.properties.
     */
    public static Jdbi createJdbi() {
        String url = getDbUrl();
        Jdbi jdbi = Jdbi.create(url);
        jdbi.installPlugin(new SqlObjectPlugin());
        return jdbi;
    }
}

