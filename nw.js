const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyCdt2QV54EVx5D2StIsl0X6BqS9eNU5KvuIp7zV-sp_AgS4borSnyVFh3GzALDJr8daQ/exec";

let allData = [];

window.addEventListener("DOMContentLoaded", function() {
  const teacherSelect = document.getElementById("teacherSelect");
  requestNotificationPermission();

  if (teacherSelect && WEB_APP_URL !== "ضع_رابط_الـ_WEB_APP_URL_هنا") {
    fetch(WEB_APP_URL)
      .then(res => res.json())
      .then(data => {
        allData = data;
        populateTeacherDropdown(data);
      })
      .catch(err => console.error("Error fetching data:", err));
  }
});

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        console.log("Notifications permitted.");
      }
    });
  }
}

function populateTeacherDropdown(data) {
  const select = document.getElementById("teacherSelect");
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر اسم المعلم / المعلمة --</option>';
  
  if (!data || data.length === 0) return;

  // استخراج أسماء المعلمين الفريدة وتنظيفها
  let teachers = [...new Set(data.map(item => item["المعلم"] || item["اسم المعلم"]))]
    .filter(t => t && t.toString().trim() !== "" && isNaN(t));
  
  // الترتيب الأبجدي الاحترافي للأسماء بالعربية
  teachers.sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }));
  
  teachers.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    // إضافة شكل جمالي احترافي للاسم في القائمة
    opt.textContent = "⭐ " + t; 
    select.appendChild(opt);
  });
}
function formatTo12Hour(timeStr) {
  if (!timeStr) return "";
  let str = timeStr.toString().trim();

  if (str.includes("T") || str.includes("1899-")) {
    let dateObj = new Date(str);
    if (!isNaN(dateObj.getTime())) {
      let h = dateObj.getUTCHours();
      let m = dateObj.getUTCMinutes();
      let period = h >= 12 ? "مساءً" : "صباحاً";
      h = h % 12;
      h = h ? h : 12;
      let minStr = m < 10 ? "0" + m : m;
      return `${h}:${minStr} ${period}`;
    }
  }

  let cleanStr = str
    .replace("م.", "").replace("ص.", "")
    .replace("مساءً", "").replace("صباحاً", "").trim();
  
  let parts = cleanStr.split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    let minutes = parts[1].substring(0, 2);
    
    let isPM = str.includes("مساء") || str.includes("م.") || str.toLowerCase().includes("pm");
    let isAM = str.includes("صباح") || str.includes("ص.") || str.toLowerCase().includes("am");

    if (!isNaN(hours)) {
      if (isPM && hours < 12) {
        hours += 12;
      } else if (isAM && hours === 12) {
        hours = 0;
      } else if (!isPM && !isAM && hours < 7 && hours !== 0) {
        hours += 12;
      }

      let period = hours >= 12 ? "مساءً" : "صباحاً";
      let displayHours = hours % 12;
      displayHours = displayHours ? displayHours : 12;
      
      return `${displayHours}:${minutes} ${period}`;
    }
  }
  return str;
}

function loadTeacherSessions() {
  const teacherName = document.getElementById("teacherSelect").value;
  const container = document.getElementById("sessionsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!teacherName) return;

  const teacherSessions = allData.filter(item => {
    const tVal = item["المعلم"] || item["اسم المعلم"];
    return tVal && tVal.toString().trim() === teacherName.trim();
  });

  if (teacherSessions.length === 0) {
    container.innerHTML = "<p style='color:red; margin-top:10px;'>لا توجد حلقات مسجلة لهذا المعلم.</p>";
    return;
  }

  monitorTeacherSessions(teacherSessions);

  let studentsMap = {};

  teacherSessions.forEach((session) => {
    const student = session["الطالب"] || session["اسم الطالب"] || "";
    if (!student) return;

   // فحص حالة الطالب: السماح فقط للحالات "حالي" أو لو الخانة فارغة، واستبعاد باقي الحالات
    const statusVal = (session["الحالة"] || session["حالة الطالب"] || "").toString().trim();
    
    // لو الحالة واحدة من دول (معتذر، متوقف لفترة، لم يدرس)، تجاهل السطر وما تظهروش
    if (statusVal === "معتذر" || statusVal.includes("متوقف") || statusVal === "لم يدرس") {
      return; 
    }

    const sessionNum = session["رقم الحلقةة"] || session["رقم الحلقة"] || "-";

    if (!studentsMap[student]) {
      studentsMap[student] = {
        student: student,
        sessionNum: sessionNum,
        schedules: []
      };
    }

    // فحص ذكي ومرن لكل مفاتيح الأعمدة في الـ JSON للتأكد من عدم سقوط أي يوم
    Object.keys(session).forEach(colKey => {
      let cleanKey = colKey.trim();
      let val = session[colKey];

      if (val !== undefined && val !== null) {
        let valStr = val.toString().trim();
        if (valStr !== "" && valStr !== "undefined" && valStr !== "null" && valStr !== "-") {
          
          let targetDay = "";
          if (cleanKey.includes("السبت")) targetDay = "السبت";
          else if (cleanKey.includes("الأحد") || cleanKey.includes("الاحد")) targetDay = "الأحد";
          else if (cleanKey.includes("الاثنين") || cleanKey.includes("الإثنين")) targetDay = "الاثنين";
          else if (cleanKey.includes("الثلاثاء")) targetDay = "الثلاثاء";
          else if (cleanKey.includes("الأربعاء") || cleanKey.includes("الاربعاء")) targetDay = "الأربعاء";
          else if (cleanKey.includes("الخميس")) targetDay = "الخميس";
          else if (cleanKey.includes("الجمعة")) targetDay = "الجمعة";

          if (targetDay !== "") {
            let formattedTime = formatTo12Hour(valStr);
            let scheduleEntry = `${targetDay} (${formattedTime})`;
            
            // منع تكرار نفس اليوم لو مضاف مسبقاً
            let exists = studentsMap[student].schedules.some(s => s.startsWith(targetDay + " "));
            if (!exists) {
              studentsMap[student].schedules.push(scheduleEntry);
            }
          }
        }
      }
    });
  });

  const activeStudents = Object.values(studentsMap).filter(data => data.schedules.length > 0);

  if (activeStudents.length === 0) {
    container.innerHTML = "<p style='color:red; margin-top:10px;'>لا توجد طلاب حاليين بمواعيد نشطة لهذا المعلم.</p>";
    return;
  }

  activeStudents.forEach((data) => {
    let startTime = data.schedules.join(" | ");

    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "background: #f8f9fa; border-right: 5px solid #c5a059; padding: 12px; margin-top: 12px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: right;";
    
    card.innerHTML = `
      <h4 style="color:#1a365d; margin-bottom:5px; font-size:15px;">👤 الطالب: ${data.student}</h4>
      <p style="color:#666; font-size:13px; margin-bottom:10px;">📌 الحلقة: ${data.sessionNum} | ⏱ المواعيد: <span style="color:#c5a059; font-weight:bold;">${startTime}</span></p>
      <div style="font-size:11px; color:#e53e3e; margin-bottom:8px; font-weight:bold;">⚠️ تنبيه: يرجى إرسال التقرير خلال 30 دقيقة من انتهاء الحصة لتفادي تطبيق الخصم.</div>
      <button onclick="goToReportPage('${data.student}', '${data.sessionNum}', '${teacherName}')" style="background:#1a365d; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">📝 كتابة ورفع التقرير</button>
    `;
    container.appendChild(card);
  });
}

let notificationInterval = null;
function monitorTeacherSessions(sessions) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  
  if (notificationInterval) clearInterval(notificationInterval);

  notificationInterval = setInterval(() => {
    const now = new Date();
    const currentDayIndex = now.getDay();
    const daysArr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const currentDayName = daysArr[currentDayIndex];
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    sessions.forEach(session => {
      let statusVal = (session["الحالة"] || session["حالة الطالب"] || "").toString().trim();
      if (statusVal !== "" && statusVal !== "حالي" && statusVal !== "الحالي") return;

      let student = session["الطالب"] || session["اسم الطالب"] || "";
      let sessionNum = session["رقم الحلقة"] || "";
      
      let dayTimeStr = "";
      Object.keys(session).forEach(k => {
        if (k.includes(currentDayName) && session[k]) {
          dayTimeStr = session[k].toString().trim();
        }
      });

      if (dayTimeStr) {
        let timeMinutes = parseTimeStringToMinutes(dayTimeStr);
        if (timeMinutes !== null) {
          let sessionDuration = 60; 
          let endTotalMinutes = timeMinutes + sessionDuration;

          if (currentTotalMinutes === endTotalMinutes) {
            new Notification(`انتهت حصة الطالب: ${student}`, {
              body: `انتهت حصة حلقة (${sessionNum}) الآن. يرجى إرسال التقرير خلال 30 دقيقة لتفادي الخصم!`,
              icon: "assets/img/logo/logo.png",
              requireInteraction: true
            });
          }
        }
      }
    });
  }, 60000);
}

function parseTimeStringToMinutes(str) {
  let clean = str.replace("م.", "").replace("ص.", "").replace("مساءً", "").replace("صباحاً", "").trim();
  let parts = clean.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      if ((str.includes("مساءً") || str.includes("م.")) && h < 12) h += 12;
      if ((str.includes("صباحاً") || str.includes("ص.")) && h === 12) h = 0;
      return h * 60 + m;
    }
  }
  return null;
}

function goToReportPage(student, sessionNum, teacher) {
  const sessionData = {
    student: student,
    sessionNum: sessionNum,
    teacher: teacher,
    openTime: new Date().getTime()
  };
  sessionStorage.setItem("currentSession", JSON.stringify(sessionData));
  window.location.href = "reports.html";
}