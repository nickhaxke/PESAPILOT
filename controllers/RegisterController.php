<?php
// Controller for user registration (placeholder)
class RegisterController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function index() {
        include __DIR__ . '/../views/register.php';
    }
}
