<?php include __DIR__ . '/partials/header.php'; ?>
<h1><?= htmlspecialchars($project['title']) ?></h1>
<div class="slider">
    <?php foreach ($images as $img): ?>
        <img src="/pesapilot/uploads/<?= htmlspecialchars($img['image_path']) ?>" class="slide" style="display:none;max-width:100%;height:auto;">
    <?php endforeach; ?>
</div>
<script src="/pesapilot/assets/js/slider.js"></script>
<div>
    <p><?= nl2br(htmlspecialchars($project['description'])) ?></p>
    <ul>
        <li>Location: <?= htmlspecialchars($project['location']) ?></li>
        <li>Client: <?= htmlspecialchars($project['client']) ?></li>
        <li>Year: <?= htmlspecialchars($project['completion_year']) ?></li>
        <li>Status: <?= htmlspecialchars($project['project_status']) ?></li>
    </ul>
</div>
<?php include __DIR__ . '/partials/footer.php'; ?>
