package com.snapgram.util;

import com.snapgram.exception.UnauthorizedException;
import com.snapgram.security.service.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    public static UserDetailsImpl getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new UnauthorizedException("No authenticated user found");
        }
        if (auth.getPrincipal() instanceof UserDetailsImpl user) {
            return user;
        }
        throw new UnauthorizedException("Invalid authentication principal");
    }

    public static String getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public static String getCurrentUsername() {
        return getCurrentUser().getUsername();
    }
}
