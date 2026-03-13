<?php
class Profile {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getByUser($user_id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }
}
