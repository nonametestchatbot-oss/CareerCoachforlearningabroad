# Quà tặng: trang, chia sẻ riêng và email

Trang quà tặng dùng bảng tính riêng tư, không mở link công khai. Khi khách gửi form, máy chủ gọi Google Apps Script; script cấp quyền Viewer cho email đăng ký và gửi email có liên kết. Chỉ sau khi Apps Script xác nhận, trang mới hiện liên kết mở bảng.

## Những gì được lưu

Form ghi tên, email, số điện thoại nếu có, nguồn, URL, UTM và hoạt động nhận quà vào CRM hiện tại. Điểm Fit/Intent để trống nếu khách không làm form chẩn đoán; hệ thống không tự gán điểm. Consent nhận chuỗi email là ô tùy chọn, tách riêng với đồng ý gửi tài liệu.

Nếu khách đồng ý nurture, hệ thống xếp ba email cách 1, 4 và 9 ngày. Apps Script chỉ gửi các email đang đến hạn và CRM vẫn kiểm tra consent cùng trạng thái pipeline trước khi cấp email. Lead đã đặt lịch, đã mua, chưa phù hợp hoặc đã rút consent sẽ không được gửi tiếp. Tài khoản Apps Script dùng Gmail của chủ tài khoản để gửi nên áp dụng hạn mức gửi thư của Google.

## Thiết lập một lần

1. Mở script.google.com bằng tài khoản Google đang sở hữu bảng tính. Tạo project mới, dán toàn bộ nội dung gift-automation/Code.gs vào Code.gs. Trong Project Settings > Script properties, thêm GIFT_AUTOMATION_SECRET với chuỗi ngẫu nhiên dài ít nhất 32 ký tự. Tự tạo và giữ chuỗi này trong trình quản lý mật khẩu; không gửi qua chat.
2. Chọn Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy, cấp quyền Drive, Gmail và UrlFetchApp khi Google hỏi. Sao chép URL Web app kết thúc bằng /exec. Chạy hàm installNurtureTrigger một lần trong Apps Script và chấp thuận quyền tạo trigger.
3. Trong Vercel project CareerCoachforlearningabroad > Settings > Environment Variables, thêm GIFT_APPS_SCRIPT_URL bằng URL /exec và GIFT_AUTOMATION_SECRET bằng đúng chuỗi đã lưu trong Script properties. Chọn Production, Preview và Development nếu muốn dùng ở cả ba môi trường; sau đó redeploy Production.

## Đưa vào menu WordPress

Bản này tạo trang tại https://duhocbenvung.linhcoach-eqstrength.com/qua-tang và thêm mục Quà tặng vào menu của trang Vercel. Menu WordPress ở https://linhcoach-eqstrength.com là một hệ thống riêng. Khi trang đã được publish ở Vercel, thêm một mục menu WordPress tên Quà tặng với URL https://duhocbenvung.linhcoach-eqstrength.com/qua-tang.

## Kiểm tra thủ công sau khi cấu hình

- Dùng một email thử thuộc quyền kiểm soát của bạn và gửi form. Trang cảm ơn chỉ hiện khi Apps Script xác nhận chia sẻ.
- Kiểm tra email: thư có link tài liệu và email được cấp quyền. Mở link bằng đúng email; thử email khác để xác nhận không có quyền.
- Mở CRM và kiểm tra nguồn gift-short-programs, URL, UTM, activity gift_requested/gift_shared, cùng trạng thái email consent. Không consent thì không có chuỗi nurture.
- Với consent, kiểm tra ba bản ghi outbox. Để thử gửi mà không chờ, không chỉnh thời gian trên production; dùng bản Preview/Development hoặc đợi đến hạn.
- Kiểm tra Apps Script Executions nếu quyền chia sẻ hoặc gửi thất bại. Không báo thư đã gửi nếu Apps Script chưa trả ok.
