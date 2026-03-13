<?php
// Controller for transactions (income + expenses)
require_once __DIR__ . '/../models/Income.php';
require_once __DIR__ . '/../models/Expense.php';

class TransactionsController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $incomeModel = new Income($this->db);
        $expenseModel = new Expense($this->db);
        $income = $incomeModel->getByUser($user_id);
        $expenses = $expenseModel->getByUser($user_id);
        include __DIR__ . '/../views/transactions.php';
    }
}
