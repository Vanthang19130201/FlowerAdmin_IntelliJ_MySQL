
package com.flower.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DatabaseCheckController {

    private final JdbcTemplate jdbc;

    public DatabaseCheckController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/test-database")
    public Map<String, Object> testDatabase() {

        String database = jdbc.queryForObject(
                "SELECT DATABASE()", String.class
        );

        return Map.of(
                "status", "CONNECTED",
                "database", database
        );
    }
}
