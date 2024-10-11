# Mira Bot v1

## Giới thiệu

**Mira Bot v1** là một dự án bot tự động hóa được thiết kế để hỗ trợ người dùng trong nhiều tác vụ khác nhau. Dự án này nhằm mục đích cung cấp một công cụ mạnh mẽ và dễ sử dụng cho các nhà phát triển và người dùng cuối.

## Tính năng

- **Tự động hóa tác vụ**: Mira Bot có thể tự động hóa nhiều tác vụ lặp đi lặp lại, giúp tiết kiệm thời gian và công sức.
- **Tích hợp dễ dàng**: Bot có thể được tích hợp với nhiều nền tảng và dịch vụ khác nhau.
- **Tùy chỉnh cao**: Người dùng có thể dễ dàng tùy chỉnh các chức năng của bot theo nhu cầu của mình.
- **Dễ thích nghi**: Là một dự án đơn giản hóa việc dùng api của facebook, người dùng có thể dễ dàng làm quen.

## Cài đặt

Để cài đặt **Mira Bot v1**, bạn cần thực hiện các bước sau:

1. Clone repository:
    ```bash
    git clone https://github.com/GiaKhang1810/mira-bot-v1.git
    ```
2. Cài đặt các phụ thuộc:
    ```bash
    cd mira-bot-v1
    npm install
    ```
3. Chạy bot:
    ```bash
    npm start
    ```

## Sử dụng

Sau khi cài đặt, bạn có thể bắt đầu sử dụng Mira Bot v1 bằng cách cấu hình các tập tin cấu hình và chạy các lệnh tương ứng.

## Cấu hình

Bạn có thể tinh chỉnh cấu hình tại tệp [config.json](config.json).

### facebookAccountOptions

- **email**: Email hoặc ID của tài khoản mà bạn dùng để chạy dự án (c_user).
- **password**: Mật khẩu của tài khoản mà bạn dùng để chạy dự án.
- **whiteID**: ID của tài khoản con (i_user).
- **pageID**: ID của trang tài khoản.
- **proxy**: Proxy của bạn hoặc để null nếu không dùng.
- **cookies**: Cookies của tài khoản bạn dùng để chạy dự án, lưu ý có thể bỏ qua email và password nếu bạn dùng cookies.
- **facebookState**: Tên tệp json để lưu trạng thái mới sau mỗi lần đăng nhập.

### dashboardOptions

- **port**: Cổng mà bạn sẽ dùng để chạy một trang web đơn giản.
- **user**: Một tài khoản ảo hoặc bạn có thể cung cấp một tài khoản bất kỳ để đăng nhập dashboard.
- **password**: Một mật khẩu ảo để đăng nhập dashboard.
- **resetAccount**: Đặt true sẽ tự làm mới tài khoản và gửi về cho admin, để false nếu bạn muốn dùng một tài khoản cố định.

### botOptions

- **adminOnly**: Chỉ cho phép admin sử dụng bot.
- **name**: Tên của bot.
- **prefix**: Tiền tố để gọi lệnh bot.
- **adminIDs**: Danh sách ID của các admin.

### facebookAPIsOptions

- **autoReconnect**: Tự động kết nối lại khi mất kết nối.
- **listenSelf**: Lắng nghe các sự kiện của chính mình.
- **listenNotif**: Lắng nghe thông báo.
- **listenEventsSelf**: Lắng nghe các sự kiện của chính mình.
- **listenEvents**: Lắng nghe các sự kiện.
- **forceLogin**: Bắt buộc đăng nhập lại.
- **autoRefreshState**: Tự động làm mới trạng thái.
- **online**: Trạng thái trực tuyến.
- **updatePresence**: Cập nhật sự hiện diện.
- **autoMarkDelivery**: Tự động đánh dấu đã giao hàng.
- **autoReconnectMqtt**: Tự động kết nối lại MQTT.
  - **enable**: Bật tính năng tự động kết nối lại MQTT.
  - **timeMS**: Thời gian chờ để kết nối lại MQTT (ms).

### systemOptions

- **time_zone**: Múi giờ của hệ thống.
- **language**: Ngôn ngữ của hệ thống.
- **autoRestart**: Tự động khởi động lại.
  - **enable**: Bật tính năng tự động khởi động lại.
  - **timeMS**: Thời gian chờ để khởi động lại (ms).
- **autoLoadPlugins**: Tự động tải plugin.
  - **enable**: Bật tính năng tự động tải plugin.
  - **ignore**: Danh sách plugin bị bỏ qua.
- **autoReloadPlugins**: Tự động tải lại plugin.
  - **enable**: Bật tính năng tự động tải lại plugin.
  - **ignore**: Danh sách plugin bị bỏ qua.
- **DataBase**: Cấu hình cơ sở dữ liệu.
  - **type**: Loại cơ sở dữ liệu.
  - **mongoURI**: URI kết nối MongoDB.

## Demo

Dùng tiền tố để gọi bot của bạn. Ví dụ:<br>

![demo](https://raw.githubusercontent.com/DuongJs/baitapscratchrik/refs/heads/main/462639488_1192945671797249_2821391384853884519_n.jpg)

## Đóng góp

Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng. Nếu bạn muốn đóng góp, vui lòng tạo một pull request hoặc mở một issue mới trên GitHub.

## Giấy phép

Dự án này được cấp phép theo giấy phép MIT. Xem tệp [LICENSE](LICENSE) để biết thêm chi tiết.

