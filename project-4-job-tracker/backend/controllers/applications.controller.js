import pool from "../config/db.js";

export async function getApplications(req, res) {
  const result = await pool.query(`
    SELECT
      id,
      company,
      job_title,
      TO_CHAR(applied_date, 'YYYY-MM-DD') AS applied_date,
      status,
      created_at,
      updated_at
    FROM public.applications
    ORDER BY applied_date DESC, id DESC
  `);

  res.status(200).json(result.rows);
}

const APPLICATION_STATUSES = [
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

function validateApplication(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      data: null,
      errors: ["Request body must be a JSON object."],
    };
  }

  const company =
    typeof body.company === "string" ? body.company.trim() : "";

  const job_title =
    typeof body.job_title === "string" ? body.job_title.trim() : "";

  const applied_date =
    typeof body.applied_date === "string" ? body.applied_date.trim() : "";

  const status =
    typeof body.status === "string" ? body.status.trim() : "";

  const errors = [];

  if (!company || Array.from(company).length > 100) {
    errors.push("Company must contain between 1 and 100 characters.");
  }

  if (!job_title || Array.from(job_title).length > 150) {
    errors.push("Job title must contain between 1 and 150 characters.");
  }

  const parsedDate = new Date(`${applied_date}T00:00:00.000Z`);

  const validDate =
    /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(applied_date) &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === applied_date;

  if (!validDate) {
    errors.push(
      "Application date must be a valid date in YYYY-MM-DD format."
    );
  }

  if (!APPLICATION_STATUSES.includes(status)) {
    errors.push(
      "Status must be Applied, Interview, Offer, or Rejected."
    );
  }

  return {
    data: { company, job_title, applied_date, status },
    errors,
  };
}

export async function createApplication(req, res) {
  const { data, errors } = validateApplication(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      message: "Please check the application details.",
      errors,
    });
  }

  const result = await pool.query(
    `
      INSERT INTO public.applications
        (company, job_title, applied_date, status)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        company,
        job_title,
        TO_CHAR(applied_date, 'YYYY-MM-DD') AS applied_date,
        status,
        created_at,
        updated_at
    `,
    [data.company, data.job_title, data.applied_date, data.status]
  );

  res.status(201).json(result.rows[0]);
}

function isValidApplicationId(id) {
  return (
    typeof id === "string" &&
    /^[1-9]\d{0,18}$/.test(id) &&
    BigInt(id) <= 9223372036854775807n
  );
}

export async function updateApplication(req, res) {
  const { id } = req.params;

  if (!isValidApplicationId(id)) {
    return res.status(400).json({
      message: "Application ID must be a valid positive integer.",
    });
  }

  const { data, errors } = validateApplication(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      message: "Please check the application details.",
      errors,
    });
  }

  const result = await pool.query(
    `
      UPDATE public.applications
      SET
        company = $1,
        job_title = $2,
        applied_date = $3,
        status = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        company,
        job_title,
        TO_CHAR(applied_date, 'YYYY-MM-DD') AS applied_date,
        status,
        created_at,
        updated_at
    `,
    [data.company, data.job_title, data.applied_date, data.status, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Application not found.",
    });
  }

  res.status(200).json(result.rows[0]);
}

export async function deleteApplication(req, res) {
  const { id } = req.params;

  if (!isValidApplicationId(id)) {
    return res.status(400).json({
      message: "Application ID must be a valid positive integer.",
    });
  }

  const result = await pool.query(
    `
      DELETE FROM public.applications
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Application not found.",
    });
  }

  res.status(204).end();
}