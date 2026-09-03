-- =================================================================
-- CEK MASTER KKA - HANYA MEMBACA (tidak mengubah/menghapus apa pun)
-- Jalankan di phpMyAdmin: pilih database KKA -> tab SQL -> paste -> Go
-- Lalu kirim hasilnya (screenshot / copy teks) ke developer.
-- =================================================================

-- 1) Apakah tabel master ada? (harus muncul 3 baris: kka_master, kka_master_fisik, kka_master_foto)
SHOW TABLES LIKE 'kka_master%';

-- 2) Berapa jumlah data? (KUNCI: kalau > 0 berarti data MASIH ADA di database)
SELECT 'kka_master' AS tabel, COUNT(*) AS jumlah FROM kka_master
UNION ALL
SELECT 'kka_master_fisik', COUNT(*) FROM kka_master_fisik
UNION ALL
SELECT 'kka_master_foto', COUNT(*) FROM kka_master_foto;

-- 3) Kalau ada isinya, lihat contoh 10 dokumen terakhir
SELECT id, sesi_id, tipe, judul, created_by, created_at
FROM kka_master
ORDER BY id DESC
LIMIT 10;

-- 4) Skema tabel yang SEBENARNYA ada di server (PENTING: copy semua hasilnya)
SHOW CREATE TABLE kka_master;
SHOW CREATE TABLE kka_master_fisik;
SHOW CREATE TABLE kka_master_foto;

-- 5) Cek file template & folder upload (jumlah file di folder uploads/master)
--    (jalankan di phpMyAdmin kolom SQL tidak bisa; cek lewat File Manager)
