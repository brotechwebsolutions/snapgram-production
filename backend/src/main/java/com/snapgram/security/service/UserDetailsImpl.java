package com.snapgram.security.service;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.snapgram.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * FIX BUG-8: user.getPassword() can be null for users who completed OTP
 * verification but have NOT yet called /auth/set-password.
 *
 * Spring Security's DaoAuthenticationProvider calls getPassword() during
 * authentication and will throw NullPointerException if it returns null.
 *
 * Fix: return empty string "" instead of null. The AuthService.login()
 * guard already rejects users with password == null before authentication
 * is attempted, so the "" password will never actually be compared against
 * a real value in a valid login flow.
 */
@AllArgsConstructor
@Getter
public class UserDetailsImpl implements UserDetails {

    private final String  id;
    private final String  username;
    private final String  email;

    @JsonIgnore
    private final String  password;

    private final boolean emailVerified;
    private final boolean accountLocked;
    private final Collection<? extends GrantedAuthority> authorities;

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + (user.getRole() != null ? user.getRole() : "USER"))
        );
        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                // FIX: never return null — return "" for accounts without a password yet
                user.getPassword() != null ? user.getPassword() : "",
                user.isEmailVerified(),
                user.isAccountLocked(),
                authorities
        );
    }

    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return !accountLocked; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return true; }
}
