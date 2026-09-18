package org.community.booking.config;

import org.community.booking.Book;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@PropertySource(value = "classpath:spring.properties", ignoreResourceNotFound = true)
public class AppConfig {

    @Value("${spring.datasource.url:}")
    private String configuredUrl;

    @Bean
    public Jdbi jdbi() {
        String dbUrl = (configuredUrl != null && !configuredUrl.isBlank())
                ? DbConfig.resolveDbUrl(configuredUrl)
                : DbConfig.getDbUrl();
        Jdbi jdbi = Jdbi.create(dbUrl);
        jdbi.installPlugin(new SqlObjectPlugin());
        return jdbi;
    }

    @Bean
    public Book book(Jdbi jdbi) {
        return new Book(jdbi);
    }
}
