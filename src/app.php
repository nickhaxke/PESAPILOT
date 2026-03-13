<?php
// Main application bootstrap
require_once __DIR__ . '/../config/config.php';
$route = $_GET['route'] ?? 'home';
session_start();
switch ($route) {
    case 'home':
        require_once __DIR__ . '/../views/home.php';
        break;
    case 'register':
        require_once __DIR__ . '/../controllers/AuthController.php';
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            if (register($username, $password)) {
                header('Location: ?route=login');
                exit;
            } else {
                echo '<p>Registration failed. Try another username.</p>';
            }
        }
        require_once __DIR__ . '/../views/register.php';
        break;
    case 'login':
        require_once __DIR__ . '/../controllers/AuthController.php';
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            if (login($username, $password)) {
                header('Location: ?route=dashboard');
                exit;
            } else {
                echo '<p>Login failed. Invalid credentials.</p>';
            }
        }
        require_once __DIR__ . '/../views/login.php';
        break;
    case 'logout':
        session_destroy();
        header('Location: ?route=login');
        exit;
    case 'dashboard':
        require_once __DIR__ . '/../controllers/DashboardController.php';
        break;
    default:
        http_response_code(404);
        echo 'Page not found';
}
