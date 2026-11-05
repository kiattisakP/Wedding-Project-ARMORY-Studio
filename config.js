// ===== ตั้งค่าเว็บไซต์ (แก้ไฟล์นี้ไฟล์เดียว) =====
window.SITE = {
  name: "ARMORY Studio",                     // ชื่อสตูดิโอ / ช่างภาพ
  tagline: "ภาพถ่ายพรีเวดดิ้งและงานแต่งงาน เก็บทุกความรู้สึกให้เป็นภาพที่อยู่ตลอดไป",
  heroImage: "hero.jpg",                     // รูปส่วนบนสุด (ชื่อไฟล์ในโฟลเดอร์เดียวกับเว็บ หรือลิงก์รูป) ว่างไว้ = ภาพผลงานสลับกันอัตโนมัติ
  heroFocus: "50% 49%",                      // จุดที่อยากให้เห็นเสมอ (แนวนอน แนวตั้ง) เช่น "50% 30%" = กลาง และค่อนไปทางบน

  contact: {
    line: "",                                              // เช่น https://line.me/ti/p/~yourid
    phone: "0967966111",
    email: "Kiattisak.f01@gmail.com",
    instagram: "",                                         // เช่น https://instagram.com/yourstudio
    facebook: "https://www.facebook.com/kiattisak.f01"     // Kiattisak Phonthana
  },

  // ----- ดึงรูปจาก Google Drive (กรอกทั้ง 2 ช่อง = ใช้ Drive แทน Supabase) -----
  driveFolderId: "",   // รหัสโฟลเดอร์หลักใน Drive (ข้อความท้ายลิงก์โฟลเดอร์ หลัง /folders/)
  driveApiKey: "",     // Google API key (เปิดใช้ Google Drive API) ดูวิธีใน README.md
  // ชื่อโฟลเดอร์หมวดหมู่ในโฟลเดอร์หลัก (ตรงชื่อไหนก็ได้ ไม่สนตัวพิมพ์เล็ก-ใหญ่)
  driveCategories: {
    prewedding: ["พรีเวดดิ้ง", "prewedding", "pre-wedding", "pre wedding"],
    wedding: ["งานแต่งงาน", "งานแต่ง", "wedding"]
  },

  // ----- เชื่อมฐานข้อมูล Supabase (ถ้าเว้นว่าง = โหมดทดลอง เก็บรูปในเบราว์เซอร์เครื่องนี้) -----
  supabaseUrl: "",     // เช่น https://xxxx.supabase.co
  supabaseKey: "",     // ใช้ anon public key เท่านั้น (ห้ามใช้ service_role)
  bucket: "portfolio"
};
