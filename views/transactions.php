<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Transactions</h1>
<div class="transactions-list">
    <h2>Income</h2>
    <?php if (!empty($income)): foreach ($income as $inc): ?>
        <div class="income-card">
            <h3><?= htmlspecialchars($inc['source']) ?></h3>
            <p>Amount: <?= number_format($inc['amount'], 0) ?> TZS</p>
            <p>Date: <?= htmlspecialchars($inc['date']) ?></p>
        </div>
    <?php endforeach; else: ?>
        <p>No income records found.</p>
    <?php endif; ?>
    <h2>Expenses</h2>
    <?php if (!empty($expenses)): foreach ($expenses as $exp): ?>
        <div class="expense-card">
            <h3><?= htmlspecialchars($exp['category']) ?></h3>
            <p>Amount: <?= number_format($exp['amount'], 0) ?> TZS</p>
            <p>Date: <?= htmlspecialchars($exp['date']) ?></p>
        </div>
    <?php endforeach; else: ?>
        <p>No expense records found.</p>
    <?php endif; ?>
</div>
<?php include __DIR__ . '/partials/footer.php'; ?>
