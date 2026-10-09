
package com.flower.admin;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderCompletionController {

    private final JdbcTemplate jdbc;

    public OrderCompletionController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PutMapping("/{id}/complete")
    public Map<String, Object> completeOrder(
            @PathVariable int id) {

        if (id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã đơn hàng không hợp lệ"
            );
        }

        int updated = jdbc.update("""
            UPDATE DonHang
            SET
                TinhTrangBoHoa = 'Đã giao',
                DaThanhToan = 1
            WHERE MaDon = ?
              AND DaThanhToan = 0
              AND TinhTrangBoHoa <> 'Đã hủy'
        """, id);

        if (updated == 0) {

            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM DonHang WHERE MaDon = ?",
                    Integer.class,
                    id
            );

            if (count == null || count == 0) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy đơn hàng"
                );
            }

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đơn hàng đã hoàn tất hoặc đã bị hủy"
            );
        }

        return Map.of(
                "success", true,
                "id", id,
                "status", "Đã giao",
                "paid", true,
                "remaining", 0
        );
    }
}
