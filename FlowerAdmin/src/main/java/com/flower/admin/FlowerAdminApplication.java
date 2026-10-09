
package com.flower.admin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.io.IOException;

@SpringBootApplication
public class FlowerAdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(
                FlowerAdminApplication.class, args
        );
    }

    @EventListener(ApplicationReadyEvent.class)
    public void openWebsite() {

        String url = "http://127.0.0.1:8080/";

        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "cmd", "/c", "start", "", url
            );

            processBuilder.start();

            System.out.println(
                    "FlowerAdmin: Da yeu cau mo website " + url
            );

        } catch (IOException e) {
            System.err.println(
                    "Khong the tu dong mo trinh duyet: "
                            + e.getMessage()
            );
        }
    }
}
