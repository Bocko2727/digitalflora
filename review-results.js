Promise.all([
  fetch('data/review-results.json'),
  fetch('data/review-batch-c189987.json')
])
  .then(async responses => {
    const [baseResponse, batchResponse] = responses;
    if (!baseResponse.ok) throw new Error(`Не може да се зареди review-results.json: ${baseResponse.status}`);
    if (!batchResponse.ok) throw new Error(`Не може да се зареди review-batch-c189987.json: ${batchResponse.status}`);

    const [baseData, batchData] = await Promise.all([baseResponse.json(), batchResponse.json()]);
    const baseRecords = Array.isArray(baseData) ? baseData : (baseData.items || baseData.results || []);
    const batchRecords = Array.isArray(batchData) ? batchData : (batchData.items || batchData.results || []);
    const records = [...baseRecords, ...batchRecords];

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Няма записи в наличните JSON файлове');
    }

    const text = value => Array.isArray(value) ? value.join('; ') : (value || '—');
    const fallback = 'Няма достатъчно научно потвърдени данни; записът е предварително разпознаване и изисква човешка ботаническа проверка.';

    records.forEach(x => {
      const image = x.file_name || x.filename || x.file;
      P.push([
        x.bulgarian_name || x.likely_common_name_bg || x.name || 'Неопределено растение',
        x.latin_name || x.likely_scientific_name || 'Неопределен таксон',
        x.family || 'Семейство неустановено',
        image ? [`images/review/${image}`] : [],
        x.review_status === 'approved_with_photo_identification' ? 'Потвърдено с висока вероятност' : 'Вероятно — предварително разпознаване',
        text(x.visible_traits || x.visible_features) || fallback,
        'Местообитанието и разпространението не са проверени за този предварителен запис.',
        text(x.possible_lookalikes) || 'Не са посочени; не използвай записа за сигурно определяне.',
        'Потенциалната екологична роля не е проверена за този предварителен запис.',
        text(x.safety_note) || 'Не консумирай и не използвай за самолечение или за храна на животни до сигурно определяне.',
        'Само за фотографско наблюдение до човешка ботаническа проверка.',
        text(x.additional_photos_needed) || 'За сигурно определяне са нужни допълнителни диагностични снимки.'
      ]);
    });

    menu();
    draw();
  })
  .catch(error => {
    console.error('Грешка при интегриране на предварителните записи:', error);
    document.body.insertAdjacentHTML('beforeend', `<p class="note"><b>Предварителните записи не са заредени:</b> ${error.message}</p>`);
  });
