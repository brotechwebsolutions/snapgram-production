package com.snapgram.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * FIX #6 — Rate limiting filter now properly registered in SecurityConfig.
 * 
 * Limits:
 *   /api/auth/**   →  10  req / minute per IP  (prevent brute force)
 *   /api/**        → 120  req / minute per IP  (general API)
 *
 * For production with multiple instances, replace local in-memory buckets
 * with Redis-backed Bucket4j (bucket4j-redis dependency).
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_IPS = 10_000;

    private final Map<String, Bucket> authBuckets = createBoundedBucketMap();
    private final Map<String, Bucket> apiBuckets  = createBoundedBucketMap();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip   = getClientIp(request);
        String path = request.getRequestURI();

        // Actuator + WS paths skip rate limiting
        if (path.startsWith("/actuator") || path.startsWith("/ws")) {
            chain.doFilter(request, response);
            return;
        }

        Bucket bucket = path.startsWith("/api/auth")
            ? getOrCreateBucket(authBuckets, ip, true)
            : getOrCreateBucket(apiBuckets, ip, false);

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded — IP: {} path: {}", ip, path);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");
            response.getWriter().write(
                "{\"success\":false,\"message\":\"Too many requests. Please wait a minute and try again.\"}");
        }
    }

    /** Auth endpoints: 10 requests per minute (strict — prevents brute force) */
    private Bucket buildAuthBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(1))
                .build())
                .build();
    }

    /** General API: 120 requests per minute per IP */
    private Bucket buildApiBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder()
                .capacity(120)
                .refillIntervally(120, Duration.ofMinutes(1))
                .build())
                .build();
    }

    private Bucket getOrCreateBucket(Map<String, Bucket> buckets, String ip, boolean auth) {
        synchronized (buckets) {
            Bucket existing = buckets.get(ip);
            if (existing != null) {
                return existing;
            }

            Bucket created = auth ? buildAuthBucket() : buildApiBucket();
            buckets.put(ip, created);
            return created;
        }
    }

    private Map<String, Bucket> createBoundedBucketMap() {
        return Collections.synchronizedMap(new LinkedHashMap<>(128, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                return size() > MAX_TRACKED_IPS;
            }
        });
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Preflight OPTIONS requests don't count toward limits
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }
}
