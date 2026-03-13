<?php if (!empty($messages)): ?>
    <div class="messages">
        <?php foreach ($messages as $msg): ?>
            <div class="message <?= htmlspecialchars($msg['type']) ?>">
                <?= htmlspecialchars($msg['text']) ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
