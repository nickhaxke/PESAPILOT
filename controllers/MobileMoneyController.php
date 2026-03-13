<?php
// Controller for mobile money transactions (placeholder)
class MobileMoneyController {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function list($user_id) {
        $mobileMoney = []; // TODO: implement model and fetch mobile money transactions
        include __DIR__ . '/../views/mobile_money.php';
    }
}
