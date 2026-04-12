package com.snapgram;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SnapGram — production-ready Instagram-like social media platform.
 *
 * NOTE: @EnableMongoAuditing moved to MongoConfig to avoid duplicate bean issues.
 *       @EnableAsync moved to AsyncConfig.
 */
@SpringBootApplication
@EnableScheduling
public class SnapgramApplication {
    public static void main(String[] args) {
        SpringApplication.run(SnapgramApplication.class, args);
    }
}
