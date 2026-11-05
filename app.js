// ===== ชั้นเก็บข้อมูล: ใช้ Supabase ถ้าตั้งค่าแล้ว ไม่งั้นใช้โหมดทดลอง (IndexedDB) =====
const CFG = window.SITE;
const DRIVE = !!(CFG.driveFolderId && CFG.driveApiKey);                  // โหมด Google Drive
const DEMO = !DRIVE && (!CFG.supabaseUrl || !CFG.supabaseKey);           // โหมดทดลอง
const DRIVE_MSG = "โหมด Google Drive: เพิ่ม/ลบ/จัดลำดับรูปได้ที่ Google Drive โดยตรง";
let sb = null;
if (!DRIVE && !DEMO) sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);

// ===== โหมด Google Drive: อ่านโครงสร้างโฟลเดอร์ แล้วแปลงเป็นอัลบั้ม =====
//   โฟลเดอร์หลัก / พรีเวดดิ้ง / U&F / 01.jpg 02.jpg ...
//                / งานแต่งงาน / ชื่ออัลบั้ม / ...
// ลำดับรูป = เรียงตามชื่อไฟล์ (รูปแรก = ภาพปก)  ชื่ออัลบั้ม = ชื่อโฟลเดอร์
const Drive = {
  CACHE_KEY: "drive-cache-v1",
  TTL: 5 * 60 * 1000,                                   // จำผลไว้ 5 นาที เพื่อโหลดเร็วและไม่เปลือง quota
  imgUrl: (id, w = 1800) => `https://lh3.googleusercontent.com/d/${id}=w${w}`,

  async ls(parentId) {
    const out = []; let token = "";
    do {
      const u = new URL("https://www.googleapis.com/drive/v3/files");
      u.searchParams.set("q", `'${parentId}' in parents and trashed=false`);
      u.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,createdTime)");
      u.searchParams.set("orderBy", "name_natural");
      u.searchParams.set("pageSize", "1000");
      u.searchParams.set("supportsAllDrives", "true");
      u.searchParams.set("includeItemsFromAllDrives", "true");
      u.searchParams.set("key", CFG.driveApiKey);
      if (token) u.searchParams.set("pageToken", token);
      const r = await fetch(u);
      if (!r.ok) {
        let m = ""; try { m = (await r.json()).error?.message || ""; } catch {}
        throw new Error(`Google Drive ตอบกลับ ${r.status}${m ? " (" + m + ")" : ""}`);
      }
      const j = await r.json();
      out.push(...(j.files || [])); token = j.nextPageToken || "";
    } while (token);
    return out;
  },

  async load(force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(this.CACHE_KEY) || "null");
      if (!force && !/[?&]refresh\b/.test(location.search) && c && Date.now() - c.t < this.TTL && c.id === CFG.driveFolderId) return c.rows;
    } catch {}

    const isFolder = f => f.mimeType === "application/vnd.google-apps.folder";
    const isImg = f => (f.mimeType || "").startsWith("image/");
    const norm = s => String(s).replace(/[\u0E48-\u0E4C]/g, "").trim().toLowerCase();      // ตัดวรรณยุกต์ไทยก่อนเทียบ จะพิมพ์สลับลำดับหรือสะกดเกินมาก็จับได้
    const catOf = name => {
      for (const [k, names] of Object.entries(CFG.driveCategories || {}))
        if (names.some(n => norm(n) === norm(name))) return k;
      return null;
    };

    const root = await this.ls(CFG.driveFolderId);
    const jobs = [];                                      // แต่ละงาน = อัลบั้ม 1 อัน { cat, album, files }
    const catFolders = root.filter(f => isFolder(f) && catOf(f.name));
    // อัลบั้มที่วางไว้ตรงๆ ในโฟลเดอร์หลัก (ไม่อยู่ในโฟลเดอร์หมวด) ให้นับเป็นพรีเวดดิ้ง
    root.filter(f => isFolder(f) && !catOf(f.name)).forEach(f => jobs.push({ cat: "prewedding", album: f.name, id: f.id }));

    await Promise.all(catFolders.map(async cf => {
      const items = await this.ls(cf.id);
      const cat = catOf(cf.name);
      items.filter(isFolder).forEach(f => jobs.push({ cat, album: f.name, id: f.id }));
      jobs.push({ cat, album: "", files: items.filter(isImg) });        // รูปที่วางในโฟลเดอร์หมวดโดยตรง = "รวมภาพ..."
    }));
    await Promise.all(jobs.map(async j => { if (j.id) j.files = (await this.ls(j.id)).filter(isImg); }));

    const rows = []; let n = 0;
    jobs.forEach(j => (j.files || []).forEach(f => rows.push({
      id: f.id, url: this.imgUrl(f.id), category: j.cat, album: j.album, title: "", path: "",
      sort_order: ++n, created_at: f.createdTime || new Date().toISOString()
    })));
    try { sessionStorage.setItem(this.CACHE_KEY, JSON.stringify({ t: Date.now(), id: CFG.driveFolderId, rows })); } catch {}
    return rows;
  }
};

const idb = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (this.db) return res(this.db);
      const r = indexedDB.open("portfolio-demo", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
      r.onsuccess = () => { this.db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  },
  async all() {
    const db = await this.open();
    return new Promise((res, rej) => {
      const q = db.transaction("photos").objectStore("photos").getAll();
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  },
  async get(id) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const q = db.transaction("photos").objectStore("photos").get(id);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  },
  async put(v) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction("photos", "readwrite");
      t.objectStore("photos").put(v);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  },
  async del(id) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction("photos", "readwrite");
      t.objectStore("photos").delete(id);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  }
};

// ลำดับแสดงผล: ใช้ sort_order ถ้ามี ไม่งั้นใช้เวลาที่อัปโหลด (รูปเก่าก่อน รูปใหม่ต่อท้าย)
const orderOf = p => (p.sort_order ?? Date.parse(p.created_at));

const Store = {
  async list() {
    let rows;
    if (DRIVE) {
      rows = await Drive.load();
    } else if (DEMO) {
      rows = (await idb.all()).map(r => ({ ...r, url: URL.createObjectURL(r.blob) }));
    } else {
      const { data, error } = await sb.from("photos").select("*");
      if (error) throw error;
      rows = data;
    }
    return rows.sort((a, b) => orderOf(a) - orderOf(b));
  },
  async add(blob, meta) {
    if (DRIVE) throw new Error(DRIVE_MSG);
    const id = crypto.randomUUID();
    const sort_order = Date.now();
    if (DEMO) {
      await idb.put({ id, ...meta, blob, sort_order, created_at: new Date().toISOString() });
      return;
    }
    const path = `${meta.category}/${id}.jpg`;
    const up = await sb.storage.from(CFG.bucket).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (up.error) throw up.error;
    const url = sb.storage.from(CFG.bucket).getPublicUrl(path).data.publicUrl;
    const ins = await sb.from("photos").insert({ id, ...meta, url, path, sort_order });
    if (ins.error) throw ins.error;
  },
  // แก้ไขข้อมูลรูป: { album, category, title }
  async update(id, fields) {
    if (DRIVE) throw new Error(DRIVE_MSG);
    if (DEMO) {
      const row = await idb.get(id);
      if (row) await idb.put({ ...row, ...fields });
      return;
    }
    const r = await sb.from("photos").update(fields).eq("id", id);
    if (r.error) throw r.error;
  },
  // จัดลำดับใหม่: รับรายการ id เรียงตามที่ต้องการ
  async reorder(ids) {
    await Promise.all(ids.map((id, i) => this.update(id, { sort_order: i + 1 })));
  },
  async remove(p) {
    if (DRIVE) throw new Error(DRIVE_MSG);
    if (DEMO) return idb.del(p.id);
    await sb.storage.from(CFG.bucket).remove([p.path]);
    const r = await sb.from("photos").delete().eq("id", p.id);
    if (r.error) throw r.error;
  },
  async hasSession() {
    if (DEMO || DRIVE) return true;
    const { data } = await sb.auth.getSession();
    return !!data.session;
  },
  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async logout() { if (!DEMO && !DRIVE) await sb.auth.signOut(); }
};

// ย่อรูปก่อนอัปโหลด (ด้านยาวสุด 2200px, JPEG 85%) เพื่อประหยัดพื้นที่ฟรี
async function compress(file, max = 2200, quality = 0.85) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/jpeg", quality));
}

const CAT = { prewedding: "พรีเวดดิ้ง", wedding: "งานแต่งงาน" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
