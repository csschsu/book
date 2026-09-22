package org.community.booking.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/login", "/auth/**", "/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/book").permitAll()
                        .requestMatchers(HttpMethod.GET, "/locations", "/locations/**", "/location/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/assetlocations", "/assetlocations/**", "/assetlocation/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/booked", "/booked/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/free").permitAll()
                        .requestMatchers(HttpMethod.POST, "/timeslot").permitAll()
                        .requestMatchers("/location", "/location/**", "/locations", "/locations/**")
                        .hasRole("BOOKADMIN")
                        .requestMatchers("/asset", "/asset/**", "/assetlocation", "/assetlocation/**",
                                "/assetlocations", "/assetlocations/**")
                        .hasRole("BOOKADMIN")
                        .requestMatchers(HttpMethod.GET, "/free/*", "/free/asset/**").hasRole("BOOKADMIN")
                        .requestMatchers(HttpMethod.POST, "/free").hasRole("BOOKADMIN")
                        .requestMatchers("/freeTime", "/freeTime/**").hasRole("BOOKADMIN")
                        .requestMatchers("/user/**", "/users", "/users/**").hasRole("BOOKADMIN")
                        .requestMatchers(HttpMethod.POST, "/bookTime").hasAnyRole("BOOKUSER", "BOOKADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/bookedTime/**").hasAnyRole("BOOKUSER", "BOOKADMIN")
                        .requestMatchers("/logout", "/auth/logout").hasAnyRole("BOOKUSER", "BOOKADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
