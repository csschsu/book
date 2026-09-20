/*
Update Book.java program using new instruction : 

User enter wanted.starttime and wanted.endtime in form

findTimeslot Model.Location search for free timeslots   
Free time is free minus booked time and 
Create a timeslot for each record in free    
for each timeslot
  read booked with free_id.
    for each booked 
      create a new timeslot using booked end_time as timeslot start_time and old timeslot end_time as end_time.
      update old timeslot, set booked start_time as end_time 
Finaly loop all timeslots and return Timeslots where wanted.starttime and wanted.endtime fits within the timeslot.

bookTime(freeid, wanted.startTime, wanted.endTime)
create a record in booked.

 */

package org.community.booking;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.community.booking.Models.Timeslot;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
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

    private static final Logger logger = LogManager.getLogger(Book.class);
    private final Jdbi jdbi;
    // Det nya specifika datumformatet med mellanslag som separator
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public Book(Jdbi jdbi) {
        logger.debug("Initializing Book service with Jdbi instance");
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
    @RegisterFieldMapper(Models.User.class)
    @RegisterFieldMapper(Models.Location.class)
    @RegisterFieldMapper(Models.AssetLocation.class)
    public interface BookingDao {

        // --- JSON / Entitetshantering ---

        @SqlUpdate("INSERT INTO user (email, password, code, createtime, role, address) VALUES (:email, :password, :code, :createtime, :role, :address)")
        void insertUser(@BindFields Models.User user);

        @SqlQuery("SELECT id, email, password, code, createtime, role, address FROM user WHERE id = :id")
        Models.User getUserById(@Bind("id") int id);

        @SqlQuery("SELECT id, name, latitude, longitude, address FROM location")
        List<Models.Location> getLocations();

        @SqlQuery("SELECT id, location_id, asset_id, name FROM asset_location")
        List<Models.AssetLocation> getAssetLocations();

        @SqlQuery("SELECT id, email, password, code, createtime, role, address FROM user WHERE email = :email")
        Models.User getUserByEmail(@Bind("email") String email);

        @SqlQuery("SELECT id, email, password, code, createtime, role, address FROM user")
        List<Models.User> getUsers();

        // --- Bokningsfunktioner ---

        @SqlQuery("SELECT f.id, f.asset_id AS assetId, f.start_time AS startTime, f.end_time AS endTime " +
                "FROM free f " +
                "JOIN asset a ON f.asset_id = a.id " +
                "JOIN asset_location l ON l.asset_id = a.id " +
                "WHERE l.location_id = :location " +
                "  AND f.end_time > :startTime")
        List<Models.Free> getFreeBlocks(@Bind("location") int location, @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT b.id, b.free_id AS freeId, b.user_id AS userId, u.email AS userEmail, b.start_time AS startTime, b.end_time AS endTime "
                + "FROM booked b "
                + "JOIN free f ON b.free_id = f.id "
                + "JOIN asset a ON f.asset_id = a.id "
                + "JOIN asset_location l ON l.asset_id = a.id "
                + "LEFT JOIN user u ON b.user_id = u.id "
                + "WHERE l.location_id = :location "
                + "  AND f.end_time > :startTime")
        List<Models.Booked> getBookedBlocks(@Bind("location") int location, @Bind("startTime") LocalDateTime startTime);

        @SqlUpdate("INSERT INTO booked (free_id, user_id, start_time, end_time) " +
                "VALUES (:freeId, :userId, :startTime, :endTime)")
        void bookTime(@Bind("freeId") int freeId, @Bind("userId") int userId,
                @Bind("startTime") LocalDateTime startTime, @Bind("endTime") LocalDateTime endTime);

        @SqlUpdate("DELETE FROM booked WHERE id = :bookedId")
        void deleteBookedTime(@Bind("bookedId") int bookedId);

        @SqlUpdate("DELETE FROM free WHERE id = :freeId")
        void deleteFreeTime(@Bind("freeId") int freeId);

        @SqlUpdate("INSERT INTO free (asset_id, start_time, end_time) VALUES (:assetId, :startTime, :endTime)")
        void addFreeTime(@Bind("assetId") int assetId, @Bind("startTime") LocalDateTime startTime,
                @Bind("endTime") LocalDateTime endTime);

        @SqlQuery("SELECT f.id, f.asset_id AS assetId, f.start_time AS startTime, f.end_time AS endTime " +
                "FROM free f " +
                "WHERE f.asset_id = :assetId " +
                "  AND f.end_time > :startTime")
        List<Models.Free> getFreeBlocksByAsset(@Bind("assetId") int assetId,
                @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT f.id, f.asset_id AS assetId, f.start_time AS startTime, f.end_time AS endTime " +
                "FROM free f " +
                "WHERE f.asset_id = :assetId " +
                "ORDER BY f.start_time ASC")
        List<Models.Free> getAllFreeBlocksByAsset(@Bind("assetId") int assetId);

        @SqlQuery("SELECT b.id, b.free_id AS freeId, b.user_id AS userId, u.email AS userEmail, b.start_time AS startTime, b.end_time AS endTime "
                + "FROM booked b "
                + "LEFT JOIN user u ON b.user_id = u.id "
                + "WHERE b.free_id = :freeId")
        List<Models.Booked> getBookedBlocksByFreeId(@Bind("freeId") int freeId);

        @SqlQuery("SELECT b.id, b.free_id AS freeId, b.user_id AS userId, u.email AS userEmail, b.start_time AS startTime, b.end_time AS endTime "
                + "FROM booked b "
                + "JOIN free f ON b.free_id = f.id "
                + "JOIN asset a ON f.asset_id = a.id "
                + "JOIN asset_location l ON l.asset_id = a.id "
                + "LEFT JOIN user u ON b.user_id = u.id "
                + "WHERE l.location_id = :location "
                + "ORDER BY b.start_time ASC")
        List<Models.Booked> getBookedBlocksByLocation(@Bind("location") int location);

        @SqlQuery("SELECT f.id, f.asset_id AS assetId, f.start_time AS startTime, f.end_time AS endTime "
                + "FROM free f "
                + "JOIN asset a ON f.asset_id = a.id "
                + "JOIN asset_location l ON l.asset_id = a.id "
                + "WHERE l.location_id = :location "
                + "ORDER BY f.start_time ASC")
        List<Models.Free> getFreeBlocksByLocation(@Bind("location") int location);
    }

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    // --- Exponerade JSON-metoder ---

    public void addUser(Models.User user) {
        logger.debug("Adding user: email={}, id={}", user.email, user.id);
        if (user.password != null && !user.password.isEmpty()) {
            if (!user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
                if (user.password.length() < 6) {
                    throw new IllegalArgumentException("Password must be at least 6 characters long");
                }
                user.password = PASSWORD_ENCODER.encode(user.password);
            }
        }
        if (user.createtime == null || user.createtime.isEmpty()) {
            user.createtime = LocalDateTime.now().format(FORMATTER);
        }
        if (user.role == null || user.role.isEmpty()) {
            user.role = "BOOKUSER";
        }
        jdbi.useExtension(BookingDao.class, dao -> dao.insertUser(user));
    }

    public Models.User getUser(int id) {
        logger.debug("Getting user by id: {}", id);
        return jdbi.withExtension(BookingDao.class, dao -> dao.getUserById(id));
    }

    public Models.User getUserByEmail(String email) {
        logger.debug("Getting user by email: {}", email);
        return jdbi.withExtension(BookingDao.class, dao -> dao.getUserByEmail(email));
    }

    public List<Models.Location> getLocations() {
        logger.debug("Getting all locations");
        return jdbi.withExtension(BookingDao.class, dao -> dao.getLocations());
    }

    public List<Models.AssetLocation> getAssetLocations() {
        logger.debug("Getting all asset locations");
        return jdbi.withExtension(BookingDao.class, dao -> dao.getAssetLocations());
    }

    public List<Models.User> getUsers() {
        logger.debug("Getting all users");
        return jdbi.withExtension(BookingDao.class, dao -> dao.getUsers());
    }

    public List<Models.Booked> getBookedBlocksByLocation(int locationId) {
        logger.debug("Getting booked blocks for locationId: {}", locationId);
        return jdbi.withExtension(BookingDao.class, dao -> dao.getBookedBlocksByLocation(locationId));
    }

    public List<Models.Free> getFreeBlocksByLocation(int locationId) {
        logger.debug("Getting free blocks for locationId: {}", locationId);
        return jdbi.withExtension(BookingDao.class, dao -> dao.getFreeBlocksByLocation(locationId));
    }

    public List<Models.Free> getAllFreeBlocksByAsset(int assetId) {
        logger.debug("Getting all free blocks for assetId: {}", assetId);
        return jdbi.withExtension(BookingDao.class, dao -> dao.getAllFreeBlocksByAsset(assetId));
    }

    public Models.User findOrCreateUser(String identifier) {
        logger.debug("findOrCreateUser called with identifier: {}", identifier);
        String email = identifier.contains("@") ? identifier
                : (identifier.toLowerCase().replaceAll("[^a-zA-Z0-9]", "") + "@example.com");
        return jdbi.withExtension(BookingDao.class, dao -> {
            Models.User user = dao.getUserByEmail(email);
            if (user == null) {
                logger.debug("User '{}' not found, creating new user record", email);
                Models.Address addr = new Models.Address();
                addr.email = email;
                addr.phone = "070-0000000";
                user = new Models.User();
                user.email = email;
                user.password = "";
                user.code = 0;
                user.createtime = LocalDateTime.now().format(FORMATTER);
                user.role = "BOOKUSER";
                user.address = addr;
                dao.insertUser(user);
                user = dao.getUserByEmail(email);
            } else {
                logger.debug("Found existing user: id={}, email={}", user.id, user.email);
            }
            return user;
        });
    }

    // --- Tidslogik med stöd för partiella bokningar ---

    public List<Models.Timeslot> findTimeslot(Models.Location location, LocalDateTime wantedStartTime,
            LocalDateTime wantedEndTime) {
        if (location == null) {
            logger.warn("findTimeslot (Location) called with null location");
            return new ArrayList<>();
        }
        logger.debug("findTimeslot (Location) called: locationId={}, wantedStartTime={}, wantedEndTime={}",
                location.id, wantedStartTime, wantedEndTime);
        List<Models.Free> freeBlocks = jdbi.withExtension(BookingDao.class,
                dao -> dao.getFreeBlocks(location.id, wantedStartTime));
        logger.debug("Fetched {} free blocks for locationId={}", freeBlocks.size(), location.id);

        List<Models.Timeslot> timeslots = new ArrayList<>();
        // start to create timeslots for each record in free
        for (Models.Free free : freeBlocks) {
            Models.Timeslot newSlot = createSlot(free.id, free.assetId, free.startTime, free.endTime);
            timeslots.add(newSlot);
            logger.debug("Created initial timeslot from free block: freeId={}, assetId={}, start={}, end={}",
                    free.id, free.assetId, free.startTime, free.endTime);
        }

        // for each timeslot (using index loop to support dynamic additions)
        for (int i = 0; i < timeslots.size(); i++) {
            Models.Timeslot slot = timeslots.get(i);
            // read booked with free_id
            List<Models.Booked> bookedBlocks = jdbi.withExtension(BookingDao.class,
                    dao -> dao.getBookedBlocksByFreeId(slot.freeid));
            logger.debug(
                    "Processing timeslot index {}: freeId={}, assetId={}, slotStart={}, slotEnd={}. Found {} booked blocks.",
                    i, slot.freeid, slot.assetId, slot.startTime, slot.endTime, bookedBlocks.size());

            for (Models.Booked booked : bookedBlocks) {
                if (!booked.startTime.isBefore(slot.startTime) && !booked.endTime.isAfter(slot.endTime)) {
                    logger.debug("Splitting timeslot [{} - {}] by booked block [{} - {}]",
                            slot.startTime, slot.endTime, booked.startTime, booked.endTime);
                    // create a new timeslot using booked end_time as timeslot start_time and old
                    // timeslot end_time as end_time
                    Models.Timeslot newSlot = createSlot(slot.freeid, slot.assetId, booked.endTime, slot.endTime);

                    // update old timeslot, set booked start_time as end_time
                    slot.endTime = booked.startTime;

                    // Add new timeslot to list to be processed for any other bookings
                    timeslots.add(newSlot);
                    logger.debug("Result of split: Updated slot to [{} - {}] and added new slot [{} - {}]",
                            slot.startTime, slot.endTime, newSlot.startTime, newSlot.endTime);
                }
            }
        }

        // Include timeslot in result only when wantedStartTime and wantedEndTime are
        // within the timeslot
        List<Models.Timeslot> filteredSlots = new ArrayList<>();
        for (Models.Timeslot slot : timeslots) {
            if (slot.startTime.isBefore(slot.endTime) && !wantedStartTime.isBefore(slot.startTime)
                    && !wantedEndTime.isAfter(slot.endTime)) {
                filteredSlots.add(slot);
            } else {
                logger.debug("Filtered out timeslot: [{} - {}] (does not fit [{} - {}] or duration is non-positive)",
                        slot.startTime, slot.endTime, wantedStartTime, wantedEndTime);
            }
        }

        // sort timeslots on startTime
        filteredSlots.sort(Comparator.comparing(slot -> slot.startTime));
        logger.debug("Returning {} filtered and sorted timeslots", filteredSlots.size());
        return filteredSlots;
    }

    public List<Models.Timeslot> findTimeslot(Models.AssetLocation assetLocation, LocalDateTime wantedStartTime,
            LocalDateTime wantedEndTime) {
        if (assetLocation == null) {
            logger.warn("findTimeslot (AssetLocation) called with null assetLocation");
            return new ArrayList<>();
        }
        logger.debug(
                "findTimeslot (AssetLocation) called: assetId={}, locationId={}, wantedStartTime={}, wantedEndTime={}",
                assetLocation.assetId, assetLocation.locationId, wantedStartTime, wantedEndTime);
        List<Models.Free> freeBlocks = jdbi.withExtension(BookingDao.class,
                dao -> dao.getFreeBlocksByAsset(assetLocation.assetId, wantedStartTime));
        logger.debug("Fetched {} free blocks for assetId={}", freeBlocks.size(), assetLocation.assetId);

        List<Models.Timeslot> timeslots = new ArrayList<>();
        // start to create timeslots for each record in free
        for (Models.Free free : freeBlocks) {
            Models.Timeslot newSlot = createSlot(free.id, free.assetId, free.startTime, free.endTime);
            timeslots.add(newSlot);
            logger.debug("Created initial timeslot from free block: freeId={}, assetId={}, start={}, end={}",
                    free.id, free.assetId, free.startTime, free.endTime);
        }

        // for each timeslot (using index loop to support dynamic additions)
        for (int i = 0; i < timeslots.size(); i++) {
            Models.Timeslot slot = timeslots.get(i);
            // read booked with free_id
            List<Models.Booked> bookedBlocks = jdbi.withExtension(BookingDao.class,
                    dao -> dao.getBookedBlocksByFreeId(slot.freeid));
            logger.debug(
                    "Processing timeslot index {}: freeId={}, assetId={}, slotStart={}, slotEnd={}. Found {} booked blocks.",
                    i, slot.freeid, slot.assetId, slot.startTime, slot.endTime, bookedBlocks.size());

            for (Models.Booked booked : bookedBlocks) {
                if (!booked.startTime.isBefore(slot.startTime) && !booked.endTime.isAfter(slot.endTime)) {
                    logger.debug("Splitting timeslot [{} - {}] by booked block [{} - {}]",
                            slot.startTime, slot.endTime, booked.startTime, booked.endTime);
                    // create a new timeslot using booked end_time as timeslot start_time and old
                    // timeslot end_time as end_time
                    Models.Timeslot newSlot = createSlot(slot.freeid, slot.assetId, booked.endTime, slot.endTime);

                    // update old timeslot, set booked start_time as end_time
                    slot.endTime = booked.startTime;

                    // Add new timeslot to list to be processed for any other bookings
                    timeslots.add(newSlot);
                    logger.debug("Result of split: Updated slot to [{} - {}] and added new slot [{} - {}]",
                            slot.startTime, slot.endTime, newSlot.startTime, newSlot.endTime);
                }
            }
        }

        // Include timeslot in result only when wantedStartTime and wantedEndTime are
        // within the timeslot
        List<Models.Timeslot> filteredSlots = new ArrayList<>();
        for (Models.Timeslot slot : timeslots) {
            if (slot.startTime.isBefore(slot.endTime) && !wantedStartTime.isBefore(slot.startTime)
                    && !wantedEndTime.isAfter(slot.endTime)) {
                filteredSlots.add(slot);
            } else {
                logger.debug("Filtered out timeslot: [{} - {}] (does not fit [{} - {}] or duration is non-positive)",
                        slot.startTime, slot.endTime, wantedStartTime, wantedEndTime);
            }
        }

        // sort timeslots on startTime
        filteredSlots.sort(Comparator.comparing(slot -> slot.startTime));
        logger.debug("Returning {} filtered and sorted timeslots", filteredSlots.size());
        return filteredSlots;
    }

    private Timeslot createSlot(int freeId, int assetId, LocalDateTime start, LocalDateTime end) {
        Timeslot slot = new Timeslot();
        slot.freeid = freeId;
        slot.assetId = assetId;
        slot.startTime = start;
        slot.endTime = end;
        return slot;
    }

    public void bookTime(int freeId, int userId, LocalDateTime startTime, LocalDateTime endTime) {
        logger.debug("bookTime called: freeId={}, userId={}, startTime={}, endTime={}", freeId, userId, startTime,
                endTime);
        jdbi.useExtension(BookingDao.class, dao -> dao.bookTime(freeId, userId, startTime, endTime));
    }

    public void deleteBookedTime(int bookedId) {
        logger.debug("deleteBookedTime called: bookedId={}", bookedId);
        jdbi.useExtension(BookingDao.class, dao -> dao.deleteBookedTime(bookedId));
    }

    public void deleteFreeTime(int freeId) {
        logger.debug("deleteFreeTime called: freeId={}", freeId);
        jdbi.useExtension(BookingDao.class, dao -> dao.deleteFreeTime(freeId));
    }

    public void addFreeTime(int assetId, LocalDateTime startTime, LocalDateTime endTime) throws BookException {
        logger.debug("addFreeTime called: assetId={}, startTime={}, endTime={}", assetId, startTime, endTime);

        // rule b. Registration of free start_time must be bigger than current time
        LocalDateTime now = LocalDateTime.now();
        if (startTime == null || !startTime.isAfter(now)) {
            throw new BookException("Registration of free start_time must be bigger than current time");
        }

        // rule c. Registration of free end_time must be bigger than start_time
        if (endTime == null || !endTime.isAfter(startTime)) {
            throw new BookException("Registration of free end_time must be bigger than start_time");
        }

        // rule a. Registration of new free time must not overlapap another free for the
        // asset
        boolean hasOverlap = jdbi.withExtension(BookingDao.class, dao -> {
            List<Models.Free> existingBlocks = dao.getAllFreeBlocksByAsset(assetId);
            for (Models.Free existing : existingBlocks) {
                if (existing.startTime != null && existing.endTime != null) {
                    if (existing.startTime.isBefore(endTime) && existing.endTime.isAfter(startTime)) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (hasOverlap) {
            throw new BookException("Registration of new free time must not overlapap another free for the asset");
        }

        jdbi.useExtension(BookingDao.class, dao -> dao.addFreeTime(assetId, startTime, endTime));
    }

}
