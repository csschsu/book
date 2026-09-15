package org.community.booking.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDtos {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LoginRequest {
        public String email;
        public String userId;
        public String password;

        public String getIdentifier() {
            if (email != null && !email.trim().isEmpty()) {
                return email.trim();
            }
            if (userId != null && !userId.trim().isEmpty()) {
                return userId.trim();
            }
            return "";
        }
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LoginResponse {
        public String token;
        @Builder.Default
        public String type = "Bearer";
        public int id;
        public String email;
        public String role;
    }
}
