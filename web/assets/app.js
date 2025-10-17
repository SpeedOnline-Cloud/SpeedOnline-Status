// SpeedOnline Monitoring Dashboard
// Author: chaoweilangmao
let currentSort = { column: 'name', direction: 'asc' };
let currentRegion = 'all';
let currentSearch = '';
let currentData = [];
let hasDataFetchError = false;
let fetchErrorMessage = '';
let currentPage = 1;
let pageSize = 20;

const regionButtons = [];

function classForMeter(value) {
    if (value > 80) return 'danger';
    if (value > 60) return 'warning';
    return 'success';
}

function formatPercentage(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '--';
    }
    return `${value.toFixed(1)}%`;
}

function updateStatusAlert(offlineCount) {
    const statusAlert = document.getElementById('statusAlert');
    if (!statusAlert) {
        return;
    }

    if (hasDataFetchError) {
        statusAlert.className = 'alert alert-danger';
        statusAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${fetchErrorMessage}</span>`;
        return;
    }

    if (offlineCount > 0) {
        statusAlert.className = 'alert alert-warning';
        statusAlert.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${offlineCount} 个节点离线</span>`;
    } else {
        statusAlert.className = 'alert alert-success';
        statusAlert.innerHTML = '<i class="fas fa-check-circle"></i><span>所有节点均正常运行</span>';
    }
}

function showDataFetchError(message) {
    hasDataFetchError = true;
    fetchErrorMessage = message;
    currentData = [];

    document.getElementById('totalServers').textContent = '--';
    document.getElementById('onlineServers').textContent = '--';
    document.getElementById('offlineServers').textContent = '--';
    document.getElementById('avgCpuUsage').textContent = '--';
    document.getElementById('avgMemoryUsage').textContent = '--';
    document.getElementById('avgDiskUsage').textContent = '--';
    document.getElementById('totalCount').textContent = '0';

    const tbody = document.getElementById('serverTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">${message}</td></tr>`;

    document.getElementById('paginationControls').innerHTML = '';

    updateStatusAlert(0);
}

function clearDataFetchError() {
    if (!hasDataFetchError) {
        return;
    }
    hasDataFetchError = false;
    fetchErrorMessage = '';
}

function updateStats(servers) {
    const totalServers = servers.length;
    const onlineServers = servers.filter((server) => server.status === 'online').length;
    const offlineServers = totalServers - onlineServers;
    const avgCpu = totalServers
        ? servers.reduce((acc, server) => acc + (Number.isFinite(server.cpu) ? server.cpu : 0), 0) / totalServers
        : 0;
    const avgMemory = totalServers
        ? servers.reduce((acc, server) => acc + (Number.isFinite(server.memory) ? server.memory : 0), 0) / totalServers
        : 0;
    const avgDisk = totalServers
        ? servers.reduce((acc, server) => acc + (Number.isFinite(server.disk) ? server.disk : 0), 0) / totalServers
        : 0;

    document.getElementById('totalServers').textContent = totalServers;
    document.getElementById('onlineServers').textContent = onlineServers;
    document.getElementById('offlineServers').textContent = offlineServers;
    document.getElementById('avgCpuUsage').textContent = totalServers ? `${avgCpu.toFixed(1)}%` : '--';
    document.getElementById('avgMemoryUsage').textContent = totalServers ? `${avgMemory.toFixed(1)}%` : '--';
    document.getElementById('avgDiskUsage').textContent = totalServers ? `${avgDisk.toFixed(1)}%` : '--';

    updateStatusAlert(offlineServers);
}

function renderTableRows(rows) {
    const tbody = document.getElementById('serverTableBody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">没有符合条件的节点</td></tr>';
        return;
    }

    const html = rows.map((server) => {
        const cpu = Number.isFinite(server.cpu) ? server.cpu : 0;
        const memory = Number.isFinite(server.memory) ? server.memory : 0;
        const disk = Number.isFinite(server.disk) ? server.disk : 0;

        return `
            <tr>
                <td>
                    <div class="server-name">${server.name || '--'}</div>
                </td>
                <td>
                    <div class="meter">
                        <div class="meter-label">
                            <span class="meter-title"><i class="fas fa-microchip"></i><span>CPU</span></span>
                            <span class="meter-value">${formatPercentage(cpu)}</span>
                        </div>
                        <div class="meter-bar">
                            <div class="meter-fill ${classForMeter(cpu)}" style="width: ${Math.min(Math.max(cpu, 0), 100)}%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="meter">
                        <div class="meter-label">
                            <span class="meter-title"><i class="fas fa-memory"></i><span>内存</span></span>
                            <span class="meter-value">${formatPercentage(memory)}</span>
                        </div>
                        <div class="meter-bar">
                            <div class="meter-fill ${classForMeter(memory)}" style="width: ${Math.min(Math.max(memory, 0), 100)}%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="meter">
                        <div class="meter-label">
                            <span class="meter-title"><i class="fas fa-hdd"></i><span>磁盘</span></span>
                            <span class="meter-value">${formatPercentage(disk)}</span>
                        </div>
                        <div class="meter-bar">
                            <div class="meter-fill ${classForMeter(disk)}" style="width: ${Math.min(Math.max(disk, 0), 100)}%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-pill ${server.status === 'online' ? 'online' : 'offline'}">
                        <span class="dot"></span>
                        ${server.status === 'online' ? '在线' : '离线'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach((th) => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === currentSort.column) {
            th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function updatePaginationControls(totalPages) {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

    if (totalPages <= 1) {
        return;
    }

    const createButton = (label, className, disabled = false, onClick = null) => {
        const button = document.createElement('button');
        button.className = `page-btn ${className || ''}`.trim();
        button.innerHTML = label;
        if (disabled) {
            button.classList.add('disabled');
            button.disabled = true;
        }
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    };

    const prevButton = createButton('<i class="fas fa-chevron-left"></i>', 'prev-btn', currentPage === 1, () => {
        if (currentPage > 1) {
            currentPage -= 1;
            updateServerTable(currentData);
        }
    });

    paginationControls.appendChild(prevButton);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
        const pageButton = createButton(i, i === currentPage ? 'active' : '', false, () => {
            currentPage = i;
            updateServerTable(currentData);
        });

        paginationControls.appendChild(pageButton);
    }

    const nextButton = createButton('<i class="fas fa-chevron-right"></i>', 'next-btn', currentPage === totalPages, () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            updateServerTable(currentData);
        }
    });

    paginationControls.appendChild(nextButton);
}

function filterAndSortData(servers) {
    let filtered = [...servers];

    if (currentRegion !== 'all') {
        filtered = filtered.filter((server) => typeof server.name === 'string' && server.name.includes(currentRegion));
    }

    if (currentSearch.trim()) {
        const query = currentSearch.trim().toLowerCase();
        filtered = filtered.filter((server) => typeof server.name === 'string' && server.name.toLowerCase().includes(query));
    }

    filtered.sort((a, b) => {
        let aVal;
        let bVal;

        switch (currentSort.column) {
            case 'name':
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
                break;
            case 'cpu':
                aVal = a.cpu || 0;
                bVal = b.cpu || 0;
                break;
            case 'memory':
                aVal = a.memory || 0;
                bVal = b.memory || 0;
                break;
            case 'disk':
                aVal = a.disk || 0;
                bVal = b.disk || 0;
                break;
            case 'status':
                aVal = a.status || '';
                bVal = b.status || '';
                break;
            default:
                aVal = 0;
                bVal = 0;
                break;
        }

        if (aVal < bVal) {
            return currentSort.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
            return currentSort.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return filtered;
}

function updateServerTable(servers) {
    currentData = Array.isArray(servers) ? servers : [];

    const filteredData = filterAndSortData(currentData);

    const totalItems = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageData = filteredData.slice(startIndex, startIndex + pageSize);

    renderTableRows(pageData);
    document.getElementById('totalCount').textContent = totalItems;
    updatePaginationControls(Math.ceil(totalItems / pageSize));
    updateSortIndicators();
    updateStats(currentData);
}

function setActiveRegionButton(activeButton) {
    regionButtons.forEach((btn) => {
        if (btn === activeButton) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

async function fetchData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const servers = await response.json();

        clearDataFetchError();
        currentPage = 1;
        updateServerTable(servers);
    } catch (error) {
        console.error('获取服务器数据失败:', error);
        showDataFetchError('无法加载服务器数据，请通过 HTTP 服务访问页面（例如：python -m http.server）。');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-region]').forEach((button) => {
        regionButtons.push(button);
        button.addEventListener('click', () => {
            currentRegion = button.getAttribute('data-region') || 'all';
            currentPage = 1;
            setActiveRegionButton(button);
            updateServerTable(currentData);
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            currentSearch = event.target.value || '';
            currentPage = 1;
            updateServerTable(currentData);
        });
    }

    const pageSizeSelector = document.querySelector('.page-size-selector');
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener('change', (event) => {
            const next = parseInt(event.target.value, 10);
            pageSize = Number.isFinite(next) && next > 0 ? next : pageSize;
            currentPage = 1;
            updateServerTable(currentData);
        });
    }

    document.querySelectorAll('th.sortable').forEach((th) => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            if (column === currentSort.column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            currentPage = 1;
            updateServerTable(currentData);
        });
    });

    fetchData();
    setInterval(() => fetchData(), 30000);
});
