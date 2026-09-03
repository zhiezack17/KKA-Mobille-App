<?php
// Konfigurasi koneksi ke database
$host = "localhost"; // Host MySQL
$username = "arsb3948_adminkka"; // Username MySQL
$password = "G0p-9-K3R902M)tR"; // Password MySQL
$database = "arsb3948_dbkka"; // Nama Database

// Buat koneksi ke database
$conn = mysqli_connect($host, $username, $password, $database);

// Periksa koneksi
if (!$conn) {
    die("Koneksi gagal: " . mysqli_connect_error());
}

// Jika koneksi berhasil
echo "Koneksi ke database berhasil";
?>