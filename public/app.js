const state = {
  data: null,
  dashboard: null,
  activePortal: "doctor",
  activeFeatureFilter: "All",
  activeCrisis: 0
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const create = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

async function bootstrap() {
  await checkApi();
  const response = await fetchCaseStudy();
  state.data = await response.json();
  state.dashboard = state.data.dashboard;
  renderPage();
  bindInteractions();
}

async function fetchCaseStudy() {
  try {
    const apiResponse = await fetch("/api/case-study");
    if (apiResponse.ok) {
      return apiResponse;
    }
  } catch {
  }

  return fetch("../data/site.json");
}

async function checkApi() {
  const status = $("#api-status");
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    status.textContent = health.status === "ok" ? "API Online" : "API Checking";
    status.classList.toggle("is-ok", health.status === "ok");
  } catch {
    status.textContent = "Static Preview";
  }
}

function renderPage() {
  const { data } = state;
  $("#hero-summary").textContent = data.hero.summary;
  renderMetrics(data.metrics);
  renderConsole();
  renderProblem(data.problem);
  renderClinical(data.clinicalFoundation);
  renderRole(data.role);
  renderTeam(data.team);
  renderStakeholders(data.stakeholders);
  renderArchitecture(data.architecture);
  renderTimeline(data.timeline);
  renderFeatures();
  renderCrises();
  renderDecisions(data.technicalDecisions);
  renderOutcomes(data.outcomes);
  renderLessons(data.lessons);
}

function renderMetrics(metrics) {
  const root = $("#metrics-strip");
  root.innerHTML = "";
  metrics.slice(0, 6).forEach((metric) => {
    const tile = create("article", "metric-tile");
    tile.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span>`;
    tile.title = metric.detail;
    root.append(tile);
  });
}

function renderConsole() {
  const portalLabels = {
    doctor: "Doctor view",
    patient: "Patient view",
    admin: "Admin view"
  };

  $("#panel-context").textContent = portalLabels[state.activePortal];
  renderPatientList();
  renderLineChart();
  renderResponseBars();
  renderAlerts();
}

function renderPatientList() {
  const list = $("#patient-list");
  list.innerHTML = "";
  state.dashboard.patients.forEach((patient) => {
    const row = create("article", "patient-row");
    row.innerHTML = `
      <span class="avatar">${patient.name.charAt(0)}</span>
      <span>
        <strong>${patient.name}</strong>
        <span>Age ${patient.age} | ${patient.adherence}% adherence | ${patient.alert}</span>
      </span>
      <span class="grade">LA ${patient.grade}</span>
    `;
    list.append(row);
  });
}

function renderLineChart() {
  const chart = $("#line-chart");
  chart.innerHTML = "";
  const max = 10;
  state.dashboard.symptomTrend.forEach((value) => {
    const bar = create("span", "line-point");
    bar.style.height = `${Math.max(12, (value / max) * 135)}px`;
    bar.dataset.value = value;
    chart.append(bar);
  });
}

function renderResponseBars() {
  const root = $("#response-bars");
  root.innerHTML = "";
  state.dashboard.treatmentResponse.forEach((item) => {
    const row = create("div", "bar-row");
    row.innerHTML = `
      <span><b>${item.drug}</b><b>${item.rate}%</b></span>
      <div class="bar-track"><div class="bar-fill" style="width:${item.rate}%"></div></div>
    `;
    root.append(row);
  });
}

function renderAlerts() {
  const root = $("#alert-list");
  root.innerHTML = "";
  state.dashboard.alerts.forEach((alert) => {
    root.append(create("li", "", alert));
  });
}

function renderProblem(items) {
  const root = $("#problem-list");
  root.innerHTML = "";
  items.forEach((item, index) => {
    const row = create("article", "stack-item");
    row.innerHTML = `<span class="stack-number">${index + 1}</span><p>${item}</p>`;
    root.append(row);
  });
}

function renderClinical(clinical) {
  $("#gerd-definition").textContent = clinical.definition;
  renderList("#symptom-list", clinical.symptoms);
  renderList("#diagnostic-list", clinical.diagnostics);
  renderList("#treatment-list", clinical.treatmentPathways);

  const table = $("#classification-table");
  table.innerHTML = "";
  clinical.classification.forEach((row) => {
    const item = create("div", "classification-row");
    item.innerHTML = `<strong>${row.grade}</strong><span>${row.description}</span>`;
    table.append(item);
  });
}

function renderRole(role) {
  $("#role-headline").textContent = role.headline;
  $("#role-summary").textContent = role.summary;
  const root = $("#role-grid");
  root.innerHTML = "";
  role.areas.forEach((area) => {
    const card = create("article", "role-card");
    card.innerHTML = `<h3>${area.title}</h3><ul>${area.items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    root.append(card);
  });
}

function renderTeam(team) {
  const root = $("#team-table");
  root.innerHTML = `
    <div class="table-row header"><span>Role</span><span>Count</span><span>Responsibilities</span></div>
    ${team.map((row) => `
      <div class="table-row">
        <strong>${row.role}</strong>
        <span>${row.count}</span>
        <span>${row.responsibilities}</span>
      </div>
    `).join("")}
  `;
}

function renderStakeholders(stakeholders) {
  const root = $("#stakeholder-map");
  root.innerHTML = "";
  stakeholders.forEach((stakeholder) => {
    const card = create("article", "stakeholder-card");
    card.innerHTML = `
      <span class="tier">${stakeholder.tier}</span>
      <h3>${stakeholder.name}</h3>
      <p>${stakeholder.need}</p>
    `;
    root.append(card);
  });
}

function renderArchitecture(portals) {
  const root = $("#architecture-grid");
  root.innerHTML = "";
  portals.forEach((portal) => {
    const card = create("article", "portal-card");
    card.innerHTML = `
      <h3>${portal.portal}</h3>
      <p><strong>${portal.principle}</strong></p>
      <ul>${portal.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>
    `;
    root.append(card);
  });
}

function renderTimeline(phases) {
  const root = $("#timeline-list");
  root.innerHTML = "";
  phases.forEach((phase) => {
    const card = create("article", "timeline-card");
    card.innerHTML = `
      <div class="timeline-meta">${phase.phase}<span>${phase.weeks}</span></div>
      <div>
        <h3>${phase.title}</h3>
        <p>${phase.output}</p>
      </div>
    `;
    root.append(card);
  });
}

function renderFeatures() {
  const root = $("#feature-grid");
  const filter = state.activeFeatureFilter;
  root.innerHTML = "";
  state.data.features
    .filter((feature) => filter === "All" || feature.portal === filter)
    .forEach((feature) => {
      const card = create("article", "feature-card");
      card.innerHTML = `
        <span class="portal-badge">${feature.portal}</span>
        <h3>${feature.name}</h3>
        <p>${feature.description}</p>
      `;
      root.append(card);
    });
}

function renderCrises() {
  const list = $("#crisis-list");
  list.innerHTML = "";
  state.data.crises.forEach((crisis, index) => {
    const button = create("button", `crisis-button${index === state.activeCrisis ? " is-active" : ""}`);
    button.type = "button";
    button.dataset.index = index;
    button.innerHTML = `<span>${crisis.week}</span><strong>${crisis.title}</strong>`;
    list.append(button);
  });
  renderCrisisDetail();
}

function renderCrisisDetail() {
  const crisis = state.data.crises[state.activeCrisis];
  $("#crisis-detail").innerHTML = `
    <p class="eyebrow">${crisis.week}</p>
    <h3>${crisis.title}</h3>
    <p><strong>What happened:</strong> ${crisis.whatHappened}</p>
    <p><strong>What I did:</strong> ${crisis.resolution}</p>
    <p><strong>Outcome:</strong> ${crisis.outcome}</p>
  `;
}

function renderDecisions(decisions) {
  const root = $("#decision-grid");
  root.innerHTML = "";
  decisions.forEach((decision) => {
    const card = create("article", "decision-card");
    card.innerHTML = `<h3>${decision.title}</h3><p>${decision.decision}</p>`;
    root.append(card);
  });
}

function renderOutcomes(outcomes) {
  renderList("#outcome-list", outcomes);
}

function renderLessons(lessons) {
  const root = $("#lesson-grid");
  root.innerHTML = "";
  lessons.forEach((lesson, index) => {
    const card = create("article", "lesson-card");
    card.innerHTML = `<p class="eyebrow">Principle ${index + 1}</p><h3>${lesson.title}</h3><p>${lesson.body}</p>`;
    root.append(card);
  });
}

function renderList(selector, items) {
  const root = $(selector);
  root.innerHTML = "";
  items.forEach((item) => root.append(create("li", "", item)));
}

function bindInteractions() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activePortal = tab.dataset.portal;
      $$(".tab").forEach((item) => item.classList.toggle("is-active", item === tab));
      renderConsole();
    });
  });

  $$(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFeatureFilter = button.dataset.filter;
      $$(".filter-button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderFeatures();
    });
  });

  $("#crisis-list").addEventListener("click", (event) => {
    const button = event.target.closest(".crisis-button");
    if (!button) return;
    state.activeCrisis = Number(button.dataset.index);
    renderCrises();
  });

  const severity = $("input[name='severity']");
  severity.addEventListener("input", () => {
    $("#severity-value").textContent = severity.value;
  });

  $("#symptom-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#symptom-status");
    const form = new FormData(event.currentTarget);
    status.textContent = "Saving symptom log...";
    try {
      await postJson("/api/symptoms", Object.fromEntries(form.entries()));
      status.textContent = "Symptom log saved locally.";
    } catch {
      status.textContent = "Could not save right now. The front end is still running.";
    }
  });

  $("#contact-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#contact-status");
    const form = new FormData(event.currentTarget);
    status.textContent = "Sending...";
    try {
      await postJson("/api/contact", Object.fromEntries(form.entries()));
      status.textContent = "Message saved locally.";
      event.currentTarget.reset();
    } catch {
      status.textContent = "Could not save right now. Please use the email link.";
    }
  });
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", "<div class='load-error'>The GERD site could not load its case-study data.</div>");
});
