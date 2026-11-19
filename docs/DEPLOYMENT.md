# Thiết lập dịch vụ và đưa Rừng Đêm lên mạng

Ứng dụng hiện chạy và kiểm thử trên máy. Chưa tạo tài khoản nhà cung cấp, chưa deploy public và chưa kiểm gửi email qua tên miền thật. Mẫu cấu hình không tự đăng ký/mua dịch vụ.

## 1. Tài khoản cần tạo

| Dịch vụ | Dùng cho | Bạn cần chuẩn bị |
|---|---|---|
| [Render](https://dashboard.render.com/register) | Một Node Web Service chạy HTTP + WebSocket | Đăng nhập bằng GitHub, cho phép đọc repo `ntbinh0602/pixel-assets` |
| [Neon](https://console.neon.tech/signup) | PostgreSQL lưu tài khoản, nhân vật, giao dịch | Project + database; connection string có TLS; tạo branch/database riêng cho staging |
| [Resend](https://resend.com/signup) | Email xác minh và đặt lại mật khẩu | API key được cấp quyền gửi, domain/subdomain do bạn sở hữu đã xác minh DNS |

Better Auth chạy trong ứng dụng, không cần thêm tài khoản dịch vụ auth. Frontend và backend dùng chung origin, không cần tách Vercel hoặc cấu hình CORS.

Nên chọn Render Singapore và vùng Neon gần tương ứng nếu có. Blueprint đang chọn **Starter (trả phí)** để thử ổn định; giá xác nhận ngay trong dashboard trước khi tạo. Có thể đổi `plan: free` để preview, nhưng Free ngủ sau thời gian không có hoạt động và có thể restart. [Tài liệu Render Free](https://render.com/docs/free).

Email dùng Resend **HTTPS API** vì Render Free chặn cổng SMTP 25/465/587. Local vẫn dùng SMTP vào Mailpit. Không cần tài khoản SMTP riêng. [API gửi email](https://resend.com/docs/api-reference/emails/send-email).

Resend yêu cầu xác minh domain bạn sở hữu để gửi đến người dùng thực. Ví dụ dùng `auth.tenmiencuaban.vn`, thêm đúng bản ghi DNS do Resend cung cấp và chờ Verified. Địa chỉ FROM có thể là `Nightwood <hello@auth.tenmiencuaban.vn>`. Nếu chưa có domain, vẫn thử được email ở Mailpit trên máy; chưa coi đó là kiểm gửi email public. [Hướng dẫn domain](https://resend.com/docs/dashboard/domains/introduction).

## 2. Biến môi trường production

Điền trên Render Dashboard, không đưa key hoặc connection string vào Git, chat, frontend hoặc ảnh chụp công khai.

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `APP_URL` | Origin HTTPS chính xác của service, ví dụ `https://nightwood-example.onrender.com` — không có dấu `/` cuối |
| `DATABASE_URL` | Neon connection string với `sslmode=require`; bản S03 dùng một instance, có thể dùng direct connection để cả migration khởi động hoạt động |
| `BETTER_AUTH_SECRET` | Secret ít nhất 32 ký tự, giữ cố định qua deploy; Blueprint tự sinh |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Key gửi email lấy từ Resend |
| `MAIL_FROM` | Tên + địa chỉ thuộc domain Resend đã Verified |
| `TRUST_PROXY` | `true` trên Render; để `false` khi Node nhận Internet trực tiếp |

Render cấp `PORT`; ứng dụng tự đọc biến này. Không cần cấu hình SMTP khi chọn Resend. Có thể tạo secret bằng `openssl rand -hex 32` nếu tạo Web Service thủ công. Đổi secret có thể làm các cookie/token đang dùng không còn hợp lệ.

## 3. Triển khai

1. Đưa phiên bản code đã kiểm thử lên repository. Tạo Neon project/database cho staging và xác minh Resend domain trước.
2. Trên Render tạo **Blueprint** từ repo, dùng `render.yaml`; xem lại gói Starter trước khi đồng ý. Hoặc tạo Node Web Service thủ công, build `npm ci --omit=dev && npm run content`, start `npm start`.
3. Điền biến môi trường, đặc biệt `APP_URL` bằng URL Render cấp. Nếu đổi domain, cập nhật biến này và deploy lại. Cookie và callback auth dùng cùng origin này.
4. Deploy một instance. Lần khởi động đầu tạo bảng Better Auth, bảng game và schema version 1. Kết nối Neon phải có quyền tạo schema/bảng. Migration hiện tự chạy khi khởi động và lặp lại an toàn với schema v1.
5. Kiểm `/api/health`, rồi mở `/?view=game`, đăng ký bằng email thật, xác minh, tạo nhân vật và chơi. Thử forgot password với email đó, đăng xuất/đăng nhập lại.
6. Đăng nhập từ trình duyệt khác, kiểm ngôn ngữ/nhân vật/vàng/đồ; mở cùng nhân vật kiểm chuyển phiên. Restart service, kiểm lại tiến trình đã được báo “Đã lưu”.
7. Lưu kết quả và ngày test vào `docs/test-reports/`; chỉ sau đó mới coi cổng staging auth/save đã đạt.

Auto deploy đang tắt trong Blueprint để chủ động chọn bản phát hành. CI GitHub đã được cấu hình nhưng chưa chạy trên GitHub trong lần triển khai local này.

Runtime S03 giữ mô phỏng trong RAM trên một Node instance; database là nguồn lưu bền. Không bật autoscaling/multiple instances ở bản này. Revision trong DB ngăn ghi đè nhưng chưa có điều phối phiên giữa nhiều server. Sau này muốn scale cần shared session coordination trước.

Snapshot transient mỗi 15 giây; economy/skill/quest/kill được commit trước khi báo thành công. Khi crash, các thay đổi đã xác nhận còn nguyên; vị trí/HP chưa snapshot có thể lùi về mốc lưu gần nhất. Đóng phiên bình thường và SIGTERM có lưu cuối phiên.

## 4. Sao lưu và phục hồi

Sao lưu bao gồm auth, profile, nhân vật và journal giao dịch, không chỉ bảng game. Dùng Neon backup/branch và thêm dump định kỳ theo chính sách dự án. Mỗi môi trường có database riêng.

Local:

```sh
npm run db:backup
```

Dump nằm trong `data/backups/`, quyền file 0600, đã bị Git bỏ qua. Giữ dump riêng tư vì chứa email và password hash. Không sao chép `data/auth-secret` lên repo; khi chuyển môi trường dùng secret do môi trường đó quản lý.

Production: cài PostgreSQL client phù hợp, đặt `DATABASE_URL` bằng **direct** Neon URL trong `.env` riêng trên máy quản trị, rồi chạy cùng lệnh. Connection string được truyền vào `pg_dump` qua environment, không in ra log. [Neon khuyến nghị direct connection cho migration/backup](https://neon.com/docs/connect/connection-pooling).

Thử restore vào **DB trống riêng**, không dùng DB đang chơi:

```sh
# Local Docker: thay RESTORE_DB bằng tên database trống đã tạo.
# Dùng đúng tên dump đã sinh; không dùng dữ liệu production trong máy test chung.
docker compose exec -T db pg_restore -U nightwood -d RESTORE_DB --no-owner --no-acl < data/backups/FILE.dump
```

Sau restore: trỏ một instance test vào DB đó, kiểm health; đăng nhập bằng tài khoản đã có, mở nhân vật, đối chiếu inventory/skill/quest/ownership và action replay. Chỉ kiểm số dòng/file dump chưa đủ để nghiệm thu khôi phục sản xuất.

Trong lần thực hiện local đã dump và restore sang `nightwood_restore_test`, đối chiếu toàn bộ JSON nhân vật và số dòng năm bảng, mở ứng dụng với DB đã restore. Đã đăng nhập lại tài khoản fixture và mở nhân vật qua WebSocket từ DB restore; inventory/skill/quest/vàng/vị trí trùng snapshot. Chưa diễn tập trên Neon public hoặc email thật.

## 5. Kiểm tra trước khi mời người chơi

Cổng còn chờ: auth/mail/save public qua Render/Neon/Resend, điện thoại thật, mạng có RTT/jitter, tải dài và playtest cân bằng bởi người chơi. Chưa dùng các kết quả local thay cho những cổng này. Bản hiện tại giới hạn cấp 5; kế hoạch 50 cấp vẫn là các sprint sau.
