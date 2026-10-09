
"use strict";

// ==========================================
// FLOWERADMIN - DATABASE ADMIN
// Dữ liệu lấy trực tiếp từ Spring Boot/MySQL
// ==========================================

const API = "/api";

const DATA_TYPES = ["orders", "flowers", "shops"];

const LABELS = {
    orders: {
        id: "Mã đơn",
        customer: "Tên khách hàng",
        platform: "Nền tảng",
        address: "Địa chỉ giao hàng",
        phone: "Số điện thoại",
        time: "Giờ giao",
        date: "Ngày giao",
        flower: "Tên bó hoa",
        quantity: "Số lượng",
        price: "Đơn giá",
        deposit: "Đã cọc",
        remaining: "Còn phải thu",
        cardNote: "Ghi chú thiệp",
        status: "Tình trạng bó hoa",
        image: "Ảnh hoa",
        shopId: "Mã tiệm",
        flowerId: "Mã sản phẩm"
    },

    flowers: {
        id: "Mã sản phẩm",
        name: "Tên sản phẩm",
        price: "Đơn giá",
        stock: "Tồn kho",
        image: "Hình ảnh",
        description: "Mô tả",
        shopId: "Mã tiệm"
    },

    shops: {
        id: "Mã tiệm",
        name: "Tên tiệm",
        address: "Địa chỉ",
        phone: "Số điện thoại",
        note: "Ghi chú"
    }
};

const STATUSES = [
    "Chưa thực hiện",
    "Đang thực hiện",
    "Đã hoàn thành",
    "Đã giao",
    "Đã hủy",
    "Chưa chuẩn bị"
];

let currentType = "orders";

let database = {
    orders: [],
    flowers: [],
    shops: []
};

const $ = id => document.getElementById(id);

// ==========================================
// API
// ==========================================

async function request(path, options = {}) {
    const response = await fetch(API + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        let message = `Lỗi HTTP ${response.status}`;

        try {
            const result = await response.json();

            message =
                result.detail ||
                result.message ||
                result.error ||
                message;
        } catch (e) {
            // Không có nội dung JSON
        }

        throw new Error(message);
    }

    if (response.status === 204) return {};

    return response.json();
}

async function loadDatabase() {
    const data = await request("/data");

    database = {
        orders: data.orders || [],
        flowers: data.flowers || [],
        shops: data.shops || []
    };

    $("orderCount").textContent = database.orders.length;
    $("flowerCount").textContent = database.flowers.length;
    $("shopCount").textContent = database.shops.length;

    $("connectionStatus").classList.remove("error");
    $("connectionStatus").textContent =
        "● MySQL đã kết nối — database: floweradmin";

    renderTable();
}

// ==========================================
// CÔNG CỤ ĐỊNH DẠNG
// ==========================================

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
    }).format(Number(value) || 0);
}

function dateVN(value) {
    if (!value) return "—";

    const str = String(value).substring(0, 10);
    const parts = str.split("-");

    if (parts.length !== 3) return esc(str);

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function findRecord(type, id) {
    return database[type].find(
        item => Number(item.id) === Number(id)
    );
}

function buttonHTML(record) {
    const id = Number(record.id);

    return `
        <div class="db-actions">
            <button class="db-button"
                    data-action="view"
                    data-id="${id}">
                <i class="bi bi-eye"></i>
                Xem
            </button>

            <a class="db-button"
               href="/form.html?type=${currentType}&id=${id}">
                <i class="bi bi-pencil-square"></i>
                Sửa
            </a>

            <button class="db-button danger"
                    data-action="delete"
                    data-id="${id}">
                <i class="bi bi-trash"></i>
                Xóa
            </button>
        </div>
    `;
}

// ==========================================
// CẤU HÌNH BẢNG
// ==========================================

function getColumns() {
    if (currentType === "orders") {
        return [
            "Mã đơn",
            "Khách hàng",
            "Số điện thoại",
            "Bó hoa",
            "Ngày giao",
            "Tổng tiền",
            "Còn thu",
            "Trạng thái",
            "Thao tác"
        ];
    }

    if (currentType === "flowers") {
        return [
            "Mã hoa",
            "Tên sản phẩm",
            "Đơn giá",
            "Tồn kho",
            "Mã tiệm",
            "Thao tác"
        ];
    }

    return [
        "Mã tiệm",
        "Tên tiệm",
        "Địa chỉ",
        "Số điện thoại",
        "Thao tác"
    ];
}

function getRow(record) {

    if (currentType === "orders") {

        const sum =
            Number(record.quantity || 0) *
            Number(record.price || 0);

        const balance =
            record.remaining != null
                ? Number(record.remaining)
                : sum - Number(record.deposit || 0);

        const statuses = [...new Set([
            ...STATUSES,
            record.status
        ].filter(Boolean))];

        const statusOptions = statuses.map(status => `
            <option value="${esc(status)}"
                ${status === record.status
            ? "selected"
            : ""}>
                ${esc(status)}
            </option>
        `).join("");

        return `
            <tr>
                <td><strong>#DH${record.id}</strong></td>
                <td>${esc(record.customer)}</td>
                <td>${esc(record.phone)}</td>
                <td>${esc(record.flower)}</td>
                <td>${dateVN(record.date)}</td>
                <td>${money(sum)}</td>
                <td><strong>${money(balance)}</strong></td>

                <td>
                    <select class="db-status-select"
                            data-status-id="${record.id}"
                            aria-label="Trạng thái đơn hàng">
                        ${statusOptions}
                    </select>
                </td>

                <td>${buttonHTML(record)}</td>
            </tr>
        `;
    }

    if (currentType === "flowers") {
        return `
            <tr>
                <td><strong>#SP${record.id}</strong></td>
                <td>${esc(record.name)}</td>
                <td>${money(record.price)}</td>
                <td>${esc(record.stock)}</td>
                <td>${esc(record.shopId ?? "—")}</td>
                <td>${buttonHTML(record)}</td>
            </tr>
        `;
    }

    return `
        <tr>
            <td><strong>#T${record.id}</strong></td>
            <td>${esc(record.name)}</td>
            <td>${esc(record.address)}</td>
            <td>${esc(record.phone)}</td>
            <td>${buttonHTML(record)}</td>
        </tr>
    `;
}

// ==========================================
// HIỂN THỊ BẢNG
// ==========================================

function renderTable() {
    const keyword = $("dbSearch")
        .value.trim().toLocaleLowerCase("vi-VN");

    const records = database[currentType]
        .filter(record => {
            const searchable = Object.entries(record)
                .filter(([key]) => key !== "image")
                .map(([, value]) => String(value ?? ""))
                .join(" ")
                .toLocaleLowerCase("vi-VN");

            return searchable.includes(keyword);
        })
        .sort((a, b) => Number(b.id) - Number(a.id));

    $("dbTableHead").innerHTML = `
        <tr>
            ${getColumns().map(
        column => `<th>${esc(column)}</th>`
    ).join("")}
        </tr>
    `;

    $("dbTableBody").innerHTML = records.length
        ? records.map(getRow).join("")
        : `
            <tr>
                <td class="db-empty"
                    colspan="${getColumns().length}">
                    Không tìm thấy bản ghi.
                </td>
            </tr>
        `;

    $("resultInfo").textContent =
        `Hiển thị ${records.length} / ` +
        `${database[currentType].length} bản ghi.`;
}

// ==========================================
// XEM CHI TIẾT MỘT BẢN GHI
// ==========================================

function viewRecord(id) {
    const record = findRecord(currentType, id);

    if (!record) {
        alert("Không tìm thấy bản ghi");
        return;
    }

    const fields = LABELS[currentType];

    const detail = Object.entries(fields).map(
        ([key, label]) => {

            let value = record[key];

            if (key === "price" ||
                key === "deposit" ||
                key === "remaining") {
                value = money(value);
            }

            if (key === "date") {
                value = dateVN(value);
            }

            if (key === "image") {
                const path = String(record.image ?? "");

                const safePath =
                    /^\/uploads\/[a-zA-Z0-9._-]+$/.test(path)
                        ? path
                        : "";

                return `
                    <div class="db-detail-item">
                        <small>${esc(label)}</small>

                        <strong>${esc(path || "Không có ảnh")}</strong>

                        ${safePath ? `
                            <div>
                                <img class="db-detail-img"
                                     src="${esc(safePath)}"
                                     alt="Hình ảnh hoa">
                            </div>
                        ` : ""}
                    </div>
                `;
            }

            return `
                <div class="db-detail-item">
                    <small>${esc(label)}</small>
                    <strong>${esc(value ?? "—")}</strong>
                </div>
            `;
        }
    ).join("");

    $("modalTitle").textContent =
        `Chi tiết bản ghi #${record.id}`;

    $("detailContent").innerHTML = `
        <div class="db-detail">${detail}</div>
    `;

    $("detailEdit").href =
        `/form.html?type=${currentType}&id=${record.id}`;

    $("detailModal").hidden = false;
}

// ==========================================
// SỬA NHANH TRẠNG THÁI ĐƠN HÀNG
// ==========================================

async function changeOrderStatus(id, newStatus, select) {
    const record = findRecord("orders", id);

    if (!record) return;

    const oldStatus = record.status;

    select.disabled = true;

    try {
        // Gửi đầy đủ dữ liệu vì API PUT cập nhật cả bản ghi
        await request(`/orders/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                ...record,
                status: newStatus
            })
        });

        await loadDatabase();

    } catch (error) {
        alert("Không thể cập nhật: " + error.message);
        select.value = oldStatus;
    } finally {
        select.disabled = false;
    }
}

// ==========================================
// XÓA BẢN GHI
// ==========================================

async function removeRecord(id) {
    const record = findRecord(currentType, id);

    if (!record) return;

    const name =
        record.customer ||
        record.name ||
        `#${record.id}`;

    if (!confirm(
        `Bạn chắc chắn muốn xóa "${name}" khỏi MySQL?\n` +
        "Thao tác này không thể hoàn tác."
    )) {
        return;
    }

    try {
        await request(`/${currentType}/${id}`, {
            method: "DELETE"
        });

        await loadDatabase();

        alert("Đã xóa bản ghi thành công.");
    } catch (error) {
        alert(
            "Không thể xóa bản ghi: " +
            error.message
        );
    }
}

// ==========================================
// KHỞI TẠO SỰ KIỆN
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    document.querySelectorAll(".db-tab").forEach(
        button => {
            button.addEventListener("click", () => {
                currentType = button.dataset.type;

                document.querySelectorAll(".db-tab")
                    .forEach(tab =>
                        tab.classList.toggle(
                            "active",
                            tab === button
                        )
                    );

                $("dbSearch").value = "";

                $("addRecord").href =
                    `/form.html?type=${currentType}`;

                renderTable();
            });
        }
    );

    $("dbSearch").addEventListener("input", renderTable);

    $("refreshData").addEventListener("click", async () => {
        try {
            await loadDatabase();
        } catch (error) {
            alert(error.message);
        }
    });

    $("dbTableBody").addEventListener("click", async event => {

        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button) return;

        const id = Number(button.dataset.id);

        if (button.dataset.action === "view") {
            viewRecord(id);
        }

        if (button.dataset.action === "delete") {
            await removeRecord(id);
        }
    });

    $("dbTableBody").addEventListener("change", async event => {

        const select = event.target.closest(
            "select[data-status-id]"
        );

        if (!select) return;

        await changeOrderStatus(
            Number(select.dataset.statusId),
            select.value,
            select
        );
    });

    $("closeModal").addEventListener("click", () => {
        $("detailModal").hidden = true;
    });

    $("detailModal").addEventListener("click", event => {
        if (event.target === $("detailModal")) {
            $("detailModal").hidden = true;
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            $("detailModal").hidden = true;
        }
    });

    try {
        await loadDatabase();
    } catch (error) {
        $("connectionStatus").classList.add("error");
        $("connectionStatus").textContent =
            "Không thể tải MySQL: " + error.message;

        console.error(error);
    }
});
