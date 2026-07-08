recreate testdata: delete old, create new
mvnw compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"

start spring boot
mvnw spring-boot:run

