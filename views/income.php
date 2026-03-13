<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Income</h1>
<div class="income-list">
    <?php if (!empty($income)): foreach ($income as $inc): ?>
        <div class="income-card">
            <h2><?= htmlspecialchars($inc['source']) ?></h2>
            <p>Amount: <?= number_format($inc['amount'], 0) ?> TZS</p>
            <p>Date: <?= htmlspecialchars($inc['date']) ?></p>
            <p><?= htmlspecialchars($inc['notes']) ?></p>
        </div>
    <?php endforeach; else: ?>
        <p>No income records found.</p>
    <?php endif; ?>
</div>
<a href="index.php?action=add_income" class="btn">Add Income</a>
<?php include __DIR__ . '/partials/footer.php'; ?>
