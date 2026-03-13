<?php
require_once __DIR__ . '/../models/Income.php';

class IncomeController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $incomeModel = new Income($this->db);
        $income = $incomeModel->getByUser($user_id);
        include __DIR__ . '/../views/income.php';
    }
}
