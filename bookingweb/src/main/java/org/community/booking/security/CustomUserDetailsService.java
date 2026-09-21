package org.community.booking.security;

import org.community.booking.Book;
import org.community.booking.Models;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final Book book;

    public CustomUserDetailsService(Book book) {
        this.book = book;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Models.User user = book.getUserByEmail(username);
        if (user == null) {
            try {
                int id = Integer.parseInt(username);
                user = book.getUserById(id);
            } catch (NumberFormatException ignored) {
            }
        }
        if (user == null) {
            throw new UsernameNotFoundException("User not found with username: " + username);
        }
        return new UserPrincipal(user);
    }
}

