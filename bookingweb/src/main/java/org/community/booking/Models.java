
package org.community.booking;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import lombok.Data;

@Data
public class Models {

    public static class User {
        public int id;
        public String email;
        public String password;
        public int code;
        public String createtime;
        public String role;
        public Models.Address address;
    }

    public static class Asset {
        public int id;
        public int userId;
        public String mark;
        public double pricePerHour;
        public byte[] blob;
    }

    public static class Location {
        public int id;
        public String name;
        public Double latitude;
        public Double longitude;
        public Models.Address address;
    }

    public static class AssetLocation {
        public int id;
        public int locationId;
        public int assetId;
        public String name;
    }

    public static class Booked {
        public int id;
        public int freeId;
        public int userId;
        public String userEmail;
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
        public int assetId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;

        public String toString() {
            return freeid + " " + startTime.truncatedTo(ChronoUnit.HOURS) + "-" +
                    endTime.truncatedTo(ChronoUnit.HOURS)
                    + "<br>";

        }
    }

    // JSON
    public static class Address {
        public String email;
        public String phone;
    }

}
