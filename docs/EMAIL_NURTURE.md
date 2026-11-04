# Email nuôi dưỡng trong CRM

CRM hiện tạo nội dung theo score và lưu vào `lead_email_outbox`. Bản hiện tại không tự gửi email và không tự nhận email đã gửi thành công.

## Ba chuỗi

- Score 70–100: 2 email, ngày 0 và ngày 3. Mục tiêu là hiểu nhu cầu và mời đặt lịch 1:1.
- Score 40–69: 3 email, ngày 0, ngày 3 và ngày 7. Mục tiêu là cung cấp câu hỏi tự rà soát, ví dụ áp dụng và gợi ý bước tiếp theo.
- Score 0–39: 3 email, ngày 0, ngày 7 và ngày 14. Mục tiêu là duy trì giá trị và mở lại liên hệ khi lead sẵn sàng.

Mỗi email có mục tiêu, điều kiện gửi, tiêu đề, nội dung, một CTA và điều kiện dừng. Chuỗi dừng khi lead đặt lịch (`booked`), đã mua (`won`), chưa phù hợp/từ chối (`not_fit`) hoặc rút đồng ý nhận email.

## Cách vận hành an toàn

1. Mở hồ sơ khách hàng trong `/admin/crm`.
2. Chỉ bật “Đồng ý nhận email nuôi dưỡng” khi khách đã đồng ý nhận liên hệ qua email.
3. Kiểm tra email xem trước, sau đó bấm “Tạo outbox — không gửi”.
4. Outbox là danh sách bản nháp có thời điểm dự kiến. Chưa có nhà cung cấp email nên cần tích hợp provider riêng trước khi gửi thật.
5. Nếu khách đặt lịch, đã mua, không phù hợp hoặc rút consent, đổi trạng thái/consent; các bản nháp chờ gửi sẽ được dừng.

## Kiểm thử

- Tạo một lead không có email hoặc chưa bật consent: nút tạo outbox phải bị khóa.
- Tạo lead có score 75, email và consent: phải thấy 2 email trong bản xem trước/outbox.
- Tạo lead có score 50: phải thấy 3 email; score 20: cũng phải thấy 3 email với lịch dài hơn.
- Chuyển lead sang “Đặt lịch”, “Đã mua” hoặc “Chưa phù hợp”: trạng thái các bản nháp phải thành “Đã dừng”.
- Bỏ consent sau khi đã tạo outbox: các bản nháp chưa gửi phải thành “Đã dừng”.
- Ghi một email thủ công: phần “Lịch sử email đã ghi nhận” hiển thị rõ đây chỉ là ghi nhận, không phải xác nhận gửi thành công.

