<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Expenses</h1>
<div class="expenses-list">
    <?php if (!empty($expenses)): foreach ($expenses as $expense): ?>
        <div class="expense-card">
            <h2><?= htmlspecialchars($expense['category']) ?></h2>
            <p>Amount: <?= number_format($expense['amount'], 0) ?> TZS</p>
            <p>Date: <?= htmlspecialchars($expense['date']) ?></p>
            <p><?= htmlspecialchars($expense['description']) ?></p>
        </div>
    <?php endforeach; else: ?>
        <p>No expenses found.</p>
    <?php endif; ?>
</div>
<a href="index.php?action=add_expense" class="btn">Add Expense</a>
<?php include __DIR__ . '/partials/footer.php'; ?>
