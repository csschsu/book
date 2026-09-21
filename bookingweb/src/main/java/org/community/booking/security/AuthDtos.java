package org.community.booking.security;

public class AuthDtos {

    public static class LoginRequest {
        private String identifier;
        private String email;
        private String password;

        public LoginRequest() {}

        public LoginRequest(String identifier, String email, String password) {
            this.identifier = identifier;
            this.email = email;
            this.password = password;
        }

        public String getIdentifier() { return identifier; }
        public void setIdentifier(String identifier) { this.identifier = identifier; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getResolvedIdentifier() {
            if (identifier != null && !identifier.isBlank()) {
                return identifier;
            }
            return email;
        }

        public static LoginRequestBuilder builder() { return new LoginRequestBuilder(); }

        public static class LoginRequestBuilder {
            private String identifier;
            private String email;
            private String password;

            public LoginRequestBuilder identifier(String identifier) { this.identifier = identifier; return this; }
            public LoginRequestBuilder email(String email) { this.email = email; return this; }
            public LoginRequestBuilder password(String password) { this.password = password; return this; }
            public LoginRequest build() { return new LoginRequest(identifier, email, password); }
        }
    }

    public static class LoginResponse {
        private String token;
        private String type;
        private int id;
        private String email;
        private String role;

        public LoginResponse() {}

        public LoginResponse(String token, String type, int id, String email, String role) {
            this.token = token;
            this.type = type;
            this.id = id;
            this.email = email;
            this.role = role;
        }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public static LoginResponseBuilder builder() { return new LoginResponseBuilder(); }

        public static class LoginResponseBuilder {
            private String token;
            private String type;
            private int id;
            private String email;
            private String role;

            public LoginResponseBuilder token(String token) { this.token = token; return this; }
            public LoginResponseBuilder type(String type) { this.type = type; return this; }
            public LoginResponseBuilder id(int id) { this.id = id; return this; }
            public LoginResponseBuilder email(String email) { this.email = email; return this; }
            public LoginResponseBuilder role(String role) { this.role = role; return this; }
            public LoginResponse build() { return new LoginResponse(token, type, id, email, role); }
        }
    }
}

