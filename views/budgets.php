<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Budgets</h1>
<div class="budgets-list">
    <?php if (!empty($budgets)): foreach ($budgets as $budget): ?>
        <div class="budget-card">
            <h2><?= htmlspecialchars($budget['category']) ?></h2>
            <p>Amount: <?= number_format($budget['amount'], 0) ?> TZS</p>
            <p>Month: <?= htmlspecialchars($budget['month']) ?>/<?= htmlspecialchars($budget['year']) ?></p>
        </div>
    <?php endforeach; else: ?>
        <p>No budgets found.</p>
    <?php endif; ?>
</div>
<a href="index.php?action=add_budget" class="btn">Add Budget</a>
<?php include __DIR__ . '/partials/footer.php'; ?>
