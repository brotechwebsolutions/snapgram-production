package com.snapgram.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB configuration — enables auditing (@CreatedDate, @LastModifiedDate)
 * and sets up the repository scan base package explicitly.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.snapgram.repository")
public class MongoConfig {
    // Spring Boot auto-configures the MongoClient from application.properties.
    // This class only activates auditing and repository scanning.
}
