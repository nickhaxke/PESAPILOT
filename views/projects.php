<?php include __DIR__ . '/partials/header.php'; ?>
<h1>All Projects</h1>
<div class="project-grid">
    <?php if (!empty($projects)): foreach ($projects as $proj): ?>
        <div class="project-card">
            <a href="index.php?action=project&id=<?= $proj['id'] ?>">
                <img src="/pesapilot/uploads/<?= htmlspecialchars($proj['main_featured_image']) ?>" alt="">
                <h2><?= htmlspecialchars($proj['title']) ?></h2>
            </a>
        </div>
    <?php endforeach; else: ?>
        <p>No projects found.</p>
    <?php endif; ?>
</div>
<?php include __DIR__ . '/partials/footer.php'; ?>
