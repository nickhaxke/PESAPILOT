<?php
class Expense {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function create($user_id, $amount, $category, $date, $description) {
        $stmt = $this->db->prepare("INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("idsss", $user_id, $amount, $category, $date, $description);
        return $stmt->execute();
    }

    public function getByUser($user_id) {
        $stmt = $this->db->prepare("SELECT * FROM expenses WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
