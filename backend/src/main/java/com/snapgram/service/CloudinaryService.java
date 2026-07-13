package com.snapgram.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.snapgram.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cloudinary media upload, delete, and transformation service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    private static final List<String> ALLOWED_IMAGE_TYPES =
            List.of("image/jpeg","image/jpg","image/png","image/webp","image/gif");
    private static final List<String> ALLOWED_VIDEO_TYPES =
            List.of("video/mp4","video/quicktime","video/webm");
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024; // 10 MB
    private static final long MAX_VIDEO_SIZE = 50L * 1024 * 1024; // 50 MB

    // ── IMAGES ────────────────────────────────────────────────────────────────

    public Map<String, String> uploadImage(MultipartFile file, String folder) {
        validateImage(file);
        return doUpload(file, "snapgram/" + folder, "image",
                Map.of("width", 1080, "crop", "limit"));
    }

    public List<Map<String, String>> uploadMultipleImages(List<MultipartFile> files, String folder) {
        if (files == null || files.isEmpty())  throw new BadRequestException("No files provided");
        if (files.size() > 10) throw new BadRequestException("Cannot upload more than 10 images");
        List<Map<String, String>> results = new ArrayList<>();
        for (MultipartFile f : files) results.add(uploadImage(f, folder));
        return results;
    }

    public Map<String, String> uploadProfilePicture(MultipartFile file, String userId) {
        validateImage(file);
        return doUpload(file, "snapgram/profiles/" + userId, "image",
                Map.of("width", 400, "height", 400, "crop", "fill", "gravity", "face"),
                Map.of("overwrite", true));
    }

    public Map<String, String> uploadCoverPhoto(MultipartFile file, String userId) {
        validateImage(file);
        return doUpload(file, "snapgram/covers/" + userId, "image",
                Map.of("width", 1500, "height", 500, "crop", "fill"),
                Map.of("overwrite", true));
    }

    // ── STORY MEDIA (image OR video) ─────────────────────────────────────────

    public Map<String, String> uploadStoryMedia(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) throw new BadRequestException("File is required");
        boolean isVideo = ALLOWED_VIDEO_TYPES.contains(file.getContentType());
        boolean isImage = ALLOWED_IMAGE_TYPES.contains(file.getContentType());

        if (!isVideo && !isImage) throw new BadRequestException("Invalid file type");
        if (isVideo && file.getSize() > MAX_VIDEO_SIZE)
            throw new BadRequestException("Video must be < 50 MB");
        if (isImage && file.getSize() > MAX_IMAGE_SIZE)
            throw new BadRequestException("Image must be < 10 MB");

        String resourceType = isVideo ? "video" : "image";
        Map<String, String> result = doUpload(file, "snapgram/" + folder, resourceType, null);
        result = new java.util.HashMap<>(result);
        result.put("mediaType", isVideo ? "VIDEO" : "IMAGE");
        return result;
    }

    public Map<String, String> uploadVoiceMessage(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException("File is required");
        return doUpload(file, "snapgram/voice", "video", null); // Cloudinary uses "video" for audio
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    public void deleteResource(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.debug("Deleted Cloudinary resource: {}", publicId);
        } catch (IOException e) {
            log.error("Failed to delete resource {}: {}", publicId, e.getMessage());
        }
    }

    public void deleteMultipleResources(List<String> publicIds) {
        if (publicIds == null) return;
        publicIds.forEach(this::deleteResource);
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

    private Map<String, String> doUpload(MultipartFile file, String publicId,
                                          String resourceType,
                                          Map<String, ?> transformation) {
        return doUpload(file, publicId, resourceType, transformation, Map.of());
    }

    private Map<String, String> doUpload(MultipartFile file, String fullPath,
                                          String resourceType,
                                          Map<String, ?> transformation,
                                          Map<String, ?> extra) {
        try {
            String finalPublicId = fullPath + "/" + UUID.randomUUID();
            Map<String, Object> options = new java.util.HashMap<>();
            options.put("public_id",     finalPublicId);
            options.put("resource_type", resourceType);
            options.put("quality",       "auto");
            options.put("fetch_format",  "auto");
            if (transformation != null && !transformation.isEmpty()) {
                Transformation<?> t = new Transformation<>();
                transformation.forEach(t::param);
                options.put("transformation", t);
            }
            options.putAll(extra);

            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), options);
            return Map.of(
                    "url",      (String) result.get("secure_url"),
                    "publicId", (String) result.get("public_id")
            );
        } catch (IOException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            throw new BadRequestException("Failed to upload file. Please try again.");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new BadRequestException("File is required");
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType()))
            throw new BadRequestException("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
        if (file.getSize() > MAX_IMAGE_SIZE)
            throw new BadRequestException("Image must be less than 10 MB");
    }
}
