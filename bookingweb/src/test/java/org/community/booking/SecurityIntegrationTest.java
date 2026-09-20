package org.community.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.community.booking.security.AuthDtos;
import org.jdbi.v3.core.Jdbi;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = AssetApplication.class)
@AutoConfigureMockMvc
public class SecurityIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        private final ObjectMapper objectMapper = new ObjectMapper();

        @BeforeAll
        public static void setupDatabase() {
                // Ensure database tables and initial test users exist
                Jdbi jdbi = org.community.booking.config.DbConfig.createJdbi();
                CreateInitialUser.initializeDatabase(jdbi);

                jdbi.useHandle(handle -> {
                        handle.execute("CREATE TABLE IF NOT EXISTS asset (" +
                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                        "user_id INTEGER NOT NULL, " +
                                        "mark TEXT, " +
                                        "price_per_hour REAL NOT NULL, " +
                                        "blob BLOB, " +
                                        "FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)");
                        handle.execute("CREATE TABLE IF NOT EXISTS location (" +
                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                        "name TEXT NOT NULL, " +
                                        "latitude REAL, " +
                                        "longitude REAL, " +
                                        "address TEXT)");
                        handle.execute("CREATE TABLE IF NOT EXISTS asset_location (" +
                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                        "location_id INTEGER, " +
                                        "asset_id INTEGER UNIQUE, " +
                                        "name TEXT NOT NULL, " +
                                        "FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE, " +
                                        "FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE)");
                        handle.execute("CREATE TABLE IF NOT EXISTS free (" +
                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                        "asset_id INTEGER NOT NULL, " +
                                        "start_time TEXT NOT NULL, " +
                                        "end_time TEXT NOT NULL, " +
                                        "FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE)");
                        handle.execute("CREATE TABLE IF NOT EXISTS booked (" +
                                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                                        "free_id INTEGER NOT NULL, " +
                                        "user_id INTEGER NOT NULL, " +
                                        "start_time TEXT NOT NULL, " +
                                        "end_time TEXT NOT NULL, " +
                                        "FOREIGN KEY (free_id) REFERENCES free(id) ON DELETE CASCADE, " +
                                        "FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE)");
                });

                CreateInitialUser.insertUser(jdbi, "admin@example.com", "admin123", "BOOKADMIN");
                CreateInitialUser.insertUser(jdbi, "user@example.com", "user123", "BOOKUSER");
                CreateInitialUser.insertUser(jdbi, "super@example.com", "super123", "BOOKUSER,BOOKADMIN");

                jdbi.useHandle(handle -> {
                        Integer count = handle.createQuery("SELECT count(*) FROM asset WHERE id = 1")
                                        .mapTo(Integer.class).one();
                        if (count == 0) {
                                Integer adminId = handle
                                                .createQuery("SELECT id FROM user WHERE email = 'admin@example.com'")
                                                .mapTo(Integer.class).one();
                                handle.execute("INSERT OR IGNORE INTO location (id, name, latitude, longitude, address) VALUES (1, 'Location 1', 59.3293, 18.0686, '{}')");
                                handle.execute("INSERT OR IGNORE INTO asset (id, user_id, mark, price_per_hour, blob) VALUES (1, ?, 'Asset 1', 10.0, NULL)",
                                                adminId);
                                handle.execute("INSERT OR IGNORE INTO asset_location (id, location_id, asset_id, name) VALUES (1, 1, 1, 'Asset Location 1')");
                                handle.execute("INSERT OR IGNORE INTO free (id, asset_id, start_time, end_time) VALUES (1, 1, '2026-07-04T00:00:00', '2026-07-05T00:00:00')");
                        }
                });
        }

        private String obtainToken(String email, String password) throws Exception {
                AuthDtos.LoginRequest request = new AuthDtos.LoginRequest();
                request.email = email;
                request.password = password;

                MvcResult loginResult = mockMvc.perform(post("/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andReturn();

                AuthDtos.LoginResponse loginResponse = objectMapper.readValue(
                                loginResult.getResponse().getContentAsString(),
                                AuthDtos.LoginResponse.class);
                return loginResponse.token;
        }

        // --- a21 & a31-a33: OPEN Routes ---

        @Test
        public void testOpenEndpointsAccessibleWithoutToken() throws Exception {
                mockMvc.perform(get("/book"))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/locations"))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/assetlocations"))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/free?locationId=1"))
                                .andExpect(status().isOk());
        }

        // --- a41: Login Workflow ---

        @Test
        public void testLoginWithValidCredentialsReturnsToken() throws Exception {
                AuthDtos.LoginRequest request = new AuthDtos.LoginRequest();
                request.email = "admin@example.com";
                request.password = "admin123";

                MvcResult result = mockMvc.perform(post("/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.token").isNotEmpty())
                                .andExpect(jsonPath("$.email").value("admin@example.com"))
                                .andExpect(jsonPath("$.role").value("BOOKADMIN"))
                                .andReturn();

                String responseJson = result.getResponse().getContentAsString();
                AuthDtos.LoginResponse response = objectMapper.readValue(responseJson, AuthDtos.LoginResponse.class);
                assertNotNull(response.token);
        }

        @Test
        public void testLoginWithInvalidCredentialsFails() throws Exception {
                AuthDtos.LoginRequest request = new AuthDtos.LoginRequest();
                request.email = "admin@example.com";
                request.password = "wrongpassword";

                mockMvc.perform(post("/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Invalid email or password"));
        }

        // --- a61-a62 & a51: BOOKADMIN Restrictions ---

        @Test
        public void testUserEndpointsRequireBookAdminRole() throws Exception {
                // Unauthenticated -> 401
                mockMvc.perform(get("/users"))
                                .andExpect(status().isUnauthorized());

                // BOOKUSER -> 403 Forbidden
                String userToken = obtainToken("user@example.com", "user123");
                mockMvc.perform(get("/users")
                                .header("Authorization", "Bearer " + userToken))
                                .andExpect(status().isForbidden());

                // BOOKADMIN -> 200 OK
                String adminToken = obtainToken("admin@example.com", "admin123");
                mockMvc.perform(get("/users")
                                .header("Authorization", "Bearer " + adminToken))
                                .andExpect(status().isOk());
        }

        @Test
        public void testFreeManagementEndpointsRequireBookAdminRole() throws Exception {
                // Unauthenticated -> 401
                mockMvc.perform(get("/free/1"))
                                .andExpect(status().isUnauthorized());

                // BOOKUSER -> 403 Forbidden
                String userToken = obtainToken("user@example.com", "user123");
                mockMvc.perform(get("/free/1")
                                .header("Authorization", "Bearer " + userToken))
                                .andExpect(status().isForbidden());

                // BOOKADMIN -> 200 OK
                String adminToken = obtainToken("admin@example.com", "admin123");
                mockMvc.perform(get("/free/1")
                                .header("Authorization", "Bearer " + adminToken))
                                .andExpect(status().isOk());

                // POST /freeTime unauthenticated -> 401
                LocalDateTime futureStart = LocalDateTime.now().plusYears(2).withHour(9).withMinute(0).withSecond(0);
                LocalDateTime futureEnd = futureStart.plusHours(8);
                String startTimeStr = futureStart.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                String endTimeStr = futureEnd.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);

                Jdbi jdbi = org.community.booking.config.DbConfig.createJdbi();
                jdbi.useHandle(h -> h.execute("DELETE FROM free WHERE asset_id = 1 AND start_time = ?", startTimeStr));

                mockMvc.perform(post("/freeTime")
                                .param("assetId", "1")
                                .param("startTime", startTimeStr)
                                .param("endTime", endTimeStr))
                                .andExpect(status().isUnauthorized());

                // POST /freeTime with BOOKUSER -> 403
                mockMvc.perform(post("/freeTime")
                                .param("assetId", "1")
                                .param("startTime", startTimeStr)
                                .param("endTime", endTimeStr)
                                .header("Authorization", "Bearer " + userToken))
                                .andExpect(status().isForbidden());

                // POST /freeTime with BOOKADMIN -> 200
                mockMvc.perform(post("/freeTime")
                                .param("assetId", "1")
                                .param("startTime", startTimeStr)
                                .param("endTime", endTimeStr)
                                .header("Authorization", "Bearer " + adminToken))
                                .andExpect(status().isOk());
        }

        // --- a34: Booking Access (BOOKUSER or BOOKADMIN) ---

        @Test
        public void testBookingEndpointsRequireAuthentication() throws Exception {
                // Unauthenticated -> 401
                mockMvc.perform(post("/bookTime")
                                .param("freeId", "1")
                                .param("startTime", "2026-07-04T10:00:00")
                                .param("endTime", "2026-07-04T12:00:00"))
                                .andExpect(status().isUnauthorized());

                // BOOKUSER -> Authorization passes (not 401 and not 403)
                String userToken = obtainToken("user@example.com", "user123");
                mockMvc.perform(post("/bookTime")
                                .header("Authorization", "Bearer " + userToken)
                                .param("freeId", "1")
                                .param("startTime", "2026-07-04T10:00:00")
                                .param("endTime", "2026-07-04T12:00:00"))
                                .andExpect(result -> {
                                        int status = result.getResponse().getStatus();
                                        org.junit.jupiter.api.Assertions.assertNotEquals(401, status,
                                                        "Should not be unauthorized");
                                        org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                                                        "Should not be forbidden for BOOKUSER");
                                });

                // BOOKADMIN -> Authorization passes (not 401 and not 403)
                String adminToken = obtainToken("admin@example.com", "admin123");
                mockMvc.perform(post("/bookTime")
                                .header("Authorization", "Bearer " + adminToken)
                                .param("freeId", "1")
                                .param("startTime", "2026-07-04T10:00:00")
                                .param("endTime", "2026-07-04T12:00:00"))
                                .andExpect(result -> {
                                        int status = result.getResponse().getStatus();
                                        org.junit.jupiter.api.Assertions.assertNotEquals(401, status,
                                                        "Should not be unauthorized");
                                        org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                                                        "Should not be forbidden for BOOKADMIN");
                                });
        }

        // --- Dual Role (BOOKUSER, BOOKADMIN) ---

        @Test
        public void testDualRoleUserCanAccessBothBookingAndAdminEndpoints() throws Exception {
                String superToken = obtainToken("super@example.com", "super123");

                // Admin action -> 200 OK
                mockMvc.perform(get("/users")
                                .header("Authorization", "Bearer " + superToken))
                                .andExpect(status().isOk());

                // Admin free view -> 200 OK
                mockMvc.perform(get("/free/1")
                                .header("Authorization", "Bearer " + superToken))
                                .andExpect(status().isOk());
        }

        // --- a42: Logout ---

        @Test
        public void testLogoutEndpoint() throws Exception {
                mockMvc.perform(post("/logout"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").value("Logged out successfully"));
        }
}
