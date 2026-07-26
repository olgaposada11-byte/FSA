/* ==========================================================

   AI AGENT CHALLENGE

   app.js

   PARTE 1/3

 

   Incluye:

   - Configuración

   - Estado global

   - Datos iniciales

   - Persistencia con Supabase (base de datos conectada)

   - Utilidades

   - Login y logout

   - Navegación

   - Renderizado base

========================================================== */

 

"use strict";

 

 

/* ==========================================================

   CONFIGURACIÓN

========================================================== */

 

const CONFIG = {

    storageKey: "aiAgentChallengeData",

    sessionKey: "aiAgentChallengeSession",

 

    adminUsername: "ADMIN",

    adminPassword: "ADMIN",

 

    groupPassword: "IAenIO",

    autosaveDelay: 500

};


/* ==========================================================
   SUPABASE (base de datos conectada)
========================================================== */

const SUPABASE_URL = "https://ikdfhpoxotjgxbrpgmnc.supabase.co";
const SUPABASE_KEY = "sb_publishable_JB016Nx1rPbwTeeX5por1g_oA9lWOC_";

let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
} else {
    console.error(
        "No se ha podido cargar la librería de Supabase (window.supabase no está disponible). Comprueba tu conexión a internet o si algún bloqueador está impidiendo cargar cdn.jsdelivr.net."
    );
}

 

 

/* ==========================================================

   ESTADO GLOBAL

========================================================== */

 

const state = {

    session: null,

    data: null,

 

    currentPage: null,

    currentWizardStep: 1,

 

    selectedUseCaseCategory: "Todos",

    groupSearch: "",

    groupStatusFilter: "all",

    useCaseSearch: "",

    useCaseStatusFilter: "all",

    registrySearch: "",

    registryCategoryFilter: "all",

    registryView: "grid",

 

    editingUseCaseId: null,

    editingGroupId: null,

 

    autosaveTimer: null

};

 

 

/* ==========================================================

   DATOS INICIALES

========================================================== */

 

function createInitialData() {

    const now = new Date().toISOString();

 

    return {

        settings: {

            challengeName: "AI Agent Challenge",

            receptionOpen: true,

            organization: "IO Financiero",

            edition: "2026",

            challengeStartedAt: null

        },

 

        useCases: [
            {
                id: generateId("usecase"),
                name: "Preparación de propuestas y RFP",
                category: "Desarrollo de negocio",
                description:
                    "Asistentes orientados a analizar documentación, estructurar respuestas y acelerar la preparación de propuestas comerciales.",
                problem:
                    "La preparación de RFPs consume muchas horas de consultoría y depende de reutilizar contenido disperso en propuestas anteriores.",
                complexity: "medio",
                active: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: generateId("usecase"),
                name: "Gestión del conocimiento",
                category: "Conocimiento",
                description:
                    "Asistentes que permiten localizar, resumir y reutilizar conocimiento interno de forma más eficiente.",
                problem:
                    "El conocimiento interno está disperso en múltiples repositorios y cuesta encontrar la información relevante a tiempo.",
                complexity: "medio",
                active: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: generateId("usecase"),
                name: "Automatización de reporting",
                category: "Productividad",
                description:
                    "Asistentes que consolidan información, generan informes y facilitan el seguimiento de indicadores.",
                problem:
                    "Generar informes de seguimiento cada semana es un proceso manual, repetitivo y propenso a errores.",
                complexity: "bajo",
                active: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: generateId("usecase"),
                name: "Análisis documental",
                category: "Operaciones",
                description:
                    "Asistentes capaces de revisar documentos, extraer información relevante y detectar inconsistencias.",
                problem:
                    "La revisión manual de grandes volúmenes de documentación es lenta y puede pasar por alto inconsistencias importantes.",
                complexity: "alto",
                active: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: generateId("usecase"),
                name: "Soporte a procesos internos",
                category: "Procesos",
                description:
                    "Asistentes orientados a resolver consultas y acompañar la ejecución de procesos internos.",
                problem:
                    "Los equipos internos dedican tiempo a resolver dudas repetitivas sobre procesos ya documentados.",
                complexity: "bajo",
                active: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: generateId("usecase"),
                name: "Experiencia de cliente",
                category: "Cliente",
                description:
                    "Asistentes que ayudan a personalizar la atención, responder consultas y mejorar la experiencia del cliente.",
                problem:
                    "La atención al cliente no siempre es consistente ni está disponible con la rapidez que el cliente espera.",
                complexity: "medio",
                active: true,
                createdAt: now,
                updatedAt: now
            }
        ],


 

        groups: [],

 

        activity: [

            {

                id: generateId("activity"),

                type: "system",

                message: "El AI Agent Challenge ha sido inicializado.",

                createdAt: now

            }

        ]

    };

}

 

 

function createInitialGroup(username) {

    const now = new Date().toISOString();

 

    return {

        id: generateId("group"),

        username: username,

        name: username.replace("EQUIPO", "Equipo "),

        members: [],

        email: "",

        area: "",

        locked: false,

        createdAt: now,

        updatedAt: now,

 

        agent: {
            useCaseId: "",
            useCaseName: "",
            isCustomUseCase: false,

            name: "",
            description: "",
            problem: "",
            complexity: "",

            model: "",
            tools: "",
            handlesDocumentation: false,

            prompt: "",

            conversations: [],
            status: "draft",
            submittedAt: null,
            updatedAt: now
        }

    };

}

 

 

/* ==========================================================

   PERSISTENCIA

========================================================== */

 

async function fetchDataFromSupabase() {
    const [
        settingsResult,
        useCasesResult,
        groupsResult,
        assistantsResult,
        conversationsResult,
        activityResult
    ] = await Promise.all([
        supabaseClient.from("app_settings").select("*").maybeSingle(),
        supabaseClient.from("use_cases").select("*").order("created_at"),
        supabaseClient.from("groups").select("*").order("created_at"),
        supabaseClient.from("assistants").select("*"),
        supabaseClient.from("conversations").select("*").order("sort_order"),
        supabaseClient
            .from("activity_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50)
    ]);

    const firstError =
        settingsResult.error ||
        useCasesResult.error ||
        groupsResult.error ||
        assistantsResult.error ||
        conversationsResult.error ||
        activityResult.error;

    if (firstError) {
        throw firstError;
    }

    const settingsRow = settingsResult.data;

    const settings = settingsRow
        ? {
            challengeName: settingsRow.challenge_name,
            organization: settingsRow.organization,
            edition: settingsRow.edition,
            receptionOpen: settingsRow.reception_open,
            challengeStartedAt: settingsRow.challenge_started_at
        }
        : {};

    const useCases = (useCasesResult.data || []).map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        problem: row.problem,
        complexity: row.complexity || "",
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    const assistantByGroupId = new Map();

    (assistantsResult.data || []).forEach(row => {
        assistantByGroupId.set(row.group_id, row);
    });

    const conversationsByGroupId = new Map();

    (conversationsResult.data || []).forEach(row => {
        const list = conversationsByGroupId.get(row.group_id) || [];

        list.push({
            id: row.id,
            title: row.title || "",
            userMessage: row.user_message || "",
            assistantMessage: row.assistant_message || "",
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });

        conversationsByGroupId.set(row.group_id, list);
    });

    const groups = (groupsResult.data || []).map(row => {
        const assistantRow = assistantByGroupId.get(row.id) || {};
        const isCustomUseCase = Boolean(assistantRow.is_custom_use_case);

        return {
            id: row.id,
            username: row.username,
            name: row.name,
            email: row.email || "",
            area: row.area || "",
            members: Array.isArray(row.members) ? row.members : [],
            locked: Boolean(row.locked),
            createdAt: row.created_at,
            updatedAt: row.updated_at,

            agent: {
                useCaseId:
                    isCustomUseCase
                        ? "custom"
                        : (assistantRow.use_case_id || ""),
                useCaseName: assistantRow.use_case_name || "",
                isCustomUseCase,

                name: assistantRow.name || "",
                description: assistantRow.description || "",
                problem: assistantRow.problem || "",
                complexity: assistantRow.complexity || "",

                model: assistantRow.model || "",
                tools: assistantRow.tools || "",
                handlesDocumentation:
                    Boolean(assistantRow.handles_documentation),

                prompt: assistantRow.prompt || "",

                conversations:
                    conversationsByGroupId.get(row.id) || [],
                status: assistantRow.status || "draft",
                submittedAt: assistantRow.submitted_at || null,
                updatedAt:
                    assistantRow.updated_at || row.updated_at
            }
        };
    });

    const activity = (activityResult.data || []).map(row => ({
        id: row.id,
        type: row.type,
        message: row.message,
        createdAt: row.created_at
    }));

    return {
        settings,
        useCases,
        groups,
        activity
    };
}


async function loadData() {
    try {
        const rawData = await fetchDataFromSupabase();

        return normalizeData(rawData);

    } catch (error) {
        console.error(
            "No se pudieron cargar los datos de Supabase:",
            error
        );

        showToast(
            "No se ha podido conectar con la base de datos. Comprueba tu conexión.",
            "error"
        );

        return createInitialData();
    }
}


async function saveSettingsToSupabase() {
    try {
        const settings = state.data.settings;

        const result =
            await supabaseClient.from("app_settings").upsert({
                id: true,
                challenge_name: settings.challengeName,
                organization: settings.organization,
                edition: settings.edition,
                reception_open: settings.receptionOpen,
                challenge_started_at:
                    settings.challengeStartedAt
            });

        if (result.error) {
            throw result.error;
        }

        return true;

    } catch (error) {
        console.error(
            "No se pudieron guardar los ajustes:",
            error
        );

        showToast(
            "No se han podido guardar los cambios.",
            "error"
        );

        return false;
    }
}


function buildGroupRow(group) {
    return {
        id: group.id,
        username: group.username,
        name: group.name,
        email: group.email || "",
        area: group.area || "",
        members: group.members || [],
        locked: Boolean(group.locked)
    };
}


function buildAssistantRow(group) {
    return {
        group_id: group.id,
        use_case_id:
            group.agent.isCustomUseCase
                ? null
                : (group.agent.useCaseId || null),
        use_case_name: group.agent.useCaseName || "",
        is_custom_use_case:
            Boolean(group.agent.isCustomUseCase),

        name: group.agent.name || "",
        description: group.agent.description || "",
        problem: group.agent.problem || "",
        complexity: group.agent.complexity || null,

        model: group.agent.model || "",
        tools: group.agent.tools || "",
        handles_documentation:
            Boolean(group.agent.handlesDocumentation),

        prompt: group.agent.prompt || "",

        status: group.agent.status || "draft",
        submitted_at: group.agent.submittedAt || null
    };
}


async function saveGroupToSupabase(group) {
    if (!group) {
        return false;
    }

    try {
        // Los asistentes dependen de group_id (clave foránea),
        // así que el grupo se guarda primero y confirmado antes
        // de tocar su asistente.
        const groupResult =
            await supabaseClient
                .from("groups")
                .upsert(buildGroupRow(group));

        if (groupResult.error) {
            throw groupResult.error;
        }

        const assistantResult =
            await supabaseClient
                .from("assistants")
                .upsert(
                    buildAssistantRow(group),
                    { onConflict: "group_id" }
                );

        if (assistantResult.error) {
            throw assistantResult.error;
        }

        // Solo se sincronizan las conversaciones DE ESTE grupo,
        // nunca las de los demás.
        await supabaseClient
            .from("conversations")
            .delete()
            .eq("group_id", group.id);

        const rows =
            group.agent.conversations.map(
                (conversation, index) => ({
                    id: conversation.id,
                    group_id: group.id,
                    title: conversation.title || "",
                    user_message:
                        conversation.userMessage || "",
                    assistant_message:
                        conversation.assistantMessage || "",
                    sort_order: index
                })
            );

        if (rows.length) {
            const conversationsResult =
                await supabaseClient
                    .from("conversations")
                    .insert(rows);

            if (conversationsResult.error) {
                throw conversationsResult.error;
            }
        }

        return true;

    } catch (error) {
        console.error(
            "No se pudo guardar el grupo:",
            error
        );

        showToast(
            "No se han podido guardar los cambios.",
            "error"
        );

        return false;
    }
}


function saveGroupToSupabaseDebounced(group) {
    window.clearTimeout(state.autosaveTimer);

    state.autosaveTimer = window.setTimeout(() => {
        saveGroupToSupabase(group);
    }, CONFIG.autosaveDelay);
}


async function saveUseCaseToSupabase(useCase) {
    if (!useCase) {
        return false;
    }

    try {
        const result =
            await supabaseClient.from("use_cases").upsert({
                id: useCase.id,
                name: useCase.name,
                category: useCase.category,
                description: useCase.description,
                problem: useCase.problem || "",
                complexity: useCase.complexity || null,
                active: useCase.active
            });

        if (result.error) {
            throw result.error;
        }

        return true;

    } catch (error) {
        console.error(
            "No se pudo guardar el caso de uso:",
            error
        );

        showToast(
            "No se han podido guardar los cambios.",
            "error"
        );

        return false;
    }
}


async function syncAllDataToSupabase() {
    try {
        const settingsResult = await saveSettingsToSupabase();

        for (const useCase of state.data.useCases) {
            await saveUseCaseToSupabase(useCase);
        }

        for (const group of state.data.groups) {
            await saveGroupToSupabase(group);
        }

        return settingsResult;

    } catch (error) {
        console.error(
            "No se pudieron sincronizar todos los datos:",
            error
        );

        return false;
    }
}


function normalizeData(data) {

    const initialData = createInitialData();

 

    return {

        settings: {

            ...initialData.settings,

            ...(data?.settings || {})

        },

 

        useCases: Array.isArray(data?.useCases)

            ? data.useCases

            : initialData.useCases,

 

        groups: Array.isArray(data?.groups)

            ? data.groups.map(normalizeGroup)

            : initialData.groups,

 

        activity: Array.isArray(data?.activity)

            ? data.activity

            : initialData.activity

    };

}

 

 

function normalizeGroup(group) {

    const emptyGroup = createInitialGroup(

        group?.username || "EQUIPO"

    );

 

    return {

        ...emptyGroup,

        ...group,

 

        members: Array.isArray(group?.members)

            ? group.members

            : [],

 

        agent: {

            ...emptyGroup.agent,

            ...(group?.agent || {}),

 

            conversations: Array.isArray(

                group?.agent?.conversations

            )

                ? group.agent.conversations

                : []

        }

    };

}

 

 

/* ==========================================================

   SESIÓN

========================================================== */

 

function loadSession() {

    try {

        const storedSession = sessionStorage.getItem(

            CONFIG.sessionKey

        );

 

        return storedSession

            ? JSON.parse(storedSession)

            : null;

 

    } catch (error) {

        console.error("No se pudo recuperar la sesión:", error);

        return null;

    }

}

 

 

function saveSession() {

    sessionStorage.setItem(

        CONFIG.sessionKey,

        JSON.stringify(state.session)

    );

}

 

 

function clearSession() {

    state.session = null;

    state.currentPage = null;

    state.currentWizardStep = 1;

 

    sessionStorage.removeItem(CONFIG.sessionKey);

}

 

 

/* ==========================================================

   UTILIDADES GENERALES

========================================================== */

 

function generateId(prefix = "item") {

    if (

        window.crypto &&

        typeof window.crypto.randomUUID === "function"

    ) {

        return window.crypto.randomUUID();

    }

 

    return `${prefix}_${Date.now()}_${Math.random()

        .toString(36)

        .slice(2, 9)}`;

}

 

 

function escapeHtml(value = "") {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}

 

 

function formatDate(value, includeTime = false) {

    if (!value) {

        return "—";

    }

 

    const date = new Date(value);

 

    if (Number.isNaN(date.getTime())) {

        return "—";

    }

 

    return new Intl.DateTimeFormat(

        "es-ES",

        includeTime

            ? {

                day: "2-digit",

                month: "2-digit",

                year: "numeric",

                hour: "2-digit",

                minute: "2-digit"

            }

            : {

                day: "2-digit",

                month: "2-digit",

                year: "numeric"

            }

    ).format(date);

}

 

 

function downloadFile(filename, content, mimeType) {

    const blob = new Blob(

        [content],

        { type: mimeType }

    );

 

    const url = URL.createObjectURL(blob);

 

    const link = document.createElement("a");

 

    link.href = url;

    link.download = filename;

 

    document.body.appendChild(link);

    link.click();

    link.remove();

 

    URL.revokeObjectURL(url);

}

 

 

function getElement(id) {

    return document.getElementById(id);

}

 

 

function setText(id, value) {

    const element = getElement(id);

 

    if (element) {

        element.textContent = value ?? "";

    }

}

 

 

function setValue(id, value) {

    const element = getElement(id);

 

    if (element) {

        element.value = value ?? "";

    }

}

 

 

function getValue(id) {

    const element = getElement(id);

 

    return element

        ? element.value.trim()

        : "";

}

 

 

function setChecked(id, checked) {

    const element = getElement(id);

 

    if (element) {

        element.checked = Boolean(checked);

    }

}


function getChecked(id) {
    const element = getElement(id);

    return element ? Boolean(element.checked) : false;
}


 

 

function cloneTemplate(templateId) {

    const template = getElement(templateId);

 

    if (!template) {

        console.warn(

            `No se ha encontrado el template "${templateId}".`

        );

 

        return document.createDocumentFragment();

    }

 

    return template.content.cloneNode(true);

}

 

 

function showElement(element) {

    if (element) {

        element.classList.remove("hidden");

    }

}

 

 

function hideElement(element) {

    if (element) {

        element.classList.add("hidden");

    }

}

 

 

/* ==========================================================

   TOAST Y LOADER

========================================================== */

 

function showToast(message, type = "default") {

    const toast = getElement("toast");

 

    if (!toast) {

        console.log(message);

        return;

    }

 

    toast.textContent = message;

 

    toast.classList.remove(

        "success",

        "error",

        "show"

    );

 

    if (type === "success" || type === "error") {

        toast.classList.add(type);

    }

 

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

 

    window.setTimeout(() => {

        toast.classList.remove("show");

    }, 3200);

}

 

 

function showLoader(message = "Cargando...") {

    const loader = getElement("globalLoader");

 

    if (!loader) {

        return;

    }

 

    const label = loader.querySelector("span");

 

    if (label) {

        label.textContent = message;

    }

 

    loader.classList.remove("hidden");

    loader.setAttribute("aria-hidden", "false");

}

 

 

function hideLoader() {

    const loader = getElement("globalLoader");

 

    if (!loader) {

        return;

    }

 

    loader.classList.add("hidden");

    loader.setAttribute("aria-hidden", "true");

}


/* ==========================================================
   CONFETI (celebración al enviar)
========================================================== */

function triggerConfetti() {
    const canvas = document.createElement("canvas");

    canvas.className = "confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    const colors = [
        "#fe7c39",
        "#934821",
        "#16a34a",
        "#2563eb",
        "#f59e0b",
        "#ffffff"
    ];

    const gravity = 0.18;
    const particleCount = 160;
    const duration = 2600;

    const particles = Array.from(
        { length: particleCount },
        () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.3,
            size: 6 + Math.random() * 6,
            color:
                colors[
                    Math.floor(Math.random() * colors.length)
                ],
            speedX: (Math.random() - 0.5) * 6,
            speedY: 2 + Math.random() * 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12
        })
    );

    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.speedY += gravity;
            particle.y += particle.speedY;
            particle.rotation += particle.rotationSpeed;

            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate((particle.rotation * Math.PI) / 180);
            ctx.fillStyle = particle.color;
            ctx.fillRect(
                -particle.size / 2,
                -particle.size / 4,
                particle.size,
                particle.size / 2
            );
            ctx.restore();
        });

        if (elapsed < duration) {
            requestAnimationFrame(frame);
        } else {
            canvas.remove();
        }
    }

    requestAnimationFrame(frame);
}


 

 

/* ==========================================================

   DATOS DE LA SESIÓN ACTUAL

========================================================== */

 

function getCurrentGroup() {

    if (

        !state.session ||

        state.session.role !== "group"

    ) {

        return null;

    }

 

    return state.data.groups.find(

        group => group.id === state.session.groupId

    ) || null;

}

 

 

function getUseCaseById(useCaseId) {

    return state.data.useCases.find(

        useCase => useCase.id === useCaseId

    ) || null;

}


function getUseCaseDisplayName(agent) {
    if (!agent) {
        return "Sin seleccionar";
    }

    if (agent.isCustomUseCase) {
        return "Personalizado";
    }

    const useCase = getUseCaseById(agent.useCaseId);

    return useCase?.name || "Sin seleccionar";
}

 

 

function getGroupById(groupId) {

    return state.data.groups.find(

        group => group.id === groupId

    ) || null;

}

 

 

function getSubmittedGroups() {

    return state.data.groups.filter(

        group => group.agent.status === "submitted"

    );

}

 

 

function addActivity(message, type = "system") {

    const entry = {

        id: generateId("activity"),

        type,

        message,

        createdAt: new Date().toISOString()

    };

 

    state.data.activity.unshift(entry);

 

    state.data.activity = state.data.activity.slice(0, 50);

 

    supabaseClient

        .from("activity_log")

        .insert({

            id: entry.id,

            type: entry.type,

            message: entry.message

        })

        .then(({ error }) => {

            if (error) {

                console.error(

                    "No se pudo registrar la actividad:",

                    error

                );

            }

        });

}

 

 

/* ==========================================================

   PROGRESO DEL ASISTENTE

========================================================== */

 

function calculateAgentProgress(agent) {
    if (!agent) {
        return 0;
    }

    const fields = [
        agent.useCaseId,
        agent.name,
        agent.description,
        agent.problem,
        agent.complexity,
        agent.model,
        agent.tools,
        agent.prompt
    ];

    const completedFields = fields.filter(
        value => String(value || "").trim().length > 0
    ).length;

    const conversationCompleted =
        Array.isArray(agent.conversations) &&
        agent.conversations.some(
            conversation =>
                conversation.userMessage?.trim() &&
                conversation.assistantMessage?.trim()
        );

    const totalItems = fields.length + 1;

    return Math.round(
        (
            completedFields +
            (conversationCompleted ? 1 : 0)
        ) /
        totalItems *
        100
    );
}

 

 

function getAgentStatusLabel(status) {

    const labels = {

        draft: "Borrador",

        submitted: "Enviado"

    };

 

    return labels[status] || "Borrador";

}

 

 

function getAgentStatusBadge(status) {

    if (status === "submitted") {

        return `

            <span class="badge badge-success">

                Enviado

            </span>

        `;

    }

 

    return `

        <span class="badge badge-warning">

            Borrador

        </span>

    `;

}


function getComplexityLabel(value) {
    const labels = {
        bajo: "Bajo",
        medio: "Medio",
        alto: "Alto"
    };

    return labels[value] || "Sin definir";
}


function getComplexityBadgeHtml(value) {
    const dotClass =
        value === "bajo" || value === "medio" || value === "alto"
            ? `complexity-dot-${value}`
            : "complexity-dot-sindefinir";

    return `
        <span class="complexity-badge">
            <span class="complexity-dot ${dotClass}" aria-hidden="true"></span>
            ${escapeHtml(getComplexityLabel(value))}
        </span>
    `;
}


 

 

/* ==========================================================

   LOGIN

========================================================== */

 

function initializeLogin() {

    const loginForm =

        getElement("loginForm") ||

        document.querySelector("[data-login-form]");

 

    const passwordToggle =

        getElement("togglePassword") ||

        document.querySelector("[data-password-toggle]");

 

    if (loginForm) {

        loginForm.addEventListener(

            "submit",

            handleLogin

        );

    }

 

    if (passwordToggle) {

        passwordToggle.addEventListener(

            "click",

            togglePasswordVisibility

        );

    }

}

 

 

function handleLogin(event) {

    event.preventDefault();

    console.log("[DEBUG] handleLogin se ha ejecutado");

 

    const usernameInput =

        document.getElementById("loginUsername");

 

    const passwordInput =

        document.getElementById("loginPassword");

 

    const errorElement =

        document.getElementById("loginError");

 

    const username =

        usernameInput.value.trim();

 

    const password =

        passwordInput.value.trim();

 

    if (

        username.toUpperCase() === "ADMIN" &&

        password === "ADMIN"

    ) {

        state.session = {

            role: "admin",

            username: "ADMIN",

            groupId: null

        };

 

        saveSession();

        hideLoginError(errorElement);

        enterApplication();

 

        return;

    }

 

    const groupMatch =

        username.match(/^GRUPO\s*0*(\d+)$/i);

 

    if (

        groupMatch &&

        password === "IAenIO"

    ) {

        const groupNumber =

            Number(groupMatch[1]);

 

        const normalizedUsername =

            `GRUPO ${groupNumber}`;

 

        let group =

            state.data.groups.find(

                item =>

                    String(item.username)

                        .trim()

                        .toUpperCase() ===

                    normalizedUsername.toUpperCase()

            );

 

        if (!group) {

            console.log("[DEBUG] Creando grupo nuevo:", normalizedUsername);

            group =

                createInitialGroup(

                    normalizedUsername

                );

 

            group.name =

                normalizedUsername;

 

            group.username =

                normalizedUsername;

 

            state.data.groups.push(group);

            console.log("[DEBUG] Llamando a saveGroupToSupabase con id:", group.id);

            saveGroupToSupabase(group).then(ok => {
                console.log("[DEBUG] saveGroupToSupabase terminó, éxito:", ok);
            });

        } else {

            console.log("[DEBUG] Grupo ya existía en memoria:", group.id);

        }

 

        state.session = {

            role: "group",

            username:

                normalizedUsername,

            groupId:

                group.id

        };

 

        saveSession();

        hideLoginError(errorElement);

        enterApplication();

 

        return;

    }

 

    showLoginError(

        "Usuario o contraseña incorrectos. Usa GRUPO 1, GRUPO 2… o ADMIN."

    );

}

 

 

function togglePasswordVisibility() {

    const passwordInput =

        getElement("loginPassword") ||

        getElement("loginPassword") ||

        document.querySelector(

            '[name="password"]'

        );

 

    if (!passwordInput) {

        return;

    }

 

    const isPassword =

        passwordInput.type === "password";

 

    passwordInput.type = isPassword

        ? "text"

        : "password";

 

    const toggle =

        getElement("togglePassword") ||

        document.querySelector(

            "[data-password-toggle]"

        );

 

    if (toggle) {

        toggle.textContent = isPassword

            ? "Ocultar"

            : "Mostrar";

    }

}

 

 

function showLoginError(message) {

    const errorElement =

        getElement("loginError") ||

        document.querySelector(

            "[data-login-error]"

        );

 

    if (!errorElement) {

        showToast(message, "error");

        return;

    }

 

    errorElement.textContent = message;

    errorElement.style.display = "block";

}

 

 

function hideLoginError() {

    const errorElement =

        getElement("loginError") ||

        document.querySelector(

            "[data-login-error]"

        );

 

    if (!errorElement) {

        return;

    }

 

    errorElement.textContent = "";

    errorElement.style.display = "none";

}

 

 

function logout() {

    clearSession();

 

    const appView = getElement("appView");

    const loginView =

        getElement("loginView") ||

        getElement("loginView");

 

    hideElement(appView);

    showElement(loginView);

 

    const passwordInput =

        getElement("loginPassword") ||

        getElement("loginPassword");

 

    if (passwordInput) {

        passwordInput.value = "";

        passwordInput.type = "password";

    }

 

    hideLoginError();

}

 

 

/* ==========================================================

   ENTRADA EN LA APLICACIÓN

========================================================== */

 

function enterApplication() {

    if (
        state.session &&
        state.session.role === "group" &&
        !getCurrentGroup()
    ) {
        clearSession();
        state.session = null;

        logout();

        showLoginError(
            "Tu sesión ya no es válida (puede que el grupo se haya reiniciado). Vuelve a entrar con tu usuario y contraseña."
        );

        return;
    }

    const loginView =

        getElement("loginView") ||

        getElement("loginView");

 

    const appView = getElement("appView");

 

    hideElement(loginView);

    showElement(appView);

 

    configureApplicationShell();

    navigateTo(

        state.currentPage ||

        getDefaultPage()

    );

}

 

 

function getDefaultPage() {

    if (!state.session) {

        return null;

    }

 

    return state.session.role === "admin"

        ? "admin-dashboard"

        : "group-dashboard";

}

 

 

/* ==========================================================

   SHELL: SIDEBAR Y TOPBAR

========================================================== */

 

function configureApplicationShell() {

    renderSidebar();

    renderTopbar();

    bindMobileTabsToggle();

}

 

 

function bindMobileTabsToggle() {

    const openButton = getElement("openSidebarButton");

    const mobileTabs = getElement("mobileTabsRow");

 

    if (!openButton || !mobileTabs) {

        return;

    }

 

    openButton.onclick = () => {

        mobileTabs.classList.toggle("hidden");

    };

}

 

 

function renderSidebar() {

    if (!state.session) {

        return;

    }

 

    const adminNavigation = [

        { page: "admin-dashboard", label: "Dashboard", icon: "⌂" },

        { page: "admin-groups", label: "Grupos", icon: "◉" },

        { page: "admin-use-cases", label: "Casos de uso", icon: "▦" },

        { page: "admin-registry", label: "AI Agent Registry", icon: "✦" },

        { page: "admin-exports", label: "Exportaciones", icon: "⇩" }

    ];

 

    const groupNavigation = [

        { page: "group-dashboard", label: "Dashboard", icon: "⌂" },

        { page: "wizard", label: "Mi AI Agent", icon: "✦" }

    ];

 

    const navigation =

        state.session.role === "admin"

            ? adminNavigation

            : groupNavigation;

 

    const tabsHtml = `

        ${navigation.map(item => `

            <button

                type="button"

                data-page="${item.page}"

                class="app-tab ${

                    state.currentPage === item.page ? "active" : ""

                }"

            >

                <span aria-hidden="true">${item.icon}</span>

                <span>${item.label}</span>

            </button>

        `).join("")}

    `;

 

    const desktopTabs = getElement("sidebarNavigation");

    const mobileTabs = getElement("mobileTabsRow");

 

    [desktopTabs, mobileTabs].forEach(container => {

        if (!container) {

            return;

        }

 

        container.innerHTML = tabsHtml;

 

        container.querySelectorAll("[data-page]").forEach(button => {

            button.addEventListener("click", () =>

                navigateTo(button.dataset.page)

            );

        });

    });

 

    const logoutButton =

        getElement("logoutButton") ||

        document.querySelector("[data-logout]");

 

    if (logoutButton) {

        logoutButton.onclick = logout;

    }

}

 

 

function renderTopbar() {

    if (!state.session) {

        return;

    }

 

    setText(

        "profileName",

        state.session.role === "admin"

            ? "Administrador"

            : getCurrentGroup()?.name || state.session.username

    );

 

    const profileAvatar = getElement("profileAvatar");

 

    if (profileAvatar) {

        profileAvatar.textContent =

            state.session.role === "admin"

                ? "AD"

                : getInitials(

                    getCurrentGroup()?.name || state.session.username

                );

    }

}

 

 

function getInitials(value) {

    return String(value || "")

        .split(/\s+/)

        .filter(Boolean)

        .slice(0, 2)

        .map(word => word.charAt(0).toUpperCase())

        .join("");

}

 

 

/* ==========================================================

   NAVEGACIÓN

========================================================== */

 

function navigateTo(page) {

    if (!state.session) {

        logout();

        return;

    }

 

    const adminPages = [

        "admin-dashboard",

        "admin-groups",

        "admin-use-cases",

        "admin-registry",

        "admin-exports"

    ];

 

    const groupPages = [

        "group-dashboard",

        "wizard"

    ];

 

    const allowedPages =

        state.session.role === "admin"

            ? adminPages

            : groupPages;

 

    if (!allowedPages.includes(page)) {

        page = getDefaultPage();

    }

 

    state.currentPage = page;

 

    renderSidebar();

    renderTopbar();

    renderCurrentPage();

 

    const mobileTabs = getElement("mobileTabsRow");

 

    if (mobileTabs) {

        mobileTabs.classList.add("hidden");

    }

 

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

 

 

function renderCurrentPage() {

    const pageContainer =

        getElement("pageContent") ||

        getElement("pageContent") ||

        document.querySelector(".page-content");

 

    if (!pageContainer) {

        console.error(

            "No se ha encontrado el contenedor principal."

        );

 

        return;

    }

 

    const templateMap = {

        "group-dashboard": "groupDashboardTemplate",

        "wizard": "wizardTemplate",

        "admin-dashboard": "adminDashboardTemplate",

        "admin-groups": "adminGroupsTemplate",

        "admin-use-cases": "adminUseCasesTemplate",

        "admin-registry": "adminRegistryTemplate",

        "admin-exports": "adminExportsTemplate"

    };

 

    const templateId = templateMap[state.currentPage];

 

    pageContainer.innerHTML = "";

 

    if (!templateId) {

        pageContainer.innerHTML = `

            <section class="empty-state">

                <h2>Vista no disponible</h2>

                <p>

                    No se ha encontrado la vista solicitada.

                </p>

            </section>

        `;

 

        return;

    }

 

    pageContainer.appendChild(

        cloneTemplate(templateId)

    );

 

    initializeCurrentPage();

}

 

 

function initializeCurrentPage() {

    switch (state.currentPage) {

        case "group-dashboard":

            renderGroupDashboard();

            break;

 

        case "wizard":

            initializeWizard();

            break;

 

        case "admin-dashboard":

            renderAdminDashboard();

            break;

 

        case "admin-groups":

            renderAdminGroups();

            break;

 

        case "admin-use-cases":

            renderAdminUseCases();

            break;

 

        case "admin-registry":

            renderAgentRegistry();

            break;

 

        case "admin-exports":

            initializeExports();

            break;

 

        default:

            break;

    }

}

 

 

/* ==========================================================

   INICIALIZACIÓN

========================================================== */

 

async function initializeApplication() {

    showLoader("Conectando con la base de datos...");

    state.data = await loadData();

    hideLoader();

    state.session = loadSession();

 

    initializeLogin();

    initializeGlobalEvents();

 

    window.setInterval(

        renderChallengeCountdown,

        1000

    );

 

    if (state.session) {

        state.currentPage = getDefaultPage();

        enterApplication();

    } else {

        const loginView =

            getElement("loginView") ||

            getElement("loginView");

 

        const appView = getElement("appView");

 

        showElement(loginView);

        hideElement(appView);

    }

}

 

 

function initializeGlobalEvents() {

    document.addEventListener(

        "click",

        event => {

            const closeModalButton =

                event.target.closest("[data-close-modal]");

 

            if (closeModalButton) {

                const overlay =

                    event.target.classList.contains(

                        "modal-overlay"

                    );

 

                const closeButton =

                    event.target.closest(

                        ".modal-close-button"

                    );

 

                if (overlay || closeButton) {

                    closeModal();

                }

            }

        }

    );

 

    document.addEventListener(

        "keydown",

        event => {

            if (event.key === "Escape") {

                closeModal();

            }

        }

    );

}

 

 

/* ==========================================================

   ARRANQUE

========================================================== */

 

document.addEventListener(

    "DOMContentLoaded",

    initializeApplication

);

/* ==========================================================

   AI AGENT CHALLENGE

   app.js

   PARTE 2/3

 

   Incluye:

   - Dashboard del grupo

   - Wizard

   - Autoguardado

   - Validaciones

   - Conversaciones

   - Revisión

   - Envío

   - Descarga de ficha

========================================================== */

 

 

/* ==========================================================

   DASHBOARD DEL GRUPO

========================================================== */

 

function renderGroupDashboard() {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    const agent = group.agent;

    const progress = calculateAgentProgress(agent);

    const useCase = getUseCaseById(agent.useCaseId);

    const hasAgent = Boolean(agent.name);

    const isSubmitted = agent.status === "submitted";

 

    setText(

        "groupWelcomeTitle",

        `Bienvenido, ${group.name}`

    );

 

    setText(

        "groupWelcomeDescription",

        isSubmitted

            ? "Tu AI Agent ya ha sido enviado. Puedes consultar la ficha en cualquier momento."

            : hasAgent

                ? "Continúa completando el recorrido guiado para terminar tu propuesta."

                : "Completa la ficha de tu AI Agent siguiendo el recorrido guiado del challenge."

    );

 

    setText(

        "groupStatusMetric",

        getAgentStatusLabel(agent.status)

    );

 

    setText(

        "groupStatusDescription",

        isSubmitted

            ? "Tu propuesta ha sido registrada."

            : hasAgent

                ? "Continúa completando tu asistente."

                : "Crea tu asistente para comenzar."

    );

 

    setText(

        "groupProgressMetric",

        `${progress}%`

    );

 

    const progressFill =

        getElement("groupProgressBar") ||

        document.querySelector(".progress-fill");

 

    if (progressFill) {

        progressFill.style.width = `${progress}%`;

    }

 

    setText(

        "groupUseCaseMetric",

        getUseCaseDisplayName(agent)

    );

 

    const summaryContainer =

        getElement("groupAgentSummary");

 

    if (summaryContainer) {

        if (hasAgent) {

            summaryContainer.innerHTML = `

                <div class="agent-summary-header">

                    ${getAgentStatusBadge(agent.status)}

                </div>

 

                <h3>${escapeHtml(agent.name)}</h3>

 

                <p>${escapeHtml(

                    agent.description ||

                    "Sin descripción todavía."

                )}</p>

 

                <p class="metric-description">

                    Última actualización:

                    ${formatDate(agent.updatedAt, true)}

                </p>

            `;

        } else {

            summaryContainer.innerHTML = `

                <div

                    class="empty-state-icon"

                    aria-hidden="true"

                >

                    ✦

                </div>

 

                <h3>

                    Aún no has creado tu asistente

                </h3>

 

                <p>

                    Empieza el recorrido para registrar la propuesta de tu grupo.

                </p>

            `;

        }

    }

 

    const openWizardButton =

        getElement("groupPrimaryAction") ||

        document.querySelector(

            "[data-open-wizard]"

        );

 

    if (openWizardButton) {

        openWizardButton.textContent =

            isSubmitted

                ? "Ver mi AI Agent"

                : hasAgent

                    ? "Continuar editando"

                    : "Crear AI Agent";

 

        openWizardButton.onclick = () => {

            state.currentWizardStep =

                isSubmitted ? 5 : 1;

 

            navigateTo("wizard");

        };

    }

 

    const downloadButton =

        getElement("downloadGroupAgentButton") ||

        document.querySelector(

            "[data-download-factsheet]"

        );

 

    if (downloadButton) {

        if (isSubmitted) {

            showElement(downloadButton);

        } else {

            hideElement(downloadButton);

        }

 

        downloadButton.onclick = () =>

            downloadGroupFactsheet(group);

    }


    renderChallengeCountdown();

}

 

 

/* ==========================================================

   WIZARD: CONFIGURACIÓN

========================================================== */

 

const WIZARD_TOTAL_STEPS = 6;

 


 

 

/* ==========================================================

   WIZARD: INICIALIZACIÓN

========================================================== */

 

function initializeWizard() {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    renderWizardSidebar();

    populateWizardFields(group);

    bindWizardNavigation();

    bindWizardAutosave();

    bindUseCaseSelector();

    bindPromptTools();

    bindConversationActions();

    bindSubmitActions();

 

    renderWizardStep(

        state.currentWizardStep || 1

    );

}

 

 

function renderWizardSidebar() {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    const progress = calculateAgentProgress(group.agent);

 

    setText(

        "wizardProgressPercentage",

        `${progress}%`

    );

 

    const progressFill =

        getElement("wizardProgressBar");

 

    if (progressFill) {

        progressFill.style.width = `${progress}%`;

    }

 

    document

        .querySelectorAll(

            "[data-step]"

        )

        .forEach(button => {

            const step =

                Number(button.dataset.step) + 1;

 

            const isCompleted =

                isWizardStepCompleted(

                    step,

                    group

                );

 

            button.classList.toggle(

                "active",

                step === state.currentWizardStep

            );

 

            button.classList.toggle(

                "completed",

                isCompleted

            );

 

            button.disabled =

                step > 1 &&

                !isWizardStepCompleted(

                    step - 1,

                    group

                ) &&

                step !== state.currentWizardStep;

 

            button.onclick = () => {

                saveWizardData();

 

                state.currentWizardStep = step;

 

                renderWizardStep(step);

            };

        });

}

 

 

const WIZARD_STEP_INFO = [
    {
        eyebrow: "Caso de uso",
        title: "Selecciona el reto principal",
        description: "Elige el caso de uso que mejor representa el objetivo y el impacto esperado del asistente."
    },
    {
        eyebrow: "Asistente",
        title: "Define la propuesta",
        description: "Describe qué hace el asistente, qué problema resuelve y cómo aporta valor."
    },
    {
        eyebrow: "Prompt",
        title: "Instrucciones principales",
        description: "Incluye el prompt de sistema o el conjunto de instrucciones que define el comportamiento del asistente."
    },
    {
        eyebrow: "Evidencias",
        title: "Conversaciones de prueba",
        description: "Añade ejemplos reales que permitan entender cómo responde el asistente ante distintos inputs."
    },
    {
        eyebrow: "Revisión",
        title: "Comprueba tu propuesta",
        description: "Revisa toda la información antes de realizar el envío definitivo."
    },
    {
        eyebrow: "Envío",
        title: "Tu asistente está listo",
        description: "Al enviar la propuesta, la ficha quedará bloqueada. Solo el administrador podrá volver a habilitar la edición."
    }
];


function updateWizardHeader(step) {
    const info = WIZARD_STEP_INFO[step - 1];

    if (!info) {
        return;
    }

    setText(
        "wizardStepEyebrow",
        `Paso ${step} de ${WIZARD_TOTAL_STEPS}`
    );

    setText("wizardStepTitle", info.title);
    setText("wizardStepDescription", info.description);

    const group = getCurrentGroup();
    const statusBadge = getElement("wizardStatusBadge");

    if (statusBadge && group) {
        const isSubmitted = group.agent.status === "submitted";

        statusBadge.classList.toggle("status-draft", !isSubmitted);
        statusBadge.classList.toggle("status-submitted", isSubmitted);

        setText(
            "wizardStatusBadgeLabel",
            isSubmitted ? "Enviado" : "Borrador"
        );
    }
}


function renderWizardStep(step) {

    const safeStep = Math.min(

        Math.max(Number(step) || 1, 1),

        WIZARD_TOTAL_STEPS

    );

 

    state.currentWizardStep = safeStep;

 

    document

        .querySelectorAll(".wizard-panel")

        .forEach(stepElement => {

            const elementStep =

                Number(

                    stepElement.dataset.wizardPanel

                ) + 1;

 

            const isActive =

                elementStep === safeStep;

 

            stepElement.classList.toggle(

                "active",

                isActive

            );

 

            stepElement.hidden = !isActive;

        });

 

    updateWizardFooter();

    updateWizardHeader(safeStep);

 

    if (safeStep === 1) {

        renderUseCaseOptions();

    }

 

    if (safeStep === 4) {

        renderConversationList();

    }

 

    if (safeStep === 5) {

        renderReviewStep();

    }

 

    if (safeStep === 6) {

        renderSubmitStep();

    }

 

    const currentGroup = getCurrentGroup();

 

    if (currentGroup) {

        applySubmissionLockState(currentGroup);

    }

 

    renderWizardSidebar();

 

    const wizardPanel =

        document.querySelector(

            ".wizard-panel.active"

        );

 

    if (wizardPanel) {

        wizardPanel.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}

 

 

/* ==========================================================

   WIZARD: NAVEGACIÓN

========================================================== */

 

function bindWizardNavigation() {

    const previousButton =

        getElement("wizardPreviousButton") ||

        document.querySelector(

            "[data-wizard-previous]"

        );

 

    const nextButton =

        getElement("wizardNextButton") ||

        document.querySelector(

            "[data-wizard-next]"

        );

 

    if (previousButton) {

        previousButton.addEventListener(

            "click",

            () => {

                saveWizardData();

 

                if (

                    state.currentWizardStep > 1

                ) {

                    state.currentWizardStep -= 1;

                    renderWizardStep(

                        state.currentWizardStep

                    );

                } else {

                    navigateTo(

                        "group-dashboard"

                    );

                }

            }

        );

    }

 

    if (nextButton) {

        nextButton.addEventListener(

            "click",

            () => {

                saveWizardData();

 

                const validation =

                    validateWizardStep(

                        state.currentWizardStep

                    );

 

                if (!validation.valid) {

                    showToast(

                        validation.message,

                        "error"

                    );

 

                    focusFirstInvalidField(

                        validation.fieldId

                    );

 

                    return;

                }

 

                if (

                    state.currentWizardStep <

                    WIZARD_TOTAL_STEPS

                ) {

                    state.currentWizardStep += 1;

 

                    renderWizardStep(

                        state.currentWizardStep

                    );

                }

            }

        );

    }

}

 

 

function updateWizardFooter() {

    const previousButton =

        getElement("wizardPreviousButton") ||

        document.querySelector(

            "[data-wizard-previous]"

        );

 

    const nextButton =

        getElement("wizardNextButton") ||

        document.querySelector(

            "[data-wizard-next]"

        );

 

    if (previousButton) {

        previousButton.textContent =

            state.currentWizardStep === 1

                ? "Volver al dashboard"

                : "Anterior";

    }

 

    if (nextButton) {

        nextButton.classList.toggle(

            "hidden",

            state.currentWizardStep === WIZARD_TOTAL_STEPS

        );

 

        nextButton.textContent =

            state.currentWizardStep === WIZARD_TOTAL_STEPS - 1

                ? "Continuar al envío"

                : "Siguiente";

    }

}

 

 

/* ==========================================================

   WIZARD: CARGA DE DATOS

========================================================== */

 

function populateWizardFields(group) {
    const agent = group.agent;

    setValue("agentName", agent.name);
    setValue("agentDescription", agent.description);
    setValue("agentProblem", agent.problem);
    setValue("agentComplexity", agent.complexity);
    setValue("agentModel", agent.model);
    setValue("agentTools", agent.tools);
    setChecked("agentHandlesDocumentation", agent.handlesDocumentation);
    setValue("agentPrompt", agent.prompt);

    applyUseCaseLockState(group);
    applySubmissionLockState(group);
    updateCharacterCounters();
}


function applySubmissionLockState(group) {
    const isSubmitted = group.agent.status === "submitted";

    const banner = getElement("wizardLockedBanner");

    if (banner) {
        banner.hidden = !isSubmitted;
    }

    if (!isSubmitted) {
        return;
    }

    document
        .querySelectorAll(
            "#wizardPanels input, #wizardPanels textarea, #wizardPanels select"
        )
        .forEach(field => {
            field.disabled = true;
        });

    document
        .querySelectorAll(
            "[data-prompt-insert], [data-add-conversation], .conversation-delete-button, [data-delete-conversation]"
        )
        .forEach(button => {
            button.disabled = true;
        });
}


function applyUseCaseLockState(group) {
    const agent = group.agent;

    const isLocked =
        Boolean(agent.useCaseId) &&
        !agent.isCustomUseCase;

    [
        "agentDescription",
        "agentProblem",
        "agentComplexity"
    ].forEach(id => {
        const field = getElement(id);

        if (field) {
            field.disabled = isLocked;
            field.classList.toggle("field-locked", isLocked);
        }
    });

    const lockHint = getElement("agentLockHint");

    if (lockHint) {
        lockHint.hidden = !isLocked;
    }
}


function bindWizardAutosave() {

    const fields = document.querySelectorAll(

        ".wizard-panel input, " +

        ".wizard-panel textarea, " +

        ".wizard-panel select"

    );

 

    fields.forEach(field => {

        field.addEventListener(

            "input",

            () => {

                updateCharacterCounters();

                saveWizardDataDebounced();

            }

        );

 

        field.addEventListener(

            "change",

            () => {

                saveWizardDataDebounced();

            }

        );

    });

}

 

 

function saveWizardDataDebounced() {

    window.clearTimeout(

        state.autosaveTimer

    );

 

    state.autosaveTimer =

        window.setTimeout(() => {

            saveWizardData();

 

            showAutosaveIndicator();

        }, CONFIG.autosaveDelay);

}

 

 

function saveWizardData() {
    const group = getCurrentGroup();

    if (!group) {
        return;
    }

    const agent = group.agent;

    agent.name = getValue("agentName");
    agent.description = getValue("agentDescription");
    agent.problem = getValue("agentProblem");
    agent.complexity = getValue("agentComplexity");
    agent.model = getValue("agentModel");
    agent.tools = getValue("agentTools");
    agent.handlesDocumentation = getChecked("agentHandlesDocumentation");
    agent.prompt = getValue("agentPrompt");

    const now =
        new Date().toISOString();

    group.updatedAt = now;
    agent.updatedAt = now;

    saveGroupToSupabase(group);

    renderWizardSidebar();
}


function showAutosaveIndicator() {

    const textElement =

        getElement("autosaveText");

 

    if (!textElement) {

        return;

    }

 

    textElement.textContent =

        "Cambios guardados";

 

    window.setTimeout(() => {

        textElement.textContent =

            "Guardado";

    }, 1800);

}

 

 

/* ==========================================================

   CONTADORES

========================================================== */

 

function updateCharacterCounters() {
    const promptInput = getElement("agentPrompt");
    const promptCount = getElement("promptCharacterCount");
    const promptTokens = getElement("promptTokenEstimate");
    const promptMinHelp = getElement("promptMinimumHelp");

    if (promptInput) {
        const length = promptInput.value.length;

        if (promptCount) {
            promptCount.textContent =
                `${length} caracteres`;
        }

        if (promptTokens) {
            const estimatedTokens =
                Math.round(length / 4);

            promptTokens.textContent =
                `~${estimatedTokens} tokens`;
        }

        if (promptMinHelp) {
            promptMinHelp.textContent =
                length >= 80
                    ? "Longitud mínima alcanzada."
                    : `Introduce al menos 80 caracteres para continuar (${length}/80).`;
        }
    }
}


/* ==========================================================

   PASO 1: CASO DE USO

========================================================== */

 

function bindUseCaseSelector() {

    const searchInput =

        getElement("useCaseSearch");

 

    if (searchInput) {

        searchInput.addEventListener(

            "input",

            event => {

                state.useCaseSearch =

                    event.target.value.trim();

 

                renderUseCaseOptions();

            }

        );

    }

 

    const categoryFilter =

        getElement("useCaseCategoryFilter");

 

    if (categoryFilter) {

        const categories = [

            ...new Set(

                state.data.useCases.map(

                    useCase => useCase.category

                )

            )

        ].sort();

 

        categoryFilter.innerHTML = `

            <option value="Todos">

                Todas las categorías

            </option>

 

            ${categories.map(category => `

                <option value="${escapeHtml(

                    category

                )}">

                    ${escapeHtml(category)}

                </option>

            `).join("")}

        `;

 

        categoryFilter.value =

            state.selectedUseCaseCategory;

 

        categoryFilter.addEventListener(

            "change",

            event => {

                state.selectedUseCaseCategory =

                    event.target.value;

 

                renderUseCaseOptions();

            }

        );

    }

}

 

 

function renderUseCaseOptions() {
    const group = getCurrentGroup();

    const container =
        getElement("useCaseSelectionGrid") ||
        document.querySelector(
            "[data-use-case-options]"
        );

    if (!group || !container) {
        return;
    }

    const query =
        state.useCaseSearch
            .toLowerCase();

    const category =
        state.selectedUseCaseCategory;

    const useCases =
        state.data.useCases.filter(
            useCase => {
                const matchesStatus =
                    useCase.active;

                const matchesCategory =
                    category === "Todos" ||
                    useCase.category === category;

                const searchableText = `
                    ${useCase.name}
                    ${useCase.category}
                    ${useCase.description}
                `.toLowerCase();

                const matchesSearch =
                    !query ||
                    searchableText.includes(
                        query
                    );

                return (
                    matchesStatus &&
                    matchesCategory &&
                    matchesSearch
                );
            }
        );

    const isCustomSelected =
        Boolean(group.agent.isCustomUseCase);

    const cardsHtml =
        useCases.map(useCase => {
            const isSelected =
                !isCustomSelected &&
                group.agent.useCaseId === useCase.id;

            return `
                <article class="use-case-option ${isSelected ? "selected" : ""}">
                    <span class="use-case-option-category">
                        ${escapeHtml(useCase.category)}
                    </span>

                    <h3>
                        ${escapeHtml(useCase.name)}
                    </h3>

                    <div class="use-case-option-actions">
                        <button
                            type="button"
                            class="button button-tertiary"
                            data-use-case-detail="${useCase.id}"
                        >
                            Más detalle
                        </button>

                        <button
                            type="button"
                            class="button ${isSelected ? "button-secondary" : "button-primary"}"
                            data-select-use-case="${useCase.id}"
                        >
                            ${isSelected ? "Seleccionado" : "Seleccionar"}
                        </button>
                    </div>
                </article>
            `;
        }).join("");

    const customCardHtml = `
        <article class="use-case-option use-case-option-custom ${isCustomSelected ? "selected" : ""}">
            <span class="use-case-option-category">
                Personalizado
            </span>

            <h3>
                Otro caso de uso
            </h3>

            <p>
                Define tu propio caso de uso si no encuentras uno adecuado en el catálogo.
            </p>

            <div class="use-case-option-actions">
                <button
                    type="button"
                    class="button ${isCustomSelected ? "button-secondary" : "button-primary"}"
                    data-select-custom-use-case
                >
                    ${isCustomSelected ? "Seleccionado" : "Seleccionar"}
                </button>
            </div>
        </article>
    `;

    if (!useCases.length && query) {
        container.innerHTML = `
            <section class="empty-state">
                <div class="empty-state-icon">
                    ?
                </div>

                <h3>
                    No hay casos de uso
                </h3>

                <p>
                    Prueba con otra búsqueda o categoría.
                </p>
            </section>
        ` + customCardHtml;
    } else {
        container.innerHTML = cardsHtml + customCardHtml;
    }

    container
        .querySelectorAll(
            "[data-select-use-case]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    selectUseCase(
                        button.dataset.selectUseCase
                    );
                }
            );
        });

    container
        .querySelectorAll(
            "[data-use-case-detail]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    openUseCaseDetailModal(
                        button.dataset.useCaseDetail
                    );
                }
            );
        });

    const customButton =
        container.querySelector(
            "[data-select-custom-use-case]"
        );

    if (customButton) {
        customButton.addEventListener(
            "click",
            () => {
                selectCustomUseCase();
            }
        );
    }
}


function openUseCaseDetailModal(useCaseId) {
    const useCase = getUseCaseById(useCaseId);

    if (!useCase) {
        return;
    }

    const content = `
        <section class="use-case-detail">
            <span class="tag">
                ${escapeHtml(useCase.category)}
            </span>

            <h3>
                ${escapeHtml(useCase.name)}
            </h3>

            <p>
                ${escapeHtml(useCase.description)}
            </p>

            ${
                useCase.problem
                    ? `
                        <h4>Problema que resuelve</h4>
                        <p>${escapeHtml(useCase.problem)}</p>
                    `
                    : ""
            }

            ${
                useCase.complexity
                    ? `
                        <p>
                            <strong>Complejidad:</strong>
                            ${getComplexityBadgeHtml(useCase.complexity)}
                        </p>
                    `
                    : ""
            }
        </section>
    `;

    openModal({
        title: "Detalle del caso de uso",
        content,
        confirmText: "Seleccionar este caso de uso",
        cancelText: "Cerrar",
        onConfirm: () => {
            selectUseCase(useCase.id);
        }
    });
}


function selectUseCase(useCaseId) {
    const group = getCurrentGroup();
    const useCase =
        getUseCaseById(useCaseId);

    if (!group || !useCase) {
        return;
    }

    const agent = group.agent;

    agent.useCaseId = useCase.id;
    agent.useCaseName = useCase.name;
    agent.isCustomUseCase = false;

    agent.description = useCase.description;
    agent.problem = useCase.problem || "";
    agent.complexity = useCase.complexity || "";

    agent.updatedAt = new Date().toISOString();

    saveGroupToSupabase(group);

    renderUseCaseOptions();
    renderWizardSidebar();
    populateWizardFields(group);

    showToast(
        "Caso de uso seleccionado.",
        "success"
    );
}


function selectCustomUseCase() {
    const group = getCurrentGroup();

    if (!group) {
        return;
    }

    const agent = group.agent;

    agent.useCaseId = "custom";
    agent.useCaseName = "Personalizado";
    agent.isCustomUseCase = true;

    agent.updatedAt = new Date().toISOString();

    saveGroupToSupabase(group);

    renderUseCaseOptions();
    renderWizardSidebar();
    populateWizardFields(group);

    showToast(
        "Caso de uso personalizado seleccionado. Ya puedes definir tu propio asistente.",
        "success"
    );
}


function bindPromptTools() {

    document

        .querySelectorAll(

            "[data-prompt-insert]"

        )

        .forEach(button => {

            button.addEventListener(

                "click",

                () => {

                    insertPromptText(

                        button.dataset

                            .promptInsert || ""

                    );

                }

            );

        });

 

    const copyButton =

        getElement("copyPromptButton");

 

    if (copyButton) {

        copyButton.addEventListener(

            "click",

            copyPromptToClipboard

        );

    }

}

 

 

async function copyPromptToClipboard() {

    const promptField =

        getElement("agentPrompt");

 

    if (!promptField || !promptField.value) {

        showToast(

            "No hay prompt para copiar.",

            "error"

        );

 

        return;

    }

 

    try {

        await navigator.clipboard.writeText(

            promptField.value

        );

 

        showToast(

            "Prompt copiado al portapapeles.",

            "success"

        );

 

    } catch (error) {

        promptField.select();

        document.execCommand("copy");

 

        showToast(

            "Prompt copiado al portapapeles.",

            "success"

        );

    }

}

 

 

function insertPromptText(text) {

    const promptField =

        getElement("agentPrompt");

 

    if (!promptField) {

        return;

    }

 

    const start =

        promptField.selectionStart;

 

    const end =

        promptField.selectionEnd;

 

    const currentValue =

        promptField.value;

 

    promptField.value =

        currentValue.slice(0, start) +

        text +

        currentValue.slice(end);

 

    const cursorPosition =

        start + text.length;

 

    promptField.focus();

 

    promptField.setSelectionRange(

        cursorPosition,

        cursorPosition

    );

 

    saveWizardDataDebounced();

    updateCharacterCounters();

}

 

 

/* ==========================================================

   PASO 4: CONVERSACIONES

========================================================== */

 

function bindConversationActions() {

    const addButton =

        getElement("addConversationButton") ||

        document.querySelector(

            "[data-add-conversation]"

        );

 

    if (addButton) {

        addButton.addEventListener(

            "click",

            addConversation

        );

    }

}

 

 

function addConversation() {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    group.agent.conversations.push({

        id: generateId("conversation"),

        title:

            `Conversación ${

                group.agent.conversations.length +

                1

            }`,

        userMessage: "",

        assistantMessage: "",

        createdAt:

            new Date().toISOString(),

        updatedAt:

            new Date().toISOString()

    });

 

    group.agent.updatedAt =

        new Date().toISOString();

 

    saveGroupToSupabase(group);

    renderConversationList();

    renderWizardSidebar();

}

 

 

function renderConversationList() {

    const group = getCurrentGroup();

 

    const container =

        getElement("conversationList") ||

        document.querySelector(

            "[data-conversation-list]"

        );

 

    const emptyState =

        getElement("conversationEmptyState");

 

    const emptyButton =

        getElement(

            "emptyStateAddConversationButton"

        );

 

    if (emptyButton) {

        emptyButton.onclick = addConversation;

    }

 

    setText(

        "conversationCount",

        group

            ? group.agent.conversations.length

            : 0

    );

 

    if (!group || !container) {

        return;

    }

 

    const conversations =

        group.agent.conversations;

 

    if (!conversations.length) {

        container.innerHTML = "";

 

        if (emptyState) {

            showElement(emptyState);

        }

 

        return;

    }

 

    if (emptyState) {

        hideElement(emptyState);

    }

 

    container.innerHTML = "";

 

    conversations.forEach(

        (conversation, index) => {

            const template =

                getElement(

                    "conversationTemplate"

                );

 

            if (template) {

                const fragment =

                    template.content.cloneNode(

                        true

                    );

 

                const root =

                    fragment.querySelector(

                        ".conversation-card"

                    ) ||

                    fragment.firstElementChild;

 

                configureConversationCard(

                    root,

                    conversation,

                    index

                );

 

                container.appendChild(

                    fragment

                );

 

                return;

            }

 

            container.insertAdjacentHTML(

                "beforeend",

                createConversationFallbackHtml(

                    conversation,

                    index

                )

            );

        }

    );

 

    bindRenderedConversationFields();

}

 

 

function configureConversationCard(

    root,

    conversation,

    index

) {

    if (!root) {

        return;

    }

 

    root.dataset.conversationId =

        conversation.id;

 

    const title =

        root.querySelector(

            "[data-conversation-title]"

        );

 

    const userField =

        root.querySelector(

            '[data-conversation-field="user"]'

        );

 

    const assistantField =

        root.querySelector(

            '[data-conversation-field="assistant"]'

        );

 

    const deleteButton =

        root.querySelector(

            "[data-delete-conversation]"

        );

 

    if (title) {

        if (

            title.matches(

                "input, textarea"

            )

        ) {

            title.value =

                conversation.title;

        } else {

            title.textContent =

                conversation.title ||

                `Conversación ${index + 1}`;

        }

    }

 

    if (userField) {

        userField.value =

            conversation.userMessage;

    }

 

    if (assistantField) {

        assistantField.value =

            conversation.assistantMessage;

    }

 

    if (deleteButton) {

        deleteButton.dataset

            .deleteConversation =

            conversation.id;

    }

}

 

 

function createConversationFallbackHtml(

    conversation,

    index

) {

    return `

        <article

            class="conversation-card"

            data-conversation-id="${

                conversation.id

            }"

        >

            <header class="conversation-card-header">

                <input

                    type="text"

                    value="${escapeHtml(

                        conversation.title ||

                        `Conversación ${index + 1}`

                    )}"

                    data-conversation-title

                >

 

                <button

                    type="button"

                    class="icon-button icon-button-danger"

                    data-delete-conversation="${

                        conversation.id

                    }"

                >

                    ×

                </button>

            </header>

 

            <div class="conversation-card-body">

                <label class="form-field">

                    <span class="form-label">

                        Mensaje del usuario

                    </span>

 

                    <textarea

                        rows="4"

                        data-conversation-field="user"

                    >${escapeHtml(

                        conversation.userMessage

                    )}</textarea>

                </label>

 

                <label class="form-field">

                    <span class="form-label">

                        Respuesta del asistente

                    </span>

 

                    <textarea

                        rows="6"

                        data-conversation-field="assistant"

                    >${escapeHtml(

                        conversation.assistantMessage

                    )}</textarea>

                </label>

            </div>

        </article>

    `;

}

 

 

function bindRenderedConversationFields() {

    document

        .querySelectorAll(

            "[data-conversation-id]"

        )

        .forEach(card => {

            const conversationId =

                card.dataset

                    .conversationId;

 

            const title =

                card.querySelector(

                    "[data-conversation-title]"

                );

 

            const user =

                card.querySelector(

                    '[data-conversation-field="user"]'

                );

 

            const assistant =

                card.querySelector(

                    '[data-conversation-field="assistant"]'

                );

 

            [

                [title, "title"],

                [user, "userMessage"],

                [

                    assistant,

                    "assistantMessage"

                ]

            ].forEach(

                ([field, property]) => {

                    if (!field) {

                        return;

                    }

 

                    if (

                        !field.matches(

                            "input, textarea"

                        )

                    ) {

                        return;

                    }

 

                    field.addEventListener(

                        "input",

                        () => {

                            updateConversation(

                                conversationId,

                                property,

                                field.value

                            );

                        }

                    );

                }

            );

        });

 

    document

        .querySelectorAll(

            "[data-delete-conversation]"

        )

        .forEach(button => {

            button.addEventListener(

                "click",

                () => {

                    deleteConversation(

                        button.dataset

                            .deleteConversation

                    );

                }

            );

        });

}

 

 

function updateConversation(

    conversationId,

    property,

    value

) {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    const conversation =

        group.agent.conversations.find(

            item =>

                item.id === conversationId

        );

 

    if (!conversation) {

        return;

    }

 

    conversation[property] = value;

 

    conversation.updatedAt =

        new Date().toISOString();

 

    group.agent.updatedAt =

        new Date().toISOString();

 

    saveGroupToSupabaseDebounced(group);

    renderWizardSidebar();

}

 

 

function deleteConversation(

    conversationId

) {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    group.agent.conversations =

        group.agent.conversations.filter(

            conversation =>

                conversation.id !==

                conversationId

        );

 

    group.agent.updatedAt =

        new Date().toISOString();

 

    saveGroupToSupabase(group);

    renderConversationList();

    renderWizardSidebar();

 

    showToast(

        "Conversación eliminada.",

        "success"

    );

}

 

 

/* ==========================================================

   PASO 5: REVISIÓN

========================================================== */

 

function renderReviewStep() {
    saveWizardData();

    const group = getCurrentGroup();

    if (!group) {
        return;
    }

    const agent = group.agent;

    const useCase =
        getUseCaseById(
            agent.useCaseId
        );

    const values = {
        reviewGroupName:
            group.name,

        reviewGroupMembers:
            group.members.join(", ") ||
            "No indicados",

        reviewUseCase:
            useCase?.name ||
            (agent.isCustomUseCase ? "Personalizado" : "No seleccionado"),

        reviewAgentName:
            agent.name ||
            "No indicado",

        reviewProblem:
            agent.problem ||
            "No indicado",

        reviewModel:
            agent.model ||
            "No indicado",

        reviewTools:
            agent.tools ||
            "No indicadas",

        reviewDocumentation:
            agent.handlesDocumentation ? "Sí" : "No"
    };

    Object.entries(values).forEach(
        ([id, value]) => {
            setText(id, value);
        }
    );

    const complexityElement = getElement("reviewComplexity");

    if (complexityElement) {
        complexityElement.innerHTML =
            getComplexityBadgeHtml(agent.complexity);
    }

    setText(
        "reviewConversationCount",
        agent.conversations.length
    );

    setText(
        "reviewProgressValue",
        `${calculateAgentProgress(agent)}%`
    );

    const promptPreview =
        getElement("reviewPromptContent");

    if (promptPreview) {
        promptPreview.textContent =
            agent.prompt ||
            "No se ha definido todavía.";
    }

    bindToggleReviewPrompt();
    renderReviewConversations(
        agent.conversations
    );

    renderReviewChecklist(group);
}


function bindToggleReviewPrompt() {

    const toggleButton =

        getElement("toggleReviewPromptButton");

 

    const promptPreview =

        getElement("reviewPromptContent");

 

    if (!toggleButton || !promptPreview) {

        return;

    }

 

    toggleButton.onclick = () => {

        const isHidden =

            promptPreview.classList.contains(

                "hidden"

            );

 

        promptPreview.classList.toggle(

            "hidden",

            !isHidden

        );

 

        toggleButton.textContent =

            isHidden ? "Ocultar" : "Mostrar";

 

        toggleButton.setAttribute(

            "aria-expanded",

            isHidden ? "true" : "false"

        );

    };

}

 

 

function renderReviewConversations(

    conversations

) {

    const container =

        getElement(

            "reviewConversationList"

        );

 

    if (!container) {

        return;

    }

 

    if (!conversations.length) {

        container.innerHTML = `

            <p>

                No se han añadido conversaciones.

            </p>

        `;

 

        return;

    }

 

    container.innerHTML =

        conversations.map(

            (conversation, index) => `

                <article class="conversation-card">

                    <header class="conversation-card-header">

                        <strong>

                            ${escapeHtml(

                                conversation.title ||

                                `Conversación ${

                                    index + 1

                                }`

                            )}

                        </strong>

                    </header>

 

                    <div class="conversation-card-body">

                        <div class="message-block message-block-user">

                            <span class="message-role">

                                Usuario

                            </span>

 

                            <p>

                                ${escapeHtml(

                                    conversation.userMessage ||

                                    "Sin contenido"

                                )}

                            </p>

                        </div>

 

                        <div class="message-block message-block-assistant">

                            <span class="message-role">

                                Asistente

                            </span>

 

                            <p>

                                ${escapeHtml(

                                    conversation.assistantMessage ||

                                    "Sin contenido"

                                )}

                            </p>

                        </div>

                    </div>

                </article>

            `

        ).join("");

}

 

 

function renderReviewChecklist(group) {
    const container =
        getElement("reviewChecklist");

    if (!container) {
        return;
    }

    const agent = group.agent;

    const checks = {
        useCase: Boolean(agent.useCaseId),

        agent: Boolean(
            agent.name &&
            agent.description &&
            agent.problem &&
            agent.complexity &&
            agent.tools &&
            agent.model
        ),

        prompt: Boolean(agent.prompt.trim()),

        evidence: agent.conversations.some(
            conversation =>
                conversation.userMessage
                    .trim() &&
                conversation.assistantMessage
                    .trim()
        )
    };

    Object.entries(checks).forEach(
        ([key, isValid]) => {
            const item =
                container.querySelector(
                    `[data-review-check="${key}"]`
                );

            if (!item) {
                return;
            }

            item.classList.toggle(
                "valid",
                isValid
            );

            const icon =
                item.querySelector(
                    ".review-check-icon"
                );

            if (icon) {
                icon.textContent =
                    isValid ? "✓" : "!";
            }
        }
    );
}


/* ==========================================================
   PASO 6: ENVÍO
========================================================== */

function bindSubmitActions() {

    const submitButton =

        getElement("submitAgentButton") ||

        document.querySelector(

            "[data-submit-agent]"

        );

 

    if (submitButton) {

        submitButton.disabled = false;

 

        submitButton.addEventListener(

            "click",

            submitAgent

        );

    }

 

    const downloadButton =

        getElement("downloadSubmittedAgentButton"

        ) ||

        document.querySelector(

            "[data-submit-download]"

        );

 

    if (downloadButton) {

        downloadButton.addEventListener(

            "click",

            () => {

                const group =

                    getCurrentGroup();

 

                if (group) {

                    downloadGroupFactsheet(

                        group

                    );

                }

            }

        );

    }

 

    const dashboardButton =

        getElement("returnToGroupDashboardButton"

        ) ||

        document.querySelector(

            "[data-submit-dashboard]"

        );

 

    if (dashboardButton) {

        dashboardButton.addEventListener(

            "click",

            () => {

                navigateTo(

                    "group-dashboard"

                );

            }

        );

    }

}

 

 

function renderSubmitStep() {

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    const pendingState =

        getElement("submitReadyState");

 

    const successState =

        getElement("submitSuccessState");

 

    if (

        group.agent.status ===

        "submitted"

    ) {

        hideElement(pendingState);

        showElement(successState);

 

        setText(

            "submissionSuccessDescription",

            `La propuesta ha quedado bloqueada y registrada correctamente el ${formatDate(

                group.agent.submittedAt,

                true

            )}.`

        );

 

    } else {

        showElement(pendingState);

        hideElement(successState);

 

        setText(

            "submitAgentName",

            group.agent.name || "—"

        );

 

        setText(

            "submitGroupName",

            group.name || "—"

        );

 

        setText(

            "submitUseCaseName",

            getUseCaseById(

                group.agent.useCaseId

            )?.name || "—"

        );

    }

}

 

 

function submitAgent() {

    saveWizardData();

 

    const group = getCurrentGroup();

 

    if (!group) {

        return;

    }

 

    const validation =

        validateCompleteSubmission(

            group

        );

 

    if (!validation.valid) {

        showToast(

            validation.message,

            "error"

        );

 

        state.currentWizardStep =

            validation.step;

 

        renderWizardStep(

            validation.step

        );

 

        return;

    }

 

    group.agent.status =

        "submitted";

 

    group.agent.submittedAt =

        new Date().toISOString();

 

    group.agent.updatedAt =

        group.agent.submittedAt;

 

    group.locked = true;

 

    saveGroupToSupabase(group);

 

    addActivity(

        `${group.name} ha enviado el asistente "${group.agent.name}".`,

        "submission"

    );

 

    renderSubmitStep();

    renderWizardSidebar();

    triggerConfetti();

 

    showToast(

        "Asistente enviado correctamente.",

        "success"

    );

}

 

 

/* ==========================================================

   VALIDACIONES

========================================================== */

 

function validateWizardStep(step) {
    const group = getCurrentGroup();

    if (!group) {
        return {
            valid: false,
            message:
                "No se ha encontrado el grupo."
        };
    }

    if (
        step === 1 &&
        !group.agent.useCaseId
    ) {
        return {
            valid: false,
            message:
                "Selecciona un caso de uso."
        };
    }

    if (step === 2) {
        const requiredFields = [
            {
                id: "agentName",
                message:
                    "Indica el nombre del asistente."
            },
            {
                id: "agentDescription",
                message:
                    "Añade una descripción."
            },
            {
                id: "agentProblem",
                message:
                    "Explica el problema que resuelve."
            },
            {
                id: "agentComplexity",
                message:
                    "Indica el nivel de complejidad."
            },
            {
                id: "agentTools",
                message:
                    "Indica las herramientas utilizadas."
            },
            {
                id: "agentModel",
                message:
                    "Indica el modelo o LLM utilizado."
            }
        ];

        for (
            const field of requiredFields
        ) {
            if (!getValue(field.id)) {
                return {
                    valid: false,
                    fieldId: field.id,
                    message:
                        field.message
                };
            }
        }
    }

    if (
        step === 3 &&
        !getValue("agentPrompt")
    ) {
        return {
            valid: false,
            fieldId: "agentPrompt",
            message:
                "Añade el prompt del asistente."
        };
    }

    if (step === 4) {
        const validConversation =
            group.agent.conversations.some(
                conversation =>
                    conversation.userMessage
                        .trim() &&
                    conversation.assistantMessage
                        .trim()
            );

        if (!validConversation) {
            return {
                valid: false,
                message:
                    "Añade al menos una conversación completa."
            };
        }
    }

    return {
        valid: true
    };
}


function validateCompleteSubmission(
    group
) {
    const agent = group.agent;

    if (!agent.useCaseId) {
        return {
            valid: false,
            step: 1,
            message:
                "Selecciona un caso de uso."
        };
    }

    if (
        !agent.name ||
        !agent.description ||
        !agent.problem ||
        !agent.complexity ||
        !agent.tools ||
        !agent.model
    ) {
        return {
            valid: false,
            step: 2,
            message:
                "Completa la información principal del asistente."
        };
    }

    if (!agent.prompt.trim()) {
        return {
            valid: false,
            step: 3,
            message:
                "Añade el prompt del asistente."
        };
    }

    const validConversation =
        agent.conversations.some(
            conversation =>
                conversation.userMessage
                    .trim() &&
                conversation.assistantMessage
                    .trim()
        );

    if (!validConversation) {
        return {
            valid: false,
            step: 4,
            message:
                "Añade al menos una conversación completa."
        };
    }

    return {
        valid: true
    };
}


function isWizardStepCompleted(
    step,
    group
) {
    const agent = group.agent;

    switch (step) {
        case 1:
            return Boolean(
                agent.useCaseId
            );

        case 2:
            return Boolean(
                agent.name &&
                agent.description &&
                agent.problem &&
                agent.complexity &&
                agent.tools &&
                agent.model
            );

        case 3:
            return Boolean(
                agent.prompt.trim()
            );

        case 4:
            return agent.conversations.some(
                conversation =>
                    conversation.userMessage
                        .trim() &&
                    conversation.assistantMessage
                        .trim()
            );

        case 5:
            return (
                calculateAgentProgress(
                    agent
                ) >= 80
            );

        case 6:
            return (
                agent.status ===
                "submitted"
            );

        default:
            return false;
    }
}


function isValidEmail(value) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(

        value

    );

}

 

 

function focusFirstInvalidField(

    fieldId

) {

    if (!fieldId) {

        return;

    }

 

    const field =

        getElement(fieldId);

 

    if (!field) {

        return;

    }

 

    field.focus();

 

    field.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}

 

 

/* ==========================================================

   DESCARGA DE FICHA

========================================================== */

 

/* ==========================================================
   INFORME DEL ASISTENTE (TXT + PDF)
========================================================== */

function buildAssistantReportData(group) {
    const agent = group.agent;

    const useCase =
        getUseCaseById(agent.useCaseId);

    return {
        groupName: group.name || "Sin definir",
        assistantName: agent.name || "Sin definir",
        description: agent.description || "Sin definir",
        problem: agent.problem || "Sin definir",
        useCaseName:
            useCase?.name ||
            (agent.isCustomUseCase ? "Personalizado" : "Sin definir"),
        model: agent.model || "Sin indicar",
        tools: agent.tools || "Sin indicar",
        complexity: getComplexityLabel(agent.complexity),
        prompt: agent.prompt || "Sin definir",
        conversations: Array.isArray(agent.conversations) ? agent.conversations : []
    };
}


function generateAssistantReportText(group) {
    const data = buildAssistantReportData(group);

    const lines = [];

    lines.push(`Grupo: ${data.groupName}`);
    lines.push(`Nombre del asistente: ${data.assistantName}`);
    lines.push("");
    lines.push("Descripción:");
    lines.push(data.description);
    lines.push("");
    lines.push(`Caso de uso: ${data.useCaseName}`);
    lines.push(`IA y modelo utilizado: ${data.model}`);
    lines.push(`Nivel de complejidad: ${data.complexity}`);
    lines.push("");
    lines.push("Prompt completo:");
    lines.push(data.prompt);
    lines.push("");
    lines.push("Conversaciones de ejemplo:");

    if (!data.conversations.length) {
        lines.push("No se han registrado conversaciones de ejemplo.");
    } else {
        data.conversations.forEach((conversation, index) => {
            lines.push("");
            lines.push(`Ejemplo ${index + 1}:`);
            lines.push(`Usuario: ${conversation.userMessage || ""}`);
            lines.push(`Asistente: ${conversation.assistantMessage || ""}`);
        });
    }

    return lines.join("\n");
}


function getComplexityColor(value) {
    const colors = {
        bajo: [22, 163, 74],
        medio: [217, 119, 6],
        alto: [220, 38, 38]
    };

    return colors[value] || [148, 163, 184];
}


const PDF_BRAND = [254, 124, 57];
const PDF_DARK = [31, 41, 55];
const PDF_GRAY = [102, 112, 133];
const PDF_LIGHT_BG = [250, 251, 252];
const PDF_MARGIN_X = 44;
const PDF_MARGIN_BOTTOM = 56;


function renderAssistantReportIntoPdf(doc, group, isFirstPage) {
    if (!isFirstPage) {
        doc.addPage();
    }

    const data = buildAssistantReportData(group);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - PDF_MARGIN_X * 2;

    const pos = { y: 0 };

    function addFooter() {
        const pageNumber = doc.internal.getNumberOfPages();

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(
            PDF_MARGIN_X, pageHeight - 42,
            pageWidth - PDF_MARGIN_X, pageHeight - 42
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...PDF_GRAY);
        doc.text("PwC · AI Agent Challenge", PDF_MARGIN_X, pageHeight - 26);
        doc.text(
            String(pageNumber),
            pageWidth - PDF_MARGIN_X,
            pageHeight - 26,
            { align: "right" }
        );
    }

    function ensureSpace(height) {
        if (pos.y + height > pageHeight - PDF_MARGIN_BOTTOM) {
            addFooter();
            doc.addPage();
            pos.y = 60;
        }
    }

    function sectionHeading(text) {
        ensureSpace(28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(...PDF_BRAND);
        doc.text(text.toUpperCase(), PDF_MARGIN_X, pos.y);
        pos.y += 6;
        doc.setDrawColor(...PDF_BRAND);
        doc.setLineWidth(1.4);
        doc.line(PDF_MARGIN_X, pos.y, PDF_MARGIN_X + 28, pos.y);
        doc.setLineWidth(0.2);
        pos.y += 16;
    }

    function paragraph(text, options = {}) {
        doc.setFont("helvetica", options.mono ? "courier" : "normal");
        doc.setFontSize(options.size || 10);
        doc.setTextColor(...PDF_DARK);

        const safeText = String(text || "").trim() || "—";
        const wrapped = doc.splitTextToSize(safeText, contentWidth);

        wrapped.forEach(line => {
            ensureSpace(14);
            doc.text(line, PDF_MARGIN_X, pos.y);
            pos.y += 13.5;
        });

        pos.y += 10;
    }

    /* ---- Cabecera de marca ---- */

    doc.setFillColor(...PDF_BRAND);
    doc.rect(0, 0, pageWidth, 92, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PWC · AI AGENT CHALLENGE", PDF_MARGIN_X, 28);

    doc.setFontSize(19);
    const nameLines = doc.splitTextToSize(data.assistantName, contentWidth);
    doc.text(nameLines[0] || "Sin definir", PDF_MARGIN_X, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Grupo: ${data.groupName}`, PDF_MARGIN_X, 76);

    pos.y = 122;

    /* ---- Fila de metadatos ---- */

    const colWidth = contentWidth / 3;
    const columns = [
        { label: "Caso de uso", value: data.useCaseName },
        {
            label: "Complejidad",
            value: data.complexity,
            dot: getComplexityColor(group.agent.complexity)
        },
        { label: "IA y modelo", value: data.model }
    ];

    columns.forEach((column, index) => {
        const x = PDF_MARGIN_X + colWidth * index;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_GRAY);
        doc.text(column.label.toUpperCase(), x, pos.y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...PDF_DARK);

        const valueLines =
            doc.splitTextToSize(column.value, colWidth - 20);

        if (column.dot) {
            doc.setFillColor(...column.dot);
            doc.circle(x + 4, pos.y + 13, 3.2, "F");
            doc.text(valueLines[0] || "—", x + 12, pos.y + 16);
        } else {
            doc.text(valueLines[0] || "—", x, pos.y + 16);
        }
    });

    pos.y += 42;

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(PDF_MARGIN_X, pos.y, pageWidth - PDF_MARGIN_X, pos.y);
    pos.y += 26;

    /* ---- Secciones ---- */

    sectionHeading("Descripción");
    paragraph(data.description);

    sectionHeading("Problema que resuelve");
    paragraph(data.problem);

    sectionHeading("Herramientas");
    paragraph(data.tools);

    sectionHeading("Prompt completo");
    paragraph(data.prompt, { mono: true, size: 9 });

    sectionHeading("Conversaciones de ejemplo");

    if (!data.conversations.length) {
        paragraph("No se han registrado conversaciones de ejemplo.");
    } else {
        data.conversations.forEach((conversation, index) => {
            ensureSpace(20);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...PDF_BRAND);
            doc.text(`Ejemplo ${index + 1}`, PDF_MARGIN_X, pos.y);
            pos.y += 16;

            paragraph(`Usuario: ${conversation.userMessage || ""}`);
            paragraph(`Asistente: ${conversation.assistantMessage || ""}`);
        });
    }

    addFooter();
}


function generateAssistantReportPdf(group) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast(
            "No se ha podido cargar el generador de PDF.",
            "error"
        );

        return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    renderAssistantReportIntoPdf(doc, group, true);

    return doc;
}


function generateAssistantsBundlePdf(groups) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    groups.forEach((group, index) => {
        renderAssistantReportIntoPdf(doc, group, index === 0);
    });

    return doc;
}


function getSafeFileName(group) {
    const base =
        group.agent.name ||
        group.name ||
        "asistente";

    return base
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-+|-+$)/g, "") || "asistente";
}


function downloadGroupFactsheet(group) {
    if (!group) {
        return;
    }

    const safeName = getSafeFileName(group);

    const pdfDoc = generateAssistantReportPdf(group);

    if (!pdfDoc) {
        return;
    }

    pdfDoc.save(`${safeName}-informe.pdf`);

    showToast(
        "Informe descargado en PDF.",
        "success"
    );
}


function renderAdminDashboard() {

    const groups = state.data.groups;

    const submittedGroups = getSubmittedGroups();

 

    const draftGroups = groups.filter(

        group => group.agent.status === "draft"

    );

 

    const notStartedGroups = groups.filter(

        group => !group.agent.name

    );

 

    setText(

        "adminGroupsMetric",

        groups.length

    );

 

    setText(

        "adminSubmittedMetric",

        submittedGroups.length

    );

 

    setText(

        "adminDraftMetric",

        draftGroups.length

    );

 

    setText(

        "adminUseCasesMetric",

        state.data.useCases.filter(

            useCase => useCase.active

        ).length

    );

 

    const total = groups.length || 1;

 

    const submittedPercent = Math.round(

        (submittedGroups.length / total) * 100

    );

 

    const draftPercent = Math.round(

        (draftGroups.length / total) * 100

    );

 

    const notStartedPercent = Math.round(

        (notStartedGroups.length / total) * 100

    );

 

    setText(

        "adminSubmittedDistributionValue",

        submittedGroups.length

    );

 

    setText(

        "adminDraftDistributionValue",

        draftGroups.length

    );

 

    setText(

        "adminNotStartedDistributionValue",

        notStartedGroups.length

    );

 

    const submittedBar =

        getElement("adminSubmittedDistributionBar");

 

    if (submittedBar) {

        submittedBar.style.width =

            `${submittedPercent}%`;

    }

 

    const draftBar =

        getElement("adminDraftDistributionBar");

 

    if (draftBar) {

        draftBar.style.width =

            `${draftPercent}%`;

    }

 

    const notStartedBar =

        getElement("adminNotStartedDistributionBar");

 

    if (notStartedBar) {

        notStartedBar.style.width =

            `${notStartedPercent}%`;

    }

 

    renderAdminRecentActivity();

    renderAdminReceptionStatus();

    bindChallengeCountdownActions();

 

    bindAdminDashboardActions();

}

 

 

function renderAdminReceptionStatus() {

    const receptionOpen =

        state.data.settings.receptionOpen;

 

    setText(

        "adminReceptionStatus",

        receptionOpen ? "Abierta" : "Cerrada"

    );

 

    const toggleButton =

        getElement("toggleReceptionButton");

 

    if (toggleButton) {

        toggleButton.textContent =

            receptionOpen

                ? "Cerrar recepción"

                : "Abrir recepción";

 

        toggleButton.onclick = () => {

            state.data.settings.receptionOpen =

                !state.data.settings.receptionOpen;

 

            saveSettingsToSupabase();

 

            addActivity(

                state.data.settings.receptionOpen

                    ? "Se ha abierto la recepción de propuestas."

                    : "Se ha cerrado la recepción de propuestas.",

                "system"

            );

 

            renderAdminReceptionStatus();

 

            showToast(

                state.data.settings.receptionOpen

                    ? "Recepción abierta."

                    : "Recepción cerrada.",

                "success"

            );

        };

    }

}


const CHALLENGE_DURATION_MS = 45 * 60 * 1000;


function getChallengeRemainingMs() {
    const startedAt = state.data.settings.challengeStartedAt;

    if (!startedAt) {
        return null;
    }

    const endTime =
        new Date(startedAt).getTime() +
        CHALLENGE_DURATION_MS;

    return endTime - Date.now();
}


function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


function renderChallengeCountdown() {
    const remaining = getChallengeRemainingMs();

    let text;
    let stateClass;

    if (remaining === null) {
        text = "Sin iniciar";
        stateClass = "countdown-idle";
    } else if (remaining <= 0) {
        text = "¡Tiempo finalizado!";
        stateClass = "countdown-ended";
    } else {
        text = formatCountdown(remaining);
        stateClass = remaining <= 5 * 60 * 1000
            ? "countdown-warning"
            : "countdown-running";
    }

    [
        "adminCountdownValue",
        "groupCountdownValue"
    ].forEach(id => {
        const element = getElement(id);

        if (!element) {
            return;
        }

        element.textContent = text;
        element.classList.remove(
            "countdown-idle",
            "countdown-running",
            "countdown-warning",
            "countdown-ended"
        );
        element.classList.add(stateClass);
    });

    const startButton = getElement("startCountdownButton");

    if (startButton) {
        startButton.textContent =
            state.data.settings.challengeStartedAt
                ? "Reiniciar cuenta atrás"
                : "Comenzar (45 min)";
    }
}


function startChallengeCountdown() {
    state.data.settings.challengeStartedAt =
        new Date().toISOString();

    saveSettingsToSupabase();

    addActivity(
        "Se ha iniciado la cuenta atrás del challenge (45 minutos).",
        "system"
    );

    renderChallengeCountdown();

    showToast(
        "Cuenta atrás iniciada: 45 minutos.",
        "success"
    );
}


function bindChallengeCountdownActions() {
    const startButton = getElement("startCountdownButton");

    if (startButton) {
        startButton.onclick = () => {
            openConfirmationModal({
                title: "Comenzar cuenta atrás",
                message: "Se iniciará una cuenta atrás de 45 minutos para todos los grupos. ¿Continuar?",
                confirmText: "Comenzar",
                onConfirm: startChallengeCountdown
            });
        };
    }

    renderChallengeCountdown();
}


 

 

function renderAdminRecentActivity() {

    const container =

        getElement("adminRecentGroups") ||

        document.querySelector(

            "[data-admin-activity-list]"

        );

 

    if (!container) {

        return;

    }

 

    const groups = [...state.data.groups]

        .sort(

            (first, second) =>

                new Date(second.updatedAt) -

                new Date(first.updatedAt)

        )

        .slice(0, 6);

 

    if (!groups.length) {

        container.innerHTML = `

            <section class="empty-state">

                <h3>No hay grupos todavía</h3>

                <p>

                    Los grupos aparecerán aquí en cuanto accedan al portal.

                </p>

            </section>

        `;

 

        return;

    }

 

    container.innerHTML = `

        <table class="data-table">

            <thead>

                <tr>

                    <th scope="col">Grupo</th>

                    <th scope="col">Asistente</th>

                    <th scope="col">Progreso</th>

                    <th scope="col">Estado</th>

                </tr>

            </thead>

 

            <tbody>

                ${groups.map(group => {

                    const progress =

                        calculateAgentProgress(

                            group.agent

                        );

 

                    return `

                        <tr>

                            <td>

                                <span class="table-primary-text">

                                    ${escapeHtml(group.name)}

                                </span>

                            </td>

 

                            <td>

                                ${escapeHtml(

                                    group.agent.name ||

                                    "Sin definir"

                                )}

                            </td>

 

                            <td>

                                <div class="progress-card">

                                    <div class="progress-bar">

                                        <div

                                            class="progress-fill"

                                            style="width:${progress}%"

                                        ></div>

                                    </div>

 

                                    <small>${progress}%</small>

                                </div>

                            </td>

 

                            <td>

                                ${getAgentStatusBadge(

                                    group.agent.status

                                )}

                            </td>

                        </tr>

                    `;

                }).join("")}

            </tbody>

        </table>

    `;

}


/* ==========================================================
   ACCIONES RÁPIDAS DEL DASHBOARD DE ADMIN
   (bug corregido: esta función no existía y por eso
   ningún botón del dashboard de administrador funcionaba)
========================================================== */

function bindAdminDashboardActions() {
    const routeMap = {
        groups: "admin-groups",
        useCases: "admin-use-cases",
        agents: "admin-registry",
        exports: "admin-exports"
    };

    document.querySelectorAll("[data-admin-route]").forEach(button => {
        button.onclick = () => {
            const targetPage = routeMap[button.dataset.adminRoute];

            if (targetPage) {
                navigateTo(targetPage);
            }
        };
    });
}


/* ==========================================================
   GRUPOS: PUNTO DE ENTRADA DE LA PÁGINA
   (bug corregido: esta función no existía y por eso la
   página "Grupos" se quedaba sin ningún botón funcional)
========================================================== */

function renderAdminGroups() {
    bindAdminGroupFilters();
    bindAdminGroupActions();
    renderAdminGroupsTable();
}


 

 

function bindAdminGroupFilters() {

    const searchInput =

        getElement("groupSearchInput") ||

        document.querySelector(

            "[data-group-search]"

        );

 

    const statusFilter =

        getElement("groupStatusFilter") ||

        document.querySelector(

            "[data-group-status-filter]"

        );

 

    if (searchInput) {

        searchInput.value =

            state.groupSearch;

 

        searchInput.addEventListener(

            "input",

            event => {

                state.groupSearch =

                    event.target.value.trim();

 

                renderAdminGroupsTable();

            }

        );

    }

 

    if (statusFilter) {

        statusFilter.value =

            state.groupStatusFilter;

 

        statusFilter.addEventListener(

            "change",

            event => {

                state.groupStatusFilter =

                    event.target.value;

 

                renderAdminGroupsTable();

            }

        );

    }

}

 

 

function bindAdminGroupActions() {

    const createButton =

        getElement("createGroupButton") ||

        document.querySelector(

            "[data-create-group]"

        );

 

    if (createButton) {

        createButton.onclick =

            openCreateGroupModal;

    }

}

 

 

function getFilteredGroups() {

    const query =

        state.groupSearch.toLowerCase();

 

    return state.data.groups.filter(

        group => {

            const searchableText = `

                ${group.name}

                ${group.username}

                ${group.email}

                ${group.area}

                ${group.agent.name}

            `.toLowerCase();

 

            const matchesSearch =

                !query ||

                searchableText.includes(

                    query

                );

 

            const matchesStatus =

                state.groupStatusFilter === "all" ||

                group.agent.status ===

                    state.groupStatusFilter;

 

            return (

                matchesSearch &&

                matchesStatus

            );

        }

    );

}

 

 

function renderAdminGroupsTable() {
    const container =
        getElement("groupsTableBody") ||
        document.querySelector(
            "[data-groups-table-body]"
        );

    if (!container) {
        return;
    }

    const groups = getFilteredGroups();

    setText(
        "groupResultsCount",
        `${groups.length} grupo${
            groups.length === 1 ? "" : "s"
        }`
    );

    const groupsEmptyState =
        getElement("groupsEmptyState");

    const groupsTableContainer =
        getElement("groupsTableContainer");

    if (!groups.length) {
        if (groupsTableContainer) {
            hideElement(groupsTableContainer.querySelector("table"));
        }

        container.innerHTML = "";

        if (groupsEmptyState) {
            showElement(groupsEmptyState);
        }

        return;
    }

    if (groupsEmptyState) {
        hideElement(groupsEmptyState);
    }

    if (groupsTableContainer) {
        const table =
            groupsTableContainer.querySelector(
                "table"
            );

        if (table) {
            showElement(table);
        }
    }

    container.innerHTML =
        groups.map(group => {
            const progress =
                calculateAgentProgress(
                    group.agent
                );

            const isLocked =
                group.agent.status === "submitted";

            return `
                <tr>
                    <td>
                        <span class="table-primary-text">
                            ${escapeHtml(group.name)}
                        </span>

                        <span class="table-secondary-text">
                            ${escapeHtml(group.username)}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(
                            group.agent.name ||
                            "Sin definir"
                        )}
                    </td>

                    <td>
                        <div class="progress-card">
                            <div class="progress-bar">
                                <div
                                    class="progress-fill"
                                    style="width:${progress}%"
                                ></div>
                            </div>

                            <small>
                                ${progress}%
                            </small>
                        </div>
                    </td>

                    <td>
                        ${getAgentStatusBadge(group.agent.status)}
                    </td>

                    <td>
                        ${formatDate(group.updatedAt, true)}
                    </td>

                    <td>
                        <div class="table-actions">
                            <button
                                type="button"
                                class="icon-button"
                                title="Ver grupo"
                                data-view-group="${group.id}"
                            >
                                👁
                            </button>

                            ${
                                isLocked
                                    ? `
                                        <button
                                            type="button"
                                            class="icon-button"
                                            title="Reabrir edición"
                                            data-reopen-group="${group.id}"
                                        >
                                            🔓
                                        </button>
                                    `
                                    : ""
                            }

                            <button
                                type="button"
                                class="icon-button icon-button-danger"
                                title="Eliminar grupo"
                                data-delete-group="${group.id}"
                            >
                                ×
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

    container
        .querySelectorAll("[data-view-group]")
        .forEach(button => {
            button.onclick = () =>
                openGroupDetailModal(
                    button.dataset.viewGroup
                );
        });

    container
        .querySelectorAll("[data-reopen-group]")
        .forEach(button => {
            button.onclick = () =>
                confirmReopenGroup(
                    button.dataset.reopenGroup
                );
        });

    container
        .querySelectorAll("[data-delete-group]")
        .forEach(button => {
            button.onclick = () =>
                confirmDeleteGroup(
                    button.dataset.deleteGroup
                );
        });
}


function reopenGroupSubmission(groupId) {
    const group = getGroupById(groupId);

    if (!group) {
        return;
    }

    group.agent.status = "draft";
    group.agent.submittedAt = null;
    group.locked = false;
    group.updatedAt = new Date().toISOString();

    saveGroupToSupabase(group);

    addActivity(
        `Se ha reabierto la edición del asistente de "${group.name}".`,
        "system"
    );

    renderAdminGroupsTable();

    showToast(
        "Edición reabierta. El grupo ya puede volver a editar su asistente.",
        "success"
    );
}


function confirmReopenGroup(groupId) {
    const group = getGroupById(groupId);

    if (!group) {
        return;
    }

    openConfirmationModal({
        title: "Reabrir edición",
        message: `Se permitirá a "${group.name}" volver a editar y reenviar su asistente. ¿Continuar?`,
        confirmText: "Reabrir edición",
        onConfirm: () => reopenGroupSubmission(groupId)
    });
}


/* ==========================================================

   MODAL DE GRUPO

========================================================== */

 

function openCreateGroupModal() {
    state.editingGroupId = null;

    const content = `
        <form
            id="groupForm"
            class="form-grid"
        >
            <label class="form-field">
                <span class="form-label">
                    Nombre del grupo
                </span>

                <input
                    id="modalGroupName"
                    type="text"
                    required
                    placeholder="Ej. Equipo Innovación"
                >
            </label>

            <label class="form-field">
                <span class="form-label">
                    Usuario
                </span>

                <input
                    id="modalGroupUsername"
                    type="text"
                    required
                    placeholder="Ej. EQUIPO05"
                >
            </label>
        </form>
    `;

    openModal({
        title: "Crear nuevo grupo",
        content,
        confirmText: "Crear grupo",
        onConfirm: saveGroupFromModal
    });
}


function saveGroupFromModal() {
    const name =
        getValue("modalGroupName");

    const username =
        getValue("modalGroupUsername")
            .toUpperCase();

    if (!name || !username) {
        showToast(
            "Indica el nombre y el usuario del grupo.",
            "error"
        );

        return false;
    }

    const duplicatedUser =
        state.data.groups.some(
            group =>
                group.username.toUpperCase() === username
        );

    if (duplicatedUser) {
        showToast(
            "Ya existe un grupo con ese usuario.",
            "error"
        );

        return false;
    }

    const group = createInitialGroup(username);

    group.name = name;

    state.data.groups.push(group);

    addActivity(
        `Se ha creado el grupo "${name}".`,
        "group"
    );

    saveGroupToSupabase(group);
    closeModal();
    renderAdminGroupsTable();

    showToast(
        "Grupo creado.",
        "success"
    );

    state.editingGroupId = null;

    return true;
}


function openGroupDetailModal(groupId) {
    const group =
        getGroupById(groupId);

    if (!group) {
        return;
    }

    const agent = group.agent;

    const progress =
        calculateAgentProgress(agent);

    const useCase =
        getUseCaseById(agent.useCaseId);

    const isLocked =
        agent.status === "submitted";

    const content = `
        <section class="agent-detail">
            <div class="detail-grid">
                <article class="detail-card">
                    <h3>Usuario</h3>
                    <p>${escapeHtml(group.username)}</p>
                </article>

                <article class="detail-card">
                    <h3>Estado</h3>
                    <p>${getAgentStatusLabel(agent.status)}</p>
                </article>

                <article class="detail-card">
                    <h3>Progreso</h3>
                    <p>${progress}%</p>
                </article>

                <article class="detail-card">
                    <h3>Asistente</h3>
                    <p>${escapeHtml(agent.name || "Sin definir")}</p>
                </article>

                <article class="detail-card">
                    <h3>Caso de uso</h3>
                    <p>
                        ${escapeHtml(
                            useCase?.name ||
                            (agent.isCustomUseCase ? "Personalizado" : "Sin seleccionar")
                        )}
                    </p>
                </article>

                <article class="detail-card">
                    <h3>Última actualización</h3>
                    <p>${formatDate(group.updatedAt, true)}</p>
                </article>
            </div>

            ${
                isLocked
                    ? `
                        <p class="form-lock-hint">
                            El asistente ya ha sido enviado y no se puede editar.
                            Usa "Reabrir edición" si el grupo necesita modificarlo.
                        </p>
                    `
                    : ""
            }
        </section>
    `;

    openModal({
        title: group.name,
        content,
        confirmText: isLocked ? "Reabrir edición" : null,
        onConfirm: isLocked
            ? () => {
                reopenGroupSubmission(group.id);
                return true;
            }
            : null
    });
}


function confirmDeleteGroup(groupId) {

    const group =

        getGroupById(groupId);

 

    if (!group) {

        return;

    }

 

    openConfirmationModal({

        title: "Eliminar grupo",

        message:

            `Se eliminará "${group.name}" y toda la información de su asistente. Esta acción no se puede deshacer.`,

        confirmText: "Eliminar",

        danger: true,

        onConfirm: () => {

            state.data.groups =

                state.data.groups.filter(

                    item =>

                        item.id !== groupId

                );

 

            supabaseClient

                .from("groups")

                .delete()

                .eq("id", groupId)

                .then(({ error }) => {

                    if (error) {

                        console.error(

                            "No se pudo eliminar el grupo en Supabase:",

                            error

                        );

                    }

                });

 

            addActivity(

                `Se ha eliminado el grupo "${group.name}".`,

                "group"

            );

 


            closeModal();

            renderAdminGroupsTable();

 

            showToast(

                "Grupo eliminado.",

                "success"

            );

        }

    });

}

 

 

/* ==========================================================

   ADMIN: CASOS DE USO

========================================================== */

 

function renderAdminUseCases() {

    renderUseCaseMetrics();

    bindAdminUseCaseFilters();

    bindAdminUseCaseActions();

    renderAdminUseCaseGrid();

}

 

 

function renderUseCaseMetrics() {

    const useCases = state.data.useCases;

 

    const activeCount = useCases.filter(

        useCase => useCase.active

    ).length;

 

    setText(

        "useCasesTotalMetric",

        useCases.length

    );

 

    setText(

        "useCasesActiveMetric",

        activeCount

    );

 

    setText(

        "useCasesInactiveMetric",

        useCases.length - activeCount

    );

}

 

 

function bindAdminUseCaseFilters() {

    const searchInput =

        getElement("useCaseAdminSearchInput") ||

        document.querySelector(

            "[data-use-case-admin-search]"

        );

 

    const statusFilter =

        getElement("useCaseAdminStatusFilter"

        ) ||

        document.querySelector(

            "[data-use-case-admin-status]"

        );

 

    if (searchInput) {

        searchInput.value =

            state.useCaseSearch;

 

        searchInput.addEventListener(

            "input",

            event => {

                state.useCaseSearch =

                    event.target.value.trim();

 

                renderAdminUseCaseGrid();

            }

        );

    }

 

    if (statusFilter) {

        statusFilter.value =

            state.useCaseStatusFilter;

 

        statusFilter.addEventListener(

            "change",

            event => {

                state.useCaseStatusFilter =

                    event.target.value;

 

                renderAdminUseCaseGrid();

            }

        );

    }

}

 

 

function bindAdminUseCaseActions() {

    const createButton =

        getElement("createUseCaseButton") ||

        document.querySelector(

            "[data-create-use-case]"

        );

 

    if (createButton) {

        createButton.onclick =

            openCreateUseCaseModal;

    }

}

 

 

function getFilteredUseCases() {

    const query =

        state.useCaseSearch.toLowerCase();

 

    return state.data.useCases.filter(

        useCase => {

            const text = `

                ${useCase.name}

                ${useCase.category}

                ${useCase.description}

            `.toLowerCase();

 

            const matchesSearch =

                !query ||

                text.includes(query);

 

            const matchesStatus =

                state.useCaseStatusFilter ===

                    "all" ||

                (

                    state.useCaseStatusFilter ===

                        "active" &&

                    useCase.active

                ) ||

                (

                    state.useCaseStatusFilter ===

                        "inactive" &&

                    !useCase.active

                );

 

            return (

                matchesSearch &&

                matchesStatus

            );

        }

    );

}

 

 

function renderAdminUseCaseGrid() {

    const container =

        getElement("useCaseAdminGrid") ||

        document.querySelector(

            "[data-admin-use-case-grid]"

        );

 

    if (!container) {

        return;

    }

 

    const useCases =

        getFilteredUseCases();

 

    const emptyState =

        getElement("useCaseAdminEmptyState");

 

    if (!useCases.length) {

        container.innerHTML = "";

 

        if (emptyState) {

            showElement(emptyState);

        }

 

        return;

    }

 

    if (emptyState) {

        hideElement(emptyState);

    }

 

    container.innerHTML =

        useCases.map(useCase => {

            const assignedGroups =

                state.data.groups.filter(

                    group =>

                        group.agent.useCaseId ===

                        useCase.id

                ).length;

 

            return `

                <article class="admin-use-case-card">

                    <header class="admin-use-case-card-header">

                        <div>

                            <span class="use-case-option-category">

                                ${escapeHtml(

                                    useCase.category

                                )}

                            </span>

 

                            <h3>

                                ${escapeHtml(

                                    useCase.name

                                )}

                            </h3>

                        </div>

 

                        <span class="badge ${

                            useCase.active

                                ? "badge-success"

                                : "badge-danger"

                        }">

                            ${

                                useCase.active

                                    ? "Activo"

                                    : "Inactivo"

                            }

                        </span>

                    </header>

 

                    <p>

                        ${escapeHtml(

                            useCase.description

                        )}

                    </p>

 

                    <div class="admin-use-case-meta">

                        <span>

                            ${assignedGroups}

                            grupo${

                                assignedGroups === 1

                                    ? ""

                                    : "s"

                            }

                        </span>

 

                        <div class="admin-use-case-actions">

                            <button

                                type="button"

                                class="icon-button"

                                data-edit-use-case="${

                                    useCase.id

                                }"

                                title="Editar"

                            >

                                ✎

                            </button>

 

                            <button

                                type="button"

                                class="icon-button"

                                data-toggle-use-case="${

                                    useCase.id

                                }"

                                title="${

                                    useCase.active

                                        ? "Desactivar"

                                        : "Activar"

                                }"

                            >

                                ${

                                    useCase.active

                                        ? "◉"

                                        : "○"

                                }

                            </button>

 

                            <button

                                type="button"

                                class="icon-button icon-button-danger"

                                data-delete-use-case="${

                                    useCase.id

                                }"

                                title="Eliminar"

                            >

                                ×

                            </button>

                        </div>

                    </div>

                </article>

            `;

        }).join("");

 

    container

        .querySelectorAll(

            "[data-edit-use-case]"

        )

        .forEach(button => {

            button.onclick = () =>

                openEditUseCaseModal(

                    button.dataset.editUseCase

                );

        });

 

    container

        .querySelectorAll(

            "[data-toggle-use-case]"

        )

        .forEach(button => {

            button.onclick = () =>

                toggleUseCaseStatus(

                    button.dataset.toggleUseCase

                );

        });

 

    container

        .querySelectorAll(

            "[data-delete-use-case]"

        )

        .forEach(button => {

            button.onclick = () =>

                confirmDeleteUseCase(

                    button.dataset.deleteUseCase

                );

        });

}

 

 

/* ==========================================================

   MODAL CASO DE USO

========================================================== */

 

function openCreateUseCaseModal() {
    state.editingUseCaseId = null;

    const content = `
        <form
            id="useCaseForm"
            class="form-grid"
        >
            <label class="form-field">
                <span class="form-label">
                    Nombre
                </span>

                <input
                    id="modalUseCaseName"
                    type="text"
                    required
                >
            </label>

            <label class="form-field">
                <span class="form-label">
                    Categoría
                </span>

                <input
                    id="modalUseCaseCategory"
                    type="text"
                    required
                    placeholder="Ej. Productividad"
                >
            </label>

            <label class="form-field form-field-full">
                <span class="form-label">
                    Descripción
                </span>

                <textarea
                    id="modalUseCaseDescription"
                    rows="4"
                    required
                ></textarea>
            </label>

            <label class="form-field form-field-full">
                <span class="form-label">
                    Problema que resuelve
                </span>

                <textarea
                    id="modalUseCaseProblem"
                    rows="4"
                    placeholder="Se cargará automáticamente en la ficha del asistente cuando un grupo elija este caso de uso."
                ></textarea>
            </label>

            <label class="form-field">
                <span class="form-label">
                    Complejidad
                </span>

                <select id="modalUseCaseComplexity">
                    <option value="">Sin definir</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                </select>
            </label>

            <label class="switch-field form-field-full">
                <input
                    id="modalUseCaseActive"
                    type="checkbox"
                    checked
                >

                <span>
                    Caso de uso activo
                </span>
            </label>
        </form>
    `;

    openModal({
        title: "Crear caso de uso",
        content,
        confirmText: "Crear caso de uso",
        onConfirm: saveUseCaseFromModal
    });
}


function openEditUseCaseModal(useCaseId) {
    const useCase =
        getUseCaseById(useCaseId);

    if (!useCase) {
        return;
    }

    state.editingUseCaseId =
        useCase.id;

    const content = `
        <form
            id="useCaseForm"
            class="form-grid"
        >
            <label class="form-field">
                <span class="form-label">
                    Nombre
                </span>

                <input
                    id="modalUseCaseName"
                    type="text"
                    value="${escapeHtml(useCase.name)}"
                    required
                >
            </label>

            <label class="form-field">
                <span class="form-label">
                    Categoría
                </span>

                <input
                    id="modalUseCaseCategory"
                    type="text"
                    value="${escapeHtml(useCase.category)}"
                    required
                >
            </label>

            <label class="form-field form-field-full">
                <span class="form-label">
                    Descripción
                </span>

                <textarea
                    id="modalUseCaseDescription"
                    rows="4"
                    required
                >${escapeHtml(useCase.description)}</textarea>
            </label>

            <label class="form-field form-field-full">
                <span class="form-label">
                    Problema que resuelve
                </span>

                <textarea
                    id="modalUseCaseProblem"
                    rows="4"
                    placeholder="Se cargará automáticamente en la ficha del asistente cuando un grupo elija este caso de uso."
                >${escapeHtml(useCase.problem || "")}</textarea>
            </label>

            <label class="form-field">
                <span class="form-label">
                    Complejidad
                </span>

                <select id="modalUseCaseComplexity">
                    <option value="" ${!useCase.complexity ? "selected" : ""}>Sin definir</option>
                    <option value="bajo" ${useCase.complexity === "bajo" ? "selected" : ""}>Bajo</option>
                    <option value="medio" ${useCase.complexity === "medio" ? "selected" : ""}>Medio</option>
                    <option value="alto" ${useCase.complexity === "alto" ? "selected" : ""}>Alto</option>
                </select>
            </label>

            <label class="switch-field form-field-full">
                <input
                    id="modalUseCaseActive"
                    type="checkbox"
                    ${useCase.active ? "checked" : ""}
                >

                <span>
                    Caso de uso activo
                </span>
            </label>
        </form>
    `;

    openModal({
        title: "Editar caso de uso",
        content,
        confirmText: "Guardar cambios",
        onConfirm: saveUseCaseFromModal
    });
}


function saveUseCaseFromModal() {
    const name =
        getValue("modalUseCaseName");

    const category =
        getValue("modalUseCaseCategory");

    const description =
        getValue("modalUseCaseDescription");

    const problem =
        getValue("modalUseCaseProblem");

    const complexity =
        getValue("modalUseCaseComplexity");

    const active =
        Boolean(
            getElement("modalUseCaseActive")?.checked
        );

    if (
        !name ||
        !category ||
        !description
    ) {
        showToast(
            "Completa todos los campos obligatorios.",
            "error"
        );

        return false;
    }

    const now =
        new Date().toISOString();

    let editedUseCase = null;
    const affectedGroups = [];

    if (state.editingUseCaseId) {
        const useCase =
            getUseCaseById(
                state.editingUseCaseId
            );

        if (!useCase) {
            return false;
        }

        useCase.name = name;
        useCase.category = category;
        useCase.description = description;
        useCase.problem = problem;
        useCase.complexity = complexity;
        useCase.active = active;
        useCase.updatedAt = now;

        editedUseCase = useCase;

        state.data.groups.forEach(
            group => {
                if (
                    group.agent.useCaseId ===
                    useCase.id
                ) {
                    group.agent.useCaseName = name;

                    if (!group.agent.isCustomUseCase) {
                        group.agent.description = description;
                        group.agent.problem = problem;
                        group.agent.complexity = complexity;
                    }

                    affectedGroups.push(group);
                }
            }
        );

        addActivity(
            `Se ha actualizado el caso de uso "${name}".`,
            "usecase"
        );

    } else {
        editedUseCase = {
            id: generateId("usecase"),
            name,
            category,
            description,
            problem,
            complexity,
            active,
            createdAt: now,
            updatedAt: now
        };

        state.data.useCases.push(editedUseCase);

        addActivity(
            `Se ha creado el caso de uso "${name}".`,
            "usecase"
        );
    }

    saveUseCaseToSupabase(editedUseCase);

    affectedGroups.forEach(group => {
        saveGroupToSupabase(group);
    });

    closeModal();
    renderUseCaseMetrics();
    renderAdminUseCaseGrid();

    showToast(
        state.editingUseCaseId
            ? "Caso de uso actualizado."
            : "Caso de uso creado.",
        "success"
    );

    state.editingUseCaseId = null;

    return true;
}


function toggleUseCaseStatus(

    useCaseId

) {

    const useCase =

        getUseCaseById(useCaseId);

 

    if (!useCase) {

        return;

    }

 

    useCase.active =

        !useCase.active;

 

    useCase.updatedAt =

        new Date().toISOString();

 

    saveUseCaseToSupabase(useCase);

    renderUseCaseMetrics();

    renderAdminUseCaseGrid();

 

    showToast(

        useCase.active

            ? "Caso de uso activado."

            : "Caso de uso desactivado.",

        "success"

    );

}

 

 

function confirmDeleteUseCase(

    useCaseId

) {

    const useCase =

        getUseCaseById(useCaseId);

 

    if (!useCase) {

        return;

    }

 

    const assignedGroups =

        state.data.groups.filter(

            group =>

                group.agent.useCaseId ===

                useCaseId

        );

 

    if (assignedGroups.length) {

        showToast(

            "No se puede eliminar porque está asignado a uno o más grupos. Puedes desactivarlo.",

            "error"

        );

 

        return;

    }

 

    openConfirmationModal({

        title: "Eliminar caso de uso",

        message:

            `Se eliminará "${useCase.name}". Esta acción no se puede deshacer.`,

        confirmText: "Eliminar",

        danger: true,

        onConfirm: () => {

            state.data.useCases =

                state.data.useCases.filter(

                    item =>

                        item.id !==

                        useCaseId

                );

 

            supabaseClient

                .from("use_cases")

                .delete()

                .eq("id", useCaseId)

                .then(({ error }) => {

                    if (error) {

                        console.error(

                            "No se pudo eliminar el caso de uso en Supabase:",

                            error

                        );

                    }

                });

 

            addActivity(

                `Se ha eliminado el caso de uso "${useCase.name}".`,

                "usecase"

            );

 


            closeModal();

            renderUseCaseMetrics();

    renderAdminUseCaseGrid();

 

            showToast(

                "Caso de uso eliminado.",

                "success"

            );

        }

    });

}

 

 

/* ==========================================================

   AI AGENT REGISTRY

========================================================== */

 

function renderAgentRegistry() {

    bindRegistryFilters();

    bindRegistryViewToggle();

    bindRegistryRefresh();

    renderFeaturedAgent();

    renderRegistryAgents();

}

 

 

function bindRegistryRefresh() {

    const refreshButton =

        getElement("refreshAgentRegistryButton");

 

    if (refreshButton) {

        refreshButton.onclick = () => {

            renderFeaturedAgent();

            renderRegistryAgents();

 

            showToast(

                "Catálogo actualizado.",

                "success"

            );

        };

    }

}

 

 

function bindRegistryFilters() {

    const searchInput =

        getElement("agentRegistrySearchInput") ||

        document.querySelector(

            "[data-registry-search]"

        );

 

    const categoryFilter =

        getElement("agentRegistryUseCaseFilter"

        ) ||

        document.querySelector(

            "[data-registry-category-filter]"

        );

 

    if (searchInput) {

        searchInput.value =

            state.registrySearch;

 

        searchInput.addEventListener(

            "input",

            event => {

                state.registrySearch =

                    event.target.value.trim();

 

                renderFeaturedAgent();

                renderRegistryAgents();

            }

        );

    }

 

    if (categoryFilter) {

        populateRegistryCategories(

            categoryFilter

        );

 

        categoryFilter.value =

            state.registryCategoryFilter;

 

        categoryFilter.addEventListener(

            "change",

            event => {

                state.registryCategoryFilter =

                    event.target.value;

 

                renderFeaturedAgent();

                renderRegistryAgents();

            }

        );

    }

}

 

 

function populateRegistryCategories(

    select

) {

    const categories = [

        ...new Set(

            state.data.useCases.map(

                useCase =>

                    useCase.category

            )

        )

    ].sort();

 

    select.innerHTML = `

        <option value="all">

            Todas las categorías

        </option>

 

        ${categories.map(category => `

            <option value="${escapeHtml(

                category

            )}">

                ${escapeHtml(category)}

            </option>

        `).join("")}

    `;

}

 

 

function bindRegistryViewToggle() {

    const viewButtons = {

        grid: getElement("agentGridViewButton"),

        list: getElement("agentListViewButton")

    };

 

    Object.entries(viewButtons).forEach(

        ([viewName, button]) => {

            if (!button) {

                return;

            }

 

            button.classList.toggle(

                "active",

                viewName === state.registryView

            );

 

            button.setAttribute(

                "aria-pressed",

                viewName === state.registryView

                    ? "true"

                    : "false"

            );

 

            button.onclick = () => {

                state.registryView = viewName;

 

                Object.entries(

                    viewButtons

                ).forEach(

                    ([innerView, innerButton]) => {

                        if (!innerButton) {

                            return;

                        }

 

                        innerButton.classList.toggle(

                            "active",

                            innerView === viewName

                        );

 

                        innerButton.setAttribute(

                            "aria-pressed",

                            innerView === viewName

                                ? "true"

                                : "false"

                        );

                    }

                );

 

                renderRegistryAgents();

            };

        }

    );

}

 

 

function getFilteredSubmittedGroups() {

    const query =

        state.registrySearch.toLowerCase();

 

    return getSubmittedGroups().filter(

        group => {

            const useCase =

                getUseCaseById(

                    group.agent.useCaseId

                );

 

            const text = `

                ${group.name}

                ${group.agent.name}

                ${group.agent.description}

                ${useCase?.name || ""}

                ${useCase?.category || ""}

            `.toLowerCase();

 

            const matchesSearch =

                !query ||

                text.includes(query);

 

            const matchesCategory =

                state.registryCategoryFilter ===

                    "all" ||

                useCase?.category ===

                    state.registryCategoryFilter;

 

            return (

                matchesSearch &&

                matchesCategory

            );

        }

    );

}

 

 

function renderFeaturedAgent() {

    const featuredSection =

        getElement("featuredAgentSection");

 

    if (!featuredSection) {

        return;

    }

 

    const agents =

        getFilteredSubmittedGroups();

 

    if (!agents.length) {

        hideElement(featuredSection);

        return;

    }

 

    const featured = [...agents].sort(

        (first, second) =>

            new Date(

                second.agent.submittedAt

            ) -

            new Date(

                first.agent.submittedAt

            )

    )[0];

 

    const useCase =

        getUseCaseById(

            featured.agent.useCaseId

        );

 

    setText(

        "featuredAgentName",

        featured.agent.name

    );

 

    setText(

        "featuredAgentPitch",

        featured.agent.description

    );

 

    setText(

        "featuredAgentGroup",

        featured.name

    );

 

    setText(

        "featuredAgentUseCase",

        getUseCaseDisplayName(featured.agent)

    );

 

    showElement(featuredSection);

 

    const detailButton =

        getElement("featuredAgentDetailButton");

 

    if (detailButton) {

        detailButton.onclick = () =>

            openAgentDetailModal(featured.id);

    }

}

 

 

function renderRegistryAgents() {

    const container =

        getElement("agentRegistryGrid") ||

        document.querySelector(

            "[data-agent-registry-container]"

        );

 

    if (!container) {

        return;

    }

 

    const groups =

        getFilteredSubmittedGroups();

 

    setText(

        "agentRegistryResultsCount",

        `${groups.length} asistente${

            groups.length === 1 ? "" : "s"

        }`

    );

 

    const emptyState =

        getElement("agentRegistryEmptyState");

 

    if (!groups.length) {

        container.innerHTML = "";

 

        if (emptyState) {

            showElement(emptyState);

        }

 

        return;

    }

 

    if (emptyState) {

        hideElement(emptyState);

    }

 

    container.className =

        state.registryView === "list"

            ? "registry-list"

            : "agent-registry-grid";

 

    if (state.registryView === "list") {

        container.innerHTML =

            groups.map(group =>

                createRegistryListItem(group)

            ).join("");

 

    } else {

        container.innerHTML =

            groups.map(group =>

                createRegistryCard(group)

            ).join("");

    }

 

    container

        .querySelectorAll(

            "[data-view-agent]"

        )

        .forEach(button => {

            button.onclick = () =>

                openAgentDetailModal(

                    button.dataset.viewAgent

                );

        });

 

    container

        .querySelectorAll(

            "[data-download-agent]"

        )

        .forEach(button => {

            button.onclick = () => {

                const group =

                    getGroupById(

                        button.dataset

                            .downloadAgent

                    );

 

                if (group) {

                    downloadGroupFactsheet(

                        group

                    );

                }

            };

        });

}

 

 

function createRegistryCard(group) {

    const useCase =

        getUseCaseById(

            group.agent.useCaseId

        );

 

    return `

        <article class="registry-card">

            <header class="registry-card-header">

                <div class="registry-agent-icon">

                    AI

                </div>

 

                <span class="badge badge-success">

                    Enviado

                </span>

            </header>

 

            <h3>

                ${escapeHtml(

                    group.agent.name

                )}

            </h3>

 

            <p class="registry-card-description">

                ${escapeHtml(

                    group.agent.description

                )}

            </p>

 

            <div class="registry-card-tags">

                <span class="tag">

                    ${escapeHtml(

                        group.name

                    )}

                </span>

 

                <span class="tag">

                    ${escapeHtml(

                        useCase?.category ||

                        "Sin categoría"

                    )}

                </span>

            </div>

 

            <footer class="registry-card-footer">

                <button

                    type="button"

                    class="button button-secondary"

                    data-view-agent="${

                        group.id

                    }"

                >

                    Ver detalle

                </button>

 

                <button

                    type="button"

                    class="icon-button"

                    data-download-agent="${

                        group.id

                    }"

                    title="Descargar ficha"

                >

                    ⇩

                </button>

            </footer>

        </article>

    `;

}

 

 

function createRegistryListItem(group) {

    const useCase =

        getUseCaseById(

            group.agent.useCaseId

        );

 

    return `

        <article class="registry-list-item">

            <div class="registry-agent-icon">

                AI

            </div>

 

            <div>

                <strong>

                    ${escapeHtml(

                        group.agent.name

                    )}

                </strong>

 

                <p>

                    ${escapeHtml(

                        group.agent.description

                    )}

                </p>

            </div>

 

            <div>

                <span class="tag">

                    ${escapeHtml(

                        useCase?.category ||

                        "Sin categoría"

                    )}

                </span>

 

                <p>

                    ${escapeHtml(

                        group.name

                    )}

                </p>

            </div>

 

            <div class="table-actions">

                <button

                    type="button"

                    class="icon-button"

                    data-view-agent="${

                        group.id

                    }"

                    title="Ver detalle"

                >

                    👁

                </button>

 

                <button

                    type="button"

                    class="icon-button"

                    data-download-agent="${

                        group.id

                    }"

                    title="Descargar"

                >

                    ⇩

                </button>

            </div>

        </article>

    `;

}

 

 

/* ==========================================================

   DETALLE DEL ASISTENTE

========================================================== */

 

function openAgentDetailModal(
    groupId
) {
    const group =
        getGroupById(groupId);

    if (!group) {
        return;
    }

    const agent = group.agent;

    const useCase =
        getUseCaseById(
            agent.useCaseId
        );

    const conversations =
        agent.conversations.map(
            (conversation, index) => `
                <article class="conversation-card">
                    <header class="conversation-card-header">
                        <strong>
                            ${escapeHtml(
                                conversation.title ||
                                `Conversación ${index + 1}`
                            )}
                        </strong>
                    </header>

                    <div class="conversation-card-body">
                        <div class="message-block message-block-user">
                            <span class="message-role">
                                Usuario
                            </span>

                            <p>
                                ${escapeHtml(conversation.userMessage)}
                            </p>
                        </div>

                        <div class="message-block message-block-assistant">
                            <span class="message-role">
                                Asistente
                            </span>

                            <p>
                                ${escapeHtml(conversation.assistantMessage)}
                            </p>
                        </div>
                    </div>
                </article>
            `
        ).join("");

    const content = `
        <section class="agent-detail">
            <header class="agent-detail-header">
                <div class="agent-detail-symbol">
                    AI
                </div>

                <div>
                    <span class="eyebrow">
                        ${escapeHtml(useCase?.category || "AI Agent")}
                    </span>

                    <h2>
                        ${escapeHtml(agent.name)}
                    </h2>
                </div>
            </header>

            <div class="detail-grid">
                <article class="detail-card">
                    <h3>Grupo</h3>
                    <p>${escapeHtml(group.name)}</p>
                </article>

                <article class="detail-card">
                    <h3>Caso de uso</h3>
                    <p>
                        ${escapeHtml(
                            useCase?.name ||
                            (agent.isCustomUseCase ? "Personalizado" : "Sin definir")
                        )}
                    </p>
                </article>

                <article class="detail-card">
                    <h3>Problema</h3>
                    <p>${escapeHtml(agent.problem)}</p>
                </article>

                <article class="detail-card">
                    <h3>Complejidad</h3>
                    <p>${getComplexityBadgeHtml(agent.complexity)}</p>
                </article>

                <article class="detail-card">
                    <h3>Modelo o LLM</h3>
                    <p>${escapeHtml(agent.model || "Sin indicar")}</p>
                </article>

                <article class="detail-card">
                    <h3>Herramientas</h3>
                    <p>${escapeHtml(agent.tools || "Sin indicar")}</p>
                </article>

                <article class="detail-card">
                    <h3>¿Recibe o genera documentación?</h3>
                    <p>${agent.handlesDocumentation ? "Sí" : "No"}</p>
                </article>
            </div>

            <article class="detail-card">
                <h3>Descripción</h3>

                <p>
                    ${escapeHtml(agent.description)}
                </p>
            </article>

            <section class="detail-prompt">
                <h3>Prompt del asistente</h3>

                <pre>${escapeHtml(agent.prompt)}</pre>
            </section>

            <section>
                <h3>Conversaciones de ejemplo</h3>

                <div class="detail-conversation-list">
                    ${conversations || "<p>No hay conversaciones disponibles.</p>"}
                </div>
            </section>
        </section>
    `;

    openModal({
        title: "Detalle del asistente",
        content,
        confirmText: "Descargar ficha",
        onConfirm: () => {
            downloadGroupFactsheet(
                group
            );

            return false;
        }
    });
}


/* ==========================================================

   EXPORTACIONES

========================================================== */

 

function initializeExports() {

    bindExportActions();

    renderExportSummary();

}

 

 

function renderExportSummary() {

    setText(

        "exportsSubmittedAgents",

        getSubmittedGroups().length

    );

}

 

function bindExportActions() {
    const exportTxtButton =
        getElement("downloadAllAssistantsTxt") ||
        document.querySelector(
            "[data-export-all-txt]"
        );

    const exportPdfButton =
        getElement("downloadAllAssistantsPdf") ||
        document.querySelector(
            "[data-export-all-pdf]"
        );

    const exportCsvButton =
        getElement("exportCsvButton") ||
        document.querySelector(
            "[data-export-csv]"
        );

    const exportReportButton =
        getElement("downloadExecutiveReport") ||
        document.querySelector(
            "[data-export-report]"
        );

    const resetButton =
        getElement("resetDataButton") ||
        document.querySelector(
            "[data-reset-data]"
        );

    if (exportTxtButton) {
        exportTxtButton.onclick =
            exportAllAssistantsTxt;
    }

    if (exportPdfButton) {
        exportPdfButton.onclick =
            exportAllAssistantsPdf;
    }

    if (exportCsvButton) {
        exportCsvButton.onclick =
            exportAgentsAsCsv;
    }

    if (exportReportButton) {
        exportReportButton.onclick =
            exportExecutiveReport;
    }

    if (resetButton) {
        resetButton.onclick =
            confirmResetApplication;
    }
}

 

 

function exportAllAssistantsTxt() {
    const groups = getSubmittedGroups();

    if (!groups.length) {
        showToast(
            "Todavía no hay asistentes enviados.",
            "error"
        );

        return;
    }

    const sections =
        groups.map((group, index) => {
            const separator =
                index === 0
                    ? ""
                    : "\n\n" + "=".repeat(60) + "\n\n";

            return separator + generateAssistantReportText(group);
        });

    downloadFile(
        "ai-agent-challenge-asistentes.txt",
        sections.join(""),
        "text/plain;charset=utf-8"
    );

    showToast(
        "Asistentes exportados en TXT.",
        "success"
    );
}


function exportAllAssistantsPdf() {
    const groups = getSubmittedGroups();

    if (!groups.length) {
        showToast(
            "Todavía no hay asistentes enviados.",
            "error"
        );

        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast(
            "No se ha podido cargar el generador de PDF.",
            "error"
        );

        return;
    }

    const doc = generateAssistantsBundlePdf(groups);

    doc.save("ai-agent-challenge-asistentes.pdf");

    showToast(
        "Asistentes exportados en PDF.",
        "success"
    );
}


function exportAgentsAsCsv() {
    const headers = [
        "Grupo",
        "Usuario",
        "Área",
        "Email",
        "Estado",
        "Progreso",
        "Asistente",
        "Caso de uso",
        "Categoría",
        "Complejidad",
        "Documentación",
        "Fecha de envío"
    ];

    const rows =
        state.data.groups.map(
            group => {
                const useCase =
                    getUseCaseById(
                        group.agent.useCaseId
                    );

                return [
                    group.name,
                    group.username,
                    group.area,
                    group.email,
                    getAgentStatusLabel(
                        group.agent.status
                    ),
                    calculateAgentProgress(
                        group.agent
                    ),
                    group.agent.name,
                    useCase?.name ||
                        (group.agent.isCustomUseCase ? "Personalizado" : ""),
                    useCase?.category || "",
                    getComplexityLabel(group.agent.complexity),
                    group.agent.handlesDocumentation ? "Sí" : "No",
                    group.agent.submittedAt
                        ? formatDate(
                            group.agent.submittedAt,
                            true
                        )
                        : ""
                ];
            }
        );

    const csv = [
        headers,
        ...rows
    ].map(row =>
        row.map(csvEscape).join(";")
    ).join("\n");

    downloadFile(
        "ai-agent-challenge-asistentes.csv",
        `\uFEFF${csv}`,
        "text/csv;charset=utf-8"
    );

    showToast(
        "Asistentes exportados en CSV.",
        "success"
    );
}


function csvEscape(value) {

    const stringValue =

        String(value ?? "");

 

    if (

        stringValue.includes(";") ||

        stringValue.includes('"') ||

        stringValue.includes("\n")

    ) {

        return `"${stringValue.replaceAll(

            '"',

            '""'

        )}"`;

    }

 

    return stringValue;

}

 

 

function exportExecutiveReport() {

    const groups =

        state.data.groups;

 

    const submitted =

        getSubmittedGroups();

 

    const averageProgress =

        groups.length

            ? Math.round(

                groups.reduce(

                    (total, group) =>

                        total +

                        calculateAgentProgress(

                            group.agent

                        ),

                    0

                ) / groups.length

            )

            : 0;

 

    const categoryCounts = {};

 

    submitted.forEach(group => {

        const useCase =

            getUseCaseById(

                group.agent.useCaseId

            );

 

        const category =

            useCase?.category ||

            "Sin categoría";

 

        categoryCounts[category] =

            (

                categoryCounts[category] ||

                0

            ) + 1;

    });

 

    const categoryRows =

        Object.entries(categoryCounts)

            .sort(

                (first, second) =>

                    second[1] - first[1]

            )

            .map(

                ([category, count]) => `

                    <tr>

                        <td>

                            ${escapeHtml(category)}

                        </td>

 

                        <td>

                            ${count}

                        </td>

                    </tr>

                `

            )

            .join("");

 

    const agentRows =

        submitted.map(group => {

            const useCase =

                getUseCaseById(

                    group.agent.useCaseId

                );

 

            return `

                <tr>

                    <td>

                        ${escapeHtml(

                            group.agent.name

                        )}

                    </td>

 

                    <td>

                        ${escapeHtml(

                            group.name

                        )}

                    </td>

 

                    <td>

                        ${escapeHtml(

                            getUseCaseDisplayName(group.agent)

                        )}

                    </td>

 

                    <td>

                        ${formatDate(

                            group.agent.submittedAt

                        )}

                    </td>

                </tr>

            `;

        }).join("");

 

    const html = `

<!DOCTYPE html>

<html lang="es">

<head>

    <meta charset="UTF-8">

 

    <meta

        name="viewport"

        content="width=device-width, initial-scale=1.0"

    >

 

    <title>

        Informe ejecutivo AI Agent Challenge

    </title>

 

    <style>

        body {

            font-family:

                Arial,

                sans-serif;

            max-width: 1100px;

            margin: auto;

            padding: 50px;

            color: #1f2937;

            line-height: 1.5;

        }

 

        header {

            padding-bottom: 30px;

            border-bottom:

                4px solid #fe7c39;

        }

 

        h1 {

            margin-bottom: 8px;

        }

 

        h2 {

            margin-top: 38px;

            color: #fe7c39;

        }

 

        .metrics {

            display: grid;

            grid-template-columns:

                repeat(4, 1fr);

            gap: 18px;

            margin-top: 30px;

        }

 

        .metric {

            padding: 22px;

            border:

                1px solid #e5e7eb;

            border-radius: 14px;

        }

 

        .metric strong {

            display: block;

            font-size: 32px;

        }

 

        table {

            width: 100%;

            border-collapse: collapse;

            margin-top: 18px;

        }

 

        th,

        td {

            text-align: left;

            padding: 14px;

            border-bottom:

                1px solid #e5e7eb;

        }

 

        th {

            background: #f9fafb;

        }

 

        .meta {

            color: #667085;

        }

 

        @media print {

            body {

                padding: 15px;

            }

        }

    </style>

</head>

 

<body>

 

    <header>

        <p class="meta">

            ${escapeHtml(

                state.data.settings.organization

            )}

        </p>

 

        <h1>

            Informe ejecutivo

            ${escapeHtml(

                state.data.settings.challengeName

            )}

        </h1>

 

        <p>

            Edición

            ${escapeHtml(

                state.data.settings.edition

            )}

        </p>

 

        <p class="meta">

            Generado el

            ${formatDate(

                new Date().toISOString(),

                true

            )}

        </p>

    </header>

 

    <section class="metrics">

        <article class="metric">

            <span>

                Grupos

            </span>

 

            <strong>

                ${groups.length}

            </strong>

        </article>

 

        <article class="metric">

            <span>

                Asistentes enviados

            </span>

 

            <strong>

                ${submitted.length}

            </strong>

        </article>

 

        <article class="metric">

            <span>

                Asistentes en borrador

            </span>

 

            <strong>

                ${

                    groups.length -

                    submitted.length

                }

            </strong>

        </article>

 

        <article class="metric">

            <span>

                Progreso medio

            </span>

 

            <strong>

                ${averageProgress}%

            </strong>

        </article>

    </section>

 

    <h2>

        Distribución por categoría

    </h2>

 

    <table>

        <thead>

            <tr>

                <th>

                    Categoría

                </th>

 

                <th>

                    Asistentes

                </th>

            </tr>

        </thead>

 

        <tbody>

            ${

                categoryRows ||

                `

                    <tr>

                        <td colspan="2">

                            No hay datos disponibles.

                        </td>

                    </tr>

                `

            }

        </tbody>

    </table>

 

    <h2>

        Asistentes presentados

    </h2>

 

    <table>

        <thead>

            <tr>

                <th>

                    Asistente

                </th>

 

                <th>

                    Grupo

                </th>

 

                <th>

                    Caso de uso

                </th>

 

                <th>

                    Fecha de envío

                </th>

            </tr>

        </thead>

 

        <tbody>

            ${

                agentRows ||

                `

                    <tr>

                        <td colspan="4">

                            No hay asistentes enviados.

                        </td>

                    </tr>

                `

            }

        </tbody>

    </table>

 

</body>

</html>

    `.trim();

 

    downloadFile(

        "informe-ejecutivo-ai-agent-challenge.html",

        html,

        "text/html;charset=utf-8"

    );

 

    showToast(

        "Informe ejecutivo descargado.",

        "success"

    );

}

 

 

/* ==========================================================

   MODAL GENÉRICO

========================================================== */

 

function ensureModalMounted() {

    const modalRoot = getElement("modalRoot");

 

    if (!modalRoot || modalRoot.dataset.mounted === "true") {

        return;

    }

 

    const template = getElement("modalTemplate");

 

    if (!template) {

        return;

    }

 

    modalRoot.appendChild(

        template.content.cloneNode(true)

    );

 

    modalRoot.dataset.mounted = "true";

}

 

 

function openModal({

    title,

    content,

    confirmText = "Guardar",

    cancelText = "Cancelar",

    onConfirm = null

}) {

    ensureModalMounted();

 

    const overlay = getElement("modalRoot");

 

    if (!overlay) {

        console.error(

            "No se ha encontrado el modal genérico."

        );

 

        return;

    }

 

    const titleElement =

        overlay.querySelector(

            "[data-modal-title]"

        ) ||

        getElement("modalTitle");

 

    const bodyElement =

        overlay.querySelector(

            "[data-modal-body]"

        ) ||

        getElement("modalBody");

 

    const footerElement =

        overlay.querySelector(

            "[data-modal-footer]"

        ) ||

        getElement("modalFooter");

 

    if (titleElement) {

        titleElement.textContent =

            title || "";

    }

 

    if (bodyElement) {

        bodyElement.innerHTML =

            content || "";

    }

 

    if (footerElement) {

        footerElement.innerHTML = `

            <button

                type="button"

                class="button button-secondary"

                data-modal-cancel

            >

                ${escapeHtml(cancelText)}

            </button>

 

            ${

                confirmText

                    ? `

                        <button

                            type="button"

                            class="button button-primary"

                            data-modal-confirm

                        >

                            ${escapeHtml(

                                confirmText

                            )}

                        </button>

                    `

                    : ""

            }

        `;

 

        const cancelButton =

            footerElement.querySelector(

                "[data-modal-cancel]"

            );

 

        const confirmButton =

            footerElement.querySelector(

                "[data-modal-confirm]"

            );

 

        if (cancelButton) {

            cancelButton.onclick =

                closeModal;

        }

 

        if (confirmButton) {

            confirmButton.onclick =

                async () => {

                    if (!onConfirm) {

                        closeModal();

                        return;

                    }

 

                    const result =

                        await onConfirm();

 

                    if (result !== false) {

                        closeModal();

                    }

                };

        }

    }

 

    overlay.classList.remove(

        "hidden"

    );

 

    overlay.setAttribute(

        "aria-hidden",

        "false"

    );

 

    document.body.style.overflow =

        "hidden";

}

 

 

function openConfirmationModal({

    title,

    message,

    confirmText = "Confirmar",

    danger = false,

    onConfirm

}) {

    const content = `

        <section class="confirmation-dialog">

            <div class="confirmation-icon">

                !

            </div>

 

            <h2>

                ${escapeHtml(title)}

            </h2>

 

            <p>

                ${escapeHtml(message)}

            </p>

        </section>

    `;

 

    openModal({

        title,

        content,

        confirmText,

        onConfirm

    });

 

    if (danger) {

        const confirmButton =

            document.querySelector(

                "[data-modal-confirm]"

            );

 

        if (confirmButton) {

            confirmButton.classList.remove(

                "button-primary"

            );

 

            confirmButton.classList.add(

                "button-danger"

            );

        }

    }

}

 

 

function closeModal() {

    const overlay = getElement("modalRoot");

 

    if (!overlay) {

        return;

    }

 

    overlay.classList.add("hidden");

 

    overlay.setAttribute(

        "aria-hidden",

        "true"

    );

 

    document.body.style.overflow = "";

 

    state.editingGroupId = null;

    state.editingUseCaseId = null;

}

 

 

/* ==========================================================

   REINICIAR APLICACIÓN

========================================================== */

 

function confirmResetApplication() {

    openConfirmationModal({

        title: "Reiniciar aplicación",

        message:

            "Se eliminarán todos los grupos, asistentes, casos de uso y configuraciones guardadas en este navegador.",

        confirmText: "Reiniciar",

        danger: true,

        onConfirm: resetApplicationData

    });

}

 

 

async function resetApplicationData() {

    showLoader("Reiniciando aplicación...");

    try {
        const groupIds =
            state.data.groups.map(group => group.id);

        if (groupIds.length) {
            await supabaseClient
                .from("groups")
                .delete()
                .in("id", groupIds);
        }

        const useCaseIds =
            state.data.useCases.map(useCase => useCase.id);

        if (useCaseIds.length) {
            await supabaseClient
                .from("use_cases")
                .delete()
                .in("id", useCaseIds);
        }

        state.data = createInitialData();

        await syncAllDataToSupabase();

    } catch (error) {
        console.error(
            "No se pudo reiniciar la base de datos:",
            error
        );

        showToast(
            "No se ha podido reiniciar la base de datos.",
            "error"
        );

        hideLoader();

        return false;
    }

    hideLoader();

    closeModal();

    showToast(

        "La aplicación se ha reiniciado.",

        "success"

    );

 

    window.setTimeout(() => {

        navigateTo(

            state.session?.role === "admin"

                ? "admin-dashboard"

                : "group-dashboard"

        );

    }, 300);

 

    return true;

}