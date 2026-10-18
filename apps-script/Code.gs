/**
 * Google Apps Script: lưu lời chúc + xác nhận tham dự từ thiệp cưới vào Google Sheet.
 *   - Tab "Lời chúc": lời chúc của khách (thiệp đọc lại để hiển thị cho mọi người)
 *   - Tab "Xác nhận tham dự": khách báo có đến hay không, dự lễ nào, đi mấy người
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
 * Sửa code này sau khi đã triển khai: Triển khai -> Quản lý tùy chọn triển khai -> ✏ (sửa)
 * -> Phiên bản: Phiên bản mới -> Triển khai (giữ nguyên URL cũ).
 */

const WISH_SHEET = "Lời chúc";
const WISH_HEADERS = ["Thời gian", "Tên", "Tham dự", "Số người", "Lời chúc", "Link mời (?to=)"];
const RSVP_SHEET = "Xác nhận tham dự";
const RSVP_HEADERS = ["Thời gian", "Tên", "Tham dự", "Dự lễ", "Số người", "Lời nhắn", "Link mời (?to=)"];
const ATTEND = { yes: "Sẽ tham dự", maybe: "Chưa chắc", no: "Không tham dự" };
const SIDE = { trai: "Lễ Thành Hôn (nhà trai)", gai: "Lễ Vu Quy (nhà gái)", "ca-hai": "Cả hai lễ" };
const MAX_LIST = 200; // số lời chúc mới nhất trả về cho thiệp hiển thị

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const clean_ = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
// Thêm dấu ' trước chữ bắt đầu bằng = + - @ để Sheet không hiểu nhầm thành công thức
const safe_ = (s) => (/^[=+\-@]/.test(s) ? "'" + s : s);

function append_(name, headers, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // nhiều khách gửi cùng lúc không ghi đè nhau
  try {
    getSheet_(name, headers).appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

/** Thiệp gửi lời chúc hoặc xác nhận tham dự (POST, body là JSON) */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad-json" });
  }

  const name = clean_(data.name, 60);
  if (!name) return json_({ ok: false, error: "missing" });
  const invited = safe_(clean_(data.invited, 60));

  // Xác nhận tham dự
  if (data.type === "rsvp") {
    const yes = data.attend === "yes";
    append_(RSVP_SHEET, RSVP_HEADERS, [
      new Date(),
      safe_(name),
      yes ? ATTEND.yes : ATTEND.no,
      yes ? SIDE[data.side] || "" : "",
      yes ? Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 20) : 0,
      safe_(clean_(data.note, 300)),
      invited,
    ]);
    return json_({ ok: true });
  }

  // Lời chúc (tham dự / số người giờ để trống — đã có form xác nhận riêng)
  const message = clean_(data.message, 400);
  if (!message) return json_({ ok: false, error: "missing" });
  const attend = ATTEND[data.attend] || "";
  const guests = attend ? Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 20) : "";
  append_(WISH_SHEET, WISH_HEADERS, [new Date(), safe_(name), attend, guests, safe_(message), invited]);
  return json_({ ok: true });
}

/** Thiệp lấy danh sách lời chúc để hiển thị cho mọi khách (GET) */
function doGet() {
  const sheet = getSheet_(WISH_SHEET, WISH_HEADERS);
  if (sheet.getLastRow() < 2) return json_({ ok: true, wishes: [] });

  const start = Math.max(2, sheet.getLastRow() - MAX_LIST + 1);
  const values = sheet.getRange(start, 1, sheet.getLastRow() - start + 1, 5).getValues();
  const attendKey = Object.fromEntries(Object.entries(ATTEND).map(([k, v]) => [v, k]));
  const wishes = values
    .filter((r) => r[1] && r[4])
    .map((r) => ({
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).replace(/^'/, ""),
      attend: attendKey[r[2]] || "",
      guests: Number(r[3]) || 1,
      message: String(r[4]).replace(/^'/, ""),
    }));
  return json_({ ok: true, wishes });
}
