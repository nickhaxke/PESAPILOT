<?php include __DIR__ . '/partials/header.php'; ?>
<h1>Login</h1>
<form method="post" action="?route=login" style="max-width:400px;margin:auto;">
    <label>Name or Email:<br><input type="text" name="username" required style="width:100%;padding:0.5em;margin-bottom:1em;"></label><br>
    <label>Password:<br><input type="password" name="password" required style="width:100%;padding:0.5em;margin-bottom:1em;"></label><br>
    <button type="submit" style="background:#36A2EB;color:#fff;padding:0.7em 1.5em;border-radius:6px;border:none;">Login</button>
</form>
<div style="text-align:center;margin-top:1em;">
    <a href="?route=register">Create an account</a>
</div>
<?php include __DIR__ . '/partials/footer.php'; ?>
