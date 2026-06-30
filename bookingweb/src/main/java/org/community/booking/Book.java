/* Generate java program in this file using jdbi funtions : 

public List <Timeslot> findTimeslot (location, startTime)
list not booked time in a Free record in timeslots and sort on startTime
bookTime(freeid, startTime, endTime)
deleteBookedTime(bookedid)
deleteFreeTime(freeid)

@Data
public class Models {

    public static class Supplier {
        public int id;
        public String name;
        public Models.Address address;
    }

    public static class Buyer {
        public int id;
        public String name;
        public Models.Address address;
    }

    public static class Asset {
        public int id;
        public int supplierId;
        public String description;
        public double pricePerHour;
    }

    public static class Location {
        public int id;
        public String name;
        public Models.Address address;
    }

    public static class Booked {
        public int id;
        public int freeId;
        public int buyerId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
    }

    public static class Free {
        public int id;
        public int assetId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
    }

    // Transient
    public static class Timeslot {
        public int freeid;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
    }

    // JSON
    public static class Address {
        public String email;
        public String phone;
    }
}

    Address is a JSON object in a text string

sqlite tables in the database

CREATE TABLE supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

CREATE TABLE buyer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT);

CREATE TABLE asset (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, description TEXT, price_per_hour REAL NOT NULL, FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE);

CREATE TABLE location (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER UNIQUE, name TEXT NOT NULL, address TEXT, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE);

CREATE TABLE free (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE);

CREATE TABLE booked (id INTEGER PRIMARY KEY AUTOINCREMENT, free_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE);

 */

package org.community.booking;

import org.community.booking.Models.Timeslot;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.argument.AbstractArgumentFactory;
import org.jdbi.v3.core.argument.Argument;
import org.jdbi.v3.core.config.ConfigRegistry;
import org.jdbi.v3.core.mapper.ColumnMapper;
import org.jdbi.v3.core.statement.StatementContext;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.jdbi.v3.sqlobject.config.RegisterFieldMapper;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindFields;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Book {

    private final Jdbi jdbi;
    // Det nya specifika datumformatet med mellanslag som separator
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Book(Jdbi jdbi) {
        this.jdbi = jdbi;
        // 1. Installera SQL Object plugin
        this.jdbi.installPlugin(new SqlObjectPlugin());

        // 2. Registrera dina JSON-mappers så att JDBI känner till Models.address
        this.jdbi.registerColumnMapper(Models.Address.class, new JsonAddressMapper.Column());
        this.jdbi.registerArgument(new JsonAddressMapper.Factory());

        // 3. Registrera mappers för att lagra och läsa datum enligt mönstret
        // 'yyyy-MM-dd HH:mm:ss'
        this.jdbi.registerArgument(new AbstractArgumentFactory<LocalDateTime>(Types.VARCHAR) {
            @Override
            protected Argument build(LocalDateTime value, ConfigRegistry config) {
                return (position, statement, ctx) -> statement.setString(position, value.format(FORMATTER));
            }
        });

        this.jdbi.registerColumnMapper(LocalDateTime.class, new ColumnMapper<LocalDateTime>() {
            @Override
            public LocalDateTime map(ResultSet r, int columnNumber, StatementContext ctx) throws SQLException {
                String value = r.getString(columnNumber);
                if (value == null || value.isEmpty()) {
                    return null;
                }
                try {
                    // Tolkar strängen direkt med det nya mönstret utan att ersätta tecken
                    return LocalDateTime.parse(value, FORMATTER);
                } catch (Exception e) {
                    throw new SQLException("Kunde inte deserialisera datum till LocalDateTime: " + value, e);
                }
            }
        });
    }

    @RegisterFieldMapper(Models.Free.class)
    @RegisterFieldMapper(Models.Booked.class)
    @RegisterFieldMapper(Models.Supplier.class)
    @RegisterFieldMapper(Models.Buyer.class)
    public interface BookingDao {

        // --- JSON / Entitetshantering ---

        @SqlUpdate("INSERT INTO supplier (name, address) VALUES (:name, :address)")
        void insertSupplier(@BindFields Models.Supplier supplier);

        @SqlQuery("SELECT id, name, address FROM supplier WHERE id = :id")
        Models.Supplier getSupplierById(@Bind("id") int id);

        @SqlUpdate("INSERT INTO buyer (name, address) VALUES (:name, :address)")
        void insertBuyer(@BindFields Models.Buyer buyer);

        @SqlQuery("SELECT id, name, address FROM buyer WHERE id = :id")
        Models.Buyer getBuyerById(@Bind("id") int id);

        // --- Bokningsfunktioner ---

        @SqlQuery("SELECT f.id, f.asset_id AS assetId, f.start_time AS startTime, f.end_time AS endTime " +
                "FROM free f " +
                "JOIN asset a ON f.asset_id = a.id " +
                "JOIN location l ON l.asset_id = a.id " +
                "WHERE l.id = :locationId " +
                "  AND f.end_time > :startTime")
        List<Models.Free> getFreeBlocks(@Bind("locationId") int locationId, @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT b.id, b.free_id AS freeId, b.buyer_id AS buyerId, b.start_time AS startTime, b.end_time AS endTime "
                +
                "FROM booked b " +
                "JOIN free f ON b.free_id = f.id " +
                "JOIN asset a ON f.asset_id = a.id " +
                "JOIN location l ON l.asset_id = a.id " +
                "WHERE l.name = :location " +
                "  AND f.end_time > :startTime")
        List<Models.Booked> getBookedBlocks(@Bind("locationId") int locationId, @Bind("startTime") LocalDateTime startTime);

        @SqlUpdate("INSERT INTO booked (free_id, buyer_id, start_time, end_time) " +
                "VALUES (:freeId, :buyerId, :startTime, :endTime)")
        void bookTime(@Bind("freeId") int freeId, @Bind("buyerId") int buyerId,
                @Bind("startTime") LocalDateTime startTime, @Bind("endTime") LocalDateTime endTime);

        @SqlUpdate("DELETE FROM booked WHERE id = :bookedId")
        void deleteBookedTime(@Bind("bookedId") int bookedId);

        @SqlUpdate("DELETE FROM free WHERE id = :freeId")
        void deleteFreeTime(@Bind("freeId") int freeId);
    }

    // --- Exponerade JSON-metoder ---

    public void addSupplier(Models.Supplier supplier) {
        jdbi.useExtension(BookingDao.class, dao -> dao.insertSupplier(supplier));
    }

    public Models.Supplier getSupplier(int id) {
        return jdbi.withExtension(BookingDao.class, dao -> dao.getSupplierById(id));
    }

    public void addBuyer(Models.Buyer buyer) {
        jdbi.useExtension(BookingDao.class, dao -> dao.insertBuyer(buyer));
    }

    public Models.Buyer getBuyer(int id) {
        return jdbi.withExtension(BookingDao.class, dao -> dao.getBuyerById(id));
    }

    // --- Tidslogik med stöd för partiella bokningar ---

    public List<Models.Timeslot> findTimeslot(Models.Location location, LocalDateTime startTime) {
        List<Models.Free> freeBlocks = jdbi.withExtension(BookingDao.class,
                dao -> dao.getFreeBlocks(location.id, startTime));
        List<Models.Booked> bookedBlocks = jdbi.withExtension(BookingDao.class,
                dao -> dao.getBookedBlocks(location.id, startTime));

        List<Models.Timeslot> availableSlots = new ArrayList<>();        for (Models.Free free : freeBlocks) {
            List<Models.Booked> relevantBookings = new ArrayList<>();
            for (Models.Booked b : bookedBlocks) {
                if (b.freeId == free.id) {
                    relevantBookings.add(b);
                }
            }

            relevantBookings.sort(Comparator.comparing(b -> b.startTime));

            LocalDateTime currentStart = free.startTime.isBefore(startTime) ? startTime : free.startTime;
            LocalDateTime blockEnd = free.endTime;

            for (Models.Booked booking : relevantBookings) {
                if (booking.startTime.isAfter(currentStart)) {
                    availableSlots.add(createSlot(free.id, currentStart, booking.startTime));
                }
                if (booking.endTime.isAfter(currentStart)) {
                    currentStart = booking.endTime;
                }
            }

            if (currentStart.isBefore(blockEnd)) {
                availableSlots.add(createSlot(free.id, currentStart, blockEnd));
            }
        }

        availableSlots.sort(Comparator.comparing(slot -> slot.startTime));
        return availableSlots;
    }

    private Timeslot createSlot(int freeId, LocalDateTime start, LocalDateTime end) {
        Timeslot slot = new Timeslot();
        slot.freeid = freeId;
        slot.startTime = start;
        slot.endTime = end;
        return slot;
    }

    public void bookTime(int freeId, int buyerId, LocalDateTime startTime, LocalDateTime endTime) {
        jdbi.useExtension(BookingDao.class, dao -> dao.bookTime(freeId, buyerId, startTime, endTime));
    }

    public void deleteBookedTime(int bookedId) {
        jdbi.useExtension(BookingDao.class, dao -> dao.deleteBookedTime(bookedId));
    }

    public void deleteFreeTime(int freeId) {
        jdbi.useExtension(BookingDao.class, dao -> dao.deleteFreeTime(freeId));
    }

}
