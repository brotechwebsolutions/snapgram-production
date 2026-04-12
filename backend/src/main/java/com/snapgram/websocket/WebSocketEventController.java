package com.snapgram.websocket;

import com.snapgram.service.MessageService;
import com.snapgram.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

/**
 * WebSocket lifecycle listener — tracks connections and disconnections.
 * BUG FIX: user.isOnline() works correctly because field "online" generates isOnline().
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventController {

    private final UserService    userService;
    private final MessageService messageService;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user != null) {
            userService.updateOnlineStatus(user.getName(), true);
            log.debug("WS connected: {}", user.getName());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user != null) {
            userService.updateOnlineStatus(user.getName(), false);
            log.debug("WS disconnected: {}", user.getName());
        }
    }

    @MessageMapping("/typing")
    public void handleTyping(@Payload Map<String, Object> payload, Principal principal) {
        if (principal == null) return;
        String  conversationId = (String) payload.get("conversationId");
        boolean isTyping       = Boolean.TRUE.equals(payload.get("isTyping"));
        messageService.sendTypingIndicator(conversationId, principal.getName(), isTyping);
    }
}
