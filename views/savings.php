<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Savings Goals</h1>
<div class="savings-goals-list" style="max-width:700px;">
	<?php 
	// Sample data for demonstration
	$savings = isset($savings) ? $savings : [
		['name' => 'Emergency Fund', 'target_amount' => 1000000, 'current_amount' => 400000, 'deadline' => '2026-12-31'],
		['name' => 'New Laptop', 'target_amount' => 1500000, 'current_amount' => 900000, 'deadline' => '2026-09-01'],
	];
	?>
	<?php if (!empty($savings)): foreach ($savings as $goal): 
		$percent = min(100, round(($goal['current_amount'] / $goal['target_amount']) * 100));
	?>
		<div class="savings-goal-card" style="background:#eaf6fb;padding:1em 2em;border-radius:8px;margin-bottom:1.5em;box-shadow:0 1px 4px #cce6f6;">
			<h2 style="color:#2980b9; margin-bottom:0.5em;"><?= htmlspecialchars($goal['name']) ?></h2>
			<div style="margin-bottom:0.5em;">Target: <?= number_format($goal['target_amount'], 0) ?> TZS</div>
			<div style="margin-bottom:0.5em;">Saved: <?= number_format($goal['current_amount'], 0) ?> TZS (<?= $percent ?>%)</div>
			<div style="background:#cce6f6;height:14px;border-radius:8px;width:100%;margin-bottom:0.5em;">
				<div style="background:#36A2EB;height:14px;border-radius:8px;width:<?= $percent ?>%;transition:width 0.5s;"></div>
			</div>
			<div style="font-size:0.95em;color:#555;">Deadline: <?= htmlspecialchars($goal['deadline']) ?></div>
		</div>
	<?php endforeach; else: ?>
		<p>No savings goals found.</p>
	<?php endif; ?>
</div>
<a href="#" class="btn" style="background:#36A2EB;color:#fff;padding:0.7em 1.5em;border-radius:6px;text-decoration:none;">Add Savings Goal</a>
<?php include __DIR__ . '/partials/footer.php'; ?>
