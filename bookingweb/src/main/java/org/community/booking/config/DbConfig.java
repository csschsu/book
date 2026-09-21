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

public class DbConfig {

    public static File findBookProjectFolder() {
        String currentPath = System.getProperty("user.dir");
        File dir = new File(currentPath);
        while (dir != null) {
            File pom = new File(dir, "pom.xml");
            File bookingweb = new File(dir, "bookingweb");
            File springProps = new File(dir, "spring.properties");
            if ((pom.exists() && bookingweb.exists()) || springProps.exists()) {
                return dir;
            }
            dir = dir.getParentFile();
        }
        return new File(currentPath);
    }

    public static String getDbUrl() {
        Properties props = new Properties();
        File rootDir = findBookProjectFolder();
        File propsFile = new File(rootDir, "spring.properties");
        if (propsFile.exists()) {
            try (InputStream in = new FileInputStream(propsFile)) {
                props.load(in);
            } catch (Exception ignored) {
            }
        }
        if (props.isEmpty()) {
            try (InputStream in = DbConfig.class.getClassLoader().getResourceAsStream("spring.properties")) {
                if (in != null) {
                    props.load(in);
                }
            } catch (Exception ignored) {
            }
        }

        String url = props.getProperty("spring.datasource.url", "jdbc:sqlite:booking_system.db?foreign_keys=true");
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
        String url = getDbUrl();
        Jdbi jdbi = Jdbi.create(url);
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

