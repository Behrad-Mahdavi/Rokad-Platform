import { toPersianDigits } from '../../../utils/jalali';
import { DayDef, StudentScheduleItem } from './StudentSchedulePage';
import { ROKAD_LOGO_BASE64 } from '../../../assets/logoRokadBase64';

interface GeneratePdfOptions {
  title?: string;
  classroomName?: string;
  teacherName?: string;
  studentName?: string;
  isTeacher?: boolean;
  schedules: any[];
  days: DayDef[];
  periodLabels?: Record<number, string>;
}

export function generateSchedulePdf({
  title = 'برنامه هفتگی',
  classroomName = 'کلاس درس',
  teacherName,
  isTeacher = false,
  schedules,
  days,
}: GeneratePdfOptions) {
  const PERIOD_CONFIG = [
    { number: 1, label: 'زنگ اول', time: '۰۷:۳۰ تا ۰۹:۰۰' },
    { number: 2, label: 'زنگ دوم', time: '۰۹:۲۰ تا ۱۰:۴۰' },
    { number: 3, label: 'زنگ سوم', time: '۱۱:۰۰ تا ۱۲:۱۰' },
    { number: 4, label: 'زنگ چهارم', time: '۱۲:۳۰ تا ۱۳:۳۵' },
  ];
  const periods = [1, 2, 3, 4];
  const targetLabel = isTeacher ? (teacherName || 'برنامه تدریس') : classroomName;

  // Build matrix rows with strict fixed heights so cells never vary in size
  const tableRowsHtml = days
    .map((day) => {
      const daySlots = schedules.filter((s) => s.dayOfWeek === day.key);
      const cellsHtml = periods
        .map((periodNum) => {
          const slot = daySlots.find((s) => s.periodNumber === periodNum);
          if (!slot) {
            return `
              <td class="slot-cell">
                <div class="cell-content empty-content">—</div>
              </td>
            `;
          }

          if (slot.isSplitPeriod) {
            const subLabel1 = isTeacher
              ? (slot.classroom?.name || '')
              : (slot.teacher?.user ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}` : '');
            const subLabel2 = isTeacher
              ? (slot.classroom?.name || '')
              : (slot.secondTeacher?.user ? `${slot.secondTeacher.user.firstName} ${slot.secondTeacher.user.lastName}` : '');

            return `
              <td class="slot-cell">
                <div class="split-content">
                  <div class="split-half">
                    <div class="lesson-name">${slot.lesson?.name || '—'}</div>
                    ${subLabel1 ? `<div class="teacher-name">${subLabel1}</div>` : ''}
                    <span class="split-tag">۴۵ د اول</span>
                  </div>
                  <div class="split-divider"></div>
                  <div class="split-half">
                    <div class="lesson-name">${slot.secondLesson?.name || '—'}</div>
                    ${subLabel2 ? `<div class="teacher-name">${subLabel2}</div>` : ''}
                    <span class="split-tag">۴۵ د دوم</span>
                  </div>
                </div>
              </td>
            `;
          }

          const subLabel = isTeacher
            ? (slot.classroom?.name || '')
            : (slot.teacher?.user ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}` : '');

          const timeDisplay = (slot.startTime && slot.endTime)
            ? `${toPersianDigits(slot.startTime)} تا ${toPersianDigits(slot.endTime)}`
            : (PERIOD_CONFIG.find((p) => p.number === periodNum)?.time || '');

          return `
            <td class="slot-cell">
              <div class="cell-content">
                <div class="lesson-name">${slot.lesson?.name || '—'}</div>
                ${subLabel ? `<div class="teacher-name">${subLabel}</div>` : ''}
                <div class="slot-time">${timeDisplay}</div>
              </div>
            </td>
          `;
        })
        .join('');

      return `
        <tr class="day-row">
          <th class="day-header">
            <div class="day-content">${day.label}</div>
          </th>
          ${cellsHtml}
        </tr>
      `;
    })
    .join('');

  const docTitle = `برنامه_هفتگی_${targetLabel.replace(/\s+/g, '_')}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #202A5A;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', 'Tahoma', sans-serif !important;
      direction: rtl;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-container {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      border: 2px solid #202A5A;
      border-radius: 10px;
      padding: 10px 14px;
      background: #FFFFFF;
    }
    /* Header: Enlarged content size, Right title & class & year, Left school logos */
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #202A5A;
      padding-bottom: 10px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .header-table td {
      vertical-align: middle;
    }
    .header-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 5px;
    }
    .title-main {
      font-size: 22pt;
      font-weight: 900;
      color: #202A5A;
      line-height: 1.1;
      letter-spacing: -0.5px;
    }
    .class-badge {
      font-size: 13pt;
      font-weight: 800;
      color: #202A5A;
      background-color: #EEF2F9;
      border: 1.5px solid #202A5A;
      padding: 3px 14px;
      border-radius: 9999px;
      white-space: nowrap;
    }
    .year-label {
      font-size: 11.5pt;
      font-weight: 700;
      color: #475569;
    }
    .year-label strong {
      color: #202A5A;
      font-weight: 800;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
    }
    .logo-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
    }
    .logo-img {
      height: 56px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    /* Timetable Grid: Strictly uniform boxes that never vary in size */
    .schedule-table {
      width: 100%;
      flex: 1;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .schedule-table thead tr {
      height: 34px;
    }
    .schedule-table thead th {
      background-color: #202A5A;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 10pt;
      padding: 4px 2px;
      border: 1px solid #202A5A;
      text-align: center;
      vertical-align: middle;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
    }
    .schedule-table thead th.day-col {
      width: 12%;
      background-color: #161D3F;
    }
    .schedule-table thead th.period-col {
      width: 22%;
    }
    .period-head-title {
      font-size: 11pt;
      font-weight: 800;
    }
    .period-head-time {
      font-size: 8.5pt;
      font-weight: 500;
      opacity: 0.9;
      margin-top: 2px;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
    }

    /* Strict 25mm height per day row so all cells are permanently proportionate */
    .day-row {
      height: 25mm !important;
      max-height: 25mm !important;
      min-height: 25mm !important;
    }
    .schedule-table td, .schedule-table th {
      border: 1px solid #CBD5E1;
      text-align: center;
      vertical-align: middle;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
      padding: 0 !important;
      box-sizing: border-box;
      overflow: hidden;
    }
    .day-header {
      background-color: #F8FAFD;
      color: #202A5A;
      font-weight: 900;
      font-size: 11pt;
      border: 1.5px solid #202A5A !important;
      width: 12% !important;
    }
    .day-content {
      height: 25mm;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .slot-cell {
      background-color: #FFFFFF;
      width: 22% !important;
      height: 25mm !important;
      max-height: 25mm !important;
    }
    .cell-content {
      height: 25mm;
      max-height: 25mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2px 4px;
      box-sizing: border-box;
      text-align: center;
      width: 100%;
    }
    .empty-content {
      color: #94A3B8;
      font-size: 14pt;
      font-weight: bold;
    }
    .lesson-name {
      font-weight: 900;
      font-size: 9.5pt;
      color: #202A5A;
      margin-bottom: 2px;
      line-height: 1.25;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
      text-align: center;
      word-break: break-word;
      max-width: 100%;
    }
    .teacher-name {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 700;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
      text-align: center;
      line-height: 1.2;
      word-break: break-word;
      max-width: 100%;
    }
    .slot-time {
      font-size: 7.5pt;
      color: #64748B;
      margin-top: 2px;
      font-weight: 600;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
      white-space: nowrap;
    }

    /* Split cell: 2 equal halves inside the fixed height */
    .split-content {
      height: 25mm;
      max-height: 25mm;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      padding: 1px 2px;
      box-sizing: border-box;
      text-align: center;
      width: 100%;
    }
    .split-half {
      text-align: center;
      line-height: 1.15;
    }
    .split-half .lesson-name {
      font-size: 8pt;
      margin-bottom: 1px;
      line-height: 1.15;
    }
    .split-half .teacher-name {
      font-size: 7pt;
      line-height: 1.1;
    }
    .split-divider {
      border-top: 1px dashed #CBD5E1;
      margin: 1px 0;
    }
    .split-tag {
      font-size: 6pt;
      background: #EEF2F9;
      color: #202A5A;
      padding: 0.5px 3px;
      border-radius: 2px;
      font-weight: 800;
      display: inline-block;
      margin-top: 0.5px;
      font-family: 'IRANSansXFaNum', 'IRANSansX', 'Vazirmatn', sans-serif !important;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header: Right Title + Class & Year; Left Uploaded School Logos -->
    <table class="header-table">
      <tr>
        <td style="text-align: right; vertical-align: middle;">
          <div class="header-title-row">
            <span class="title-main">${title}</span>
            ${targetLabel ? `<span class="class-badge">${targetLabel}</span>` : ''}
          </div>
          <div class="year-label">
            سال تحصیلی: <strong>${toPersianDigits('۱۴۰۵-۱۴۰۶')}</strong>
          </div>
        </td>
        <td style="width: 25%; text-align: left; vertical-align: middle;">
          <div class="logo-wrapper">
            <img src="${ROKAD_LOGO_BASE64}" alt="لوگوی رُکاد" class="logo-img" />
          </div>
        </td>
      </tr>
    </table>

    <!-- Timetable Grid: Strictly proportionate 4-period matrix with fixed column widths and heights -->
    <table class="schedule-table">
      <colgroup>
        <col style="width: 12%;" />
        <col style="width: 22%;" />
        <col style="width: 22%;" />
        <col style="width: 22%;" />
        <col style="width: 22%;" />
      </colgroup>
      <thead>
        <tr>
          <th class="day-col">روز / زنگ</th>
          <th class="period-col">
            <div class="period-head-title">زنگ اول</div>
            <div class="period-head-time">۰۷:۳۰ تا ۰۹:۰۰</div>
          </th>
          <th class="period-col">
            <div class="period-head-title">زنگ دوم</div>
            <div class="period-head-time">۰۹:۲۰ تا ۱۰:۴۰</div>
          </th>
          <th class="period-col">
            <div class="period-head-title">زنگ سوم</div>
            <div class="period-head-time">۱۱:۰۰ تا ۱۲:۱۰</div>
          </th>
          <th class="period-col">
            <div class="period-head-title">زنگ چهارم</div>
            <div class="period-head-time">۱۲:۳۰ تا ۱۳:۳۵</div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;

  // Create an iframe to print cleanly without affecting current DOM
  const existingIframe = document.getElementById('rokad-pdf-print-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'rokad-pdf-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }
}
