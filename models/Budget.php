<?php
class Budget {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function create($user_id, $category, $amount, $month, $year) {
        $stmt = $this->db->prepare("INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("isdii", $user_id, $category, $amount, $month, $year);
        return $stmt->execute();
    }

    public function getByUser($user_id) {
        $stmt = $this->db->prepare("SELECT * FROM budgets WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
