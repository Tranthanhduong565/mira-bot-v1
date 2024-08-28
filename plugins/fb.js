class facebook {
    get Options() {
        return {
            name: "fb",
            version: "1.0.0",
            role: 0,
            author: [
                {
                    info: "Khang",
                    contact: "m.me/100036947774673"
                }
            ],
            category: "Tools",
            description: {
                "vi-VN": "Công cụ giúp bạn thực hiện các thao tác không cho phép trên facebook.",
                "en-US": "Tool to help you perform actions that are not allowed on Facebook."
            },
            delay: 2000,
            guides: {
                "vi-VN":
                    "{p}{n}dl reel {url} - Tải video từ reel.\n" +
                    "{p}{n}dl watch {url} - Tải video từ watch.\n" +
                    "{p}{n}token {cookie} - Lấy token từ cookie.\n" +
                    "{p}{n}info user {uid} - Lấy thông tin người dùng.\n" +
                    "{p}{n}info thread {tid} - Lấy thông tin nhóm.\n" +
                    "{p}{n}screen {uid} {userAgent} - Chụp màn hình người dùng.",
                "en-US":
                    "{p}{n}help - Sends a list of instructions for use.\n" +
                    "{p}{n}dl reel {url} - Download video from reel.\n" + 
                    "{p}{n}dl watch {url} - Download videos from watch.\n" +
                    "{p}{n}token {cookie} - Get token from cookie.\n" +
                    "{p}{n}info user {uid} - Get user information.\n" +
                    "{p}{n}info thread {tid} - Get group information.\n" +
                    "{p}{n}screen {uid} {userAgent} - Capture user screen."
            },
            dependencies: ["fs"],
            envConfig: {}
        }
    }

    get Langs() {
        return {
            "vi-VN": {

            },
            "en-US": {
                
            }
        }
    }

    async Reply({ Messenger, User, Thread, events, apis }) {}

    async React({ Messenger, User, Thread, events, apis }) {}

    async Schedule({ Messenger, User, Thread, events, apis }) {}

    async Main({ Messenger, User, Thread, events, apis , args}) {

    }
}

module.exports = facebook;