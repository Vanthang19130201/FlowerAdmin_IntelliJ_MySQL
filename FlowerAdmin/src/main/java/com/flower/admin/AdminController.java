
package com.flower.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

 // API kiểm tra trạng thái hệ thống Admin
 @GetMapping("/status")
 public Map<String, Object> getStatus() {

  Map<String, Object> result = new LinkedHashMap<>();

  result.put("status", "RUNNING");
  result.put("application", "FlowerAdmin");
  result.put("message", "FlowerAdmin API is running");

  return result;
 }
}
