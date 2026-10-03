# Linh Coach — luồng bài kiểm chứng

## Luồng người dùng

1. Ba mẹ vào landing page, điền thông tin và giữ nguyên bước thanh toán QR hiện tại.
2. SePay xác nhận giao dịch theo mã `LC########`.
3. Landing page mở nút **Mở bài test cho con**; ba mẹ có thể gửi đường dẫn đó cho con.
4. Con trả lời 40 câu hỏi, mỗi câu theo thang 1–7.
5. Hệ thống tạo bản đồ 5 chiều theo marker và phần diễn giải; website không hiển thị điểm số.
6. Đường dẫn kết quả có chữ ký và tự hết hạn sau 30 ngày.
7. Từ kết quả, người dùng có thể đặt lịch ở trang coaching hiện tại.

## Biến môi trường trên Vercel

Giữ nguyên các biến đang dùng cho QR/SePay:

- `APPS_SCRIPT_URL`
- `APPS_SCRIPT_SECRET`
- `SEPAY_OCB_VA`
- `SEPAY_API_KEY`

Thêm biến mới:

- `ASSESSMENT_SIGNING_SECRET`: chuỗi bí mật dài, ngẫu nhiên; không dùng chuỗi mặc định trong môi trường production.

Không đưa các giá trị trên vào mã nguồn, ảnh chụp màn hình, Excel công khai hoặc tin nhắn cho khách hàng.

## Các URL sau khi triển khai

- `/`: landing page
- `/test?code=LC########`: bài test được mở sau khi thanh toán đã xác nhận
- `/result?token=...`: bản đồ kết quả có thời hạn

## Ghi chú vận hành

- Không xoá các endpoint QR/SePay hiện có.
- Không chuyển tự động sang trang đặt lịch ngay sau thanh toán; bước đó chỉ xuất hiện sau khi con hoàn tất bài test.
- Khi đổi câu hỏi hoặc quy tắc, cập nhật đồng thời `lib/assessment.js`, `questions.js` và file Excel quy tắc nội bộ.
- Trước khi đưa bản mới lên production, chạy `node --test tests/*.test.mjs`.
