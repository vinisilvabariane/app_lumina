<?php
session_start();
require_once($_SERVER["DOCUMENT_ROOT"] . "/app/configs/Authenticator.php");
if (isset($_SESSION['id'])) {
    header("location:" . "/app/views/workflow/geral/index.php");
    exit;
} else {
    header("location:" . "/app/views/login/index.php");
    exit;
}
