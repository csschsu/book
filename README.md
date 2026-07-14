# Community booking org.community.booking

## Commands in bookingweb 

### Recreate testdata 
cd community/bookingweb
mvnw compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"

### Start spring boot

cd community/bookingweb
mvnw spring-boot:run

### Start app
cd community/bookingapp
npm run dev