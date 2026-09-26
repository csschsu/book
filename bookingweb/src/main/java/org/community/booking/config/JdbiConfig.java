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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Properties;

public class JdbiConfig {

    public static File findBookProjectFolder() {
        return AppConfig.getBaseDir();
    }

    public static Properties loadProperties() {
        return AppConfig.getFileProperties();
    }

    public static String getDbUrl() {
        String url = AppConfig.get("spring.datasource.url");
        if (url == null || url.isBlank()) {
            throw new IllegalStateException(
                    "Property 'spring.datasource.url' is not configured in application.properties or environment");
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
                dbFile = new File(AppConfig.getBaseDir(), pathPart);
            }
            url = "jdbc:sqlite:" + dbFile.getAbsolutePath() + queryPart;
        }
        return url;
    }

    public static Jdbi createJdbi() {
        String driverClassName = AppConfig.get("spring.datasource.driver-class-name",
                AppConfig.get("app.datasource.driver-class-name", "org.sqlite.JDBC"));
        if (driverClassName != null && !driverClassName.isBlank()) {
            try {
                Class.forName(driverClassName);
            } catch (ClassNotFoundException ignored) {
            }
        }

        String url = getDbUrl();
        String username = AppConfig.get("spring.datasource.username",
                AppConfig.get("app.datasource.username"));
        String password = AppConfig.get("spring.datasource.password",
                AppConfig.get("app.datasource.password"));

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
