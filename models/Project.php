<?php
class Project {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getFeatured($limit = 6) {
        $stmt = $this->db->prepare("SELECT * FROM projects WHERE featured = 1 LIMIT ?");
        $stmt->bind_param("i", $limit);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getAll() {
        $stmt = $this->db->prepare("SELECT * FROM projects");
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM projects WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function getImages($project_id) {
        $stmt = $this->db->prepare("SELECT * FROM project_images WHERE project_id = ?");
        $stmt->bind_param("i", $project_id);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
