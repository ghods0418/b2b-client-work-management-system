const STORAGE_KEY = "sme_b2b_system_data";
const STATUSES = ["대기", "진행중", "완료"];

let systemData = loadData();
let activeTaskId = null;

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  summaryCards: document.getElementById("summaryCards"),
  upcomingTasks: document.getElementById("upcomingTasks"),
  clientWorkload: document.getElementById("clientWorkload"),
  clientList: document.getElementById("clientList"),
  templateList: document.getElementById("templateList"),
  taskList: document.getElementById("taskList"),
  taskStatusFilter: document.getElementById("taskStatusFilter"),
  reportSearch: document.getElementById("reportSearch"),
  reportStatusFilter: document.getElementById("reportStatusFilter"),
  reportRows: document.getElementById("reportRows"),
  printReport: document.getElementById("printReport"),
  downloadCsv: document.getElementById("downloadCsv"),
  printDate: document.getElementById("printDate"),
  modal: document.getElementById("completionModal"),
  closeModal: document.getElementById("closeModal"),
  cancelModal: document.getElementById("cancelModal"),
  completionForm: document.getElementById("completionForm"),
  modalTaskTitle: document.getElementById("modalTaskTitle"),
  completedAt: document.getElementById("completedAt"),
  completionNote: document.getElementById("completionNote"),
  executionMemo: document.getElementById("executionMemo"),
  modalError: document.getElementById("modalError")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  elements.todayLabel.textContent = formatDateForDisplay(new Date());
  elements.printDate.textContent = `출력일: ${formatDateForDisplay(new Date())}`;

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.target));
  });

  elements.taskStatusFilter.addEventListener("change", renderTasks);
  elements.reportSearch.addEventListener("input", renderReports);
  elements.reportStatusFilter.addEventListener("change", renderReports);
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
  const clients = Array.isArray(data.clients) ? data.clients : [];
  const templates = Array.isArray(data.templates) ? data.templates : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [];
  return { clients, templates, tasks };
}

function normalizeTask(task) {
  return {
    id: task.id || createId("task"),
    clientId: task.clientId || "",
    title: task.title || "제목 없는 업무",
    description: task.description || "",
    dueDate: task.dueDate || todayString(),
    status: STATUSES.includes(task.status) ? task.status : "대기",
    completedAt: task.completedAt || "",
    completionNote: task.completionNote || "",
    executionMemo: task.executionMemo || ""
  };
}

function createSeedData() {
  return {
    clients: [
      {
        id: "client-1",
        name: "A회사(VIP)",
        contactName: "김철수 팀장",
        email: "kim.cs@acorp.co.kr",
        phone: "010-1234-5678",
        notes: "매주 주요 업무 진행 상황을 빠르게 공유받길 원함. 정기 보고서 품질에 민감한 VIP 거래처.",
        createdAt: "2026-06-01"
      },
      {
        id: "client-2",
        name: "B회사",
        contactName: "이영희 과장",
        email: "lee.yh@bpartners.net",
        phone: "010-9876-5432",
        notes: "매월 10일 전 세금계산서와 청구 자료 확인 필요. 자료 요청은 최소 2일 전 안내.",
        createdAt: "2026-06-05"
      },
      {
        id: "client-3",
        name: "C회사",
        contactName: "박민수 대리",
        email: "park.ms@ccorp.io",
        phone: "010-3344-5566",
        notes: "신규 스타트업 고객. 연구개발 세액공제와 정부지원금 관련 반복 확인 업무가 많음.",
        createdAt: "2026-06-10"
      }
    ],
    templates: [
      {
        id: "tpl-1",
        title: "월간 세금계산서 발행 전 검토",
        description: "거래 내역, 공급가액, 담당자 확인 후 세금계산서 발행 준비",
        category: "세무/회계"
      },
      {
        id: "tpl-2",
        title: "급여 자료 수집 및 원천세 신고 준비",
        description: "입퇴사자 변동, 급여 확정 자료, 원천징수 관련 증빙 수집",
        category: "인사/세무"
      },
      {
        id: "tpl-3",
        title: "주간 VIP 진행상황 보고",
        description: "핵심 업무 진행률, 이슈, 다음 액션을 정리해 거래처에 공유",
        category: "고객관리"
      }
    ],
    tasks: [
      {
        id: "task-1",
        clientId: "client-1",
        title: "6월 4주차 VIP 진행상황 보고서 발송",
        description: "A회사 주요 진행 업무와 다음 주 확인 필요 사항을 정리해 이메일 발송",
        dueDate: "2026-06-25",
        status: "진행중",
        completedAt: "",
        completionNote: "",
        executionMemo: ""
      },
      {
        id: "task-2",
        clientId: "client-2",
        title: "6월 세금계산서 발행 전 거래내역 검토",
        description: "B회사 청구 대상 항목과 공급가액 확정 후 담당자에게 확인 요청",
        dueDate: "2026-06-20",
        status: "완료",
        completedAt: "2026-06-18",
        completionNote: "거래내역 확인 후 세금계산서 발행 완료",
        executionMemo: "청구 항목 1건의 품목명이 변경되어 담당자 승인 후 반영함"
      },
      {
        id: "task-3",
        clientId: "client-3",
        title: "연구개발 세액공제 가능 항목 사전 검토",
        description: "C회사 연구개발 인력과 프로젝트 지출 내역을 기준으로 적용 가능성 확인",
        dueDate: "2026-06-22",
        status: "대기",
        completedAt: "",
        completionNote: "",
        executionMemo: ""
      },
      {
        id: "task-4",
        clientId: "client-1",
        title: "분기별 미수금 현황 확인",
        description: "A회사 미수금 잔액과 입금 예정일 확인",
        dueDate: "2026-06-28",
        status: "대기",
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
  renderDashboard();
  renderClients();
  renderTemplates();
  renderTasks();
  renderReports();
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
  clearNode(elements.clientWorkload);

  const total = systemData.tasks.length;
  const done = systemData.tasks.filter((task) => task.status === "완료").length;
  const inProgress = systemData.tasks.filter((task) => task.status === "진행중").length;
  const waiting = systemData.tasks.filter((task) => task.status === "대기").length;
  [
    ["전체 업무", total],
    ["진행중", inProgress],
    ["대기", waiting],
    ["완료", done]
  ].forEach(([label, value]) => elements.summaryCards.appendChild(createSummaryCard(label, value)));

  const upcoming = systemData.tasks
    .filter((task) => task.status !== "완료")
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  if (upcoming.length === 0) {
    elements.upcomingTasks.appendChild(createEmptyState("남은 업무가 없습니다."));
  } else {
    upcoming.forEach((task) => {
      elements.upcomingTasks.appendChild(createTaskItem(task, { compact: true }));
    });
  }

  systemData.clients.forEach((client) => {
    const row = el("div", "task-item");
    const badge = el("span", "status-badge");
    badge.textContent = String(systemData.tasks.filter((task) => task.clientId === client.id).length);
    const main = el("div", "task-main");
    const name = el("strong");
    name.textContent = client.name;
    const detail = el("p", "task-desc");
    detail.textContent = `${client.contactName} · ${client.phone}`;
    main.append(name, detail);
    row.append(badge, main);
    elements.clientWorkload.appendChild(row);
  });
}

function renderClients() {
  clearNode(elements.clientList);

  systemData.clients.forEach((client) => {
    const card = el("article", "entity-card");
    const title = el("h3");
    title.textContent = client.name;
    const notes = el("p");
    notes.textContent = client.notes;
    const meta = el("div", "entity-meta");
    appendMeta(meta, "담당자", client.contactName);
    appendMeta(meta, "이메일", client.email);
    appendMeta(meta, "전화", client.phone);
    appendMeta(meta, "등록일", client.createdAt);
    card.append(title, notes, meta);
    elements.clientList.appendChild(card);
  });
}

function renderTemplates() {
  clearNode(elements.templateList);

  systemData.templates.forEach((template) => {
    const card = el("article", "entity-card");
    const title = el("h3");
    title.textContent = template.title;
    const desc = el("p");
    desc.textContent = template.description;
    const category = el("span", "category-pill");
    category.textContent = template.category;
    card.append(title, desc, category);
    elements.templateList.appendChild(card);
  });
}

function renderTasks() {
  clearNode(elements.taskList);
  const filter = elements.taskStatusFilter.value;
  const tasks = systemData.tasks
    .filter((task) => filter === "all" || task.status === filter)
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
      task.dueDate,
      task.status,
      task.completedAt || "-",
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

function createSummaryCard(label, value) {
  const card = el("div", "summary-card");
  const labelNode = el("span");
  const valueNode = el("strong");
  labelNode.textContent = label;
  valueNode.textContent = String(value);
  card.append(labelNode, valueNode);
  return card;
}

function createTaskItem(task, options = {}) {
  const item = el("article", "task-item");
  const checkbox = document.createElement("input");
  checkbox.className = "task-check";
  checkbox.type = "checkbox";
  checkbox.checked = task.status === "완료";
  checkbox.disabled = task.status === "완료";
  checkbox.setAttribute("aria-label", "업무 완료 처리");
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      openCompletionModal(task.id);
    }
  });

  const main = el("div", "task-main");
  const titleRow = el("div", "task-title-row");
  const title = el("strong");
  title.textContent = task.title;
  const status = createStatusBadge(task.status);
  titleRow.append(title, status);

  const desc = el("p", "task-desc");
  desc.textContent = task.description;

  const meta = el("div", "task-meta");
  addTextSpan(meta, getClientName(task.clientId));
  addTextSpan(meta, `마감일 ${task.dueDate}`);
  if (task.completedAt) {
    addTextSpan(meta, `실제완료일 ${task.completedAt}`);
  }

  main.append(titleRow, desc, meta);

  if (task.status === "완료") {
    const detail = el("p", "completion-detail");
    detail.textContent = `완료내용: ${task.completionNote || "-"}\n실행메모: ${task.executionMemo || "-"}`;
    main.appendChild(detail);
  }

  const actions = el("div", "task-actions");
  if (!options.compact) {
    const completeButton = el("button", "small-button");
    completeButton.type = "button";
    completeButton.textContent = task.status === "완료" ? "완료됨" : "완료 처리";
    completeButton.disabled = task.status === "완료";
    completeButton.addEventListener("click", () => openCompletionModal(task.id));
    actions.appendChild(completeButton);
  } else {
    const completeButton = el("button", "small-button");
    completeButton.type = "button";
    completeButton.textContent = "완료";
    completeButton.addEventListener("click", () => openCompletionModal(task.id));
    actions.appendChild(completeButton);
  }

  item.append(checkbox, main, actions);
  return item;
}

function createStatusBadge(status) {
  const badge = el("span", "status-badge");
  if (status === "완료") {
    badge.classList.add("done");
  } else if (status === "진행중") {
    badge.classList.add("progress");
  } else {
    badge.classList.add("waiting");
  }
  badge.textContent = status;
  return badge;
}

function createEmptyState(message) {
  const empty = el("div", "empty-state");
  empty.textContent = message;
  return empty;
}

function openCompletionModal(taskId) {
  const task = systemData.tasks.find((item) => item.id === taskId);
  if (!task || task.status === "완료") {
    renderAll();
    return;
  }

  activeTaskId = taskId;
  elements.modalTaskTitle.textContent = task.title;
  elements.completedAt.value = todayString();
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

  const completedAt = elements.completedAt.value;
  const completionNote = elements.completionNote.value.trim();
  const executionMemo = elements.executionMemo.value.trim();

  if (!activeTaskId) {
    elements.modalError.textContent = "완료 처리할 업무를 찾을 수 없습니다.";
    return;
  }

  if (!completedAt) {
    elements.modalError.textContent = "완료 날짜를 선택하세요.";
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
      status: "완료",
      completedAt,
      completionNote,
      executionMemo
    };
  });

  persist();
  closeCompletionModal();
}

function getFilteredReportTasks() {
  const query = elements.reportSearch.value.trim().toLowerCase();
  const status = elements.reportStatusFilter.value;

  return systemData.tasks
    .filter((task) => {
      const matchesStatus = status === "all" || task.status === status;
      const haystack = `${getClientName(task.clientId)} ${task.title}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesQuery;
    })
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function downloadCsv() {
  const headers = ["거래처", "업무명", "마감일", "상태", "실제완료일", "완료내용", "실행메모"];
  const rows = getFilteredReportTasks().map((task) => [
    getClientName(task.clientId),
    task.title,
    task.dueDate,
    task.status,
    task.completedAt || "",
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
  return new Date().toISOString().slice(0, 10);
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
