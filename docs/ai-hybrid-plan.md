# AICOS: kế hoạch AI lai (model tự huấn luyện + API) và cách tối ưu

Mục tiêu: giảng viên chấm cao khi nhóm **có model của chính mình** (dữ liệu, huấn luyện, đo đạc), còn API (Groq/DeepSeek) dùng để sinh câu trả lời và làm phương án dự phòng. Gom lại thành **một kiến trúc lai**: model riêng làm phần "hiểu và chấm điểm", API làm phần "diễn đạt".

## 1. Hiện trạng (đã đọc)

| Nguồn | Nội dung |
|---|---|
| `PROPOSAL_V2_FE_REDESIGN.md` | Proposal v2 chỉ còn **3 tính năng AI**: Smart Barista chat (UC-52), gợi ý cá nhân (UC-54), phân tích phản hồi (UC-64 -> UC-37). Dự báo kho, gợi ý quản lý, chấm công khuôn mặt đã bỏ (BR-49) |
| `Backend/src/Services/Ai` (FastAPI) | Mới có khung: `chat.py`, `forecast.py`, `summary.py`, `attendance.py` đều trả `501 Not implemented`. Xác thực JWT dùng chung, có Redis và Postgres schema `ai` (pgvector) |
| `requirements.txt` + `gen_ai_tech_stack_excel.py` | Nhóm đã ghi "chỉ dùng model pretrained/API, **không tự huấn luyện**" và chuyển cho GVHD giải trình |
| `CustomerProfileService.AnalyzePendingFeedbackAsync` | Phân tích phản hồi hiện là **luật theo số sao** (sao >= 4 là POSITIVE...), `Confidence = 0.5` cố định. Đây là baseline để đo model mới |
| `VietAITravel` (dự án PRM392) | Mẫu tham khảo: xoay nhiều khóa Groq, dự phòng Ollama rồi luật, ghi lại prompt và phản hồi, validator sửa JSON |

Lưu ý: yêu cầu của giảng viên (có model riêng) **mâu thuẫn** với dòng "không train" trong `requirements.txt` và file Excel. Cần nhóm đồng ý trước khi làm, rồi sửa hai chỗ đó.

## 2. Kiến trúc lai: mỗi tính năng có "model riêng + API"

```
Khách / quản lý (Frontend)
        |  REST + SSE
        v
  AI Service (FastAPI)
   |-- Router thông minh (intent, độ khó, độ tin cậy)
   |-- [Model riêng, chạy CPU, ONNX]  intent, sentiment+aspect, recommender, embedding
   |-- [RAG]  pgvector (lọc tenant_id) + từ khóa (pg_trgm)
   |-- [LLM API]  Groq (chính) -> DeepSeek -> Ollama cục bộ -> câu trả lời theo mẫu
   '-- Log: prompt, nguồn, độ trễ, chi phí -> bảng ai.* (để chấm điểm và gỡ lỗi)
```

### 2.1 Phân tích phản hồi (UC-64) - phần "model riêng" mạnh nhất
- **Model:** fine-tune `vinai/phobert-base-v2` (hoặc `ViSoBERT`) cho 2 đầu ra: cảm xúc (tích cực/trung tính/tiêu cực) và khía cạnh nhiều nhãn (đồ uống, phục vụ, giá, không gian, tốc độ).
- **Dữ liệu:** khởi động từ bộ tiếng Việt công khai (UIT-VSFC), thêm 2.000 đến 3.000 câu đánh giá quán cà phê: sinh bằng LLM theo kịch bản rồi **tự gán nhãn tay 400 đến 500 câu "vàng"** để kiểm thử. Ghi rõ trong báo cáo đâu là dữ liệu tổng hợp.
- **Đo:** macro-F1 trên tập vàng, so sánh 3 phương án: luật theo sao (hiện có), LLM zero-shot qua API, model fine-tune. Thường model fine-tune ngang hoặc hơn LLM zero-shot, nhanh hơn 20 đến 50 lần và không tốn tiền API.
- **Triển khai:** xuất ONNX, lượng tử hóa int8, chạy CPU khoảng 30 đến 60 ms mỗi câu. LLM chỉ dùng để **tóm tắt chủ đề** theo tuần cho quản lý và xử lý câu độ tin cậy thấp.
- Ghi kết quả vào `FeedbackAnalyses` (đã có cột `Sentiment`, `Confidence`).

### 2.2 Gợi ý cá nhân (UC-54) - model riêng thứ hai
- **Model:** gợi ý món theo lịch sử đơn: ban đầu đồng xuất hiện (item-item), nâng lên ALS ẩn (thư viện `implicit`) hoặc two-tower nhỏ. Người dùng mới (cold start): món bán chạy theo giờ, thời tiết, hoặc món tương tự bằng embedding mô tả món.
- **Dữ liệu:** bảng đơn hàng của từng thương hiệu. Khi dữ liệu thật ít, sinh bộ đơn giả lập có quy luật (theo giờ, nhóm khách) và **nói rõ là giả lập**.
- **Đo:** chia theo thời gian, Recall@K và NDCG@K so với baseline "món bán chạy nhất".
- **Triển khai:** huấn luyện lại hằng đêm (lịch), kết quả lưu sẵn trong Redis theo khách, API trả < 20 ms. Tách dữ liệu theo `tenant_id`.

### 2.3 Smart Barista (UC-52) - RAG với phần tự host
- **Embedding tự host:** `intfloat/multilingual-e5-small` hoặc `BAAI/bge-m3` chạy CPU; vector vào pgvector, **luôn lọc `tenant_id`**.
- **Truy xuất lai:** vector + từ khóa (`pg_trgm`), lấy 20 rồi rerank lấy 5.
- **Phân loại ý định (model riêng nhỏ):** hỏi món/dị ứng, hỏi đơn hàng, xin gợi ý, cần nhân viên. Huấn luyện bộ phân loại (logistic regression hoặc DistilBERT) trên embedding, khoảng 300 câu mẫu. Việc này cho phép **không gọi LLM** với câu hỏi đơn giản (giờ mở cửa, món có đường không) và chuyển câu "cần người" sang nhân viên.
- **Sinh câu trả lời:** Groq `llama-3.3-70b` cho câu khó, `llama-3.1-8b-instant` cho câu dễ; DeepSeek khi Groq lỗi; Ollama (`qwen2.5:3b` hoặc `7b`) khi mất mạng; cuối cùng là mẫu trả lời từ dữ liệu truy xuất.
- **An toàn:** chỉ trả lời từ nguồn đã truy xuất (món, giá, dị ứng); không bịa giá; nhắc nguồn bằng thẻ món; che số điện thoại, email trước khi gửi API ngoài.
- **Đo:** bộ 100 câu hỏi vàng; truy xuất hit@5; "faithfulness" (câu trả lời có nằm trong nguồn không) bằng LLM chấm; tỷ lệ chuyển nhân viên đúng.

## 3. Tối ưu (nghĩ như senior)

| Hướng | Cách làm | Lợi ích |
|---|---|---|
| Độ trễ | Phản hồi chat dạng **SSE streaming**; mục tiêu chữ đầu < 1,5 s | Cảm giác nhanh trên điện thoại |
| Chi phí | Router ý định: câu đơn giản không gọi LLM; cache ngữ nghĩa trong Redis; model 8B cho câu dễ | Giảm 40 đến 70% số lần gọi API |
| Chạy CPU | ONNX + int8, batch embedding, tải model một lần | Không cần GPU khi chạy thật |
| Huấn luyện | Colab/Kaggle GPU miễn phí; lưu notebook, seed, model card | Tái lập được, có bằng chứng cho giảng viên |
| Độ bền | Timeout ngắn, circuit breaker, xoay nhiều khóa Groq, dự phòng theo chuỗi | Demo không chết khi API lỗi |
| Chất lượng | Bộ kiểm thử vàng + chạy tự động mỗi lần đổi prompt/model; đánh số phiên bản prompt và model | Không "tụt chất lượng" âm thầm |
| Quan sát | Ghi `ai.requests`: nhà cung cấp, độ trễ, token, tin cậy, tenant | Bảng đo cho báo cáo và gỡ lỗi |
| Riêng tư | Che thông tin cá nhân trước khi gửi API ngoài; không gửi dữ liệu tenant khác | Phù hợp BR về dữ liệu |

## 4. Bằng chứng nên có trong báo cáo (điểm cộng)
1. Sơ đồ kiến trúc lai (mục 2) và lý do chọn từng thành phần.
2. Mô tả dữ liệu: nguồn, số mẫu, cách gán nhãn, phần tổng hợp.
3. Notebook huấn luyện + model card + file ONNX.
4. Bảng so sánh: luật/baseline, LLM API, model của nhóm (F1, Recall@K, độ trễ, chi phí).
5. Demo: chat trả lời kèm thẻ món; trang "Dành cho bạn"; trang phản hồi có nhãn cảm xúc và chủ đề.

## 5. Phạm vi vừa sức (ưu tiên)
- **Bắt buộc:** phân tích phản hồi (2.1) + Smart Barista (2.3, phần router/embedding/RAG).
- **Nên có:** gợi ý (2.2).
- **Không làm:** dự báo kho, chấm công khuôn mặt, gợi ý khuyến mãi tự sinh (đã bị loại ở proposal v2).

## 6. Phần Frontend (do mình làm, không đụng Backend)
- `aiApi.chat`: hiện báo "chưa có API" ở chế độ thật; sẽ nối `POST /ai/chat` (SSE) và hiển thị thẻ món có nút "+".
- Trang `/for-you` (UC-54), hiển thị lý do gợi ý (một câu).
- Màn hình phản hồi của quản lý (UC-37): nhãn cảm xúc, chủ đề, độ tin cậy dạng chữ.
- Hợp đồng API đề xuất sẽ ghi vào `docs/api-contract.md` (chat, recommendations, feedback analysis) để team Backend dựng.

## 7. Việc cần nhóm quyết
1. Chốt với GVHD: được tự huấn luyện model (và sửa dòng "không train" trong `requirements.txt` và Excel).
2. Mã AI nằm ở đâu: trong `Backend/src/Services/Ai` (BE team làm) hay thư mục riêng `AI-Models/` (huấn luyện, đo đạc), rồi bàn giao file ONNX cho service.
3. Dữ liệu: ai gán nhãn 400 đến 500 câu và ai tạo bộ đơn giả lập.
