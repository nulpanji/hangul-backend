// api/convert.js
// Vercel Serverless Function

import Anthropic from '@anthropic-ai/sdk';

// 언어 이름 매핑
const languageNames = {
  english: '영어',
  spanish: '스페인어',
  french: '프랑스어',
  german: '독일어',
  italian: '이탈리아어',
  japanese: '일본어',
  vietnamese: '베트남어',
  thai: '태국어'
};

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
    const { text, language } = req.body;

    // 입력 검증
    if (!text || !language) {
      return res.status(400).json({ 
        error: '텍스트와 언어를 모두 입력해주세요.' 
      });
    }

    if (!languageNames[language]) {
      return res.status(400).json({ 
        error: '지원하지 않는 언어입니다.' 
      });
    }

    // Claude API 클라이언트 초기화
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `다음 ${languageNames[language]} 문장의 발음을 한글로 정확하게 표기해주세요. 

중요한 규칙:
1. 고유명사(나라명, 지명, 인명, 회사명 등)는 한국에서 통용되는 표기를 우선 사용하세요
   예: Korea → 코리안, Korean → 코리안
   예: China → 차이나
   예: America → 아메리카
2. 일반 단어는 원어민 발음을 한글로 표기하세요
3. 구두점(쉼표, 물음표 등)도 그대로 유지하세요
4. 설명 없이 한글 발음만 답변해주세요

${languageNames[language]}: ${text}
한글 발음:`
        }
      ]
    });

    // 응답 추출
    const hangul = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim();

    // 성공 응답
    res.status(200).json({
      success: true,
      original: text,
      hangul: hangul,
      language: language
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