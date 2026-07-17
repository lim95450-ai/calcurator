import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Upload, Send, TrendingUp, User, DollarSign, 
  PieChart as PieIcon, Calendar, ArrowUpRight, Plus, 
  Settings, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ACTUAL_WEBHOOK_URL = 'https://discord.com/api/webhooks/1519264793318653983/IhOnmAyYuQxJkssKEaqbj3lpA7lo65i2NdSHmb-okp_qXhRNLmxAkjfqoH5J-tpEGOO5';

// 3달치 트렌드 데이터 (정민규, 이지원으로 유저명 수정)
const DEFAULT_DATA = [
  // 5월 데이터
  { date: '2026-05-02', type: '지출', amount: 8500, merchant: '스타벅스', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-05-05', type: '지출', amount: 48000, merchant: '이마트', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-05-10', type: '지출', amount: 15000, merchant: '택시', paymentMethod: '9876', category: '교통/차량', user: '이지원' },
  { date: '2026-05-15', type: '지출', amount: 62000, merchant: '쿠팡 쇼핑', paymentMethod: '9876', category: '쇼핑/생활', user: '이지원' },
  { date: '2026-05-20', type: '지출', amount: 55000, merchant: 'SKT 통신비', paymentMethod: '1234', category: '주거/통신', user: '정민규' },
  { date: '2026-05-25', type: '지출', amount: 120000, merchant: '정기 주유', paymentMethod: '9876', category: '교통/차량', user: '이지원' },
  // 6월 데이터
  { date: '2026-06-01', type: '지출', amount: 14000, merchant: '맥도날드', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-06-03', type: '지출', amount: 35000, merchant: '배달의민족', paymentMethod: '9876', category: '식비', user: '이지원' },
  { date: '2026-06-08', type: '지출', amount: 23000, merchant: '올리브영', paymentMethod: '9876', category: '쇼핑/생활', user: '이지원' },
  { date: '2026-06-12', type: '지출', amount: 12000, merchant: '지하철 교통카드', paymentMethod: '1234', category: '교통/차량', user: '정민규' },
  { date: '2026-06-18', type: '지출', amount: 150000, merchant: '주말 펜션 여행', paymentMethod: '9876', category: '문화/여가', user: '이지원' },
  { date: '2026-06-22', type: '지출', amount: 48000, merchant: '동네 마트 장보기', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-06-28', type: '지출', amount: 17000, merchant: '넷플릭스', paymentMethod: '9876', category: '문화/여가', user: '이지원' },
  // 7월 데이터
  { date: '2026-07-01', type: '지출', amount: 12000, merchant: '스타벅스 강남점', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-07-02', type: '지출', amount: 35000, merchant: '배달의민족', paymentMethod: '9876', category: '식비', user: '이지원' },
  { date: '2026-07-03', type: '지출', amount: 8400, merchant: '카카오T 택시', paymentMethod: '1234', category: '교통/차량', user: '정민규' },
  { date: '2026-07-04', type: '지출', amount: 45000, merchant: '쿠팡 파트너스', paymentMethod: '9876', category: '쇼핑/생활', user: '이지원' },
  { date: '2026-07-05', type: '지출', amount: 89000, merchant: '이마트 자양점', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-07-06', type: '지출', amount: 5000, merchant: '다이소 신촌점', paymentMethod: '1234', category: '쇼핑/생활', user: '정민규' },
  { date: '2026-07-08', type: '지출', amount: 17000, merchant: '넷플릭스 정기결제', paymentMethod: '9876', category: '문화/여가', user: '이지원' },
  { date: '2026-07-10', type: '지출', amount: 14000, merchant: '김밥천국', paymentMethod: '9876', category: '식비', user: '이지원' },
  { date: '2026-07-12', type: '지출', amount: 55000, merchant: 'SKT 통신요금', paymentMethod: '1234', category: '주거/통신', user: '정민규' },
  { date: '2026-07-14', type: '지출', amount: 23000, merchant: '올리브영 홍대점', paymentMethod: '9876', category: '쇼핑/생활', user: '이지원' },
  { date: '2026-07-15', type: '지출', amount: 120000, merchant: '야놀자 호텔예약', paymentMethod: '9876', category: '문화/여가', user: '이지원' },
  { date: '2026-07-16', type: '지출', amount: 6500, merchant: '스타벅스 역삼점', paymentMethod: '1234', category: '식비', user: '정민규' },
  { date: '2026-07-17', type: '지출', amount: 28000, merchant: '배달의민족', paymentMethod: '9876', category: '식비', user: '이지원' }
];

// Claude UI용 코랄 및 세련된 차콜, 미색 컬러
const CHART_COLORS = ['#cc785c', '#181715', '#8e8b82', '#efe9de', '#5db8a6', '#e8a55a'];

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : DEFAULT_DATA;
  });

  const [discordUrl, setDiscordUrl] = useState(() => {
    return localStorage.getItem('discordWebhook') || ACTUAL_WEBHOOK_URL;
  });

  const [activeTimeSeries, setActiveTimeSeries] = useState('month');
  const [filterUser, setFilterUser] = useState('전체');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [showConfig, setShowConfig] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState({ text: '', type: '' });

  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '지출',
    amount: '',
    merchant: '',
    category: '식비',
    user: '정민규',
    paymentMethod: '직접 입력'
  });

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const showToast = (text, type = 'success') => {
    setNotifyMsg({ text, type });
    setTimeout(() => setNotifyMsg({ text: '', type: '' }), 4000);
  };

  const expenses = transactions.filter(t => t.type === '지출');
  const totalExpenseSum = expenses.reduce((sum, t) => sum + t.amount, 0);

  const userStats = expenses.reduce((acc, t) => {
    const u = t.user || '미분류';
    acc[u] = (acc[u] || 0) + t.amount;
    return acc;
  }, {});

  const categoryStats = expenses.reduce((acc, t) => {
    const c = t.category || '기타';
    acc[c] = (acc[c] || 0) + t.amount;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

  const getTimeSeriesData = () => {
    if (activeTimeSeries === 'week') {
      const weekGroups = {};
      expenses.forEach(t => {
        const d = new Date(t.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = d.getDate();
        const weekNum = Math.ceil(date / 7);
        const key = `${year}-${month} ${weekNum}주`;
        
        if (!weekGroups[key]) weekGroups[key] = { name: key, total: 0, 정민규: 0, 이지원: 0 };
        weekGroups[key].total += t.amount;
        if (t.user === '정민규') weekGroups[key].정민규 += t.amount;
        if (t.user === '이지원') weekGroups[key].이지원 += t.amount;
      });
      return Object.values(weekGroups).sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeTimeSeries === 'quarter') {
      const quarterGroups = {};
      expenses.forEach(t => {
        const d = new Date(t.date);
        const year = d.getFullYear();
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        const key = `${year} Q${quarter}`;
        
        if (!quarterGroups[key]) quarterGroups[key] = { name: key, total: 0, 정민규: 0, 이지원: 0 };
        quarterGroups[key].total += t.amount;
        if (t.user === '정민규') quarterGroups[key].정민규 += t.amount;
        if (t.user === '이지원') quarterGroups[key].이지원 += t.amount;
      });
      return Object.values(quarterGroups).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const monthGroups = {};
      expenses.forEach(t => {
        const key = t.date.substring(0, 7);
        if (!monthGroups[key]) monthGroups[key] = { name: key, total: 0, 정민규: 0, 이지원: 0 };
        monthGroups[key].total += t.amount;
        if (t.user === '정민규') monthGroups[key].정민규 += t.amount;
        if (t.user === '이지원') monthGroups[key].이지원 += t.amount;
      });
      return Object.values(monthGroups).sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  const comparisonData = getTimeSeriesData();

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let headerIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row.some(cell => cell && (cell.toString().includes('일자') || cell.toString().includes('날짜') || cell.toString().includes('일시')))) {
            headerIndex = i;
            break;
          }
        }
        if (headerIndex === -1) headerIndex = 0;

        const headers = rows[headerIndex].map(h => (h || '').toString().trim());
        const dateCol = headers.findIndex(h => h.includes('일자') || h.includes('날짜') || h.includes('일시'));
        const amountCol = headers.findIndex(h => h.includes('금액') || h.includes('출금') || h.includes('사용') || h.includes('거래금액'));
        const merchantCol = headers.findIndex(h => h.includes('가맹점') || h.includes('사용처') || h.includes('내역') || h.includes('거래처') || h.includes('적요'));
        const cardCol = headers.findIndex(h => h.includes('카드') || h.includes('계좌') || h.includes('구분'));

        const newParsed = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const dateStr = row[dateCol];
          if (!dateStr) continue;

          let formattedDate = dateStr.toString().replace(/[^0-9]/g, '');
          if (formattedDate.length === 8) {
            formattedDate = `${formattedDate.substring(0,4)}-${formattedDate.substring(4,6)}-${formattedDate.substring(6,8)}`;
          } else {
            formattedDate = new Date(dateStr).toISOString().split('T')[0];
          }

          if (isNaN(Date.parse(formattedDate))) continue;

          const rawAmount = row[amountCol];
          const amount = parseInt(rawAmount.toString().replace(/[^0-9-]/g, ''), 10) || 0;
          const merchant = (row[merchantCol] || '미지정 가맹점').toString().trim();
          const cardNum = (row[cardCol] || '기타').toString().trim();

          let user = '미분류';
          if (cardNum.includes('1234') || cardNum.includes('5678') || merchant.includes('정민규')) user = '정민규';
          else if (cardNum.includes('9876') || cardNum.includes('5432') || merchant.includes('이지원')) user = '이지원';

          let category = '기타';
          const catMap = {
            '식비': ["마트", "식당", "배달", "카페", "편의점", "푸드", "요리", "이마트", "홈플러스", "스타벅스"],
            '교통/차량': ["택시", "버스", "지하철", "주유", "하이패스", "카카오T"],
            '쇼핑/생활': ["쿠팡", "네이버페이", "백화점", "아울렛", "다이소", "올리브영"],
            '주거/통신': ["관리비", "통신비", "가스", "전기", "월세"],
            '문화/여가': ["영화", "도서", "넷플릭스", "유튜브", "여행", "야놀자"]
          };
          
          for (const [catName, keywords] of Object.entries(catMap)) {
            if (keywords.some(kw => merchant.includes(kw))) {
              category = catName;
              break;
            }
          }

          newParsed.push({
            date: formattedDate,
            type: '지출',
            amount,
            merchant,
            paymentMethod: cardNum,
            category,
            user
          });
        }

        if (newParsed.length > 0) {
          setTransactions(prev => {
            const merged = [...prev];
            newParsed.forEach(newItem => {
              const isDup = prev.some(item => 
                item.date === newItem.date && 
                item.amount === newItem.amount && 
                item.merchant === newItem.merchant
              );
              if (!isDup) merged.push(newItem);
            });
            return merged.sort((a, b) => new Date(b.date) - new Date(a.date));
          });
          showToast(`성공적으로 Excel 파일에서 ${newParsed.length}건을 가져왔습니다!`);
        } else {
          showToast('유효한 거래 내역을 찾지 못했습니다.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('엑셀 파일 파싱 중 오류가 발생했습니다.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const saveDiscordSettings = () => {
    localStorage.setItem('discordWebhook', discordUrl);
    showToast('디스코드 웹훅 설정이 저장되었습니다.');
    setShowConfig(false);
  };

  const handleSendDiscordWebhook = async () => {
    if (!discordUrl || !discordUrl.startsWith('https://discord.com/')) {
      showToast('올바른 디스코드 웹훅 URL을 입력해주세요.', 'error');
      return;
    }

    const today = new Date();
    const day = today.getDay();
    const prevSunday = new Date(today);
    prevSunday.setDate(today.getDate() - day);
    prevSunday.setHours(23, 59, 59, 999);
    const prevMonday = new Date(prevSunday);
    prevMonday.setDate(prevSunday.getDate() - 6);
    prevMonday.setHours(0, 0, 0, 0);

    const startStr = prevMonday.toISOString().split('T')[0];
    const endStr = prevSunday.toISOString().split('T')[0];

    const weekTxs = expenses.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= prevMonday && tDate <= prevSunday;
    });

    if (weekTxs.length === 0) {
      showToast('지난주(월~일) 전송할 거래 내역이 존재하지 않습니다.', 'error');
      return;
    }

    let weekSum = 0;
    const userSum = { '정민규': 0, '이지원': 0, '미분류': 0 };
    const catSum = {};
    let maxTx = null;

    weekTxs.forEach(t => {
      weekSum += t.amount;
      userSum[t.user || '미분류'] = (userSum[t.user || '미분류'] || 0) + t.amount;
      catSum[t.category] = (catSum[t.category] || 0) + t.amount;
      if (!maxTx || t.amount > maxTx.amount) maxTx = t;
    });

    const formatKRW = (v) => v.toLocaleString('ko-KR') + '원';

    const userLines = Object.entries(userSum)
      .filter(([_, amt]) => amt > 0)
      .map(([name, amt]) => {
        const displayName = name === '정민규' ? '정민규 🧑🏻' : name === '이지원' ? '이지원 👩🏻' : name;
        return `**${displayName}**: ${formatKRW(amt)} (${((amt / weekSum)*100).toFixed(1)}%)`;
      })
      .join('\n');

    const catLines = Object.entries(catSum)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt], idx) => `${idx+1}위. **${cat}**: ${formatKRW(amt)}`)
      .join('\n');

    const displayMaxUser = maxTx ? (maxTx.user === '정민규' ? '정민규 🧑🏻' : maxTx.user === '이지원' ? '이지원 👩🏻' : maxTx.user) : '없음';

    const payload = {
      embeds: [{
        title: "📊 주간 가계부 요약 보고서",
        description: `📅 분석 기간: \`${startStr} ~ ${endStr}\``,
        color: 13399900, // Claude Coral (#cc785c) decimal value
        fields: [
          { name: "💰 총 지출", value: `### **${formatKRW(weekSum)}**`, inline: false },
          { name: "👥 인원별 지출", value: userLines || "없음", inline: true },
          { name: "🏷️ 주요 소비 분야 (Top 3)", value: catLines || "없음", inline: true },
          { name: "🚨 최고 지출 건", value: maxTx ? `**${maxTx.merchant}** (${maxTx.category}) : ${formatKRW(maxTx.amount)} [${displayMaxUser}]` : "없음", inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "2인 가계부 Claude-style 대시보드" }
      }]
    };

    try {
      const response = await fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showToast('디스코드 채널로 주간 통계 발송 완료!');
      } else {
        showToast(`발송 실패: 상태 코드 ${response.status}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('디스코드 웹훅 연동 중 에러가 발생했습니다.', 'error');
    }
  };

  const handleAddTx = (e) => {
    e.preventDefault();
    if (!newTx.merchant || !newTx.amount) {
      showToast('가맹점명과 금액을 정확히 입력해주세요.', 'error');
      return;
    }
    const amt = parseInt(newTx.amount, 10);
    if (isNaN(amt) || amt <= 0) {
      showToast('금액은 0보다 큰 숫자여야 합니다.', 'error');
      return;
    }

    const item = {
      ...newTx,
      amount: amt,
      id: Date.now()
    };

    setTransactions(prev => [item, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    setNewTx({
      date: new Date().toISOString().split('T')[0],
      type: '지출',
      amount: '',
      merchant: '',
      category: '식비',
      user: '정민규',
      paymentMethod: '직접 입력'
    });
    showToast('새 지출 내역이 추가되었습니다.');
  };

  const handleResetData = () => {
    if (window.confirm('모든 가계부 데이터를 초기화하고 기본 샘플 데이터로 복구하시겠습니까?')) {
      setTransactions(DEFAULT_DATA);
      showToast('가계부 데이터가 초기화되었습니다.');
    }
  };

  const handleDeleteTx = (idxToDelete) => {
    setTransactions(prev => prev.filter((_, idx) => idx !== idxToDelete));
    showToast('선택한 거래 내역이 삭제되었습니다.');
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterUser !== '전체' && t.user !== filterUser) return false;
    if (filterCategory !== '전체' && t.category !== filterCategory) return false;
    return true;
  });

  // UI 상 이름 옆 이모지 표기를 위한 헬퍼
  const getEmojiName = (name) => {
    if (name === '정민규') return '정민규 🧑🏻';
    if (name === '이지원') return '이지원 👩🏻';
    return name || '미분류';
  };

  return (
    <div className="min-h-screen">
      {/* Toast Notification */}
      {notifyMsg.text && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all toast-alert ${
          notifyMsg.type === 'error' ? 'toast-alert-error' : ''
        }`} style={{ backdropFilter: 'blur(8px)' }}>
          {notifyMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span className="text-sm font-medium">{notifyMsg.text}</span>
        </div>
      )}

      {/* Claude-style Top Nav (Warm Cream Canvas base) */}
      <nav className="w-full bg-white text-xs py-3 px-4 flex items-center justify-between top-nav-claude" style={{ height: '64px' }}>
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-tight text-ink" style={{ fontSize: '16px', color: '#141413', fontFamily: 'var(--fonts-display)' }}>
            <span style={{ color: '#cc785c', fontSize: '18px' }}>✳︎</span>
            <span>Double-Book</span>
          </div>
          <div className="flex gap-6 text-muted font-medium" style={{ fontSize: '14px' }}>
            <span className="cursor-pointer hover:text-ink transition-all">Overview</span>
            <span className="cursor-pointer hover:text-ink transition-all" onClick={() => setShowConfig(!showConfig)}>Settings</span>
          </div>
        </div>
      </nav>

      {/* Claude Sub-Nav Frosted Glass (Warm Cream Frosted) */}
      <div className="sub-nav-frosted py-3 px-4 mb-6">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ minHeight: '52px' }}>
          <div>
            <h1 className="hero-title" style={{ fontSize: '26px' }}>가계부 지출 분석 대시보드</h1>
            <p className="text-xs text-muted mt-1">정민규 🧑🏻 & 이지원 👩🏻의 다중 시계열 소비 리포트</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <label className="btn-primary text-sm shadow-sm">
              <Upload size={14} className="mr-1.5" />
              <span>Excel 업로드</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
            </label>

            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="btn-pearl"
            >
              <Settings size={14} className="mr-1.5" />
              <span>설정</span>
            </button>

            <button 
              onClick={handleSendDiscordWebhook}
              className="btn-dark"
              title="디스코드 채널로 주간 통계를 전송합니다."
            >
              <Send size={14} className="mr-1.5" />
              <span>디스코드 전송</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        
        {/* Config Panel */}
        {showConfig && (
          <section className="glass-panel p-6 mb-6" style={{ backgroundColor: 'var(--colors-surface-soft)' }}>
            <h2 className="section-title mb-4 flex items-center gap-2" style={{ fontSize: '20px' }}>
              <Settings size={18} className="text-indigo-400" />
              <span>시스템 및 디스코드 연동 설정</span>
            </h2>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted mb-2">디스코드 웹훅 주소 (Webhook URL)</label>
                <input 
                  type="text" 
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={saveDiscordSettings}
                  className="btn-primary text-sm"
                >
                  설정 저장
                </button>
                <button 
                  onClick={handleResetData}
                  className="btn-pearl text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  데이터 초기화
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Claude KPIs (Flat light cream card boxes) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel p-5">
            <span className="body-muted block mb-1">누적 총 소비액</span>
            <span className="hero-title" style={{ fontSize: '32px' }}>{totalExpenseSum.toLocaleString('ko-KR')}원</span>
          </div>

          <div className="glass-panel p-5">
            <span className="body-muted block mb-1">정민규 🧑🏻 지출</span>
            <span className="hero-title" style={{ fontSize: '32px', color: '#cc785c' }}>{(userStats['정민규'] || 0).toLocaleString('ko-KR')}원</span>
            <span className="body-muted block mt-1">
              비율: {totalExpenseSum > 0 ? (((userStats['정민규'] || 0) / totalExpenseSum) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="glass-panel p-5">
            <span className="body-muted block mb-1">이지원 👩🏻 지출</span>
            <span className="hero-title" style={{ fontSize: '32px', color: '#181715' }}>{(userStats['이지원'] || 0).toLocaleString('ko-KR')}원</span>
            <span className="body-muted block mt-1">
              비율: {totalExpenseSum > 0 ? (((userStats['이지원'] || 0) / totalExpenseSum) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="glass-panel p-5">
            <span className="body-muted block mb-1">최다 지출 분야</span>
            <span className="hero-title" style={{ fontSize: '32px' }}>
              {Object.entries(categoryStats).sort((a,b) => b[1]-a[1])[0]?.[0] || '없음'}
            </span>
            <span className="body-muted block mt-1">
              {(Object.entries(categoryStats).sort((a,b) => b[1]-a[1])[0]?.[1] || 0).toLocaleString('ko-KR')}원
            </span>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 시계열 추이 차트 */}
          <div className="glass-panel p-5 lg:col-span-2 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="section-title" style={{ fontSize: '20px' }}>시계열 지출 추이</h2>
                <p className="body-muted">주별 / 월별 / 분기별 소비 변화 트렌드</p>
              </div>
              <div className="flex bg-white p-0.5 rounded-lg border border-gray-300">
                {['week', 'month', 'quarter'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTimeSeries(t)}
                    className="px-3 py-1 text-xs font-semibold rounded-md transition-all"
                    style={{
                      backgroundColor: activeTimeSeries === t ? 'var(--colors-surface-card)' : 'transparent',
                      color: activeTimeSeries === t ? 'var(--colors-ink)' : 'var(--colors-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'week' ? '주별' : t === 'month' ? '월별' : '분기별'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCoral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#cc785c" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#cc785c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
                  <XAxis dataKey="name" stroke="#6c6a64" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6c6a64" fontSize={11} tickFormatter={(v) => `${(v/10000).toLocaleString()}만`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#e6dfd8', borderRadius: '12px' }}
                    formatter={(value) => [`${value.toLocaleString()}원`, '총 지출']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#cc785c" strokeWidth={2} fillOpacity={1} fill="url(#colorCoral)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 카테고리 비중 차트 */}
          <div className="glass-panel p-5 flex flex-col min-h-[400px]">
            <div className="mb-4">
              <h2 className="section-title" style={{ fontSize: '20px' }}>소비 항목 비중</h2>
              <p className="body-muted">카테고리별 누적 지출 비율</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#e6dfd8', borderRadius: '12px' }}
                    formatter={(value) => `${value.toLocaleString()}원`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
              {categoryChartData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                  <span className="truncate max-w-[80px] font-semibold">{item.name}</span>
                  <span className="text-gray-400 ml-auto">{((item.value / totalExpenseSum) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2인 비교 차트 */}
        <section className="grid grid-cols-1 gap-6 mb-6">
          <div className="glass-panel p-5 min-h-[350px] flex flex-col">
            <div className="mb-4">
              <h2 className="section-title" style={{ fontSize: '20px' }}>2인 소비 비교</h2>
              <p className="body-muted">정민규 🧑🏻와 이지원 👩🏻의 지출액 추이 비교</p>
            </div>
            
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
                  <XAxis dataKey="name" stroke="#6c6a64" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6c6a64" fontSize={11} tickFormatter={(v) => `${(v/10000).toLocaleString()}만`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#faf9f5', borderColor: '#e6dfd8', borderRadius: '12px' }}
                    formatter={(value) => `${value.toLocaleString()}원`}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#141413' }} />
                  <Bar dataKey="정민규" fill="#cc785c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="이지원" fill="#181715" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Form & Table Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 수동 지출 등록 양식 */}
          <div className="glass-panel p-5 h-fit">
            <h2 className="section-title flex items-center gap-2 mb-4" style={{ fontSize: '20px' }}>
              <Plus size={18} className="text-indigo-400" />
              <span>신규 지출 직접 입력</span>
            </h2>
            <form onSubmit={handleAddTx} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">날짜</label>
                <input 
                  type="date" 
                  value={newTx.date}
                  onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">지출인</label>
                  <select 
                    value={newTx.user}
                    onChange={(e) => setNewTx({...newTx, user: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="정민규">정민규 🧑🏻</option>
                    <option value="이지원">이지원 👩🏻</option>
                    <option value="미분류">미분류</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">카테고리</label>
                  <select 
                    value={newTx.category}
                    onChange={(e) => setNewTx({...newTx, category: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="식비">식비</option>
                    <option value="교통/차량">교통/차량</option>
                    <option value="쇼핑/생활">쇼핑/생활</option>
                    <option value="주거/통신">주거/통신</option>
                    <option value="문화/여가">문화/여가</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">가맹점명 / 사용처</label>
                <input 
                  type="text" 
                  placeholder="예: 스타벅스 강남점"
                  value={newTx.merchant}
                  onChange={(e) => setNewTx({...newTx, merchant: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">금액 (원)</label>
                <input 
                  type="number" 
                  placeholder="금액 입력"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full btn-primary text-sm font-semibold mt-2"
              >
                <Plus size={16} className="mr-1" />
                <span>내역 추가</span>
              </button>
            </form>
          </div>

          {/* 지출 내역 테이블 */}
          <div className="glass-panel p-5 lg:col-span-2 flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h2 className="section-title" style={{ fontSize: '20px' }}>세부 거래 내역</h2>
                <p className="body-muted">두 사람의 카드 및 입출금 상세 내역 리스트</p>
              </div>
              <div className="flex gap-2 text-xs">
                <select 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-700 focus:outline-none"
                >
                  <option value="전체">전체 인원</option>
                  <option value="정민규">정민규 🧑🏻</option>
                  <option value="이지원">이지원 👩🏻</option>
                  <option value="미분류">미분류</option>
                </select>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-700 focus:outline-none"
                >
                  <option value="전체">전체 분야</option>
                  <option value="식비">식비</option>
                  <option value="교통/차량">교통/차량</option>
                  <option value="쇼핑/생활">쇼핑/생활</option>
                  <option value="주거/통신">주거/통신</option>
                  <option value="문화/여가">문화/여가</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>지출인</th>
                    <th>가맹점</th>
                    <th>분야</th>
                    <th className="text-right">금액</th>
                    <th className="text-center">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px', color: '#6c6a64' }}>{t.date}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.user === '정민규' ? 'bg-indigo-500/10 text-indigo-700' :
                            t.user === '이지원' ? 'bg-gray-500/15 text-gray-700' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {getEmojiName(t.user)}
                          </span>
                        </td>
                        <td className="font-semibold" style={{ fontSize: '15px', color: '#141413' }}>{t.merchant}</td>
                        <td style={{ color: '#6c6a64', fontSize: '13px' }}>{t.category}</td>
                        <td className="text-right font-bold" style={{ fontSize: '15px', color: '#141413' }}>{t.amount.toLocaleString('ko-KR')}원</td>
                        <td className="text-center">
                          <button 
                            onClick={() => handleDeleteTx(idx)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-all"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500" style={{ border: 'none' }}>
                        지출 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
