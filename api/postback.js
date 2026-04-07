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
    let rawCurrency = (payout_currency || 'rub').toLowerCase();
    let currency = rawCurrency === 'rub' ? '₽' : rawCurrency.toUpperCase();

    // Переменные для сообщения, кнопок и фото
    let message = '';
    let reply_markup = undefined;
    let photoUrl = undefined; // Переменная для хранения URL картинки

    // --- Настройка текстов, кнопок и фото под каждый статус ---
    switch (status) {
        case 'registration':
            photoUrl = 'https://i.postimg.cc/NGpT24qb/image.png'; // Фото для регистрации
            message = 
`<tg-emoji emoji-id="5999276388534719489">💚</tg-emoji> <b>New reg</b>\n
<tg-emoji emoji-id="5251307370079862951">👱‍♀️</tg-emoji> User ID: <b>${transaction_id || 'Unknown'}</b>
<tg-emoji emoji-id="5251508172685853796">✈️</tg-emoji> Stream: <b>${stream || 'None'}</b>`;
            
            // Добавляем цветную кнопку с кастомным эмодзи
            if (transaction_id) {
                reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: "View", 
                                url: `https://gamesport.partners/cabinet/users/${transaction_id}`,
                                icon_custom_emoji_id: "5251736458787572173",
                                style: "success"
                            }
                        ]
                    ]
                };
            }
            break;
            
        case 'first_buy':
        case 'subscribe':
            photoUrl = 'https://i.postimg.cc/DZ5gZ3P4/image.png'; // Фото для активации
            message = 
`<tg-emoji emoji-id="5251577880005068514">✅</tg-emoji> <b>Purchase</b>\n
<tg-emoji emoji-id="5251755597161842024">✈️</tg-emoji> ID: <b>${transaction_id || 'Unknown'}</b>
<tg-emoji emoji-id="5251508172685853796">✈️</tg-emoji> Stream: <b>${stream || 'None'}</b>`;
            break;
            
        case 'rebill':
            photoUrl = 'https://i.postimg.cc/SNcrPPnP/Tom-and-Jerry-Money-Wallpaper-Pc.jpg'; // Фото для оплаты
            message = 
`<tg-emoji emoji-id="5251348640420623380">💵</tg-emoji> <b>Successfully paid</b>\n
<tg-emoji emoji-id="5251492916962018172">💳</tg-emoji> ID: <b>${transaction_id || 'Unknown'}</b>
<tg-emoji emoji-id="5253681344533249693">💵</tg-emoji> Received: <b>${payout || '0'} ${currency}</b>
<tg-emoji emoji-id="5251508172685853796">✈️</tg-emoji> Stream: <b>${stream || 'None'}</b>\n
<tg-emoji emoji-id="5251480109369542639">💰</tg-emoji> General summary: <b>${payout_total || '0'} ${currency}</b>`;
            break;

        case 'unsubscribe':
            message = 
`<tg-emoji emoji-id="5271934564699226262">❌</tg-emoji> <b>Отписка</b>\n
<tg-emoji emoji-id="5251307370079862951">👱‍♀️</tg-emoji> User ID: <b>${transaction_id || 'Unknown'}</b>
<tg-emoji emoji-id="5251508172685853796">✈️</tg-emoji> Stream: <b>${stream || 'None'}</b>\n
<tg-emoji emoji-id="5377620300965888937">🔴</tg-emoji> Всего получено с юзера: <b>${payout_total || '0'} ${currency}</b>`;
            break;
            
        case 'chargeback':
            message = 
`🔴 <b>Chargeback</b>\n
👤 User: <b>${transaction_id || 'Unknown'}</b>
📉 Lost: <b>${payout || '0'} ${currency}</b>
✈️ Stream: <b>${stream || 'None'}</b>`;
            break;
            
        case 'refund':
            message = 
`🟡 <b>Refunded</b>\n
👤 User: <b>${transaction_id || 'Unknown'}</b>
↩️ Returned: <b>${payout || '0'} ${currency}</b>
✈️ Stream: <b>${stream || 'None'}</b>`;
            break;
            
        default:
            message = 
`⚠️ <b>Unknown Event (${status})</b>\n
🆔 ID: <b>${transaction_id || 'Unknown'}</b>
${payout && payout !== '0' ? `💰 Amount: <b>${payout} ${currency}</b>\n` : ''}✈️ Stream: <b>${stream || 'None'}</b>`;
            break;
    }

    // --- Формируем тело запроса ---
    const payload = {
        chat_id: CHAT_ID,
        parse_mode: 'HTML'
    };

    // Определяем метод (отправка фото или обычного текста)
    let apiMethod = 'sendMessage';

    if (photoUrl) {
        apiMethod = 'sendPhoto';
        payload.photo = photoUrl; // Передаем ссылку на фото
        payload.caption = message; // Текст становится "подписью" к фото
    } else {
        payload.text = message; // Если фото нет, отправляем как обычный текст
    }

    // Прикрепляем клавиатуру, если она есть
    if (reply_markup) {
        payload.reply_markup = reply_markup;
    }

    // --- Отправка в Телеграм ---
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${apiMethod}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        res.status(200).send('OK');
    } catch (error) {
        console.error('Ошибка отправки:', error);
        res.status(500).send('Error');
    }
}