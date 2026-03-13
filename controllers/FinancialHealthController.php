<?php
// Controller for financial health
class FinancialHealthController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function index($user_id) {
        $score = 0; // TODO: implement logic to calculate financial health
        include __DIR__ . '/../views/financial_health.php';
    }
}
