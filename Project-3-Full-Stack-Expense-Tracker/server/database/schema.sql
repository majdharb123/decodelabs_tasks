CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL
        CHECK (type IN ('income','expense')),
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6'
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    icon VARCHAR(50) NOT NULL DEFAULT 'circle-dollar-sign',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_category_name_type
        UNIQUE(name,type)
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL
        CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),
    type VARCHAR(10) NOT NULL
        CHECK (type IN ('income','expense')),
    category_id BIGINT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transaction_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type
    ON transactions(type);

INSERT INTO categories (name, type, color, icon)
VALUES
    ('Salary','income','#16A34A','briefcase-business'),
    ('Freelance','income','#10B981','laptop'),
    ('Food','expense','#EF4444','shopping-cart'),
    ('Bills','expense','#3B82F6','receipt-text'),
    ('Transport','expense','#F59E0B','car'),
    ('Shopping','expense','#8B5CF6','shopping-bag'),
    ('Health','expense','#EC4899','heart-pulse'),
    ('Entertainment','expense','#6366F1','gamepad-2')
ON CONFLICT (name,type) DO NOTHING;