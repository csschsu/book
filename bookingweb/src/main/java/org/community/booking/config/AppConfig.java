package org.community.booking.config;

import org.community.booking.Book;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    private static final String DB_URL = "jdbc:sqlite:booking_system.db?foreign_keys=true";

    @Bean
    public Jdbi jdbi() {
        Jdbi jdbi = Jdbi.create(DB_URL);
        jdbi.installPlugin(new SqlObjectPlugin());
        return jdbi;
    }

    @Bean
    public Book book(Jdbi jdbi) {
        return new Book(jdbi);
    }
}
