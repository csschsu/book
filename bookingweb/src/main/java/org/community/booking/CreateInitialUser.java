package org.community.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Scanner;

/**
 * a18. Java program to enter initial user and password into the SQLite
 * database.
 * Also ensures database tables are initialized with the updated schema
 * (a11-a17).
 */
public class CreateInitialUser {

    private static final String DB_URL = "jdbc:sqlite:booking_system.db?foreign_keys=true";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    public static void main(String[] args) {
        System.out.println("Connecting to database: " + DB_URL);
        Jdbi jdbi = Jdbi.create(DB_URL);
        jdbi.installPlugin(new SqlObjectPlugin());

        initializeDatabase(jdbi);

        String email = null;
        String password = null;

        if (args != null && args.length >= 2) {
            email = args[0];
            password = args[1];
        } else {
            Scanner scanner = new Scanner(System.in);
            System.out.print("Enter email: ");
            if (scanner.hasNextLine()) {
                email = scanner.nextLine().trim();
            }
            System.out.print("Enter password: ");
            if (scanner.hasNextLine()) {
                password = scanner.nextLine().trim();
            }
            scanner.close();
        }

        if (email != null && !email.isEmpty() && password != null && !password.isEmpty()) {
            insertUser(jdbi, email, password, "BOOKADMIN");
        } else {
            System.out.println("Email or password not provided.");
        }

        System.out.println("User initialization complete.");
    }

    public static void initializeDatabase(Jdbi jdbi) {
        jdbi.useHandle(handle -> {
            System.out.println("Ensuring user database table exists...");
            // Check if user table exists and whether it needs migration (a17)
            boolean userTableExists = handle.createQuery(
                    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='user'")
                    .mapTo(Integer.class)
                    .one() > 0;

            if (userTableExists) {
                java.util.List<String> columns = handle.createQuery("PRAGMA table_info(user)")
                        .map((rs, ctx) -> rs.getString("name"))
                        .list();
                if (!columns.contains("email")) {
                    System.out.println("Old user schema detected. Migrating user table (a17)...");
                    handle.execute("DROP TABLE IF EXISTS user");
                }
            }

            handle.execute("CREATE TABLE IF NOT EXISTS user (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "email TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL, " +
                    "code INTEGER DEFAULT 0, " +
                    "createtime TEXT NOT NULL, " +
                    "role TEXT NOT NULL, " +
                    "address TEXT)");
            handle.execute("CREATE VIEW IF NOT EXISTS users AS SELECT * FROM user");
        });
    }

    public static void insertUser(Jdbi jdbi, String email, String rawPassword, String role) {
        if (rawPassword == null || rawPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long");
        }

        String hashedPassword = PASSWORD_ENCODER.encode(rawPassword);
        String createtime = LocalDateTime.now().format(FORMATTER);
        int code = 0;

        Models.Address addr = new Models.Address();
        addr.email = email;
        addr.phone = "070-1234567";

        String jsonAddress;
        try {
            jsonAddress = OBJECT_MAPPER.writeValueAsString(addr);
        } catch (Exception e) {
            jsonAddress = "{}";
        }

        final String finalAddress = jsonAddress;
        jdbi.useHandle(handle -> {
            Integer existingId = handle.createQuery("SELECT id FROM user WHERE email = :email")
                    .bind("email", email)
                    .mapTo(Integer.class)
                    .findOne()
                    .orElse(null);

            if (existingId == null) {
                handle.createUpdate("INSERT INTO user (email, password, code, createtime, role, address) " +
                        "VALUES (:email, :password, :code, :createtime, :role, :address)")
                        .bind("email", email)
                        .bind("password", hashedPassword)
                        .bind("code", code)
                        .bind("createtime", createtime)
                        .bind("role", role)
                        .bind("address", finalAddress)
                        .execute();
                System.out.println("Inserted user: " + email + " with role: " + role);
            } else {
                handle.createUpdate("UPDATE user SET password = :password, role = :role, address = :address " +
                        "WHERE id = :id")
                        .bind("password", hashedPassword)
                        .bind("role", role)
                        .bind("address", finalAddress)
                        .bind("id", existingId)
                        .execute();
                System.out.println("Updated existing user: " + email + " with role: " + role);
            }
        });
    }
}
