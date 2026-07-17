const fs = require('fs');
const path = require('path');
const https = require('https');

// 설정 파일 로드
const CONFIG_PATH = path.join(__dirname, '../config.json');
let config = { users: [], categories: {}, discordWebhookUrl: "" };
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

const DATA_DIR = path.join(__dirname, '../data');

// 지난주의 날짜 범위 계산 (월요일 ~ 일요일)
function getPreviousWeekRange() {
  const today = new Date();
  const day = today.getDay(); // 0: 일요일, 1: 월요일, ...
  
  // 지난주 일요일 계산
  const prevSunday = new Date(today);
  prevSunday.setDate(today.getDate() - day);
  prevSunday.setHours(23, 59, 59, 999);

  // 지난주 월요일 계산
  const prevMonday = new Date(prevSunday);
  prevMonday.setDate(prevSunday.getDate() - 6);
  prevMonday.setHours(0, 0, 0, 0);

  return {
    start: prevMonday,
    end: prevSunday
  };
}

// YYYY-MM-DD 날짜 파싱
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 세 자릿수 콤마 포맷팅
function formatKRW(val) {
  return val.toLocaleString('ko-KR') + '원';
}

// Discord Webhook 전송 함수
function sendDiscordMessage(payload) {
  return new Promise((resolve, reject) => {
    if (!config.discordWebhookUrl || config.discordWebhookUrl.includes('YOUR_DISCORD_WEBHOOK_URL')) {
      console.warn('[경고]: 디스코드 웹훅 URL이 올바르게 설정되지 않았습니다. config.json을 확인하세요.');
      return resolve(false);
    }

    const url = new URL(config.discordWebhookUrl);
    const dataStr = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[디스코드 웹훅]: 전송 성공');
          resolve(true);
        } else {
          console.error(`[디스코드 웹훅 에러]: 상태 코드 ${res.statusCode}, 응답: ${responseBody}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[디스코드 웹훅 네트워크 에러]:', err);
      reject(err);
    });

    req.write(dataStr);
    req.end();
  });
}

// 지난주 데이터 읽고 통계 내기
async function run() {
  const { start, end } = getPreviousWeekRange();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  console.log(`[주간 통계 집계]: ${startStr} ~ ${endStr}`);

  // 데이터 폴더 뒤지기
  const monthsToLoad = [
    start.toISOString().substring(0, 7),
    end.toISOString().substring(0, 7)
  ];
  const uniqueMonths = [...new Set(monthsToLoad)];
  let weekTransactions = [];

  uniqueMonths.forEach(month => {
    const jsonPath = path.join(DATA_DIR, month, 'transactions.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const txs = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const filtered = txs.filter(t => {
          const tDate = parseLocalDate(t.date);
          return tDate >= start && tDate <= end;
        });
        weekTransactions = weekTransactions.concat(filtered);
      } catch (e) {
        console.error(`데이터 로드 실패 (${month}):`, e.message);
      }
    }
  });

  if (weekTransactions.length === 0) {
    console.log('[주간 통계]: 지난주 지출 내역이 없습니다.');
    await sendDiscordMessage({
      embeds: [{
        title: "📊 주간 가계부 통계",
        description: `기간: \`${startStr} ~ ${endStr}\`\n\n지난주 등록된 가계부 지출 내역이 없습니다. 원본 파일을 inputs 폴더에 넣고 파서를 실행해 주세요.`,
        color: 3447003
      }]
    });
    return;
  }

  const expenseTxs = weekTransactions.filter(t => t.type === '지출');

  let totalExpense = 0;
  const userExpenses = {};
  const categoryExpenses = {};
  let maxExpense = null;

  config.users.forEach(u => userExpenses[u.name] = 0);
  userExpenses['미분류'] = 0;

  expenseTxs.forEach(t => {
    totalExpense += t.amount;
    
    const uName = t.user || '미분류';
    if (userExpenses[uName] === undefined) userExpenses[uName] = 0;
    userExpenses[uName] += t.amount;

    const cat = t.category || '기타';
    if (!categoryExpenses[cat]) categoryExpenses[cat] = 0;
    categoryExpenses[cat] += t.amount;

    if (!maxExpense || t.amount > maxExpense.amount) {
      maxExpense = t;
    }
  });

  const sortedCategories = Object.entries(categoryExpenses)
    .sort((a, b) => b[1] - a[1]);

  // 유저 지출 분석 텍스트 구성
  let userRatioText = "";
  const totalUserExpense = Object.values(userExpenses).reduce((a, b) => a + b, 0);
  if (totalUserExpense > 0) {
    userRatioText = Object.entries(userExpenses)
      .map(([name, amt]) => {
        const pct = ((amt / totalUserExpense) * 100).toFixed(1);
        const displayName = name === '정민규' ? '정민규 🧑🏻' : name === '이지원' ? '이지원 👩🏻' : name;
        return `**${displayName}**: ${formatKRW(amt)} (${pct}%)`;
      }).join('\n');
  } else {
    userRatioText = "지출 없음";
  }

  // 카테고리 순위 텍스트 구성
  const categoryRankText = sortedCategories.length > 0 
    ? sortedCategories.map(([cat, amt], idx) => `${idx + 1}위. **${cat}**: ${formatKRW(amt)}`).join('\n')
    : "지출 없음";

  // 최대 지출 텍스트
  const displayMaxUser = maxExpense ? (maxExpense.user === '정민규' ? '정민규 🧑🏻' : maxExpense.user === '이지원' ? '이지원 👩🏻' : maxExpense.user) : '없음';
  const maxExpenseText = maxExpense 
    ? `**${maxExpense.merchant}** (${maxExpense.category}) : ${formatKRW(maxExpense.amount)} [${displayMaxUser}]`
    : "없음";

  const embed = {
    title: "📊 주간 가계부 요약 보고서",
    description: `📅 분석 기간: \`${startStr} ~ ${endStr}\``,
    color: 5814783,
    fields: [
      {
        name: "💰 총 지출",
        value: `### **${formatKRW(totalExpense)}**`,
        inline: false
      },
      {
        name: "👥 인원별 지출",
        value: userRatioText,
        inline: true
      },
      {
        name: "🏷️ 주요 소비 분야 (Top 3)",
        value: categoryRankText.split('\n').slice(0, 3).join('\n') || "없음",
        inline: true
      },
      {
        name: "🚨 최고 지출 건",
        value: maxExpenseText,
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "2인 가계부 자동 분석 시스템"
    }
  };

  await sendDiscordMessage({ embeds: [embed] });
}

if (require.main === module) {
  run();
}

module.exports = { run };
