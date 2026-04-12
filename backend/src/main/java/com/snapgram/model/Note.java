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

@Document(collection = "notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Note {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String content;

    @Builder.Default
    private NotePrivacy privacy = NotePrivacy.FOLLOWERS;

    @Indexed(expireAfterSeconds = 86400)
    private LocalDateTime expiresAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public enum NotePrivacy {
        FOLLOWERS, CLOSE_FRIENDS, EVERYONE
    }
}
