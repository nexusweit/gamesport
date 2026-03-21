export default async function handler(req, res) {
    // Получаем данные из URL (GET-запрос от партнерки)
    const { 
        status, 
        transaction_id, 
        stream, 
        payout, 
        payout_total, 
        payout_currency 
    } = req.query;

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        return res.status(500).send('Config error');
    }

    // Переменные для сборки сообщения
    let header = '';
    let paymentInfo = '';
    
    // Подстраховка: если валюта не пришла, ставим ₽
    const currency = payout_currency || '₽';

    // Формируем заголовок и инфу о выплате в зависимости от статуса
    switch (status) {
        case 'registration':
            header = `👤 <b>Регистрация</b> (UID: ${transaction_id})`;
            break;
            
        case 'first_buy':
            header = `🔥 <b>(first_buy) Активация</b> (UID: ${transaction_id})`;
            paymentInfo = `\nПолучено: ${payout} ${currency}`;
            break;
            
        case 'subscribe':
            header = `✅ <b>Новая подписка</b> № ${transaction_id}`;
            break;
            
        case 'unsubscribe':
            header = `❌ <b>Отписка</b> № ${transaction_id}`;
            break;
            
        case 'rebill':
            header = `💸 <b>ПРОФИТ</b> (UID: ${transaction_id})`;
            paymentInfo = `\nПолучено: ${payout} ${currency}`;
            break;
            
        case 'chargeback':
            header = `🔴 <b>Чарджбек</b> (UID: ${transaction_id})`;
            paymentInfo = `\nУдержано: ${payout} ${currency}`;
            break;
            
        case 'refund':
            header = `🟡 <b>Возврат</b> (UID: ${transaction_id})`;
            paymentInfo = `\nВозвращено: ${payout} ${currency}`;
            break;
            
        default:
            // Если придет какой-то неизвестный статус
            header = `⚠️ <b>Неизвестное событие: ${status}</b> (UID: ${transaction_id})`;
            if (payout && payout !== '0') {
                paymentInfo = `\nСумма: ${payout} ${currency}`;
            }
    }

    // Собираем итоговое сообщение
    const message = `${header}${paymentInfo}
Поток: ${stream || 'Не указан'}

Общая сводка по юзеру: ${payout_total || '0'} ${currency}`;

    try {
        // Отправка в Телеграм
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML' // Разрешает использовать <b> для жирного шрифта
            })
        });

        // Отвечаем партнерке, что всё успешно принято
        res.status(200).send('OK');
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).send('Error');
    }
}
