
package com.flower.admin;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.*;
import java.util.*;

@RestController
public class FlowerImageController {

    private final Path uploadDir = Paths.get(
            System.getProperty("user.home"),
            "FlowerAdminUploads"
    );

    @PostMapping(
            value = "/api/images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, String> upload(
            @RequestParam("file") MultipartFile file)
            throws Exception {

        if (file.isEmpty() ||
                file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ảnh trống hoặc vượt quá 5MB"
            );
        }

        byte[] bytes = file.getBytes();
        String extension;

        // Kiểm tra chữ ký file, không chỉ phần mở rộng
        if (bytes.length >= 3 &&
                (bytes[0] & 255) == 255 &&
                (bytes[1] & 255) == 216 &&
                (bytes[2] & 255) == 255) {

            extension = ".jpg";

        } else if (bytes.length >= 8 &&
                (bytes[0] & 255) == 137 &&
                bytes[1] == 80 &&
                bytes[2] == 78 &&
                bytes[3] == 71) {

            extension = ".png";

        } else if (bytes.length >= 12 &&
                new String(bytes, 0, 4,
                        java.nio.charset.StandardCharsets.US_ASCII)
                        .equals("RIFF") &&
                new String(bytes, 8, 4,
                        java.nio.charset.StandardCharsets.US_ASCII)
                        .equals("WEBP")) {

            extension = ".webp";

        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ hỗ trợ JPG, PNG, WebP"
            );
        }

        Files.createDirectories(uploadDir);

        String filename =
                UUID.randomUUID().toString() + extension;

        Files.write(
                uploadDir.resolve(filename),
                bytes,
                StandardOpenOption.CREATE_NEW
        );

        return Map.of(
                "url", "/uploads/" + filename
        );
    }

    @GetMapping("/uploads/{filename:.+}")
    public ResponseEntity<Resource> view(
            @PathVariable String filename)
            throws Exception {

        if (!filename.matches(
                "[0-9a-fA-F-]{36}\\.(jpg|png|webp)"
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        }

        Path file = uploadDir.resolve(filename).normalize();

        if (!file.startsWith(uploadDir) ||
                !Files.isRegularFile(file)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            );
        }

        Resource resource = new UrlResource(file.toUri());

        MediaType mediaType;

        if (filename.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (filename.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        } else {
            mediaType = MediaType.IMAGE_JPEG;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
