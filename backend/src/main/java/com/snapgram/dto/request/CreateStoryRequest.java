package com.snapgram.dto.request;

import lombok.Data;

@Data
public class CreateStoryRequest {
    private String caption;
    private String backgroundColor;
    private String privacy; // ALL | FOLLOWERS | CLOSE_FRIENDS
}
