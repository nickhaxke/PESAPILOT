<?php
require_once __DIR__ . '/../models/Expense.php';

class ExpenseController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $expenseModel = new Expense($this->db);
        $expenses = $expenseModel->getByUser($user_id);
        include __DIR__ . '/../views/expenses.php';
    }
}
