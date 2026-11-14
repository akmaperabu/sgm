-- ==============================================================================
-- DATABASE INDEXING MIGRATION UNTUK SUPABASE POSTGRESQL (SGM)
-- Eksekusi skrip ini di SQL Editor Supabase untuk mempercepat query, filter, & join.
-- ==============================================================================

-- 1. TABEL: users
-- Mengoptimalkan filter user aktif dan pengecekan role/site
CREATE INDEX IF NOT EXISTS idx_users_site_role ON users(site_id, role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 2. TABEL: periods
-- Mengoptimalkan pencarian periode aktif dan rentang tanggal
CREATE INDEX IF NOT EXISTS idx_periods_is_active ON periods(is_active);
CREATE INDEX IF NOT EXISTS idx_periods_dates ON periods(start_date, end_date);

-- 3. TABEL: inventory_items
-- Mengoptimalkan filter barang aktif per site dan pencarian kode
CREATE INDEX IF NOT EXISTS idx_inventory_items_site_active ON inventory_items(site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);

-- 4. TABEL: inventory_stock_cards
-- Mengoptimalkan join FK ke period dan item pada aggregate & query kartu stok
CREATE INDEX IF NOT EXISTS idx_stock_cards_period_id ON inventory_stock_cards(period_id);
CREATE INDEX IF NOT EXISTS idx_stock_cards_item_id ON inventory_stock_cards(item_id);

-- 5. TABEL: stock_movements
-- Mengoptimalkan mutasi stok, riwayat audit, dan sorting tanggal terbaru
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_period_id ON stock_movements(period_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);

-- 6. TABEL: goods_issues
-- Mengoptimalkan relasi FK pemohon, barang, tiket, serta urutan tanggal
CREATE INDEX IF NOT EXISTS idx_goods_issues_requested_by ON goods_issues(requested_by);
CREATE INDEX IF NOT EXISTS idx_goods_issues_item_id ON goods_issues(item_id);
CREATE INDEX IF NOT EXISTS idx_goods_issues_ticket_id ON goods_issues(ticket_id);
CREATE INDEX IF NOT EXISTS idx_goods_issues_created_at ON goods_issues(created_at DESC);

-- 7. TABEL: purchase_requests
-- Mengoptimalkan filter status per site (tanpa periodId), relasi FK, dan urutan tanggal
CREATE INDEX IF NOT EXISTS idx_purchase_requests_site_status ON purchase_requests(site_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by ON purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_item_id ON purchase_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_vendor_id ON purchase_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);

-- 8. TABEL: assets
-- Mengoptimalkan filter aset aktif per kategori, dan peringatan H-7 jadwal jatuh tempo
CREATE INDEX IF NOT EXISTS idx_assets_site_cat_active ON assets(site_id, category, is_active);
CREATE INDEX IF NOT EXISTS idx_assets_active_due ON assets(is_active, next_due_date);

-- 9. TABEL: maintenance_tickets
-- Mengoptimalkan relasi FK pemohon, aset, filter jatuh tempo, dan urutan tanggal
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_requested_by ON maintenance_tickets(requested_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_asset_id ON maintenance_tickets(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_due_date ON maintenance_tickets(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_created_at ON maintenance_tickets(created_at DESC);
