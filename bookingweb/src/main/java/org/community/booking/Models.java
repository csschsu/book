
package org.community.booking;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import lombok.Data;

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
