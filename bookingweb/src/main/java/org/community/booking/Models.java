
package org.community.booking;

import java.time.LocalDateTime;

public class Models {

    public static class Supplier {
        public int id;
        public String name;
        public Models.address address;
    }

    public static class Buyer {
        public int id;
        public String name;
        public Models.address address;
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
        public Models.address address;
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

    //Transient
    public static class Freeslot {
        public int freeid;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
    }

    //JSON
    public static class address {
        public String email;
        public String phone;
    }
}
