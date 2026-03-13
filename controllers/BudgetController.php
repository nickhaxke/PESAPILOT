<?php
require_once __DIR__ . '/../models/Budget.php';

class BudgetController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $budgetModel = new Budget($this->db);
        $budgets = $budgetModel->getByUser($user_id);
        include __DIR__ . '/../views/budgets.php';
    }
}
