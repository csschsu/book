package org.community.booking;

import org.jdbi.v3.sqlobject.statement.SqlUpdate;

public interface BookingDao {

    @SqlUpdate("CREATE TABLE IF NOT EXISTS supplier (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL, " +
            "address TEXT)")
    void createSupplierTable();

    @SqlUpdate("CREATE TABLE IF NOT EXISTS buyer (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL, " +
            "address TEXT)")
    void createBuyerTable();

    @SqlUpdate("CREATE TABLE IF NOT EXISTS asset (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "supplier_id INTEGER NOT NULL, " +
            "description TEXT, " +
            "price_per_hour REAL NOT NULL, " +
            "FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE)")
    void createAssetTable();

    @SqlUpdate("CREATE TABLE IF NOT EXISTS location (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "asset_id INTEGER UNIQUE, " +
            "name TEXT NOT NULL, " +
            "address TEXT, " +
            "FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)")
    void createLocationTable();

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
            "buyer_id INTEGER NOT NULL, " +
            "start_time TEXT NOT NULL, " + // SQLite stores dates as ISO8601 strings
            "end_time TEXT NOT NULL, " +
            "FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, " +
            "FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE)")
    void createBookedTable();

    default void initializeSchema() {
        createSupplierTable();
        createBuyerTable();
        createAssetTable();
        createLocationTable();
        createFreeTable();
        createBookedTable();
    }
}
