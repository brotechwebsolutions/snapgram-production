package com.snapgram.config;

import com.snapgram.security.jwt.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtils jwtUtils;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // =========================
    // TASK SCHEDULER (HEARTBEAT)
    // =========================
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(30);
        scheduler.initialize();
        return scheduler;
    }

    // =========================
    // MESSAGE BROKER CONFIG
    // =========================
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(taskScheduler());

        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    // =========================
    // STOMP ENDPOINT (FIXED)
    // =========================
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(resolveAllowedOrigins())
                .withSockJS(); // IMPORTANT for Render HTTPS + WSS fix
    }

    // =========================
    // JWT AUTH FOR WEBSOCKET
    // =========================
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {

            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
                        log.warn("WS connection rejected: missing bearer token");
                        throw new IllegalArgumentException("Missing Bearer token");
                    }

                    String token = authHeader.substring(7);

                    if (!jwtUtils.validateToken(token)) {
                        log.warn("WS connection rejected: invalid token");
                        throw new IllegalArgumentException("Invalid token");
                    }

                    String userId = jwtUtils.getUserIdFromToken(token);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userId,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
                            );

                    accessor.setUser(authentication);

                    log.debug("WS authenticated: {}", userId);
                }

                return message;
            }
        });
    }

    // =========================
    // ALLOWED ORIGINS (CLEANED)
    // =========================
    private String[] resolveAllowedOrigins() {

        List<String> origins = new ArrayList<>();

        addOrigin(origins, frontendUrl);

        origins.add("http://localhost:3000");
        origins.add("http://localhost:5173");
        origins.add("http://localhost:5174");
        origins.add("http://127.0.0.1:5173");

        origins.add("https://*.vercel.app");
        origins.add("https://*.netlify.app");

        return origins.toArray(new String[0]);
    }

    private void addOrigin(List<String> origins, String origin) {

        if (!StringUtils.hasText(origin)) return;

        String normalized = origin.trim();

        if ("*".equals(normalized)) return;

        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        if (!origins.contains(normalized)) {
            origins.add(normalized);
        }
    }
}