<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/app/configs/SessionValidator.php';
$sessionValidator = new SessionValidator();
$sessionValidator->validateSession();
