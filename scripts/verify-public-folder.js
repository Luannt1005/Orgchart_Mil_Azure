
const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('--- Starting API Verification (JS) ---');

        // Helper for fetch since we might be in env without global fetch (older node) or with it
        // If node 18+, fetch is global.
        if (typeof fetch === 'undefined') {
            console.error('Fetch is not defined. Node version might be too old.');
            process.exit(1);
        }

        // 1. Create a PRIVATE Chart
        console.log('\n1. Creating PRIVATE chart...');
        const privatePayload = {
            username: 'test_user',
            orgchart_name: 'Private Chart ' + Date.now(),
            describe: 'Test Private',
            org_data: { data: [] },
            is_public: false
        };

        let res = await fetch(`${BASE_URL}/orgcharts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(privatePayload)
        });

        if (!res.ok) throw new Error(`Failed to create private chart: ${res.statusText}`);
        const privateChart = await res.json();
        console.log('Created Private Chart ID:', privateChart.orgchart_id);

        // 2. Create a PUBLIC Chart
        console.log('\n2. Creating PUBLIC chart...');
        const publicPayload = {
            username: 'test_user',
            orgchart_name: 'Public Chart ' + Date.now(),
            describe: 'Test Public',
            org_data: { data: [] },
            is_public: true
        };

        res = await fetch(`${BASE_URL}/orgcharts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(publicPayload)
        });

        if (!res.ok) throw new Error(`Failed to create public chart: ${res.statusText}`);
        const publicChart = await res.json();
        console.log('Created Public Chart ID:', publicChart.orgchart_id);

        // 3. List Charts for User 'test_user' (Should see BOTH)
        console.log('\n3. Fetching charts for "test_user" (Expect BOTH)...');
        res = await fetch(`${BASE_URL}/orgcharts?username=test_user`);
        const list1 = await res.json();
        console.log('List 1 Count:', list1.orgcharts?.length);
        const charts1 = list1.orgcharts || [];

        const foundPrivate1 = charts1.find(c => c.orgchart_id === privateChart.orgchart_id);
        const foundPublic1 = charts1.find(c => c.orgchart_id === publicChart.orgchart_id);

        console.log(`Found Private (Expect YES): ${!!foundPrivate1}`);
        console.log(`Found Public (Expect YES): ${!!foundPublic1}`);

        // 4. List Charts for 'other_user' (Should ONLY see PUBLIC)
        console.log('\n4. Fetching charts for "other_user" (Expect ONLY Public)...');
        res = await fetch(`${BASE_URL}/orgcharts?username=other_user`);
        const list2 = await res.json();
        const charts2 = list2.orgcharts || [];

        const foundPrivate2 = charts2.find(c => c.orgchart_id === privateChart.orgchart_id);
        const foundPublic2 = charts2.find(c => c.orgchart_id === publicChart.orgchart_id);

        console.log(`Found Private (Expect NO): ${!!foundPrivate2}`);
        console.log(`Found Public (Expect YES): ${!!foundPublic2}`);

        // 5. Update Private to Public
        console.log('\n5. Updating Private Chart to PUBLIC...');
        res = await fetch(`${BASE_URL}/orgcharts/${privateChart.orgchart_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: true })
        });

        if (!res.ok) console.error('Update failed');
        else console.log('Update success.');

        // 6. Verify Visibility Change
        console.log('\n6. Checking visibility for "other_user" again...');
        res = await fetch(`${BASE_URL}/orgcharts?username=other_user`);
        const list3 = await res.json();
        const charts3 = list3.orgcharts || [];
        const foundPrivate3 = charts3.find(c => c.orgchart_id === privateChart.orgchart_id);

        console.log(`Found Private (now Public - Expect YES): ${!!foundPrivate3}`);

        // Cleanup
        console.log('\n--- Cleanup ---');
        await fetch(`${BASE_URL}/orgcharts/${privateChart.orgchart_id}`, { method: 'DELETE' });
        await fetch(`${BASE_URL}/orgcharts/${publicChart.orgchart_id}`, { method: 'DELETE' });
        console.log('Cleanup done.');

    } catch (err) {
        console.error('Verification Error:', err);
    }
}

verify();
