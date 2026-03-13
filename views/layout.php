<?php
// Example layout file for advanced templating (optional)
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($title) ? $title : 'PesaPilot' ?></title>
    <link rel="stylesheet" href="/pesapilot/assets/css/style.css">
</head>
<body>
    <?php include __DIR__ . '/partials/header.php'; ?>
    <main>
        <?= $content ?>
    </main>
    <?php include __DIR__ . '/partials/footer.php'; ?>
</body>
</html>
