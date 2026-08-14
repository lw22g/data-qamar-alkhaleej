/**
 * ==========================================================================
 * قمر الخليج للسفر والسياحة - نظام العروض والبرامج السياحية المباشرة
 * Script Logic: Data processing, Dual-View Rendering, Filters & Smart Stats
 * ==========================================================================
 */

const scriptUrl = "https://script.google.com/macros/s/AKfycbxWx6ISmjjFACmRkgvND44xsDXzvSRjYnwHBLrRWPPOMwQs5Rrp7BW5ienZWpxYnV3M/exec";

// Global State
let allData = {};
let currentSheet = "";
let viewMode = localStorage.getItem('qamar_view_mode') || 'cards'; // 'cards' or 'table'
let activeQuickFilter = 'all'; // 'all' or 'special'
let activeSortOption = 'default';
let searchKeyword = '';

// Initialize on Window Load
window.onload = () => {
    // Set current print date
    const printDateElem = document.getElementById('print-date');
    if (printDateElem) {
        printDateElem.innerText = "تاريخ التحديث: " + new Date().toLocaleDateString('ar-IQ', { dateStyle: 'long' });
    }

    // Apply stored view mode
    updateViewModeUI();

    // Fetch initial data
    loadData();
};

/**
 * Loads data from Remote Script or Fallback sample_data.json
 */
function loadData() {
    const skeleton = document.getElementById('skeleton-loader');
    const dataContainer = document.getElementById('data-container');
    const noData = document.getElementById('no-data-state');
    
    if (skeleton) skeleton.classList.remove('hidden');
    if (dataContainer) dataContainer.classList.add('hidden');
    if (noData) noData.classList.add('hidden');

    fetch(scriptUrl)
        .then(res => res.json())
        .then(data => {
            initializeWithData(data);
        })
        .catch(err => {
            console.warn("Remote fetch failed, trying local sample_data.json:", err);
            fetch('sample_data.json')
                .then(res => res.json())
                .then(localData => {
                    initializeWithData(localData);
                })
                .catch(localErr => {
                    console.error("Local data load failed as well:", localErr);
                    if (skeleton) {
                        skeleton.innerHTML = `
                            <div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
                                <p class="font-bold text-base mb-1">تعذر تحميل البيانات</p>
                                <p class="text-xs">يرجى التأكد من الاتصال بالإنترنت والضغط على زر إعادة المحاولة.</p>
                                <button onclick="loadData()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700">إعادة المحاولة</button>
                            </div>
                        `;
                    }
                });
        });
}

/**
 * Refreshes data with button animation
 */
function refreshData() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('animate-spin');
    loadData();
    setTimeout(() => {
        if (icon) icon.classList.remove('animate-spin');
    }, 1200);
}

/**
 * Normalizes Arabic text for resilient comparison (removes tatweel, unifies alef, yeh, heh)
 */
function normalizeArabic(text) {
    if (!text) return "";
    return text.toString()
        .replace(/ـ/g, '') // remove kashida / tatweel
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Finds matching sheet name based on query string
 */
function findMatchingSheet(query, sheets) {
    if (!query || !sheets || sheets.length === 0) return null;
    const cleanQuery = normalizeArabic(query);
    
    // 1. Exact match
    const exact = sheets.find(s => s === query);
    if (exact) return exact;

    // 2. Normalized exact match
    const normExact = sheets.find(s => normalizeArabic(s) === cleanQuery);
    if (normExact) return normExact;

    // 3. Substring match (either sheet contains query or query contains sheet)
    const subMatch = sheets.find(s => {
        const normS = normalizeArabic(s);
        return normS.includes(cleanQuery) || cleanQuery.includes(normS);
    });
    if (subMatch) return subMatch;

    return null;
}

/**
 * Initializes data model and setup UI
 */
function initializeWithData(data) {
    allData = data;
    const allSheets = Object.keys(data);
    const skeleton = document.getElementById('skeleton-loader');
    
    if (skeleton) skeleton.classList.add('hidden');

    if (allSheets.length > 0) {
        // Read destination from URL parameter or Hash
        let rawDest = '';
        try {
            const urlParams = new URLSearchParams(window.location.search);
            rawDest = urlParams.get('dest') || urlParams.get('country') || '';
            if (!rawDest && window.location.hash) {
                rawDest = decodeURIComponent(window.location.hash.replace(/^#/, ''));
            }
        } catch (e) {
            console.warn("URL parsing error:", e);
        }

        const matchedSheet = findMatchingSheet(rawDest, allSheets);
        
        let visibleSheets = allSheets;
        // If a specific destination was requested in URL, isolate ONLY that destination
        if (matchedSheet) {
            currentSheet = matchedSheet;
            visibleSheets = [matchedSheet]; // Only show this single country!
            
            const destNavHeader = document.getElementById('dest-nav-header');
            const singleBanner = document.getElementById('single-dest-banner');
            const singleDestName = document.getElementById('single-dest-name');
            const tabsContainer = document.getElementById('tabs-container');

            if (destNavHeader) destNavHeader.classList.add('hidden');
            if (tabsContainer) tabsContainer.classList.add('hidden');
            if (singleBanner) {
                singleBanner.classList.remove('hidden');
                if (singleDestName) singleDestName.innerText = currentSheet;
            }
        } else {
            currentSheet = allSheets[0];
            renderTabs(visibleSheets);
        }

        applyFiltersAndRender();
    } else {
        const noData = document.getElementById('no-data-state');
        if (noData) noData.classList.remove('hidden');
    }
}

/**
 * Switch destination and update URL
 */
function selectDestination(sheet, sheets) {
    currentSheet = sheet;
    
    // Update URL parameter without reload
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('dest', sheet);
        window.history.replaceState({}, '', url.toString());
    } catch (e) {
        window.location.hash = encodeURIComponent(sheet);
    }

    renderTabs(sheets);
    applyFiltersAndRender();
}

/**
 * Renders destination tabs with badges
 */
function renderTabs(sheets) {
    const container = document.getElementById('tabs-container');
    if (!container) return;
    container.innerHTML = '';
    
    sheets.forEach(sheet => {
        const btn = document.createElement('button');
        const isActive = sheet === currentSheet;
        const sheetData = allData[sheet] || [];
        const groupCount = getGroupsCount(sheetData);

        btn.className = `flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap border ${
            isActive 
            ? 'bg-gradient-to-r from-brand-900 to-brand-800 text-white border-brand-800 shadow-md shadow-emerald-900/10' 
            : 'bg-white text-slate-700 border-slate-200/90 hover:border-emerald-500 hover:text-emerald-800 hover:bg-emerald-50/40'
        }`;
        
        btn.innerHTML = `
            <span>${sheet}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }">${groupCount}</span>
        `;
        
        btn.onclick = () => {
            selectDestination(sheet, sheets);
        };
        container.appendChild(btn);
    });
}

/**
 * Calculates number of unique hotel packages in a sheet
 */
function getGroupsCount(sheetData) {
    if (!sheetData || sheetData.length < 2) return 0;
    const headers = sheetData[0];
    const isTwoHotels = headers.length >= 6 && headers[5] !== "";
    const rows = sheetData.slice(1);
    let count = 0;
    let lastHotel = null;

    rows.forEach(r => {
        const h1 = (r[0] || "").toString().trim();
        const h2 = isTwoHotels ? (r[1] || "").toString().trim() : "";
        const key = h1 + "||" + h2;
        if (h1 && key !== lastHotel) {
            count++;
            lastHotel = key;
        }
    });
    return count || rows.length;
}

/**
 * Cleans and formats hotel names with tags
 */
function cleanHotelName(text) {
    if (!text || text === "NaN" || text === "-") return "";
    return text.toString().replace(/عرض خاص/gi, '').trim();
}

/**
 * Checks if hotel entry has 'عرض خاص'
 */
function hasSpecialOffer(text, notes) {
    const combined = ((text || "") + " " + (notes || "")).toLowerCase();
    return combined.includes("عرض خاص") || combined.includes("عرض مميز") || combined.includes("تخفيض");
}

/**
 * Formats numbers with comma separators
 */
function formatPrice(num) {
    if (!num || num === "-" || isNaN(num)) return num || "-";
    return Number(num).toLocaleString('en-US');
}

/**
 * Extracts raw number value for sorting/comparisons
 */
function parsePriceNumber(val) {
    if (!val) return 0;
    const cleaned = val.toString().replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * Formats notes and bullet points into HTML with checkmarks
 */
function formatInclusionsHTML(notes) {
    if (!notes || notes.trim() === "" || notes.trim() === "-") {
        return `<p class="text-xs text-slate-400 italic">البرنامج يشمل الخدمات الأساسية الفندقية.</p>`;
    }

    const lines = notes.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let html = '<div class="space-y-1.5 text-right">';

    lines.forEach(line => {
        let cleanLine = line.replace(/^[-*•\d.]+\s*/, '').trim();
        if (!cleanLine) return;

        if (cleanLine.includes("الأسعار تشمل:") || cleanLine.includes("العرض يشمل:")) {
            html += `<p class="text-xs font-black text-emerald-900 mb-1">${cleanLine}</p>`;
        } else {
            html += `
                <div class="inclusion-item">
                    <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="text-xs font-medium text-slate-700">${cleanLine}</span>
                </div>
            `;
        }
    });

    html += '</div>';
    return html;
}

/**
 * Extracts structured groups from sheet data
 */
function parseSheetGroups(sheetData) {
    if (!sheetData || sheetData.length < 2) return { headers: [], groups: [], isTwoHotels: false };

    const headers = sheetData[0];
    const rowsData = sheetData.slice(1);
    const isTwoHotels = headers.length >= 6 && headers[5] !== "";

    let groups = [];
    let currentGroup = null;

    rowsData.forEach(row => {
        let h1 = (row[0] || "").toString().trim();
        let h2 = isTwoHotels ? (row[1] || "").toString().trim() : "";
        let days = isTwoHotels ? row[2] : row[1];
        let adultPrice = isTwoHotels ? row[3] : row[2];
        let childPrice = isTwoHotels ? row[4] : row[3];
        let notes = isTwoHotels ? row[5] : row[4];

        let isNewGroup = false;
        if (!currentGroup) {
            isNewGroup = true;
        } else if (h1 !== "" && h1 !== currentGroup.rawHotel1) {
            isNewGroup = true;
        } else if (isTwoHotels && h2 !== "" && h2 !== currentGroup.rawHotel2) {
            isNewGroup = true;
        }

        if (isNewGroup) {
            const isSpecial = hasSpecialOffer(h1, notes) || hasSpecialOffer(h2, notes);
            currentGroup = {
                rawHotel1: h1,
                rawHotel2: h2,
                hotel1: cleanHotelName(h1),
                hotel2: cleanHotelName(h2),
                isSpecialOffer: isSpecial,
                notes: (notes || "").toString().trim(),
                rows: []
            };
            groups.push(currentGroup);
        }

        currentGroup.rows.push({
            days: (days || "-").toString().trim(),
            adultPrice: formatPrice(adultPrice),
            rawAdultPrice: parsePriceNumber(adultPrice),
            childPrice: formatPrice(childPrice),
            rawChildPrice: parsePriceNumber(childPrice)
        });
    });

    return { headers, groups, isTwoHotels };
}

/**
 * Main Controller: Filters, sorts, updates stats, and renders both views
 */
function applyFiltersAndRender() {
    const sheetData = allData[currentSheet] || [];
    const { headers, groups, isTwoHotels } = parseSheetGroups(sheetData);

    // Update Print destination title
    const printTitle = document.getElementById('print-destination-title');
    if (printTitle) printTitle.innerText = `عروض وبرامج وجهة: ${currentSheet}`;

    // Filter by search keyword
    const searchLower = searchKeyword.toLowerCase().trim();
    let filtered = groups.filter(g => {
        // Quick Special filter
        if (activeQuickFilter === 'special' && !g.isSpecialOffer) {
            return false;
        }

        if (!searchLower) return true;

        const textToSearch = [g.hotel1, g.hotel2, g.notes].join(" ").toLowerCase();
        if (textToSearch.includes(searchLower)) return true;

        return g.rows.some(r => 
            [r.days, r.adultPrice, r.childPrice].join(" ").toLowerCase().includes(searchLower)
        );
    });

    // Apply Sorting
    if (activeSortOption === 'price-asc') {
        filtered.sort((a, b) => {
            const minA = Math.min(...a.rows.map(r => r.rawAdultPrice || Infinity));
            const minB = Math.min(...b.rows.map(r => r.rawAdultPrice || Infinity));
            return minA - minB;
        });
    } else if (activeSortOption === 'price-desc') {
        filtered.sort((a, b) => {
            const minA = Math.min(...a.rows.map(r => r.rawAdultPrice || 0));
            const minB = Math.min(...b.rows.map(r => r.rawAdultPrice || 0));
            return minB - minA;
        });
    } else if (activeSortOption === 'name-asc') {
        filtered.sort((a, b) => a.hotel1.localeCompare(b.hotel1, 'ar'));
    }

    // Update Quick Stats
    updateStats(groups, filtered);

    // Render Data
    const dataContainer = document.getElementById('data-container');
    const noData = document.getElementById('no-data-state');

    if (filtered.length === 0) {
        if (dataContainer) dataContainer.classList.add('hidden');
        if (noData) noData.classList.remove('hidden');
    } else {
        if (noData) noData.classList.add('hidden');
        if (dataContainer) dataContainer.classList.remove('hidden');

        renderCardsView(filtered, isTwoHotels);
        renderTableView(filtered, isTwoHotels, headers);
    }
}

/**
 * Updates top statistics bar
 */
function updateStats(allGroups, filteredGroups) {
    const statTotal = document.getElementById('stat-total-count');
    const statMinPrice = document.getElementById('stat-min-price');
    const statSpecial = document.getElementById('stat-special-count');
    const statSheet = document.getElementById('stat-active-sheet');
    const specialBadge = document.getElementById('special-badge-count');

    if (statSheet) statSheet.innerText = currentSheet || "-";

    const totalCount = allGroups.length;
    if (statTotal) statTotal.innerText = `${filteredGroups.length} من ${totalCount} برنامج`;

    const specialCount = allGroups.filter(g => g.isSpecialOffer).length;
    if (statSpecial) statSpecial.innerText = `${specialCount} عروض خاصة`;
    if (specialBadge) {
        specialBadge.innerText = specialCount;
        specialBadge.classList.toggle('hidden', specialCount === 0);
    }

    // Compute minimum starting price
    let minPrice = Infinity;
    filteredGroups.forEach(g => {
        g.rows.forEach(r => {
            if (r.rawAdultPrice && r.rawAdultPrice > 0 && r.rawAdultPrice < minPrice) {
                minPrice = r.rawAdultPrice;
            }
        });
    });

    if (statMinPrice) {
        statMinPrice.innerText = (minPrice !== Infinity) ? Number(minPrice).toLocaleString('en-US') : "-";
    }
}

/**
 * Renders Card View Mode
 */
function renderCardsView(groups, isTwoHotels) {
    const container = document.getElementById('cards-view');
    if (!container) return;
    container.innerHTML = '';

    groups.forEach((g, idx) => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-soft card-hover-effect flex flex-col justify-between relative overflow-hidden";

        // Special offer badge
        const specialBadgeHtml = g.isSpecialOffer 
            ? `<span class="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[11px] font-black rounded-full shadow-xs animate-pulse">
                 🔥 عرض خاص ومميز
               </span>`
            : '';

        // Hotel Titles HTML
        let hotelTitleHtml = '';
        if (isTwoHotels) {
            hotelTitleHtml = `
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                        <h3 class="font-black text-slate-900 text-base md:text-lg leading-tight">${g.hotel1}</h3>
                    </div>
                    <div class="flex items-center gap-2 pr-2 border-r-2 border-dashed border-emerald-300 mr-3 my-0.5">
                        <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">تنقل مشترك ⇄</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                        <h3 class="font-black text-slate-900 text-base md:text-lg leading-tight">${g.hotel2}</h3>
                    </div>
                </div>
            `;
        } else {
            hotelTitleHtml = `
                <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 text-base md:text-lg leading-snug">${g.hotel1}</h3>
                        <span class="text-xs font-semibold text-slate-400 mt-0.5 block">${currentSheet}</span>
                    </div>
                </div>
            `;
        }

        // Pricing Rows HTML
        let pricesHtml = `
            <div class="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 mt-4 divide-y divide-slate-200/60">
        `;

        g.rows.forEach((r, rIdx) => {
            const firstHotelName = g.hotel1;
            const secondHotelName = isTwoHotels ? ` و ${g.hotel2}` : '';
            const fullTitle = `${firstHotelName}${secondHotelName}`;
            const whatsAppMsg = encodeURIComponent(`مرحباً شركة قمر الخليج، أود الاستفسار والحجز لعرض (${currentSheet}):\n- الفندق: ${fullTitle}\n- المدة: ${r.days}\n- سعر الشخص البالغ: ${r.adultPrice}\n- سعر الطفل: ${r.childPrice}`);

            pricesHtml += `
                <div class="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-extrabold bg-white border border-slate-200 text-slate-800 shadow-xs">
                            ⏳ ${r.days}
                        </span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-left">
                            <span class="text-[10px] font-bold text-slate-400 block">بالغ</span>
                            <span class="text-sm md:text-base font-black text-emerald-800">${r.adultPrice}</span>
                        </div>
                        <div class="text-left border-r border-slate-200 pr-3">
                            <span class="text-[10px] font-bold text-slate-400 block">طفل</span>
                            <span class="text-xs md:text-sm font-extrabold text-slate-600">${r.childPrice}</span>
                        </div>
                        <a href="https://wa.me/9647744005595?text=${whatsAppMsg}" target="_blank" rel="noopener noreferrer" title="حجز فوري لهذا الخيار" class="p-1.5 bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl transition-colors">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.388 2.016 13.91 1.018 11.28 1.018c-5.438 0-9.863 4.373-9.868 9.802-.001 1.777.475 3.51 1.378 5.042l-1.018 3.714 3.847-.998c1.554.851 3.238 1.3 4.939 1.3.003 0 .003 0 0 0zm9.957-6.864c-.26-.13-1.532-.756-1.77-.84-.237-.085-.41-.13-.58.13-.172.26-.667.84-.818 1.01-.15.17-.3.19-.56.06-2.185-1.097-3.606-2.029-4.707-3.918-.29-.497.29-.462.83-1.536.09-.18.04-.34-.02-.47-.06-.13-.58-1.398-.795-1.92-.21-.505-.42-.435-.58-.443-.15-.007-.32-.009-.49-.009-.17 0-.45.064-.68.322-.23.258-.88.86-.88 2.1 0 1.24.9 2.438 1.02 2.6.12.16 1.77 2.7 4.29 3.79.6.26 1.07.415 1.43.53.6.19 1.15.165 1.58.1.48-.07 1.53-.625 1.74-1.23.21-.6.21-1.12.15-1.23-.06-.11-.22-.17-.48-.3z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        });
        pricesHtml += `</div>`;

        // Inclusions HTML
        const inclusionsHtml = `
            <div class="mt-4 pt-3 border-t border-slate-100">
                <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">الملاحظات والشمولية:</span>
                <div class="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    ${formatInclusionsHTML(g.notes)}
                </div>
            </div>
        `;

        // Card Actions (Share & Copy)
        const summaryText = `${currentSheet}: ${g.hotel1} ${isTwoHotels ? 'و ' + g.hotel2 : ''}\n` + 
            g.rows.map(r => `• ${r.days}: بالغ (${r.adultPrice}) - طفل (${r.childPrice})`).join('\n') + 
            `\nالشمولية:\n${g.notes}`;

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                    ${specialBadgeHtml}
                    <button onclick="copyOfferDetails('${encodeURIComponent(summaryText)}')" class="p-1.5 text-slate-400 hover:text-emerald-700 rounded-xl hover:bg-slate-100 transition-colors mr-auto" title="نسخ تفاصيل هذا العرض">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
                ${hotelTitleHtml}
                ${pricesHtml}
                ${inclusionsHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * Renders Table View Mode
 */
function renderTableView(groups, isTwoHotels, headers) {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('tours-body');
    if (!thead || !tbody) return;
    
    tbody.innerHTML = '';
    thead.innerHTML = '';

    // Render Headers
    const headerRow = document.createElement('tr');
    headers.forEach((h, index) => {
        if (!h) return;
        let wClass = "";
        if (isTwoHotels) {
            if (index === 0 || index === 1) wClass = "w-64";
            else if (index === 2) wClass = "w-36";
            else if (index === 3 || index === 4) wClass = "w-36";
            else wClass = "w-72";
        } else {
            if (index === 0) wClass = "w-80";
            else if (index === 1) wClass = "w-36";
            else if (index === 2 || index === 3) wClass = "w-36";
            else wClass = "w-80";
        }
        headerRow.innerHTML += `<th class="sticky top-0 z-10 text-xs md:text-sm font-bold shadow-xs ${wClass}">${h}</th>`;
    });
    thead.appendChild(headerRow);

    // Render Grouped Rows with alternating colors
    groups.forEach((g, gIdx) => {
        const rowspan = Math.max(g.rows.length, 1);
        const isOddGroup = gIdx % 2 === 1;
        const groupClass = isOddGroup ? 'group-odd' : 'group-even';
        const groupCellBg = isOddGroup ? 'bg-slate-50/90' : 'bg-white';
        
        g.rows.forEach((r, index) => {
            const tr = document.createElement('tr');
            tr.classList.add(groupClass);
            
            // Sub-row alternation within the same hotel group
            if (index % 2 === 1) {
                tr.classList.add('sub-row-alt');
            }
            
            if (index === rowspan - 1) {
                tr.classList.add('last-row-in-group');
            }

            let html = "";

            if (index === 0) {
                // Hotel 1 cell
                html += `
                    <td rowspan="${rowspan}" class="group-cell ${groupCellBg} text-slate-900 font-bold text-xs md:text-sm p-4 border-l border-slate-200">
                        <div class="flex flex-col items-center gap-1.5">
                            ${g.isSpecialOffer ? '<span class="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-black rounded-full shadow-2xs">🔥 عرض خاص</span>' : ''}
                            <span class="font-extrabold text-slate-900 leading-snug">${g.hotel1}</span>
                        </div>
                    </td>
                `;

                // Hotel 2 cell if applicable
                if (isTwoHotels) {
                    html += `
                        <td rowspan="${rowspan}" class="group-cell ${groupCellBg} text-slate-900 font-bold text-xs md:text-sm p-4 border-l border-slate-200">
                            <span class="font-extrabold text-slate-900 leading-snug">${g.hotel2}</span>
                        </td>
                    `;
                }
            }

            // Duration & Price cells
            html += `
                <td class="text-slate-800 font-bold text-xs md:text-sm whitespace-nowrap">
                    <span class="bg-white/90 border border-slate-200/90 px-2.5 py-1 rounded-lg shadow-2xs">${r.days}</span>
                </td>
                <td class="text-emerald-800 font-black text-xs md:text-base">${r.adultPrice}</td>
                <td class="text-slate-600 font-bold text-xs md:text-sm">${r.childPrice}</td>
            `;

            // Inclusions cell
            if (index === 0) {
                html += `
                    <td rowspan="${rowspan}" class="group-cell ${groupCellBg} text-slate-600 font-medium text-xs leading-relaxed p-4 border-r border-slate-200 text-right">
                        ${formatInclusionsHTML(g.notes)}
                    </td>
                `;
            }

            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
    });
}

/**
 * Switch View Mode: 'cards' or 'table'
 */
function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('qamar_view_mode', mode);
    updateViewModeUI();
}

function updateViewModeUI() {
    const cardsView = document.getElementById('cards-view');
    const tableView = document.getElementById('table-view');
    const btnCards = document.getElementById('btn-view-cards');
    const btnTable = document.getElementById('btn-view-table');

    if (viewMode === 'cards') {
        if (cardsView) cardsView.classList.remove('hidden');
        if (tableView) tableView.classList.add('hidden');
        if (btnCards) {
            btnCards.className = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all bg-white text-emerald-900 shadow-sm";
        }
        if (btnTable) {
            btnTable.className = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all text-slate-600 hover:text-slate-900";
        }
    } else {
        if (cardsView) cardsView.classList.add('hidden');
        if (tableView) tableView.classList.remove('hidden');
        if (btnCards) {
            btnCards.className = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all text-slate-600 hover:text-slate-900";
        }
        if (btnTable) {
            btnTable.className = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all bg-white text-emerald-900 shadow-sm";
        }
    }
}

/**
 * Quick Filter Setter
 */
function setQuickFilter(filter) {
    activeQuickFilter = filter;
    const filterAll = document.getElementById('filter-all');
    const filterSpecial = document.getElementById('filter-special');

    if (filter === 'all') {
        if (filterAll) filterAll.className = "px-3 py-1.5 rounded-xl font-bold transition-all bg-emerald-800 text-white shadow-xs";
        if (filterSpecial) filterSpecial.className = "px-3 py-1.5 rounded-xl font-bold transition-all bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent flex items-center gap-1";
    } else if (filter === 'special') {
        if (filterAll) filterAll.className = "px-3 py-1.5 rounded-xl font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200";
        if (filterSpecial) filterSpecial.className = "px-3 py-1.5 rounded-xl font-bold transition-all bg-rose-600 text-white shadow-xs flex items-center gap-1";
    }

    applyFiltersAndRender();
}

/**
 * Sorting Change Handler
 */
function handleSortChange(sortVal) {
    activeSortOption = sortVal;
    applyFiltersAndRender();
}

/**
 * Search Input Handling
 */
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        if (clearSearchBtn) {
            clearSearchBtn.classList.toggle('hidden', searchKeyword.length === 0);
        }
        applyFiltersAndRender();
    });
}

function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        searchKeyword = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        applyFiltersAndRender();
    }
}

function resetAllFilters() {
    clearSearch();
    setQuickFilter('all');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'default';
    activeSortOption = 'default';
    applyFiltersAndRender();
}

/**
 * Copy Offer details to Clipboard
 */
function copyOfferDetails(encodedText) {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
        showToast("تم نسخ تفاصيل العرض بنجاح!");
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
    });
}

/**
 * Copy Link of Current Destination to Clipboard
 */
function copyCurrentDestinationLink() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('dest', currentSheet);
        const link = url.toString();
        
        navigator.clipboard.writeText(link).then(() => {
            showToast(`تم نسخ رابط عروض (${currentSheet}) بنجاح! يمكنك إرساله للزبون مباشرة.`);
        }).catch(err => {
            prompt("انسخ الرابط التالي:", link);
        });
    } catch (e) {
        const hashLink = window.location.href.split('#')[0] + '#' + encodeURIComponent(currentSheet);
        navigator.clipboard.writeText(hashLink).then(() => {
            showToast(`تم نسخ رابط عروض (${currentSheet}) بنجاح!`);
        });
    }
}

/**
 * Toast Notification Utility
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.innerText = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
