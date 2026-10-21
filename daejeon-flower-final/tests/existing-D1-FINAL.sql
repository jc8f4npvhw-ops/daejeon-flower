PRAGMA foreign_keys = ON;

-- 대전꽃백화점 Cloudflare D1 schema FINAL v2 · final homepage aligned · 2026-10-17
-- 이미지 파일 자체는 R2에 저장하고, D1에는 r2_key/메타데이터만 저장합니다.
-- 금액은 모두 원(KRW) 단위 INTEGER로 저장합니다.

-- 1) 관리자 계정
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','DRIVER')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_name TEXT,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- 2) 공통 이미지 메타데이터 (실제 파일은 R2)
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT,
  original_name TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  uploaded_by_admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 3) 카테고리 / 상품
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  code TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  cover_media_id INTEGER,
  sales_mode TEXT NOT NULL DEFAULT 'ORDER'
    CHECK (sales_mode IN ('ORDER','CONSULT','COMING_SOON')),
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  short_description TEXT,
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'GENERIC',
  sales_mode TEXT NOT NULL DEFAULT 'ORDER'
    CHECK (sales_mode IN ('ORDER','CONSULT','COMING_SOON')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  is_best INTEGER NOT NULL DEFAULT 0 CHECK (is_best IN (0,1)),
  pickup_allowed INTEGER NOT NULL DEFAULT 1 CHECK (pickup_allowed IN (0,1)),
  delivery_allowed INTEGER NOT NULL DEFAULT 1 CHECK (delivery_allowed IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- FLOWER의 제작자/스타일 (대전꽃백화점 스타일, 바이닐 스타일)
CREATE TABLE IF NOT EXISTS product_styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name_ko TEXT NOT NULL,
  maker_name TEXT,
  maker_intro TEXT,
  profile_media_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, code),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_media_id) REFERENCES media(id) ON DELETE SET NULL
);

-- 실제 판매 단위: 사이즈/송이수/예산/패키지/화분 등
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  style_id INTEGER,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  secondary_label TEXT,
  variant_type TEXT NOT NULL DEFAULT 'GENERIC',
  price_krw INTEGER,
  is_best INTEGER NOT NULL DEFAULT 0 CHECK (is_best IN (0,1)),
  pickup_allowed INTEGER NOT NULL DEFAULT 1 CHECK (pickup_allowed IN (0,1)),
  delivery_allowed INTEGER NOT NULL DEFAULT 1 CHECK (delivery_allowed IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, style_id, code),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES product_styles(id) ON DELETE SET NULL
);

-- 쇼핑백/보자기/호텔 추가옵션처럼 가격이 붙는 옵션
CREATE TABLE IF NOT EXISTS product_option_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'SINGLE'
    CHECK (selection_type IN ('SINGLE','MULTI','BOOLEAN')),
  is_required INTEGER NOT NULL DEFAULT 0 CHECK (is_required IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, code),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  price_delta_krw INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  UNIQUE(group_id, code),
  FOREIGN KEY (group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE
);

-- 상품/스타일/정확한 사이즈에 실제 사진을 연결
CREATE TABLE IF NOT EXISTS product_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  style_id INTEGER,
  variant_id INTEGER,
  media_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'GALLERY'
    CHECK (role IN ('HERO','GALLERY','STYLE_GALLERY','VARIANT_EXAMPLE','DETAIL','PROFILE')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES product_styles(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- 4) Occasion
CREATE TABLE IF NOT EXISTS occasions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  description TEXT,
  media_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS occasion_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occasion_id INTEGER NOT NULL,
  category_id INTEGER,
  product_id INTEGER,
  style_id INTEGER,
  variant_id INTEGER,
  label TEXT,
  preset_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  CHECK (category_id IS NOT NULL OR product_id IS NOT NULL),
  FOREIGN KEY (occasion_id) REFERENCES occasions(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES product_styles(id) ON DELETE SET NULL,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- 5) 고객
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_normalized TEXT UNIQUE,
  name TEXT,
  kakao_user_id TEXT UNIQUE,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6) 주문
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  source_occasion_id INTEGER,

  -- PENDING_PAYMENT는 결제 중인 서버 내부 상태이며 관리자 화면에는 노출하지 않음
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT','NEW','IN_PRODUCTION','PICKED_UP','DELIVERED','CANCELLED')),
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN ('NOT_REQUIRED','PENDING','PAID','FAILED','CANCELLED','PARTIAL_REFUND','REFUNDED')),

  sales_channel TEXT NOT NULL DEFAULT 'WEB'
    CHECK (sales_channel IN ('WEB','ADMIN')),
  fulfillment_type TEXT NOT NULL
    CHECK (fulfillment_type IN ('PICKUP','DELIVERY','SERVICE')),

  orderer_name TEXT NOT NULL,
  orderer_phone TEXT NOT NULL,
  kakao_updates_enabled INTEGER NOT NULL DEFAULT 0 CHECK (kakao_updates_enabled IN (0,1)),
  recipient_name TEXT,
  recipient_phone TEXT,
  fulfillment_at TEXT,

  delivery_postcode TEXT,
  delivery_address1 TEXT,
  delivery_address2 TEXT,
  delivery_note TEXT,
  delivery_fee_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED'
    CHECK (delivery_fee_status IN ('NOT_REQUIRED','PENDING','CONFIRMED')),
  delivery_fee_krw INTEGER NOT NULL DEFAULT 0,

  subtotal_krw INTEGER NOT NULL DEFAULT 0,
  options_krw INTEGER NOT NULL DEFAULT 0,
  discount_krw INTEGER NOT NULL DEFAULT 0,
  total_krw INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',

  request_note TEXT,
  accepted_by_admin_id INTEGER,
  completed_by_admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (source_occasion_id) REFERENCES occasions(id) ON DELETE SET NULL,
  FOREIGN KEY (accepted_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 과거 주문이 상품 수정 후에도 변하지 않도록 주문 당시 이름/가격을 스냅샷으로 보존
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  style_id INTEGER,
  variant_id INTEGER,
  product_name_snapshot TEXT NOT NULL,
  style_name_snapshot TEXT,
  variant_name_snapshot TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_krw INTEGER NOT NULL DEFAULT 0,
  option_price_krw INTEGER NOT NULL DEFAULT 0,
  line_total_krw INTEGER NOT NULL DEFAULT 0,
  customization_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (style_id) REFERENCES product_styles(id) ON DELETE SET NULL,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_item_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  group_code TEXT,
  option_code TEXT,
  label_snapshot TEXT NOT NULL,
  value_snapshot TEXT,
  price_delta_krw INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- 카드 메시지 / 리본 문구를 관리자 화면에서 명확하게 보여주기 위한 구조
CREATE TABLE IF NOT EXISTS order_item_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL UNIQUE,
  message_type TEXT NOT NULL CHECK (message_type IN ('NONE','CARD','RIBBON')),
  card_message TEXT,
  ribbon_left TEXT,
  ribbon_right TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- 7) 결제
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_payment_key TEXT,
  provider_order_id TEXT,
  method TEXT,
  amount_krw INTEGER NOT NULL,
  cancelled_amount_krw INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','PARTIAL_REFUND','REFUNDED')),
  receipt_url TEXT,
  failure_code TEXT,
  failure_message TEXT,
  approved_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_key
ON payments(provider, provider_payment_key)
WHERE provider_payment_key IS NOT NULL;

-- 8) 동의 기록
CREATE TABLE IF NOT EXISTS order_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('PRIVACY','MARKETING','ANNIVERSARY')),
  is_agreed INTEGER NOT NULL CHECK (is_agreed IN (0,1)),
  policy_version TEXT NOT NULL,
  evidence_json TEXT,
  agreed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, consent_type),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 9) 배송/완성 사진
CREATE TABLE IF NOT EXISTS order_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'DELIVERY_COMPLETE'
    CHECK (kind IN ('DELIVERY_COMPLETE','ORDER_COMPLETE')),
  is_feed_candidate INTEGER NOT NULL DEFAULT 1 CHECK (is_feed_candidate IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- 10) 알림톡/SMS 발송 로그
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  customer_id INTEGER,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('KAKAO_ALIMTALK','SMS')),
  recipient_phone TEXT NOT NULL,
  template_code TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  provider_message_id TEXT,
  failure_reason TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- 11) 기념일 CRM
CREATE TABLE IF NOT EXISTS anniversaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  relationship_label TEXT,
  occasion_type TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  notify_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notify_enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 일반 쿠폰 관리자 기능이 아니라 '기념일 D-7 2,000원' 전용
CREATE TABLE IF NOT EXISTS anniversary_benefits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anniversary_id INTEGER NOT NULL,
  benefit_year INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  amount_krw INTEGER NOT NULL DEFAULT 2000,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED'
    CHECK (status IN ('ISSUED','USED','EXPIRED','CANCELLED')),
  used_order_id INTEGER,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT,
  UNIQUE(anniversary_id, benefit_year),
  FOREIGN KEY (anniversary_id) REFERENCES anniversaries(id) ON DELETE CASCADE,
  FOREIGN KEY (used_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- 12) 메인 실제 제작사진 피드
CREATE TABLE IF NOT EXISTS feed_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_order_media_id INTEGER,
  media_id INTEGER NOT NULL,
  product_id INTEGER,
  occasion_id INTEGER,
  caption TEXT,
  cta_type TEXT NOT NULL DEFAULT 'NONE'
    CHECK (cta_type IN ('NONE','ORDER','CONSULT','NAVER')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','HIDDEN')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_order_media_id) REFERENCES order_media(id) ON DELETE SET NULL,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (occasion_id) REFERENCES occasions(id) ON DELETE SET NULL
);

-- 13) AI 콘텐츠 초안
CREATE TABLE IF NOT EXISTS content_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_item_id INTEGER,
  media_id INTEGER,
  channel TEXT NOT NULL CHECK (channel IN ('NAVER_BLOG','INSTAGRAM','THREADS')),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PUBLISHED')),
  published_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_item_id) REFERENCES feed_items(id) ON DELETE SET NULL,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

-- 14) 랜딩/문구/이미지를 관리자에서 수정하기 위한 CMS
CREATE TABLE IF NOT EXISTS content_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  media_id INTEGER,
  cta_label TEXT,
  cta_url TEXT,
  payload_json TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
  updated_by_admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 15) 공통 설정
CREATE TABLE IF NOT EXISTS settings (
  setting_key TEXT PRIMARY KEY,
  value_text TEXT,
  value_type TEXT NOT NULL DEFAULT 'STRING'
    CHECK (value_type IN ('STRING','BOOLEAN','NUMBER','JSON')),
  description TEXT,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 16) 영업시간 / 휴무 / 일별 주문 제한
CREATE TABLE IF NOT EXISTS business_hours (
  weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0,1)),
  open_time TEXT,
  close_time TEXT,
  pickup_start_time TEXT,
  pickup_end_time TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_closures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  closure_date TEXT NOT NULL UNIQUE,
  is_closed INTEGER NOT NULL DEFAULT 1 CHECK (is_closed IN (0,1)),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_capacity (
  capacity_date TEXT PRIMARY KEY,
  is_accepting_orders INTEGER NOT NULL DEFAULT 1 CHECK (is_accepting_orders IN (0,1)),
  max_orders INTEGER,
  memo TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17) 네이버 등 외부링크 클릭 통계
CREATE TABLE IF NOT EXISTS outbound_click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  destination TEXT NOT NULL,
  anonymous_session_id TEXT,
  order_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- 18) 인덱스
CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_variants_product
ON product_variants(product_id, style_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_media_lookup
ON product_media(product_id, style_id, variant_id, role, sort_order);

CREATE INDEX IF NOT EXISTS idx_orders_status_time
ON orders(status, fulfillment_at);

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment
ON orders(fulfillment_type, fulfillment_at);

CREATE INDEX IF NOT EXISTS idx_orders_phone
ON orders(orderer_phone);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_order
ON payments(order_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_status
ON notifications(status, created_at);

CREATE INDEX IF NOT EXISTS idx_order_media_order
ON order_media(order_id, kind);

CREATE INDEX IF NOT EXISTS idx_feed_status_order
ON feed_items(status, sort_order);

CREATE INDEX IF NOT EXISTS idx_outbound_event
ON outbound_click_events(event_key, created_at);


-- style_id가 NULL인 상품도 같은 코드의 variant가 중복 생성되지 않도록 보강
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_product_code_no_style
ON product_variants(product_id, code)
WHERE style_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_product_style_code
ON product_variants(product_id, style_id, code)
WHERE style_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_orderer_name
ON orders(orderer_name);

CREATE INDEX IF NOT EXISTS idx_order_messages_item
ON order_item_messages(order_item_id);

-- =========================================================
-- INITIAL DATA
-- =========================================================

PRAGMA foreign_keys = ON;

-- 대전꽃백화점 FINAL seed v2 · daejeon-flower-homepage.html(v6) 기준
-- schema FINAL v2를 먼저 실행한 뒤 적용합니다.

-- 1) 상위 카테고리
INSERT OR IGNORE INTO categories (id,parent_id,code,name_ko,name_en,sales_mode,is_visible,sort_order) VALUES
(1,NULL,'FLOWER','FLOWER','FLOWER','ORDER',1,10),
(2,NULL,'PLANT','PLANT','PLANT','ORDER',1,20),
(3,NULL,'PROPOSE','PROPOSE','PROPOSE','ORDER',1,30),
(4,NULL,'WEDDING','WEDDING','WEDDING','CONSULT',1,40),
(5,NULL,'CEREMONY','CEREMONY','CEREMONY','ORDER',1,50),
(6,NULL,'FLOWER_CLASS','FLOWER CLASS','FLOWER CLASS','CONSULT',1,60);

-- 2) 하위 카테고리
INSERT OR IGNORE INTO categories (id,parent_id,code,name_ko,name_en,sales_mode,is_visible,sort_order) VALUES
(101,1,'FLOWER_BOUQUET','꽃다발','Bouquet','ORDER',1,10),
(102,1,'FLOWER_BASKET','꽃바구니','Flower Basket','ORDER',1,20),
(103,1,'FLOWER_VASE','화병꽃이','Vase Arrangement','ORDER',1,30),
(104,1,'FLOWER_CENTERPIECE','센터피스','Centerpiece','CONSULT',1,40),
(201,2,'PLANT_FOLIAGE','관엽화분','Foliage Plants','ORDER',1,10),
(202,2,'PLANT_ORIENTAL_ORCHID','동양난','Oriental Orchid','ORDER',1,20),
(203,2,'PLANT_WESTERN_ORCHID','서양난','Western Orchid','ORDER',1,30),
(301,3,'PROPOSE_JUST_ROSE','JUST ROSE','JUST ROSE','ORDER',1,10),
(302,3,'PROPOSE_TRUNK','트렁크','Trunk Proposal','ORDER',1,20),
(303,3,'PROPOSE_HOTEL','호텔','Hotel Proposal','ORDER',1,30),
(401,4,'WEDDING_SHOOT','촬영부케','Shoot Bouquet','CONSULT',1,10),
(402,4,'WEDDING_MAIN','본식부케','Wedding Bouquet','CONSULT',1,20),
(403,4,'WEDDING_SPACE','공간장식','Wedding Space Styling','CONSULT',1,30),
(501,5,'CEREMONY_CONDOLENCE','근조화환','Condolence Wreath','ORDER',1,10),
(502,5,'CEREMONY_CELEBRATION','축하화환','Celebration Wreath','ORDER',1,20);

-- 3) 상품
INSERT OR IGNORE INTO products
(id,category_id,code,slug,name_ko,name_en,form_type,sales_mode,is_active,is_best,pickup_allowed,delivery_allowed,sort_order,metadata_json) VALUES
(1001,101,'BOUQUET','bouquet','꽃다발','Bouquet','BOUQUET','ORDER',1,0,1,1,10,NULL),
(1002,102,'FLOWER_BASKET','flower-basket','꽃바구니','Flower Basket','FLOWER_BASKET','ORDER',1,0,1,1,20,NULL),
-- 최종 HTML에서는 화병꽃이를 관리자에서 켜기 전 숨김
(1003,103,'VASE_ARRANGEMENT','vase-arrangement','화병꽃이','Vase Arrangement','VASE','ORDER',0,0,1,1,30,NULL),
(1004,104,'CENTERPIECE','centerpiece','센터피스','Centerpiece','CENTERPIECE','CONSULT',1,0,0,0,40,NULL),

(2001,201,'MONEY_TREE','money-tree','금전수',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,10,NULL),
(2002,201,'BENGAL_RUBBER','bengal-rubber','뱅갈고무나무',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,20,NULL),
(2003,201,'GREEN_BO','green-bo','녹보수',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,30,NULL),
-- 최종 HTML의 초기 숨김 식물 3종
(2004,201,'FIDDLE_LEAF_FIG','fiddle-leaf-fig','떡갈고무나무',NULL,'FOLIAGE_PLANT','ORDER',0,0,1,1,40,NULL),
(2005,201,'BIRD_OF_PARADISE','bird-of-paradise','극락조',NULL,'FOLIAGE_PLANT','ORDER',0,0,1,1,50,NULL),
(2006,201,'ARECA_PALM','areca-palm','야레카야자',NULL,'FOLIAGE_PLANT','ORDER',0,0,1,1,60,NULL),
(2007,201,'INDIA_RUBBER','india-rubber','인도고무나무',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,70,NULL),
(2008,201,'SNOW_SAPPHIRE','snow-sapphire','스노우사파이어',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,80,NULL),
(2009,201,'GAJIMARU','gajimaru','가지마루',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,90,NULL),
(2010,201,'SONG_OF_INDIA','song-of-india','송오브 인디아',NULL,'FOLIAGE_PLANT','ORDER',1,0,1,1,100,NULL),

(2101,202,'ORIENTAL_ORCHID','oriental-orchid','동양난','Oriental Orchid','ORIENTAL_ORCHID','ORDER',1,0,1,1,10,'{"seasonal":{"summer":"황룡관","winter":"산천조"}}'),
(2201,203,'WESTERN_ORCHID','western-orchid','서양난','Western Orchid','WESTERN_ORCHID','ORDER',1,0,1,1,10,NULL),

(3001,301,'JUST_ROSE','just-rose','JUST ROSE','JUST ROSE','JUST_ROSE','ORDER',1,0,1,1,10,NULL),
(3002,302,'TRUNK_PROPOSAL','trunk-proposal','트렁크 프로포즈','Trunk Proposal','TRUNK_PROPOSAL','ORDER',1,0,0,0,20,'{"serviceHoursApprox":2}'),
(3003,303,'HOTEL_PROPOSAL','hotel-proposal','호텔 프로포즈','Hotel Proposal','HOTEL_PROPOSAL','ORDER',1,0,0,0,30,NULL),

(4001,401,'WEDDING_SHOOT_BOUQUET','wedding-shoot-bouquet','촬영부케','Shoot Bouquet','WEDDING','CONSULT',1,0,0,0,10,NULL),
(4002,402,'WEDDING_MAIN_BOUQUET','wedding-main-bouquet','본식부케','Wedding Bouquet','WEDDING','CONSULT',1,0,0,0,20,NULL),
(4003,403,'WEDDING_SPACE_STYLING','wedding-space-styling','공간장식','Space Styling','WEDDING','CONSULT',1,0,0,0,30,NULL),

(5001,501,'CONDOLENCE_WREATH','condolence-wreath','근조화환','Condolence Wreath','CONDOLENCE','ORDER',1,0,0,1,10,NULL),
(5002,502,'CELEBRATION_WREATH','celebration-wreath','축하화환','Celebration Wreath','CELEBRATION','ORDER',1,0,0,1,20,NULL),

(6001,6,'FLOWER_CLASS','flower-class','플라워 클래스','Flower Class','FLOWER_CLASS','CONSULT',1,0,0,0,10,NULL);

-- 4) FLOWER 스타일
INSERT OR IGNORE INTO product_styles (id,product_id,code,name_ko,maker_name,maker_intro,sort_order) VALUES
(1101,1001,'DFDS','대전꽃백화점 스타일','임나혜','화훼장식기사 자격을 보유한 24년 차 플로리스트. 합리적인 가격대와 고객 맞춤형 스타일을 지향합니다.',10),
(1102,1001,'VINYL','바이닐 스타일','주혁','로드샵·웨딩홀·웨딩스튜디오 경력의 8년 차 플로리스트. 톤온톤 컬러 배색과 라인감을 중시합니다.',20),
(1201,1002,'DFDS','대전꽃백화점 스타일','임나혜',NULL,10),
(1202,1002,'VINYL','바이닐 스타일','주혁',NULL,20),
(1301,1003,'DFDS','대전꽃백화점 스타일','임나혜',NULL,10),
(1302,1003,'VINYL','바이닐 스타일','주혁',NULL,20);

-- 5) 꽃다발: 최종 HTML 확정 가격
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(11101,1001,1101,'S','S','SIZE',35000,0,1,0,10),
(11102,1001,1101,'M','M','SIZE',50000,0,1,1,20),
(11103,1001,1101,'L','L','SIZE',70000,0,1,1,30),
(11104,1001,1101,'XL','XL','SIZE',100000,0,1,1,40),
(11105,1001,1101,'SPECIAL','SPECIAL','SIZE',200000,0,1,1,50),
(11201,1001,1102,'S','S','SIZE',37000,0,1,0,10),
(11202,1001,1102,'M','M','SIZE',57000,0,1,1,20),
(11203,1001,1102,'L','L','SIZE',93000,0,1,1,30),
(11204,1001,1102,'XL','XL','SIZE',120000,0,1,1,40),
(11205,1001,1102,'SPECIAL','SPECIAL','SIZE',280000,0,1,1,50);

-- 꽃바구니: 최종 HTML은 M/L/XL/SPECIAL, 가격은 아직 미확정
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(12102,1002,1201,'M','M','SIZE',NULL,0,1,1,20),(12103,1002,1201,'L','L','SIZE',NULL,0,1,1,30),(12104,1002,1201,'XL','XL','SIZE',NULL,0,1,1,40),(12105,1002,1201,'SPECIAL','SPECIAL','SIZE',NULL,0,1,1,50),
(12202,1002,1202,'M','M','SIZE',NULL,0,1,1,20),(12203,1002,1202,'L','L','SIZE',NULL,0,1,1,30),(12204,1002,1202,'XL','XL','SIZE',NULL,0,1,1,40),(12205,1002,1202,'SPECIAL','SPECIAL','SIZE',NULL,0,1,1,50);

-- 화병꽃이: 최종 HTML은 S/M/L/XL/SPECIAL, 가격은 아직 미확정
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(13101,1003,1301,'S','S','SIZE',NULL,0,1,0,10),(13102,1003,1301,'M','M','SIZE',NULL,0,1,1,20),(13103,1003,1301,'L','L','SIZE',NULL,0,1,1,30),(13104,1003,1301,'XL','XL','SIZE',NULL,0,1,1,40),(13105,1003,1301,'SPECIAL','SPECIAL','SIZE',NULL,0,1,1,50),
(13201,1003,1302,'S','S','SIZE',NULL,0,1,0,10),(13202,1003,1302,'M','M','SIZE',NULL,0,1,1,20),(13203,1003,1302,'L','L','SIZE',NULL,0,1,1,30),(13204,1003,1302,'XL','XL','SIZE',NULL,0,1,1,40),(13205,1003,1302,'SPECIAL','SPECIAL','SIZE',NULL,0,1,1,50);

-- 꽃다발 쇼핑백 +2,000원
INSERT OR IGNORE INTO product_option_groups (id,product_id,code,label,selection_type,is_required,sort_order) VALUES
(1,1001,'SHOPPING_BAG','쇼핑백','BOOLEAN',0,10);
INSERT OR IGNORE INTO product_options (id,group_id,code,label,price_delta_krw,sort_order) VALUES
(1,1,'ADD','쇼핑백 +2,000원',2000,10);

-- 6) 관엽화분: 최종 HTML의 실제 사이즈와 일치
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,pickup_allowed,delivery_allowed,sort_order) VALUES
(20101,2001,NULL,'S','S','SIZE',NULL,1,1,10),(20102,2001,NULL,'M','M','SIZE',NULL,1,1,20),(20103,2001,NULL,'L','L','SIZE',NULL,1,1,30),
(20201,2002,NULL,'S','S','SIZE',NULL,1,1,10),(20202,2002,NULL,'M','M','SIZE',NULL,1,1,20),(20203,2002,NULL,'L','L','SIZE',NULL,1,1,30),(20204,2002,NULL,'XL','XL','SIZE',NULL,1,1,40),
(20301,2003,NULL,'S','S','SIZE',NULL,1,1,10),(20302,2003,NULL,'M','M','SIZE',NULL,1,1,20),(20303,2003,NULL,'L','L','SIZE',NULL,1,1,30),(20304,2003,NULL,'XL','XL','SIZE',NULL,1,1,40),
(20401,2004,NULL,'S','S','SIZE',NULL,1,1,10),(20402,2004,NULL,'M','M','SIZE',NULL,1,1,20),(20403,2004,NULL,'L','L','SIZE',NULL,1,1,30),
(20501,2005,NULL,'S','S','SIZE',NULL,1,1,10),(20502,2005,NULL,'M','M','SIZE',NULL,1,1,20),(20503,2005,NULL,'L','L','SIZE',NULL,1,1,30),
(20602,2006,NULL,'M','M','SIZE',NULL,1,1,20),(20603,2006,NULL,'L','L','SIZE',NULL,1,1,30),
(20703,2007,NULL,'L','L','SIZE',NULL,1,1,30),
(20802,2008,NULL,'M','M','SIZE',NULL,1,1,20),
(20903,2009,NULL,'L','L','SIZE',NULL,1,1,30),
(21002,2010,NULL,'M','M','SIZE',NULL,1,1,20);

-- 7) 동양난 / 서양난
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(21101,2101,NULL,'GENERAL_POT','일반분','POT',70000,0,1,1,10),
(21102,2101,NULL,'CARVED_POT','투각분','POT',100000,1,1,1,20),
(21103,2101,NULL,'WHITE_PORCELAIN','백자분','POT',180000,0,1,1,30),
(22101,2201,NULL,'50000','50,000원','BUDGET',50000,0,1,1,10),
(22102,2201,NULL,'60000','60,000원','BUDGET',60000,0,1,1,20),
(22103,2201,NULL,'80000','80,000원','BUDGET',80000,0,1,1,30),
(22104,2201,NULL,'100000','100,000원','BUDGET',100000,0,1,1,40),
(22105,2201,NULL,'150000','150,000원','BUDGET',150000,0,1,1,50);
INSERT OR IGNORE INTO product_option_groups (id,product_id,code,label,selection_type,is_required,sort_order) VALUES
(2,2201,'WRAP','보자기 포장','BOOLEAN',0,10);
INSERT OR IGNORE INTO product_options (id,group_id,code,label,price_delta_krw,sort_order) VALUES
(2,2,'BOJAGI','보자기 포장 +15,000원',15000,10);

-- 8) JUST ROSE
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(30101,3001,NULL,'20','20송이','COUNT',100000,0,1,1,10),
(30102,3001,NULL,'30','30송이','COUNT',145000,1,1,1,20),
(30103,3001,NULL,'50','50송이','COUNT',240000,0,1,1,30),
(30104,3001,NULL,'100','100송이','COUNT',450000,0,1,1,40);
INSERT OR IGNORE INTO product_option_groups (id,product_id,code,label,selection_type,is_required,sort_order) VALUES
(3,3001,'ROSE_COLOR','장미 컬러','SINGLE',1,10);
INSERT OR IGNORE INTO product_options (group_id,code,label,price_delta_krw,sort_order) VALUES
(3,'RED','빨간색 · 열정적인 사랑',0,10),
(3,'ORANGE','주황색 · 첫사랑의 고백',0,20),
(3,'BLUE','파란색 · 불가능의 극복',0,30),
(3,'CORAL','코랄색 · 따뜻한 사랑',0,40),
(3,'PINK','분홍색 · 사랑의 시작',0,50),
(3,'WHITE','흰색 · 존경과 순수의 사랑',0,60);

-- 9) 트렁크 프로포즈: 최종 HTML은 직접 결제 주문형
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(30201,3002,NULL,'BASIC','BASIC','PACKAGE',250000,0,0,0,10),
(30202,3002,NULL,'SIGNATURE','SIGNATURE','PACKAGE',300000,1,0,0,20),
(30203,3002,NULL,'PREMIUM','PREMIUM','PACKAGE',500000,0,0,0,30);
INSERT OR IGNORE INTO product_option_groups (id,product_id,code,label,selection_type,is_required,sort_order) VALUES
(4,3002,'TRUNK_MESSAGE','연출 문구','SINGLE',1,10);
INSERT OR IGNORE INTO product_options (group_id,code,label,price_delta_krw,sort_order,metadata_json) VALUES
(4,'GARLAND','MARRY ME 가랜드',0,10,NULL),
(4,'CLOTH','광목천 프린팅',0,20,'{"requiresCustomText":true}');

-- 10) 호텔 프로포즈
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order,metadata_json) VALUES
(30301,3003,NULL,'MINI','MINI','PACKAGE',259900,0,0,0,10,'{"items":["미니 꽃장식 3","미니 화병","꽃길","바닥 미니풍선","대형 레이스천","맞춤 메시지","지류","쇼핑백"]}'),
(30302,3003,NULL,'BASIC','BASIC','PACKAGE',474900,0,0,0,20,'{"items":["특대형 꽃장식 1","테이블 꽃장식 1","화병","꽃길","바닥 미니풍선","대형 레이스천","맞춤 메시지","지류","쇼핑백"]}'),
(30303,3003,NULL,'SIGNATURE','SIGNATURE','PACKAGE',564900,1,0,0,30,'{"items":["특대형 꽃장식 1","테이블 꽃장식 2","화병","꽃다발","꽃길","바닥 미니풍선","레이스천","맞춤 메시지","지류","쇼핑백"]}'),
(30304,3003,NULL,'PREMIUM','PREMIUM','PACKAGE',744900,0,0,0,40,'{"items":["특대형 꽃장식 2","테이블 꽃장식 2","화병","꽃다발","꽃길","바닥 미니풍선","레이스천","맞춤 메시지","지류","쇼핑백"]}');
INSERT OR IGNORE INTO product_option_groups (id,product_id,code,label,selection_type,is_required,sort_order) VALUES
(5,3003,'HOTEL_ADDONS','추가상품','MULTI',0,10);
INSERT OR IGNORE INTO product_options (group_id,code,label,price_delta_krw,sort_order,metadata_json) VALUES
(5,'BW_FRAME_5','흑백 액자 5장',18000,10,NULL),
(5,'HELIUM_10','일반 헬륨 풍선 10개',25000,20,NULL),
(5,'HEART_HELIUM_5','하트 헬륨풍선 5개',20000,30,NULL),
(5,'NATURAL_BOUQUET','네추럴 생화 꽃다발',60000,40,'{"includedIn":["SIGNATURE","PREMIUM"]}'),
(5,'ROSE_BOUQUET','클래식 장미 단일 꽃다발',100000,50,NULL),
(5,'VIRGIN_ROAD','버진로드 꽃길 연출',27000,60,NULL);

-- 11) CEREMONY: 최종 HTML의 직접 주문 상품
INSERT OR IGNORE INTO product_variants
(id,product_id,style_id,code,label,variant_type,price_krw,is_best,pickup_allowed,delivery_allowed,sort_order) VALUES
(50101,5001,NULL,'CONDOLENCE_3','근조 3단','TYPE',100000,1,0,1,10),
(50102,5001,NULL,'CONDOLENCE_4','근조 4단','TYPE',150000,0,0,1,20),
(50103,5001,NULL,'PORTRAIT_BASKET','영정바구니','TYPE',70000,0,0,1,30),
(50201,5002,NULL,'CELEBRATION_3','축하 3단','TYPE',100000,1,0,1,10),
(50202,5002,NULL,'OBJECT_BASIC','생화오브제 BASIC','PACKAGE',100000,0,0,1,20),
(50203,5002,NULL,'OBJECT_SIGNATURE','생화오브제 SIGNATURE','PACKAGE',150000,0,0,1,30),
(50204,5002,NULL,'OBJECT_PREMIUM','생화오브제 PREMIUM','PACKAGE',300000,0,0,1,40);

-- 12) Occasion
INSERT OR IGNORE INTO occasions (id,code,name_ko,sort_order) VALUES
(1,'BIRTHDAY','생일',10),(2,'ANNIVERSARY','기념일',20),(3,'GRADUATION','졸업',30),
(4,'PERSONNEL','인사이동',40),(5,'OPENING','개업',50),(6,'PARENTS','부모님 선물',60),(7,'THANKS','감사',70);

-- 최종 HTML의 추천 배열 그대로 연결 가능한 수준으로 초기화
INSERT OR IGNORE INTO occasion_recommendations
(id,occasion_id,category_id,product_id,style_id,variant_id,label,preset_json,sort_order) VALUES
(1,1,NULL,1001,NULL,NULL,'꽃다발 M','{"size":"M"}',10),
(2,1,NULL,3001,NULL,30102,'JUST ROSE 30','{"count":30}',20),
(3,1,NULL,1002,NULL,NULL,'꽃바구니',NULL,30),
(4,1,NULL,2201,NULL,NULL,'서양난',NULL,40),

(5,2,NULL,3001,NULL,30102,'JUST ROSE 30','{"count":30}',10),
(6,2,NULL,1001,1102,NULL,'바이닐 스타일 꽃다발','{"style":"VINYL"}',20),
(7,2,NULL,3002,NULL,30202,'트렁크 프로포즈','{"package":"SIGNATURE"}',30),
(8,2,NULL,3003,NULL,NULL,'호텔 프로포즈',NULL,40),

(9,3,NULL,1001,NULL,NULL,'꽃다발 S','{"size":"S"}',10),
(10,3,NULL,1001,NULL,NULL,'꽃다발 M','{"size":"M"}',20),
(11,3,NULL,1002,NULL,NULL,'꽃바구니',NULL,30),
(12,3,NULL,2201,NULL,NULL,'서양난',NULL,40),

(13,4,NULL,2101,NULL,NULL,'동양난',NULL,10),
(14,4,NULL,2201,NULL,NULL,'서양난',NULL,20),
(15,4,201,NULL,NULL,NULL,'관엽화분',NULL,30),
(16,4,NULL,1001,NULL,NULL,'꽃다발',NULL,40),

(17,5,201,NULL,NULL,NULL,'관엽화분',NULL,10),
(18,5,NULL,5002,NULL,50201,'축하 3단','{"variant":"CELEBRATION_3"}',20),
(19,5,NULL,5002,NULL,NULL,'생화오브제','{"family":"생화오브제"}',30),
(20,5,NULL,2201,NULL,NULL,'서양난',NULL,40),

(21,6,NULL,1002,NULL,NULL,'꽃바구니',NULL,10),
(22,6,NULL,2201,NULL,NULL,'서양난',NULL,20),

(23,7,NULL,1001,NULL,NULL,'꽃다발 M','{"size":"M"}',10),
(24,7,NULL,1002,NULL,NULL,'꽃바구니',NULL,20),
(25,7,NULL,2201,NULL,NULL,'서양난',NULL,30),
(26,7,NULL,2101,NULL,NULL,'동양난',NULL,40);

-- 13) 운영 설정: 최종 HTML에 실제로 들어있는 값/입력칸 기준
INSERT OR IGNORE INTO settings (setting_key,value_text,value_type,description) VALUES
('store_name','대전꽃백화점','STRING','상호'),
('store_phone','042-272-8815','STRING','매장 전화'),
('store_email','Daejeonflowershop@gmail.com','STRING','이메일'),
('store_address','대전광역시 동구 가오동 584 1층 대전꽃백화점','STRING','매장 주소'),
('business_owner','주현식','STRING','대표자'),
('business_registration_no','305-90-83979','STRING','사업자등록번호'),
('mail_order_no','제2023-대전동구-0327호','STRING','통신판매업 신고번호'),

('kakao_channel_url',NULL,'STRING','카카오톡 채널 URL'),
('naver_smartplace_url','https://map.naver.com/p/entry/place/35194663','STRING','네이버 SmartPlace URL'),
('naver_review_url','https://m.place.naver.com/place/35194663/review/visitor','STRING','네이버 방문자 리뷰 URL'),
('naver_directions_url','https://map.naver.com/p/entry/place/35194663','STRING','네이버 길찾기 URL'),
('kakao_map_url',NULL,'STRING','카카오맵 URL'),
('naver_blog_url',NULL,'STRING','네이버 블로그 URL'),
('instagram_url',NULL,'STRING','Instagram URL'),
('threads_url',NULL,'STRING','Threads URL'),
('site_domain','대전꽃백화점.com','STRING','실제 도메인'),

('business_hours_text','09:00–21:00','STRING','영업시간 표시'),
('pickup_hours_text','09:00–21:00','STRING','픽업 가능시간 표시'),
('parking_notice',NULL,'STRING','주차 안내'),
('delivery_notice',NULL,'STRING','배송설정 안내'),
('closed_notice',NULL,'STRING','휴무일 안내'),
('same_day_cutoff',NULL,'STRING','당일 주문 마감'),
('capacity_notice',NULL,'STRING','주문 가능량 안내'),
('same_day_orders_enabled','true','BOOLEAN','오늘 신규주문 받기'),
('pickup_interval_minutes','30','NUMBER','픽업시간 간격'),
('flower_s_pickup_only','true','BOOLEAN','FLOWER S 사이즈 픽업전용');

-- 매일 09:00–21:00은 최종 HTML의 현재 표시값. 관리자에서 추후 수정 가능.
INSERT OR IGNORE INTO business_hours
(weekday,is_open,open_time,close_time,pickup_start_time,pickup_end_time) VALUES
(0,1,'09:00','21:00','09:00','21:00'),
(1,1,'09:00','21:00','09:00','21:00'),
(2,1,'09:00','21:00','09:00','21:00'),
(3,1,'09:00','21:00','09:00','21:00'),
(4,1,'09:00','21:00','09:00','21:00'),
(5,1,'09:00','21:00','09:00','21:00'),
(6,1,'09:00','21:00','09:00','21:00');

-- 14) 관리자에서 문구/이미지를 쉽게 바꾸기 위한 기본 콘텐츠 블록
INSERT OR IGNORE INTO content_blocks
(block_key,title,subtitle,body,cta_label,cta_url,payload_json,is_enabled) VALUES
('LANDING_HERO','대전꽃백화점','DAEJEON FLOWER DEPARTMENT STORE','Everyday flowers, meaningful moments.','바로 주문하기',NULL,NULL,1),
('NAVER_REVIEW_CTA','네이버에서 더 많은 리뷰 보기',NULL,'실제 방문자 사진과 후기를 확인해보세요.',NULL,'https://m.place.naver.com/place/35194663/review/visitor',NULL,1),
('BOUQUET_REQUEST_GUIDE','꽃다발 요청 가이드',NULL,NULL,NULL,NULL,'{"pages":[{"page":1,"title":"꽃다발 요청 가이드","summary":"사이즈를 고르고, 원하는 컬러·꽃 느낌과 사용처를 가볍게 알려주세요."},{"page":2,"title":"사이즈 선택","items":{"S":"가볍게 건네는 작은 선물","M":"축하와 감사의 마음을 전할 때","L":"조금 더 풍성하게 전하고 싶을 때","XL":"큰 꽃다발을 생각하고 있을 때","SPECIAL":"원하는 구성을 함께 정할 때"}},{"page":3,"title":"요청사항","summary":"원하시는 컬러나 꽃, 사용처를 가볍게 남겨주세요. 꽃 이름을 몰라도 괜찮아요."}]}',1);
