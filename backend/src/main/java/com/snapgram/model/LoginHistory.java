package com.snapgram.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * BUG FIX: "isActive" -> "active"
 */
@Document(collection = "login_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginHistory {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String deviceInfo;
    private String ipAddress;
    private String location;
    private String userAgent;
    private String sessionToken;

    /** FIX: was "isActive" - renamed to "active". Lombok generates isActive() getter. */
    @Builder.Default
    private boolean active = true;

    private LocalDateTime logoutAt;

    @CreatedDate
    private LocalDateTime loginAt;
}
