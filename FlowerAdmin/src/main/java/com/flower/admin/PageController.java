
package com.flower.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    // Dashboard
    @GetMapping({"/", "/dashboard", "/dashboard.html"})
    public String dashboard() {
        return "dashboard";
    }

    // Danh sách đơn hàng, hoa, tiệm hoa
    @GetMapping({"/list", "/list.html"})
    public String list() {
        return "list";
    }

    // Thêm hoặc chỉnh sửa bản ghi
    @GetMapping({"/form", "/form.html"})
    public String form() {
        return "form";
    }

    // Trang quản trị database
    @GetMapping({"/database", "/database.html"})
    public String databaseAdmin() {
        return "database";
    }
}
