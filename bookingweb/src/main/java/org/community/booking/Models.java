package org.community.booking;

import lombok.Data;

import java.time.LocalDateTime;

public class Models {

    @Data
    public static class Address {
        public String email;
        public String phone;

        public Address() {}

        public Address(String email, String phone) {
            this.email = email;
            this.phone = phone;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }

    @Data
    public static class User {
        public int id;
        public String email;
        public String password;
        public int code;
        public String createtime;
        public String role;
        public Address address;

        public User() {}

        public User(int id, String email, String password, int code, String createtime, String role, Address address) {
            this.id = id;
            this.email = email;
            this.password = password;
            this.code = code;
            this.createtime = createtime;
            this.role = role;
            this.address = address;
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public int getCode() { return code; }
        public void setCode(int code) { this.code = code; }
        public String getCreatetime() { return createtime; }
        public void setCreatetime(String createtime) { this.createtime = createtime; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Address getAddress() { return address; }
        public void setAddress(Address address) { this.address = address; }
    }

    @Data
    public static class Asset {
        public int id;
        public int userId;
        public String mark;
        public double pricePerHour;
        public byte[] blob;

        public Asset() {}

        public Asset(int id, int userId, String mark, double pricePerHour, byte[] blob) {
            this.id = id;
            this.userId = userId;
            this.mark = mark;
            this.pricePerHour = pricePerHour;
            this.blob = blob;
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public int getUserId() { return userId; }
        public void setUserId(int userId) { this.userId = userId; }
        public String getMark() { return mark; }
        public void setMark(String mark) { this.mark = mark; }
        public double getPricePerHour() { return pricePerHour; }
        public void setPricePerHour(double pricePerHour) { this.pricePerHour = pricePerHour; }
        public byte[] getBlob() { return blob; }
        public void setBlob(byte[] blob) { this.blob = blob; }
    }

    @Data
    public static class Location {
        public Integer id;
        public String name;
        public Double latitude;
        public Double longitude;
        public Address address;

        public Location() {}

        public Location(Integer id, String name, Double latitude, Double longitude, Address address) {
            this.id = id;
            this.name = name;
            this.latitude = latitude;
            this.longitude = longitude;
            this.address = address;
        }

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public Address getAddress() { return address; }
        public void setAddress(Address address) { this.address = address; }
    }

    @Data
    public static class AssetLocation {
        public int id;
        public Integer locationId;
        public Integer assetId;
        public String name;

        public AssetLocation() {}

        public AssetLocation(int id, Integer locationId, Integer assetId, String name) {
            this.id = id;
            this.locationId = locationId;
            this.assetId = assetId;
            this.name = name;
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public Integer getLocationId() { return locationId; }
        public void setLocationId(Integer locationId) { this.locationId = locationId; }
        public Integer getAssetId() { return assetId; }
        public void setAssetId(Integer assetId) { this.assetId = assetId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    @Data
    public static class Free {
        public int id;
        public int assetId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;

        public Free() {}

        public Free(int id, int assetId, LocalDateTime startTime, LocalDateTime endTime) {
            this.id = id;
            this.assetId = assetId;
            this.startTime = startTime;
            this.endTime = endTime;
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public int getAssetId() { return assetId; }
        public void setAssetId(int assetId) { this.assetId = assetId; }
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        public LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    }

    @Data
    public static class Booked {
        public int id;
        public int freeId;
        public int userId;
        public String userEmail;
        public LocalDateTime startTime;
        public LocalDateTime endTime;

        public Booked() {}

        public Booked(int id, int freeId, int userId, String userEmail, LocalDateTime startTime, LocalDateTime endTime) {
            this.id = id;
            this.freeId = freeId;
            this.userId = userId;
            this.userEmail = userEmail;
            this.startTime = startTime;
            this.endTime = endTime;
        }

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public int getFreeId() { return freeId; }
        public void setFreeId(int freeId) { this.freeId = freeId; }
        public int getUserId() { return userId; }
        public void setUserId(int userId) { this.userId = userId; }
        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        public LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    }

    @Data
    public static class Timeslot {
        public int freeid;
        public int assetId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;

        public Timeslot() {}

        public Timeslot(int freeid, int assetId, LocalDateTime startTime, LocalDateTime endTime) {
            this.freeid = freeid;
            this.assetId = assetId;
            this.startTime = startTime;
            this.endTime = endTime;
        }

        public int getFreeid() { return freeid; }
        public void setFreeid(int freeid) { this.freeid = freeid; }
        public int getFreeId() { return freeid; }
        public void setFreeId(int freeId) { this.freeid = freeId; }
        public int getAssetId() { return assetId; }
        public void setAssetId(int assetId) { this.assetId = assetId; }
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        public LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

        public static TimeslotBuilder builder() { return new TimeslotBuilder(); }

        public static class TimeslotBuilder {
            private int freeid;
            private int assetId;
            private LocalDateTime startTime;
            private LocalDateTime endTime;

            public TimeslotBuilder freeid(int freeid) { this.freeid = freeid; return this; }
            public TimeslotBuilder assetId(int assetId) { this.assetId = assetId; return this; }
            public TimeslotBuilder startTime(LocalDateTime startTime) { this.startTime = startTime; return this; }
            public TimeslotBuilder endTime(LocalDateTime endTime) { this.endTime = endTime; return this; }
            public Timeslot build() { return new Timeslot(freeid, assetId, startTime, endTime); }
        }
    }
}

