// ============================================
// PDF SERVICE - Генерация PDF-документов
// ============================================
import PDFDocument from 'pdfkit';

/**
 * Генерация PDF-сметы (КП)
 * @param {Object} quote - Данные сметы
 * @param {Array} items - Позиции сметы
 * @param {Object} task - Данные задачи/заказа
 * @param {Object} companyInfo - Информация о компании
 * @returns {Buffer} PDF файл как Buffer
 */
export const generateQuotePDF = (quote, items, task, companyInfo = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            
            doc.on('data', buffer => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            
            // === ШАПКА ===
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text('КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', 50, 50, { align: 'center' });
            
            doc.moveDown(0.5);
            
            // Номер и дата
            doc.fontSize(12)
               .font('Helvetica')
               .text(`№ ${quote.quote_number}`, { align: 'center' })
               .text(`от ${new Date(quote.created_at).toLocaleDateString('ru-RU')}`, { align: 'center' });
            
            doc.moveDown(1);
            
            // Линия-разделитель
            doc.moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke();
            
            doc.moveDown(1);
            
            // === ИНФОРМАЦИЯ О КОМПАНИИ ===
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('ИСПОЛНИТЕЛЬ:', 50, doc.y);
            
            doc.fontSize(11)
               .font('Helvetica')
               .text('Ателье "Бригада"', { continued: true })
               .text('г. Алматы, Толе би 123', { indent: 20 })
               .text('Тел: +7 (727) 333-44-55', { indent: 20 })
               .text('Email: info@brigada.kz', { indent: 20 });
            
            doc.moveDown(1);
            
            // === ИНФОРМАЦИЯ О КЛИЕНТЕ ===
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('ЗАКАЗЧИК:', 50, doc.y);
            
            doc.fontSize(11)
               .font('Helvetica')
               .text(task?.client_name || 'Не указано')
               .text(`Тел: ${task?.client_phone || 'Не указано'}`)
               .text(`Адрес: ${task?.client_address || 'Не указано'}`);
            
            doc.moveDown(1.5);
            
            // === ТАБЛИЦА ПОЗИЦИЙ ===
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('СОСТАВ РАБОТ И МАТЕРИАЛОВ:', 50, doc.y);
            
            doc.moveDown(0.5);
            
            // Заголовки таблицы
            const tableTop = doc.y;
            const colWidths = [30, 220, 60, 80, 80, 80];
            const colPositions = [50];
            for (let i = 1; i < colWidths.length; i++) {
                colPositions.push(colPositions[i-1] + colWidths[i-1]);
            }
            
            // Фон заголовка
            doc.rect(50, tableTop - 5, 550, 25)
               .fill('#f0f0f0');
            
            doc.fillColor('#000')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('№', colPositions[0], tableTop)
               .text('Наименование', colPositions[1], tableTop)
               .text('Кол-во', colPositions[2], tableTop)
               .text('Ед.изм', colPositions[3], tableTop)
               .text('Цена', colPositions[4], tableTop)
               .text('Сумма', colPositions[5], tableTop);
            
            let currentY = tableTop + 25;
            
            // Строки таблицы
            items.forEach((item, index) => {
                // Проверяем, не выходит ли за пределы страницы
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
                
                const unit = item.item_type === 'fabric' ? 'м' : 
                            item.item_type === 'cornice' ? 'шт' : 'усл.';
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .text(`${index + 1}`, colPositions[0], currentY)
                   .text(item.description || 'Позиция', colPositions[1], currentY, { width: colWidths[1] - 10 })
                   .text(item.quantity.toString(), colPositions[2], currentY)
                   .text(unit, colPositions[3], currentY)
                   .text(formatMoney(item.unit_price), colPositions[4], currentY)
                   .text(formatMoney(item.total_price), colPositions[5], currentY);
                
                currentY += 20;
            });
            
            // Линия под таблицей
            doc.moveTo(50, currentY)
               .lineTo(550, currentY)
               .stroke();
            
            currentY += 20;
            
            // === ИТОГИ ===
            doc.fontSize(11)
               .font('Helvetica')
               .text(`Ткани: ${formatMoney(quote.fabrics_total || 0)}`, 350, currentY, { align: 'right' });
            
            currentY += 18;
            doc.text(`Карнизы и фурнитура: ${formatMoney(quote.cornices_total || 0)}`, 350, currentY, { align: 'right' });
            
            currentY += 18;
            doc.text(`Работы и услуги: ${formatMoney(quote.services_total || 0)}`, 350, currentY, { align: 'right' });
            
            currentY += 25;
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text(`ИТОГО: ${formatMoney(quote.total_amount)}`, 350, currentY, { align: 'right' });
            
            currentY += 40;
            
            // === УСЛОВИЯ ===
            if (currentY > 600) {
                doc.addPage();
                currentY = 50;
            }
            
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('УСЛОВИЯ:', 50, currentY);
            
            currentY += 20;
            
            doc.fontSize(10)
               .font('Helvetica')
               .text(`• Срок изготовления: ${quote.estimated_days || '___'} рабочих дней`)
               .text(`• Предоплата: 50% (${formatMoney(quote.total_amount * 0.5)})`)
               .text(`• Окончательный расчет: по готовности`)
               .text(`• Доставка и установка: по договоренности`)
               .text(`• Срок действия КП: до ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ru-RU') : '___'}`);
            
            currentY = doc.y + 30;
            
            // === ПОДПИСИ ===
            if (currentY > 650) {
                doc.addPage();
                currentY = 50;
            }
            
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text('ПРЕДЛОЖЕНИЕ ПОДГОТОВИЛ:', 50, currentY)
               .text('С МЕТОДОЛОГИЕЙ И СТОИМОСТЬЮ СОГЛАСЕН:', 300, currentY);
            
            currentY += 30;
            
            doc.fontSize(10)
               .font('Helvetica')
               .text('_______________ / _______________', 50, currentY)
               .text('_______________ / _______________', 300, currentY);
            
            currentY += 15;
            
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .text('(подпись дизайнера)', 50, currentY)
               .text('(подпись клиента)', 300, currentY);
            
            // Футер
            doc.fontSize(8)
               .font('Helvetica')
               .text(`Документ сгенерирован: ${new Date().toLocaleString('ru-RU')}`, 50, 780, { align: 'center' })
               .text('Ателье "Бригада" - Пошив штор премиум-класса', 50, 795, { align: 'center' });
            
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Форматирование денежных сумм
 */
function formatMoney(amount) {
    if (!amount || isNaN(amount)) return '0 ₸';
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export default { generateQuotePDF };
