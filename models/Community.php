<?php
class Community {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getAllPosts() {
        $stmt = $this->db->prepare("SELECT * FROM community_posts ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
