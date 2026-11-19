# Sprint triển khai và kiểm thử — Dấu Ấn Rừng Đêm

Ngày lập: 19/11/2026. Trạng thái: **đã tích hợp tính năng S01–S03 ở build local cấp 1–5; các cổng nghiệm thu còn mở**. Xem [báo cáo S01](test-reports/S01.md), [S02](test-reports/S02.md), [S03](test-reports/S03.md). S04–S09 chưa triển khai.

Phạm vi đã chốt: web ARPG top-down 3/4, chơi đơn có tài khoản/lưu online, tiếng Việt mặc định + tiếng Anh, ba class, cấp 1–50. Thiết kế nội dung và công thức ở [GAME_PLAN.md](GAME_PLAN.md).

## 1. Nhịp thực hiện

- **9 sprint × 2 tuần = 18 tuần** theo giả định một lập trình viên toàn thời gian và hỗ trợ đồ họa bán thời gian. Đây là ước lượng, cần cập nhật sau S01 và theo tốc độ hoàn thành thực tế.
- Các tuần tính từ ngày bắt đầu triển khai; chưa gán ngày lịch cụ thể.
- Mỗi sprint có một bản chạy được trên staging, kết quả test và demo. Không chờ đủ 50 cấp mới bắt đầu chơi thử.
- Đầu việc gồm code, content, đồ họa và bản dịch cần cho tính năng đó; chỉ tính hoàn thành khi tích hợp được với nhau.
- Kiểm thử diễn ra ngay khi làm tính năng. Hai ngày kiểm thử cuối sprint dành cho hồi quy/tích hợp, không thay thế unit test trong quá trình code.
- Nếu việc vượt khả năng sprint: giảm nội dung nhận vào hoặc dời mốc; không bỏ test giao dịch/save, kiểm tra quyền hoặc kiểm tra class bắt buộc để giữ ngày dự kiến.

Nhịp 10 ngày làm việc tham khảo:

| Ngày | Hoạt động | Bằng chứng |
|---|---|---|
| 1 | Xác định scope, dependency, dữ liệu, asset và test đầu vào | Danh sách task nhận làm, fixture và tiêu chí nghiệm thu |
| 2–6 | Làm từng phần nhỏ, thêm unit/integration test cùng tính năng | Code/content + kết quả test của từng task |
| 7–8 | Test tích hợp, browser/mobile, network và chơi thử trong phạm vi sprint | Báo cáo các case, lỗi và ảnh/video cần thiết |
| 9 | Sửa lỗi, chạy lại case lỗi và phần bị ảnh hưởng | Kết quả retest, không chỉ đổi trạng thái ticket |
| 10 | Regression chính, demo, ghi nhận kết quả và chuẩn bị sprint sau | Build/commit được kiểm thử, báo cáo sprint, backlog cập nhật |

Danh sách có thể đưa vào bảng công việc:

- [54 task theo sprint](game-design/sprint-backlog.csv): ID, đầu ra, dependency, yêu cầu và ID test liên quan.
- [72 test case](game-design/test-cases.csv): điều kiện đầu, bước thực hiện, kết quả mong đợi, ưu tiên, trạng thái, kết quả thực tế và bằng chứng.
- [Bảng 50 cấp](game-design/progression-1-50.csv) và [balance draft](game-design/balance-draft.json) là nguồn fixture cho test nội dung/công thức.

Backlog/test CSV đã cập nhật actual result S01–S03 và dẫn báo cáo. Các case staging public, visual, điện thoại thật, mạng và human playtest chưa đạt vẫn giữ Blocked/Running/Review; không dùng kết quả tự động thay cho chúng. S04–S09 giữ Planned.

## 2. Tổng quan chín sprint

| Sprint | Tuần | Phạm vi chính | Bản kiểm chứng cuối sprint |
|---|---|---|---|
| S01 | 1–2 | Content schema, VI/EN, auth, database/save, nhân vật/VFX thử | Đăng nhập, tạo nhân vật, lưu và mở lại ở thiết bị khác |
| S02 | 3–4 | Combat server, đánh thường và skill đầu của 3 class, AI cơ bản | Đánh quái trong rừng, chết/hồi sinh, điều khiển desktop/mobile |
| S03 | 5–6 | XP 1–5, đồ bậc 1, quest/loot, boss đầu, skill cấp 5 | Chơi trọn vòng cấp 1–5 và lưu online với cả 3 class |
| S04 | 7–8 | Map 2–3, cấp 6–15, gear 2–3, skill 10/15, hai boss | **MVP cấp 1–15**, đủ ba class và hai ngôn ngữ |
| S05 | 9–10 | Map 4–5, cấp 16–25, đồ 4–5, skill 20, cường hóa | Bản giữa game có kháng nguyên tố, hotbar 4 ô và đồ nâng cấp |
| S06 | 11–12 | Map 6, cấp 26–30, ba ultimate, đồ 6, tối ưu combat | **Beta cấp 1–30**, đủ 18 kỹ năng được mở theo cấp |
| S07 | 13–14 | Map 7–8, cấp 31–40, đồ 7–8, ngoại hình 36, elite | Bản thử cấp 1–40, kiểm chứng build và nhóm quái phức tạp |
| S08 | 15–16 | Map 9–10, cấp 41–50, đồ 9–10, boss cuối, rank 5 ultimate | Đủ nội dung 1–50; bắt đầu lượt chơi xuyên hành trình |
| S09 | 17–18 | Chơi xuyên, cân bằng, VI/EN, tải/hiệu năng, recovery, phát hành | Bản ứng viên qua các cổng chất lượng |

Mốc vòng chơi đầu 1–5 được đặt ở cuối tuần 6 thay vì tuần 5 trong phác thảo ban đầu, để có đủ thời gian tích hợp và kiểm thử trong sprint hai tuần. Mốc MVP tuần 8, beta tuần 12 và khung 18 tuần giữ nguyên.

## 3. Điều kiện chung trước và sau một sprint

### Điều kiện nhận task

- Có đầu ra cụ thể, ID content/API liên quan và ít nhất một acceptance test xác định được kết quả.
- Asset cần có đã sẵn sàng hoặc đã phân công thời điểm giao; không mặc định một FX demo đã đủ làm quái/nhân vật hoàn chỉnh.
- Dependency của sprint trước đã qua cổng tương ứng. Mock được dùng cho unit test; nghiệm thu online dùng auth/database/session staging thật.
- Các mục phải chọn ở S01: nhà cung cấp auth/hosting, cách tích hợp, môi trường database test, thiết bị đo hiệu năng và mục tiêu số phiên active.

### Definition of Done

1. Tính năng hoạt động trong build tích hợp, không chỉ trong demo tách rời.
2. Những test trong phạm vi sprint đã chạy và đạt; ghi actual result/bằng chứng khi cần.
3. Text mới có cả VI/EN, biến nội suy khớp, mặc định Việt và không tràn UI mục tiêu.
4. Mọi thay đổi tiền/đồ/skill/quest được server xác thực và lưu đúng theo hợp đồng; thay đổi schema có fixture/migration tương ứng.
5. Gameplay quan trọng được thử trên cả 3 class. Tính năng điều khiển/UI mới được thử trên desktop và mobile.
6. Không còn lỗi P0/P1 trong phạm vi nghiệm thu; lỗi nhỏ có ticket, tác động và mốc xử lý rõ.
7. Không làm hỏng thư viện 244 hiệu ứng và bản đồ đang có; thay đổi cần thiết được ghi trong changelog.
8. Có build ID/commit, `contentVersion`, `saveVersion`, báo cáo test và kết quả demo để người khác kiểm tra lại.

Phân loại lỗi: **P0** mất/nhân bản dữ liệu đã xác nhận, truy cập sai tài khoản, hoặc sự cố toàn hệ thống; **P1** chặn tiến trình, combat/save/skill chính sai, một class không vượt được nội dung bắt buộc; **P2** lỗi hiển thị nhỏ không mất thông tin/chức năng. P0/P1 phải sửa và retest trước khi qua cổng liên quan.

## 4. S01 — Nền tảng, tài khoản và lưu online

**Mục tiêu:** xác nhận nền tảng có thể chạy một phiên chơi riêng, định danh đúng người chơi và lưu/khôi phục được trước khi phát triển nhiều nội dung.

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S01-01 | Chốt content schema, ID và nguồn dữ liệu chuẩn | Validator, version và fixture từ bảng 50 cấp; không nhân bản công thức giữa nhiều file |
| S01-02 | Tách text và tích hợp VI/EN | Bộ dịch, key/placeholder check, mặc định VI, preference tài khoản |
| S01-03 | Auth và quản lý ba ô nhân vật | Đăng ký/xác minh, đăng nhập, quên mật khẩu, đăng xuất, chọn/tạo nhân vật và ownership |
| S01-04 | Schema database và save có revision | Migration, transaction, snapshot/restore và hợp đồng API |
| S01-05 | Kiểm chứng nhân vật/FX 4 hướng | Thử kiếm, cung và phép; xác nhận thang đo, origin, layering và hitbox |
| S01-06 | CI, staging, log và môi trường test | Database test riêng, seed, quy trình báo cáo; ghi thiết bị và mục tiêu tải |

**Test:** `TC-S01-01`–`TC-S01-08`.

- Validate 3 class/18 skill/10 map/asset ID; thử dữ liệu sai phải bị từ chối.
- Trình duyệt English vẫn vào VI lần đầu; đổi EN được giữ qua đăng nhập/thiết bị khác.
- Hai tài khoản không đọc/ghi được nhân vật của nhau; không tạo quá 3 nhân vật.
- Save thực lên database rồi mở ở thiết bị khác; gây lỗi giữa transaction để kiểm tra rollback.
- Quan sát nhân vật và FX ở bốn hướng; không dùng xoay nguyên sprite để giả hướng lên/xuống.

**Cổng S01:** auth/save end-to-end và hình ảnh nền khả thi. Nếu chưa chọn được dịch vụ hoặc chưa chứng minh restore, không lấy mock làm bằng chứng hoàn thành.

## 5. S02 — Chiến đấu cơ bản cho ba class

**Phụ thuộc:** S01, đặc biệt phiên đăng nhập, content ID, quyền truy cập và nhân vật thử.

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S02-01 | Vòng mô phỏng server, input và collision | Server quyết định state, thứ tự input, nội suy/dự đoán client |
| S02-02 | Đánh thường ba class | Kiếm cận chiến, phép/đạn cung tầm xa, query trúng đòn và HUD HP/MP |
| S02-03 | Trảm Kích, Hỏa Cầu, Xuyên Tiễn | Mana, cooldown, projectile và sự kiện cast/hit |
| S02-04 | AI slime/dơi/ếch | Phát hiện, tiếp cận, báo đòn, tấn công, nghỉ, trở về vùng gốc |
| S02-05 | Chết, checkpoint, tạm dừng | Chết một lần, hồi sinh an toàn, tạm dừng cả server |
| S02-06 | Điều khiển mobile và VFX adapter | Điều khiển đủ dùng; vùng đánh và hình ảnh khớp, baseline hiệu năng |

**Test:** `TC-S02-01`–`TC-S02-08`.

- Di chuyển chéo/chạy nhanh không vượt tốc độ; không xuyên cây/hồ.
- Kiểm ba loại đánh thường, hit/miss/ngoài tầm, MP/cooldown và tên xuyên không trúng lặp.
- Quái có thời gian báo đòn, không sinh trong vật cản; chết/hồi sinh không bị nhận thêm hit sai.
- Tạm dừng, đổi tab, pointer cancel và nhả phím không làm kẹt input.
- Thử điều kiện mạng mô phỏng 150 ms RTT, jitter ±50 ms; ghi baseline thay vì chỉ xem demo mạng local.

**Cổng S02:** cả ba class đánh được quái trong map rừng và khôi phục trạng thái đúng; chưa cần đầy đủ quest/loot/boss.

## 6. S03 — Vòng chơi hoàn chỉnh cấp 1–5

**Phụ thuộc:** S02; hình và động tác boss đầu/đồ bậc 1 cần sẵn sàng đầu sprint.

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S03-01 | XP, level-up 1–5 và skill cấp 5 | XP dư, cap bản thử, điểm kỹ năng và học/nâng theo gate |
| S03-02 | Túi đồ và trang bị bậc 1 | Ô mở cấp 1/2/4/5, sai class/cấp bị từ chối, cộng/trừ chỉ số |
| S03-03 | Loot, cửa hàng, quest và thưởng một lần | Item instance, nguồn đồ cơ bản, giao dịch có ID chống xử lý lặp |
| S03-04 | Trưởng Lão Slime và quest hướng dẫn | Hai nhịp boss, giới hạn minion, clear flag và phần thưởng |
| S03-05 | Autosave/reconnect/recovery | Snapshot 15 giây, giao dịch quan trọng lưu ngay, khôi phục sau restart |
| S03-06 | Hoàn thiện vòng chơi VI/EN | UI quest/item/skill và playtest thật bằng ba class |

**Test:** `TC-S03-01`–`TC-S03-08`.

- Cấp 5 có tổng 3 điểm kỹ năng đã nhận; không được nâng hạng trước gate hoặc vượt cap bản thử.
- Đồ mở đúng ô; tháo/mặc nhiều lần không nhân chỉ số; cấp 5 mở tay phụ và skill thứ hai.
- Nhận thưởng/nhặt lại cùng event ID sau mất phản hồi vẫn chỉ được một lần.
- Boss có tối đa 6 minion; chết/thử lại hợp lệ, first-clear được lưu.
- Ba lượt từ tài khoản mới: tạo → quest → cấp 5 → học skill → thay đồ → boss → đăng nhập lại.
- Dừng runtime quanh thời điểm save; giao dịch đã xác nhận còn nguyên, transient rollback đúng chính sách tối đa 15 giây.

**Cổng S03:** đủ vòng 1–5 cho cả ba class. Đo thời gian thực so mục tiêu khoảng 20 phút; chốt các thay đổi trước khi nhân rộng map.

## 7. S04 — MVP cấp 1–15

**Phụ thuộc:** S03. Đây là mốc thử với người chơi ngoài quá trình phát triển nếu có thể bố trí.

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S04-01 | Rừng Sâu và Đầm Sương | Địa hình/quest/checkpoint/cổng; khóa theo cấp và boss |
| S04-02 | Rắn, tinh linh, sứa và hai boss mới | AI mới; Linh Mộc, Xà Vương; phần thưởng riêng |
| S04-03 | Skill mốc 10/15, nội tại và hoàn điểm | Mobility, nội tại, hoàn điểm tại khu an toàn |
| S04-04 | Đồ bậc 2–3, nhẫn cấp 10 | Nguồn đồ bảo đảm và ngân sách theo class |
| S04-05 | Nâng cap 15 và migration | Dùng lại save cấp 5, không tặng lại XP/phần thưởng |
| S04-06 | Đóng gói MVP và chơi thử | Nội dung/UI hai ngôn ngữ; log tiến trình và chênh lệch class |

**Test:** `TC-S04-01`–`TC-S04-08`.

- Biên cấp 5/6 và 10/11; đồng thời cần cờ boss, không chỉ đủ cấp.
- Blink/lướt không đi xuyên hồ/tường; nội tại và refund không nhân chỉ số/điểm.
- Ba class chơi được 1–15; đo quest XP, quái, deaths, thời gian và nguồn đồ so mục tiêu khoảng 2 giờ.
- Đọc toàn bộ quest, tooltip và lỗi ở VI/EN; chạy phiên 60 phút đổi map/reconnect để tìm rò tài nguyên.

**Cổng S04:** MVP có 3 map, 3 boss, đồ bậc 1–3 và kỹ năng mở tới cấp 15. Lấy phản hồi trước khi mở rộng lên 30.

## 8. S05 — Cấp 16–25 và chiều sâu trang bị

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S05-01 | Phế Tích Cổ, Đỉnh Băng và boss 20/25 | Hai biome/arena, telegraph và khoảng phản công |
| S05-02 | Skill cấp 20 và hotbar 4 ô | Địa Chấn, Liên Hoàn Lôi, Độc Tiễn; đổi skill ngoài combat |
| S05-03 | Kháng nguyên tố và khống chế boss | Mitigation theo loại, thanh cân bằng và giới hạn CC |
| S05-04 | Đồ bậc 4–5 và dây chuyền | Điều kiện cấp 16/20/21, ngân sách/làm tròn theo class |
| S05-05 | Phẩm chất và cường hóa +3 | Vật liệu, công thức, transaction nguyên tử |
| S05-06 | Cap 25, nhiệm vụ và dịch | Tiến trình 16–25, migration và VI/EN cho hệ thống mới |

**Test:** `TC-S05-01`–`TC-S05-08`.

- Kiểm các biên trang bị/ô; không nhầm tổng bộ với chỉ số mỗi món.
- Cường hóa đúng công thức, không lên +4; gây lỗi giữa transaction và gửi lại request không mất/nhân đồ.
- Độc chỉ làm mới; chain giới hạn mục tiêu/ngân sách; boss không bị choáng khóa vô hạn.
- Không class nào bị chặn vì miễn nhiễm nguyên tố bắt buộc; có nguồn XP/đồ để tiến lên.

**Cổng S05:** có bản chơi tới 25, đồ và kỹ năng hoạt động đúng khi kết hợp; không chỉ hoạt động riêng lẻ.

## 9. S06 — Beta cấp 1–30 và tối thượng

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S06-01 | Cao Nguyên Sấm và Mắt Bão | Map 6, dấu báo sét và khe an toàn |
| S06-02 | Ba ultimate cấp 30 | Bão Kiếm, Thiên Thạch, Mưa Tên với giới hạn hit/tick |
| S06-03 | Rank gates, điểm, crit và cooldown | Kiểm ma trận hạng; trần chí mạng 35%, giảm hồi chiêu 25% |
| S06-04 | Đồ bậc 6 và save cap 30 | Đồ Lôi Vân, skill loadout và migration |
| S06-05 | Tối ưu combat | Pool/cull/light budget và đo scene chuẩn |
| S06-06 | Đóng gói beta VI/EN | Đủ 18 skill có thể mở theo cấp, 6 map và 6 boss |

**Test:** `TC-S06-01`–`TC-S06-08`.

- Ultimate khóa ở 29, mở được ở 30 nếu có điểm; tổng điểm đã nhận ở 30 là 16.
- Bão Kiếm tối đa 6 hit/mục tiêu; Mưa Tên tối đa 4 tick; FPS không thay đổi lượng damage.
- Cộng gear/passive/rank vượt trần vẫn ra kết quả trong giới hạn; refund bảo toàn điểm.
- Cảnh 20–30 quái/khoảng 12 VFX, ba class dùng ultimate; log FPS/tick/memory trong 15 phút.
- Save MVP15 được nâng lên beta30 đúng; chơi/đọc mô tả toàn bộ 18 skill ở cả hai ngôn ngữ.

**Cổng S06:** beta 1–30 có đủ ba ultimate và các hệ thống cốt lõi. Phải xử lý vấn đề hiệu năng/combat đã thấy trước khi tăng độ phức tạp quái.

## 10. S07 — Cấp 31–40 và build nâng cao

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S07-01 | Thung Lũng Tro và Hầm Mộ | Boss 35/40, dấu báo/cửa sổ phản công riêng |
| S07-02 | Đồ bậc 7–8 và ngoại hình cấp 36 | Ba ngoại hình class, đủ hướng/động tác cần dùng |
| S07-03 | Kỹ năng hạng cao tới gate 40 | Passive/utility/ultimate đúng hạng, điểm và công thức |
| S07-04 | Elite và nhóm quái hỗn hợp | Danh sách modifier cho phép, cap spawn/buff/vùng nguy hiểm |
| S07-05 | Cap 40 và migration | Giữ save beta30, quest/boss/reward flags |
| S07-06 | Playtest và soak | Nhịp 31–40, độ rõ hình ảnh/UI, chạy phiên 90 phút |

**Test:** `TC-S07-01`–`TC-S07-08`.

- Cấp 40 có tổng 21 điểm; nội tại không cộng lại khi đổi đồ/ngoại hình/đăng nhập.
- Ngoại hình mới không âm thầm đổi hitbox hoặc thiếu hướng đánh.
- Không nhóm elite nào tạo vùng nguy hiểm vô hạn/không thể né; cận chiến có khoảng phản công.
- Map tối vẫn đọc được người chơi, điểm trúng đòn, chỉ báo và bản dịch; chuyển map nhiều lần không giữ mô phỏng/tài nguyên cũ.

**Cổng S07:** phiên chơi tới 40 ổn định; không cần dùng đồ vượt bậc để vượt nội dung bắt buộc.

## 11. S08 — Hoàn thiện cấp 41–50

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S08-01 | Khe Nứt Tinh Giới và Lõi Cổ Thụ | Boss 45/50, finale, phần thưởng và đường ra arena |
| S08-02 | Khóa dữ liệu progression 1–50 | Cap 50, XP dư, kiểm đủ 50 cấp |
| S08-03 | Ultimate rank 5 và build đầy đủ | Gate cấp 50; tổng 26 điểm và refund |
| S08-04 | Đồ bậc 9–10, Legendary cuối hành trình | Ma trận 3 class × 10 bậc × 8 ô; first-clear một lần |
| S08-05 | Save tương thích và một phiên ghi | Migration từ các mốc cũ; chuyển thiết bị/revision |
| S08-06 | Bản đủ nội dung VI/EN | 10 map/10 boss, mọi tên/mô tả; bắt đầu lượt chơi 1–50 |

**Test:** `TC-S08-01`–`TC-S08-08`.

- Kiểm 50 dòng progression và XP tổng 1.430.065 của bản draft hiện tại; nếu cân bằng đổi phải sinh lại fixture, không sửa test để che lỗi tính toán.
- Ở 49 chưa được ultimate rank 5; ở 50 tổng 26 điểm, không thể chi đủ 30 hạng.
- Gear bậc 10 bắt đầu 46; bảo đảm Legendary first-clear chỉ ở boss 50, không phát lại khi reconnect.
- Save từ S01/MVP15/beta30/beta40 nâng được; hai thiết bị không cùng ghi đè nhân vật.
- Bắt đầu ba lượt chơi thực 1–50 ngay trong S08 để đủ thời gian ghi nhận lỗi/nhịp chơi; tiếp tục retest bằng build S09.

**Cổng S08:** nội dung đầy đủ và không có lỗi chặn vòng chơi đã biết; chưa coi là đã sẵn sàng phát hành chỉ vì đủ số map/skill.

## 12. S09 — Kiểm định, cân bằng và phát hành

| Task | Đầu việc | Kết quả bàn giao |
|---|---|---|
| S09-01 | Hoàn thành và kiểm lại ba lượt 1–50 | Thời gian, deaths, XP, gear và phần thưởng cuối theo class |
| S09-02 | Kiểm toàn bộ VI/EN và UX | Không thiếu key/dấu/placeholder, thông báo auth/network đầy đủ |
| S09-03 | Client benchmark và server load | Kết quả trên thiết bị/mức tải thống nhất, điểm bão hòa |
| S09-04 | Fault injection và phục hồi | Mạng, retry, hết phiên, dừng runtime, backup restore thực tế |
| S09-05 | Sửa blocker và hồi quy | Retest case lỗi và hệ thống bị ảnh hưởng |
| S09-06 | Artifact và vận hành phát hành | Build version, migration, backup, runbook deploy/rollback và báo cáo nghiệm thu |

**Test:** `TC-S09-01`–`TC-S09-08`, cộng các case hồi quy liên quan từ S01–S08.

- Mỗi class có ít nhất một lượt hoàn thành 1–50 bằng tiến trình hợp lệ. Không dùng admin tặng đồ/XP để xác nhận nhịp trải nghiệm.
- Lượt chơi bắt đầu trên S08 phải được ghi rõ build; sau sửa lỗi S09 chạy lại phần bị ảnh hưởng. Sự cố chặn tiến trình yêu cầu xác minh lại hành trình tương ứng, không lấy lượt cũ làm bằng chứng đã sửa.
- Dữ liệu ngôn ngữ có đủ key/biến; UI quan trọng kiểm ở hai locale và desktop/mobile.
- Client: mục tiêu 60 FPS desktop/30 FPS mobile; ngưỡng nghiệm thu tham khảo trung vị ≥58/29 FPS, frame-time p95 ≤25/50 ms trong cảnh chuẩn, ba lần đo mỗi thiết bị, mỗi lần 5 phút. Nếu cần đổi ngưỡng phải ghi lý do và thiết bị mục tiêu trước buổi nghiệm thu.
- Backend: mặc định thử **C = 25 phiên chơi active riêng biệt**, giữ 30 phút; ghi mức C thay đổi nếu S01 chốt khác. Tick xử lý p95 ≤50 ms, input→snapshot xử lý server p95 ≤150 ms chưa tính mạng; thử `ceil(1,5 × C)` để xác định giới hạn, không dùng kết quả quá tải làm điều kiện thay thế mức C.
- Ngắt mạng 10/60 giây quanh ack của reward/enchant/skill, replay cùng action ID; dừng runtime và kiểm checkpoint. Giao dịch đã xác nhận không mất hoặc nhân bản.
- Restore backup vào database trống rồi mở game thật; đối chiếu inventory, quest, skill points và quyền sở hữu. Ghi thời gian khôi phục và độ mới của backup, không chỉ kiểm tra “có file backup”.
- Rollback bản ứng dụng phải tương thích schema/save đang có hoặc có quy trình phục hồi đã thử; không hạ schema tùy tiện.

**Cổng phát hành:** mọi test bắt buộc trong phạm vi bản phát hành đạt, không còn P0/P1, có bản dịch đủ, backup/restore dùng được và báo cáo trên đúng artifact phát hành. Nếu chưa đạt, kéo dài sửa lỗi; không đánh dấu hoàn thành theo lịch dự kiến.

## 13. Kiểm thử xuyên suốt và dữ liệu chuẩn

| Lớp test | Bắt đầu | Mục đích và cách chạy |
|---|---|---|
| Content/schema | S01 | Mỗi thay đổi content kiểm ID, dải cấp, locale, fxId, công thức và tham chiếu |
| Unit | S01–S02 | Hàm thuần: stats, XP, skill cost/gate, collision, damage; chạy khi sửa module liên quan |
| Integration | S01 | Auth/database/API/session và giao dịch thực trong môi trường test riêng |
| Browser E2E | S01 trở đi | Chọn/tạo nhân vật, chơi, học skill, mặc đồ, lưu và mở lại |
| Simulation | S02 | Seed và tick cố định để so AI, hit, DOT, multi-hit và giới hạn spawn |
| Visual/manual | S01 | Hướng, silhouette, VFX, vùng trúng, telegraph, dấu tiếng Việt và màn hình nhỏ |
| Playtest cân bằng | S03 | Dùng account/save đúng mốc, không vượt bậc; ghi thời gian thay vì đoán |
| Performance/soak | Baseline S02, đo lớn S06/S09 | Frame/tick, memory, network, entity/pool và đổi map kéo dài |
| Recovery/load | Nền S01/S03; đầy đủ S08/S09 | Hỏng giao dịch, retry, reconnect, nhiều phiên và backup restore |

Chạy test theo thay đổi: hàm tính chỉ số → unit/content; ghi đồ/quest → thêm integration/retry; thay input/render → thêm browser/mobile/visual; thay migration → thêm restore và fixture cũ. Trước demo chạy smoke chung; khi lỗi đã sửa thì chạy case lỗi và hồi quy đúng phần có liên quan.

Dữ liệu test phải bao gồm:

- Account A/B và hai phiên cùng account để kiểm quyền và writer lock; tách khỏi người dùng thật.
- Ba class ở các mốc 1, 2, 4, 5, 6, 10, 11, 15, 16, 19, 20, 21, 25, 26, 29, 30, 31, 35, 36, 40, 41, 45, 46, 49, 50.
- Tất cả 50 cấp dùng test tham số hóa; biên tier/slot/skill dùng các mốc trên. Không viết một test chép lại giá trị implementation thay vì kiểm bất biến.
- Đủ/thiếu MP/điểm/vật liệu; túi đồ đầy; đồ sai class; rarity và enhancement từ +0 đến +3; request không hợp lệ.
- Quest chưa nhận/đang làm/đủ điều kiện/đã nhận thưởng; boss chưa hạ/đã hạ; đúng và thiếu cờ mở map.
- VI/EN; browser sạch và đã có preference; desktop/mobile; seed map và scene combat cố định.
- Save từ các phiên bản cũ; runtime bị dừng; yêu cầu trùng; mất ack; session hết hạn và content version thay đổi.

Mỗi build có `designLevelCap = 50` nhưng `releaseLevelCap` do server quản lý theo sprint: S03=5, S04=15, S05=25, S06=30, S07=40, S08–S09=50. S01–S02 dùng fixture kỹ thuật, không công bố là hành trình tăng cấp hoàn chỉnh. Không tích XP vượt cap build để tự nhảy lên cấp chưa phát hành.

## 14. Lịch chuẩn bị asset và nội dung

| Chuẩn bị trong | Để dùng ở | Cần sẵn sàng |
|---|---|---|
| S01 | S02 | Ba silhouette cấp 1, bốn hướng, đánh thường, skill cấp 1 và icon đầu |
| S02 | S03 | Boss slime, đồ/quest bậc 1, skill cấp 5, icon và text |
| S03 | S04 | Map/boss 2–3, quái mới, đồ 2–3, skill 10/15 và hai locale |
| S04 | S05 | Map/boss 4–5, đồ 4–5, animation/FX mốc 20, enchant/resist UI |
| S05 | S06 | Map/boss 6, ba ultimate, gear 6 và telemetry labels |
| S06 | S07 | Map/boss 7–8, gear 7–8, ngoại hình 36 đủ ba class |
| S07 | S08 | Map/boss 9–10, gear 9–10, phần thưởng kết thúc, text và âm thanh cuối |
| S08 | S09 | Nội dung khóa, font/icon/âm thanh hoàn thiện và danh sách lỗi hình ảnh |

Đây là lịch bàn giao, không giả định có thêm nhân sự tự động. Nếu hỗ trợ đồ họa bán thời gian không đủ cho hai boss/biome một sprint, điều chỉnh scope hoặc thời gian trước khi nhận việc. Placeholder có thể dùng để code/test sớm nhưng không thay thế asset cần đạt tiêu chí hình ảnh ở cổng demo công khai.

## 15. Theo dõi kết quả

Task: `Planned → In progress → Review → Done`, có thể `Blocked`. Test: `Planned → Ready → Running → Passed/Failed`, hoặc `Blocked` nếu chưa đủ điều kiện; không tính `Blocked` là đạt.

Mẫu báo cáo cho mỗi sprint, đặt vào `docs/test-reports/Sxx.md` khi thực hiện:

```text
Sprint / ngày thực hiện:
Build ID / commit:
Content version / save version / schema version / release cap:
Môi trường / thiết bị / browser / RTT / seed / số phiên:
Task đã nhận / đã xong / chuyển tiếp:
Case dự kiến / đã chạy / passed / failed / blocked:
Lỗi P0 / P1 / P2, link tái hiện và trạng thái sửa:
Kết quả retest và regression:
Chơi thử: class, thời gian, cấp, deaths, gear, nguồn XP:
Bằng chứng: log / ảnh / video / kết quả tự động:
Quyết định: đạt cổng hay cần sửa; lý do và việc còn lại:
Thay đổi scope/ước lượng sprint sau:
```

Không tạo sẵn báo cáo Passed cho các sprint chưa chạy. Số lượng case/ticket không thay thế việc kiểm tra đầu ra thực tế; một case tham số hóa có thể kiểm hàng trăm tổ hợp.

## 16. Đối chiếu yêu cầu với sprint và test

| Yêu cầu | Sprint triển khai chính | Bằng chứng tiêu biểu |
|---|---|---|
| VI/EN, mặc định VI | S01 và mọi sprint có text mới; S09 kiểm toàn bộ | TC-S01-02, TC-S04-07, TC-S09-02 |
| Tài khoản, ba ô nhân vật, lưu online | S01/S03; S08 concurrency; S09 recovery | TC-S01-03..06, TC-S03-07, TC-S08-06..07, TC-S09-05..07 |
| Ba class | S02 nền; S03 vòng đầu; S06 ultimate; S09 hành trình | TC-S02-02..03, TC-S03-06, TC-S06-02, TC-S09-01 |
| Cấp 1–50 có lịch trình | S03–S08 tăng cap; S09 cân bằng | TC-S03-01, TC-S04-06, TC-S08-02, TC-S09-01 |
| Trang bị rõ từng cấp | S03 nền; S04–S08 mở bậc | TC-S03-02, TC-S05-04..05, TC-S08-04..05 |
| 10 map từ thấp tới cao | S03 map1; S04 map2–3; S05 map4–5; S06 map6; S07 map7–8; S08 map9–10 | TC-S04-02, TC-S05-01, TC-S06-01, TC-S07-01, TC-S08-01 |
| Quái/boss tăng độ khó | S02 AI; S03–S08 nội dung | TC-S02-04, TC-S03-05, TC-S05-03, TC-S07-04 |
| Skill nâng 5 hạng | S03 điểm; S04 refund/passive; S05 multi-target; S06 ultimate/cap; S08 rank5 | TC-S03-04, TC-S04-04, TC-S06-03..05, TC-S08-03 |
| Desktop/mobile và thư viện cũ | S02 điều khiển; S06/S09 hiệu năng; mỗi demo smoke | TC-S02-07, TC-S06-07, TC-S09-03, TC-S09-08 |

Các chuỗi ID dạng `..` trong bảng là khoảng liên tiếp, không phải một ID riêng. Nội dung chi tiết nằm trong CSV test cases.
