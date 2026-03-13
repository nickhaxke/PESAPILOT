<?php
class SavingsGoal {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getByUser($user_id) {
        $stmt = $this->db->prepare("SELECT * FROM savings_goals WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
