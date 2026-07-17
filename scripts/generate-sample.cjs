const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const INPUT_DIR = path.join(__dirname, '../inputs');
if (!fs.existsSync(INPUT_DIR)) {
  fs.mkdirSync(INPUT_DIR, { recursive: true });
}

// 샘플 가상 데이터 생성
const sampleRawData = [
  { date: '2026-07-01', merchant: '스타벅스 강남점', amount: 12000, card: '1234' },
  { date: '2026-07-02', merchant: '배달의민족', amount: 35000, card: '9876' },
  { date: '2026-07-03', merchant: '카카오T 택시', amount: 8400, card: '1234' },
  { date: '2026-07-04', merchant: '쿠팡 파트너스', amount: 45000, card: '9876' },
  { date: '2026-07-05', merchant: '이마트 자양점', amount: 89000, card: '1234' },
  { date: '2026-07-06', merchant: '다이소 신촌점', amount: 5000, card: '1234' },
  { date: '2026-07-08', merchant: '넷플릭스 정기결제', amount: 17000, card: '9876' },
  { date: '2026-07-10', merchant: '김밥천국', amount: 14000, card: '9876' },
  { date: '2026-07-12', merchant: 'SKT 통신요금', amount: 55000, card: '1234' },
  { date: '2026-07-14', merchant: '올리브영 홍대점', amount: 23000, card: '9876' },
  { date: '2026-07-15', merchant: '야놀자 호텔예약', amount: 120000, card: '9876' },
  { date: '2026-07-16', merchant: '스타벅스 역삼점', amount: 6500, card: '1234' },
  { date: '2026-07-17', merchant: '배달의민족', amount: 28000, card: '9876' }
];

// Excel 워크북 생성
const wb = xlsx.utils.book_new();

// 데이터를 parser가 인식할 수 있는 한국어 헤더 포맷의 행(배열)로 변환
const sheetData = [
  ['거래일자', '가맹점명', '거래금액', '카드번호'] // 헤더 행
];

sampleRawData.forEach(item => {
  sheetData.push([item.date, item.merchant, item.amount, item.card]);
});

const ws = xlsx.utils.aoa_to_sheet(sheetData);
xlsx.utils.book_append_sheet(wb, ws, '지출내역');

const outputFilePath = path.join(INPUT_DIR, 'sample_card_expenses.xlsx');
xlsx.writeFile(wb, outputFilePath);

console.log(`[샘플 데이터 생성 완료]: ${outputFilePath}`);
