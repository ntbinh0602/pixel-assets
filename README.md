# PixelFX Asset Explorer

Trang xem toàn bộ **244 hiệu ứng trong 21 nhóm** từ [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx), lưu và chạy trực tiếp trong thư mục Assets.

## Chạy trang web

Cần Node.js 18 trở lên. Trong thư mục này, chạy:

```sh
npm run dev
```

Mở **http://localhost:5173** trên trình duyệt. Không cần cài thêm thư viện. Không mở `index.html` bằng `file://`, vì trình duyệt cần HTTP để tải JavaScript modules.

Nếu cổng đang được dùng:

```sh
PORT=5174 npm run dev
```

## Tính năng

- Toàn bộ asset được vẽ trực tiếp bằng Canvas từ mã nguồn PixelFX, không dùng ảnh placeholder.
- Tìm theo tên, mô tả, tag hoặc tên nhóm tiếng Việt; phím `/` đưa con trỏ vào ô tìm kiếm.
- Lọc 21 nhóm, kiểu loop/one-shot, sắp xếp và lưu yêu thích trong trình duyệt.
- Tạm dừng/phát toàn bộ, đổi nền tối/sáng.
- Xem lớn, phát lại, tua từng thời điểm, chỉnh tốc độ, đổi bảng màu, lật hướng, ẩn/hiện nhân vật.
- Tải khung hình PNG trong suốt, xem đoạn code tích hợp và mã nguồn gốc.
- Bố cục responsive, hỗ trợ bàn phím và tùy chọn giảm chuyển động của hệ thống.
- Chỉ chạy animation đang trong vùng nhìn; giải phóng player khi cuộn ra ngoài vùng hiển thị. Tạm ngừng thư viện khi mở chi tiết hoặc chuyển tab.

## Cấu trúc

```text
Assets/
  index.html       Giao diện trang
  styles.css       Thiết kế responsive
  app.js           Danh mục, bộ lọc và tương tác
  lib/player.js    Bộ phát hiệu ứng Canvas
  game/            Bản đồ rừng, cây pixel art và điều khiển mini game
  server.mjs       HTTP server cục bộ, không phụ thuộc thư viện
  pixelfx/         Bản clone mã nguồn gốc, giữ nguyên giấy phép
```

`pixelfx/` là mã nguồn upstream. Hiệu ứng và code của PixelFX theo MIT; giữ nguyên `pixelfx/LICENSE` và `pixelfx/NOTICE.md`. Trang này không dùng font riêng của Patch trong gallery gốc.

Sau khi có đủ mã nguồn trong thư mục, trang hoạt động cục bộ không cần Internet. Các liên kết GitHub dẫn ra trang gốc cần Internet.

## Mini game — Khu rừng đom đóm

Mở **Mini game** ở menu hoặc truy cập **http://localhost:5173/?view=game**.

Bản đầu là một bản đồ khám phá 1536 × 1024 pixel với đường mòn, hồ và 34 cây lớn thuộc ba loại: cổ thụ, thông, liễu rủ. Đom đóm sử dụng trực tiếp module `weather/fireflies` của PixelFX, giữ hai lớp vẽ sau/trước, bỏ phần viền đồng cỏ để ghép với địa hình riêng. Cây và địa hình được vẽ bằng code Canvas và lưu vào canvas đệm.

- **WASD / phím mũi tên:** di chuyển; **Shift:** đi nhanh.
- **Nhấn/chạm vào bản đồ:** tự tìm đường tới vị trí được chọn.
- **P hoặc Escape:** tạm dừng. Nút **Điểm bắt đầu** đưa người chơi về bãi cỏ ban đầu.
- Điện thoại có các nút hướng và nút giữ để đi nhanh, với góc nhìn gần hơn.
- Có bản đồ nhỏ, camera theo người chơi và va chạm gốc cây/mép hồ.

Đây là bước dựng bản đồ của mini game. Mã nguồn riêng trong `game/`: `world.js` khai báo bản đồ và tìm đường, `art.js` vẽ cây/địa hình/nhân vật thử nghiệm, `forest.js` điều khiển vòng lặp và ghép Fireflies. Thư viện 244 hiệu ứng vẫn dùng được như trước.
