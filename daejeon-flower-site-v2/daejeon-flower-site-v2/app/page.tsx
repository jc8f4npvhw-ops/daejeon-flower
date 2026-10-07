"use client";

import { useEffect, useMemo, useState } from "react";

type Main = "FLOWER" | "PLANT" | "PROPOSE" | "WEDDING" | "CEREMONY" | "FLOWER CLASS";
type FlowerProduct = "꽃다발" | "꽃바구니" | "화병꽃이" | "센터피스";
type FlowerStyle = "대전꽃백화점 스타일" | "바이닐 스타일";
type Size = "S" | "M" | "L" | "XL" | "SPECIAL";
type PickupMode = "픽업" | "배송" | "";
type Occasion = "생일" | "기념일" | "졸업" | "인사이동" | "개업" | "감사";

type Route =
  | { kind: "home" }
  | { kind: "main"; main: Main }
  | { kind: "occasion"; occasion: Occasion };

const flowerPrices: Record<FlowerStyle, Record<Size, number>> = {
  "대전꽃백화점 스타일": { S: 35000, M: 50000, L: 70000, XL: 100000, SPECIAL: 200000 },
  "바이닐 스타일": { S: 37000, M: 57000, L: 93000, XL: 120000, SPECIAL: 280000 },
};

const openingPlants = [
  { name: "금전수", sizes: ["S", "M", "L"] },
  { name: "뱅갈고무나무", sizes: ["S", "M", "L"] },
  { name: "녹보수", sizes: ["S", "M", "L"] },
  { name: "떡갈고무나무", sizes: ["S", "M", "L"] },
  { name: "극락조", sizes: ["S", "M", "L"] },
  { name: "야레카야자", sizes: ["M", "L"] },
  { name: "인도고무나무", sizes: ["M"] },
  { name: "스노우사파이어", sizes: ["M"] },
  { name: "가지마루", sizes: ["L"] },
  { name: "송오브 인디아", sizes: ["L"] },
] as const;

const roseColors = [
  ["빨간색", "열정적인 사랑", "#b8242f"],
  ["주황색", "첫사랑의 고백", "#d47a31"],
  ["파란색", "불가능의 극복", "#607bbd"],
  ["코랄색", "따뜻한 사랑", "#dd8e82"],
  ["분홍색", "사랑의 시작", "#df9bad"],
  ["흰색", "존경과 순수의 사랑", "#f3efe6"],
] as const;

const roseQuantities = [
  { count: 20, price: 100000 },
  { count: 30, price: 145000, best: true },
  { count: 50, price: 240000 },
  { count: 100, price: 450000 },
];

const trunkPackages = [
  { name: "BASIC", price: 250000 },
  { name: "SIGNATURE", price: 300000, best: true },
  { name: "PREMIUM", price: 500000 },
];

const hotelPackages = [
  { name: "MINI", price: 259900, items: ["미니 꽃장식 3", "미니 화병", "꽃길", "바닥 미니풍선", "대형 레이스천", "맞춤 메시지", "지류", "쇼핑백"] },
  { name: "BASIC", price: 474900, items: ["특대형 꽃장식 1", "테이블 꽃장식 1", "화병", "꽃길", "바닥 미니풍선", "대형 레이스천", "맞춤 메시지", "지류", "쇼핑백"] },
  { name: "SIGNATURE", price: 564900, best: true, items: ["특대형 꽃장식 1", "테이블 꽃장식 2", "화병", "꽃다발", "꽃길", "바닥 미니풍선", "레이스천", "맞춤 메시지", "지류", "쇼핑백"] },
  { name: "PREMIUM", price: 744900, items: ["특대형 꽃장식 2", "테이블 꽃장식 2", "화병", "꽃다발", "꽃길", "바닥 미니풍선", "레이스천", "맞춤 메시지", "지류", "쇼핑백"] },
];

const hotelAddons = [
  ["흑백 액자 5장", 18000],
  ["일반 헬륨 풍선 10개", 25000],
  ["하트 헬륨풍선 5개", 20000],
  ["네추럴 생화 꽃다발", 60000],
  ["클래식 장미 단일 꽃다발", 100000],
  ["버진로드 꽃길 연출", 27000],
] as const;

const halfHourTimes = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const won = (price?: number | null) => price ? `${price.toLocaleString("ko-KR")}원` : "가격 추후 입력";
const smoothTo = (id: string) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);

function SectionHead({ eyebrow, title, desc, link }: { eyebrow?: string; title: string; desc?: string; link?: string }) {
  return <div className="section-head"><div>{eyebrow && <div className="section-label">{eyebrow}</div>}<h2 className="section-title">{title}</h2>{desc && <p className="section-desc">{desc}</p>}</div>{link && <button className="section-link">{link}</button>}</div>;
}

function Photo({ label, tone = "flower", small = false, landscape = false }: { label: string; tone?: "flower" | "plant" | "orchid" | "rose" | "wedding" | "neutral"; small?: boolean; landscape?: boolean }) {
  return <div className={`photo tone-${tone} ${small ? "small" : ""} ${landscape ? "landscape" : ""}`}><span className="photo-label">{label}</span></div>;
}

function Slider({ label, tone = "flower", count = 4 }: { label: string; tone?: "flower" | "plant" | "orchid" | "rose" | "wedding" | "neutral"; count?: number }) {
  return <div><div className="swipe-note">← 좌우로 넘겨 제작 사진을 확인하세요</div><div className="photo-slider">{Array.from({ length: count }, (_, i) => <div className="photo-slide" key={i}><Photo label={`${label} ${i + 1}`} tone={tone} /></div>)}</div></div>;
}

function Input({ label, value, setValue, type = "text", required = false, placeholder = "", help }: { label: string; value: string; setValue: (v: string) => void; type?: string; required?: boolean; placeholder?: string; help?: string }) {
  return <div className="field"><label>{label}{required ? " *" : ""}</label><input value={value} type={type} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />{help && <div className="help">{help}</div>}</div>;
}

function Area({ label, value, setValue, placeholder = "" }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return <div className="field"><label>{label}</label><textarea value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} /></div>;
}

function TimeSelect({ label, value, setValue, required = true }: { label: string; value: string; setValue: (v: string) => void; required?: boolean }) {
  return <div className="field"><label>{label}{required ? " *" : ""}</label><select value={value} onChange={(e) => setValue(e.target.value)}><option value="">30분 단위로 선택해주세요</option>{halfHourTimes.map((t) => <option key={t}>{t}</option>)}</select></div>;
}

function Privacy({ checked, setChecked }: { checked: boolean; setChecked: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return <><div className="privacy"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><div className="privacy-text"><b>[필수] 개인정보 수집·이용에 동의합니다.</b><br /><button type="button" className="privacy-link" onClick={() => setOpen(true)}>개인정보처리방침 보기</button></div></div>{open && <div className="sheet-backdrop" onClick={() => setOpen(false)}><div className="sheet" onClick={(e) => e.stopPropagation()}><div className="sheet-handle" /><h3>개인정보처리방침</h3><p>대전꽃백화점은 주문·제작·배송·픽업·상담·결제를 위해 필요한 범위에서 주문자 및 수령인의 정보를 처리합니다. 정식 오픈 전 실제 PG·호스팅·알림·배송 위탁업체가 확정되면 세부 내용을 최종 반영해야 합니다.</p><p>개인정보 보호책임자: 주현식<br />042-272-8815 · Daejeonflowershop@gmail.com</p><button className="cta" onClick={() => setOpen(false)}>확인</button></div></div>}</>;
}

function ConsultSheet({ close }: { close: () => void }) {
  return <div className="sheet-backdrop" onClick={close}><div className="sheet" onClick={(e) => e.stopPropagation()}><div className="sheet-handle" /><h3>어떤 도움이 필요하세요?</h3><p>상품을 아직 정하지 못했거나 맞춤 제작이 필요한 경우 바로 상담해주세요.</p><div className="sheet-actions"><a className="solid-btn" href="tel:0422728815">전화 상담하기 · 042-272-8815</a><a className="soft-btn" href="sms:0422728815">문자 상담하기</a></div><button className="close-btn" onClick={close}>닫기</button></div></div>;
}

function Landing({ enter, consult }: { enter: () => void; consult: () => void }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => { const timer = setInterval(() => setSlide((v) => (v + 1) % 3), 4000); return () => clearInterval(timer); }, []);
  const backgrounds = ["flower", "shop", "work"];
  return <section className="landing"><div className={`landing-bg ${backgrounds[slide]}`} /><div className="landing-noise" /><div className="landing-content"><div className="landing-dots">{backgrounds.map((_, i) => <span key={i} className={`landing-dot ${i === slide ? "active" : ""}`} />)}</div><div className="landing-kicker">Since 2002 · Daejeon</div><h1>대전꽃백화점</h1><div className="landing-en">DAEJEON FLOWER DEPARTMENT STORE</div><div className="landing-tagline">Everyday flowers, meaningful moments.</div><div className="landing-actions"><button className="landing-btn primary" onClick={enter}>바로 주문하기</button><button className="landing-btn" onClick={consult}>상담하기</button></div></div></section>;
}

const quickItems: { main: Main; label: string; cls: string }[] = [
  { main: "FLOWER", label: "꽃", cls: "flower" },
  { main: "PLANT", label: "식물", cls: "plant" },
  { main: "PROPOSE", label: "프로포즈", cls: "propose" },
  { main: "WEDDING", label: "웨딩", cls: "wedding" },
  { main: "CEREMONY", label: "화환", cls: "ceremony" },
  { main: "FLOWER CLASS", label: "클래스", cls: "class" },
];

const occasions: { name: Occasion; cls: string; sub: string }[] = [
  { name: "생일", cls: "birthday", sub: "BIRTHDAY" },
  { name: "기념일", cls: "anniversary", sub: "ANNIVERSARY" },
  { name: "졸업", cls: "graduation", sub: "GRADUATION" },
  { name: "인사이동", cls: "move", sub: "PERSONNEL" },
  { name: "개업", cls: "opening", sub: "OPENING" },
  { name: "감사", cls: "thanks", sub: "THANK YOU" },
];

function StoreHome({ navigate, consult }: { navigate: (r: Route) => void; consult: () => void }) {
  const feed = [
    ["꽃다발", "f1", () => navigate({ kind: "main", main: "FLOWER" })],
    ["매장 이야기", "f2", consult],
    ["Fresh flowers", "f3", () => navigate({ kind: "occasion", occasion: "생일" })],
    ["개업식물", "f4", () => navigate({ kind: "main", main: "PLANT" })],
    ["JUST ROSE", "f5", () => navigate({ kind: "main", main: "PROPOSE" })],
    ["Wedding", "f6", () => navigate({ kind: "main", main: "WEDDING" })],
    ["Seasonal", "f7", () => navigate({ kind: "occasion", occasion: "기념일" })],
    ["Rose", "f8", () => navigate({ kind: "main", main: "PROPOSE" })],
    ["Hotel propose", "f9", () => navigate({ kind: "main", main: "PROPOSE" })],
  ] as const;

  return <div className="content">
    <section className="profile-block"><div className="profile-photo">DFDS</div><div><div className="profile-title">대전꽃백화점</div><div className="profile-meta">Since 2002 · Daejeon, Gao-dong</div><div className="profile-copy">꽃과 식물, 그리고 특별한 순간을 한 곳에서 준비합니다.</div></div></section>
    <div className="profile-actions"><button className="solid-btn" onClick={() => smoothTo("quick-shop")}>바로 주문하기</button><button className="soft-btn" onClick={consult}>상담하기</button></div>

    <section className="section" id="quick-shop"><SectionHead eyebrow="SHOP" title="상품으로 찾기" desc="원하는 상품이 정해져 있다면 바로 들어가세요." /><div className="quick-scroll">{quickItems.map((item) => <button className="quick-item" key={item.main} onClick={() => navigate({ kind: "main", main: item.main })}><div className={`quick-circle ${item.cls}`} /><div className="quick-name">{item.label}</div></button>)}</div></section>

    <section className="section"><SectionHead eyebrow="SHOP BY OCCASION" title="어떤 순간을 위한 꽃인가요?" desc="무엇을 골라야 할지 모르겠다면 상황에 맞게 추천해드릴게요." /><div className="occasion-scroll">{occasions.map((o) => <button className="occasion-card" key={o.name} onClick={() => navigate({ kind: "occasion", occasion: o.name })}><div className={`occasion-bg ${o.cls}`} /><div className="occasion-overlay" /><div className="occasion-copy"><b>{o.name}</b><span>{o.sub}</span></div></button>)}</div></section>

    <section className="section"><SectionHead eyebrow="DFDS FEED" title="요즘 대전꽃백화점" desc="상품, 작업, 매장 이야기를 가볍게 둘러보세요. 사진을 누르면 주문 또는 상담으로 이어집니다." /><div className="feed-grid">{feed.map(([label, cls, action]) => <button className="feed-tile" key={label} onClick={action}><div className={`feed-bg ${cls}`} /><span className="feed-tag">{label}</span></button>)}</div><p className="feed-note">실제 사진을 넣으면 이 영역이 대전꽃백화점의 작은 인스타그램 피드처럼 작동합니다.</p></section>
  </div>;
}

function PickupOrder({ title, price, size, requestPlaceholder = "요청사항이 있다면 작성해주세요.", allowCard = true }: { title: string; price: number | null; size?: Size; requestPlaceholder?: string; allowCard?: boolean }) {
  const [mode, setMode] = useState<PickupMode>(size === "S" ? "픽업" : "");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [address, setAddress] = useState(""); const [receiver, setReceiver] = useState(""); const [receiverPhone, setReceiverPhone] = useState(""); const [request, setRequest] = useState(""); const [card, setCard] = useState(""); const [privacy, setPrivacy] = useState(false);
  const ready = !!(mode && name && phone && date && time && (mode === "픽업" || (address && receiver && receiverPhone)) && privacy && price);
  return <section className="section" id={`${title}-receive`}><SectionHead eyebrow="ORDER" title="수령 방법" desc={size === "S" ? "S 사이즈는 매장 픽업 전용 상품입니다." : "픽업 또는 배송을 선택해주세요."} />
    {size === "S" ? <div className="notice">S 사이즈는 매장 픽업만 가능합니다. 배송은 M 사이즈부터 가능합니다.</div> : <div className="two"><button className={`option-card ${mode === "픽업" ? "selected" : ""}`} onClick={() => { setMode("픽업"); smoothTo(`${title}-form`); }}><b>픽업</b><div className="price">매장에서 직접 수령</div></button><button className={`option-card ${mode === "배송" ? "selected" : ""}`} onClick={() => { setMode("배송"); smoothTo(`${title}-form`); }}><b>배송</b><div className="price">주소 확인 후 배송비 안내</div></button></div>}
    {mode && <div className="section" id={`${title}-form`}><SectionHead title="주문 정보를 입력해주세요" /><div className="form"><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} />
      <Input label={mode === "픽업" ? "픽업 날짜" : "배송 날짜"} required type="date" value={date} setValue={setDate} />
      {mode === "픽업" ? <TimeSelect label="픽업 시간을 선택해주세요" value={time} setValue={setTime} /> : <Input label="배송 시간" required type="time" value={time} setValue={setTime} />}
      {mode === "배송" && <><Input label="배송 주소" required value={address} setValue={setAddress} help="입력해주시면 예약 완료 시 배송비를 안내해드립니다." /><Input label="받으시는 분 성함" required value={receiver} setValue={setReceiver} /><Input label="받으시는 분 연락처" required value={receiverPhone} setValue={setReceiverPhone} /></>}
      <Area label="요청사항" value={request} setValue={setRequest} placeholder={requestPlaceholder} />{allowCard && <Area label="카드 메시지" value={card} setValue={setCard} />}<Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!ready}>{price ? `${won(price)} 결제하기` : "가격 확정 후 결제"}</button></div></div>}
  </section>;
}

function FlowerPage() {
  const [product, setProduct] = useState<FlowerProduct | "">("");
  return <div><SectionHead eyebrow="FLOWER" title="꽃" desc="꽃다발, 꽃바구니, 화병꽃이와 맞춤 센터피스를 준비합니다." />{!product && <div className="category-grid">{(["꽃다발", "꽃바구니", "화병꽃이", "센터피스"] as FlowerProduct[]).map((p) => <button className="product-card" key={p} onClick={() => { setProduct(p); smoothTo("flower-detail"); }}><Photo label={p} tone="flower" /><div className="product-name">{p}</div><div className="product-meta">사진과 제작 스타일을 확인하고 주문하세요.</div></button>)}</div>}{product && <div id="flower-detail" className="section">{product === "센터피스" ? <Centerpiece /> : <FlowerOrder product={product} />}</div>}</div>;
}

function FlowerOrder({ product }: { product: Exclude<FlowerProduct, "센터피스"> }) {
  const [style, setStyle] = useState<FlowerStyle | "">(""); const [size, setSize] = useState<Size | "">("");
  const price = product === "꽃다발" && style && size ? flowerPrices[style][size] : null;
  return <div><SectionHead title={product} desc="제작 스타일을 먼저 선택해주세요." /><Photo label={`${product} 대표 이미지`} tone="flower" landscape />
    <section className="section"><SectionHead eyebrow="STEP 01" title="스타일 선택" /> <div style={{ display: "grid", gap: 14 }}>{(["대전꽃백화점 스타일", "바이닐 스타일"] as FlowerStyle[]).map((s) => <div className={`style-card ${style === s ? "selected" : ""}`} key={s}><div className="style-profile"><div className="avatar">PROFILE</div><div><div className="section-label">FLOWER DESIGNER</div><b>{s}</b></div></div><div className="style-copy">제작자 프로필과 추구하는 꽃의 방향성을 소개하는 자리입니다.</div><Slider label={`${s} 제작사진`} /><button className="select-btn" onClick={() => { setStyle(s); setSize(""); smoothTo("flower-size"); }}>{style === s ? "선택됨 ✓" : "이 스타일 선택하기"}</button></div>)}</div></section>
    {style && <section className="section" id="flower-size"><SectionHead eyebrow="STEP 02" title="사이즈 선택" desc="배송은 M 사이즈부터 가능합니다. S 사이즈는 매장 픽업만 가능합니다." /><div className="size-grid">{(["S", "M", "L", "XL", "SPECIAL"] as Size[]).map((s) => <button className={`size-card ${size === s ? "selected" : ""}`} key={s} onClick={() => { setSize(s); smoothTo("flower-gallery"); }}><div className="size-name">{s}</div><div className="price">{product === "꽃다발" ? won(flowerPrices[style][s]) : "가격 추후 입력"}</div>{s === "S" && <span className="pickup-only">PICK-UP ONLY</span>}</button>)}</div></section>}
    {style && size && <section className="section" id="flower-gallery"><SectionHead eyebrow="REFERENCE" title={`${product} ${size} 제작 이미지`} desc="선택한 사이즈의 실제 제작 예시를 좌우로 확인할 수 있습니다." /><Slider label={`${product} · ${style} · ${size}`} /><div className="summary"><div className="summary-row"><span>상품</span><b>{product}</b></div><div className="summary-row"><span>스타일</span><b>{style}</b></div><div className="summary-row"><span>사이즈</span><b>{size}</b></div><div className="summary-total">{won(price)}</div></div><PickupOrder title={`${product}-${size}`} price={price} size={size} requestPlaceholder="사용처 및 꽃 색상을 가볍게 작성해주세요. 미기재 시 보유 중인 꽃 중 가장 예쁜 꽃으로 제작해드립니다." /></section>}
  </div>;
}

function Centerpiece() {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [eventDate, setEventDate] = useState(""); const [place, setPlace] = useState(""); const [qty, setQty] = useState(""); const [budget, setBudget] = useState(""); const [request, setRequest] = useState("");
  return <div><SectionHead title="센터피스" desc="공간, 행사 규모, 수량과 소재에 따라 달라지는 상담형 상품입니다." /><Slider label="센터피스 제작사례" /><div className="section"><div className="form"><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="연락처" required value={phone} setValue={setPhone} /><Input label="행사일" type="date" value={eventDate} setValue={setEventDate} /><Input label="행사 장소" value={place} setValue={setPlace} /><Input label="예상 수량" value={qty} setValue={setQty} /><Input label="예상 예산" value={budget} setValue={setBudget} /><Area label="요청사항" value={request} setValue={setRequest} /><button className="cta" disabled={!name || !phone}>센터피스 상담 신청하기</button></div></div></div>;
}

function PlantMessage() {
  const [type, setType] = useState<"card" | "ribbon" | "">(""); const [card, setCard] = useState(""); const [left, setLeft] = useState(""); const [right, setRight] = useState("");
  return <section className="section"><SectionHead eyebrow="MESSAGE" title="메시지 방식" desc="카드 메시지 또는 리본 문구 중 하나만 선택할 수 있습니다." /><div className="message-grid"><button className={`message-card ${type === "card" ? "selected" : ""}`} onClick={() => { setType("card"); smoothTo("plant-message-detail"); }}><Photo label="카드" tone="neutral" small /><div className="message-name">카드 메시지</div></button><button className={`message-card ${type === "ribbon" ? "selected" : ""}`} onClick={() => { setType("ribbon"); smoothTo("plant-message-detail"); }}><Photo label="리본" tone="neutral" small /><div className="message-name">리본 문구</div></button></div>{type && <div id="plant-message-detail" className="section">{type === "card" ? <Area label="카드 메시지" value={card} setValue={setCard} /> : <div className="form"><Input label="왼쪽 리본 문구" value={left} setValue={setLeft} /><Input label="오른쪽 리본 문구" value={right} setValue={setRight} /></div>}</div>}</section>;
}

function PlantOrder({ title, price }: { title: string; price: number | null }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [place, setPlace] = useState(""); const [receiver, setReceiver] = useState(""); const [receiverPhone, setReceiverPhone] = useState(""); const [request, setRequest] = useState(""); const [privacy, setPrivacy] = useState(false);
  const ready = !!(name && phone && date && time && place && price && privacy);
  return <section className="section"><SectionHead eyebrow="ORDER" title="주문정보" /><div className="summary"><div className="summary-row"><span>상품</span><b>{title}</b></div><div className="summary-total">{won(price)}</div></div><div className="form" style={{ marginTop: 18 }}><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} /><Input label="배송 / 픽업 날짜" required type="date" value={date} setValue={setDate} /><TimeSelect label="배송 / 픽업 시간을 선택해주세요" value={time} setValue={setTime} /><Input label="배송장소" required value={place} setValue={setPlace} help="직접 픽업하실 경우 배송장소에 ‘픽업’이라고 입력해주세요." /><Input label="받으시는 분 성함" value={receiver} setValue={setReceiver} placeholder="배송 시 입력해주세요" /><Input label="받으시는 분 연락처" value={receiverPhone} setValue={setReceiverPhone} placeholder="배송 시 입력해주세요" /><Area label="요청사항" value={request} setValue={setRequest} /><PlantMessage /><Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!ready}>{price ? `${won(price)} 결제하기` : "가격 확정 후 결제"}</button></div></section>;
}

function PlantPage() {
  const [category, setCategory] = useState<"개업축하" | "동양난" | "서양난" | "">("");
  return <div><SectionHead eyebrow="PLANT" title="식물" desc="개업 식물과 난을 목적에 맞게 선택할 수 있습니다." />{!category && <div className="category-grid">{(["개업축하", "동양난", "서양난"] as const).map((c) => <button className="product-card" key={c} onClick={() => { setCategory(c); smoothTo("plant-detail"); }}><Photo label={c} tone={c === "동양난" || c === "서양난" ? "orchid" : "plant"} /><div className="product-name">{c}</div></button>)}</div>}{category && <div className="section" id="plant-detail">{category === "개업축하" ? <OpeningPlant /> : category === "동양난" ? <OrientalOrchid /> : <WesternOrchid />}</div>}</div>;
}

function OpeningPlant() {
  const [plant, setPlant] = useState(""); const [size, setSize] = useState(""); const selected = openingPlants.find((p) => p.name === plant);
  return <div><SectionHead title="개업축하" desc="식물 종류와 사이즈를 선택해주세요." /><div className="category-grid">{openingPlants.map((p) => <button className="product-card" key={p.name} onClick={() => { setPlant(p.name); if (p.sizes.length === 1) { setSize(p.sizes[0]); smoothTo("opening-gallery"); } else { setSize(""); smoothTo("opening-size"); } }}><Photo label={p.name} tone="plant" /><div className="product-name">{p.name}</div><div className="product-meta">{p.sizes.join(" · ")}</div></button>)}</div>{selected && selected.sizes.length > 1 && <section className="section" id="opening-size"><SectionHead eyebrow="STEP 02" title="사이즈 선택" /><div className="size-grid">{selected.sizes.map((s) => <button className={`size-card ${size === s ? "selected" : ""}`} key={s} onClick={() => { setSize(s); smoothTo("opening-gallery"); }}><div className="size-name">{s}</div><div className="price">가격 추후 입력</div></button>)}</div></section>}{plant && size && <section className="section" id="opening-gallery"><SectionHead eyebrow="REFERENCE" title={`${plant} ${size} 제작 이미지`} /><Slider label={`${plant} ${size}`} tone="plant" /><PlantOrder title={`${plant} / ${size}`} price={null} /></section>}</div>;
}

function OrientalOrchid() {
  const [pot, setPot] = useState(""); const prices: Record<string, number> = { "일반분": 70000, "투각분": 100000, "백자분": 180000 };
  return <div><SectionHead title="동양난" desc="여름과 겨울에 추천드리는 난이 달라집니다." /><div className="season-stack"><div className="season-card"><Photo label="황룡관" tone="orchid" /><div className="season-copy"><small>SUMMER</small><b>황룡관</b></div></div><div className="season-card"><Photo label="산천조" tone="orchid" /><div className="season-copy"><small>WINTER</small><b>산천조</b></div></div></div><section className="section"><SectionHead eyebrow="STEP 02" title="화분 선택" /><div className="pot-list">{["일반분", "투각분", "백자분"].map((p) => <button className={`pot-card ${pot === p ? "selected" : ""}`} key={p} onClick={() => { setPot(p); smoothTo("orchid-order"); }}><Photo label={p} tone="neutral" />{p === "투각분" && <span className="best">BEST</span>}<div className="pot-copy"><b>{p}</b><span>{won(prices[p])}</span></div></button>)}</div></section>{pot && <div id="orchid-order"><PlantOrder title={`동양난 / ${pot}`} price={prices[pot]} /></div>}</div>;
}

function WesternOrchid() {
  const [budget, setBudget] = useState<number | null>(null); const [wrap, setWrap] = useState(false);
  const total = budget ? budget + (wrap ? 15000 : 0) : null;
  return <div><SectionHead title="서양난" desc="입고 품종이 자주 달라지기 때문에 예산을 기준으로 가장 좋은 상품을 제안드립니다." /><Slider label="서양난 출고사례" tone="orchid" count={5} /><section className="section"><SectionHead eyebrow="STEP 01" title="예산 선택" /><div className="size-grid">{[50000, 60000, 80000, 100000, 150000].map((p) => <button className={`size-card ${budget === p ? "selected" : ""}`} key={p} onClick={() => { setBudget(p); smoothTo("western-wrap"); }}><b>{won(p)}</b></button>)}</div></section>{budget && <section className="section" id="western-wrap"><SectionHead eyebrow="OPTION" title="포장 추가" /><button className={`option-card ${wrap ? "selected" : ""}`} onClick={() => { setWrap(!wrap); smoothTo("western-order"); }}><b>보자기 포장</b><div className="price">+15,000원</div></button><div id="western-order"><PickupOrder title={`서양난-${budget}`} price={total} requestPlaceholder="원하시는 색감이나 요청사항을 작성해주세요. 담당자가 재고를 확인해 연락드립니다." allowCard={false} /></div></section>}</div>;
}

function ProposePage() {
  const [category, setCategory] = useState<"JUST ROSE" | "트렁크" | "호텔" | "">("");
  return <div><SectionHead eyebrow="PROPOSE" title="프로포즈" desc="장미, 트렁크, 호텔 연출 중 원하는 방식으로 준비할 수 있습니다." />{!category && <div className="category-grid">{(["JUST ROSE", "트렁크", "호텔"] as const).map((c) => <button className="product-card" key={c} onClick={() => { setCategory(c); smoothTo("propose-detail"); }}><Photo label={c} tone={c === "JUST ROSE" ? "rose" : "wedding"} /><div className="product-name">{c}</div></button>)}</div>}{category && <div id="propose-detail" className="section">{category === "JUST ROSE" ? <JustRose /> : category === "트렁크" ? <TrunkPropose /> : <HotelPropose />}</div>}</div>;
}

function JustRose() {
  const [color, setColor] = useState(""); const [qty, setQty] = useState<number | null>(null); const selected = roseQuantities.find((q) => q.count === qty);
  return <div><SectionHead title="JUST ROSE" desc="선택하신 컬러를 기준으로, 주문 시점에 가장 좋은 장미를 제안해 제작합니다." /><Slider label="JUST ROSE 제작사진" tone="rose" count={5} /><section className="section"><SectionHead eyebrow="STEP 01" title="컬러 선택" /><div style={{ display: "grid", gap: 9 }}>{roseColors.map(([name, meaning, colorValue]) => <button className={`option-card ${color === name ? "selected" : ""}`} key={name} onClick={() => { setColor(name); smoothTo("rose-qty"); }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: colorValue, border: "1px solid rgba(0,0,0,.08)" }} /><b>{name}</b><span className="price" style={{ margin: "0 0 0 auto" }}>{meaning}</span></div></button>)}</div></section>{color && <section className="section" id="rose-qty"><SectionHead eyebrow="STEP 02" title="수량 선택" /><div className="size-grid">{roseQuantities.map((q) => <button className={`size-card ${qty === q.count ? "selected" : ""}`} key={q.count} onClick={() => { setQty(q.count); smoothTo("rose-gallery"); }}>{q.best && <span className="best">BEST</span>}<div className="size-name">{q.count}</div><div className="price">ROSES · {won(q.price)}</div></button>)}</div></section>}{selected && <section className="section" id="rose-gallery"><SectionHead eyebrow="REFERENCE" title={`${selected.count}송이 제작 이미지`} /><Slider label={`JUST ROSE ${selected.count}송이`} tone="rose" /><PickupOrder title={`JUSTROSE-${selected.count}`} price={selected.price} requestPlaceholder="사용처나 원하시는 분위기를 작성해주세요." /></section>}</div>;
}

function TrunkPropose() {
  const [pack, setPack] = useState(""); const [display, setDisplay] = useState<"garland" | "cloth" | "">(""); const [cloth, setCloth] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [request, setRequest] = useState(""); const [privacy, setPrivacy] = useState(false); const selected = trunkPackages.find((p) => p.name === pack);
  return <div><SectionHead title="트렁크 프로포즈" /><Slider label="트렁크 프로포즈 메인 이미지" tone="wedding" count={5} /><section className="section"><SectionHead eyebrow="STEP 01" title="패키지 선택" /><div style={{ display: "grid", gap: 10 }}>{trunkPackages.map((p) => <button className={`option-card ${pack === p.name ? "selected" : ""}`} key={p.name} onClick={() => { setPack(p.name); smoothTo("trunk-message"); }}>{p.best && <span className="best">BEST</span>}<b>{p.name}</b><div className="price">{won(p.price)}</div></button>)}</div></section>{selected && <section className="section" id="trunk-message"><div className="notice">제작에는 약 2시간 정도 소요됩니다. 함께 가져오시는 반지, 가방, 구두 등 선물의 종류와 크기에 따라 장식 범위와 연출 방식이 달라질 수 있습니다. 함께 전달하고 싶은 선물이 있으신 경우 반드시 사전에 말씀해주세요.</div><SectionHead eyebrow="STEP 02" title="연출 문구 선택" /><div className="message-grid"><button className={`message-card ${display === "garland" ? "selected" : ""}`} onClick={() => { setDisplay("garland"); smoothTo("trunk-order"); }}><Photo label="MARRY ME 가랜드" tone="wedding" /><div className="message-name">MARRY ME 가랜드</div></button><button className={`message-card ${display === "cloth" ? "selected" : ""}`} onClick={() => { setDisplay("cloth"); smoothTo("trunk-order"); }}><Photo label="광목천 프린팅" tone="neutral" /><div className="message-name">광목천 프린팅</div></button></div>{display === "cloth" && <div className="section"><Input label="광목천 문구" value={cloth} setValue={setCloth} /></div>}</section>}{selected && display && <section className="section" id="trunk-order"><SectionHead eyebrow="ORDER" title="예약정보" /><div className="form"><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} /><Area label="요청사항" value={request} setValue={setRequest} /><Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!name || !phone || !privacy}>{won(selected.price)} 결제하기</button></div></section>}</div>;
}

function HotelPropose() {
  const [pack, setPack] = useState(""); const [addons, setAddons] = useState<string[]>([]); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [hotelName, setHotelName] = useState(""); const [date, setDate] = useState(""); const [checkin, setCheckin] = useState(""); const [room, setRoom] = useState(""); const [request, setRequest] = useState(""); const [message, setMessage] = useState(""); const [privacy, setPrivacy] = useState(false);
  const selected = hotelPackages.find((p) => p.name === pack); const extra = hotelAddons.filter(([n]) => addons.includes(n)).reduce((s, [, p]) => s + p, 0); const total = (selected?.price || 0) + extra;
  const toggle = (name: string) => setAddons((v) => v.includes(name) ? v.filter((x) => x !== name) : [...v, name]);
  return <div><SectionHead title="호텔 프로포즈" /><Slider label="호텔 프로포즈 메인 이미지" tone="wedding" count={5} /><div className="details-slot" style={{ marginTop: 18 }}>외부에서 제작한 호텔 프로포즈 상세페이지를 이 위치에 삽입할 수 있습니다.</div><section className="section"><SectionHead eyebrow="STEP 01" title="패키지 선택" /><div style={{ display: "grid", gap: 10 }}>{hotelPackages.map((p) => <button className={`option-card ${pack === p.name ? "selected" : ""}`} key={p.name} onClick={() => { setPack(p.name); smoothTo("hotel-addons"); }}>{p.best && <span className="best">BEST</span>}<b>{p.name}</b><div className="price">{won(p.price)}</div><div className="product-meta" style={{ marginTop: 8 }}>{p.items.join(" · ")}</div></button>)}</div></section>{selected && <section className="section" id="hotel-addons"><SectionHead eyebrow="ADD-ON" title="추가상품" /><div style={{ display: "grid", gap: 8 }}>{hotelAddons.map(([n, p]) => { const included = n === "네추럴 생화 꽃다발" && (pack === "SIGNATURE" || pack === "PREMIUM"); return <button disabled={included} className={`option-card ${addons.includes(n) ? "selected" : ""}`} key={n} onClick={() => { toggle(n); smoothTo("hotel-process"); }}><b>{n}</b><div className="price">{included ? "패키지 기본 포함" : `+${won(p)}`}</div></button>; })}</div></section>}{selected && <section className="section" id="hotel-process"><SectionHead title="진행 과정" /><div className="timeline">{["일정 · 장소 확인", "구성과 컬러상담", "준비 방식 확정", "플라워 연출", "연인의 입장"].map((x, i) => <div key={x}><small>0{i + 1}</small><br /><b>{x}</b></div>)}</div><div className="summary" style={{ marginTop: 20 }}><div className="section-label">TOTAL</div><div className="summary-total">{won(total)}</div></div></section>}{selected && <section className="section"><SectionHead eyebrow="ORDER" title="예약정보" /><div className="form"><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} /><Input label="호텔명" required value={hotelName} setValue={setHotelName} /><Input label="호텔 예약 날짜" required type="date" value={date} setValue={setDate} /><Input label="체크인 예정 시간" type="time" value={checkin} setValue={setCheckin} /><Input label="객실번호" value={room} setValue={setRoom} placeholder="알고 있는 경우 입력해주세요" /><Area label="요청사항" value={request} setValue={setRequest} /><Area label="맞춤 메시지 문구" value={message} setValue={setMessage} /><Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!name || !phone || !hotelName || !date || !privacy}>{won(total)} 결제하기</button></div></section>}</div>;
}

function CeremonyPage() {
  const [category, setCategory] = useState<"근조화환" | "축하화환" | "">("");
  return <div><SectionHead eyebrow="CEREMONY" title="화환" desc="근조와 축하의 목적에 맞게 빠르게 주문할 수 있습니다." />{!category && <div className="category-grid">{(["근조화환", "축하화환"] as const).map((c) => <button className="product-card" key={c} onClick={() => { setCategory(c); smoothTo("ceremony-detail"); }}><Photo label={c} tone="neutral" /><div className="product-name">{c}</div></button>)}</div>}{category && <div className="section" id="ceremony-detail">{category === "근조화환" ? <Funeral /> : <Celebrate />}</div>}</div>;
}

function Funeral() {
  const products = [{ name: "근조 3단", price: 100000, best: true }, { name: "근조 4단", price: 150000 }, { name: "영정바구니", price: 70000 }];
  const [product, setProduct] = useState(""); const [hall, setHall] = useState(""); const [person, setPerson] = useState(""); const [sender, setSender] = useState(""); const [msg, setMsg] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [privacy, setPrivacy] = useState(false); const selected = products.find((p) => p.name === product);
  return <div><SectionHead title="근조화환" /><div className="details-slot">근조화환 상세페이지 삽입 영역</div><div style={{ display: "grid", gap: 10, marginTop: 18 }}>{products.map((p) => <button className={`option-card ${product === p.name ? "selected" : ""}`} key={p.name} onClick={() => { setProduct(p.name); smoothTo("funeral-order"); }}>{p.best && <span className="best">BEST</span>}<b>{p.name}</b><div className="price">{won(p.price)}</div></button>)}</div>{selected && <section className="section" id="funeral-order"><div className="form"><Input label="장례식장 이름" required value={hall} setValue={setHall} /><Input label="고인 또는 상주분 성함" required value={person} setValue={setPerson} /><Input label="보내시는 분 성함 또는 상호" required value={sender} setValue={setSender} /><div className="field"><label>문구 *</label><div style={{ display: "grid", gap: 8 }}>{["삼가 故人의 冥福을 빕니다", "謹弔(근조)"].map((m) => <button className={`option-card ${msg === m ? "selected" : ""}`} key={m} onClick={() => setMsg(m)}>{m}</button>)}</div></div><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} /><Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!hall || !person || !sender || !msg || !name || !phone || !privacy}>{won(selected.price)} 결제하기</button></div></section>}</div>;
}

function Celebrate() {
  const products = [{ name: "축하 3단", price: 100000, best: true }, { name: "생화오브제 BASIC", price: 100000 }, { name: "생화오브제 SIGNATURE", price: 150000 }, { name: "생화오브제 PREMIUM", price: 300000 }];
  const [product, setProduct] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [place, setPlace] = useState(""); const [receiver, setReceiver] = useState(""); const [sender, setSender] = useState(""); const [msg, setMsg] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [privacy, setPrivacy] = useState(false); const selected = products.find((p) => p.name === product);
  return <div><SectionHead title="축하화환" /><div style={{ display: "grid", gap: 14 }}>{products.map((p) => <button className="product-card" key={p.name} onClick={() => { setProduct(p.name); smoothTo("celebrate-order"); }}><div style={{ position: "relative" }}><Photo label={`${p.name} 대표이미지`} tone="neutral" landscape />{p.best && <span className="best">BEST</span>}</div><div className="product-name">{p.name}</div><div className="product-meta">{won(p.price)}</div></button>)}</div>{selected && <section className="section" id="celebrate-order"><div className="form"><Input label="배송 날짜" required type="date" value={date} setValue={setDate} /><Input label="배송 시간" required type="time" value={time} setValue={setTime} /><Input label="행사장 또는 배송장소" required value={place} setValue={setPlace} /><Input label="받는 분 성함 또는 업체명" value={receiver} setValue={setReceiver} /><Input label="보내시는 분 성함 또는 상호" required value={sender} setValue={setSender} /><div className="field"><label>축하 문구 *</label><div style={{ display: "grid", gap: 8 }}>{["祝結婚", "祝華婚", "祝 開業"].map((m) => <button className={`option-card ${msg === m ? "selected" : ""}`} key={m} onClick={() => setMsg(m)}>{m}</button>)}</div></div><Input label="주문자 성함" required value={name} setValue={setName} /><Input label="주문자 연락처" required value={phone} setValue={setPhone} /><Privacy checked={privacy} setChecked={setPrivacy} /><button className="cta" disabled={!date || !time || !place || !sender || !msg || !name || !phone || !privacy}>{won(selected.price)} 결제하기</button></div></section>}</div>;
}

function OccasionPage({ occasion, navigate }: { occasion: Occasion; navigate: (r: Route) => void }) {
  const map = Object.fromEntries(occasions.map((o) => [o.name, o.cls])) as Record<Occasion, string>;
  const suggestions: Record<Occasion, { name: string; meta: string; main: Main; tone: "flower" | "plant" | "rose" | "neutral" }[]> = {
    "생일": [{ name: "꽃다발 M", meta: "가장 부담 없이 선물하기 좋은 선택", main: "FLOWER", tone: "flower" }, { name: "JUST ROSE 30", meta: "30송이 · BEST", main: "PROPOSE", tone: "rose" }, { name: "꽃바구니", meta: "테이블 위에 오래 두기 좋은 선물", main: "FLOWER", tone: "flower" }, { name: "서양난", meta: "격식 있는 생일 선물", main: "PLANT", tone: "plant" }],
    "기념일": [{ name: "JUST ROSE 30", meta: "145,000원 · BEST", main: "PROPOSE", tone: "rose" }, { name: "바이닐 스타일 꽃다발", meta: "조금 더 특별한 꽃다발", main: "FLOWER", tone: "flower" }, { name: "트렁크 프로포즈", meta: "SIGNATURE 300,000원", main: "PROPOSE", tone: "neutral" }, { name: "호텔 프로포즈", meta: "공간 전체를 연출하는 선택", main: "PROPOSE", tone: "neutral" }],
    "졸업": [{ name: "꽃다발 S", meta: "픽업 전용", main: "FLOWER", tone: "flower" }, { name: "꽃다발 M", meta: "배송 가능", main: "FLOWER", tone: "flower" }, { name: "꽃바구니", meta: "가족·선생님 선물", main: "FLOWER", tone: "flower" }, { name: "서양난", meta: "교직원·선생님 선물", main: "PLANT", tone: "plant" }],
    "인사이동": [{ name: "동양난", meta: "일반분 · 투각분 · 백자분", main: "PLANT", tone: "plant" }, { name: "서양난", meta: "예산별 선택", main: "PLANT", tone: "plant" }, { name: "개업축하 식물", meta: "관엽식물 10종", main: "PLANT", tone: "plant" }, { name: "꽃다발", meta: "가볍게 전하는 축하", main: "FLOWER", tone: "flower" }],
    "개업": [{ name: "개업축하 식물", meta: "금전수부터 송오브 인디아까지", main: "PLANT", tone: "plant" }, { name: "축하 3단", meta: "100,000원 · BEST", main: "CEREMONY", tone: "neutral" }, { name: "생화오브제", meta: "BASIC · SIGNATURE · PREMIUM", main: "CEREMONY", tone: "flower" }, { name: "서양난", meta: "예산에 맞춘 추천", main: "PLANT", tone: "plant" }],
    "감사": [{ name: "꽃다발 M", meta: "감사의 마음을 가볍게", main: "FLOWER", tone: "flower" }, { name: "꽃바구니", meta: "격식을 갖춘 선물", main: "FLOWER", tone: "flower" }, { name: "서양난", meta: "오래 두고 볼 수 있는 선물", main: "PLANT", tone: "plant" }, { name: "동양난", meta: "차분하고 격식 있는 선택", main: "PLANT", tone: "plant" }],
  };
  return <div><div className="occasion-hero"><div className={`occasion-bg ${map[occasion]}`} /><div className="occasion-overlay" /><div className="occasion-hero-copy"><h2>{occasion}</h2><p>{occasion}에 많이 찾는 상품을 한곳에 모았습니다. 마음에 드는 상품을 누르면 해당 주문 페이지로 이동합니다.</p></div></div><SectionHead eyebrow="CURATED" title={`${occasion} 추천`} desc="상품 종류를 먼저 정하지 않아도 바로 비교해볼 수 있습니다." /><div className="curated-grid">{suggestions[occasion].map((s) => <button className="product-card" key={s.name} onClick={() => navigate({ kind: "main", main: s.main })}><Photo label={s.name} tone={s.tone} /><div className="product-name">{s.name}</div><div className="product-meta">{s.meta}</div></button>)}</div></div>;
}

function Coming({ title }: { title: string }) {
  return <div><SectionHead eyebrow={title.toUpperCase()} title={title} desc="이 영역은 다음 단계에서 실제 상품과 상세 주문 흐름을 연결할 예정입니다." /><Photo label={`${title} 대표 이미지`} tone="wedding" landscape /></div>;
}

function MainPage({ main }: { main: Main }) {
  if (main === "FLOWER") return <FlowerPage />;
  if (main === "PLANT") return <PlantPage />;
  if (main === "PROPOSE") return <ProposePage />;
  if (main === "CEREMONY") return <CeremonyPage />;
  if (main === "WEDDING") return <Coming title="WEDDING" />;
  return <Coming title="FLOWER CLASS" />;
}

function Footer() {
  return <footer className="footer"><b>대전꽃백화점</b><div style={{ marginTop: 8 }}>대표자 : 주현식<br />사업자등록번호 : 305-90-83979<br />통신판매업 신고번호 : 제2023-대전동구-0327호<br />대전광역시 동구 가오동 584 1층 대전꽃백화점<br />T. 042-272-8815<br />E. Daejeonflowershop@gmail.com</div><div className="footer-links"><span>이용약관</span><span>개인정보처리방침</span><span>사업자정보확인</span></div><div style={{ marginTop: 16 }}>© DAEJEON FLOWER DEPARTMENT STORE.</div></footer>;
}

export default function Home() {
  const [entered, setEntered] = useState(false); const [route, setRoute] = useState<Route>({ kind: "home" }); const [consult, setConsult] = useState(false);
  const navigate = (next: Route) => { setRoute(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const routeTitle = useMemo(() => route.kind === "main" ? route.main : route.kind === "occasion" ? route.occasion : "home", [route]);
  if (!entered) return <><div className="app-shell"><Landing enter={() => { setEntered(true); setTimeout(() => window.scrollTo({ top: 0 }), 0); }} consult={() => setConsult(true)} /></div>{consult && <ConsultSheet close={() => setConsult(false)} />}</>;
  return <main><div className="app-shell"><header className="site-header"><button className="wordmark" onClick={() => navigate({ kind: "home" })}><div className="wordmark-ko">대전꽃백화점</div><div className="wordmark-en">DAEJEON FLOWER DEPARTMENT STORE</div></button><button className="header-action" onClick={() => setConsult(true)}>상담</button></header>{route.kind === "home" ? <StoreHome navigate={navigate} consult={() => setConsult(true)} /> : <div className="content"><button className="back-btn" onClick={() => navigate({ kind: "home" })}>← 홈으로</button>{route.kind === "main" ? <MainPage main={route.main} /> : <OccasionPage occasion={route.occasion} navigate={navigate} />}</div>}<Footer /></div>{consult && <ConsultSheet close={() => setConsult(false)} />}<div style={{ display: "none" }}>{routeTitle}</div></main>;
}
