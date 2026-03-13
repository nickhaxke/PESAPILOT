<?php
class Income {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function create($user_id, $amount, $source, $date, $notes) {
        $stmt = $this->db->prepare("INSERT INTO income (user_id, amount, source, date, notes) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("idsss", $user_id, $amount, $source, $date, $notes);
        return $stmt->execute();
    }

    public function getByUser($user_id) {
        $stmt = $this->db->prepare("SELECT * FROM income WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
