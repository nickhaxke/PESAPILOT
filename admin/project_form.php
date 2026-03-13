<?php
// Simple admin form for adding/editing projects (no authentication for demo)
// Handle POST for add/edit, file upload, validation, etc. (to be implemented)
?>
<form method="post" enctype="multipart/form-data">
    <label>Title: <input type="text" name="title" required></label><br>
    <label>Description: <textarea name="description"></textarea></label><br>
    <label>Location: <input type="text" name="location"></label><br>
    <label>Client: <input type="text" name="client"></label><br>
    <label>Year: <input type="number" name="completion_year"></label><br>
    <label>Status: <input type="text" name="project_status"></label><br>
    <label>Category: <select name="category_id"><option value="">Select</option></select></label><br>
    <label>Featured Image: <input type="file" name="main_featured_image"></label><br>
    <label>Project Images: <input type="file" name="project_images[]" multiple></label><br>
    <button type="submit">Save Project</button>
</form>
