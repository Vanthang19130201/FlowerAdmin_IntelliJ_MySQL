
package com.flower.admin;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.Date;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FlowerDataController {

    private final JdbcTemplate jdbc;

    public FlowerDataController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ==================================================
    // 1. LẤY TOÀN BỘ DỮ LIỆU TỪ MYSQL
    // ==================================================

    @GetMapping("/data")
    public Map<String, Object> getData() {

        Map<String, Object> data = new LinkedHashMap<>();

        // DANH SÁCH TIỆM HOA
        data.put("shops", jdbc.queryForList("""
            SELECT
                MaTiem AS id,
                TenTiem AS name,
                DiaChi AS address,
                SoDienThoai AS phone,
                GhiChu AS note
            FROM TiemHoa
            ORDER BY MaTiem DESC
        """));

        // DANH SÁCH SẢN PHẨM HOA
        data.put("flowers", jdbc.queryForList("""
            SELECT
                MaHoa AS id,
                TenHoa AS name,
                DonGia AS price,
                SoLuongTon AS stock,
                HinhAnh AS image,
                MoTa AS description,
                MaTiem AS shopId
            FROM SanPhamHoa
            ORDER BY MaHoa DESC
        """));

        // DANH SÁCH ĐƠN HÀNG
        data.put("orders", jdbc.queryForList("""
            SELECT
                MaDon AS id,
                TenNguoiMua AS customer,
                NenTang AS platform,
                DiaChiGiao AS address,
                SoDienThoai AS phone,
                GioGiao AS time,
                DATE_FORMAT(NgayGiao, '%Y-%m-%d') AS date,
                TenBoHoa AS flower,
                SoLuong AS quantity,
                DonGia AS price,
                DaCoc AS deposit,
                ConLaiPhaiThu AS remaining,
                GhiChuThiep AS cardNote,
                TinhTrangBoHoa AS status,
                HinhAnhHoa AS image,
                MaTiem AS shopId,
                MaHoa AS flowerId,
                DaThanhToan AS paid
            FROM DonHang
            ORDER BY MaDon DESC
        """));

        return data;
    }

    // ==================================================
    // 2. THÊM DỮ LIỆU MỚI
    // ==================================================

    @PostMapping("/{type:orders|flowers|shops}")
    @Transactional
    public Map<String, Object> create(
            @PathVariable String type,
            @RequestBody Map<String, Object> data) {

        validate(type, data);

        switch (type) {

            // THÊM TIỆM HOA
            case "shops" -> jdbc.update("""
                INSERT INTO TiemHoa
                    (TenTiem, DiaChi, SoDienThoai, GhiChu)
                VALUES (?, ?, ?, ?)
                """,
                    text(data, "name"),
                    text(data, "address"),
                    text(data, "phone"),
                    text(data, "note")
            );

            // THÊM SẢN PHẨM HOA
            case "flowers" -> jdbc.update("""
                INSERT INTO SanPhamHoa
                    (
                        TenHoa,
                        DonGia,
                        SoLuongTon,
                        HinhAnh,
                        MoTa,
                        MaTiem
                    )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                    text(data, "name"),
                    number(data, "price"),
                    number(data, "stock"),
                    text(data, "image"),
                    text(data, "description"),
                    nullableId(data, "shopId")
            );

            // THÊM ĐƠN HÀNG
            case "orders" -> jdbc.update("""
                INSERT INTO DonHang
                    (
                        TenNguoiMua,
                        NenTang,
                        DiaChiGiao,
                        SoDienThoai,
                        GioGiao,
                        NgayGiao,
                        TenBoHoa,
                        SoLuong,
                        DonGia,
                        DaCoc,
                        GhiChuThiep,
                        TinhTrangBoHoa,
                        HinhAnhHoa,
                        MaTiem,
                        MaHoa,
                        DaThanhToan
                    )
                VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, 0
                )
                """,
                    text(data, "customer"),
                    text(data, "platform"),
                    text(data, "address"),
                    text(data, "phone"),
                    text(data, "time"),
                    nullableDate(data, "date"),
                    text(data, "flower"),
                    number(data, "quantity"),
                    number(data, "price"),
                    number(data, "deposit"),
                    text(data, "cardNote"),
                    text(data, "status"),
                    text(data, "image"),
                    nullableId(data, "shopId"),
                    nullableId(data, "flowerId")
            );

            default -> throw badRequest(
                    "Loại dữ liệu không hợp lệ"
            );
        }

        return Map.of(
                "success", true,
                "message", "Thêm dữ liệu thành công"
        );
    }

    // ==================================================
    // 3. CẬP NHẬT DỮ LIỆU
    // ==================================================

    @PutMapping("/{type:orders|flowers|shops}/{id}")
    @Transactional
    public Map<String, Object> update(
            @PathVariable String type,
            @PathVariable int id,
            @RequestBody Map<String, Object> data) {

        if (id <= 0) {
            throw badRequest("Mã dữ liệu không hợp lệ");
        }

        validate(type, data);

        int rows = switch (type) {

            // CẬP NHẬT TIỆM HOA
            case "shops" -> jdbc.update("""
                UPDATE TiemHoa
                SET
                    TenTiem = ?,
                    DiaChi = ?,
                    SoDienThoai = ?,
                    GhiChu = ?
                WHERE MaTiem = ?
                """,
                    text(data, "name"),
                    text(data, "address"),
                    text(data, "phone"),
                    text(data, "note"),
                    id
            );

            // CẬP NHẬT SẢN PHẨM HOA
            case "flowers" -> jdbc.update("""
                UPDATE SanPhamHoa
                SET
                    TenHoa = ?,
                    DonGia = ?,
                    SoLuongTon = ?,
                    HinhAnh = ?,
                    MoTa = ?,
                    MaTiem = ?
                WHERE MaHoa = ?
                """,
                    text(data, "name"),
                    number(data, "price"),
                    number(data, "stock"),
                    text(data, "image"),
                    text(data, "description"),
                    nullableId(data, "shopId"),
                    id
            );

            // CẬP NHẬT ĐƠN HÀNG
            case "orders" -> jdbc.update("""
                UPDATE DonHang
                SET
                    TenNguoiMua = ?,
                    NenTang = ?,
                    DiaChiGiao = ?,
                    SoDienThoai = ?,
                    GioGiao = ?,
                    NgayGiao = ?,
                    TenBoHoa = ?,
                    SoLuong = ?,
                    DonGia = ?,
                    DaCoc = ?,
                    GhiChuThiep = ?,

                    TinhTrangBoHoa =
                        CASE
                            WHEN DaThanhToan = 1
                                THEN 'Đã hoàn thành'
                            ELSE ?
                        END,

                    HinhAnhHoa = ?,
                    MaTiem = ?,
                    MaHoa = ?
                WHERE MaDon = ?
                """,
                    text(data, "customer"),
                    text(data, "platform"),
                    text(data, "address"),
                    text(data, "phone"),
                    text(data, "time"),
                    nullableDate(data, "date"),
                    text(data, "flower"),
                    number(data, "quantity"),
                    number(data, "price"),
                    number(data, "deposit"),
                    text(data, "cardNote"),
                    text(data, "status"),
                    text(data, "image"),
                    nullableId(data, "shopId"),
                    nullableId(data, "flowerId"),
                    id
            );

            default -> throw badRequest(
                    "Loại dữ liệu không hợp lệ"
            );
        };

        if (rows == 0 && !exists(type, id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy dữ liệu"
            );
        }

        return Map.of(
                "success", true,
                "message", "Cập nhật dữ liệu thành công"
        );
    }

    // ==================================================
    // 4. XÓA DỮ LIỆU
    // ==================================================

    @DeleteMapping("/{type:orders|flowers|shops}/{id}")
    @Transactional
    public Map<String, Object> delete(
            @PathVariable String type,
            @PathVariable int id) {

        if (id <= 0) {
            throw badRequest("Mã dữ liệu không hợp lệ");
        }

        String sql = switch (type) {

            case "orders" ->
                    "DELETE FROM DonHang WHERE MaDon = ?";

            case "flowers" ->
                    "DELETE FROM SanPhamHoa WHERE MaHoa = ?";

            case "shops" ->
                    "DELETE FROM TiemHoa WHERE MaTiem = ?";

            default -> throw badRequest(
                    "Loại dữ liệu không hợp lệ"
            );
        };

        int rows;

        try {
            rows = jdbc.update(sql, id);

        } catch (DataIntegrityViolationException ex) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể xóa vì dữ liệu đang liên kết " +
                            "với đơn hàng hoặc bảng khác"
            );
        }

        if (rows == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy dữ liệu"
            );
        }

        return Map.of(
                "success", true,
                "message", "Xóa dữ liệu thành công"
        );
    }

    // ==================================================
    // 5. KIỂM TRA BẢN GHI CÓ TỒN TẠI
    // ==================================================

    private boolean exists(String type, int id) {

        String sql = switch (type) {

            case "orders" ->
                    "SELECT COUNT(*) FROM DonHang WHERE MaDon = ?";

            case "flowers" ->
                    "SELECT COUNT(*) FROM SanPhamHoa WHERE MaHoa = ?";

            case "shops" ->
                    "SELECT COUNT(*) FROM TiemHoa WHERE MaTiem = ?";

            default -> throw badRequest(
                    "Loại dữ liệu không hợp lệ"
            );
        };

        Integer count = jdbc.queryForObject(
                sql,
                Integer.class,
                id
        );

        return count != null && count > 0;
    }

    // ==================================================
    // 6. HÀM XỬ LÝ CHUỖI
    // ==================================================

    private String text(
            Map<String, Object> data,
            String key) {

        Object value = data.get(key);

        return value == null
                ? ""
                : value.toString().trim();
    }

    // ==================================================
    // 7. HÀM XỬ LÝ SỐ
    // ==================================================

    private double number(
            Map<String, Object> data,
            String key) {

        String value = text(data, key);

        if (value.isBlank()) {
            return 0;
        }

        try {
            double result = Double.parseDouble(value);

            if (!Double.isFinite(result)) {
                throw badRequest(
                        "Giá trị " + key + " không hợp lệ"
                );
            }

            return result;

        } catch (NumberFormatException e) {

            throw badRequest(
                    "Giá trị " + key + " phải là số"
            );
        }
    }

    // ==================================================
    // 8. HÀM XỬ LÝ MÃ THAM CHIẾU
    // ==================================================

    private Integer nullableId(
            Map<String, Object> data,
            String key) {

        String value = text(data, key);

        if (value.isBlank() || value.equals("0")) {
            return null;
        }

        try {
            int id = Integer.parseInt(value);

            if (id <= 0) {
                throw badRequest(
                        "Mã tham chiếu không hợp lệ"
                );
            }

            return id;

        } catch (NumberFormatException e) {

            throw badRequest(
                    "Mã tham chiếu phải là số nguyên"
            );
        }
    }

    // ==================================================
    // 9. HÀM XỬ LÝ NGÀY
    // ==================================================

    private Date nullableDate(
            Map<String, Object> data,
            String key) {

        String value = text(data, key);

        if (value.isBlank()) {
            return null;
        }

        try {
            return Date.valueOf(value);

        } catch (IllegalArgumentException e) {

            throw badRequest(
                    "Ngày phải có dạng yyyy-MM-dd"
            );
        }
    }

    // ==================================================
    // 10. KIỂM TRA DỮ LIỆU TRƯỚC KHI LƯU
    // ==================================================

    private void validate(
            String type,
            Map<String, Object> data) {

        // TIỆM HOA
        if (type.equals("shops")) {

            if (text(data, "name").isBlank()) {
                throw badRequest(
                        "Tên tiệm hoa không được để trống"
                );
            }
        }

        // SẢN PHẨM HOA
        if (type.equals("flowers")) {

            if (text(data, "name").isBlank()) {
                throw badRequest(
                        "Tên sản phẩm hoa không được để trống"
                );
            }

            double price = number(data, "price");
            double stock = number(data, "stock");

            if (price < 0) {
                throw badRequest(
                        "Đơn giá không được âm"
                );
            }

            if (stock < 0 || stock % 1 != 0) {
                throw badRequest(
                        "Số lượng tồn kho không hợp lệ"
                );
            }
        }

        // ĐƠN HÀNG
        if (type.equals("orders")) {

            if (text(data, "customer").isBlank()) {
                throw badRequest(
                        "Tên khách hàng không được để trống"
                );
            }

            if (text(data, "flower").isBlank()) {
                throw badRequest(
                        "Tên bó hoa không được để trống"
                );
            }

            double quantity = number(data, "quantity");
            double price = number(data, "price");
            double deposit = number(data, "deposit");

            if (quantity < 1 || quantity % 1 != 0) {
                throw badRequest(
                        "Số lượng phải là số nguyên lớn hơn 0"
                );
            }

            if (price < 0) {
                throw badRequest(
                        "Đơn giá không được âm"
                );
            }

            if (deposit < 0) {
                throw badRequest(
                        "Tiền cọc không được âm"
                );
            }

            if (deposit > quantity * price) {
                throw badRequest(
                        "Tiền cọc không được vượt quá tổng tiền"
                );
            }

            if (text(data, "status").isBlank()) {
                throw badRequest(
                        "Tình trạng đơn hàng không được để trống"
                );
            }
        }
    }

    // ==================================================
    // 11. THÔNG BÁO LỖI DỮ LIỆU
    // ==================================================

    private ResponseStatusException badRequest(
            String message) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}
