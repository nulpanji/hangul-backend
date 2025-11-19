// api/translate-all.js
// 영어를 9개 언어로 번역 + 한글 발음 변환

import Anthropic from '@anthropic-ai/sdk';

const TARGET_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
];

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: '텍스트를 입력해주세요.' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Claude에게 한 번에 9개 언어로 번역 + 한글 발음 요청
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `다음 영어 문장을 8개 언어로 번역하고, 각 번역의 발음을 한글로 표기해주세요.

언어 순서:
1. English (원문 그대로)
2. Japanese (일본어)
3. Vietnamese (베트남어)
4. Thai (태국어)
5. Spanish (스페인어)
6. French (프랑스어)
7. Italian (이탈리아어)
8. Korean (한국어)

중요한 규칙:
- 국제적으로 알려진 고유명사(도시명, 브랜드명, 유명인 등)는 원어 그대로 유지하고 번역하지 마세요
  예: Seoul, Tokyo, Paris, BMW, Apple, BTS, iPhone 등
- 일반 문장/표현만 각 언어로 번역하세요
- 고유명사의 한글 발음은 모든 언어에서 동일하게 표기하세요
- 각 언어의 원어민 발음을 한글로 정확히 표기하세요
- JSON 형식으로만 답변 (설명 없이)

영어: ${text}

다음 JSON 형식으로만 답변해주세요:
{
  "translations": [
    {"language": "English", "text": "원문", "hangul": "한글발음"},
    {"language": "Japanese", "text": "번역", "hangul": "한글발음"},
    {"language": "Vietnamese", "text": "번역", "hangul": "한글발음"},
    {"language": "Thai", "text": "번역", "hangul": "한글발음"},
    {"language": "Spanish", "text": "번역", "hangul": "한글발음"},
    {"language": "French", "text": "번역", "hangul": "한글발음"},
    {"language": "German", "text": "번역", "hangul": "한글발음"},
    {"language": "Italian", "text": "번역", "hangul": "한글발음"},
    {"language": "Korean", "text": "번역", "hangul": "실제 한국어"}
  ]
}`
        }
      ]
    });

    // 응답 추출
    let responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim();

    // JSON 파싱 (```json ``` 제거)
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const result = JSON.parse(responseText);

    res.status(200).json({
      success: true,
      original: text,
      translations: result.translations
    });

  } catch (error) {
    console.error('API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI 변환 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}