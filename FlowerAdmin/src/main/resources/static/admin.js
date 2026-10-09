
"use strict";

/* ==========================================
   FLOWER ADMIN - MYSQL
   Dashboard / Orders / Flowers / Shops
   ========================================== */

const API_BASE = "/api";

const TYPES = ["orders", "flowers", "shops"];

const CONFIG = {
    orders: {
        name: "Quản lý đơn hàng",
        singular: "đơn hàng",
        icon: "bi-bag-check"
    },
    flowers: {
        name: "Sản phẩm hoa",
        singular: "sản phẩm hoa",
        icon: "bi-flower2"
    },
    shops: {
        name: "Quản lý tiệm hoa",
        singular: "tiệm hoa",
        icon: "bi-shop"
    }
};

const STATUSES = [
    "Chưa thực hiện",
    "Đang thực hiện",
    "Đã hoàn thành",
    "Đã hủy"
];

const PLATFORMS = [
    "Facebook",
    "TikTok",
    "Instagram",
    "Zalo",
    "Shopee",
    "Trực tiếp",
    "Khác"
];

const params = new URLSearchParams(location.search);

const requestedType = params.get("type");

const type = TYPES.includes(requestedType)
    ? requestedType
    : "orders";

const page = document.body.dataset.page || "dashboard";

let db = {
    orders: [],
    flowers: [],
    shops: []
};

/* ==========================================
   API MYSQL
   ========================================== */

async function apiRequest(path, options = {}) {
    const response = await fetch(API_BASE + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        let message = "Lỗi HTTP " + response.status;

        try {
            const result = await response.json();
            message =
                result.detail ||
                result.message ||
                result.error ||
                message;
        } catch (error) {
            // Giữ thông báo mặc định
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return {};
    }

    const contentType =
        response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        return {};
    }

    return response.json();
}

async function loadFromMySQL() {
    const result = await apiRequest("/data");

    db = {
        orders: Array.isArray(result.orders)
            ? result.orders
            : [],
        flowers: Array.isArray(result.flowers)
            ? result.flowers
            : [],
        shops: Array.isArray(result.shops)
            ? result.shops
            : []
    };
}

async function saveRecord(recordType, record, editing) {
    const path = editing
        ? `/${recordType}/${record.id}`
        : `/${recordType}`;

    return apiRequest(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(record)
    });
}

async function deleteRecord(recordType, id) {
    return apiRequest(`/${recordType}/${id}`, {
        method: "DELETE"
    });
}

async function completeOrder(id) {
    const order = findItem("orders", id);

    if (!order) {
        alert("Không tìm thấy đơn hàng.");
        return;
    }

    if (isPaid(order)) {
        alert("Đơn hàng đã hoàn thành.");
        return;
    }

    if (order.status === "Đã hủy") {
        alert("Không thể hoàn thành đơn đã hủy.");
        return;
    }

    const amount = Math.max(
        0,
        total(order) - numberValue(order.deposit)
    );

    const confirmed = confirm(
        "XÁC NHẬN HOÀN THÀNH ĐƠN HÀNG\n\n" +
        "Khách hàng: " + order.customer + "\n" +
        "Sản phẩm: " + order.flower + "\n" +
        "Số tiền còn phải nhận: " + money(amount) + "\n\n" +
        "Bạn đã giao hàng và nhận đủ tiền?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`/orders/${id}/complete`, {
            method: "PUT"
        });

        await loadFromMySQL();

        if (page === "list") {
            updateTable();
        } else if (page === "dashboard") {
            renderDashboard();
        }

        alert("Đơn hàng đã hoàn thành!");

    } catch (error) {
        console.error(error);
        alert("Không thể hoàn thành đơn: " + error.message);
    }
}

async function uploadFlowerImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/images", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        let message = "Không thể tải ảnh lên server";

        try {
            const result = await response.json();
            message = result.detail || result.message || message;
        } catch (error) {
            // Giữ thông báo mặc định
        }

        throw new Error(message);
    }

    const result = await response.json();

    if (!result.url) {
        throw new Error("Server không trả về đường dẫn ảnh");
    }

    return result.url;
}

/* ==========================================
   HÀM HỖ TRỢ
   ========================================== */

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function money(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(numberValue(value));
}

function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function dateVN(value) {
    if (!value) return "—";

    const parts = String(value)
        .substring(0, 10)
        .split("-");

    if (parts.length !== 3) {
        return esc(value);
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function normalizeDate(value) {
    return value
        ? String(value).substring(0, 10)
        : "";
}

function normalizeTime(value) {
    if (!value) return "";

    const match = String(value).match(
        /^(\d{1,2}):(\d{2})/
    );

    if (!match) return "";

    return match[1].padStart(2, "0") +
        ":" + match[2];
}

function findItem(itemType, id) {
    return db[itemType].find(
        item => Number(item.id) === Number(id)
    );
}

function shopName(id) {
    const shop = findItem("shops", id);
    return shop ? shop.name : "—";
}

function isPaid(order) {
    return order.paid === true ||
        Number(order.paid) === 1;
}

function total(order) {
    return numberValue(order.quantity) *
        numberValue(order.price);
}

function remaining(order) {
    if (isPaid(order)) {
        return 0;
    }

    return total(order) -
        numberValue(order.deposit);
}

function displayedDeposit(order) {
    return isPaid(order)
        ? 0
        : numberValue(order.deposit);
}

function statusClass(status) {
    if (
        status === "Đã hoàn thành" ||
        status === "Đã giao"
    ) {
        return "done";
    }

    if (status === "Đang thực hiện") {
        return "working";
    }

    if (status === "Đã hủy") {
        return "cancel";
    }

    return "";
}

function statusBadge(status) {
    return `
        <span class="badge ${statusClass(status)}">
            ${esc(status || "Chưa thực hiện")}
        </span>
    `;
}

function safeImageUrl(url) {
    const value = String(url || "");

    if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) {
        return value;
    }

    return "";
}

function imageHTML(src) {
    const url = safeImageUrl(src);

    if (!url) {
        return `
            <div class="thumbnail empty-image">
                <i class="bi bi-flower2"></i>
            </div>
        `;
    }

    return `
        <img
            class="thumbnail"
            src="${esc(url)}"
            alt="Hình ảnh hoa"
            loading="lazy"
        >
    `;
}

function pageHeader(title, subtitle, action = "") {
    return `
        <div class="page-heading">
            <div>
                <h1>${esc(title)}</h1>
                <p class="subtitle">${esc(subtitle)}</p>
            </div>
            ${action}
        </div>
    `;
}

function cardStat(icon, color, label, value, note) {
    return `
        <div class="card">
            <div class="stat-icon ${color}">
                <i class="bi ${icon}"></i>
            </div>

            <div class="stat-label">
                ${label}
            </div>

            <div class="stat-value">
                ${value}
            </div>

            <div class="stat-foot">
                ${note}
            </div>
        </div>
    `;
}

/* ==========================================
   GIAO DIỆN CHUNG
   ========================================== */

function renderLayout() {
    const current = page === "dashboard"
        ? "dashboard"
        : type;

    const navigation = [
        [
            "dashboard",
            "/dashboard.html",
            "bi-grid-1x2",
            "Tổng quan"
        ],
        [
            "orders",
            "/list.html?type=orders",
            "bi-bag-check",
            "Đơn hàng"
        ],
        [
            "flowers",
            "/list.html?type=flowers",
            "bi-flower2",
            "Sản phẩm hoa"
        ],
        [
            "shops",
            "/list.html?type=shops",
            "bi-shop",
            "Tiệm hoa"
        ]
    ];

    const menu = navigation.map(item => `
        <a
            class="nav-link ${current === item[0] ? "active" : ""}"
            href="${item[1]}"
        >
            <i class="bi ${item[2]}"></i>
            ${item[3]}
        </a>
    `).join("");

    const title = page === "dashboard"
        ? "Dashboard"
        : CONFIG[type].name;

    document.getElementById("app").innerHTML = `
        <aside class="sidebar" id="sidebar">
            <div class="logo">
                <span class="logo-icon"> 
                    <i class="bi bi-flower1"></i>
                </span>

                <div>
                    Coppi Admin 
                    <small>Flower Management System</small>
                </div>
            </div>

            <nav class="nav">
                <div class="nav-title">
                    MENU CHÍNH
                </div>

                ${menu}

                <div
                    class="nav-title"
                    style="margin-top:30px;"
                >
                    HỆ THỐNG
                </div>

                <a
                    class="nav-link"
                    href="/database.html"
                >
                    <i class="bi bi-database-gear"></i>
                    Quản trị Database
                </a>
            </nav>

            <div class="sidebar-footer">
                <div class="avatar">CP</div>

                <div>
                    <strong>Administrator</strong>

                    <div style="
                        font-size:11px;
                        color:#9399ad;
                        margin-top:5px;
                    ">
                        Quản trị viên
                    </div>
                </div>
            </div>
        </aside>

        <div class="main">
            <header class="topbar">
                <div class="topbar-left">
                    <button
                        class="mobile-menu"
                        id="menuToggle"
                        type="button"
                    >
                        <i class="bi bi-list"></i>
                    </button>

                    <span style="color:#9399ad;">
                        Trang chủ /
                    </span>

                    <strong>${esc(title)}</strong>
                </div>

                <div class="topbar-right">
                    <i
                        class="bi bi-database-check"
                        title="MySQL"
                    ></i>

                    <div class="avatar">CP</div>
                </div>
            </header>

            <main
                class="content"
                id="content"
            ></main>
        </div>
    `;

    document.getElementById("menuToggle")
        .addEventListener("click", () => {
            document.getElementById("sidebar")
                .classList.toggle("open");
        });
}

/* ==========================================
   DASHBOARD
   ========================================== */

function renderDashboard() {
    const activeOrders = db.orders.filter(
        order => order.status !== "Đã hủy"
    );

    const totalRevenue = activeOrders.reduce(
        (sum, order) => sum + total(order),
        0
    );

    const totalRemaining = activeOrders.reduce(
        (sum, order) =>
            sum + Math.max(0, remaining(order)),
        0
    );

    const pending = db.orders.filter(
        order =>
            !isPaid(order) &&
            order.status === "Chưa thực hiện"
    ).length;

    const done = db.orders.filter(
        order => isPaid(order)
    ).length;

    const working = db.orders.filter(
        order =>
            !isPaid(order) &&
            order.status === "Đang thực hiện"
    ).length;

    const cancelled = db.orders.filter(
        order => order.status === "Đã hủy"
    ).length;

    const count = db.orders.length || 1;

    const year = new Date().getFullYear();

    const monthly = Array(12).fill(0);

    activeOrders.forEach(order => {
        if (!order.date) return;

        const parts = normalizeDate(order.date)
            .split("-")
            .map(Number);

        if (parts.length !== 3) return;

        const [y, m] = parts;

        if (y === year && m >= 1 && m <= 12) {
            monthly[m - 1] += total(order);
        }
    });

    const maxRevenue = Math.max(...monthly, 1);

    const bars = monthly.map((amount, index) => {
        const height = amount > 0
            ? Math.max(3, amount / maxRevenue * 90)
            : 2;

        return `
            <div
                class="bar-item"
                title="${money(amount)}"
            >
                <div
                    class="bar"
                    style="height:${height}%;"
                ></div>

                <span class="bar-label">
                    T${index + 1}
                </span>
            </div>
        `;
    }).join("");

    const progressData = [
        ["Đã hoàn thành", done, "#20b48e"],
        ["Đang thực hiện", working, "#7657df"],
        ["Chưa thực hiện", pending, "#eea64b"],
        ["Đã hủy", cancelled, "#e56e7b"]
    ];

    const progress = progressData.map(item => `
        <div class="status-row">
            <div class="status-top">
                <span>${item[0]}</span>
                <strong>${item[1]}</strong>
            </div>

            <div class="progress">
                <div
                    class="progress-fill"
                    style="
                        width:${item[1] / count * 100}%;
                        background:${item[2]};
                    "
                ></div>
            </div>
        </div>
    `).join("");

    const recent = [...db.orders]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 8);

    const orderRows = recent.map(order => `
        <tr>
            <td>
                <a
                    class="pill-link"
                    href="/form.html?type=orders&id=${order.id}"
                >
                    #DH${String(order.id).padStart(4, "0")}
                </a>
            </td>

            <td>
                <strong>${esc(order.customer)}</strong>
            </td>

            <td>${esc(order.flower)}</td>

            <td>${dateVN(order.date)}</td>

            <td>
                <strong>${money(total(order))}</strong>
            </td>

            <td>
                ${statusBadge(
        isPaid(order)
            ? "Đã hoàn thành"
            : order.status
    )}
            </td>
        </tr>
    `).join("");

    document.getElementById("content").innerHTML = `
        ${pageHeader(
        "Dashboard",
        "Tổng quan hoạt động kinh doanh cửa hàng hoa",
        `
                <a
                    class="btn btn-primary"
                    href="/form.html?type=orders"
                >
                    <i class="bi bi-plus-lg"></i>
                    Tạo đơn hàng
                </a>
            `
    )}

        <div class="stats">
            ${cardStat(
        "bi-bag-check",
        "purple",
        "Tổng đơn hàng",
        db.orders.length,
        "Dữ liệu từ MySQL"
    )}

            ${cardStat(
        "bi-wallet2",
        "green",
        "Tổng giá trị đơn",
        money(totalRevenue),
        "Không tính đơn đã hủy"
    )}

            ${cardStat(
        "bi-check-circle",
        "orange",
        "Đơn đã hoàn thành",
        done,
        "Đã nhận đủ tiền"
    )}

            ${cardStat(
        "bi-cash-coin",
        "red",
        "Còn phải thu",
        money(totalRemaining),
        "Tiền chưa thanh toán"
    )}
        </div>

        <div class="grid-2">
            <div class="card">
                <h3 class="card-title">
                    Giá trị đơn hàng theo tháng (${year})
                </h3>

                <p class="subtitle">
                    Tính theo ngày giao hàng
                </p>

                <div class="chart">
                    ${bars}
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">
                    Tình trạng đơn hàng
                </h3>

                ${progress}
            </div>
        </div>

        <div class="card">
            <div class="page-heading">
                <h3
                    class="card-title"
                    style="margin:0;"
                >
                    Đơn hàng gần đây
                </h3>

                <a
                    class="pill-link"
                    href="/list.html?type=orders"
                >
                    Xem tất cả
                    <i class="bi bi-arrow-right"></i>
                </a>
            </div>

            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>MÃ ĐƠN</th>
                            <th>KHÁCH HÀNG</th>
                            <th>BÓ HOA</th>
                            <th>NGÀY GIAO</th>
                            <th>TỔNG TIỀN</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${orderRows || `
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        Chưa có đơn hàng.
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            © CoppiFlower — Đội ngũ nhà Quỳnh Anh
        </div>
    `;
}

/* ==========================================
   DANH SÁCH
   ========================================== */

function getColumns() {
    if (type === "orders") {
        return `
            <th>MÃ ĐƠN</th>
            <th>HÌNH ẢNH</th>
            <th>KHÁCH HÀNG</th>
            <th>NỀN TẢNG</th>
            <th>SẢN PHẨM</th>
            <th>NGÀY GIAO</th>
            <th>GIỜ GIAO</th>
            <th>TỔNG TIỀN</th>
            <th>ĐÃ CỌC</th>
            <th>CÒN THU</th>
            <th>TÌNH TRẠNG</th>
            <th>THAO TÁC</th>
        `;
    }

    if (type === "flowers") {
        return `
            <th>MÃ HOA</th>
            <th>HÌNH ẢNH</th>
            <th>TÊN SẢN PHẨM</th>
            <th>ĐƠN GIÁ</th>
            <th>TỒN KHO</th>
            <th>TIỆM HOA</th>
            <th>THAO TÁC</th>
        `;
    }

    return `
        <th>MÃ TIỆM</th>
        <th>TÊN TIỆM</th>
        <th>ĐỊA CHỈ</th>
        <th>SỐ ĐIỆN THOẠI</th>
        <th>GHI CHÚ</th>
        <th>THAO TÁC</th>
    `;
}

function actionButtons(item) {
    const isOrder = type === "orders";

    const completed = isOrder && isPaid(item);

    const cancelled =
        isOrder && item.status === "Đã hủy";

    const completeButton = isOrder
        ? `
            <button
                type="button"
                class="icon-btn"
                data-complete="${item.id}"
                title="${completed
            ? "Đã hoàn thành"
            : "Hoàn thành đơn hàng"}"
                style="
                    background:${completed
            ? "#e6f8ef"
            : "#20b486"};
                    color:${completed
            ? "#198754"
            : "#ffffff"};
                    border-radius:8px;
                    opacity:${cancelled ? "0.5" : "1"};
                "
                ${completed || cancelled
            ? "disabled"
            : ""}
            >
                <i class="bi ${
            completed
                ? "bi-check-circle-fill"
                : "bi-check-lg"
        }"></i>
            </button>
        `
        : "";

    return `
        <div class="actions">
            ${completeButton}

            <a
                class="icon-btn"
                title="Chỉnh sửa"
                href="/form.html?type=${type}&id=${item.id}"
            >
                <i class="bi bi-pencil-square"></i>
            </a>

            <button
                type="button"
                class="icon-btn delete"
                title="Xóa"
                data-delete="${item.id}"
            >
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
}

function itemRow(item) {
    if (type === "orders") {
        return `
            <tr>
                <td>
                    <strong>
                        #DH${String(item.id).padStart(4, "0")}
                    </strong>
                </td>

                <td>${imageHTML(item.image)}</td>

                <td>
                    <strong>${esc(item.customer)}</strong>

                    <div style="
                        color:#9399ad;
                        margin-top:5px;
                    ">
                        ${esc(item.phone)}
                    </div>
                </td>

                <td>${esc(item.platform)}</td>

                <td>${esc(item.flower)}</td>

                <td>${dateVN(item.date)}</td>

                <td>${esc(item.time)}</td>

                <td>${money(total(item))}</td>

                <td>${money(displayedDeposit(item))}</td>

                <td>
                    <strong>
                        ${money(remaining(item))}
                    </strong>
                </td>

                <td>
                    ${statusBadge(
            isPaid(item)
                ? "Đã hoàn thành"
                : item.status
        )}
                </td>

                <td>${actionButtons(item)}</td>
            </tr>
        `;
    }

    if (type === "flowers") {
        return `
            <tr>
                <td>
                    <strong>#SP${item.id}</strong>
                </td>

                <td>${imageHTML(item.image)}</td>

                <td>
                    <strong>${esc(item.name)}</strong>
                </td>

                <td>${money(item.price)}</td>

                <td>${esc(item.stock)}</td>

                <td>${esc(shopName(item.shopId))}</td>

                <td>${actionButtons(item)}</td>
            </tr>
        `;
    }

    return `
        <tr>
            <td>
                <strong>#T${item.id}</strong>
            </td>

            <td>
                <strong>${esc(item.name)}</strong>
            </td>

            <td>${esc(item.address)}</td>

            <td>${esc(item.phone)}</td>

            <td>${esc(item.note)}</td>

            <td>${actionButtons(item)}</td>
        </tr>
    `;
}

function renderList() {
    document.getElementById("content").innerHTML = `
        ${pageHeader(
        CONFIG[type].name,
        "Danh sách dữ liệu đang lưu trên MySQL",
        `
                <a
                    class="btn btn-primary"
                    href="/form.html?type=${type}"
                >
                    <i class="bi bi-plus-lg"></i>
                    Thêm mới
                </a>
            `
    )}

        <div class="card">
            <div class="toolbar">
                <input
                    class="input"
                    id="searchInput"
                    style="max-width:340px;"
                    placeholder="Tìm kiếm..."
                    autocomplete="off"
                >

                <span style="color:#9399ad;">
                    Tổng số:
                    <strong id="recordCount">0</strong>
                </span>

                <button
                    class="btn btn-light"
                    type="button"
                    id="refreshButton"
                >
                    <i class="bi bi-arrow-clockwise"></i>
                    Làm mới
                </button>
            </div>

            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            ${getColumns()}
                        </tr>
                    </thead>

                    <tbody id="tableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("searchInput")
        .addEventListener("input", updateTable);

    document.getElementById("tableBody")
        .addEventListener("click", async event => {
            const completeButton = event.target.closest(
                "[data-complete]"
            );

            if (completeButton) {
                completeButton.disabled = true;

                try {
                    await completeOrder(
                        Number(completeButton.dataset.complete)
                    );
                } finally {
                    if (completeButton.isConnected) {
                        completeButton.disabled = false;
                    }
                }

                return;
            }

            const deleteButton = event.target.closest(
                "[data-delete]"
            );

            if (deleteButton) {
                await deleteItem(
                    Number(deleteButton.dataset.delete)
                );
            }
        });

    document.getElementById("refreshButton")
        .addEventListener("click", async () => {
            try {
                await loadFromMySQL();
                updateTable();
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });

    updateTable();
}

function updateTable() {
    const input = document.getElementById("searchInput");

    if (!input) return;

    const keyword = input.value.trim().toLowerCase();

    const results = [...db[type]]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .filter(item => {
            const searchable = Object.entries(item)
                .filter(([key]) => key !== "image")
                .map(([, value]) => String(value ?? ""))
                .join(" ")
                .toLowerCase();

            return searchable.includes(keyword);
        });

    document.getElementById("recordCount").textContent =
        results.length;

    const colSpan = {
        orders: 12,
        flowers: 7,
        shops: 6
    }[type];

    document.getElementById("tableBody").innerHTML =
        results.length
            ? results.map(itemRow).join("")
            : `
                <tr>
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            Không có dữ liệu phù hợp.
                        </div>
                    </td>
                </tr>
            `;
}

async function deleteItem(id) {
    const item = findItem(type, id);

    if (!item) return;

    if (!confirm(
        "Bạn chắc chắn muốn xóa " +
        CONFIG[type].singular +
        " này khỏi MySQL?"
    )) {
        return;
    }

    try {
        await deleteRecord(type, id);
        await loadFromMySQL();
        updateTable();

        alert("Đã xóa thành công!");
    } catch (error) {
        console.error(error);
        alert("Không thể xóa: " + error.message);
    }
}

/* ==========================================
   FORM - CÁC TRƯỜNG NHẬP
   ========================================== */

function field(label, name, value = "", options = {}) {
    const {
        inputType = "text",
        required = false,
        placeholder = "",
        min = "",
        step = "",
        full = false,
        disabled = false
    } = options;

    return `
        <div class="field ${full ? "field-full" : ""}">
            <label>
                ${label}
                ${required
        ? '<span style="color:#e56e7b">*</span>'
        : ""}
            </label>

            <input
                class="input"
                name="${name}"
                type="${inputType}"
                value="${esc(value)}"
                placeholder="${esc(placeholder)}"
                ${required ? "required" : ""}
                ${disabled ? "disabled" : ""}
                ${min !== "" ? `min="${min}"` : ""}
                ${step !== "" ? `step="${step}"` : ""}
            >
        </div>
    `;
}

function textareaField(label, name, value = "") {
    return `
        <div class="field field-full">
            <label>${label}</label>

            <textarea
                class="input"
                name="${name}"
                rows="4"
            >${esc(value)}</textarea>
        </div>
    `;
}

function selectField(
    label,
    name,
    options,
    selected = "",
    disabled = false
) {
    const opts = options.map(option => {
        const value = String(option.value ?? "");
        const text = String(option.text ?? value);

        return `
            <option
                value="${esc(value)}"
                ${String(selected ?? "") === value
            ? "selected"
            : ""}
            >
                ${esc(text)}
            </option>
        `;
    }).join("");

    return `
        <div class="field">
            <label>${label}</label>

            <select
                class="input"
                name="${name}"
                ${disabled ? "disabled" : ""}
            >
                ${opts}
            </select>
        </div>
    `;
}

function section(title, icon, content) {
    return `
        <div class="card section-card">
            <div class="section-title">
                <i class="bi ${icon}"></i>
                ${title}
            </div>

            ${content}
        </div>
    `;
}

function uploadField(image = "") {
    const url = safeImageUrl(image);

    return section(
        "Hình ảnh hoa",
        "bi-image",
        `
            <label class="upload-box">
                <i class="bi bi-cloud-arrow-up"></i>

                <strong>
                    Nhấn để chọn hình ảnh
                </strong>

                <p style="
                    color:#9399ad;
                    margin-bottom:0;
                ">
                    JPG, PNG, WebP — tối đa 5 MB
                </p>

                <input
                    type="file"
                    id="imageInput"
                    accept="image/jpeg,image/png,image/webp"
                >
            </label>

            <div style="text-align:center;">
                <img
                    id="imagePreview"
                    class="preview-image"
                    src="${esc(url)}"
                    alt="Ảnh hoa"
                    style="${url ? "" : "display:none;"}"
                >

                <p
                    id="uploadStatus"
                    style="
                        font-size:12px;
                        color:#9399ad;
                    "
                ></p>
            </div>
        `
    );
}

function shopOptions() {
    return [
        {
            value: "",
            text: "-- Chọn tiệm hoa --"
        },
        ...db.shops.map(shop => ({
            value: String(shop.id),
            text: shop.name
        }))
    ];
}

function flowerOptions() {
    return [
        {
            value: "",
            text: "-- Chọn sản phẩm --"
        },
        ...db.flowers.map(flower => ({
            value: String(flower.id),
            text: flower.name
        }))
    ];
}

/* ==========================================
   FORM ĐƠN HÀNG
   ========================================== */

function renderOrderForm(item) {
    const completed = isPaid(item);

    return `
        ${section(
        "Thông tin khách hàng",
        "bi-person-vcard",
        `<div class="form-grid">
                ${field(
            "Tên người mua",
            "customer",
            item.customer,
            {
                required: true,
                placeholder: "Nhập tên người mua"
            }
        )}

                ${field(
            "Số điện thoại",
            "phone",
            item.phone,
            {
                inputType: "tel",
                placeholder: "09xxxxxxxx"
            }
        )}

                ${selectField(
            "Nền tảng",
            "platform",
            [
                {
                    value: "",
                    text: "-- Chọn nền tảng --"
                },
                ...PLATFORMS.map(p => ({
                    value: p,
                    text: p
                }))
            ],
            item.platform
        )}

                ${selectField(
            "Tiệm hoa",
            "shopId",
            shopOptions(),
            item.shopId
        )}

                ${field(
            "Địa chỉ giao hàng",
            "address",
            item.address,
            {
                full: true,
                placeholder: "Nhập địa chỉ giao hoa"
            }
        )}
            </div>`
    )}

        ${section(
        "Thông tin sản phẩm",
        "bi-flower2",
        `<div class="form-grid">
                ${selectField(
            "Chọn sản phẩm có sẵn",
            "flowerId",
            flowerOptions(),
            item.flowerId
        )}

                ${field(
            "Tên bó hoa",
            "flower",
            item.flower,
            {
                required: true,
                placeholder: "Nhập tên bó hoa"
            }
        )}

                ${field(
            "Số lượng",
            "quantity",
            item.quantity ?? 1,
            {
                inputType: "number",
                required: true,
                min: 1,
                step: 1
            }
        )}

                ${field(
            "Đơn giá (VNĐ)",
            "price",
            item.price ?? 0,
            {
                inputType: "number",
                required: true,
                min: 0
            }
        )}

                ${selectField(
            "Tình trạng bó hoa",
            "status",
            STATUSES.map(s => ({
                value: s,
                text: s
            })),
            completed
                ? "Đã hoàn thành"
                : item.status || "Chưa thực hiện",
            completed
        )}
            </div>`
    )}

        ${section(
        "Thông tin giao hàng",
        "bi-truck",
        `<div class="form-grid">
                ${field(
            "Ngày giao",
            "date",
            normalizeDate(item.date),
            {
                inputType: "date"
            }
        )}

                ${field(
            "Giờ giao",
            "time",
            normalizeTime(item.time),
            {
                inputType: "time"
            }
        )}

                ${textareaField(
            "Ghi chú thiệp",
            "cardNote",
            item.cardNote
        )}
            </div>`
    )}

        ${uploadField(item.image)}

        ${section(
        "Thông tin thanh toán",
        "bi-wallet2",
        `<div class="form-grid">
                ${field(
            "Tiền đã cọc (VNĐ)",
            "deposit",
            item.deposit ?? 0,
            {
                inputType: "number",
                min: 0,
                disabled: completed
            }
        )}
            </div>

            ${completed ? `
                <p style="
                    color:#198754;
                    font-weight:600;
                    margin-top:12px;
                ">
                    <i class="bi bi-check-circle-fill"></i>
                    Đơn hàng đã hoàn thành.
                </p>
            ` : ""}

            <div class="summary-box">
                <div class="summary-line">
                    <span>Tổng tiền</span>
                    <strong id="totalText">0đ</strong>
                </div>

                <div class="summary-line">
                    <span>Đã cọc</span>
                    <strong id="depositText">0đ</strong>
                </div>

                <div class="summary-line total">
                    <span>Còn phải thu</span>
                    <strong id="remainingText">0đ</strong>
                </div>
            </div>`
    )}
    `;
}

/* ==========================================
   FORM SẢN PHẨM HOA
   ========================================== */

function renderFlowerForm(item) {
    return `
        ${section(
        "Thông tin sản phẩm hoa",
        "bi-flower2",
        `<div class="form-grid">
                ${field(
            "Tên sản phẩm",
            "name",
            item.name,
            {
                required: true,
                placeholder: "Bó hoa hồng pastel"
            }
        )}

                ${selectField(
            "Tiệm hoa",
            "shopId",
            shopOptions(),
            item.shopId
        )}

                ${field(
            "Đơn giá (VNĐ)",
            "price",
            item.price ?? 0,
            {
                inputType: "number",
                required: true,
                min: 0
            }
        )}

                ${field(
            "Số lượng tồn kho",
            "stock",
            item.stock ?? 0,
            {
                inputType: "number",
                required: true,
                min: 0,
                step: 1
            }
        )}

                ${textareaField(
            "Mô tả sản phẩm",
            "description",
            item.description
        )}
            </div>`
    )}

        ${uploadField(item.image)}
    `;
}

/* ==========================================
   FORM TIỆM HOA
   ========================================== */

function renderShopForm(item) {
    return section(
        "Thông tin tiệm hoa",
        "bi-shop",
        `<div class="form-grid">
            ${field(
            "Tên tiệm hoa",
            "name",
            item.name,
            {
                required: true,
                placeholder: "Tên cửa hàng"
            }
        )}

            ${field(
            "Số điện thoại",
            "phone",
            item.phone,
            {
                inputType: "tel"
            }
        )}

            ${field(
            "Địa chỉ tiệm",
            "address",
            item.address,
            {
                full: true
            }
        )}

            ${textareaField(
            "Ghi chú",
            "note",
            item.note
        )}
        </div>`
    );
}

/* ==========================================
   HIỂN THỊ FORM
   ========================================== */

function renderForm() {
    const id = Number(params.get("id"));

    const existing = id
        ? findItem(type, id)
        : null;

    if (id && !existing) {
        document.getElementById("content").innerHTML = `
            <div class="card">
                <h3>Không tìm thấy dữ liệu</h3>

                <a
                    class="btn btn-light"
                    href="/list.html?type=${type}"
                >
                    Quay lại danh sách
                </a>
            </div>
        `;

        return;
    }

    const item = existing || {};
    const editing = Boolean(existing);

    const title = editing
        ? "Chỉnh sửa " + CONFIG[type].singular
        : "Thêm " + CONFIG[type].singular;

    let formHTML = "";

    if (type === "orders") {
        formHTML = renderOrderForm(item);
    } else if (type === "flowers") {
        formHTML = renderFlowerForm(item);
    } else {
        formHTML = renderShopForm(item);
    }

    document.getElementById("content").innerHTML = `
        ${pageHeader(
        title,
        "Thông tin được lưu trực tiếp vào MySQL",
        `
                <a
                    class="btn btn-light"
                    href="/list.html?type=${type}"
                >
                    <i class="bi bi-arrow-left"></i>
                    Quay lại
                </a>
            `
    )}

        <form id="entryForm">
            ${formHTML}

            <div class="card">
                <div class="form-actions">
                    <a
                        class="btn btn-light"
                        href="/list.html?type=${type}"
                    >
                        Hủy bỏ
                    </a>

                    <button
                        class="btn btn-primary"
                        type="submit"
                        id="saveButton"
                    >
                        <i class="bi bi-check-lg"></i>

                        ${editing
        ? "Lưu thay đổi"
        : "Thêm mới"}
                    </button>
                </div>
            </div>
        </form>
    `;

    initializeForm(item, editing);
}

/* ==========================================
   XỬ LÝ FORM
   ========================================== */

function initializeForm(item, editing) {
    const form = document.getElementById("entryForm");

    const fileInput = document.getElementById("imageInput");

    let imageData = item.image || "";
    let selectedFile = null;

    const completedOrder =
        type === "orders" && isPaid(item);

    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];

            if (!file) {
                selectedFile = null;
                return;
            }

            const allowed = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!allowed.includes(file.type)) {
                alert("Chỉ hỗ trợ JPG, PNG, WebP.");
                fileInput.value = "";
                selectedFile = null;
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert("Ảnh không được vượt quá 5 MB.");
                fileInput.value = "";
                selectedFile = null;
                return;
            }

            selectedFile = file;

            const preview = document.getElementById(
                "imagePreview"
            );

            const previous = preview.dataset.objectUrl;

            if (previous) {
                URL.revokeObjectURL(previous);
            }

            const url = URL.createObjectURL(file);

            preview.dataset.objectUrl = url;
            preview.src = url;
            preview.style.display = "inline-block";

            const status = document.getElementById(
                "uploadStatus"
            );

            if (status) {
                status.textContent =
                    "Ảnh sẽ được tải lên khi nhấn Lưu.";
            }
        });
    }

    if (type === "orders") {
        const flowerSelect = form.elements.namedItem(
            "flowerId"
        );

        flowerSelect.addEventListener("change", () => {
            const flower = findItem(
                "flowers",
                flowerSelect.value
            );

            if (!flower) return;

            form.elements.namedItem("flower").value =
                flower.name;

            form.elements.namedItem("price").value =
                flower.price;

            if (flower.shopId) {
                form.elements.namedItem("shopId").value =
                    flower.shopId;
            }

            if (flower.image && !selectedFile) {
                imageData = flower.image;

                const preview = document.getElementById(
                    "imagePreview"
                );

                preview.src = safeImageUrl(flower.image);
                preview.style.display = "inline-block";
            }

            calculateTotal(form, completedOrder);
        });

        ["quantity", "price", "deposit"].forEach(name => {
            const element = form.elements.namedItem(name);

            if (element) {
                element.addEventListener("input", () => {
                    calculateTotal(form, completedOrder);
                });
            }
        });

        calculateTotal(form, completedOrder);
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const read = name => {
            const element = form.elements.namedItem(name);
            return element ? element.value.trim() : "";
        };

        const number = name => numberValue(read(name));

        let record = { ...item };

        if (type === "orders") {
            record = {
                ...record,

                customer: read("customer"),
                phone: read("phone"),
                platform: read("platform"),
                shopId: read("shopId"),
                address: read("address"),

                flowerId: read("flowerId"),
                flower: read("flower"),

                quantity: number("quantity"),
                price: number("price"),

                deposit: completedOrder
                    ? numberValue(item.deposit)
                    : number("deposit"),

                status: completedOrder
                    ? "Đã hoàn thành"
                    : read("status"),

                date: read("date"),
                time: read("time"),

                cardNote: read("cardNote"),
                image: imageData
            };

            if (
                record.quantity < 1 ||
                !Number.isInteger(record.quantity)
            ) {
                alert("Số lượng phải là số nguyên lớn hơn 0.");
                return;
            }

            if (record.price < 0 || record.deposit < 0) {
                alert("Số tiền không được âm.");
                return;
            }

            if (record.deposit > total(record)) {
                alert(
                    "Tiền cọc không được lớn hơn tổng tiền."
                );
                return;
            }
        }

        if (type === "flowers") {
            record = {
                ...record,

                name: read("name"),
                shopId: read("shopId"),

                price: number("price"),
                stock: number("stock"),

                description: read("description"),
                image: imageData
            };

            if (
                record.price < 0 ||
                record.stock < 0 ||
                !Number.isInteger(record.stock)
            ) {
                alert("Giá hoặc tồn kho không hợp lệ.");
                return;
            }
        }

        if (type === "shops") {
            record = {
                ...record,

                name: read("name"),
                phone: read("phone"),
                address: read("address"),
                note: read("note")
            };
        }

        const saveButton = document.getElementById(
            "saveButton"
        );

        saveButton.disabled = true;
        saveButton.textContent = "Đang lưu...";

        try {
            if (selectedFile) {
                saveButton.textContent = "Đang tải ảnh...";

                record.image = await uploadFlowerImage(
                    selectedFile
                );
            }

            await saveRecord(type, record, editing);

            alert("Đã lưu thành công vào MySQL!");

            location.href = "/list.html?type=" + type;

        } catch (error) {
            console.error(error);

            alert(
                "Không thể lưu dữ liệu:\n" +
                error.message
            );

            saveButton.disabled = false;
            saveButton.textContent = "Lưu lại";
        }
    });
}

/* ==========================================
   TÍNH TIỀN
   ========================================== */

function calculateTotal(form, completed = false) {
    const get = name => {
        const element = form.elements.namedItem(name);

        return element
            ? numberValue(element.value)
            : 0;
    };

    const subtotal = get("quantity") * get("price");

    const deposit = completed
        ? 0
        : get("deposit");

    const remain = completed
        ? 0
        : subtotal - deposit;

    document.getElementById("totalText").textContent =
        money(subtotal);

    document.getElementById("depositText").textContent =
        money(deposit);

    document.getElementById("remainingText").textContent =
        money(remain);
}

/* ==========================================
   KHỞI ĐỘNG
   ========================================== */

document.addEventListener("DOMContentLoaded", async () => {
    renderLayout();

    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="card">
            <div style="
                text-align:center;
                padding:35px;
            ">
                <i
                    class="bi bi-database"
                    style="
                        font-size:32px;
                        color:#7657df;
                    "
                ></i>

                <p style="margin-top:15px;">
                    Đang tải dữ liệu từ MySQL...
                </p>
            </div>
        </div>
    `;

    try {
        await loadFromMySQL();

        if (page === "dashboard") {
            renderDashboard();
        } else if (page === "list") {
            renderList();
        } else if (page === "form") {
            renderForm();
        }

        console.log(
            "FlowerAdmin kết nối MySQL thành công."
        );

    } catch (error) {
        console.error(error);

        content.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="bi bi-exclamation-triangle"></i>

                    <h3>Không thể tải dữ liệu MySQL</h3>

                    <p>${esc(error.message)}</p>

                    <button
                        class="btn btn-primary"
                        type="button"
                        onclick="location.reload()"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        `;
    }
});
