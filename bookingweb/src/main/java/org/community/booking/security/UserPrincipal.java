package org.community.booking.security;

import org.community.booking.Models;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final Models.User user;

    public UserPrincipal(Models.User user) {
        this.user = user;
    }

    public Models.User getUser() {
        return user;
    }

    public int getId() {
        return user.getId();
    }

    public String getRole() {
        return user.getRole();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (user.getRole() == null || user.getRole().isBlank()) {
            return java.util.Collections.emptyList();
        }
        return Arrays.stream(user.getRole().split(","))
                .map(s -> s.trim())
                .filter(r -> !r.isEmpty())
                .map(r -> r.startsWith("ROLE_") ? new SimpleGrantedAuthority(r)
                        : new SimpleGrantedAuthority("ROLE_" + r))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
