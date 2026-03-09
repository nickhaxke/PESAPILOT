const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// SMS parsing patterns for different providers (Swahili & English)
const SMS_PATTERNS = {
  mpesa: {
    // Tanzanian M-Pesa Swahili formats
    sent: /(?:Umetuma|Umemtumia|You have sent)\s+(?:TZS|Tsh|TSh|Ksh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:TZS|Tsh|TSh|Ksh)?\s*(?:kwa|to)\s+(.+?)(?:\s*\(|\s+tarehe|\s+on|\.|$)/i,
    received: /(?:Umepokea|You have received)\s+(?:TZS|Tsh|TSh|Ksh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:TZS|Tsh|TSh|Ksh)?\s*(?:kutoka kwa|kutoka|from)\s+(.+?)(?:\s*\(|\s+tarehe|\s+on|\.|$)/i,
    payment: /(?:Umelipa|You have paid|Malipo)\s+(?:TZS|Tsh|TSh|Ksh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:TZS|Tsh|TSh|Ksh)?\s*(?:kwa|to)\s+(.+?)(?:\s*\(|\s+tarehe|\s+on|\.|$)/i,
    withdrawal: /(?:Umetoa|Withdraw|Cash out|Kutoa)\s+(?:TZS|Tsh|TSh|Ksh)?\s?([0-9,]+(?:\.[0-9]+)?)/i,
    balance: /(?:Salio lako jipya ni|Salio|New balance|balance)[:\s]*(?:TZS|Tsh|TSh|Ksh)?\s?([0-9,]+(?:\.[0-9]+)?)/i,
    reference: /^([A-Z0-9]{6,12})\s+(?:Imethibitishwa|Confirmed)/i,
    referenceFallback: /(?:Ref|Reference|TrxID|ID)[:\s]*([A-Z0-9]+)/i
  },
  airtel: {
    sent: /(?:You have transferred|Umetuma|Sent)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:to|kwa)\s+(.+?)(?:\s*\(|\s+on|\.|$)/i,
    received: /(?:You have received|Umepokea|Received)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:from|kutoka)\s+(.+?)(?:\s*\(|\s+on|\.|$)/i,
    payment: /(?:Payment of|Paid|Umelipa)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:to|kwa)\s+(.+?)(?:\s*\(|\s+on|\.|$)/i,
    balance: /(?:balance|Bal|Salio)[:\s]*(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)/i,
    reference: /(?:Ref|ID)[:\s]*([A-Z0-9]+)/i
  },
  tigopesa: {
    sent: /(?:Umetuma|You sent)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:kwa|to)\s+(.+?)(?:\s*\(|\s+tarehe|\.|$)/i,
    received: /(?:Umepokea|You received)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:kutoka|from)\s+(.+?)(?:\s*\(|\s+tarehe|\.|$)/i,
    payment: /(?:Umelipa|You paid)\s+(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)\s*(?:kwa|to)\s+(.+?)(?:\s*\(|\s+tarehe|\.|$)/i,
    balance: /(?:Salio|Balance)[:\s]*(?:TZS|Tsh)?\s?([0-9,]+(?:\.[0-9]+)?)/i,
    reference: /(?:Ref|ID)[:\s]*([A-Z0-9]+)/i
  }
};

// Merchant category mapping
const MERCHANT_CATEGORIES = {
  'kfc': 'Food',
  'pizza': 'Food',
  'restaurant': 'Food',
  'cafe': 'Food',
  'food': 'Food',
  'supermarket': 'Groceries',
  'shoprite': 'Groceries',
  'nakumatt': 'Groceries',
  'uber': 'Transport',
  'bolt': 'Transport',
  'taxi': 'Transport',
  'fuel': 'Transport',
  'petrol': 'Transport',
  'tanesco': 'Bills',
  'luku': 'Bills',
  'dawasco': 'Bills',
  'water': 'Bills',
  'electric': 'Bills',
  'safaricom': 'Airtime',
  'vodacom': 'Airtime',
  'airtel': 'Airtime',
  'tigo': 'Airtime',
  'halotel': 'Airtime',
  'hospital': 'Health',
  'clinic': 'Health',
  'pharmacy': 'Health',
  'school': 'Education',
  'university': 'Education',
  'college': 'Education',
  'rent': 'Rent',
  'cinema': 'Entertainment',
  'movie': 'Entertainment',
  'netflix': 'Entertainment',
  'transfer': 'Mobile Money'
};

// Parse amount from string
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  return parseFloat(amountStr.replace(/,/g, ''));
}

// Detect provider from SMS
function detectProvider(message) {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('m-pesa') || lowerMsg.includes('mpesa') || lowerMsg.includes('vodacom')) return 'mpesa';
  if (lowerMsg.includes('airtel')) return 'airtel';
  if (lowerMsg.includes('tigo') || lowerMsg.includes('tigopesa')) return 'tigopesa';
  if (lowerMsg.includes('halo') || lowerMsg.includes('halopesa')) return 'halopesa';
  
  // Check for Tanzanian M-Pesa indicators (Swahili format with specific keywords)
  if (lowerMsg.includes('imethibitishwa') || lowerMsg.includes('salio lako jipya')) return 'mpesa';
  if (lowerMsg.includes('msaada 0800')) return 'mpesa'; // M-Pesa helpline
  
  // Default to mpesa for TZS transactions as it's most common
  if (lowerMsg.includes('tzs') || lowerMsg.includes('tsh')) return 'mpesa';
  
  return 'other';
}

// Categorize transaction based on merchant
function categorizeTransaction(merchant, description) {
  const searchText = (merchant + ' ' + description).toLowerCase();
  
  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (searchText.includes(keyword)) {
      return category;
    }
  }
  return 'Other';
}

// Parse SMS message
function parseSMS(message, provider) {
  const patterns = SMS_PATTERNS[provider] || SMS_PATTERNS.mpesa;
  let result = {
    type: 'other',
    amount: 0,
    recipient: null,
    sender: null,
    merchant: null,
    balance: null,
    reference: null
  };

  // Try to extract reference (check start of message first for Tanzanian format)
  const refStartMatch = message.match(patterns.reference);
  if (refStartMatch) {
    result.reference = refStartMatch[1];
  } else {
    const refMatch = message.match(patterns.referenceFallback || /(?:Ref|Reference|TrxID|ID)[:\s]*([A-Z0-9]+)/i);
    if (refMatch) result.reference = refMatch[1];
  }

  // Try to extract balance
  const balMatch = message.match(patterns.balance);
  if (balMatch) result.balance = parseAmount(balMatch[1]);

  // Try to match transaction types
  let match;
  
  if ((match = message.match(patterns.payment))) {
    result.type = 'payment';
    result.amount = parseAmount(match[1]);
    result.merchant = match[2]?.trim();
  } else if ((match = message.match(patterns.sent))) {
    result.type = 'sent';
    result.amount = parseAmount(match[1]);
    result.recipient = match[2]?.trim();
  } else if ((match = message.match(patterns.received))) {
    result.type = 'received';
    result.amount = parseAmount(match[1]);
    result.sender = match[2]?.trim();
  } else if ((match = message.match(patterns.withdrawal))) {
    result.type = 'withdrawal';
    result.amount = parseAmount(match[1]);
  }

  // If still no match, try generic amount extraction
  if (result.amount === 0) {
    const amountMatch = message.match(/(?:TZS|Tsh|TSh|Ksh)\s?([0-9,]+(?:\.[0-9]+)?)/i);
    if (amountMatch) {
      result.amount = parseAmount(amountMatch[1]);
      // Determine type from keywords
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('umepokea') || lowerMsg.includes('received')) {
        result.type = 'received';
      } else if (lowerMsg.includes('umetuma') || lowerMsg.includes('sent')) {
        result.type = 'sent';
      } else if (lowerMsg.includes('umelipa') || lowerMsg.includes('paid')) {
        result.type = 'payment';
      }
    }
  }

  return result;
}

// Parse and store SMS
router.post('/parse', [
  body('smsText').notEmpty().withMessage('SMS message is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { smsText, timestamp } = req.body;
    const message = smsText;
    const provider = detectProvider(message);
    const parsed = parseSMS(message, provider);
    
    // Check if we could parse the SMS
    if (parsed.amount === 0 && parsed.type === 'other') {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not parse this SMS format. Please check the message format.' 
      });
    }
    
    // Auto-categorize
    const category = categorizeTransaction(parsed.merchant || parsed.sender || parsed.recipient || '', message);
    
    // Store the SMS transaction
    const [result] = await pool.query(
      `INSERT INTO sms_transactions 
       (user_id, raw_message, transaction_type, amount, balance_after, recipient, sender, merchant, reference, provider, transaction_date, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        message,
        parsed.type,
        parsed.amount,
        parsed.balance,
        parsed.recipient,
        parsed.sender,
        parsed.merchant,
        parsed.reference,
        provider,
        timestamp ? new Date(timestamp) : new Date(),
        category
      ]
    );

    const smsId = result.insertId;

    // Auto-create expense if it's a payment or sent money
    if (parsed.amount > 0 && ['payment', 'sent', 'withdrawal'].includes(parsed.type)) {
      const category = categorizeTransaction(parsed.merchant || '', message);
      const description = parsed.merchant || parsed.recipient || `${provider.toUpperCase()} ${parsed.type}`;
      
      const [expenseResult] = await pool.query(
        `INSERT INTO expenses (user_id, amount, category, date, description, source, sms_id, merchant)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId,
          parsed.amount,
          category,
          new Date().toISOString().split('T')[0],
          description,
          'sms',
          smsId,
          parsed.merchant || parsed.recipient
        ]
      );

      // Link expense to SMS
      await pool.query(
        'UPDATE sms_transactions SET linked_expense_id = ?, is_processed = TRUE WHERE id = ?',
        [expenseResult.insertId, smsId]
      );
    }

    // Auto-create income if money was received
    if (parsed.amount > 0 && parsed.type === 'received') {
      const [incomeResult] = await pool.query(
        `INSERT INTO income (user_id, amount, source, date, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.userId,
          parsed.amount,
          'Mobile Money',
          new Date().toISOString().split('T')[0],
          `Received from ${parsed.sender || 'Unknown'} via ${provider.toUpperCase()}`
        ]
      );

      await pool.query(
        'UPDATE sms_transactions SET linked_income_id = ?, is_processed = TRUE WHERE id = ?',
        [incomeResult.insertId, smsId]
      );
    }

    res.json({
      success: true,
      message: 'SMS parsed successfully',
      transaction: {
        id: smsId,
        provider,
        type: parsed.type,
        amount: parsed.amount,
        balance: parsed.balance,
        recipient: parsed.recipient,
        sender: parsed.sender,
        merchant: parsed.merchant,
        reference: parsed.reference,
        category: category
      },
      parsed: {
        provider,
        ...parsed,
        category: parsed.merchant ? categorizeTransaction(parsed.merchant, message) : null
      },
      smsId
    });
  } catch (error) {
    console.error('Parse SMS error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse SMS' });
  }
});

// Bulk parse SMS messages
router.post('/parse/bulk', [
  body('messages').isArray().withMessage('Messages must be an array'),
], async (req, res) => {
  try {
    const { messages } = req.body;
    const results = [];
    let successCount = 0;

    for (const msg of messages) {
      // Support both string and object format
      const smsText = typeof msg === 'string' ? msg : msg.message;
      const timestamp = typeof msg === 'object' ? msg.timestamp : null;
      
      if (!smsText || !smsText.trim()) continue;
      
      const provider = detectProvider(smsText);
      const parsed = parseSMS(smsText, provider);
      
      if (parsed.amount > 0) {
        try {
          const category = categorizeTransaction(parsed.merchant || parsed.sender || parsed.recipient || '', smsText);
          
          const [result] = await pool.query(
            `INSERT INTO sms_transactions 
             (user_id, raw_message, transaction_type, amount, balance_after, recipient, sender, merchant, reference, provider, transaction_date, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.userId,
              smsText,
              parsed.type,
              parsed.amount,
              parsed.balance,
              parsed.recipient,
              parsed.sender,
              parsed.merchant,
              parsed.reference,
              provider,
              timestamp ? new Date(timestamp) : new Date(),
              category
            ]
          );

          successCount++;
          results.push({
            ...parsed,
            provider,
            success: true
          });
        } catch (dbError) {
          console.error('DB insert error:', dbError.message);
        }
      }
    }

    res.json({ 
      success: true,
      message: `Processed ${successCount} SMS messages`,
      successCount,
      totalReceived: messages.length,
      results 
    });
  } catch (error) {
    console.error('Bulk parse error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse messages' });
  }
});

// Get SMS transactions
router.get('/transactions', async (req, res) => {
  try {
    const { provider, type, processed, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM sms_transactions WHERE user_id = ?';
    const params = [req.userId];

    if (provider) {
      query += ' AND provider = ?';
      params.push(provider);
    }

    if (type) {
      query += ' AND transaction_type = ?';
      params.push(type);
    }

    if (processed !== undefined) {
      query += ' AND is_processed = ?';
      params.push(processed === 'true');
    }

    query += ' ORDER BY transaction_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [transactions] = await pool.query(query, params);
    res.json({ transactions });
  } catch (error) {
    console.error('Get SMS transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Correct a transaction category
router.put('/transactions/:id/correct', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description } = req.body;

    // Get the SMS transaction
    const [smsTxns] = await pool.query(
      'SELECT * FROM sms_transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (smsTxns.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const sms = smsTxns[0];

    // Update linked expense if exists
    if (sms.linked_expense_id) {
      await pool.query(
        'UPDATE expenses SET category = ?, description = ? WHERE id = ?',
        [category, description || sms.merchant, sms.linked_expense_id]
      );
    }

    res.json({ message: 'Transaction corrected' });
  } catch (error) {
    console.error('Correct transaction error:', error);
    res.status(500).json({ error: 'Failed to correct transaction' });
  }
});

// Get mobile money accounts
router.get('/accounts', async (req, res) => {
  try {
    const [accounts] = await pool.query(
      'SELECT * FROM mobile_money_accounts WHERE user_id = ? ORDER BY is_primary DESC',
      [req.userId]
    );
    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Add mobile money account
router.post('/accounts', [
  body('provider').notEmpty().withMessage('Provider is required'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider, phone_number, account_name, is_primary } = req.body;

    // If setting as primary, unset others
    if (is_primary) {
      await pool.query(
        'UPDATE mobile_money_accounts SET is_primary = FALSE WHERE user_id = ?',
        [req.userId]
      );
    }

    await pool.query(
      `INSERT INTO mobile_money_accounts (user_id, provider, phone_number, account_name, is_primary)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE account_name = ?, is_primary = ?`,
      [req.userId, provider, phone_number, account_name || null, is_primary || false, account_name, is_primary]
    );

    const [accounts] = await pool.query(
      'SELECT * FROM mobile_money_accounts WHERE user_id = ?',
      [req.userId]
    );

    res.json({ message: 'Account added', accounts });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Get mobile money spending breakdown
router.get('/insights', async (req, res) => {
  try {
    // Get summary totals
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as transaction_count,
        SUM(CASE WHEN transaction_type IN ('payment', 'sent', 'withdrawal') THEN amount ELSE 0 END) as total_sent,
        SUM(CASE WHEN transaction_type = 'received' THEN amount ELSE 0 END) as total_received
      FROM sms_transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [req.userId]);

    const [byProvider] = await pool.query(`
      SELECT provider, 
        COUNT(*) as transaction_count,
        SUM(CASE WHEN transaction_type IN ('payment', 'sent', 'withdrawal') THEN amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN transaction_type = 'received' THEN amount ELSE 0 END) as total_received
      FROM sms_transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY provider
    `, [req.userId]);

    const [byType] = await pool.query(`
      SELECT transaction_type, COUNT(*) as count, SUM(amount) as total
      FROM sms_transactions
      WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY transaction_type
    `, [req.userId]);

    const [topMerchants] = await pool.query(`
      SELECT merchant, COUNT(*) as visits, SUM(amount) as total_spent
      FROM sms_transactions
      WHERE user_id = ? AND merchant IS NOT NULL AND merchant != '' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY merchant
      ORDER BY total_spent DESC
      LIMIT 10
    `, [req.userId]);

    // Return flat structure expected by frontend
    res.json({
      totalReceived: parseFloat(summary[0]?.total_received) || 0,
      totalSent: parseFloat(summary[0]?.total_sent) || 0,
      transactionCount: parseInt(summary[0]?.transaction_count) || 0,
      topMerchant: topMerchants.length > 0 ? topMerchants[0].merchant : 'N/A',
      byProvider,
      byType,
      topMerchants
    });
  } catch (error) {
    console.error('Get mobile money insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

module.exports = router;
