# Community booking org.community.booking

## Commands in bookingweb 

### Create testdata ( recreate the database and load new data )
cd bookingweb; mvn test-compile exec:java -Dexec.mainClass="org.community.booking.TestDataGenerator"
cd bookingweb; mvn test-compile exec:java -Dexec.mainClass="org.community.function.GenerateFreeYearTest"

### Start spring bnpm run devoot

cd bookingweb
mvnw spring-boot:run

### Start app
cd bookingapp
npm run dev