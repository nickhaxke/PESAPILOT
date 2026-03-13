<?php
require_once __DIR__ . '/../models/Income.php';
require_once __DIR__ . '/../models/Expense.php';
require_once __DIR__ . '/../models/Budget.php';

class DashboardController {
	private $db;
	public function __construct($db) { $this->db = $db; }

	public function index($user_id) {
		$incomeModel = new Income($this->db);
		$expenseModel = new Expense($this->db);
		$budgetModel = new Budget($this->db);
		$totalIncome = 0;
		$totalExpenses = 0;
		$budgetCount = 0;
		$income = $incomeModel->getByUser($user_id);
		$expenses = $expenseModel->getByUser($user_id);
		$budgets = $budgetModel->getByUser($user_id);
		foreach ($income as $inc) $totalIncome += $inc['amount'];
		foreach ($expenses as $exp) $totalExpenses += $exp['amount'];
		$budgetCount = count($budgets);
		include __DIR__ . '/../views/dashboard.php';
	}
}
