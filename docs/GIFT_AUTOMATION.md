# Quà tặng: trang, chia sẻ riêng và email

Trang quà tặng dùng bảng tính riêng tư, không mở link công khai. Khi khách gửi form, máy chủ gọi Google Apps Script; script cấp quyền Viewer cho email đăng ký và gửi email có liên kết. Chỉ sau khi Apps Script xác nhận, trang mới hiện liên kết mở bảng.

## Những gì được lưu

Form ghi tên, email, số điện thoại nếu có, vai trò, giai đoạn học tập, thời điểm dự định, nhu cầu, nguồn, URL, UTM và hoạt động nhận quà vào CRM. Lead magnet tự chấm điểm sàng lọc ban đầu và ghi rõ lý do: Fit = vai trò 60% + giai đoạn 40%; Intent dựa trên mốc thời gian; Engagement dựa trên mức hoàn chỉnh, độ cụ thể của nhu cầu và số điện thoại tự nguyện. Điểm tổng dùng công thức CRM Fit 40% / Intent 35% / Engagement 25%. Đây là tín hiệu để ưu tiên follow up, không phải đánh giá năng lực học sinh. Consent nhận chuỗi email là ô tùy chọn, tách riêng với đồng ý gửi tài liệu.

Nếu khách đồng ý nurture, hệ thống xếp ba email cách 1, 4 và 9 ngày. Apps Script chỉ gửi các email đang đến hạn và CRM vẫn kiểm tra consent cùng trạng thái pipeline trước khi cấp email. Lead đã đặt lịch, đã mua, chưa phù hợp hoặc đã rút consent sẽ không được gửi tiếp. Tài khoản Apps Script dùng Gmail của chủ tài khoản để gửi nên áp dụng hạn mức gửi thư của Google.

## Thiết lập một lần

1. Mở project Apps Script đang được URL GIFT_APPS_SCRIPT_URL triển khai. Dùng tài khoản Google linhcoach@gmail.com làm chủ project / tài khoản thực thi. Cập nhật toàn bộ gift-automation/Code.gs vào Code.gs. Script sẽ từ chối cấp quyền hoặc gửi thư nếu tài khoản thực thi khác linhcoach@gmail.com. Trong Project Settings > Script properties, giữ GIFT_AUTOMATION_SECRET trùng với Vercel; không đưa secret vào mã nguồn hay gửi qua chat.
2. Chọn Deploy > Manage deployments > Edit deployment hiện có, chọn New version, Execute as: Me. Who has access: Anyone. Giữ URL /exec hiện tại để không phải đổi GIFT_APPS_SCRIPT_URL. Cấp quyền Drive, Gmail và UrlFetchApp khi Google hỏi. Chạy hàm installNurtureTrigger một lần nếu trigger chưa có.
3. Trong Vercel project CareerCoachforlearningabroad > Settings > Environment Variables, thêm GIFT_APPS_SCRIPT_URL bằng URL /exec và GIFT_AUTOMATION_SECRET bằng đúng chuỗi đã lưu trong Script properties. Chọn Production, Preview và Development nếu muốn dùng ở cả ba môi trường; sau đó redeploy Production.

## Gửi mã đăng nhập bài test

API cấp quyền bài test dùng cùng Web App này để gửi mã email qua Gmail. Dùng bản `gift-automation/Code.gs` mới nhất trong repository khi cập nhật Apps Script, sau đó tạo một deployment version mới của Web App (giữ nguyên URL `/exec`, Script Property `GIFT_AUTOMATION_SECRET` và quyền Gmail). Không cần thay đổi biến `GIFT_APPS_SCRIPT_URL` hoặc `GIFT_AUTOMATION_SECRET` trên Vercel nếu chúng đã được cấu hình. Mỗi email mã được chống gửi trùng theo grant ID.

## Đưa vào menu WordPress

Bản này tạo trang tại https://duhocbenvung.linhcoach-eqstrength.com/qua-tang và thêm mục Quà tặng vào menu của trang Vercel. Menu WordPress ở https://linhcoach-eqstrength.com là một hệ thống riêng. Khi trang đã được publish ở Vercel, thêm một mục menu WordPress tên Quà tặng với URL https://duhocbenvung.linhcoach-eqstrength.com/qua-tang.

## Kiểm tra thủ công sau khi cấu hình

- Dùng một email thử thuộc quyền kiểm soát của bạn và gửi form. Trang cảm ơn chỉ hiện khi Apps Script xác nhận chia sẻ.
- Kiểm tra email: thư có link tài liệu và email được cấp quyền. Mở link bằng đúng email; thử email khác để xác nhận không có quyền.
- Mở CRM và kiểm tra nguồn gift-short-programs, URL, UTM, student_context, ba thành phần score cùng lý do score, activity gift_requested/gift_shared, và trạng thái email consent. Không consent thì không có chuỗi nurture.
- Với consent, kiểm tra ba bản ghi outbox. Để thử gửi mà không chờ, không chỉnh thời gian trên production; dùng bản Preview/Development hoặc đợi đến hạn.
- Kiểm tra Apps Script Executions nếu quyền chia sẻ hoặc gửi thất bại. Không báo thư đã gửi nếu Apps Script chưa trả ok.
