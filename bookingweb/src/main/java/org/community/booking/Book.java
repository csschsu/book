package org.community.booking;

import org.community.booking.config.DbConfig;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.config.RegisterFieldMapper;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindBean;
import org.jdbi.v3.sqlobject.statement.GetGeneratedKeys;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;
import org.springframework.stereotype.Service;

import org.jdbi.v3.core.argument.AbstractArgumentFactory;
import org.jdbi.v3.core.argument.Argument;
import org.jdbi.v3.core.config.ConfigRegistry;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;

import java.sql.Types;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class Book {

    public interface BookingDao {
        @SqlUpdate("INSERT INTO user (email, password, code, createtime, role, address) " +
                   "VALUES (:email, :password, :code, :createtime, :role, :address)")
        @GetGeneratedKeys("id")
        int insertUser(@BindBean Models.User user);

        @SqlQuery("SELECT * FROM user WHERE id = :id")
        @RegisterFieldMapper(Models.User.class)
        Models.User getUserById(@Bind("id") int id);

        @SqlQuery("SELECT * FROM user WHERE email = :email")
        @RegisterFieldMapper(Models.User.class)
        Models.User getUserByEmail(@Bind("email") String email);

        @SqlQuery("SELECT * FROM user ORDER BY id")
        @RegisterFieldMapper(Models.User.class)
        List<Models.User> getUsers();

        @SqlQuery("SELECT * FROM location ORDER BY id")
        @RegisterFieldMapper(Models.Location.class)
        List<Models.Location> getLocations();

        @SqlQuery("SELECT * FROM location WHERE id = :id")
        @RegisterFieldMapper(Models.Location.class)
        Models.Location getLocationById(@Bind("id") int id);

        @SqlUpdate("INSERT INTO location (name, latitude, longitude, address) VALUES (:name, :latitude, :longitude, :address)")
        @GetGeneratedKeys("id")
        int insertLocation(@BindBean Models.Location location);

        @SqlUpdate("UPDATE location SET name = :name, latitude = :latitude, longitude = :longitude, address = :address WHERE id = :id")
        int updateLocation(@BindBean Models.Location location);

        @SqlUpdate("DELETE FROM location WHERE id = :id")
        int deleteLocation(@Bind("id") int id);

        @SqlQuery("SELECT * FROM asset WHERE id = :id")
        @RegisterFieldMapper(Models.Asset.class)
        Models.Asset getAssetById(@Bind("id") int id);

        @SqlUpdate("INSERT INTO asset (user_id, mark, price_per_hour, blob) VALUES (:userId, :mark, :pricePerHour, :blob)")
        @GetGeneratedKeys("id")
        int insertAsset(@BindBean Models.Asset asset);

        @SqlUpdate("DELETE FROM asset WHERE id = :id")
        int deleteAsset(@Bind("id") int id);

        @SqlQuery("SELECT * FROM asset_location ORDER BY id")
        @RegisterFieldMapper(Models.AssetLocation.class)
        List<Models.AssetLocation> getAssetLocations();

        @SqlQuery("SELECT * FROM asset_location WHERE id = :id")
        @RegisterFieldMapper(Models.AssetLocation.class)
        Models.AssetLocation getAssetLocationById(@Bind("id") int id);

        @SqlQuery("SELECT * FROM asset_location WHERE location_id = :locationId ORDER BY id")
        @RegisterFieldMapper(Models.AssetLocation.class)
        List<Models.AssetLocation> getAssetLocationsByLocation(@Bind("locationId") int locationId);

        @SqlUpdate("INSERT INTO asset_location (location_id, asset_id, name) VALUES (:locationId, :assetId, :name)")
        @GetGeneratedKeys("id")
        int insertAssetLocation(@BindBean Models.AssetLocation assetLocation);

        @SqlUpdate("DELETE FROM asset_location WHERE id = :id")
        int deleteAssetLocationById(@Bind("id") int id);

        @SqlUpdate("DELETE FROM asset_location WHERE asset_id = :assetId")
        int deleteAssetLocationByAssetId(@Bind("assetId") int assetId);

        @SqlQuery("SELECT f.* FROM free f " +
                  "JOIN asset_location al ON f.asset_id = al.asset_id " +
                  "WHERE al.location_id = :locationId AND f.end_time > :startTime " +
                  "ORDER BY f.start_time")
        @RegisterFieldMapper(Models.Free.class)
        List<Models.Free> getFreeBlocks(@Bind("locationId") int locationId, @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT * FROM free WHERE asset_id = :assetId ORDER BY start_time")
        @RegisterFieldMapper(Models.Free.class)
        List<Models.Free> getAllFreeBlocksByAsset(@Bind("assetId") int assetId);

        @SqlQuery("SELECT * FROM free WHERE asset_id = :assetId AND end_time > :startTime ORDER BY start_time")
        @RegisterFieldMapper(Models.Free.class)
        List<Models.Free> getFreeBlocksByAsset(@Bind("assetId") int assetId, @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT f.* FROM free f " +
                  "JOIN asset_location al ON f.asset_id = al.asset_id " +
                  "WHERE al.location_id = :locationId " +
                  "ORDER BY f.start_time")
        @RegisterFieldMapper(Models.Free.class)
        List<Models.Free> getFreeBlocksByLocation(@Bind("locationId") int locationId);

        @SqlQuery("SELECT * FROM free WHERE id = :id")
        @RegisterFieldMapper(Models.Free.class)
        Models.Free getFreeById(@Bind("id") int id);

        @SqlQuery("SELECT b.id, b.free_id, b.user_id, u.email as user_email, b.start_time, b.end_time " +
                  "FROM booked b " +
                  "JOIN free f ON b.free_id = f.id " +
                  "JOIN asset_location al ON f.asset_id = al.asset_id " +
                  "LEFT JOIN user u ON b.user_id = u.id " +
                  "WHERE al.location_id = :locationId AND b.end_time > :startTime " +
                  "ORDER BY b.start_time")
        @RegisterFieldMapper(Models.Booked.class)
        List<Models.Booked> getBookedBlocks(@Bind("locationId") int locationId, @Bind("startTime") LocalDateTime startTime);

        @SqlQuery("SELECT b.id, b.free_id, b.user_id, u.email as user_email, b.start_time, b.end_time " +
                  "FROM booked b " +
                  "JOIN free f ON b.free_id = f.id " +
                  "JOIN asset_location al ON f.asset_id = al.asset_id " +
                  "LEFT JOIN user u ON b.user_id = u.id " +
                  "WHERE al.location_id = :locationId " +
                  "ORDER BY b.start_time")
        @RegisterFieldMapper(Models.Booked.class)
        List<Models.Booked> getBookedBlocksByLocation(@Bind("locationId") int locationId);

        @SqlQuery("SELECT b.id, b.free_id, b.user_id, u.email as user_email, b.start_time, b.end_time " +
                  "FROM booked b " +
                  "LEFT JOIN user u ON b.user_id = u.id " +
                  "WHERE b.free_id = :freeId " +
                  "ORDER BY b.start_time")
        @RegisterFieldMapper(Models.Booked.class)
        List<Models.Booked> getBookedBlocksByFreeId(@Bind("freeId") int freeId);

        @SqlQuery("SELECT b.id, b.free_id, b.user_id, u.email as user_email, b.start_time, b.end_time " +
                  "FROM booked b " +
                  "LEFT JOIN user u ON b.user_id = u.id " +
                  "WHERE b.id = :id")
        @RegisterFieldMapper(Models.Booked.class)
        Models.Booked getBookedById(@Bind("id") int id);

        @SqlUpdate("INSERT INTO booked (free_id, user_id, start_time, end_time) VALUES (:freeId, :userId, :startTime, :endTime)")
        @GetGeneratedKeys("id")
        int bookTime(@Bind("freeId") int freeId, @Bind("userId") int userId,
                     @Bind("startTime") LocalDateTime startTime, @Bind("endTime") LocalDateTime endTime);

        @SqlUpdate("DELETE FROM booked WHERE id = :bookedId")
        int deleteBookedTime(@Bind("bookedId") int bookedId);

        @SqlUpdate("INSERT INTO free (asset_id, start_time, end_time) VALUES (:assetId, :startTime, :endTime)")
        @GetGeneratedKeys("id")
        int addFreeTime(@Bind("assetId") int assetId,
                        @Bind("startTime") LocalDateTime startTime, @Bind("endTime") LocalDateTime endTime);

        @SqlUpdate("DELETE FROM free WHERE id = :freeId")
        int deleteFreeTime(@Bind("freeId") int freeId);
    }

    private final Jdbi jdbi;
    private final BookingDao dao;

    public Book() {
        this(DbConfig.createJdbi());
    }

    public Book(Jdbi jdbi) {
        this.jdbi = jdbi;
        this.jdbi.installPlugin(new SqlObjectPlugin());
        this.jdbi.registerColumnMapper(Models.Address.class, new JsonAddressMapper.Column());
        this.jdbi.registerArgument(new JsonAddressMapper.Factory());
        this.jdbi.registerArgument(new AbstractArgumentFactory<LocalDateTime>(Types.VARCHAR) {
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
        this.jdbi.registerColumnMapper(LocalDateTime.class, (r, columnNumber, ctx) -> {
            String str = r.getString(columnNumber);
            if (str == null || str.isBlank()) {
                return null;
            }
            return LocalDateTime.parse(str, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        });
        this.dao = this.jdbi.onDemand(BookingDao.class);
    }

    public BookingDao getDao() {
        return dao;
    }

    public Jdbi getJdbi() {
        return jdbi;
    }

    public int insertUser(Models.User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new BookException("Email cannot be empty");
        }
        if (dao.getUserByEmail(user.getEmail()) != null) {
            throw new BookException("User with email already exists");
        }
        return dao.insertUser(user);
    }

    public Models.User getUserById(int id) {
        return dao.getUserById(id);
    }

    public Models.User getUserByEmail(String email) {
        return dao.getUserByEmail(email);
    }

    public List<Models.User> getUsers() {
        return dao.getUsers();
    }

    public List<Models.Location> getLocations() {
        return dao.getLocations();
    }

    public Models.Location getLocationById(int id) {
        return dao.getLocationById(id);
    }

    public Models.Location addLocation(Models.Location location) {
        if (location == null || location.getName() == null || location.getName().trim().isEmpty()) {
            throw new BookException("Location name is required");
        }
        int id = dao.insertLocation(location);
        location.setId(id);
        return location;
    }

    public Models.Location updateLocation(Models.Location location) {
        if (location == null || location.getId() <= 0) {
            throw new BookException("Valid location ID is required");
        }
        if (location.getName() == null || location.getName().trim().isEmpty()) {
            throw new BookException("Location name is required");
        }
        dao.updateLocation(location);
        return dao.getLocationById(location.getId());
    }

    public void deleteLocation(int id) {
        dao.deleteLocation(id);
    }

    public List<Models.AssetLocation> getAssetLocations() {
        return dao.getAssetLocations();
    }

    public List<Models.AssetLocation> getAssetLocationsByLocation(int locationId) {
        return dao.getAssetLocationsByLocation(locationId);
    }

    public Models.AssetLocation addAssetToLocation(int locationId, String name, Double pricePerHour, Integer userId) {
        if (name == null || name.trim().isEmpty()) {
            throw new BookException("Asset name is required");
        }
        Models.Location loc = dao.getLocationById(locationId);
        if (loc == null) {
            throw new BookException("Location not found");
        }
        int uid = (userId != null && userId > 0) ? userId : 1;
        double price = (pricePerHour != null && pricePerHour >= 0) ? pricePerHour : 0.0;

        Models.Asset asset = new Models.Asset();
        asset.setUserId(uid);
        asset.setMark(name.trim());
        asset.setPricePerHour(price);
        int assetId = dao.insertAsset(asset);

        Models.AssetLocation al = new Models.AssetLocation();
        al.setLocationId(locationId);
        al.setAssetId(assetId);
        al.setName(name.trim());
        int alId = dao.insertAssetLocation(al);
        al.setId(alId);
        return al;
    }

    public void deleteAsset(int assetId) {
        dao.deleteAssetLocationByAssetId(assetId);
        dao.deleteAsset(assetId);
    }

    public void deleteAssetLocation(int id) {
        Models.AssetLocation al = dao.getAssetLocationById(id);
        if (al != null) {
            dao.deleteAssetLocationById(id);
            if (al.getAssetId() != null) {
                dao.deleteAsset(al.getAssetId());
            }
        }
    }

    public List<Models.Free> getFreeBlocks(int locationId, LocalDateTime startTime) {
        return dao.getFreeBlocks(locationId, startTime);
    }

    public List<Models.Free> getAllFreeBlocksByAsset(int assetId) {
        return dao.getAllFreeBlocksByAsset(assetId);
    }

    public List<Models.Free> getFreeBlocksByAsset(int assetId, LocalDateTime startTime) {
        return dao.getFreeBlocksByAsset(assetId, startTime);
    }

    public List<Models.Free> getFreeBlocksByLocation(int locationId) {
        return dao.getFreeBlocksByLocation(locationId);
    }

    public List<Models.Booked> getBookedBlocks(int locationId, LocalDateTime startTime) {
        return dao.getBookedBlocks(locationId, startTime);
    }

    public List<Models.Booked> getBookedBlocksByLocation(int locationId) {
        return dao.getBookedBlocksByLocation(locationId);
    }

    public List<Models.Booked> getBookedBlocksByFreeId(int freeId) {
        return dao.getBookedBlocksByFreeId(freeId);
    }

    public int addFreeTime(int assetId, LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BookException("Start time and end time are required");
        }
        if (startTime.isBefore(LocalDateTime.now())) {
            throw new BookException("Start time must be in the future");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BookException("End time must be after start time");
        }

        List<Models.Free> existingBlocks = dao.getAllFreeBlocksByAsset(assetId);
        for (Models.Free existing : existingBlocks) {
            if (existing.getStartTime().isBefore(endTime) && existing.getEndTime().isAfter(startTime)) {
                throw new BookException("Free time overlaps with existing free time for this asset");
            }
        }

        return dao.addFreeTime(assetId, startTime, endTime);
    }

    public int deleteFreeTime(int freeId) {
        return dao.deleteFreeTime(freeId);
    }

    public int bookTime(int freeId, int userId, LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BookException("Start time and end time are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BookException("End time must be after start time");
        }
        Models.Free free = dao.getFreeById(freeId);
        if (free == null) {
            throw new BookException("Free block not found");
        }
        if (startTime.isBefore(free.getStartTime()) || endTime.isAfter(free.getEndTime())) {
            throw new BookException("Booking time must be within free time interval");
        }

        List<Models.Booked> existing = dao.getBookedBlocksByFreeId(freeId);
        for (Models.Booked b : existing) {
            if (b.getStartTime().isBefore(endTime) && b.getEndTime().isAfter(startTime)) {
                throw new BookException("Requested time overlaps with an existing booking");
            }
        }

        Models.User user = dao.getUserById(userId);
        if (user == null) {
            throw new BookException("User not found");
        }

        return dao.bookTime(freeId, userId, startTime, endTime);
    }

    public int deleteBookedTime(int bookedId) {
        return dao.deleteBookedTime(bookedId);
    }

    public Models.Booked getBookedById(int id) {
        return dao.getBookedById(id);
    }

    public List<Models.Timeslot> findTimeslot(int locationId, LocalDateTime wantedStart, LocalDateTime wantedEnd) {
        List<Models.Free> freeBlocks = dao.getFreeBlocksByLocation(locationId);
        List<Models.Timeslot> result = new ArrayList<>();

        for (Models.Free free : freeBlocks) {
            List<Models.Timeslot> currentSlots = new ArrayList<>();
            currentSlots.add(Models.Timeslot.builder()
                    .freeid(free.getId())
                    .assetId(free.getAssetId())
                    .startTime(free.getStartTime())
                    .endTime(free.getEndTime())
                    .build());

            List<Models.Booked> bookings = dao.getBookedBlocksByFreeId(free.getId());
            bookings.sort(Comparator.comparing(Models.Booked::getStartTime));

            for (Models.Booked b : bookings) {
                List<Models.Timeslot> updatedSlots = new ArrayList<>();
                for (Models.Timeslot slot : currentSlots) {
                    if (b.getEndTime().isAfter(slot.getStartTime()) && b.getStartTime().isBefore(slot.getEndTime())) {
                        if (slot.getStartTime().isBefore(b.getStartTime())) {
                            updatedSlots.add(Models.Timeslot.builder()
                                    .freeid(slot.getFreeid())
                                    .assetId(slot.getAssetId())
                                    .startTime(slot.getStartTime())
                                    .endTime(b.getStartTime())
                                    .build());
                        }
                        if (b.getEndTime().isBefore(slot.getEndTime())) {
                            updatedSlots.add(Models.Timeslot.builder()
                                    .freeid(slot.getFreeid())
                                    .assetId(slot.getAssetId())
                                    .startTime(b.getEndTime())
                                    .endTime(slot.getEndTime())
                                    .build());
                        }
                    } else {
                        updatedSlots.add(slot);
                    }
                }
                currentSlots = updatedSlots;
            }

            for (Models.Timeslot slot : currentSlots) {
                if (wantedStart != null && wantedEnd != null) {
                    if (!slot.getStartTime().isAfter(wantedStart) && !slot.getEndTime().isBefore(wantedEnd)) {
                        result.add(slot);
                    }
                } else if (wantedStart != null) {
                    if (slot.getEndTime().isAfter(wantedStart)) {
                        result.add(slot);
                    }
                } else {
                    result.add(slot);
                }
            }
        }

        result.sort(Comparator.comparing(Models.Timeslot::getStartTime));
        return result;
    }
}

