package org.community.booking.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

/**
 * Unified configuration resolution for Spring Boot and standalone Java
 * utilities.
 *
 * Follows a consistent priority order:
 * 1. Java System Properties (-Dspring.datasource.url=...)
 * 2. Operating System Environment Variables (e.g. SPRING_DATASOURCE_URL,
 * SERVER_PORT)
 * 3. External application.properties (e.g. ./config/application.properties,
 * ./application.properties, or explicit -Dconfig.file)
 * 4. Bundled classpath application.properties (default development settings)
 */
public class AppConfig {

    private static volatile Properties cachedFileProps = null;

    /**
     * Resolve project root in development (folder containing pom.xml and
     * bookingweb)
     * or current working directory in production.
     */
    public static File getBaseDir() {
        String currentPath = System.getProperty("user.dir");
        File dir = new File(currentPath);
        while (dir != null) {
            File pom = new File(dir, "pom.xml");
            File bookingweb = new File(dir, "bookingweb");
            if (pom.exists() && bookingweb.exists()) {
                return dir;
            }
            dir = dir.getParentFile();
        }
        return new File(currentPath);
    }

    /**
     * Retrieve configuration property by key following the priority order.
     */
    public static String get(String key) {
        return get(key, null);
    }

    /**
     * Retrieve configuration property with fallback default value.
     */
    public static String get(String key, String defaultValue) {
        if (key == null || key.isBlank()) {
            return defaultValue;
        }

        // 1. System property (-Dkey=...)
        String val = System.getProperty(key);
        if (val != null && !val.isBlank()) {
            return val;
        }

        // 2. Environment variable (e.g. spring.datasource.url -> SPRING_DATASOURCE_URL)
        String envKey = key.toUpperCase().replace('.', '_').replace('-', '_');
        val = System.getenv(envKey);
        if (val != null && !val.isBlank()) {
            return val;
        }
        val = System.getenv(key);
        if (val != null && !val.isBlank()) {
            return val;
        }

        // 3 & 4. File-based properties (external first, then classpath)
        Properties fileProps = getFileProperties();
        val = fileProps.getProperty(key);
        if (val != null && !val.isBlank()) {
            return val;
        }

        return defaultValue;
    }

    /**
     * Reload file-based properties (useful for testing).
     */
    public static synchronized void resetCache() {
        cachedFileProps = null;
    }

    /**
     * Load combined file properties: classpath defaults overridden by external
     * configuration.
     */
    public static Properties getFileProperties() {
        Properties existing = cachedFileProps;
        if (existing != null) {
            return existing;
        }

        synchronized (AppConfig.class) {
            if (cachedFileProps != null) {
                return cachedFileProps;
            }

            Properties props = new Properties();

            // 1. Load bundled classpath defaults (e.g. development settings)
            try (InputStream in = AppConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
                if (in != null) {
                    props.load(in);
                }
            } catch (Exception ignored) {
            }

            // In dev mode, also check bookingweb/src/main/resources/application.properties
            // if classpath was empty
            if (props.isEmpty()) {
                File devFile = new File(getBaseDir(), "bookingweb/src/main/resources/application.properties");
                if (devFile.exists()) {
                    try (InputStream in = new FileInputStream(devFile)) {
                        props.load(in);
                    } catch (Exception ignored) {
                    }
                }
            }

            // 2. Override with external application.properties if present
            File externalFile = findExternalConfigFile();
            if (externalFile != null && externalFile.exists() && externalFile.isFile()) {
                Properties extProps = new Properties();
                try (InputStream in = new FileInputStream(externalFile)) {
                    extProps.load(in);
                    props.putAll(extProps);
                } catch (Exception ignored) {
                }
            }

            cachedFileProps = props;
            return props;
        }
    }

    /**
     * Search candidate locations for external configuration file.
     */
    public static File findExternalConfigFile() {
        // Explicit file via system property: -Dconfig.file=... or
        // -Dspring.config.location=...
        String customPath = System.getProperty("config.file", System.getProperty("spring.config.location"));
        if (customPath == null || customPath.isBlank()) {
            customPath = System.getenv("APP_CONFIG_FILE");
        }
        if (customPath == null || customPath.isBlank()) {
            customPath = System.getenv("SPRING_CONFIG_LOCATION");
        }

        if (customPath != null && !customPath.isBlank()) {
            if (customPath.startsWith("file:")) {
                customPath = customPath.substring("file:".length());
            }
            File customFile = new File(customPath);
            if (customFile.exists() && customFile.isFile()) {
                return customFile;
            }
        }

        // Check .config_location file if present (saved path from run.sh)
        File[] dotLocs = new File[] {
                new File(".config_location"),
                new File(getBaseDir(), ".config_location")
        };
        for (File dotLoc : dotLocs) {
            if (dotLoc.exists() && dotLoc.isFile()) {
                try {
                    String saved = java.nio.file.Files.readString(dotLoc.toPath()).trim();
                    if (!saved.isBlank()) {
                        File f = new File(saved);
                        if (f.exists() && f.isFile()) {
                            return f;
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }

        // Standard Spring Boot external search locations (relative to working
        // directory)
        File[] candidates = new File[] {
                new File("config/application.properties"),
                new File("application.properties"),
                new File(getBaseDir(), "config/application.properties"),
                new File(getBaseDir(), "application.properties")
        };

        for (File candidate : candidates) {
            if (candidate.exists() && candidate.isFile()) {
                // Avoid using development file under src/ as an "external" override
                if (!candidate.getAbsolutePath().contains("src/main/resources")) {
                    return candidate;
                }
            }
        }

        return null;
    }

    /**
     * Returns a snapshot of all resolved properties combining System props, Env
     * vars,
     * external file props, and classpath defaults.
     */
    public static Properties getAllProperties() {
        Properties merged = new Properties();
        merged.putAll(getFileProperties());

        // Merge System.getenv()
        System.getenv().forEach((k, v) -> {
            merged.put(k, v);
            // also map SPRING_XYZ -> spring.xyz
            String propKey = k.toLowerCase().replace('_', '.');
            merged.put(propKey, v);
        });

        // Merge System.getProperties()
        System.getProperties().forEach((k, v) -> {
            if (k != null && v != null) {
                merged.put(k.toString(), v.toString());
            }
        });

        return merged;
    }
}
