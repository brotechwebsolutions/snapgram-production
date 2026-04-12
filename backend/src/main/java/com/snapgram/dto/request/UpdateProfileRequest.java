package com.snapgram.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 50)
    private String fullName;

    @Size(min = 3, max = 30)
    @Pattern(regexp = "^[a-zA-Z0-9._]+$",
             message = "Username can only contain letters, numbers, dots, underscores")
    private String username;

    @Size(max = 150, message = "Bio cannot exceed 150 characters")
    private String bio;

    @Size(max = 100)
    private String website;

    private String  gender;
    private Boolean isPrivate;
}
