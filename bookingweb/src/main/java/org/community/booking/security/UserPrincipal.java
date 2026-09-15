package org.community.booking.security;

import org.community.booking.Models;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    private final Models.User user;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(Models.User user) {
        this.user = user;
        this.authorities = new ArrayList<>();
        if (user.role != null && !user.role.trim().isEmpty()) {
            String[] roles = user.role.split(",");
            for (String r : roles) {
                String cleanRole = r.trim().toUpperCase();
                if (!cleanRole.isEmpty()) {
                    this.authorities.add(new SimpleGrantedAuthority(cleanRole));
                    if (!cleanRole.startsWith("ROLE_")) {
                        this.authorities.add(new SimpleGrantedAuthority("ROLE_" + cleanRole));
                    }
                }
            }
        }
    }

    public Models.User getUser() {
        return user;
    }

    public int getId() {
        return user.id;
    }

    public String getRole() {
        return user.role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.password;
    }

    @Override
    public String getUsername() {
        return user.email;
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
