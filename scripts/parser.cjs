const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');

// 설정 파일 로드
const CONFIG_PATH = path.join(__dirname, '../config.json');
let config = { users: [], categories: {}, discordWebhookUrl: "" };
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

const INPUT_DIR = path.join(__dirname, '../inputs');
const PROCESSED_DIR = path.join(INPUT_DIR, 'processed');
const DATA_DIR = path.join(__dirname, '../data');

// 필요한 디렉토리 생성
[INPUT_DIR, PROCESSED_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 카테고리 자동 매핑 함수
function getCategory(merchant) {
  if (!merchant) return "기타";
  for (const [category, keywords] of Object.entries(config.categories)) {
    if (category === "기타") continue;
    if (keywords.some(keyword => merchant.includes(keyword))) {
      return category;
    }
  }
  return "기타";
}

// 인원 분류 함수
function getUser(paymentMethod, details = "") {
  for (const user of config.users) {
    // 카드 번호 매칭
    if (user.cards.some(card => paymentMethod.includes(card) || details.includes(card))) {
      return user.name;
    }
    // 계좌 번호 매칭
    if (user.accounts.some(acc => paymentMethod.includes(acc) || details.includes(acc))) {
      return user.name;
    }
  }
  return "미분류";
}

// 금액 파싱 (문자열에서 숫자만 추출)
function parseAmount(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// 날짜 정규화 (YYYY-MM-DD 형식으로 변환)
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.toString().replace(/[^0-9]/g, '');
  
  // YYYYMMDD
  if (str.length === 8) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
  }
  // YYMMDD (2000년대 가정)
  if (str.length === 6) {
    return `20${str.substring(0, 2)}-${str.substring(2, 4)}-${str.substring(4, 6)}`;
  }
  // MMDD (올해 연도 가정)
  if (str.length === 4) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${str.substring(0, 2)}-${str.substring(2, 4)}`;
  }
  return dateStr; // 정규화 불가 시 원본 반환
}

// Excel 파일 파싱
function parseExcel(filePath) {
  console.log(`[Excel 파싱 시작]: ${path.basename(filePath)}`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  const transactions = [];
  
  // 엑셀 헤더 행 찾기 및 데이터 파싱
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // 날짜, 금액, 사용처 등 유사 키워드가 있는 행을 헤더로 파악
    if (row.some(cell => cell && (cell.toString().includes('일자') || cell.toString().includes('날짜') || cell.toString().includes('일시')))) {
      headerIndex = i;
      break;
    }
  }

  // 못 찾으면 첫 행을 헤더로 임시 지정
  if (headerIndex === -1) headerIndex = 0;

  const headers = rows[headerIndex].map(h => (h || '').toString().trim());
  console.log(`[감지된 헤더]:`, headers);

  // 컬럼 인덱스 매핑
  const dateCol = headers.findIndex(h => h.includes('일자') || h.includes('날짜') || h.includes('일시'));
  const amountCol = headers.findIndex(h => h.includes('금액') || h.includes('출금') || h.includes('사용') || h.includes('거래금액'));
  const depositCol = headers.findIndex(h => h.includes('입금')); // 입출금 구분용
  const merchantCol = headers.findIndex(h => h.includes('가맹점') || h.includes('사용처') || h.includes('내역') || h.includes('거래처') || h.includes('적요'));
  const cardCol = headers.findIndex(h => h.includes('카드') || h.includes('계좌') || h.includes('구분'));

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const dateVal = row[dateCol];
    const normalizedDate = normalizeDate(dateVal);
    if (!normalizedDate || isNaN(Date.parse(normalizedDate))) continue;

    let amount = parseAmount(row[amountCol]);
    let type = '지출';
    
    // 입금(수입)이 있는 경우 처리
    if (depositCol !== -1 && row[depositCol]) {
      const depAmt = parseAmount(row[depositCol]);
      if (depAmt > 0) {
        amount = depAmt;
        type = '수입';
      }
    } else if (amount < 0) {
      amount = Math.abs(amount);
      type = '수입';
    }

    const merchant = (row[merchantCol] || '미지정').toString().trim();
    const paymentMethod = (row[cardCol] || path.basename(filePath)).toString().trim();
    
    transactions.push({
      date: normalizedDate,
      type,
      amount,
      merchant,
      paymentMethod,
      category: type === '지출' ? getCategory(merchant) : '수입',
      user: getUser(paymentMethod, merchant)
    });
  }

  return transactions;
}

// PDF 파일 파싱 (텍스트 정규식 기반)
async function parsePDF(filePath) {
  console.log(`[PDF 파싱 시작]: ${path.basename(filePath)}`);
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  
  const text = pdfData.text;
  const lines = text.split('\n');
  const transactions = [];
  const fileName = path.basename(filePath);

  const dateRegex = /(\d{4}[./-]\d{2}[./-]\d{2})|(\d{2}[./-]\d{2})/g;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const amountMatch = line.match(/(-?\d{1,3}(,\d{3})+)|(\d{4,9})/g);
    if (!amountMatch) continue;

    const rawDate = dateMatch[0];
    const normalizedDate = normalizeDate(rawDate);
    if (!normalizedDate) continue;

    const rawAmount = amountMatch[0];
    const amount = parseAmount(rawAmount);
    if (amount === 0) continue;

    let merchant = line
      .replace(rawDate, '')
      .replace(rawAmount, '')
      .replace(/원/g, '')
      .replace(/[\s\t]+/g, ' ')
      .trim();

    if (!merchant || merchant.length < 2) merchant = '가맹점 미확인';

    const type = amount < 0 ? '수입' : '지출';
    const absAmount = Math.abs(amount);

    transactions.push({
      date: normalizedDate,
      type,
      amount: absAmount,
      merchant,
      paymentMethod: fileName,
      category: type === '지출' ? getCategory(merchant) : '수입',
      user: getUser(fileName, line)
    });
  }

  console.log(`[PDF 파싱 완료]: ${transactions.length}건 감지됨`);
  return transactions;
}

// JSON 및 CSV 저장
function saveTransactions(transactions) {
  if (transactions.length === 0) {
    console.log('[저장할 거래 내역 없음]');
    return;
  }

  const groups = {};
  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!groups[month]) groups[month] = [];
    groups[month].push(t);
  });

  for (const [month, list] of Object.entries(groups)) {
    const monthDir = path.join(DATA_DIR, month);
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }

    const jsonPath = path.join(monthDir, 'transactions.json');
    const csvPath = path.join(monthDir, 'transactions.csv');

    let existingList = [];
    if (fs.existsSync(jsonPath)) {
      try {
        existingList = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      } catch (e) {
        console.error(`기존 JSON 로드 에러: ${e.message}`);
      }
    }

    const merged = [...existingList];
    list.forEach(newTx => {
      const isDuplicate = existingList.some(extTx => 
        extTx.date === newTx.date && 
        extTx.amount === newTx.amount && 
        extTx.merchant === newTx.merchant
      );
      if (!isDuplicate) {
        merged.push(newTx);
      }
    });

    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf-8');

    const csvHeaders = 'date,type,amount,merchant,paymentMethod,category,user\n';
    const csvRows = merged.map(t => 
      `"${t.date}","${t.type}",${t.amount},"${t.merchant.replace(/"/g, '""')}","${t.paymentMethod.replace(/"/g, '""')}","${t.category}","${t.user}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeaders + csvRows, 'utf-8');

    console.log(`[저장 완료]: ${month} 폴더에 ${merged.length}건 저장됨`);
  }
}

async function run() {
  const files = fs.readdirSync(INPUT_DIR);
  let allTransactions = [];

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const ext = path.extname(file).toLowerCase();
    try {
      if (ext === '.xlsx' || ext === '.xls') {
        const txs = parseExcel(filePath);
        allTransactions = allTransactions.concat(txs);
        fs.renameSync(filePath, path.join(PROCESSED_DIR, file));
      } else if (ext === '.pdf') {
        const txs = await parsePDF(filePath);
        allTransactions = allTransactions.concat(txs);
        fs.renameSync(filePath, path.join(PROCESSED_DIR, file));
      }
    } catch (err) {
      console.error(`[파일 처리 에러] ${file}: ${err.message}`);
    }
  }

  saveTransactions(allTransactions);
  console.log('[모든 파일 파싱 및 정리 완료]');
}

if (require.main === module) {
  run();
}

module.exports = { run, getCategory, getUser };
