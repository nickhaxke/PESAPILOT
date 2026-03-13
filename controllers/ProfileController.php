<?php
// Controller for user profile (placeholder)
class ProfileController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function index($user_id) {
        $profile = []; // TODO: implement model and fetch user profile
        include __DIR__ . '/../views/profile.php';
    }
}
