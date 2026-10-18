/**
 * Google Apps Script: lưu lời chúc từ thiệp cưới vào Google Sheet.
 *
 * Cài đặt (làm 1 lần):
 * 1. Tạo Google Sheet mới -> menu Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xoá code mẫu, dán toàn bộ file này vào, bấm Lưu.
 * 3. Bấm Triển khai (Deploy) -> Tùy chọn triển khai mới (New deployment)
 *    -> Loại: Ứng dụng web (Web app)
 *    -> Thực thi với tư cách: Tôi (Me)
 *    -> Người có quyền truy cập: Bất kỳ ai (Anyone)
 *    -> Triển khai, cấp quyền cho tài khoản Google của bạn.
 * 4. Copy "URL ứng dụng web" (dạng https://script.google.com/macros/s/.../exec)
 *    rồi dán vào WISHES_API trong script.js của thiệp.
 *
 * Sửa code này sau khi đã triển khai: Deploy -> Manage deployments -> sửa (bút chì)
 * -> Version: New version -> Deploy (giữ nguyên URL cũ).
 */

const SHEET_NAME = "Lời chúc";
const HEADERS = ["Thời gian", "Tên", "Tham dự", "Số người", "Lời chúc", "Link mời (?to=)"];
const ATTEND = { yes: "Sẽ tham dự", maybe: "Chưa chắc", no: "Không tham dự" };
const MAX_LIST = 200; // số lời chúc mới nhất trả về cho thiệp hiển thị

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const clean_ = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);

/** Thiệp gửi lời chúc mới (POST, body là JSON) */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad-json" });
  }

  const name = clean_(data.name, 60);
  const message = clean_(data.message, 400);
  if (!name || !message) return json_({ ok: false, error: "missing" });

  const attend = ATTEND[data.attend] ? data.attend : "maybe";
  const guests = Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 10);
  const invited = clean_(data.invited, 60);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // nhiều khách gửi cùng lúc không ghi đè nhau
  try {
    // Thêm dấu ' trước tên/lời chúc để Sheet không hiểu nhầm thành công thức (=, +, -, @)
    const safe = (s) => (/^[=+\-@]/.test(s) ? "'" + s : s);
    getSheet_().appendRow([new Date(), safe(name), ATTEND[attend], guests, safe(message), safe(invited)]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Thiệp lấy danh sách lời chúc để hiển thị cho mọi khách (GET) */
function doGet() {
  const sheet = getSheet_();
  const rows = sheet.getLastRow() - 1;
  if (rows < 1) return json_({ ok: true, wishes: [] });

  const start = Math.max(2, sheet.getLastRow() - MAX_LIST + 1);
  const values = sheet.getRange(start, 1, sheet.getLastRow() - start + 1, 5).getValues();
  const attendKey = Object.fromEntries(Object.entries(ATTEND).map(([k, v]) => [v, k]));
  const wishes = values
    .filter((r) => r[1] && r[4])
    .map((r) => ({
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).replace(/^'/, ""),
      attend: attendKey[r[2]] || "maybe",
      guests: Number(r[3]) || 1,
      message: String(r[4]).replace(/^'/, ""),
    }));
  return json_({ ok: true, wishes });
}
