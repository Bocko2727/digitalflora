const reviewSources = [
  'data/review-results.json',
  'data/review-batch-c189987.json'
];

const reviewText = value => Array.isArray(value) ? value.join('; ') : (value || '—');
const reviewFallback = 'Няма достатъчно научно потвърдени данни; записът е предварително разпознаване и изисква човешка ботаническа проверка.';

function reviewRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function reviewFile(record) {
  return record.file_name || record.filename || record.file || record.source || '';
}

function addReviewRecord(record) {
  const image = reviewFile(record);
  if (!image) return;

  const latin = record.latin_name || record.likely_scientific_name || record.scientificName || 'Неопределен таксон';
  const bg = record.bulgarian_name || record.likely_common_name_bg || record.commonNameBg || record.name || 'Неопределено растение';
  const features = reviewText(record.visible_traits || record.visible_features || record.notes) || reviewFallback;

  P.push([
    bg,
    latin,
    record.family || 'Семейство неустановено',
    [image],
    `Предварително определяне • увереност: ${typeof record.confidence === 'number' ? Math.round(record.confidence * 100) + '%' : 'непосочена'}`,
    features,
    'Местообитанието и разпространението не са проверени за този предварителен запис.',
    reviewText(record.possible_lookalikes) || 'Не са посочени; не използвай записа за сигурно определяне.',
    'Потенциалната екологична роля не е проверена за този предварителен запис.',
    reviewText(record.safety_note) || 'Не консумирай и не използвай за самолечение или за храна на животни до сигурно определяне.',
    'Само за фотографско наблюдение до човешка ботаническа проверка.',
    reviewText(record.additional_photos_needed) || 'За сигурно определяне са нужни допълнителни диагностични снимки.'
  ]);
}

Promise.allSettled(
  reviewSources.map(async url => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return reviewRecords(await response.json());
  })
)
  .then(results => {
    const byFile = new Map();
    const errors = [];

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(record => {
          const image = reviewFile(record);
          if (image) byFile.set(image, record);
        });
      } else {
        errors.push(result.reason?.message || 'неизвестна грешка');
      }
    });

    byFile.forEach(addReviewRecord);

    if (typeof menu === 'function') menu();
    if (typeof draw === 'function') draw();

    if (errors.length) {
      console.warn('Част от review данните не са заредени:', errors);
    }
  })
  .catch(error => {
    console.error('Грешка при интегриране на review записите:', error);
  });
