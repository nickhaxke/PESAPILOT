<?php
// Controller for authentication (login/logout)
require_once __DIR__ . '/../models/User.php';
class AuthController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function login() {
        $error = '';
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            $userModel = new User($this->db);
            $user = $userModel->getByEmail($username);
            if ($user && password_verify($password, $user['password'])) {
                session_start();
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['name'];
                header('Location: index.php');
                exit;
            } else {
                $error = 'Invalid credentials.';
            }
        }
        include __DIR__ . '/../views/login.php';
    }

    public function logout() {
        session_start();
        session_destroy();
        header('Location: index.php?action=login');
        exit;
    }
}
