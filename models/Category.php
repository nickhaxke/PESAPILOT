<?php
class Category {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getAll() {
        $stmt = $this->db->prepare("SELECT * FROM categories");
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
