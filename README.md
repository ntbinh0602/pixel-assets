# Nightwood — Rừng Đêm & PixelFX Asset Explorer

Web ARPG chơi đơn, góc nhìn top-down 3/4, dùng hiệu ứng [PixelFX](https://github.com/patch-gg/pixelfx). Đã tích hợp tính năng S01–S03: tài khoản, lưu PostgreSQL, ba class và vòng chơi cấp 1–5. Thư viện **244 hiệu ứng / 21 nhóm** vẫn có tại trang chủ.

## Chạy trên máy

Cần Node.js **20.19–24.x**, npm và Docker đang mở. Bản kiểm thử hiện dùng Node 20.20.2, PostgreSQL 17 và Chrome trên macOS.

```sh
npm ci
npm run services
npm run dev
```

- Game: **http://localhost:5173/?view=game**
- Thư viện: **http://localhost:5173/**
- Email xác minh / đặt lại mật khẩu khi chạy local: **http://localhost:8025** (Mailpit).

Đăng ký trên trang game, mở email trong Mailpit, bấm liên kết xác minh, rồi tạo nhân vật. Mỗi tài khoản tối đa ba nhân vật. Không có mật khẩu mẫu hay tài khoản admin mặc định.

Cấu hình local đã có giá trị phát triển mặc định. Nếu cần đổi cổng/database/email, sao chép `.env.example` thành `.env` và sửa. `APP_URL` phải trùng origin đang mở, gồm cả cổng; dùng `localhost` theo URL ở trên. Khi đổi `PORT`, đổi cả `APP_URL`. Không mở bằng `file://`.

Docker chỉ cung cấp PostgreSQL (54329) và SMTP giả lập (1025/8025), chỉ bind loopback. Dữ liệu DB lưu trong named volume; `docker compose down` giữ dữ liệu. Secret auth local được tạo một lần trong `data/auth-secret`, không đưa vào Git. Không dùng giá trị phát triển cho môi trường public.

## Bản chơi cấp 1–5

- Tiếng Việt mặc định; nút English đổi ngôn ngữ, lựa chọn lưu theo tài khoản.
- Chiến binh cận chiến, Pháp sư dùng phép nổ, Cung thủ dùng tên xuyên. Mỗi class có hai skill khả dụng ở mốc 1 và 5; các skill tiếp theo hiển thị khóa theo cấp.
- Rừng Đom Đóm 1536 × 1024, 34 cây lớn (cổ thụ/thông/liễu), hồ, trại an toàn, slime/dơi/ếch và Trưởng Lão Slime có báo đòn, gọi lính và tăng nhịp đánh.
- Nhiệm vụ hướng dẫn: 3 slime → 5 dơi → 5 ếch → mặc đủ bốn món giáp → boss. Nhận thưởng ở người gác rừng; mỗi chặng bảo đảm đủ XP tới mốc 2/3/4/5.
- Bắt đầu với vũ khí/áo/giày; mở mũ ở cấp 2, găng 4, tay phụ 5. Có túi đồ, tháo/mặc, cửa hàng, bán đồ và nhặt vàng/vật liệu/bình hồi phục.
- Cấp 5 có tổng ba điểm skill; học skill thứ hai dùng một điểm. Rank 2 của skill đầu yêu cầu cấp 6 nên còn khóa trong build này. Không tích XP vượt cap 5.
- Tài khoản/email dùng Better Auth. Server quyết định vị trí, sát thương, XP, vật phẩm và giao dịch qua WebSocket. PostgreSQL lưu ngay thay đổi quan trọng; snapshot vị trí/HP tối đa mỗi 15 giây và khi rời phiên bình thường. Một nhân vật chỉ có một phiên ghi; mở nơi khác chuyển phiên cũ.

Điều khiển:

| Thao tác | Desktop | Điện thoại |
|---|---|---|
| Di chuyển | WASD / mũi tên; Shift chạy | Nút hướng; chạm nền tìm đường |
| Tìm đường | Chuột phải | Chạm nền |
| Đánh / ngắm | Giữ chuột trái; di chuột ngắm | Giữ nút đánh; chạm quái ngắm/đánh |
| Skill | 1 / 2 | Nút skill |
| Né / bình máu | Space / Q | Nút tương ứng |
| Nhặt / nói chuyện | E | Tương tác |
| Túi / kỹ năng / pause | I / K / P | Nút menu |

Nghỉ tại trại hồi HP/MP và cấp lại ít nhất ba bình. Khi mất focus, game tạm dừng; mất input quá ba giây cũng dừng mô phỏng. Cần bấm Tiếp tục khi quay lại.


Nhân vật ba class đã được dựng chi tiết, có bốn hướng, chuyển động riêng và ngoại hình theo trang bị. Xem [ảnh, video và báo cáo nhân vật](docs/CHARACTERS.md).

## Kiểm thử

Khởi động services trước. Test dùng database có hậu tố `_test`, tách khỏi dữ liệu chơi; test reset schema trong các database đó.

```sh
npm run check
npm test
npm run test:browser
```

Browser test dùng Google Chrome có sẵn trên macOS. Máy chưa có Chrome: `npx playwright install chromium`, rồi `CI=1 npm run test:browser`. CI đã có cấu hình chạy PostgreSQL, Mailpit, Node và Playwright.

Unit test kiểm content/locale, công thức, collision, hit, cooldown, đồ/skill, boss và hành trình tự động bằng input của cả ba class. Integration test dùng PostgreSQL/SMTP/HTTP/WebSocket thật, kiểm ownership, rollback, retry, chuyển phiên, reset password, cùng SIGKILL trước/sau autosave. Browser test kiểm đăng ký/xác minh, hai trình duyệt, điều khiển/giết slime bằng ba class, mobile giả lập và hồi quy thư viện.

Xem [báo cáo S01](docs/test-reports/S01.md), [S02](docs/test-reports/S02.md), [S03](docs/test-reports/S03.md) để phân biệt case đã chạy với phần nghiệm thu còn chờ. Cổng staging public, thiết bị điện thoại thật, đo tải dài và playtest cân bằng khoảng 20 phút chưa được thay bằng kết quả mô phỏng.

## Triển khai online và sao lưu

Đề xuất **Render + Neon + Resend**. Hướng dẫn tạo tài khoản, lấy biến môi trường, triển khai và phục hồi ở [DEPLOYMENT.md](docs/DEPLOYMENT.md). Có sẵn [render.yaml](render.yaml); chưa tạo dịch vụ hoặc phát sinh chi phí thay bạn. Email production dùng Resend HTTPS API; local dùng SMTP Mailpit.

```sh
npm run db:backup
```

Lưu dump riêng tư ở `data/backups/` (Git bỏ qua). Local dùng `pg_dump` trong Docker; khi có `DATABASE_URL`, cần `pg_dump` trên máy. Hướng dẫn restore vào DB trống có trong tài liệu triển khai. Không ghi đè DB đang chơi khi thử restore.

## Mã nguồn và kế hoạch tiếp theo

| Thư mục | Nội dung |
|---|---|
| `game/shared/` | Content sinh từ thiết kế, luật game và mô phỏng server |
| `game/client/`, `game/locales/` | UI, Canvas, avatar bốn hướng, VI/EN |
| `game/world.js`, `game/art.js` | Bản đồ và cây/địa hình bằng code |
| `server/` | Auth, PostgreSQL transaction, HTTP và WebSocket |
| `app.js`, `lib/player.js` | Thư viện asset và preview/export PNG |
| `tests/` | Unit, integration, journey và browser |
| `pixelfx/` | Mã nguồn FX upstream kèm giấy phép |

Bản đồ khám phá cũ còn trong `game/forest.js` để tham khảo; trang mini game dùng client mới. `npm run content` sinh lại `game/shared/content.js` từ thiết kế. `designLevelCap=50`, `releaseLevelCap=5`; map/cấp/skill sau mốc này thuộc S04–S09.

- [Kế hoạch game](docs/GAME_PLAN.md) · [9 sprint](docs/SPRINT_PLAN.md).
- [Lịch cấp/trang bị 1–50](docs/game-design/progression-1-50.csv) · [Balance draft](docs/game-design/balance-draft.json).
- [Backlog](docs/game-design/sprint-backlog.csv) · [Test cases và trạng thái](docs/game-design/test-cases.csv).

Hiệu ứng PixelFX theo MIT; giữ nguyên [LICENSE](pixelfx/LICENSE) và [NOTICE](pixelfx/NOTICE.md). Avatar, cây và terrain riêng được vẽ bằng Canvas, không dùng font độc quyền của Patch. Thư viện asset có tìm kiếm/lọc/yêu thích, preview/timeline/palette/flip, PNG trong suốt và liên kết mã nguồn.
