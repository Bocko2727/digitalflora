fetch('data/review-results.json')
  .then(r => {
    if (!r.ok) throw new Error(`Не може да се зареди JSON: ${r.status}`);
    return r.json();
  })
  .then(d => {
    const a = d.results || d;

    if (!Array.isArray(a) || a.length === 0) {
      throw new Error('Няма записи в review-results.json');
    }

    document.body.insertAdjacentHTML('beforeend', `
      <section id="review-results">
        <h1>Предварителни автоматични разпознавания</h1>
        <p>Предварително автоматично разпознаване — изисква човешка ботаническа проверка.</p>
        ${a.map(x => `
          <article>
            <img src="images/review/${x.file_name || x.filename || x.file}" alt="${x.bulgarian_name || x.name || 'Растение'}">
            <h2>${x.bulgarian_name || x.name || 'Неопределено растение'}</h2>
            <i>${x.latin_name || '—'}</i>
            <p><b>Семейство:</b> ${x.family || '—'}</p>
            <p><b>Увереност:</b> ${x.confidence || '—'}</p>
            <p><b>Видими белези:</b> ${x.visible_traits || '—'}</p>
            <p><b>Възможни двойници:</b> ${x.possible_lookalikes || '—'}</p>
            <p><b>Нужни снимки:</b> ${x.additional_photos_needed || '—'}</p>
            <p><b>Безопасност:</b> ${x.safety_note || '—'}</p>
          </article>
        `).join('')}
      </section>
    `);
  })
  .catch(error => {
    console.error('Грешка при зареждане на review резултатите:', error);

    document.body.insertAdjacentHTML('beforeend', `
      <section id="review-results">
        <h1>Предварителни автоматични разпознавания</h1>
        <p>Резултатите не могат да се заредят: ${error.message}</p>
      </section>
    `);
  });
