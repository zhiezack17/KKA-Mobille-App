-- ==========================================================
-- Migration: Master KKA (KKP Standar Narasi, KKA Fisik, Sketsa/Foto)
-- Inspektorat Kabupaten Rokan Hilir
-- ==========================================================
-- FILE ASLI DARI KKA-Update (update v13) - dipulihkan kembali.
-- Aman: CREATE TABLE IF NOT EXISTS, TIDAK menghapus data lama.
-- ==========================================================

-- Tabel induk: 1 Sesi Audit boleh punya banyak dokumen Master KKA
CREATE TABLE IF NOT EXISTS `kka_master` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sesi_id` INT UNSIGNED NOT NULL,
  `tipe` ENUM('standar','fisik','sketsa') NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `no_kka` VARCHAR(50) DEFAULT NULL,
  `ref_pka` VARCHAR(50) DEFAULT NULL,
  `narasi` MEDIUMTEXT DEFAULT NULL,
  `pendamping` VARCHAR(150) DEFAULT NULL,
  `ketua_tim` VARCHAR(150) DEFAULT NULL,
  `pendamping_nip` VARCHAR(30) DEFAULT NULL,
  `ketua_tim_nip` VARCHAR(30) DEFAULT NULL,
  `tanggal_dok` DATE DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_master_sesi` FOREIGN KEY (`sesi_id`) REFERENCES `kka_sesi`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_master_user` FOREIGN KEY (`created_by`) REFERENCES `kka_users`(`id`) ON DELETE SET NULL,
  INDEX (`sesi_id`), INDEX (`tipe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Baris pengukuran fisik (untuk tipe = 'fisik')
CREATE TABLE IF NOT EXISTS `kka_master_fisik` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `master_id` INT UNSIGNED NOT NULL,
  `urutan` INT NOT NULL DEFAULT 1,
  `sta` VARCHAR(50) DEFAULT NULL,
  `jarak` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `lebar_i` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `lebar_ii` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `tebal` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `volume` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  CONSTRAINT `fk_fisik_master` FOREIGN KEY (`master_id`) REFERENCES `kka_master`(`id`) ON DELETE CASCADE,
  INDEX (`master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foto lapangan (untuk tipe = 'sketsa')
CREATE TABLE IF NOT EXISTS `kka_master_foto` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `master_id` INT UNSIGNED NOT NULL,
  `urutan` INT NOT NULL DEFAULT 1,
  `nama_asli` VARCHAR(255) NOT NULL,
  `nama_file` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `ukuran` INT UNSIGNED DEFAULT 0,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_foto_master` FOREIGN KEY (`master_id`) REFERENCES `kka_master`(`id`) ON DELETE CASCADE,
  INDEX (`master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
