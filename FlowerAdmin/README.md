# Flower Admin - IntelliJ IDEA + Spring Boot + MySQL

## Cài đặt
1. Cài JDK 17 hoặc 21, IntelliJ IDEA và MySQL Server 8.
2. Mở MySQL Workbench, chạy toàn bộ `database.sql` để tạo cơ sở dữ liệu.
3. Mở thư mục `FlowerAdmin` bằng IntelliJ (Open), đợi Maven tải dependencies.
4. Mở `src/main/resources/application.properties`, sửa `spring.datasource.password=CHANGE_ME` thành mật khẩu MySQL của bạn. Nếu dùng tài khoản khác `root`, sửa cả `spring.datasource.username`.
5. Chạy `FlowerAdminApplication.java`, truy cập http://localhost:8080.

## Chức năng
- Tổng quan: tổng số đơn, tổng giá trị, tiền đã cọc, còn phải thu.
- Đơn hàng: thêm/sửa/xóa/tìm theo tên khách, ảnh bó hoa, địa chỉ, SĐT, nền tảng, ngày/giờ giao, ghi chú thiệp, trạng thái, cửa hàng phụ trách.
- Sản phẩm hoa: tên, giá, tồn kho, mô tả, ảnh.
- Tiệm hoa: tên, địa chỉ, số điện thoại.
- Ảnh tải lên được lưu tại thư mục `flower-admin-uploads` trong thư mục người dùng Windows (không lưu blob trong MySQL). SQL lưu đường dẫn ảnh.
- Không cần hosting/domain; chỉ truy cập trên máy chạy server, mặc định cổng 8080.

## Ghi chú
- Cột còn phải thu = số lượng * đơn giá - tiền cọc, tính từ dữ liệu MySQL khi hiển thị.
- Tồn kho hiện quản lý thủ công, chưa tự động trừ khi bán.
- File Excel ban đầu dùng để đối chiếu các trường; chưa tự động nhập các dòng đơn hàng cũ.
- Đây là bản quản trị local chưa có đăng nhập. Không mở cổng 8080 ra Internet khi chưa bổ sung bảo mật.
