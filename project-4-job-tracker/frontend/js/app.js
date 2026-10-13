// These records come from the API, rather than hard-coded preview data.
let applications = [];
let isLoading = false;
let loadError = "";
let isSaving = false;
let isDeleting = false;
let pendingDeleteId = "";
let noticeTimer;

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const applicationsBody = document.getElementById("applications-body");
const applicationDialog = document.getElementById("application-dialog");
const deleteDialog = document.getElementById("delete-dialog");
const applicationForm = document.getElementById("application-form");
const dialogTitle = document.getElementById("application-dialog-title");
const saveButton = document.getElementById("save-application-button");
const addButton = document.getElementById("add-application-button");
const formError = document.getElementById("form-error");
const notice = document.getElementById("notice");
const confirmDeleteButton = document.getElementById("confirm-delete-button");
const deleteError = document.getElementById("delete-error");

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function makeCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  cell.className = className;
  return cell;
}

function renderSummary() {
  if (isLoading || loadError) {
    for (const id of ["total-count", "applied-count", "interview-count", "offer-count"]) {
      document.getElementById(id).textContent = "—";
    }
    return;
  }

  document.getElementById("total-count").textContent = applications.length;

  for (const status of ["Applied", "Interview", "Offer"]) {
    document.getElementById(status.toLowerCase() + "-count").textContent =
      applications.filter((application) => application.status === status).length;
  }
}

function renderTableMessage(titleText, hintText, retry = false) {
  const row = document.createElement("tr");
  const cell = makeCell("", "empty-state");
  cell.colSpan = 5;

  const title = document.createElement("strong");
  title.textContent = titleText;
  const hint = document.createElement("span");
  hint.textContent = hintText;
  cell.append(title, hint);

  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary";
    button.dataset.action = "retry";
    button.textContent = "Try again";
    cell.append(document.createElement("br"), button);
  }

  row.append(cell);
  applicationsBody.replaceChildren(row);
}

function renderApplications() {
  if (isLoading) {
    document.getElementById("results-count").textContent = "Loading…";
    renderTableMessage("Loading applications…", "Please wait a moment.");
    return;
  }

  if (loadError) {
    document.getElementById("results-count").textContent = "Unavailable";
    renderTableMessage("Could not load applications", loadError, true);
    return;
  }

  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = applications.filter((application) => {
    const matchesSearch =
      application.company.toLowerCase().includes(search) ||
      application.job_title.toLowerCase().includes(search);
    return matchesSearch && (!status || application.status === status);
  });

  applicationsBody.replaceChildren();
  document.getElementById("results-count").textContent =
    filtered.length + " of " + applications.length + " applications";

  if (filtered.length === 0) {
    renderTableMessage(
      applications.length === 0 ? "No applications yet" : "No matching applications",
      applications.length === 0
        ? "Add your first application to start tracking your progress."
        : "Try a different search or choose All statuses."
    );
    return;
  }

  for (const application of filtered) {
    const row = document.createElement("tr");
    row.append(
      makeCell(application.company, "company-cell"),
      makeCell(application.job_title),
      makeCell(
        dateFormatter.format(new Date(application.applied_date + "T00:00:00.000Z")),
        "date-cell"
      )
    );

    const statusCell = makeCell("");
    const badge = document.createElement("span");
    badge.className = "status-pill status-" + application.status.toLowerCase();
    badge.textContent = application.status;
    statusCell.append(badge);
    row.append(statusCell);

    const actionsCell = makeCell("");
    const actions = document.createElement("div");
    actions.className = "row-actions";

    for (const action of ["edit", "delete"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        action === "delete" ? "row-action row-action-danger" : "row-action";
      button.dataset.action = action;
      button.dataset.id = application.id;
      button.textContent = action === "edit" ? "Edit" : "Delete";
      button.setAttribute(
        "aria-label",
        button.textContent + " " + application.job_title + " at " + application.company
      );
      actions.append(button);
    }

    actionsCell.append(actions);
    row.append(actionsCell);
    applicationsBody.append(row);
  }
}

async function loadApplications() {
  if (isLoading) return;

  isLoading = true;
  loadError = "";
  searchInput.disabled = true;
  statusFilter.disabled = true;
  addButton.disabled = true;
  renderSummary();
  renderApplications();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("/api/applications", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Loading applications failed.");
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("The API did not return an application list.");
    }

    applications = data;
  } catch (error) {
    loadError = error.name === "AbortError"
      ? "The request timed out. Check the server and try again."
      : "Check that the server is running, then try again.";
  } finally {
    clearTimeout(timeout);
    isLoading = false;
    searchInput.disabled = false;
    statusFilter.disabled = false;
    addButton.disabled = isSaving || isDeleting;
    renderSummary();
    renderApplications();
  }
}

// Read validation errors from the API and stop requests that take too long.
async function sendApplicationRequest(path, method, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = response.status === 204
      ? null
      : await response.json().catch(() => null);

    if (!response.ok) {
      const errors = Array.isArray(data?.errors)
        ? data.errors.filter((error) => typeof error === "string")
        : [];
      throw new Error(
        errors.length > 0
          ? errors.join(" ")
          : typeof data?.message === "string"
            ? data.message
            : "The server could not complete the request. Please try again."
      );
    }

    if (method !== "DELETE" && (!data || typeof data !== "object" || !data.id)) {
      throw new Error("Could not confirm the saved application. Refresh the list before trying again.");
    }

    if (method === "DELETE" && response.status !== 204) {
      throw new Error("Could not confirm the deleted application. Refresh the list before trying again.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TypeError") {
      throw new Error("Could not confirm your changes. Refresh the list to check the result before trying again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function showNotice(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimer = setTimeout(() => {
    notice.hidden = true;
  }, 5000);
}

function setFormBusy(busy) {
  isSaving = busy;
  applicationForm.setAttribute("aria-busy", String(busy));
  for (const field of applicationForm.elements) {
    field.disabled = busy;
  }
  document.querySelector('.icon-button[data-close-dialog="application-dialog"]').disabled = busy;
  addButton.disabled = busy || isLoading || isDeleting;
}

async function saveApplication(event) {
  event.preventDefault();
  if (isSaving || isDeleting || !applicationForm.reportValidity()) return;

  const id = document.getElementById("application-id").value;
  const data = {
    company: document.getElementById("company-input").value.trim(),
    job_title: document.getElementById("job-title-input").value.trim(),
    applied_date: document.getElementById("applied-date-input").value,
    status: document.getElementById("application-status-input").value,
  };
  const idleLabel = id ? "Save changes" : "Save application";
  let saved = false;

  clearTimeout(noticeTimer);
  notice.hidden = true;
  formError.hidden = true;
  setFormBusy(true);
  saveButton.textContent = "Saving…";

  try {
    await sendApplicationRequest(
      id ? "/api/applications/" + encodeURIComponent(id) : "/api/applications",
      id ? "PUT" : "POST",
      data
    );
    saved = true;
    applicationDialog.close();
    showNotice(id ? "Application updated." : "Application added.");
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    setFormBusy(false);
    saveButton.textContent = idleLabel;
  }

  // Refresh after a confirmed save; a failed refresh is shown as a loading error.
  if (saved) await loadApplications();
}

function setDeleteBusy(busy) {
  isDeleting = busy;
  deleteDialog.setAttribute("aria-busy", String(busy));
  for (const button of deleteDialog.querySelectorAll("button")) {
    button.disabled = busy;
  }
  confirmDeleteButton.disabled = busy || !pendingDeleteId;
  confirmDeleteButton.textContent = busy ? "Deleting…" : "Delete application";
  addButton.disabled = busy || isLoading || isSaving;
}

async function deleteApplication() {
  if (isDeleting || isSaving || !pendingDeleteId || !deleteDialog.open) return;

  const id = pendingDeleteId;
  let deleted = false;
  clearTimeout(noticeTimer);
  notice.hidden = true;
  deleteError.hidden = true;
  setDeleteBusy(true);

  try {
    await sendApplicationRequest(
      "/api/applications/" + encodeURIComponent(id),
      "DELETE"
    );
    deleted = true;
    deleteDialog.close();
    showNotice("Application deleted.");
  } catch (error) {
    deleteError.textContent = error.message;
    deleteError.hidden = false;
  } finally {
    setDeleteBusy(false);
  }

  if (deleted) await loadApplications();
}

function isDialogBusy(dialog) {
  return (dialog === applicationDialog && isSaving) ||
    (dialog === deleteDialog && isDeleting);
}

function todayDate() {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

function openDialog(dialog) {
  if (!dialog.open) {
    dialog.showModal();
  }
  document.body.classList.add("dialog-open");
}

function openApplicationForm(application = null) {
  if (isSaving || isDeleting || isLoading) return;
  applicationForm.reset();
  formError.hidden = true;

  document.getElementById("application-id").value = application?.id || "";
  document.getElementById("company-input").value = application?.company || "";
  document.getElementById("job-title-input").value = application?.job_title || "";
  document.getElementById("applied-date-input").value =
    application?.applied_date || todayDate();
  document.getElementById("application-status-input").value =
    application?.status || "Applied";

  dialogTitle.textContent = application ? "Edit application" : "Add application";
  saveButton.textContent = application ? "Save changes" : "Save application";
  saveButton.disabled = false;
  openDialog(applicationDialog);
}

addButton.addEventListener("click", () => {
  openApplicationForm();
});

applicationsBody.addEventListener("click", (event) => {
  if (isSaving || isDeleting) return;
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "retry") {
    loadApplications();
    return;
  }

  const application = applications.find((item) => item.id === button.dataset.id);
  if (!application) return;

  if (button.dataset.action === "edit") {
    openApplicationForm(application);
  } else {
    pendingDeleteId = application.id;
    document.getElementById("delete-application-name").textContent =
      application.job_title + " at " + application.company;
    deleteError.hidden = true;
    confirmDeleteButton.disabled = false;
    openDialog(deleteDialog);
  }
});

for (const button of document.querySelectorAll("[data-close-dialog]")) {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.closeDialog);
    if (!isDialogBusy(dialog)) dialog.close();
  });
}

for (const dialog of [applicationDialog, deleteDialog]) {
  dialog.addEventListener("cancel", (event) => {
    if (isDialogBusy(dialog)) event.preventDefault();
  });

  dialog.addEventListener("close", () => {
    if (dialog === deleteDialog) {
      pendingDeleteId = "";
      confirmDeleteButton.disabled = true;
    }
    if (!document.querySelector("dialog[open]")) {
      document.body.classList.remove("dialog-open");
    }
  });

  dialog.addEventListener("click", (event) => {
    if (isDialogBusy(dialog)) return;
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
  });
}

// Each write action runs only after the user submits or confirms it.
applicationForm.addEventListener("submit", saveApplication);
confirmDeleteButton.addEventListener("click", deleteApplication);
searchInput.addEventListener("input", renderApplications);
statusFilter.addEventListener("change", renderApplications);

loadApplications();
