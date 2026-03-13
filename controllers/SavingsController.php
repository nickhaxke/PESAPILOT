<?php
// Controller for savings goals
class SavingsController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        require_once __DIR__ . '/../models/SavingsGoal.php';
        $model = new SavingsGoal($this->db);
        $savings = $model->getByUser($user_id);
        include __DIR__ . '/../views/savings.php';
    }
}
