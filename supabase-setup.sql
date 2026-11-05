-- วางทั้งไฟล์นี้ใน Supabase > SQL Editor แล้วกด Run
-- รันซ้ำได้ปลอดภัย: ถ้าเคยรันเวอร์ชันเก่าไปแล้ว ให้รันไฟล์นี้อีกครั้งเพื่ออัปเดต (เพิ่มระบบจัดลำดับ/แก้ไขรูป)

-- 1) ตารางเก็บข้อมูลรูป
create table if not exists public.photos (
  id         uuid primary key,
  category   text not null check (category in ('prewedding','wedding')),
  album      text,
  title      text,
  url        text not null,
  path       text not null,
  sort_order double precision,
  created_at timestamptz not null default now()
);

-- เพิ่มคอลัมน์ลำดับ (สำหรับผู้ที่เคยสร้างตารางเวอร์ชันเก่าไว้แล้ว)
alter table public.photos add column if not exists sort_order double precision;
alter table public.photos add column if not exists focus_x double precision;   -- จุดโฟกัสของภาพ (%)
alter table public.photos add column if not exists focus_y double precision;

alter table public.photos enable row level security;

-- ทุกคนดูได้, เฉพาะผู้ดูแลที่ล็อกอินแล้วเพิ่ม/แก้ไข/ลบได้
drop policy if exists "public read photos"  on public.photos;
drop policy if exists "admin insert photos" on public.photos;
drop policy if exists "admin update photos" on public.photos;
drop policy if exists "admin delete photos" on public.photos;

create policy "public read photos"  on public.photos for select using (true);
create policy "admin insert photos" on public.photos for insert to authenticated with check (true);
create policy "admin update photos" on public.photos for update to authenticated using (true) with check (true);
create policy "admin delete photos" on public.photos for delete to authenticated using (true);

-- 2) ที่เก็บไฟล์รูป (bucket แบบ public)
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "public read portfolio files"   on storage.objects;
drop policy if exists "admin upload portfolio files"  on storage.objects;
drop policy if exists "admin delete portfolio files"  on storage.objects;

create policy "public read portfolio files"
  on storage.objects for select using (bucket_id = 'portfolio');
create policy "admin upload portfolio files"
  on storage.objects for insert to authenticated with check (bucket_id = 'portfolio');
create policy "admin delete portfolio files"
  on storage.objects for delete to authenticated using (bucket_id = 'portfolio');
