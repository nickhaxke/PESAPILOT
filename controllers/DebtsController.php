<?php
// Controller for debts (placeholder, implement model as needed)
class DebtsController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $debts = []; // TODO: implement model and fetch debts
        include __DIR__ . '/../views/debts.php';
    }
}
