import base64
import json
import mimetypes
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / 'images' / 'review'
RESULTS = ROOT / 'data' / 'review-results.json'
API_KEY = os.environ.get('GEMINI_API_KEY')
MODEL = 'gemini-2.0-flash'
PROMPT = '''You are a cautious botanical image triage assistant. Analyze ONE image only. Do not infer unseen features. Return valid JSON only with these keys: file, likely_common_name_bg, likely_scientific_name, family, confidence (low|medium|high), visible_features, possible_lookalikes, additional_photos_needed, safety_note, review_status. Use Bulgarian for all descriptive strings. review_status must be needs_human_review. If the organism cannot be determined from the image, state that clearly and keep confidence low. Do not provide medical advice or claim an identification is certain.'''

def load_results():
    if RESULTS.exists():
        return json.loads(RESULTS.read_text(encoding='utf-8'))
    return {'schema_version': 1, 'items': []}

def analyze(path):
    mime = mimetypes.guess_type(path.name)[0] or 'image/jpeg'
    encoded = base64.b64encode(path.read_bytes()).decode('ascii')
    payload = {'contents': [{'parts': [{'text': PROMPT}, {'inline_data': {'mime_type': mime, 'data': encoded}}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.1}}
    request = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = json.loads(response.read().decode('utf-8'))
    text = raw['candidates'][0]['content']['parts'][0]['text']
    item = json.loads(re.sub(r'^```json\s*|\s*```$', '', text.strip()))
    item['file'] = path.name
    item['analyzed_at'] = datetime.now(timezone.utc).isoformat()
    item['review_status'] = 'needs_human_review'
    return item

def main():
    if not API_KEY:
        raise RuntimeError('Missing GEMINI_API_KEY repository secret.')
    data = load_results()
    existing = {item.get('file') for item in data.get('items', [])}
    files = [p for p in INBOX.glob('*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'} and p.name not in existing]
    for path in files:
        if path.stat().st_size > 18 * 1024 * 1024:
            data['items'].append({'file': path.name, 'review_status': 'needs_human_review', 'error': 'Файлът е по-голям от 18 MB; качи по-малко копие.', 'analyzed_at': datetime.now(timezone.utc).isoformat()})
            continue
        try:
            data['items'].append(analyze(path))
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
            data['items'].append({'file': path.name, 'review_status': 'needs_human_review', 'error': f'Автоматичният анализ не завърши: {exc}', 'analyzed_at': datetime.now(timezone.utc).isoformat()})
    RESULTS.parent.mkdir(parents=True, exist_ok=True)
    RESULTS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
