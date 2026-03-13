<?php
// Controller for community features (placeholder)
class CommunityController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function index() {
        include __DIR__ . '/../views/community.php';
    }
}
