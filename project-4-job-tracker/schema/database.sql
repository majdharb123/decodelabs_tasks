CREATE TABLE IF NOT EXISTS public.applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    company VARCHAR(100) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    applied_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Applied',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT applications_company_not_blank
        CHECK (LENGTH(BTRIM(company)) > 0),

    CONSTRAINT applications_job_title_not_blank
        CHECK (LENGTH(BTRIM(job_title)) > 0),

    CONSTRAINT applications_status_valid
        CHECK (status IN ('Applied', 'Interview', 'Offer', 'Rejected'))
);