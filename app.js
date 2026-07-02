// API configurations
const scriptUrl = "https://script.google.com/macros/s/AKfycbxWx6ISmjjFACmRkgvND44xsDXzvSRjYnwHBLrRWPPOMwQs5Rrp7BW5ienZWpxYnV3M/exec";
let allData = {};
let currentSheet = "";

// Initialize application on window load
window.onload = () => {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';

    fetch(scriptUrl)
        .then(res => res.json())
        .then(data => {
            initializeWithData(data);
        })
        .catch(err => {
            console.warn("Could not fetch remote data, trying local sample_data.json:", err);
            // Optional local fallback for development purposes
            fetch('sample_data.json')
                .then(res => res.json())
                .then(localData => {
                    initializeWithData(localData);
                })
                .catch(localErr => {
                    console.error("Local data load failed as well:", localErr);
                    loader.innerHTML = `<span class="text-red-600 font-bold text-base">حدث خطأ في جلب البيانات من الخادم والمحلي.</span>`;
                });
        });
};

/**
 * Initializes the application with fetched/loaded data.
 * @param {Object} data - The sheet data grouped by sheet names.
 */
function initializeWithData(data) {
    allData = data;
    const sheets = Object.keys(data);
    const loader = document.getElementById('loader');
    
    if (sheets.length > 0) {
        currentSheet = sheets[0];
        renderTabs(sheets);
        renderTable();
        loader.style.display = 'none';
        document.getElementById('data-container').classList.remove('hidden');
    } else {
        loader.innerHTML = `<span class="text-slate-500 font-bold text-base">لا توجد أوراق عمل (Sheets) متاحة في ملف البيانات.</span>`;
    }
}

/**
 * Renders tab navigation buttons dynamically.
 * @param {Array<string>} sheets - Array of sheet names.
 */
function renderTabs(sheets) {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    sheets.forEach(sheet => {
        const btn = document.createElement('button');
        btn.innerText = sheet;
        const isActive = sheet === currentSheet;
        
        btn.className = `px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
            isActive 
            ? 'bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-800/10' 
            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-600 hover:text-emerald-800'
        }`;
        
        btn.onclick = () => {
            currentSheet = sheet;
            renderTabs(sheets);
            renderTable();
        };
        container.appendChild(btn);
    });
}

/**
 * Formats the hotel name text with badges and custom HTML styles.
 * @param {string} text - Raw hotel name.
 * @returns {string} Formatted HTML string.
 */
function formatHotelName(text) {
    if (!text || text === "NaN" || text === "-") return "";
    let formatted = text.toString().replace(/\n/g, '<br>');
    formatted = formatted.replace(/عرض خاص/g, '<span class="inline-block mt-1.5 px-2.5 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold rounded-full">🔥 عرض خاص</span>');
    formatted = formatted.replace(/\sاو\s/g, '<span class="text-slate-400 font-semibold text-xs block my-1">أو</span>');
    formatted = formatted.replace(/ - /g, '<span class="text-slate-300 font-bold block my-1">━</span>');
    return formatted;
}

/**
 * Formats numbers into comma-separated locale strings.
 * @param {string|number} num - Raw number.
 * @returns {string} Comma-separated number string.
 */
function formatPrice(num) {
    if (!num || num === "-" || isNaN(num)) return num;
    return Number(num).toLocaleString('en-US'); 
}

/**
 * Renders the table head and rows based on active sheet and search query.
 * @param {string} filterText - Search input filter text.
 */
function renderTable(filterText = '') {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('tours-body');
    tbody.innerHTML = '';
    thead.innerHTML = '';

    const searchLower = filterText.toLowerCase().trim();
    const sheetData = allData[currentSheet] || [];
    
    if (sheetData.length < 2) return;

    const headers = sheetData[0];
    const rowsData = sheetData.slice(1);
    const isTwoHotels = headers.length >= 6 && headers[5] !== "";

    // Render Table Headers
    const headerRow = document.createElement('tr');
    headers.forEach((h, index) => {
        if (!h) return;
        let wClass = "";
        if (isTwoHotels) {
            if (index === 0 || index === 1) wClass = "w-72";
            else if (index === 2) wClass = "w-36";
            else if (index === 3 || index === 4) wClass = "w-36";
            else wClass = "w-64";
        } else {
            if (index === 0) wClass = "w-96";
            else if (index === 1) wClass = "w-36";
            else if (index === 2 || index === 3) wClass = "w-36";
            else wClass = "w-72";
        }
        headerRow.innerHTML += `<th class="sticky top-0 z-10 text-sm md:text-base font-bold shadow-sm ${wClass}">${h}</th>`;
    });
    thead.appendChild(headerRow);
    
    // Group rows that belong to the same hotel(s)
    let groups = [];
    let currentGroup = null;

    rowsData.forEach(row => {
        let h1 = row[0] || "";
        let h2 = isTwoHotels ? (row[1] || "") : "";
        let days = isTwoHotels ? row[2] : row[1];
        let adultPrice = isTwoHotels ? row[3] : row[2];
        let childPrice = isTwoHotels ? row[4] : row[3];
        let notes = isTwoHotels ? row[5] : row[4];

        h1 = h1.toString().trim();
        h2 = h2.toString().trim();
        
        let isNewGroup = false;
        if (!currentGroup) {
            isNewGroup = true;
        } else if (h1 !== "" && h1 !== currentGroup.hotel) {
            isNewGroup = true;
        } else if (isTwoHotels && h2 !== "" && h2 !== currentGroup.hotel2) {
            isNewGroup = true;
        }

        if (isNewGroup) {
            currentGroup = {
                hotel: h1,
                hotel2: h2,
                notes: (notes || "").toString().trim(),
                rows: []
            };
            groups.push(currentGroup);
        }

        currentGroup.rows.push({
            days: (days || "-").toString().trim(),
            adultPrice: formatPrice(adultPrice),
            childPrice: formatPrice(childPrice)
        });
    });

    // Render Grouped Rows with filters
    groups.forEach((g) => {
        let textToSearch = [g.hotel, g.hotel2, g.notes].join(" ").toLowerCase();
        let matchFound = textToSearch.includes(searchLower);
        
        if (!matchFound) {
            matchFound = g.rows.some(r => [r.days, r.adultPrice, r.childPrice].join(" ").toLowerCase().includes(searchLower));
        }

        if (matchFound) {
            const rowspan = Math.max(g.rows.length, 1);
            
            g.rows.forEach((r, index) => {
                const tr = document.createElement('tr');
                
                if (index === rowspan - 1) {
                    tr.classList.add('last-row-in-group');
                }
                
                let html = "";
                
                if (index === 0) {
                    html += `<td rowspan="${rowspan}" class="group-cell bg-white text-emerald-950 font-bold text-sm md:text-base leading-relaxed p-4 border-l border-slate-100">
                        ${formatHotelName(g.hotel)}
                    </td>`;
                    
                    if (isTwoHotels) {
                        html += `<td rowspan="${rowspan}" class="group-cell bg-white text-emerald-950 font-bold text-sm md:text-base leading-relaxed p-4 border-l border-slate-100">
                            ${formatHotelName(g.hotel2)}
                        </td>`;
                    }
                }
                
                html += `
                    <td class="text-slate-700 font-medium text-sm md:text-base">${r.days}</td>
                    <td class="text-emerald-700 font-extrabold text-sm md:text-base">${r.adultPrice}</td>
                    <td class="text-slate-600 font-semibold text-sm md:text-base">${r.childPrice}</td>
                `;
                
                if (index === 0) {
                    html += `<td rowspan="${rowspan}" class="group-cell bg-white text-slate-600 font-medium text-xs md:text-sm leading-relaxed whitespace-pre-line px-6 border-r border-slate-100">
                        ${g.notes || "-"}
                    </td>`;
                }
                
                tr.innerHTML = html;
                tbody.appendChild(tr);
            });
        }
    });

    // Toggle Empty State Visibility
    if (tbody.children.length === 0) {
        document.getElementById('data-container').classList.add('hidden');
        document.getElementById('no-data-state').classList.remove('hidden');
    } else {
        document.getElementById('no-data-state').classList.add('hidden');
        document.getElementById('data-container').classList.remove('hidden');
    }
}

// Attach Search Input Event Listener
document.getElementById('search-input').addEventListener('input', (e) => {
    renderTable(e.target.value);
});
