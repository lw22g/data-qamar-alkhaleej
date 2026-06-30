// 📌 إعدادات Tailwind CSS
tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
            },
            fontFamily: {
                sans: ['Tajawal', 'sans-serif'],
            }
        }
    }
};

// 📌 رابط الـ Web App الخاص بجوجل سكريبت جلب البيانات 📌
const scriptUrl = "https://script.google.com/macros/s/AKfycbymcdG5UY_NkCDKgyeI4rXuuPJ87WKgQuPeWqlfwck1-h8Fr_cOovOhranOOBnoyg/exec";

let allData = {};
let currentSheet = "";

// جلب البيانات من النظام
function fetchApiData() {
    document.getElementById('loader').style.display = 'block';
    document.getElementById('data-container').classList.add('hidden');
    document.getElementById('no-data-state').classList.add('hidden');

    fetch(scriptUrl)
        .then(response => response.json())
        .then(data => {
            allData = data;
            const sheets = Object.keys(data);
            
            if(sheets.length > 0) {
                currentSheet = sheets[0]; // تعيين أول شيت كافتراضي
                renderTabs(sheets);
                renderTable();
                
                document.getElementById('loader').style.display = 'none';
            } else {
                showError("لا توجد بيانات متاحة في النظام حالياً.");
            }
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            showError("حدث خطأ أثناء الاتصال بالنظام. يرجى مراجعة الرابط والمحاولة لاحقاً.");
        });
}

// عرض رسالة الخطأ
function showError(message) {
    const loader = document.getElementById('loader');
    loader.innerHTML = `
        <div class="py-12 text-center flex flex-col items-center gap-3">
            <div class="p-4 bg-red-50 text-red-500 rounded-full border border-red-100">
                <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <span class="text-red-600 font-bold text-sm max-w-md">${message}</span>
            <button onclick="fetchApiData()" class="mt-4 px-5 py-2 bg-brand-700 hover:bg-brand-850 text-white rounded-xl text-xs font-bold shadow-md transition-all">إعادة المحاولة</button>
        </div>
    `;
}

// دالة إنشاء أزرار الدول
function renderTabs(sheets) {
    const tabsContainer = document.getElementById('tabs-container');
    tabsContainer.innerHTML = '';
    
    sheets.forEach(sheetName => {
        const btn = document.createElement('button');
        btn.innerText = sheetName;
        
        const isActive = sheetName === currentSheet;
        btn.className = `px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap shadow-sm border ${
            isActive 
            ? 'bg-brand-900 text-white border-brand-900 shadow-brand-950/10' 
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
        }`;
        
        btn.onclick = () => {
            currentSheet = sheetName;
            renderTabs(sheets);
            renderTable();
            document.getElementById('search-input').value = ''; // تصفير البحث
        };
        tabsContainer.appendChild(btn);
    });
}

// دالة تعبئة وعرض البيانات في الجدول (المحدثة لدمج الخلايا)
function renderTable(filterText = '') {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('tours-body');
    
    tbody.innerHTML = '';
    thead.innerHTML = '';

    const searchLower = filterText.toLowerCase().trim();
    const sheetData = allData[currentSheet] || [];
    
    // فحص بنية الشيت لمعرفة ما إذا كانت تحتوي على اسم فندق ثانٍ
    const hasTwoHotels = sheetData.some(row => row.hasTwoHotels === true);

    // --- إنشاء رأس الجدول ---
    const headerRow = document.createElement('tr');
    headerRow.className = "bg-brand-900 text-white text-base font-bold border-b border-brand-950";
    
    if (hasTwoHotels) {
        headerRow.innerHTML = `
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-64 shadow-[0_1px_0_0_rgba(2,44,34,1)]">اسم الفندق الأول</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-64 shadow-[0_1px_0_0_rgba(2,44,34,1)]">اسم الفندق الثاني</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-32 shadow-[0_1px_0_0_rgba(2,44,34,1)]">المدة</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-40 shadow-[0_1px_0_0_rgba(2,44,34,1)]">سعر البالغ (فرد)</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-40 shadow-[0_1px_0_0_rgba(2,44,34,1)]">سعر الطفل</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 shadow-[0_1px_0_0_rgba(2,44,34,1)]">ملاحظات وتفاصيل العرض</th>
        `;
    } else {
        headerRow.innerHTML = `
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-72 shadow-[0_1px_0_0_rgba(2,44,34,1)]">اسم الفندق</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-32 shadow-[0_1px_0_0_rgba(2,44,34,1)]">المدة</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-40 shadow-[0_1px_0_0_rgba(2,44,34,1)]">سعر البالغ (فرد)</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 w-40 shadow-[0_1px_0_0_rgba(2,44,34,1)]">سعر الطفل</th>
            <th class="sticky top-0 bg-brand-900 z-10 px-6 py-5 text-center align-middle border border-slate-300 shadow-[0_1px_0_0_rgba(2,44,34,1)]">ملاحظات وتفاصيل العرض</th>
        `;
    }
    thead.appendChild(headerRow);
    
    // --- تجميع البيانات (لدمج الخلايا rowspan) ---
    let groups = [];
    let currentGroup = null;

    sheetData.forEach(row => {
        const hotelName = (row.hotel || "").toString().trim();
        
        let isNewGroup = false;
        if (!currentGroup) {
            isNewGroup = true;
        } else {
            // نعتبره فندق جديد إذا كان الاسم موجود ويختلف عن الفندق الحالي ومو فارغ
            if (hotelName && hotelName !== "-" && hotelName !== currentGroup.hotel) {
                isNewGroup = true;
            }
        }

        if (isNewGroup) {
            currentGroup = {
                hotel: hotelName,
                hotel2: (row.hotel2 || "").toString().trim(),
                notes: (row.notes || "").toString().trim(),
                rows: []
            };
            groups.push(currentGroup);
        }
        
        // إضافة تفاصيل الأيام والأسعار للمجموعة الحالية
        currentGroup.rows.push({
            days: (row.days || "-").toString().trim(),
            adultPrice: (row.adultPrice || "-").toString().trim(),
            childPrice: (row.childPrice || "-").toString().trim()
        });
    });

    let matchedCount = 0;

    // --- فلترة وعرض البيانات ---
    groups.forEach((g) => {
        // فحص البحث (نبحث باسم الفندق، الملاحظات، أو أي من الأسعار والأيام)
        let textToSearch = [g.hotel, g.hotel2, g.notes].join(" ").toLowerCase();
        let matchFound = textToSearch.includes(searchLower);
        
        if (!matchFound) {
            for (let r of g.rows) {
                let rowText = [r.days, r.adultPrice, r.childPrice].join(" ").toLowerCase();
                if (rowText.includes(searchLower)) {
                    matchFound = true;
                    break;
                }
            }
        }

        if (matchFound) {
            matchedCount++;
            const rowspan = g.rows.length;
            
            // تحديد لون للمجموعة حتى تترتب بصرياً
            const bgClass = matchedCount % 2 === 0 ? 'bg-slate-50/60' : 'bg-white';

            g.rows.forEach((r, index) => {
                const tr = document.createElement('tr');
                tr.className = `hover:bg-brand-50/30 transition-colors duration-150 ${bgClass}`;
                
                // إضافة حدود سفلية قوية بنهاية كل فندق
                if (index === rowspan - 1) {
                    tr.classList.add('border-b-2', 'border-slate-300');
                } else {
                    tr.classList.add('border-b', 'border-slate-200', 'border-dashed');
                }

                let html = "";
                
                // الخلايا المدموجة (اسم الفندق) تظهر بس بأول سطر
                if (index === 0) {
                    html += `<td rowspan="${rowspan}" class="px-6 py-5 text-center align-middle border border-slate-300 font-extrabold text-slate-900 text-lg leading-snug bg-white shadow-sm">${g.hotel || "-"}</td>`;
                    
                    if (hasTwoHotels) {
                        html += `<td rowspan="${rowspan}" class="px-6 py-5 text-center align-middle border border-slate-300 font-extrabold text-slate-900 text-lg leading-snug bg-white shadow-sm">${g.hotel2 || "-"}</td>`;
                    }
                }
                
                // الخلايا المتغيرة (الأيام والأسعار)
                html += `
                    <td class="px-6 py-4 text-center align-middle border-x border-slate-200 font-bold text-brand-700 text-base">${r.days}</td>
                    <td class="px-6 py-4 text-center align-middle border-x border-slate-200 font-black text-slate-800 text-lg">${r.adultPrice}</td>
                    <td class="px-6 py-4 text-center align-middle border-x border-slate-200 font-extrabold text-amber-600 text-base">${r.childPrice}</td>
                `;
                
                // عمود الملاحظات المدموج
                if (index === 0) {
                    html += `<td rowspan="${rowspan}" class="px-6 py-5 text-center align-middle border border-slate-300 text-slate-700 text-base whitespace-pre-line leading-relaxed max-w-xl bg-white shadow-sm">${g.notes || "-"}</td>`;
                }
                
                tr.innerHTML = html;
                tbody.appendChild(tr);
            });
        }
    });

    // التحكم في عرض الشاشات عند مطابقة أو عدم مطابقة النتائج
    if (matchedCount === 0) {
        document.getElementById('data-container').classList.add('hidden');
        document.getElementById('no-data-state').classList.remove('hidden');
    } else {
        document.getElementById('no-data-state').classList.add('hidden');
        document.getElementById('data-container').classList.remove('hidden');
    }
}

// مستمع لحدث الكتابة في البحث للفلترة الفورية
document.getElementById('search-input').addEventListener('input', (e) => {
    renderTable(e.target.value);
});

// تشغيل جلب البيانات مباشرة عند تحميل الصفحة
window.onload = fetchApiData;