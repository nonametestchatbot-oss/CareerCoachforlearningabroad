# Linh Coach — luồng bài kiểm chứng riêng tư

## Luồng người dùng

1. Ba mẹ vào landing page, điền thêm email nhận quyền truy cập và thanh toán QR như hiện tại.
2. SePay xác nhận giao dịch theo mã `LC########`; mã này được dùng để cấp đúng một lượt cho email đã xác thực.
3. Người dùng vào `/test?code=LC########`, nhập email, nhận mã OTP 6 số và mở bài test.
4. Người dùng trả lời 40 câu hỏi, mỗi câu theo thang 1–7. Một grant chỉ được nộp một lần.
5. Hệ thống lưu kết quả trong Supabase, hiển thị bản đồ 5 chiều, cờ/tên quốc gia và 3 quốc gia gần nhất.
6. Grant và kết quả hết quyền xem sau 30 ngày. Quản trị viên có thể cấp grant mới cho cùng email để làm lại.
7. Nếu grant mới bật **Hiện lần trước**, kết quả mới sẽ kèm so sánh với lần gần nhất còn trong thời hạn.

## Cấu hình Supabase một lần

1. Tạo một project Supabase riêng cho website.
2. Vào **SQL Editor**, chạy toàn bộ file `supabase/migrations/20261029_assessment_access.sql`.
3. Vào **Authentication → Providers → Email**, bật Email provider và tắt Confirm email nếu muốn dùng OTP 6 số ngay sau khi gửi.
4. Trong Vercel, thêm các biến `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` và `ADMIN_EMAILS` theo `.env.example`.

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đặt ở môi trường server của Vercel. Không đưa key này vào JavaScript phía trình duyệt hoặc gửi qua chat.

## Cấp quyền thủ công

- Mở `/admin-assessment.html` bằng email nằm trong `ADMIN_EMAILS`.
- Nhận OTP qua email và đăng nhập.
- Nhập email khách, chọn có cho phép hiện lần trước hay không, rồi bấm cấp lượt.
- Mỗi lần cấp lại sẽ tạo một grant mới có hạn 30 ngày; grant cũ vẫn giữ lịch sử nhưng không thể dùng lại.

## Biến môi trường trên Vercel

Giữ nguyên các biến đang dùng cho QR/SePay:

- `APPS_SCRIPT_URL`
- `APPS_SCRIPT_SECRET`
- `SEPAY_OCB_VA`
- `SEPAY_API_KEY`

Thêm biến mới:

- `ASSESSMENT_SIGNING_SECRET`: chỉ cần giữ lại nếu muốn duy trì các link test cũ; luồng mới dùng Supabase Auth.

Không đưa các giá trị trên vào mã nguồn, ảnh chụp màn hình, Excel công khai hoặc tin nhắn cho khách hàng.

## Các URL sau khi triển khai

- `/`: landing page
- `/test?code=LC########`: màn hình xác thực email và bài test sau thanh toán
- `/admin-assessment.html`: trang cấp quyền thủ công
- `/result?id=...`: kết quả thuộc về email đã xác thực, có thời hạn

## Ghi chú vận hành

- Không xoá các endpoint QR/SePay hiện có.
- Form landing page phải giữ trường email; email này là định danh để khách mở bài test sau thanh toán.
- Không dùng service-role key ở client; các bảng Supabase đã bật RLS và chỉ API server được đọc/ghi.
- Không chuyển tự động sang trang đặt lịch ngay sau thanh toán; bước đó chỉ xuất hiện sau khi con hoàn tất bài test.
- Khi đổi câu hỏi hoặc quy tắc, cập nhật đồng thời `lib/assessment.js`, `questions.js` và file Excel quy tắc nội bộ.
- Test thủ công: gửi form thiếu email (phải bị chặn), nhập mã chưa Paid (phải bị chặn), nhập email hợp lệ + OTP (phải vào được), nộp lần hai (phải bị chặn), chờ quá hạn (phải bị chặn), cấp lại grant (phải làm được lượt mới).
- Trước khi đưa bản mới lên production, chạy `node --test tests/*.test.mjs` và kiểm tra các endpoint sau deploy.
