<?php
// Controller for user logout
class LogoutController {
    public function index() {
        session_start();
        session_destroy();
        header('Location: index.php?action=login');
        exit;
    }
}
