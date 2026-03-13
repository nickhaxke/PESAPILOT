<?php
// Controller for error handling
class ErrorController {
    public function notFound() {
        include __DIR__ . '/../views/404.php';
    }
}
