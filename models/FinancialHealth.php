<?php
class FinancialHealth {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getScore($user_id) {
        // Example: calculate score based on income, expenses, savings, debts
        // TODO: implement real logic
        return 75;
    }
}
