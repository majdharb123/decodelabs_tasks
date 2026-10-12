// Temporary preview data. API integration replaces this with saved records.
const applications = [
  {
    id: "1",
    company: "CedarTech",
    job_title: "Junior Full-Stack Developer",
    applied_date: "2026-10-11",
    status: "Applied",
  },
  {
    id: "2",
    company: "NorthWeb",
    job_title: "Front-End Developer",
    applied_date: "2026-10-10",
    status: "Interview",
  },
  {
    id: "3",
    company: "Beirut Digital",
    job_title: "Software Engineer",
    applied_date: "2026-10-09",
    status: "Applied",
  },
  {
    id: "4",
    company: "Atlas Studio",
    job_title: "Web Developer",
    applied_date: "2026-10-08",
    status: "Offer",
  },
];

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const applicationsBody = document.getElementById("applications-body");
const applicationDialog = document.getElementById("application-dialog");
const deleteDialog = document.getElementById("delete-dialog");
const applicationForm = document.getElementById("application-form");
const dialogTitle = document.getElementById("application-dialog-title");
const saveButton = document.getElementById("save-application-button");

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
  document.getElementById("total-count").textContent = applications.length;

  for (const status of ["Applied", "Interview", "Offer"]) {
    document.getElementById(status.toLowerCase() + "-count").textContent =
      applications.filter((application) => application.status === status).length;
  }
}

function renderApplications() {
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
    const row = document.createElement("tr");
    const cell = makeCell("", "empty-state");
    cell.colSpan = 5;

    const title = document.createElement("strong");
    title.textContent = "No matching applications";
    const hint = document.createElement("span");
    hint.textContent = "Try a different search or choose All statuses.";

    cell.append(title, hint);
    row.append(cell);
    applicationsBody.append(row);
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
  applicationForm.reset();
  document.getElementById("form-error").hidden = true;

  document.getElementById("application-id").value = application?.id || "";
  document.getElementById("company-input").value = application?.company || "";
  document.getElementById("job-title-input").value = application?.job_title || "";
  document.getElementById("applied-date-input").value =
    application?.applied_date || todayDate();
  document.getElementById("application-status-input").value =
    application?.status || "Applied";

  dialogTitle.textContent = application ? "Edit application" : "Add application";
  saveButton.textContent = application ? "Save changes" : "Save application";
  openDialog(applicationDialog);
}

document.getElementById("add-application-button").addEventListener("click", () => {
  openApplicationForm();
});

applicationsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const application = applications.find((item) => item.id === button.dataset.id);
  if (!application) return;

  if (button.dataset.action === "edit") {
    openApplicationForm(application);
  } else {
    document.getElementById("delete-application-name").textContent =
      application.job_title + " at " + application.company;
    document.getElementById("delete-error").hidden = true;
    openDialog(deleteDialog);
  }
});

for (const button of document.querySelectorAll("[data-close-dialog]")) {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  });
}

for (const dialog of [applicationDialog, deleteDialog]) {
  dialog.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]")) {
      document.body.classList.remove("dialog-open");
    }
  });

  dialog.addEventListener("click", (event) => {
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

// Save/delete remain disabled until the API integration step.
applicationForm.addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", renderApplications);
statusFilter.addEventListener("change", renderApplications);

renderSummary();
renderApplications();
