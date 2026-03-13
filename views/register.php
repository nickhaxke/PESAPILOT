<!DOCTYPE html>
<html>
<head>
    <title>Register - PesaPilot</title>
    <link rel="stylesheet" href="/pesapilot/public/style.css">
</head>
<body>
    <div class="container">
        <h1>Register</h1>
        <form method="post" action="?route=register">
            <label>Username: <input type="text" name="username" required></label><br>
            <label>Password: <input type="password" name="password" required></label><br>
            <button type="submit">Register</button>
        </form>
        <a href="?route=login">Already have an account? Login</a>
    </div>
</body>
</html>
