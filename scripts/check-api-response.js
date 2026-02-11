
const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('--- Checking API Response Structure ---');

        // Use a username that likely has charts, or create one
        const testUser = 'admin';

        const res = await fetch(`${BASE_URL}/orgcharts?username=${testUser}`);
        const data = await res.json();

        if (data.orgcharts && data.orgcharts.length > 0) {
            const first = data.orgcharts[0];
            console.log('First chart keys:', Object.keys(first));
            if ('username' in first) {
                console.log('SUCCESS: "username" field is present.');
                console.log('Value:', first.username);
            } else {
                console.error('FAILURE: "username" field is MISSING.');
            }
        } else {
            console.log('No charts found for "admin". Creating one to test...');
            // Create one
            await fetch(`${BASE_URL}/orgcharts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    orgchart_name: 'Temp Test ' + Date.now(),
                    org_data: { data: [] }
                })
            });
            // Retry fetch
            const res2 = await fetch(`${BASE_URL}/orgcharts?username=${testUser}`);
            const data2 = await res2.json();
            if (data2.orgcharts && data2.orgcharts.length > 0) {
                const first2 = data2.orgcharts[0];
                console.log('First chart keys:', Object.keys(first2));
                if ('username' in first2) {
                    console.log('SUCCESS: "username" field is present.');
                } else {
                    console.error('FAILURE: "username" field is MISSING.');
                }
            }
        }

    } catch (err) {
        console.error('Check failed:', err);
    }
}

verify();
