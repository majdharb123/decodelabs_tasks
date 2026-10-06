"use strict";

const API_BASE_URL = "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json();

  if (!response.ok || result.status === "error") {
    throw new Error(
      result.message || "Something went wrong while contacting the server.",
    );
  }

  return result;
}

const state = {
  activePage: "dashboard",
  selectedMonth: "2026-10",
  transactions: [],
  categories: [],
  editingTransactionId: null,
  editingCategoryId: null,
  deleteTarget: null,
  monthlyChart: null,
  categoryChart: null,
};

const pageInformation = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Monitor your money and understand where it goes.",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Search, filter and manage your financial activity.",
  },
  categories: {
    title: "Categories",
    subtitle: "Organize your income and expenses with clear categories.",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/* =========================================================
   Helpers
========================================================= */

function getElement(selector) {
  return document.querySelector(selector);
}

function getElements(selector) {
  return [...document.querySelectorAll(selector)];
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatTransactionAmount(transaction) {
  const prefix = transaction.type === "income" ? "+" : "-";

  return `${prefix}${formatCurrency(transaction.amount)}`;
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function formatMonth(value) {
  const [year, month] = value.split("-").map(Number);

  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function buildMonthOptions() {
  const selectedYear = Number(state.selectedMonth.slice(0, 4));
  const options = [];

  for (let year = selectedYear + 3; year >= selectedYear - 3; year -= 1) {
    for (let month = 12; month >= 1; month -= 1) {
      const value = `${year}-${String(month).padStart(2, "0")}`;

      options.push(`
                <option value="${value}">
                    ${formatMonth(value)}
                </option>
            `);
    }
  }

  return options.join("");
}

function populateMonthSelectors() {
  const monthOptions = buildMonthOptions();
  const globalMonth = getElement("#global-month");
  const transactionMonth = getElement("#transaction-month-filter");

  globalMonth.innerHTML = monthOptions;
  transactionMonth.innerHTML = `
        <option value="">All months</option>
        ${monthOptions}
    `;

  globalMonth.value = state.selectedMonth;
  transactionMonth.value = state.selectedMonth;
}

function getCategory(categoryId) {
  return state.categories.find(
    (category) => String(category.id) === String(categoryId),
  );
}

function getMonthTransactions(month = state.selectedMonth) {
  return state.transactions.filter((transaction) => {
    return transaction.transaction_date.startsWith(month);
  });
}

function sortTransactions(transactions) {
  return [...transactions].sort((first, second) => {
    const dateDifference =
      new Date(second.transaction_date) - new Date(first.transaction_date);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return Number(second.id) - Number(first.id);
  });
}

function hexToRGBA(hexColor, opacity) {
  const normalizedColor = hexColor.replace("#", "");

  if (normalizedColor.length !== 6) {
    return `rgba(99, 102, 241, ${opacity})`;
  }

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* =========================================================
   Navigation and Sidebar
========================================================= */

function navigateTo(pageName) {
  if (!pageInformation[pageName]) {
    return;
  }

  if (window.location.hash !== `#${pageName}`) {
    window.location.hash = pageName;
  }

  state.activePage = pageName;

  getElements(".page-section").forEach((section) => {
    const isActive = section.dataset.page === pageName;

    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  getElements(".navigation-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === pageName);
  });

  const information = pageInformation[pageName];

  getElement("#page-title").textContent = information.title;
  getElement("#page-subtitle").textContent = information.subtitle;

  closeSidebar();

  if (pageName === "dashboard") {
    renderDashboard();
  }

  if (pageName === "transactions") {
    renderTransactionsPage();
  }

  if (pageName === "categories") {
    renderCategoriesPage();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  refreshIcons();
}

function openSidebar() {
  const sidebar = getElement("#sidebar");
  const menuButton = getElement("#mobile-menu-button");

  sidebar.classList.add("open");
  getElement("#sidebar-overlay").hidden = false;
  document.body.classList.add("sidebar-open");
  menuButton.setAttribute("aria-expanded", "true");

  window.requestAnimationFrame(() => {
    getElement("#sidebar-close").focus();
  });
}

function closeSidebar() {
  const sidebar = getElement("#sidebar");
  const menuButton = getElement("#mobile-menu-button");

  sidebar.classList.remove("open");
  getElement("#sidebar-overlay").hidden = true;
  document.body.classList.remove("sidebar-open");
  menuButton.setAttribute("aria-expanded", "false");
}

/* =========================================================
   Dashboard Summary
========================================================= */

function calculateSummary(transactions) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => {
      return total + Number(transaction.amount);
    }, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => {
      return total + Number(transaction.amount);
    }, 0);

  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  return {
    income,
    expenses,
    balance,
    savingsRate,
  };
}

function renderDashboard() {
  const monthTransactions = getMonthTransactions();
  const summary = calculateSummary(monthTransactions);

  getElement("#total-balance").textContent = formatCurrency(summary.balance);

  getElement("#total-income").textContent = formatCurrency(summary.income);

  getElement("#total-expenses").textContent = formatCurrency(summary.expenses);

  getElement("#savings-rate").textContent =
    `${summary.savingsRate.toFixed(1)}%`;

  renderRecentTransactions(monthTransactions);
  renderMonthlyChart(monthTransactions);
  renderCategoryChart(monthTransactions);

  refreshIcons();
}

/* =========================================================
   Recent Transactions
========================================================= */

function createTransactionIcon(category) {
  const categoryColor = category?.color || "#6366F1";
  const categoryIcon = category?.icon || "tag";

  return `
        <span
            class="transaction-icon"
            style="
                background-color:
                    ${hexToRGBA(categoryColor, 0.12)};
                color: ${categoryColor};
            "
        >
            <i data-lucide="${escapeHTML(categoryIcon)}"></i>
        </span>
    `;
}

function renderRecentTransactions(transactions) {
  const list = getElement("#recent-transactions-list");
  const emptyState = getElement("#recent-transactions-empty");

  const recentTransactions = sortTransactions(transactions).slice(0, 5);

  if (recentTransactions.length === 0) {
    list.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  list.innerHTML = recentTransactions
    .map((transaction) => {
      const category = getCategory(transaction.category_id);
      const amountClass = transaction.type === "income" ? "income" : "expense";

      return `
                <article class="transaction-item">
                    ${createTransactionIcon(category)}

                    <div class="transaction-information">
                        <strong>
                            ${escapeHTML(transaction.title)}
                        </strong>

                        <span>
                            ${escapeHTML(category?.name || "Uncategorized")}
                        </span>
                    </div>

                    <time
                        class="transaction-date"
                        datetime="${escapeHTML(transaction.transaction_date)}"
                    >
                        ${formatDate(transaction.transaction_date)}
                    </time>

                    <span
                        class="transaction-amount ${amountClass}"
                    >
                        ${formatTransactionAmount(transaction)}
                    </span>
                </article>
            `;
    })
    .join("");
}

/* =========================================================
   Charts
========================================================= */

function renderMonthlyChart(transactions) {
  if (!window.Chart) {
    return;
  }

  const weeklyIncome = [0, 0, 0, 0, 0];
  const weeklyExpenses = [0, 0, 0, 0, 0];

  transactions.forEach((transaction) => {
    const transactionDay = Number(transaction.transaction_date.slice(-2));

    const weekIndex = Math.min(Math.floor((transactionDay - 1) / 7), 4);

    if (transaction.type === "income") {
      weeklyIncome[weekIndex] += Number(transaction.amount);
    } else {
      weeklyExpenses[weekIndex] += Number(transaction.amount);
    }
  });

  if (state.monthlyChart) {
    state.monthlyChart.destroy();
  }

  const context = getElement("#monthly-chart").getContext("2d");

  state.monthlyChart = new Chart(context, {
    type: "line",
    data: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
      datasets: [
        {
          label: "Income",
          data: weeklyIncome,
          borderColor: "#14B8A6",
          backgroundColor: "rgba(20, 184, 166, 0.10)",
          fill: true,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#14B8A6",
          tension: 0.38,
        },
        {
          label: "Expenses",
          data: weeklyExpenses,
          borderColor: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.08)",
          fill: true,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#6366F1",
          tension: 0.38,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          padding: 12,
          displayColors: true,
          callbacks: {
            label(contextValue) {
              return `${contextValue.dataset.label}: ${formatCurrency(
                contextValue.raw,
              )}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#94A3B8",
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          border: {
            display: false,
          },
          grid: {
            color: "rgba(226, 232, 240, 0.75)",
          },
          ticks: {
            color: "#94A3B8",
            font: {
              size: 10,
            },
            callback(value) {
              return `$${value}`;
            },
          },
        },
      },
    },
  });
}

function renderCategoryChart(transactions) {
  if (!window.Chart) {
    return;
  }

  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );

  const categoryTotals = new Map();

  expenseTransactions.forEach((transaction) => {
    const categoryId = String(transaction.category_id);

    categoryTotals.set(
      categoryId,
      (categoryTotals.get(categoryId) || 0) + Number(transaction.amount),
    );
  });

  const chartCategories = [...categoryTotals.entries()]
    .map(([categoryId, amount]) => ({
      category: getCategory(categoryId),
      amount,
    }))
    .filter((item) => item.category)
    .sort((first, second) => second.amount - first.amount);

  const totalExpenses = chartCategories.reduce(
    (total, item) => total + item.amount,
    0,
  );

  getElement("#category-chart-total").textContent =
    formatCurrency(totalExpenses);

  if (state.categoryChart) {
    state.categoryChart.destroy();
  }

  const hasData = chartCategories.length > 0;

  const chartLabels = hasData
    ? chartCategories.map((item) => item.category.name)
    : ["No expenses"];

  const chartValues = hasData
    ? chartCategories.map((item) => item.amount)
    : [1];

  const chartColors = hasData
    ? chartCategories.map((item) => item.category.color)
    : ["#E2E8F0"];

  const context = getElement("#category-chart").getContext("2d");

  state.categoryChart = new Chart(context, {
    type: "doughnut",
    data: {
      labels: chartLabels,
      datasets: [
        {
          data: chartValues,
          backgroundColor: chartColors,
          borderColor: "#FFFFFF",
          borderWidth: 4,
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "74%",
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: hasData,
          padding: 11,
          callbacks: {
            label(contextValue) {
              return `${contextValue.label}: ${formatCurrency(
                contextValue.raw,
              )}`;
            },
          },
        },
      },
    },
  });

  renderCategoryLegend(chartCategories, totalExpenses);
}

function renderCategoryLegend(chartCategories, totalExpenses) {
  const legend = getElement("#category-chart-legend");

  if (chartCategories.length === 0) {
    legend.innerHTML = `
            <div class="empty-state small-empty-state">
                <p>No expense data for this month.</p>
            </div>
        `;

    return;
  }

  legend.innerHTML = chartCategories
    .slice(0, 5)
    .map((item) => {
      const percentage =
        totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;

      return `
                <div class="category-legend-item">
                    <span
                        class="category-legend-color"
                        style="
                            background-color:
                                ${item.category.color};
                        "
                    ></span>

                    <span class="category-legend-name">
                        ${escapeHTML(item.category.name)}
                    </span>

                    <span class="category-legend-value">
                        ${percentage.toFixed(1)}%
                    </span>
                </div>
            `;
    })
    .join("");
}

/* =========================================================
   Category Select Options
========================================================= */

function populateCategoryFilter() {
  const filter = getElement("#transaction-category-filter");
  const previousValue = filter.value;

  filter.innerHTML = `
        <option value="">All categories</option>
        ${state.categories
          .map((category) => {
            return `
                    <option value="${escapeHTML(category.id)}">
                        ${escapeHTML(category.name)}
                    </option>
                `;
          })
          .join("")}
    `;

  const previousCategoryStillExists = state.categories.some(
    (category) => category.id === previousValue,
  );

  if (previousCategoryStillExists) {
    filter.value = previousValue;
  }
}

function populateTransactionCategorySelect(selectedValue = "") {
  const select = getElement("#transaction-category");
  const selectedType = getElement("#transaction-type").value;

  const matchingCategories = state.categories.filter(
    (category) => category.type === selectedType,
  );

  select.innerHTML = `
        <option value="">Select category</option>
        ${matchingCategories
          .map((category) => {
            return `
                    <option value="${escapeHTML(category.id)}">
                        ${escapeHTML(category.name)}
                    </option>
                `;
          })
          .join("")}
    `;

  const selectedCategoryIsValid = matchingCategories.some(
    (category) => category.id === String(selectedValue),
  );

  if (selectedCategoryIsValid) {
    select.value = String(selectedValue);
  }
}

/* =========================================================
   Transactions Page
========================================================= */

function getFilteredTransactions() {
  const searchTerm = getElement("#transaction-search")
    .value.trim()
    .toLowerCase();

  const selectedMonth = getElement("#transaction-month-filter").value;

  const selectedType = getElement("#transaction-type-filter").value;

  const selectedCategory = getElement("#transaction-category-filter").value;

  return sortTransactions(
    state.transactions.filter((transaction) => {
      const matchesMonth =
        !selectedMonth ||
        transaction.transaction_date.startsWith(selectedMonth);

      const matchesType = !selectedType || transaction.type === selectedType;

      const matchesCategory =
        !selectedCategory ||
        String(transaction.category_id) === String(selectedCategory);

      const searchableText = `
                ${transaction.title}
                ${transaction.notes || ""}
            `.toLowerCase();

      const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

      return matchesMonth && matchesType && matchesCategory && matchesSearch;
    }),
  );
}

function renderTransactionsPage() {
  const transactions = getFilteredTransactions();
  const tableBody = getElement("#transactions-table-body");
  const emptyState = getElement("#transactions-empty");
  const resultCount = getElement("#transaction-result-count");

  resultCount.textContent = `${transactions.length} ${
    transactions.length === 1 ? "transaction" : "transactions"
  }`;

  if (transactions.length === 0) {
    tableBody.innerHTML = "";
    emptyState.hidden = false;
    refreshIcons();
    return;
  }

  emptyState.hidden = true;

  tableBody.innerHTML = transactions
    .map((transaction) => {
      const category = getCategory(transaction.category_id);
      const categoryColor = category?.color || "#6366F1";
      const categoryIcon = category?.icon || "tag";
      const amountClass = transaction.type === "income" ? "income" : "expense";

      return `
                <tr>
                    <td data-label="Transaction">
                        <div class="table-transaction">
                            <span
                                class="table-transaction-icon"
                                style="
                                    background-color:
                                        ${hexToRGBA(categoryColor, 0.12)};
                                    color: ${categoryColor};
                                "
                            >
                                <i
                                    data-lucide="${escapeHTML(categoryIcon)}"
                                ></i>
                            </span>

                            <div>
                                <strong>
                                    ${escapeHTML(transaction.title)}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                      transaction.notes || "No notes",
                                    )}
                                </span>
                            </div>
                        </div>
                    </td>

                    <td data-label="Category">
                        ${escapeHTML(category?.name || "Uncategorized")}
                    </td>

                    <td data-label="Date">
                        ${formatDate(transaction.transaction_date)}
                    </td>

                    <td data-label="Type">
                        <span
                            class="type-badge ${transaction.type}"
                        >
                            ${escapeHTML(transaction.type)}
                        </span>
                    </td>

                    <td
                        class="amount-column"
                        data-label="Amount"
                    >
                        <span
                            class="transaction-amount ${amountClass}"
                        >
                            ${formatTransactionAmount(transaction)}
                        </span>
                    </td>

                    <td
                        class="action-column"
                        data-label="Actions"
                    >
                        <div class="table-actions">
                            <button
                                class="action-button edit-action"
                                type="button"
                                data-action="edit-transaction"
                                data-id="${escapeHTML(transaction.id)}"
                                aria-label="Edit ${escapeHTML(
                                  transaction.title,
                                )}"
                            >
                                <i data-lucide="pencil"></i>
                            </button>

                            <button
                                class="action-button delete-action"
                                type="button"
                                data-action="delete-transaction"
                                data-id="${escapeHTML(transaction.id)}"
                                aria-label="Delete ${escapeHTML(
                                  transaction.title,
                                )}"
                            >
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
    })
    .join("");

  refreshIcons();
}

/* =========================================================
   Categories Page
========================================================= */

function renderCategoryCard(category) {
  const categoryTransactionCount = state.transactions.filter((transaction) => {
    return String(transaction.category_id) === String(category.id);
  }).length;

  return `
        <article
            class="category-card"
            style="--category-color: ${category.color};"
        >
            <span
                class="category-card-icon"
                style="
                    background-color:
                        ${hexToRGBA(category.color, 0.12)};
                    color: ${category.color};
                "
            >
                <i data-lucide="${escapeHTML(category.icon)}"></i>
            </span>

            <div class="category-card-content">
                <strong>${escapeHTML(category.name)}</strong>

                <span>
                    ${categoryTransactionCount}
                    ${
                      categoryTransactionCount === 1
                        ? "transaction"
                        : "transactions"
                    }
                </span>
            </div>

            <div class="category-card-actions">
                <button
                    class="action-button edit-action"
                    type="button"
                    data-action="edit-category"
                    data-id="${escapeHTML(category.id)}"
                    aria-label="Edit ${escapeHTML(category.name)}"
                >
                    <i data-lucide="pencil"></i>
                </button>

                <button
                    class="action-button delete-action"
                    type="button"
                    data-action="delete-category"
                    data-id="${escapeHTML(category.id)}"
                    aria-label="Delete ${escapeHTML(category.name)}"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </article>
    `;
}

function renderCategoriesPage() {
  const incomeCategories = state.categories
    .filter((category) => category.type === "income")
    .sort((first, second) => {
      return first.name.localeCompare(second.name);
    });

  const expenseCategories = state.categories
    .filter((category) => category.type === "expense")
    .sort((first, second) => {
      return first.name.localeCompare(second.name);
    });

  const incomeGrid = getElement("#income-category-grid");
  const expenseGrid = getElement("#expense-category-grid");

  getElement("#income-category-count").textContent = incomeCategories.length;

  getElement("#expense-category-count").textContent = expenseCategories.length;

  getElement("#income-category-empty").hidden = incomeCategories.length > 0;

  getElement("#expense-category-empty").hidden = expenseCategories.length > 0;

  incomeGrid.innerHTML = incomeCategories.map(renderCategoryCard).join("");

  expenseGrid.innerHTML = expenseCategories.map(renderCategoryCard).join("");

  refreshIcons();
}

/* =========================================================
   Modal Helpers
========================================================= */

function openModal(modalId) {
  const modal = getElement(modalId);

  if (!modal) {
    return;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(modalId) {
  const modal = getElement(modalId);

  if (!modal) {
    return;
  }

  modal.hidden = true;

  const hasVisibleModal = getElements(".modal").some(
    (currentModal) => !currentModal.hidden,
  );

  if (!hasVisibleModal) {
    document.body.classList.remove("modal-open");
  }
}

function closeAllModals() {
  getElements(".modal").forEach((modal) => {
    modal.hidden = true;
  });

  document.body.classList.remove("modal-open");
}

function showFormError(elementId, message) {
  const element = getElement(elementId);

  element.textContent = message;
  element.hidden = false;
}

function clearFormError(elementId) {
  const element = getElement(elementId);

  element.textContent = "";
  element.hidden = true;
}

/* =========================================================
   Transaction Modal and Form
========================================================= */

function getDefaultTransactionDate() {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
  const todayDay = String(today.getDate()).padStart(2, "0");

  const currentMonth = `${todayYear}-${todayMonth}`;

  if (currentMonth === state.selectedMonth) {
    return `${currentMonth}-${todayDay}`;
  }

  return `${state.selectedMonth}-01`;
}

function openNewTransactionModal() {
  state.editingTransactionId = null;

  const form = getElement("#transaction-form");

  form.reset();

  getElement("#transaction-id").value = "";
  getElement("#transaction-type").value = "expense";
  getElement("#transaction-date").value = getDefaultTransactionDate();

  getElement("#transaction-modal-title").textContent = "Add Transaction";

  getElement("#transaction-submit-label").textContent = "Save Transaction";

  populateTransactionCategorySelect();
  clearFormError("#transaction-form-error");
  openModal("#transaction-modal");

  getElement("#transaction-title").focus();
}

function openEditTransactionModal(transactionId) {
  const transaction = state.transactions.find((currentTransaction) => {
    return String(currentTransaction.id) === String(transactionId);
  });

  if (!transaction) {
    showToast(
      "error",
      "Transaction not found",
      "The selected transaction no longer exists.",
    );

    return;
  }

  state.editingTransactionId = transaction.id;

  getElement("#transaction-id").value = transaction.id;
  getElement("#transaction-title").value = transaction.title;
  getElement("#transaction-amount").value = transaction.amount;
  getElement("#transaction-type").value = transaction.type;

  populateTransactionCategorySelect(transaction.category_id);

  getElement("#transaction-date").value = transaction.transaction_date;

  getElement("#transaction-notes").value = transaction.notes || "";

  getElement("#transaction-modal-title").textContent = "Edit Transaction";

  getElement("#transaction-submit-label").textContent = "Update Transaction";

  clearFormError("#transaction-form-error");
  openModal("#transaction-modal");

  getElement("#transaction-title").focus();
}

async function handleTransactionSubmit(event) {
  event.preventDefault();

  clearFormError("#transaction-form-error");

  const title = getElement("#transaction-title").value.trim();
  const amount = Number(getElement("#transaction-amount").value);
  const type = getElement("#transaction-type").value;
  const categoryId = getElement("#transaction-category").value;
  const transactionDate = getElement("#transaction-date").value;
  const notes = getElement("#transaction-notes").value.trim();

  if (!title) {
    showFormError("#transaction-form-error", "Transaction title is required.");

    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showFormError(
      "#transaction-form-error",
      "Amount must be greater than zero.",
    );

    return;
  }

  const category = getCategory(categoryId);

  if (!category) {
    showFormError("#transaction-form-error", "Please select a valid category.");

    return;
  }

  if (category.type !== type) {
    showFormError(
      "#transaction-form-error",
      "The selected category does not match the transaction type.",
    );

    return;
  }

  if (!transactionDate) {
    showFormError("#transaction-form-error", "Transaction date is required.");

    return;
  }

  const transactionData = {
    title,
    amount,
    type,
    categoryId: Number(categoryId),
    transactionDate,
    notes,
  };
  const isEditing = Boolean(state.editingTransactionId);

  const endpoint = isEditing
    ? `/transactions/${state.editingTransactionId}`
    : "/transactions";

  const method = isEditing ? "PUT" : "POST";

  try {
    const result = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(transactionData),
    });

    const savedTransaction = result.data;

    if (isEditing) {
      const transactionIndex = state.transactions.findIndex(
        (transaction) =>
          String(transaction.id) === String(state.editingTransactionId),
      );

      if (transactionIndex !== -1) {
        state.transactions[transactionIndex] = savedTransaction;
      }
    } else {
      state.transactions.unshift(savedTransaction);
    }

    closeModal("#transaction-modal");
    renderApplicationData();

    showToast(
      "success",
      isEditing ? "Transaction updated" : "Transaction added",
      `${title} was ${isEditing ? "updated" : "added"} successfully.`,
    );
  } catch (error) {
    console.error("Failed to save transaction:", error);

    showFormError("#transaction-form-error", error.message);
  }
}

/* =========================================================
   Category Modal and Form
========================================================= */

function openNewCategoryModal() {
  state.editingCategoryId = null;

  const form = getElement("#category-form");
  const typeSelect = getElement("#category-type");

  form.reset();

  getElement("#category-id").value = "";
  typeSelect.value = "expense";
  typeSelect.disabled = false;
  getElement("#category-color").value = "#6366f1";
  getElement("#category-icon").value = "tag";

  getElement("#category-modal-title").textContent = "Add Category";

  getElement("#category-submit-label").textContent = "Save Category";

  clearFormError("#category-form-error");
  openModal("#category-modal");

  getElement("#category-name").focus();
}

function openEditCategoryModal(categoryId) {
  const category = getCategory(categoryId);

  if (!category) {
    showToast(
      "error",
      "Category not found",
      "The selected category no longer exists.",
    );

    return;
  }

  state.editingCategoryId = category.id;

  getElement("#category-id").value = category.id;
  getElement("#category-name").value = category.name;
  getElement("#category-type").value = category.type;
  getElement("#category-color").value = category.color;
  getElement("#category-icon").value = category.icon;

  const categoryIsUsed = state.transactions.some((transaction) => {
    return String(transaction.category_id) === String(category.id);
  });

  getElement("#category-type").disabled = categoryIsUsed;

  getElement("#category-modal-title").textContent = "Edit Category";

  getElement("#category-submit-label").textContent = "Update Category";

  clearFormError("#category-form-error");
  openModal("#category-modal");

  getElement("#category-name").focus();
}

async function handleCategorySubmit(event) {
  event.preventDefault();

  clearFormError("#category-form-error");

  const name = getElement("#category-name").value.trim();
  const type = getElement("#category-type").value;
  const color = getElement("#category-color").value;
  const icon = getElement("#category-icon").value;

  if (!name) {
    showFormError("#category-form-error", "Category name is required.");

    return;
  }

  const duplicateCategory = state.categories.find((category) => {
    const hasSameName = category.name.toLowerCase() === name.toLowerCase();

    const hasSameType = category.type === type;

    const isDifferentCategory =
      String(category.id) !== String(state.editingCategoryId);

    return hasSameName && hasSameType && isDifferentCategory;
  });

  if (duplicateCategory) {
    showFormError(
      "#category-form-error",
      "A category with this name and type already exists.",
    );

    return;
  }

  const categoryData = {
    name,
    type,
    color,
    icon,
  };

  const isEditing = Boolean(state.editingCategoryId);

  const endpoint = isEditing
    ? `/categories/${state.editingCategoryId}`
    : "/categories";

  const method = isEditing ? "PUT" : "POST";

  try {
    const result = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(categoryData),
    });

    const savedCategory = result.data;

    if (isEditing) {
      const categoryIndex = state.categories.findIndex(
        (category) => String(category.id) === String(state.editingCategoryId),
      );

      if (categoryIndex !== -1) {
        state.categories[categoryIndex] = savedCategory;
      }
    } else {
      state.categories.push(savedCategory);
    }

    getElement("#category-type").disabled = false;

    closeModal("#category-modal");
    populateCategoryFilter();
    populateTransactionCategorySelect();
    renderApplicationData();

    showToast(
      "success",
      isEditing ? "Category updated" : "Category added",
      `${name} was ${isEditing ? "updated" : "added"} successfully.`,
    );
  } catch (error) {
    console.error("Failed to save category:", error);

    showFormError("#category-form-error", error.message);
  }
}

/* =========================================================
   Deletion
========================================================= */

function openDeleteModal(type, itemId) {
  let itemName = "";

  if (type === "transaction") {
    const transaction = state.transactions.find((currentTransaction) => {
      return String(currentTransaction.id) === String(itemId);
    });

    if (!transaction) {
      return;
    }

    itemName = transaction.title;
  }

  if (type === "category") {
    const category = getCategory(itemId);

    if (!category) {
      return;
    }

    itemName = category.name;
  }

  state.deleteTarget = {
    type,
    id: String(itemId),
    name: itemName,
  };

  getElement("#delete-modal-message").textContent =
    `Are you sure you want to delete "${itemName}"? ` +
    "This action cannot be undone.";

  openModal("#delete-modal");
}

async function confirmDeletion() {
  const target = state.deleteTarget;

  if (!target) {
    return;
  }

  const endpoint =
    target.type === "transaction"
      ? `/transactions/${target.id}`
      : `/categories/${target.id}`;

  try {
    await apiRequest(endpoint, {
      method: "DELETE",
    });

    if (target.type === "transaction") {
      state.transactions = state.transactions.filter(
        (transaction) => String(transaction.id) !== String(target.id),
      );
    }

    if (target.type === "category") {
      state.categories = state.categories.filter(
        (category) => String(category.id) !== String(target.id),
      );

      populateCategoryFilter();
      populateTransactionCategorySelect();
    }

    closeModal("#delete-modal");
    state.deleteTarget = null;
    renderApplicationData();

    showToast(
      "success",
      target.type === "transaction"
        ? "Transaction deleted"
        : "Category deleted",
      `${target.name} was deleted successfully.`,
    );
  } catch (error) {
    console.error("Failed to delete item:", error);

    closeModal("#delete-modal");
    state.deleteTarget = null;

    showToast("error", "Unable to delete", error.message);
  }
}

/* =========================================================
   Toast Messages
========================================================= */

function showToast(type, title, message) {
  const container = getElement("#toast-container");
  const toast = document.createElement("article");

  const iconName = type === "success" ? "circle-check" : "circle-alert";

  toast.className = `toast ${type}`;

  toast.innerHTML = `
        <span class="toast-icon">
            <i data-lucide="${iconName}"></i>
        </span>

        <div class="toast-message">
            <strong>${escapeHTML(title)}</strong>
            <span>${escapeHTML(message)}</span>
        </div>

        <button
            class="icon-button toast-close"
            type="button"
            aria-label="Close notification"
        >
            <i data-lucide="x"></i>
        </button>
    `;

  container.append(toast);
  refreshIcons();

  const removeToast = () => {
    toast.remove();
  };

  toast.querySelector(".toast-close").addEventListener("click", removeToast);

  window.setTimeout(removeToast, 4500);
}

/* =========================================================
   Shared Rendering
========================================================= */

function renderApplicationData() {
  populateCategoryFilter();
  renderDashboard();
  renderTransactionsPage();
  renderCategoriesPage();
  refreshIcons();
}

/* =========================================================
   Event Listeners
========================================================= */

function registerEventListeners() {
  getElements("[data-page-target]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.pageTarget);
    });
  });

  getElement("#mobile-menu-button").addEventListener("click", openSidebar);

  getElement("#sidebar-close").addEventListener("click", closeSidebar);

  getElement("#sidebar-overlay").addEventListener("click", closeSidebar);

  getElement("#global-month").addEventListener("change", (event) => {
    if (!event.target.value) {
      return;
    }

    state.selectedMonth = event.target.value;

    getElement("#transaction-month-filter").value = state.selectedMonth;

    renderDashboard();
    renderTransactionsPage();
  });

  getElement("#transaction-search").addEventListener(
    "input",
    renderTransactionsPage,
  );

  getElement("#transaction-month-filter").addEventListener(
    "change",
    renderTransactionsPage,
  );

  getElement("#transaction-type-filter").addEventListener(
    "change",
    renderTransactionsPage,
  );

  getElement("#transaction-category-filter").addEventListener(
    "change",
    renderTransactionsPage,
  );

  getElement("#reset-transaction-filters").addEventListener("click", () => {
    getElement("#transaction-search").value = "";
    getElement("#transaction-month-filter").value = state.selectedMonth;

    getElement("#transaction-type-filter").value = "";
    getElement("#transaction-category-filter").value = "";

    renderTransactionsPage();
  });

  getElement("#open-transaction-modal").addEventListener(
    "click",
    openNewTransactionModal,
  );

  getElement("#open-transaction-modal-secondary").addEventListener(
    "click",
    openNewTransactionModal,
  );

  getElement("#open-category-modal").addEventListener(
    "click",
    openNewCategoryModal,
  );

  getElement("#transaction-type").addEventListener("change", () => {
    populateTransactionCategorySelect();
  });

  getElement("#transaction-form").addEventListener(
    "submit",
    handleTransactionSubmit,
  );

  getElement("#category-form").addEventListener("submit", handleCategorySubmit);

  getElement("#confirm-delete-button").addEventListener(
    "click",
    confirmDeletion,
  );

  getElements("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", () => {
      const modalType = element.dataset.closeModal;

      closeModal(`#${modalType}-modal`);

      if (modalType === "category") {
        getElement("#category-type").disabled = false;
      }

      if (modalType === "delete") {
        state.deleteTarget = null;
      }
    });
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;
    const itemId = actionButton.dataset.id;

    if (action === "edit-transaction") {
      openEditTransactionModal(itemId);
    }

    if (action === "delete-transaction") {
      openDeleteModal("transaction", itemId);
    }

    if (action === "edit-category") {
      openEditCategoryModal(itemId);
    }

    if (action === "delete-category") {
      openDeleteModal("category", itemId);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
      closeSidebar();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      closeSidebar();
    }
  });

  window.addEventListener("hashchange", () => {
    const pageName = window.location.hash.slice(1);

    if (pageInformation[pageName] && pageName !== state.activePage) {
      navigateTo(pageName);
    }
  });
}

async function loadApplicationData() {
  try {
    const [categoriesResult, transactionsResult] = await Promise.all([
      apiRequest("/categories"),
      apiRequest("/transactions"),
    ]);

    state.categories = categoriesResult.data || [];
    state.transactions = transactionsResult.data || [];

    populateCategoryFilter();
    populateTransactionCategorySelect();
    renderApplicationData();
  } catch (error) {
    console.error("Failed to load application data:", error);

    showToast("error", "Unable to load data", error.message);
  }
}

/* =========================================================
   Application Initialization
========================================================= */

async function initializeApplication() {
  populateMonthSelectors();
  registerEventListeners();

  const requestedPage = window.location.hash.slice(1);

  const initialPage = pageInformation[requestedPage]
    ? requestedPage
    : "dashboard";

  navigateTo(initialPage);

  await loadApplicationData();

  document.body.classList.remove("app-loading");
}

document.addEventListener("DOMContentLoaded", initializeApplication);
