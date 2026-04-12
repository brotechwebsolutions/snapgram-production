package com.snapgram.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * FIX #17 — JWT utility with startup validation:
 *   - Throws IllegalStateException if secret < 32 chars (prevents weak keys)
 *   - Uses raw UTF-8 bytes (no double-encoding)
 *   - Proper exception types logged
 */
@Component
@Slf4j
public class JwtUtils {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpirationMs;

    private SecretKey cachedKey;

    /** Validate secret on startup — fail fast rather than fail silently at runtime */
    @PostConstruct
    public void init() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT secret must be at least 32 characters. " +
                "Current length: " + keyBytes.length + ". " +
                "Generate a secure one with: openssl rand -base64 48");
        }
        cachedKey = Keys.hmacShaKeyFor(keyBytes);
        log.info("JWT signing key initialized ({} bytes)", keyBytes.length);
    }

    public String generateAccessToken(String userId, String username) {
        return Jwts.builder()
                .subject(userId)
                .claim("username", username)
                .claim("type", "ACCESS")
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(cachedKey)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        return Jwts.builder()
                .subject(userId)
                .claim("type", "REFRESH")
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
                .signWith(cachedKey)
                .compact();
    }

    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getTokenType(String token) {
        return (String) parseClaims(token).get("type");
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException  e) { log.debug("JWT expired: {}", e.getMessage()); }
        catch (MalformedJwtException  e) { log.warn("Malformed JWT: {}", e.getMessage()); }
        catch (UnsupportedJwtException e) { log.warn("Unsupported JWT: {}", e.getMessage()); }
        catch (IllegalArgumentException e) { log.warn("Empty JWT: {}", e.getMessage()); }
        return false;
    }

    public Date getExpirationFromToken(String token) {
        return parseClaims(token).getExpiration();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(cachedKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
