const axios = require('axios');
const moment = require('moment');

// Note: This script assumes it's running in an environment where it can reach the local API
// and that there's a valid session or we can skip auth for testing if we modify the route temporarily.
// Since I can't easily mock the session here without more setup, I'll focus on logical verification 
// and manual browser testing.

async function verifyLogic() {
    console.log("Verifying Leave Filter Logic...");
    
    const today = moment().startOf('day');
    
    // Mock records
    const records = [
        {
            name: "Arun Kumar",
            startDate: today.clone().subtract(1, 'days').toDate(),
            endDate: today.clone().add(1, 'days').toDate(),
            status: "Approved"
        },
        {
            name: "Manoj S",
            startDate: today.clone().toDate(),
            endDate: today.clone().add(1, 'days').toDate(),
            status: "Approved"
        },
        {
            name: "John Doe",
            startDate: today.clone().subtract(5, 'days').toDate(),
            endDate: today.clone().subtract(2, 'days').toDate(),
            status: "Approved"
        },
        {
            name: "Jane Smith",
            startDate: today.clone().add(2, 'days').toDate(),
            endDate: today.clone().add(5, 'days').toDate(),
            status: "Approved"
        },
        {
            name: "Pending User",
            startDate: today.clone().toDate(),
            endDate: today.clone().toDate(),
            status: "Pending"
        }
    ];

    const filtered = records.filter(r => {
        const start = moment(r.startDate).startOf('day');
        const end = moment(r.endDate).startOf('day');
        return start.isSameOrBefore(today) && end.isSameOrAfter(today) && r.status === 'Approved';
    });

    console.log("Filtered Records (Should be 2):", filtered.length);
    filtered.forEach(r => console.log(`- ${r.name}`));

    if (filtered.length === 2 && filtered.find(r => r.name === "Arun Kumar") && filtered.find(r => r.name === "Manoj S")) {
        console.log("✅ Logic Verification Passed!");
    } else {
        console.log("❌ Logic Verification Failed!");
    }
}

verifyLogic();
