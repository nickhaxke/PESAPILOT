<!DOCTYPE html>
<html>
<head>
    <title>PesaPilot - Dashboard</title>
    <link rel="stylesheet" href="/pesapilot/public/style.css">
</head>
<body>
    <div class="container">
        <h1>Dashboard</h1>
        <div class="dashboard-stats">
            <div class="stat-card">
                <h2>Total Income</h2>
                <p><?= isset($totalIncome) ? number_format($totalIncome, 0) : '0' ?> TZS</p>
            </div>
            <div class="stat-card">
                <h2>Total Expenses</h2>
                <p><?= isset($totalExpenses) ? number_format($totalExpenses, 0) : '0' ?> TZS</p>
            </div>
            <div class="stat-card">
                <h2>Budgets</h2>
                <p><?= isset($budgetCount) ? $budgetCount : '0' ?></p>
            </div>
        </div>
        <div class="dashboard-actions">
            <a href="index.php?action=income" class="btn">Add Income</a>
            <a href="index.php?action=expenses" class="btn">Add Expense</a>
            <a href="index.php?action=budgets" class="btn">View Budgets</a>
        </div>
        <div style="margin-top:2em;">
            <a href="?route=home" style="color:#2980b9;">Back to Home</a>
        </div>
    </div>
</body>
</html>
