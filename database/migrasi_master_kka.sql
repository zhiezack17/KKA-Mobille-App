-- ==================================================================
-- MIGRASI MASTER KKA (untuk aplikasi mobile)
-- Jalankan SEKALI di phpMyAdmin (pilih database KKA -> tab SQL).
-- Aman: hanya menambah tabel, tidak mengubah/menghapus data lama.
-- ==================================================================
-- CATATAN: bila tabel kka_master / kka_master_fisik / kka_master_foto
-- SUDAH dibuat oleh update web v13 dengan skema berbeda, JANGAN jalankan
-- file ini (CREATE IF NOT EXISTS tidak akan mengubah skema lama).
-- Kirimkan migration_master_kka.sql dari server agar disamakan.
-- ==================================================================

CREATE TABLE IF NOT EXISTS `kka_master` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sesi_id` INT UNSIGNED NOT NULL,
  `tipe` ENUM('standar','fisik','sketsa') NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `narasi` LONGTEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_master_sesi` (`sesi_id`),
  KEY `idx_master_tipe` (`tipe`),
  CONSTRAINT `fk_master_sesi` FOREIGN KEY (`sesi_id`)
    REFERENCES `kka_sesi`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_master_user` FOREIGN KEY (`created_by`)
    REFERENCES `kka_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kka_master_fisik` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `master_id` INT UNSIGNED NOT NULL,
  `sta` VARCHAR(50) DEFAULT NULL,
  `jarak` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `lebar1` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `lebar2` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `tebal` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `volume` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `urutan` INT NOT NULL DEFAULT 1,
  KEY `idx_fisik_master` (`master_id`),
  CONSTRAINT `fk_fisik_master` FOREIGN KEY (`master_id`)
    REFERENCES `kka_master`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kka_master_foto` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `master_id` INT UNSIGNED NOT NULL,
  `nama_file` VARCHAR(255) NOT NULL,
  `nama_asli` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `ukuran` INT UNSIGNED NOT NULL DEFAULT 0,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_foto_file` (`nama_file`),
  KEY `idx_foto_master` (`master_id`),
  CONSTRAINT `fk_foto_master` FOREIGN KEY (`master_id`)
    REFERENCES `kka_master`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
