package org.community.booking;

import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;


public class App {
    private static String DB_URL = "jdbc:sqlite:booking_system.db?foreign_keys=true";

    public static void main(String[] args) {
        
        Jdbi jdbi = Jdbi.create(DB_URL);
        jdbi.installPlugin(new SqlObjectPlugin());

        // Execute schema population inside a safe global transaction block
        jdbi.useExtension(BookingDao.class, dao -> {
            System.out.println("Building operational database tables...");
            dao.initializeSchema();
            System.out.println("Database schema initialized successfully with all foreign key constraints.");
        });
    }
}
