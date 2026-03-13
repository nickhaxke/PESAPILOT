<?php
require_once __DIR__ . '/../models/Project.php';

class ProjectController {
    private $projectModel;
    public function __construct($db) {
        $this->projectModel = new Project($db);
    }

    public function home() {
        $featured = $this->projectModel->getFeatured();
        include __DIR__ . '/../views/home.php';
    }

    public function list() {
        $projects = $this->projectModel->getAll();
        include __DIR__ . '/../views/projects.php';
    }

    public function single($id) {
        $project = $this->projectModel->getById($id);
        $images = $this->projectModel->getImages($id);
        include __DIR__ . '/../views/project_single.php';
    }
}
