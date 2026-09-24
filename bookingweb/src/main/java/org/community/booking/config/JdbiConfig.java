package org.community.booking.config;

import org.community.booking.JsonAddressMapper;
import org.community.booking.Models;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.argument.AbstractArgumentFactory;
import org.jdbi.v3.core.argument.Argument;
import org.jdbi.v3.core.config.ConfigRegistry;
import org.jdbi.v3.core.mapper.ColumnMapper;
import org.jdbi.v3.core.statement.StatementContext;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Properties;

public class JdbiConfig {

    public static File findBookProjectFolder() {
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

    public static Properties loadProperties() {
        Properties props = new Properties();
        File rootDir = findBookProjectFolder();
        File propsFile = new File(rootDir, "application.properties");
        if (propsFile.exists()) {
            try (InputStream in = new FileInputStream(propsFile)) {
                props.load(in);
            } catch (Exception ignored) {
            }
        }
        if (props.isEmpty()) {
            try (InputStream in = JdbiConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
                if (in != null) {
                    props.load(in);
                }
            } catch (Exception ignored) {
            }
        }
        if (props.isEmpty()) {
            File resPropsFile = new File(rootDir, "bookingweb/src/main/resources/application.properties");
            if (resPropsFile.exists()) {
                try (InputStream in = new FileInputStream(resPropsFile)) {
                    props.load(in);
                } catch (Exception ignored) {
                }
            }
        }
        return props;
    }

    public static String getDbUrl() {
        Properties props = loadProperties();
        File rootDir = findBookProjectFolder();
        String url = props.getProperty("spring.datasource.url");
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                    "Property 'spring.datasource.url' is not configured in application.properties");
        }
        if (url.startsWith("jdbc:sqlite:")) {
            String pathPart = url.substring("jdbc:sqlite:".length());
            String queryPart = "";
            int qIndex = pathPart.indexOf('?');
            if (qIndex != -1) {
                queryPart = pathPart.substring(qIndex);
                pathPart = pathPart.substring(0, qIndex);
            }
            File dbFile = new File(pathPart);
            if (!dbFile.isAbsolute()) {
                dbFile = new File(rootDir, pathPart);
            }
            url = "jdbc:sqlite:" + dbFile.getAbsolutePath() + queryPart;
        }
        return url;
    }

    public static Jdbi createJdbi() {
        Properties props = loadProperties();
        String driverClassName = props.getProperty("spring.datasource.driver-class-name",
                props.getProperty("app.datasource.driver-class-name"));
        if (driverClassName != null && !driverClassName.isBlank()) {
            try {
                Class.forName(driverClassName);
            } catch (ClassNotFoundException ignored) {
            }
        }

        String url = getDbUrl();
        String username = props.getProperty("spring.datasource.username",
                props.getProperty("app.datasource.username"));
        String password = props.getProperty("spring.datasource.password",
                props.getProperty("app.datasource.password"));

        Jdbi jdbi;
        if (username != null && !username.isBlank()) {
            jdbi = Jdbi.create(url, username, password != null ? password : "");
        } else {
            jdbi = Jdbi.create(url);
        }
        jdbi.installPlugin(new SqlObjectPlugin());

        // Register Address mapper
        jdbi.registerColumnMapper(Models.Address.class, new JsonAddressMapper.Column());
        jdbi.registerArgument(new JsonAddressMapper.Factory());

        // Register LocalDateTime mapper (ISO-8601 TEXT <-> LocalDateTime)
        jdbi.registerArgument(new AbstractArgumentFactory<LocalDateTime>(Types.VARCHAR) {
            @Override
            protected Argument build(LocalDateTime value, ConfigRegistry config) {
                return (position, statement, ctx) -> {
                    if (value == null) {
                        statement.setNull(position, Types.VARCHAR);
                    } else {
                        statement.setString(position, value.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    }
                };
            }
        });

        jdbi.registerColumnMapper(LocalDateTime.class, new ColumnMapper<LocalDateTime>() {
            @Override
            public LocalDateTime map(ResultSet r, int columnNumber, StatementContext ctx) throws SQLException {
                String str = r.getString(columnNumber);
                if (str == null || str.isBlank()) {
                    return null;
                }
                return LocalDateTime.parse(str, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        });

        return jdbi;
    }
}
