// api/translate-all.js
// Vercel Serverless Function for multi-language translation
import Anthropic from '@anthropic-ai/sdk';

// 언어 정보
const languages = [
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
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const { text } = req.body;

    // 입력 검증
    if (!text) {
      return res.status(400).json({ 
        error: '텍스트를 입력해주세요.' 
      });
    }

    // Claude API 클라이언트 초기화
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `입력된 텍스트의 언어를 감지하고, 7개 언어로 번역하고, 각 번역의 발음을 한글로 표기해주세요.

중요한 규칙:
1. 먼저 입력 텍스트가 어떤 언어인지 감지하세요 (en, ja, vi, th, es, fr, it, ko 중 하나)
2. 번역(translation)할 때는 고유명사를 자연스럽게 번역하세요
3. **발음(pronunciation)은 모든 단어를 한글로 음차 표기하세요** - 고유명사도 포함!
   예: "Seoul Station" → "서울 스테이션"
   예: "Paris" → "파리" 또는 "빠리"
   예: "iPhone" → "아이폰"
4. 한글 발음은 실제 발음에 최대한 가깝게 표기하세요
5. JSON 형식으로만 답변하고, 다른 설명은 하지 마세요

입력 텍스트: ${text}

다음 형식의 JSON으로만 답변해주세요:
{
  "detectedLanguage": "감지된 언어 코드 (en, ja, vi, th, es, fr, it, ko 중 하나)",
  "translations": {
    "en": {
      "translation": "영어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "ja": {
      "translation": "일본어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "vi": {
      "translation": "베트남어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "th": {
      "translation": "태국어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "es": {
      "translation": "스페인어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "fr": {
      "translation": "프랑스어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "it": {
      "translation": "이탈리아어 번역",
      "pronunciation": "모든 단어를 한글로 음차 (고유명사 포함)"
    },
    "ko": {
      "translation": "한국어 번역",
      "pronunciation": "한글 발음"
    }
  }
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

    // JSON 파싱 (마크다운 코드 블록 제거)
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(responseText);

    // detectedLanguage 추출
    const detectedLanguage = parsed.detectedLanguage || 'en';
    const translations = parsed.translations || {};

    // 언어 정보와 결합
    const results = languages.map(lang => ({
      code: lang.code,
      name: lang.name,
      flag: lang.flag,
      translation: translations[lang.code]?.translation || '',
      pronunciation: translations[lang.code]?.pronunciation || ''
    }));

    // 성공 응답
    res.status(200).json({
      success: true,
      original: text,
      detectedLanguage: detectedLanguage,
      results: results
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