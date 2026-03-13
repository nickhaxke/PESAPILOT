<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Financial Health</h1>
<div class="financial-health-score" style="margin-bottom:2em;">
	<h2>Your Financial Health Score</h2>
	<?php $score = isset($score) ? $score : 75; ?>
	<div style="background:#eaf6fb;border-radius:8px;padding:1em 2em;max-width:400px;">
		<div style="font-size:2em;font-weight:bold;color:#2980b9;"><?= $score ?> / 100</div>
		<div style="background:#cce6f6;height:16px;border-radius:8px;margin:1em 0;width:100%;">
			<div style="background:#36A2EB;height:16px;border-radius:8px;width:<?= $score ?>%;transition:width 0.5s;"></div>
		</div>
		<p style="margin:0;">A higher score means better financial health.</p>
	</div>
</div>
<div class="financial-tips" style="max-width:600px;">
	<h3>Tips to Improve Your Financial Health</h3>
	<ul>
		<li>Track your income and expenses regularly.</li>
		<li>Set and stick to a monthly budget.</li>
		<li>Save a portion of your income every month.</li>
		<li>Pay off debts on time to avoid penalties.</li>
		<li>Review your financial goals frequently.</li>
	</ul>
</div>
<?php include __DIR__ . '/partials/footer.php'; ?>
