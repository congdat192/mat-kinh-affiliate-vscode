# 📘 Hướng Dẫn Sử Dụng Maxi-Mini Kit

Chào mừng bạn đến với **Maxi-Mini Kit** - bộ công cụ mạnh mẽ, gọn nhẹ và đa năng dành cho Claude Code. Bộ kit này tích hợp sức mạnh của **17 trợ lý ảo (agents) chuyên biệt** vào một quy trình làm việc tinh gọn, giúp bạn lập trình nhanh hơn, chuẩn hơn và ít lỗi hơn.

---

## 🚀 Bắt Đầu Nhanh (Quick Start)

Để bắt đầu sử dụng bộ kit này cho dự án của bạn, hãy làm theo 3 bước đơn giản sau:

### Bước 1: Cài đặt vào dự án
Copy toàn bộ nội dung của thư mục `mini kit` (bao gồm `CLAUDE.md`, `CONTEXT.md`, `USER_GUIDE.md` và thư mục `.claude-skills`) vào **thư mục gốc** của dự án bạn đang làm việc.

### Bước 2: Thiết lập ngữ cảnh (Quan trọng nhất!)
Mở file `CONTEXT.md` và chỉnh sửa nội dung bên trong để mô tả dự án của bạn. Đây là "linh hồn" của bộ kit.
*   **Tech Stack**: Bạn đang dùng công nghệ gì? (Ví dụ: React, Node.js, Python...)
*   **Project Structure**: Cấu trúc thư mục dự án của bạn ra sao?
*   **Development Rules**: Các quy tắc code mà bạn muốn Claude tuân thủ (Ví dụ: "Không dùng thư viện lạ", "Luôn viết comment tiếng Việt"...).

### Bước 3: Bắt đầu code!
Bây giờ bạn chỉ cần chat với Claude. Claude sẽ tự động đọc `CONTEXT.md` để hiểu dự án và tuân thủ các quy tắc bạn đã đặt ra.

---

## ⚡ Các Lệnh Tắt (Slash Commands)

Thay vì chat dài dòng, bạn có thể dùng các lệnh bắt đầu bằng dấu `/` để gọi ngay một chuyên gia cụ thể vào hỗ trợ.

### 🏗️ Nhóm Lập Kế Hoạch & Cốt Lõi
| Lệnh | Trợ lý (Agent) | Khi nào dùng? |
| :--- | :--- | :--- |
| `/plan` | **Kiến Trúc Sư (Architect)** | Dùng khi bạn muốn làm một tính năng mới phức tạp. Nó sẽ giúp bạn lên kế hoạch chi tiết, liệt kê các file cần sửa trước khi bắt tay vào code. |
| `/research` | **Nhà Nghiên Cứu (Researcher)** | Dùng khi bạn bí ý tưởng, cần tìm hiểu về một thư viện mới, hoặc muốn biết "cách tốt nhất để làm X là gì". |
| `/scout` | **Trinh Sát (Scout)** | Dùng khi bạn mới nhận dự án cũ và muốn Claude tìm hiểu cấu trúc code, hoặc tìm vị trí các file liên quan đến một chức năng nào đó. |
| `/scout-ext` | **Trinh Sát Ngoại (External)** | Phiên bản mạnh hơn của Scout, dùng công cụ bên ngoài (Gemini) để tìm kiếm song song. Cần cài đặt `gemini` CLI. |

### 💻 Nhóm Lập Trình & Kiểm Thử
| Lệnh | Trợ lý (Agent) | Khi nào dùng? |
| :--- | :--- | :--- |
| `/code` | **Lập Trình Viên (Fullstack)** | Đây là chế độ mặc định. Dùng để code cả frontend, backend, sửa lỗi nhỏ. |
| `/test` | **Kiểm Thử Viên (Tester)** | Dùng sau khi code xong. Nó sẽ chạy test, kiểm tra xem code mới có làm hỏng gì không. |
| `/debug` | **Chuyên Gia Gỡ Lỗi (Debugger)** | Dùng khi gặp lỗi khó hiểu. Nó sẽ phân tích log, tìm nguyên nhân gốc rễ và đề xuất cách sửa triệt để. |
| `/review` | **Người Review Code** | Dùng trước khi merge code. Nó sẽ soi code của bạn để tìm lỗi bảo mật, code rác, hoặc chỗ chưa tối ưu. |

### 🎨 Nhóm Thiết Kế & Sáng Tạo
| Lệnh | Trợ lý (Agent) | Khi nào dùng? |
| :--- | :--- | :--- |
| `/design` | **Nhà Thiết Kế (UI/UX)** | Dùng khi bạn cần tạo giao diện đẹp, viết CSS, hoặc tư vấn về trải nghiệm người dùng. |
| `/write` | **Người Viết Nội Dung (Copywriter)** | Dùng khi cần viết nội dung marketing, email gửi khách hàng, hoặc bài viết blog. |
| `/ask` | **Người Động Não (Brainstormer)** | Dùng khi bạn cần người thảo luận, tranh biện để tìm ra giải pháp tốt nhất cho một vấn đề. |

### 📊 Nhóm Quản Lý
| Lệnh | Trợ lý (Agent) | Khi nào dùng? |
| :--- | :--- | :--- |
| `/todo` | **Quản Lý Dự Án (PM)** | Dùng để theo dõi tiến độ, xem còn task nào chưa xong, cập nhật roadmap. |
| `/git` | **Quản Lý Git** | Dùng để commit code, tạo Pull Request với nội dung chuẩn chỉnh chuyên nghiệp. |
| `/docs` | **Quản Lý Tài Liệu** | Dùng để viết tài liệu hướng dẫn, cập nhật document khi code thay đổi. |
| `/init` | **Khởi Tạo Context** | Dùng khi mới bắt đầu dự án hoặc khi dự án thay đổi lớn. Nó sẽ quét code và tự động cập nhật file `CONTEXT.md` cho bạn. |
| `/db` | **Quản Trị Database** | Dùng khi cần tạo bảng mới, sửa schema, hoặc tối ưu câu lệnh SQL. |

---

## 💡 Ví Dụ Quy Trình Làm Việc (Workflow)

Để bạn dễ hình dung, đây là cách dùng bộ kit để xây dựng một tính năng mới (ví dụ: "Thêm chức năng Đăng nhập"):

1.  **Lên kế hoạch**:
    > `/plan Tôi muốn thêm chức năng đăng nhập bằng Google.`
    *(Claude sẽ phân tích, liệt kê các file cần tạo, các thư viện cần cài)*

2.  **Thực hiện (Code)**:
    > `/code Ok, hãy thực hiện theo kế hoạch trên.`
    *(Claude sẽ viết code, tạo file, cài thư viện)*

3.  **Kiểm tra (Test)**:
    > `/test Hãy kiểm tra xem chức năng đăng nhập có hoạt động đúng không.`
    *(Claude sẽ chạy test hoặc hướng dẫn bạn cách test thủ công)*

4.  **Review & Tài liệu**:
    > `/review Xem lại code vừa viết có vấn đề bảo mật nào không.`
    > `/docs Cập nhật tài liệu API cho phần đăng nhập này.`

---

## 📂 Cấu Trúc File (Giải thích chi tiết)

*   **`CLAUDE.md`**: Đây là "Bộ não" điều khiển hành vi của Claude.
    *   *Lưu ý*: Bạn **không nên sửa** file này trừ khi bạn hiểu rõ về cách hoạt động của Claude Code. Nó chứa các lệnh để "ép" Claude phải đọc `CONTEXT.md`.

*   **`CONTEXT.md`**: Đây là "Linh hồn" của dự án.
    *   *Lưu ý*: Bạn **phải sửa** file này. Hãy điền mọi thứ về dự án của bạn vào đây. Càng chi tiết, Claude làm việc càng chính xác.

*   **`.claude-skills/`**: Đây là "Cơ bắp".
    *   Chứa 17 file `.md` tương ứng với 17 trợ lý ảo. Bạn có thể mở các file này ra để xem hoặc chỉnh sửa cách làm việc của từng trợ lý nếu muốn.

---

## ❓ Câu Hỏi Thường Gặp

**Q: Tôi có thể dùng bộ kit này cho nhiều dự án khác nhau không?**
A: Có! Bộ kit này được thiết kế "Universal" (Đa năng). Bạn chỉ cần copy nó sang dự án mới và sửa file `CONTEXT.md` là xong.

**Q: Làm sao để thêm một quy tắc mới cho Claude (ví dụ: "Luôn dùng Arrow Function")?**
A: Hãy mở file `CONTEXT.md`, tìm đến mục `DEVELOPMENT RULES` và thêm dòng: "- Luôn sử dụng Arrow Function trong JavaScript/TypeScript."

**Q: Claude có tự động biết tôi đang dùng thư viện gì không?**
A: Có, nhưng tốt nhất bạn nên ghi rõ trong `CONTEXT.md` mục `TECH STACK` để Claude không phải đoán và đưa ra code chính xác nhất ngay từ đầu.

**Q: Lệnh `/scout-ext` và `/mcp` yêu cầu gì?**
A: Các lệnh này sử dụng công cụ `gemini` CLI để chạy các tác vụ nâng cao. Hãy đảm bảo bạn đã cài đặt và cấu hình `gemini` trong môi trường của mình nếu muốn dùng chúng.
