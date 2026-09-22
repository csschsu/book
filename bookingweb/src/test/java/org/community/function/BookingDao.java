package org.community.function;

import org.jdbi.v3.sqlobject.statement.SqlUpdate;

public interface BookingDao {

        @SqlUpdate("CREATE TABLE IF NOT EXISTS user (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "email TEXT UNIQUE NOT NULL, " +
                        "password TEXT NOT NULL, " +
                        "code INTEGER DEFAULT 0, " +
                        "createtime TEXT NOT NULL, " +
                        "role TEXT NOT NULL, " +
                        "address TEXT, " +
                        "alias TEXT)")
        void createUserTable();

        @SqlUpdate("CREATE TABLE IF NOT EXISTS asset (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "user_id INTEGER NOT NULL, " +
                        "mark TEXT, " +
                        "price_per_hour REAL NOT NULL, " +
                        "blob BLOB, " +
                        "FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)")
        void createAssetTable();

        @SqlUpdate("CREATE TABLE IF NOT EXISTS location (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "name TEXT NOT NULL, " +
                        "latitude REAL, " +
                        "longitude REAL, " +
                        "address TEXT)")
        void createLocationTable();

        @SqlUpdate("CREATE TABLE IF NOT EXISTS asset_location (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "location_id INTEGER, " +
                        "asset_id INTEGER UNIQUE, " +
                        "name TEXT NOT NULL, " +
                        "FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, " +
                        "FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)")
        void createAssetLocationTable();

        @SqlUpdate("CREATE TABLE IF NOT EXISTS free (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "asset_id INTEGER NOT NULL, " +
                        "start_time TEXT NOT NULL, " + // SQLite stores dates as ISO8601 strings
                        "end_time TEXT NOT NULL, " +
                        "FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)")
        void createFreeTable();

        @SqlUpdate("CREATE TABLE IF NOT EXISTS booked (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "free_id INTEGER NOT NULL, " +
                        "user_id INTEGER NOT NULL, " +
                        "start_time TEXT NOT NULL, " + // SQLite stores dates as ISO8601 strings
                        "end_time TEXT NOT NULL, " +
                        "FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, " +
                        "FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)")
        void createBookedTable();

        default void initializeSchema() {
                createUserTable();
                createAssetTable();
                createLocationTable();
                createAssetLocationTable();
                createFreeTable();
                createBookedTable();
        }
}
