module.exports=[72128,o=>{"use strict";async function e(o,e){try{return console.log(`[EMAIL_SYSTEM]: Sending Onboarding Completion Email to ${o}`),console.log(`[EMAIL_SYSTEM]: SUCCESS. Email sent to ${o}`),!0}catch(e){return console.error(`[EMAIL_SYSTEM]: Failed to send email to ${o}`,e),!1}}async function n(o,e,n,r,t,a,l){try{return console.log(`[EMAIL_SYSTEM]: Sending Daily Work Summary to Manager (${o}) for ${e}`),console.log(`
        ======= DAILY WORK SUMMARY =======
        To: ${o}
        From: Antigraviity System
        Subject: Daily Work Summary - ${e} - ${new Date().toLocaleDateString()}

        Employee: ${e}
        Clock In: ${r}
        Clock Out: ${t}
        Total Productive Hours: ${a}h

        --- Achievements Today ---
        ${n}

        Attachment: ${l||"None"}
        ===================================
        `),console.log(`[EMAIL_SYSTEM]: SUCCESS. Summary email triggered for ${e}`),!0}catch(e){return console.error(`[EMAIL_SYSTEM]: Failed to send work summary email to ${o}`,e),!1}}o.s(["sendDailyWorkSummaryEmail",()=>n,"sendOnboardingCompleteEmail",()=>e])}];

//# sourceMappingURL=backend_lib_email_ts_a34623d1._.js.map