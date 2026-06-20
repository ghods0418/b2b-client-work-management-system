const STORAGE_KEY = "sme_b2b_system_data";
const APP_BASE_TITLE = "거래처별 업무 관리 시스템";
const TASK_STATUS = {
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETE: "complete"
};
const LEGACY_STATUS_MAP = {
  대기: TASK_STATUS.WAITING,
  진행중: TASK_STATUS.ACTIVE,
  "진행 중": TASK_STATUS.ACTIVE,
  완료: TASK_STATUS.COMPLETE
};
const DASHBOARD_STATE_FILTERS = [
  { key: "overdue", label: "경과" },
  { key: "active", label: "진행 중" },
  { key: "today", label: "당일" },
  { key: "upcoming", label: "예정" },
  { key: "future", label: "미도래" }
];

let systemData = loadData();
let activeTaskId = null;
let taskHasQueried = false;

const elements = {
  appTitle: document.getElementById("appTitle"),
  companyNameInput: document.getElementById("companyNameInput"),
  todayLabel: document.getElementById("todayLabel"),
  summaryCards: document.getElementById("summaryCards"),
  upcomingTasks: document.getElementById("upcomingTasks"),
  clientList: document.getElementById("clientList"),
  clientSearchInput: document.getElementById("clientSearchInput"),
  clientDuplicateNotice: document.getElementById("clientDuplicateNotice"),
  clientForm: document.getElementById("clientForm"),
  clientFormTitle: document.getElementById("clientFormTitle"),
  clientFormReset: document.getElementById("clientFormReset"),
  clientIdInput: document.getElementById("clientIdInput"),
  clientNameInput: document.getElementById("clientNameInput"),
  clientBusinessNumberInput: document.getElementById("clientBusinessNumberInput"),
  clientContactInput: document.getElementById("clientContactInput"),
  clientPhoneInput: document.getElementById("clientPhoneInput"),
  clientEmailInput: document.getElementById("clientEmailInput"),
  clientCreatedAtInput: document.getElementById("clientCreatedAtInput"),
  clientNotesInput: document.getElementById("clientNotesInput"),
  clientFormMessage: document.getElementById("clientFormMessage"),
  clientSubmitButton: document.getElementById("clientSubmitButton"),
  taskCreateForm: document.getElementById("taskCreateForm"),
  newTaskClientId: document.getElementById("newTaskClientId"),
  newTaskTitle: document.getElementById("newTaskTitle"),
  newTaskDueDate: document.getElementById("newTaskDueDate"),
  newTaskMonthlyRepeat: document.getElementById("newTaskMonthlyRepeat"),
  taskCreateMessage: document.getElementById("taskCreateMessage"),
  taskCreateToggle: document.getElementById("taskCreateToggle"),
  taskList: document.getElementById("taskList"),
  taskStatusFilter: document.getElementById("taskStatusFilter"),
  taskDateFrom: document.getElementById("taskDateFrom"),
  taskDateTo: document.getElementById("taskDateTo"),
  taskSearchButton: document.getElementById("taskSearchButton"),
  taskQueryMessage: document.getElementById("taskQueryMessage"),
  reportSearch: document.getElementById("reportSearch"),
  reportStatusFilter: document.getElementById("reportStatusFilter"),
  reportDateFrom: document.getElementById("reportDateFrom"),
  reportDateTo: document.getElementById("reportDateTo"),
  reportQueryMessage: document.getElementById("reportQueryMessage"),
  reportRows: document.getElementById("reportRows"),
  printReport: document.getElementById("printReport"),
  downloadCsv: document.getElementById("downloadCsv"),
  modal: document.getElementById("completionModal"),
  closeModal: document.getElementById("closeModal"),
  cancelModal: document.getElementById("cancelModal"),
  completionForm: document.getElementById("completionForm"),
  modalTaskTitle: document.getElementById("modalTaskTitle"),
  modalTaskClientId: document.getElementById("modalTaskClientId"),
  modalTaskTitleInput: document.getElementById("modalTaskTitleInput"),
  modalTaskDueDate: document.getElementById("modalTaskDueDate"),
  modalTaskStartDate: document.getElementById("modalTaskStartDate"),
  completedAt: document.getElementById("completedAt"),
  completionNote: document.getElementById("completionNote"),
  executionMemo: document.getElementById("executionMemo"),
  modalError: document.getElementById("modalError"),
  deleteTaskButton: document.getElementById("deleteTaskButton"),
  saveTaskButton: document.getElementById("saveTaskButton")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  elements.todayLabel.textContent = formatDateForDisplay(new Date());
  elements.companyNameInput.value = systemData.companyName || "";
  elements.clientCreatedAtInput.value = todayString();
  setDefaultTaskDateRange();
  updateAppTitle();

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });

  elements.taskCreateForm.addEventListener("submit", createTask);
  elements.taskCreateToggle.addEventListener("click", toggleTaskCreateForm);
  elements.taskSearchButton.addEventListener("click", searchTasks);
  elements.companyNameInput.addEventListener("input", handleCompanyNameInput);
  elements.clientSearchInput.addEventListener("input", handleClientSearchInput);
  elements.clientForm.addEventListener("submit", saveClient);
  elements.clientFormReset.addEventListener("click", resetClientForm);
  elements.reportSearch.addEventListener("input", renderReports);
  elements.reportStatusFilter.addEventListener("change", renderReports);
  elements.reportDateFrom.addEventListener("change", renderReports);
  elements.reportDateTo.addEventListener("change", renderReports);
  [
    elements.newTaskDueDate,
    elements.taskDateFrom,
    elements.taskDateTo,
    elements.reportDateFrom,
    elements.reportDateTo,
    elements.modalTaskDueDate,
    elements.modalTaskStartDate,
    elements.completedAt
  ].forEach((input) => {
    input.addEventListener("blur", () => normalizeDateField(input));
  });
  elements.printReport.addEventListener("click", () => window.print());
  elements.downloadCsv.addEventListener("click", downloadCsv);
  elements.closeModal.addEventListener("click", closeCompletionModal);
  elements.cancelModal.addEventListener("click", closeCompletionModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeCompletionModal();
    }
  });
  elements.completionForm.addEventListener("submit", saveCompletion);
  elements.saveTaskButton.addEventListener("click", saveTaskEdits);
  elements.deleteTaskButton.addEventListener("click", deleteActiveTask);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.classList.contains("hidden")) {
      closeCompletionModal();
    }
  });

  renderAll();
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = createSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeData(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.warn("저장 데이터를 읽을 수 없어 샘플 데이터로 초기화합니다.", error);
    const seeded = createSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function normalizeData(data) {
  const companyName = typeof data.companyName === "string" ? data.companyName : "";
  const clients = Array.isArray(data.clients) ? data.clients.map(normalizeClient) : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [];
  return { companyName, clients, tasks };
}

function normalizeClient(client) {
  return {
    id: client.id || createId("client"),
    name: client.name || "",
    businessNumber: client.businessNumber || "",
    contactName: client.contactName || "",
    email: client.email || "",
    phone: client.phone || "",
    notes: client.notes || "",
    createdAt: client.createdAt || todayString()
  };
}

function normalizeTask(task) {
  let startDate = normalizeDateInput(task.startDate) || inferStartDate(task);
  let completedAt = normalizeDateInput(task.completedAt);

  if (startDate && isDateAfter(startDate, todayString())) {
    startDate = "";
  }

  if (completedAt && isDateAfter(completedAt, todayString())) {
    completedAt = "";
  }

  if (startDate && completedAt && isDateAfter(startDate, completedAt)) {
    completedAt = "";
  }

  if (completedAt && !startDate) {
    startDate = completedAt;
  }

  const normalizedTask = {
    id: task.id || createId("task"),
    clientId: task.clientId || "",
    title: task.title || "제목 없는 업무",
    description: task.description || "",
    startDate,
    dueDate: normalizeDateInput(task.dueDate) || todayString(),
    status: normalizeStoredStatus(task.status),
    completedAt,
    completionNote: completedAt ? task.completionNote || "" : "",
    executionMemo: completedAt ? task.executionMemo || "" : "",
    recurrence: task.recurrence === "monthly" ? "monthly" : "",
    recurrenceGroupId: task.recurrence === "monthly" ? task.recurrenceGroupId || task.id || createId("repeat") : "",
    recurrenceDay: task.recurrence === "monthly" ? Number(task.recurrenceDay) || getDayOfMonth(task.dueDate) : 0
  };

  return {
    ...normalizedTask,
    status: getStoredTaskStatus(normalizedTask)
  };
}

function createSeedData() {
  return {
    companyName: "",
    clients: [
      {
        id: "client-1",
        name: "A회사(VIP)",
        businessNumber: "101-11-11111",
        contactName: "김철수 팀장",
        email: "kim.cs@acorp.co.kr",
        phone: "010-1234-5678",
        notes: "매주 주요 업무 진행 상황을 빠르게 공유받길 원함. 정기 보고서 품질에 민감한 VIP 거래처.",
        createdAt: "2026-06-01"
      },
      {
        id: "client-2",
        name: "B회사",
        businessNumber: "202-22-22222",
        contactName: "이영희 과장",
        email: "lee.yh@bpartners.net",
        phone: "010-9876-5432",
        notes: "매월 10일 전 세금계산서와 청구 자료 확인 필요. 자료 요청은 최소 2일 전 안내.",
        createdAt: "2026-06-05"
      },
      {
        id: "client-3",
        name: "C회사",
        businessNumber: "303-33-33333",
        contactName: "박민수 대리",
        email: "park.ms@ccorp.io",
        phone: "010-3344-5566",
        notes: "신규 스타트업 고객. 연구개발 세액공제와 정부지원금 관련 반복 확인 업무가 많음.",
        createdAt: "2026-06-10"
      }
    ],
    tasks: [
      {
        id: "task-1",
        clientId: "client-1",
        title: "6월 4주차 VIP 진행상황 보고서 발송",
        description: "A회사 주요 진행 업무와 다음 주 확인 필요 사항을 정리해 이메일 발송",
        startDate: "2026-06-19",
        dueDate: "2026-06-25",
        status: TASK_STATUS.ACTIVE,
        completedAt: "",
        completionNote: "",
        executionMemo: ""
      },
      {
        id: "task-2",
        clientId: "client-2",
        title: "6월 세금계산서 발행 전 거래내역 검토",
        description: "B회사 청구 대상 항목과 공급가액 확정 후 담당자에게 확인 요청",
        startDate: "2026-06-17",
        dueDate: "2026-06-20",
        status: TASK_STATUS.COMPLETE,
        completedAt: "2026-06-18",
        completionNote: "거래내역 확인 후 세금계산서 발행 완료",
        executionMemo: "청구 항목 1건의 품목명이 변경되어 담당자 승인 후 반영함"
      },
      {
        id: "task-3",
        clientId: "client-3",
        title: "연구개발 세액공제 가능 항목 사전 검토",
        description: "C회사 연구개발 인력과 프로젝트 지출 내역을 기준으로 적용 가능성 확인",
        startDate: "",
        dueDate: "2026-06-22",
        status: TASK_STATUS.WAITING,
        completedAt: "",
        completionNote: "",
        executionMemo: ""
      },
      {
        id: "task-4",
        clientId: "client-1",
        title: "분기별 미수금 현황 확인",
        description: "A회사 미수금 잔액과 입금 예정일 확인",
        startDate: "",
        dueDate: "2026-06-28",
        status: TASK_STATUS.WAITING,
        completedAt: "",
        completionNote: "",
        executionMemo: ""
      }
    ]
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(systemData));
}

function renderAll() {
  updateAppTitle();
  renderTaskClientOptions();
  renderDashboard();
  renderClients();
  renderTasks();
  renderReports();
}

function handleCompanyNameInput() {
  systemData.companyName = elements.companyNameInput.value.trim();
  persist();
  updateAppTitle();
}

function updateAppTitle() {
  const companyName = systemData.companyName ? systemData.companyName : "회사명";
  const title = `${APP_BASE_TITLE}_(${companyName})`;
  elements.appTitle.textContent = title;
  document.title = title;
}

function renderTaskClientOptions() {
  syncClientSelect(elements.newTaskClientId, "");
  syncClientSelect(elements.modalTaskClientId, elements.modalTaskClientId.value);
}

function syncClientSelect(select, selectedClientId) {
  const currentValue = selectedClientId || select.value;
  clearNode(select);

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "거래처 선택";
  select.appendChild(placeholder);

  systemData.clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    select.appendChild(option);
  });

  select.value = systemData.clients.some((client) => client.id === currentValue) ? currentValue : "";
}

function createTask(event) {
  event.preventDefault();
  elements.taskCreateMessage.textContent = "";

  const clientId = elements.newTaskClientId.value;
  const title = elements.newTaskTitle.value.trim();
  const dueDate = normalizeDateInput(elements.newTaskDueDate.value);
  const isMonthlyRepeat = elements.newTaskMonthlyRepeat.checked;
  const taskId = createId("task");

  if (!clientId) {
    elements.taskCreateMessage.textContent = "거래처명을 선택하세요.";
    return;
  }

  if (!title) {
    elements.taskCreateMessage.textContent = "업무 내용을 입력하세요.";
    return;
  }

  if (!dueDate) {
    elements.taskCreateMessage.textContent = "종료 예정일을 YY-MM-DD 형식으로 입력하세요.";
    return;
  }

  if (isDuplicateTask({ clientId, title, dueDate })) {
    elements.taskCreateMessage.textContent = "동일한 거래처, 업무 내용, 종료 예정일의 업무가 이미 등록되어 있습니다.";
    return;
  }

  systemData.tasks = [
    {
      id: taskId,
      clientId,
      title,
      description: title,
      startDate: "",
      dueDate,
      status: TASK_STATUS.WAITING,
      completedAt: "",
      completionNote: "",
      executionMemo: "",
      recurrence: isMonthlyRepeat ? "monthly" : "",
      recurrenceGroupId: isMonthlyRepeat ? createId("repeat") : "",
      recurrenceDay: isMonthlyRepeat ? getDayOfMonth(dueDate) : 0
    },
    ...systemData.tasks
  ];

  persist();
  elements.taskCreateForm.reset();
  elements.newTaskDueDate.value = formatShortDate(todayString());
  elements.taskCreateMessage.textContent = "";
  setTaskCreateOpen(false);
  taskHasQueried = true;
  renderAll();
}

function toggleTaskCreateForm() {
  setTaskCreateOpen(elements.taskCreateForm.classList.contains("hidden"));
}

function setTaskCreateOpen(isOpen) {
  elements.taskCreateForm.classList.toggle("hidden", !isOpen);
  elements.taskCreateToggle.textContent = isOpen ? "닫기" : "신규 업무";
  elements.taskCreateToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    elements.newTaskClientId.focus();
  }
}

function searchTasks() {
  const rangeError = validateTaskDateRange();
  if (rangeError) {
    elements.taskQueryMessage.textContent = rangeError;
    taskHasQueried = false;
  } else {
    elements.taskQueryMessage.textContent = "";
    taskHasQueried = true;
  }
  renderTasks();
}

function isDuplicateTask(candidate, ignoredTaskId = "") {
  const normalizedTitle = normalizeSearchText(candidate.title);
  return systemData.tasks.some((task) => {
    return task.id !== ignoredTaskId
      && task.clientId === candidate.clientId
      && normalizeSearchText(task.title) === normalizedTitle
      && task.dueDate === candidate.dueDate;
  });
}

function switchView(targetId) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === targetId);
  });
}

function renderDashboard() {
  clearNode(elements.summaryCards);
  clearNode(elements.upcomingTasks);

  DASHBOARD_STATE_FILTERS.forEach((filter) => {
    const count = systemData.tasks.filter((task) => getTaskState(task).code === filter.key).length;
    elements.summaryCards.appendChild(createSummaryCard(filter.label, count, filter.key));
  });

  const upcoming = systemData.tasks
    .filter((task) => getTaskState(task).code !== "complete")
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  if (upcoming.length === 0) {
    elements.upcomingTasks.appendChild(createEmptyState("남은 업무가 없습니다."));
  } else {
    upcoming.forEach((task) => {
      elements.upcomingTasks.appendChild(createTaskItem(task));
    });
  }
}

function renderClients() {
  clearNode(elements.clientList);
  renderClientDuplicateNotice();

  const hasSearch = normalizeSearchText(elements.clientSearchInput.value).length >= 2;
  const isEditing = Boolean(elements.clientIdInput.value);
  const shouldShowClientArea = hasSearch || isEditing;
  setClientAreaVisible(shouldShowClientArea);

  if (!shouldShowClientArea) {
    return;
  }

  const clients = getFilteredClients();

  if (clients.length === 0) {
    elements.clientList.appendChild(createEmptyState("조회된 거래처가 없습니다. 검색 후 신규 등록을 진행하세요."));
    return;
  }

  clients.forEach((client) => {
    const card = el("article", "entity-card");
    const title = el("h3");
    title.textContent = client.name;
    const notes = el("p");
    notes.textContent = client.notes || "등록된 메모가 없습니다.";
    const meta = el("div", "entity-meta");
    appendMeta(meta, "사업자등록번호", client.businessNumber || "-");
    appendMeta(meta, "담당자", client.contactName);
    appendMeta(meta, "연락처", client.phone);
    appendMeta(meta, "이메일", client.email || "-");
    appendMeta(meta, "등록일", client.createdAt);
    const actions = el("div", "entity-actions");
    const editButton = el("button", "small-button");
    editButton.type = "button";
    editButton.textContent = "변경";
    editButton.addEventListener("click", () => editClient(client.id));
    const deleteButton = el("button", "small-button danger-button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteClient(client.id));
    actions.append(editButton, deleteButton);
    card.append(title, notes, meta, actions);
    elements.clientList.appendChild(card);
  });
}

function handleClientSearchInput() {
  const query = elements.clientSearchInput.value.trim();
  if (!elements.clientIdInput.value && query.length >= 2 && !looksLikeBusinessNumber(query)) {
    elements.clientNameInput.value = query;
  }
  renderClients();
}

function renderTasks() {
  clearNode(elements.taskList);

  if (!taskHasQueried) {
    elements.taskList.classList.add("hidden");
    return;
  }

  elements.taskList.classList.remove("hidden");
  const filter = elements.taskStatusFilter.value;
  const rangeError = validateTaskDateRange();
  if (rangeError) {
    elements.taskQueryMessage.textContent = rangeError;
    elements.taskList.appendChild(createEmptyState("기간 범위를 다시 선택한 뒤 조회하세요."));
    return;
  }

  elements.taskQueryMessage.textContent = "";
  const from = elements.taskDateFrom.value;
  const to = elements.taskDateTo.value;
  const tasks = systemData.tasks
    .filter((task) => matchesTaskListFilter(task, filter))
    .filter((task) => isTaskInDateRange(task, from, to))
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (tasks.length === 0) {
    elements.taskList.appendChild(createEmptyState("조건에 맞는 업무가 없습니다."));
    return;
  }

  tasks.forEach((task) => elements.taskList.appendChild(createTaskItem(task)));
}

function renderReports() {
  clearNode(elements.reportRows);
  const rangeError = validateReportDateRange();

  if (rangeError) {
    elements.reportQueryMessage.textContent = rangeError;
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "기간 범위를 다시 선택하세요.";
    tr.appendChild(td);
    elements.reportRows.appendChild(tr);
    return;
  }

  elements.reportQueryMessage.textContent = "";
  const rows = getFilteredReportTasks();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "조회된 업무가 없습니다.";
    tr.appendChild(td);
    elements.reportRows.appendChild(tr);
    return;
  }

  rows.forEach((task) => {
    const tr = document.createElement("tr");
    [
      getClientName(task.clientId),
      task.title,
      formatShortDate(task.dueDate),
      getTaskState(task).label,
      task.completedAt ? formatShortDate(task.completedAt) : "-",
      task.completionNote || "-",
      task.executionMemo || "-"
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    elements.reportRows.appendChild(tr);
  });
}

function createSummaryCard(label, value, filterKey) {
  const card = el("button", "summary-card");
  card.type = "button";
  card.setAttribute("aria-label", `${label} 업무 ${value}건 보기`);
  const labelNode = el("span");
  const valueNode = el("strong");
  labelNode.textContent = label;
  valueNode.textContent = String(value);
  card.addEventListener("click", () => openTaskFilter(filterKey));
  card.append(labelNode, valueNode);
  return card;
}

function createTaskItem(task) {
  const item = el("article", "task-item");
  const checkbox = document.createElement("input");
  checkbox.className = "task-check";
  checkbox.type = "checkbox";
  checkbox.checked = false;
  checkbox.setAttribute("aria-label", "업무 선택");
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      openCompletionModal(task.id);
      checkbox.checked = false;
    }
  });

  const main = el("div", "task-main");
  const titleRow = el("div", "task-title-row");
  const title = el("strong");
  title.textContent = task.title;
  const status = createStatusBadge(getTaskState(task).label);
  titleRow.append(title, status);

  const desc = el("p", "task-desc");
  desc.textContent = task.description;

  const meta = el("div", "task-meta");
  addTextSpan(meta, getClientName(task.clientId));
  if (task.startDate) {
    addTextSpan(meta, `시작일 ${formatShortDate(task.startDate)}`);
  }
  addTextSpan(meta, `종료 예정일 ${formatShortDate(task.dueDate)}`);
  if (task.completedAt) {
    addTextSpan(meta, `완료일 ${formatShortDate(task.completedAt)}`);
  }
  if (task.recurrence === "monthly") {
    addTextSpan(meta, "매월 반복");
  }

  main.append(titleRow, desc, meta);

  if (isCompletedTask(task)) {
    const detail = el("p", "completion-detail");
    detail.textContent = `완료 내용: ${task.completionNote || "-"}\n실행 메모: ${task.executionMemo || "-"}`;
    main.appendChild(detail);
  }

  item.append(checkbox, main);
  return item;
}

function createStatusBadge(status) {
  const badge = el("span", "status-badge");
  if (status === "완료") {
    badge.classList.add("done");
  } else if (status === "진행 중") {
    badge.classList.add("progress");
  } else {
    badge.classList.add("waiting");
  }
  badge.textContent = status;
  return badge;
}

function getFilteredClients() {
  const query = normalizeSearchText(elements.clientSearchInput.value);
  if (!query) {
    return systemData.clients;
  }

  return systemData.clients.filter((client) => {
    return normalizeSearchText(client.name).includes(query) || normalizeSearchText(client.businessNumber).includes(query);
  });
}

function renderClientDuplicateNotice() {
  clearNode(elements.clientDuplicateNotice);

  const query = elements.clientSearchInput.value.trim();
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    const message = el("p", "muted");
    message.textContent = "거래처명 또는 사업자등록번호를 2글자 이상 조회하면 등록 폼과 거래처 목록이 표시됩니다.";
    elements.clientDuplicateNotice.appendChild(message);
    return;
  }

  const matches = systemData.clients.filter((client) => {
    return normalizeSearchText(client.name).includes(normalizedQuery) || normalizeSearchText(client.businessNumber).includes(normalizedQuery);
  });

  if (matches.length === 0) {
    const message = el("p", "success-text");
    message.textContent = "중복 후보가 없습니다. 아래 신규 등록을 진행할 수 있습니다.";
    elements.clientDuplicateNotice.appendChild(message);
    return;
  }

  const title = el("p", "warning-text");
  title.textContent = "중복 가능 거래처";
  const list = el("div", "duplicate-list");
  matches.forEach((client) => {
    const button = el("button", "duplicate-chip");
    button.type = "button";
    button.textContent = client.businessNumber ? `${client.name} (${client.businessNumber})` : client.name;
    button.addEventListener("click", () => editClient(client.id));
    list.appendChild(button);
  });
  elements.clientDuplicateNotice.append(title, list);
}

function saveClient(event) {
  event.preventDefault();
  elements.clientFormMessage.textContent = "";

  const editingId = elements.clientIdInput.value;
  const client = {
    id: editingId || createId("client"),
    name: elements.clientNameInput.value.trim(),
    businessNumber: elements.clientBusinessNumberInput.value.trim(),
    contactName: elements.clientContactInput.value.trim(),
    phone: elements.clientPhoneInput.value.trim(),
    email: elements.clientEmailInput.value.trim(),
    createdAt: elements.clientCreatedAtInput.value || todayString(),
    notes: elements.clientNotesInput.value.trim()
  };

  const error = validateClient(client, editingId);
  if (error) {
    elements.clientFormMessage.textContent = error;
    return;
  }

  if (editingId) {
    systemData.clients = systemData.clients.map((item) => (item.id === editingId ? client : item));
  } else {
    systemData.clients = [client, ...systemData.clients];
  }

  persist();
  elements.clientSearchInput.value = client.name;
  resetClientForm();
  renderAll();
}

function validateClient(client, editingId) {
  if (!client.name) {
    return "거래처명은 필수입니다.";
  }

  if (client.name.length < 2) {
    return "거래처명은 2글자 이상 입력하세요.";
  }

  if (!client.contactName) {
    return "담당자는 필수입니다.";
  }

  if (!client.phone) {
    return "연락처는 필수입니다.";
  }

  const duplicatedName = systemData.clients.find((item) => {
    return item.id !== editingId && normalizeSearchText(item.name) === normalizeSearchText(client.name);
  });
  if (duplicatedName) {
    return "동일한 거래처명이 이미 등록되어 있습니다.";
  }

  if (client.businessNumber) {
    const duplicatedBusinessNumber = systemData.clients.find((item) => {
      return item.id !== editingId && normalizeSearchText(item.businessNumber) === normalizeSearchText(client.businessNumber);
    });
    if (duplicatedBusinessNumber) {
      return "동일한 사업자등록번호가 이미 등록되어 있습니다.";
    }
  }

  return "";
}

function editClient(clientId) {
  const client = systemData.clients.find((item) => item.id === clientId);
  if (!client) {
    return;
  }

  elements.clientIdInput.value = client.id;
  elements.clientNameInput.value = client.name;
  elements.clientBusinessNumberInput.value = client.businessNumber || "";
  elements.clientContactInput.value = client.contactName;
  elements.clientPhoneInput.value = client.phone;
  elements.clientEmailInput.value = client.email || "";
  elements.clientCreatedAtInput.value = client.createdAt || todayString();
  elements.clientNotesInput.value = client.notes || "";
  elements.clientFormTitle.textContent = "거래처 변경";
  elements.clientSubmitButton.textContent = "변경 저장";
  elements.clientFormMessage.textContent = "";
  setClientAreaVisible(true);
  elements.clientNameInput.focus();
}

function deleteClient(clientId) {
  const client = systemData.clients.find((item) => item.id === clientId);
  if (!client) {
    return;
  }

  const taskCount = systemData.tasks.filter((task) => task.clientId === clientId).length;
  const message = taskCount > 0
    ? `${client.name} 거래처와 연결된 업무 ${taskCount}건을 함께 삭제할까요?`
    : `${client.name} 거래처를 삭제할까요?`;

  if (!window.confirm(message)) {
    return;
  }

  systemData.clients = systemData.clients.filter((item) => item.id !== clientId);
  systemData.tasks = systemData.tasks.filter((task) => task.clientId !== clientId);
  persist();
  resetClientForm();
  renderAll();
}

function resetClientForm() {
  const query = elements.clientSearchInput.value.trim();
  elements.clientForm.reset();
  elements.clientIdInput.value = "";
  elements.clientCreatedAtInput.value = todayString();
  if (query.length >= 2 && !looksLikeBusinessNumber(query)) {
    elements.clientNameInput.value = query;
  }
  elements.clientFormTitle.textContent = "거래처 등록";
  elements.clientSubmitButton.textContent = "등록";
  elements.clientFormMessage.textContent = "";
  setClientAreaVisible(normalizeSearchText(query).length >= 2);
}

function setClientAreaVisible(isVisible) {
  elements.clientForm.classList.toggle("hidden", !isVisible);
  elements.clientList.classList.toggle("hidden", !isVisible);
}

function normalizeSearchText(value) {
  return String(value || "").replaceAll("-", "").replace(/\s/g, "").toLowerCase();
}

function looksLikeBusinessNumber(value) {
  return /^[\d-\s]+$/.test(value);
}

function setDefaultTaskDateRange() {
  elements.taskDateFrom.value = formatShortDate(shiftMonth(todayString(), -1));
  elements.taskDateTo.value = formatShortDate(shiftMonth(todayString(), 1));
  elements.reportDateFrom.value = formatShortDate(shiftMonth(todayString(), -1));
  elements.reportDateTo.value = formatShortDate(shiftMonth(todayString(), 1));
  elements.newTaskDueDate.value = formatShortDate(todayString());
}

function validateTaskDateRange(from = elements.taskDateFrom.value, to = elements.taskDateTo.value) {
  if (!from || !to) {
    return "기간 From과 To를 모두 입력하세요.";
  }

  const normalizedFrom = normalizeDateInput(from);
  const normalizedTo = normalizeDateInput(to);

  if (!normalizedFrom || !normalizedTo) {
    return "기간은 YY-MM-DD 형식으로 입력하세요.";
  }

  const fromDate = parseYmd(normalizedFrom);
  const toDate = parseYmd(normalizedTo);

  if (!fromDate || !toDate) {
    return "기간 형식이 올바르지 않습니다.";
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return "기간 From은 To보다 늦을 수 없습니다.";
  }

  if (getDateDiffInDays(normalizedFrom, normalizedTo) > 365) {
    return "기간 범위는 최대 1년까지만 조회할 수 있습니다.";
  }

  return "";
}

function isTaskInDateRange(task, from, to) {
  const dueDate = parseYmd(task.dueDate);
  const fromDate = parseYmd(normalizeDateInput(from));
  const toDate = parseYmd(normalizeDateInput(to));

  if (!dueDate || !fromDate || !toDate) {
    return false;
  }

  return dueDate.getTime() >= fromDate.getTime() && dueDate.getTime() <= toDate.getTime();
}

function validateReportDateRange() {
  return validateTaskDateRange(elements.reportDateFrom.value, elements.reportDateTo.value);
}

function validateTaskWorkDates(startDate, completedAt) {
  const workDate = todayString();

  if (startDate && isDateAfter(startDate, workDate)) {
    return "시작일은 오늘보다 늦을 수 없습니다.";
  }

  if (completedAt && isDateAfter(completedAt, workDate)) {
    return "완료일은 오늘보다 늦을 수 없습니다.";
  }

  if (startDate && completedAt && isDateAfter(startDate, completedAt)) {
    return "완료일은 시작일과 같거나 이후여야 합니다.";
  }

  return "";
}

function createEmptyState(message) {
  const empty = el("div", "empty-state");
  empty.textContent = message;
  return empty;
}

function openCompletionModal(taskId) {
  const task = systemData.tasks.find((item) => item.id === taskId);
  if (!task) {
    renderAll();
    return;
  }

  activeTaskId = taskId;
  syncClientSelect(elements.modalTaskClientId, task.clientId);
  elements.modalTaskTitle.textContent = task.title;
  elements.modalTaskClientId.value = task.clientId;
  elements.modalTaskTitleInput.value = task.title;
  elements.modalTaskDueDate.value = formatShortDate(task.dueDate);
  elements.modalTaskStartDate.value = task.startDate ? formatShortDate(task.startDate) : "";
  elements.completedAt.value = task.completedAt ? formatShortDate(task.completedAt) : "";
  elements.completionNote.value = task.completionNote || "";
  elements.executionMemo.value = task.executionMemo || "";
  elements.modalError.textContent = "";
  elements.modal.classList.remove("hidden");
  elements.completedAt.focus();
}

function closeCompletionModal() {
  activeTaskId = null;
  elements.modal.classList.add("hidden");
  elements.completionForm.reset();
  elements.modalTaskTitle.textContent = "";
  elements.modalError.textContent = "";
  renderAll();
}

function saveCompletion(event) {
  event.preventDefault();

  const taskPayload = getTaskModalPayload();
  if (!taskPayload) {
    return;
  }

  const previousTask = systemData.tasks.find((task) => task.id === activeTaskId);
  const wasCompleted = isCompletedTask(previousTask);
  const completedAt = taskPayload.completedAt || todayString();
  const startDate = taskPayload.startDate || completedAt;
  const completionNote = elements.completionNote.value.trim();

  if (!previousTask) {
    elements.modalError.textContent = "완료할 업무를 찾을 수 없습니다.";
    return;
  }

  if (!completionNote) {
    elements.modalError.textContent = "완료 내용을 입력하세요.";
    return;
  }

  systemData.tasks = systemData.tasks.map((task) => {
    if (task.id !== activeTaskId) {
      return task;
    }

    return {
      ...task,
      clientId: taskPayload.clientId,
      title: taskPayload.title,
      description: taskPayload.title,
      dueDate: taskPayload.dueDate,
      status: TASK_STATUS.COMPLETE,
      startDate,
      completedAt,
      completionNote,
      executionMemo: taskPayload.executionMemo,
      recurrenceDay: task.recurrence === "monthly" ? getDayOfMonth(taskPayload.dueDate) : 0
    };
  });

  const updatedTask = systemData.tasks.find((task) => task.id === activeTaskId);
  if (!wasCompleted && isCompletedTask(updatedTask)) {
    ensureNextMonthlyTask(updatedTask);
  }
  persist();
  closeCompletionModal();
}

function getTaskModalPayload() {
  const clientId = elements.modalTaskClientId.value;
  const title = elements.modalTaskTitleInput.value.trim();
  const dueDate = normalizeDateInput(elements.modalTaskDueDate.value);
  const startDate = elements.modalTaskStartDate.value ? normalizeDateInput(elements.modalTaskStartDate.value) : "";
  const completedAt = elements.completedAt.value ? normalizeDateInput(elements.completedAt.value) : "";

  if (!activeTaskId) {
    elements.modalError.textContent = "선택된 업무가 없습니다.";
    return null;
  }

  if (!clientId) {
    elements.modalError.textContent = "거래처명을 선택하세요.";
    return null;
  }

  if (!title) {
    elements.modalError.textContent = "업무 내용을 입력하세요.";
    return null;
  }

  if (!dueDate) {
    elements.modalError.textContent = "종료 예정일을 YY-MM-DD 형식으로 입력하세요.";
    return null;
  }

  if (elements.completedAt.value && !completedAt) {
    elements.modalError.textContent = "완료일을 YY-MM-DD 형식으로 입력하세요.";
    return null;
  }

  if (elements.modalTaskStartDate.value && !startDate) {
    elements.modalError.textContent = "시작일을 YY-MM-DD 형식으로 입력하세요.";
    return null;
  }

  const dateError = validateTaskWorkDates(startDate, completedAt);
  if (dateError) {
    elements.modalError.textContent = dateError;
    return null;
  }

  if (isDuplicateTask({ clientId, title, dueDate }, activeTaskId)) {
    elements.modalError.textContent = "동일한 거래처, 업무 내용, 종료 예정일의 업무가 이미 등록되어 있습니다.";
    return null;
  }

  return {
    clientId,
    title,
    dueDate,
    startDate,
    completedAt,
    completionNote: elements.completionNote.value.trim(),
    executionMemo: elements.executionMemo.value.trim()
  };
}

function saveTaskEdits() {
  const taskPayload = getTaskModalPayload();
  if (!taskPayload) {
    return;
  }

  const previousTask = systemData.tasks.find((task) => task.id === activeTaskId);
  const wasCompleted = isCompletedTask(previousTask);

  systemData.tasks = systemData.tasks.map((task) => {
    if (task.id !== activeTaskId) {
      return task;
    }

    const completedAt = taskPayload.completedAt;
    const startDate = completedAt ? taskPayload.startDate || completedAt : taskPayload.startDate;
    const updatedTask = {
      ...task,
      clientId: taskPayload.clientId,
      title: taskPayload.title,
      description: taskPayload.title,
      dueDate: taskPayload.dueDate,
      startDate,
      completedAt,
      completionNote: completedAt ? taskPayload.completionNote : "",
      executionMemo: completedAt ? taskPayload.executionMemo : "",
      recurrenceDay: task.recurrence === "monthly" ? getDayOfMonth(taskPayload.dueDate) : 0
    };

    return {
      ...updatedTask,
      status: getStoredTaskStatus(updatedTask)
    };
  });

  const updatedTask = systemData.tasks.find((task) => task.id === activeTaskId);
  if (!wasCompleted && isCompletedTask(updatedTask)) {
    ensureNextMonthlyTask(updatedTask);
  }
  persist();
  closeCompletionModal();
}

function ensureNextMonthlyTask(task) {
  if (!task || task.recurrence !== "monthly" || !isCompletedTask(task)) {
    return;
  }

  const nextDueDate = getNextMonthlyDueDate(task);
  const hasNextTask = systemData.tasks.some((item) => {
    return item.id !== task.id
      && item.recurrence === "monthly"
      && item.recurrenceGroupId === task.recurrenceGroupId
      && item.dueDate === nextDueDate;
  });

  if (hasNextTask || isDuplicateTask({ clientId: task.clientId, title: task.title, dueDate: nextDueDate }, task.id)) {
    return;
  }

  systemData.tasks = [
    {
      id: createId("task"),
      clientId: task.clientId,
      title: task.title,
      description: task.description || task.title,
      startDate: "",
      dueDate: nextDueDate,
      status: TASK_STATUS.WAITING,
      completedAt: "",
      completionNote: "",
      executionMemo: "",
      recurrence: "monthly",
      recurrenceGroupId: task.recurrenceGroupId,
      recurrenceDay: task.recurrenceDay || getDayOfMonth(task.dueDate)
    },
    ...systemData.tasks
  ];
}

function deleteActiveTask() {
  const task = systemData.tasks.find((item) => item.id === activeTaskId);
  if (!task) {
    elements.modalError.textContent = "삭제할 업무를 찾을 수 없습니다.";
    return;
  }

  if (!window.confirm(`${task.title} 업무를 삭제할까요?`)) {
    return;
  }

  systemData.tasks = systemData.tasks.filter((item) => item.id !== activeTaskId);
  persist();
  closeCompletionModal();
}

function getFilteredReportTasks() {
  const query = elements.reportSearch.value.trim().toLowerCase();
  const status = elements.reportStatusFilter.value;
  const from = elements.reportDateFrom.value;
  const to = elements.reportDateTo.value;

  return systemData.tasks
    .filter((task) => {
      const matchesStatus = matchesTaskListFilter(task, status);
      const haystack = `${getClientName(task.clientId)} ${task.title}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesDate = isTaskInDateRange(task, from, to);
      return matchesStatus && matchesQuery && matchesDate;
    })
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function downloadCsv() {
  const rangeError = validateReportDateRange();
  if (rangeError) {
    elements.reportQueryMessage.textContent = rangeError;
    renderReports();
    return;
  }

  const headers = ["거래처", "업무 내용", "종료 예정일", "상태", "완료일", "완료 내용", "실행 메모"];
  const rows = getFilteredReportTasks().map((task) => [
    getClientName(task.clientId),
    task.title,
    formatShortDate(task.dueDate),
      getTaskState(task).label,
    task.completedAt ? formatShortDate(task.completedAt) : "",
    task.completionNote || "",
    task.executionMemo || ""
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `b2b_work_report_${todayString().replaceAll("-", "")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function getClientName(clientId) {
  const client = systemData.clients.find((item) => item.id === clientId);
  return client ? client.name : "미지정 거래처";
}

function openTaskFilter(filterKey) {
  elements.taskStatusFilter.value = filterKey;
  taskHasQueried = true;
  switchView("tasks");
  renderTasks();
}

function matchesTaskListFilter(task, filter) {
  if (filter === "all") {
    return true;
  }

  return getTaskState(task).code === filter;
}

function getTaskState(task) {
  if (isCompletedTask(task)) {
    return { code: "complete", label: "완료" };
  }

  if (task.startDate) {
    return { code: "active", label: "진행 중" };
  }

  const daysUntilDue = getDateDiffInDays(todayString(), task.dueDate);

  if (Number.isNaN(daysUntilDue)) {
    return { code: "upcoming", label: "예정" };
  }

  if (daysUntilDue < 0) {
    return { code: "overdue", label: "경과" };
  }

  if (daysUntilDue === 0) {
    return { code: "today", label: "당일" };
  }

  if (daysUntilDue >= 1 && daysUntilDue <= 3) {
    return { code: "upcoming", label: "예정" };
  }

  if (daysUntilDue >= 4) {
    return { code: "future", label: "미도래" };
  }

  return { code: "upcoming", label: "예정" };
}

function getStoredTaskStatus(task) {
  if (isCompletedTask(task)) {
    return TASK_STATUS.COMPLETE;
  }

  if (task.startDate) {
    return TASK_STATUS.ACTIVE;
  }

  return TASK_STATUS.WAITING;
}

function isCompletedTask(task) {
  return Boolean(task && task.startDate && task.completedAt);
}

function inferStartDate(task) {
  const status = normalizeStoredStatus(task.status);

  if (status === TASK_STATUS.ACTIVE) {
    return todayString();
  }

  if (status === TASK_STATUS.COMPLETE) {
    return task.completedAt || "";
  }

  return "";
}

function normalizeStoredStatus(status) {
  if (Object.values(TASK_STATUS).includes(status)) {
    return status;
  }

  return LEGACY_STATUS_MAP[status] || TASK_STATUS.WAITING;
}

function getDateDiffInDays(startYmd, endYmd) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);

  if (!start || !end) {
    return NaN;
  }

  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function isDateAfter(leftYmd, rightYmd) {
  const left = parseYmd(leftYmd);
  const right = parseYmd(rightYmd);
  return Boolean(left && right && left.getTime() > right.getTime());
}

function getNextMonthlyDueDate(task) {
  const repeatDay = task.recurrenceDay || getDayOfMonth(task.dueDate);
  let nextDueDate = getMonthlyOccurrence(task.dueDate, repeatDay, 1);

  while (getDateDiffInDays(todayString(), nextDueDate) <= 0) {
    nextDueDate = getMonthlyOccurrence(nextDueDate, repeatDay, 1);
  }

  return nextDueDate;
}

function getMonthlyOccurrence(baseYmd, targetDay, monthOffset) {
  const baseDate = parseYmd(baseYmd) || new Date();
  const shifted = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(targetDay, lastDay));
  return ymdFromDate(shifted);
}

function getDayOfMonth(ymd) {
  const date = parseYmd(ymd);
  return date ? date.getDate() : new Date().getDate();
}

function parseYmd(value) {
  const normalized = normalizeDateInput(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized || "");
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const digits = raw.replace(/\D/g, "");
  let year = "";
  let month = "";
  let day = "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return isValidYmd(raw) ? raw : "";
  }

  if (/^\d{2}-\d{2}-\d{2}$/.test(raw)) {
    const candidate = `20${raw}`;
    return isValidYmd(candidate) ? candidate : "";
  }

  if (digits.length === 6) {
    year = `20${digits.slice(0, 2)}`;
    month = digits.slice(2, 4);
    day = digits.slice(4, 6);
  } else if (digits.length === 8) {
    year = digits.slice(0, 4);
    month = digits.slice(4, 6);
    day = digits.slice(6, 8);
  } else {
    return "";
  }

  const candidate = `${year}-${month}-${day}`;
  return isValidYmd(candidate) ? candidate : "";
}

function isValidYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatShortDate(value) {
  const normalized = normalizeDateInput(value);
  return normalized ? normalized.slice(2) : "";
}

function normalizeDateField(input) {
  if (!input.value.trim()) {
    return;
  }

  const normalized = normalizeDateInput(input.value);
  if (normalized) {
    input.value = formatShortDate(normalized);
  }
}

function appendMeta(parent, label, value) {
  const line = el("span");
  line.textContent = `${label}: ${value}`;
  parent.appendChild(line);
}

function addTextSpan(parent, text) {
  const span = el("span");
  span.textContent = text;
  parent.appendChild(span);
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function el(tagName, className) {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  return node;
}

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ymdFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(ymd, monthOffset) {
  const date = parseYmd(ymd) || new Date();
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return ymdFromDate(shifted);
}

function formatDateForDisplay(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
