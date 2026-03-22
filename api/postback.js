export default async function handler(req, res) {
    // Поддержка GET и POST
    const data = req.method === 'POST' ? req.body : req.query;

    const { 
        status, 
        transaction_id, 
        stream, 
        payout, 
        payout_total, 
        payout_currency 
    } = data;

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        return res.status(500).send('Config error');
    }

    // --- Обработка валюты ---
    // Если пусто, по умолчанию ставим rub. Переводим в нижний регистр для проверки.
    let rawCurrency = (payout_currency || 'rub').toLowerCase();
    // Заменяем rub на ₽, остальные валюты делаем заглавными (например, usd -> USD)
    let currency = rawCurrency === 'rub' ? '₽' : rawCurrency.toUpperCase();

    // --- Переменные для сборки сообщения ---
    let header = '';
    let paymentLine = ''; // Дополнительная строка, если есть оплата

    // --- Настройка английских заголовков под каждый статус ---
    switch (status) {
        case 'registration':
            header = '👤 <b>New Registration</b>';
            break;
            
        case 'first_buy':
            header = '🔥 <b>First Purchase</b>';
            paymentLine = `├Received: <b>${payout} ${currency}</b>\n`;
            break;
            
        case 'subscribe':
            header = '✅ <b>New Subscription</b>';
            break;
            
        case 'unsubscribe':
            header = '❌ <b>Unsubscribed</b>';
            break;
            
        case 'rebill':
            header = '💸 <b>Successfully paid</b>';
            paymentLine = `├Received: <b>${payout} ${currency}</b>\n`;
            break;
            
        case 'chargeback':
            header = '🔴 <b>Chargeback</b>';
            paymentLine = `├Lost: <b>${payout} ${currency}</b>\n`;
            break;
            
        case 'refund':
            header = '🟡 <b>Refunded</b>';
            paymentLine = `├Returned: <b>${payout} ${currency}</b>\n`;
            break;
            
        default:
            header = `⚠️ <b>Unknown Event (${status})</b>`;
            if (payout && payout !== '0') {
                paymentLine = `├Amount: <b>${payout} ${currency}</b>\n`;
            }
    }

    // --- Сборка итогового сообщения ---
    // ВАЖНО: переносы строк здесь влияют на то, как текст выглядит в ТГ
    const message = `${header}
Details:
├User: <b>${transaction_id || 'Unknown'}</b>
${paymentLine}╰Stream: <b>${stream || 'None'}</b>

General summary: <b>${payout_total || '0'} ${currency}</b>`;

    // --- Отправка в Телеграм ---
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        res.status(200).send('OK');
    } catch (error) {
        console.error('Ошибка отправки:', error);
        res.status(500).send('Error');
    }
}
